import React, { useState, useEffect } from 'react';
import {
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { ThemeColors, Language } from '../types/delegate';
import { LanguageModal } from '../components/modals/LanguageModal';
import { ActionAlertBottomSheet, AlertModalConfig } from '../components/modals/ActionAlertBottomSheet';
import { HumanVerificationScreen } from './HumanVerificationScreen';
import {
  isBiometricEnabled,
  getSavedCredentialsForBiometrics,
  setAuthToken,
  refreshAuthToken,
  saveCachedUser,
} from '../services/api';

interface LoginScreenProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  lang: Language;
  onSetLang: (lang: Language) => void;
  onLogin: (phone?: string, pass?: string) => Promise<void>;
  onOtpSuccess: (loginResp: any) => Promise<void>;
  loginError: string;
  submitting: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  colors,
  isDarkMode,
  isRTL,
  t,
  lang,
  onSetLang,
  onLogin,
  onOtpSuccess,
  loginError,
  submitting,
}) => {
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);

  // Biometric / Fingerprint State
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const enabled = await isBiometricEnabled();
        const saved = await getSavedCredentialsForBiometrics();
        if (hasHardware && isEnrolled && enabled && saved && saved.user) {
          setIsBiometricSupported(true);
        } else {
          setIsBiometricSupported(false);
        }
      } catch (e) {
        console.log('Biometric support check notice:', e);
        setIsBiometricSupported(false);
      }
    };
    checkBiometrics();
  }, []);

  useEffect(() => {
    if (loginError) {
      const isPermissionDenied =
        loginError.includes('صلاحية') ||
        loginError.includes('مخصص') ||
        loginError.toLowerCase().includes('permission') ||
        loginError.toLowerCase().includes('access');

      const displayMessage = isPermissionDenied
        ? (isRTL
            ? 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة'
            : 'You do not have permission to access the app. Please contact administration.')
        : loginError;

      setAlertConfig({
        type: 'error',
        title: isRTL ? 'تنبيه تسجيل الدخول' : (t.loginAlertTitle || 'Login Notice'),
        message: displayMessage,
        primaryButtonText: isRTL ? 'حسناً' : 'OK',
      });
    }
  }, [loginError]);

  const handleBiometricAuth = async () => {
    try {
      setBiometricLoading(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: isRTL ? 'تسجيل الدخول باستخدام البصمة' : 'Login with Biometrics',
        cancelLabel: isRTL ? 'إلغاء' : 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const saved = await getSavedCredentialsForBiometrics();
        const isAdmin = saved?.user?.role === 'ADMIN' || saved?.user?.role === 'SUPER_ADMIN' || saved?.user?.role === 'SUPERVISOR' || saved?.user?.is_admin;

        if (saved && saved.user && !isAdmin) {
          let tokenToUse = saved.token;
          if (saved.refreshToken) {
            await setAuthToken(saved.token, saved.refreshToken);
          } else if (saved.token) {
            await setAuthToken(saved.token);
          }

          // Ensure session is fresh
          try {
            const refreshed = await refreshAuthToken();
            if (refreshed) {
              tokenToUse = refreshed;
            }
          } catch {}

          await saveCachedUser(saved.user);
          await onOtpSuccess({
            access_token: tokenToUse,
            refresh_token: saved.refreshToken,
            employee: saved.user,
          });
        } else {
          setAlertConfig({
            type: 'info',
            title: isRTL ? 'تفعيل البصمة' : 'Biometrics Setup',
            message: isRTL
              ? 'يرجى تسجيل الدخول لمرة واحدة وتفعيل البصمة من الملف الشخصي لربط بصمتك بالحساب.'
              : 'Please log in once and enable biometrics from your profile to link your account.',
            primaryButtonText: isRTL ? 'حسناً' : 'OK',
          });
        }
      }
    } catch (err) {
      console.log('Biometric auth error:', err);
    } finally {
      setBiometricLoading(false);
    }
  };

  const normalizeDigits = (str: string) => {
    return str
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
  };

  const [screenStep, setScreenStep] = useState<'form' | 'verify'>('form');
  const [pendingCredentials, setPendingCredentials] = useState<{ phone: string; pass: string } | null>(null);

  const handleLoginPress = async () => {
    if (submitting || biometricLoading) return;

    const rawNormalizedPhone = normalizeDigits(loginInput.trim());
    const rawNormalizedPass = normalizeDigits(passwordInput.trim());

    if (!rawNormalizedPhone) {
      setAlertConfig({
        type: 'error',
        title: isRTL ? 'تنبيه تسجيل الدخول' : (t.loginAlertTitle || 'Login Notice'),
        message: isRTL ? 'يرجى إدخال رقم الهاتف' : (t.phoneRequired || 'Phone number is required'),
        primaryButtonText: isRTL ? 'حسناً' : 'OK',
      });
      return;
    }
    if (!rawNormalizedPass) {
      setAlertConfig({
        type: 'error',
        title: isRTL ? 'تنبيه تسجيل الدخول' : (t.loginAlertTitle || 'Login Notice'),
        message: isRTL ? 'يرجى إدخال كلمة المرور' : (t.passwordRequired || 'Password is required'),
        primaryButtonText: isRTL ? 'حسناً' : 'OK',
      });
      return;
    }

    const cleanPhone = rawNormalizedPhone.replace(/[^0-9+]/g, '') || rawNormalizedPhone;
    const cleanPass = rawNormalizedPass;

    setPendingCredentials({ phone: cleanPhone, pass: cleanPass });
    setScreenStep('verify');
  };

  if (screenStep === 'verify' && pendingCredentials) {
    return (
      <HumanVerificationScreen
        colors={colors}
        isDarkMode={isDarkMode}
        appName="المناديب"
        isRTL={isRTL}
        onVerify={() => onLogin(pendingCredentials.phone, pendingCredentials.pass)}
        onBack={() => setScreenStep('form')}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.loginScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.loginWrapper}>
            {/* Horizontal Brand Lockup: Logo on the left consistently in all languages */}
            <TouchableOpacity
              style={[styles.brandHorizontalLockup, { flexDirection: 'row' }]}
              onPress={() => setShowLangModal(true)}
              activeOpacity={0.75}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.brandLogoMark}
                resizeMode="contain"
              />
              <View style={[styles.brandTextCol, { alignItems: 'flex-start' }]}>
                <Text style={[styles.brandMainTitle, { color: isDarkMode ? '#ffffff' : '#090a0f' }]}>
                  أبرار | مناديب
                </Text>
                <Text style={[styles.brandSubTitle, { color: isDarkMode ? '#fb923c' : '#ea580c' }]}>
                  ABRAR | DELEGATES
                </Text>
              </View>
            </TouchableOpacity>

            {/* Login Card */}
            <View style={[styles.loginCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

              <Text style={[styles.loginCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'تسجيل الدخول' : (t.loginTitle || 'Log In')}
              </Text>
              <Text style={[styles.loginCardSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'بوابة شفتات المناديب والمتابعة الميدانية والطلبات' : (t.loginSubtitle || 'Delegate Shift Portal')}
              </Text>

              {/* Phone Number Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'رقم الهاتف' : (t.phoneLabel || 'Phone Number')}
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <View style={styles.inputIcon}>
                    <Feather name="phone" size={18} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.textPrimary,
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                    placeholder={isRTL ? 'رقم الهاتف' : 'Phone Number'}
                    placeholderTextColor="#94a3b8"
                    value={loginInput}
                    onChangeText={(val) => {
                      const normalized = normalizeDigits(val);
                      const clean = normalized.replace(/[^0-9+]/g, '').slice(0, 14);
                      setLoginInput(clean);
                    }}
                    maxLength={14}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'كلمة السر' : t.passwordLabel}
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.inputIcon}>
                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.textPrimary,
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                    placeholder={isRTL ? 'كلمة السر' : (t.passwordPlaceholder || 'Password')}
                    placeholderTextColor="#94a3b8"
                    value={passwordInput}
                    onChangeText={(val) => {
                      const clean = normalizeDigits(val).replace(/[^0-9]/g, '');
                      setPasswordInput(clean);
                    }}
                    keyboardType="number-pad"
                    autoCapitalize="none"
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 12 }]}
                onPress={handleLoginPress}
                disabled={submitting || biometricLoading}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>{isRTL ? 'سجل الدخول' : t.loginBtn}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Biometric / Fingerprint Login Button */}
              {isBiometricSupported ? (
                <TouchableOpacity
                  style={[
                    styles.biometricBtn,
                    {
                      borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0',
                      backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
                    },
                  ]}
                  onPress={handleBiometricAuth}
                  disabled={biometricLoading || submitting}
                  activeOpacity={0.8}
                >
                  {biometricLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="finger-print" size={22} color={colors.primary} />
                      <Text style={[styles.biometricBtnText, { color: colors.textPrimary }]}>
                        {isRTL ? 'تسجيل الدخول بالبصمة' : 'Login with Biometrics'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LanguageModal
        visible={showLangModal}
        currentLang={lang}
        colors={colors}
        t={t}
        onSelectLang={(newLang) => {
          onSetLang(newLang);
          setShowLangModal(false);
        }}
        onClose={() => setShowLangModal(false)}
      />

      <ActionAlertBottomSheet
        config={alertConfig}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        onClose={() => setAlertConfig(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loginScrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
  },
  loginWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  brandHorizontalLockup: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 26,
  },
  brandLogoMark: {
    width: 62,
    height: 62,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandMainTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandSubTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: -2,
  },
  loginCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  appTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  appTypeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loginCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  loginCardSubtitle: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
  },
  inputIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContentRow: {
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  biometricBtn: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  biometricBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
