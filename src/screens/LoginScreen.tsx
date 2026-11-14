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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ThemeColors, Language } from '../types/delegate';
import { LanguageModal } from '../components/modals/LanguageModal';
import { ActionAlertBottomSheet, AlertModalConfig } from '../components/modals/ActionAlertBottomSheet';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { HumanVerificationScreen } from './HumanVerificationScreen';
import { loginStyles as styles } from './login/loginStyles';
import {
  normalizeLoginDigits,
  formatLoginErrorMessage,
  checkBiometricAvailability,
  authenticateWithBiometricsFlow,
} from './login/loginHelpers';

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
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [screenStep, setScreenStep] = useState<'form' | 'verify'>('form');
  const [pendingCredentials, setPendingCredentials] = useState<{
    phone: string;
    pass: string;
  } | null>(null);

  useEffect(() => {
    checkBiometricAvailability().then(setIsBiometricSupported);
  }, []);

  useEffect(() => {
    if (loginError) {
      setAlertConfig({
        type: 'error',
        title: isRTL ? 'تنبيه تسجيل الدخول' : t.loginAlertTitle || 'Login Notice',
        message: formatLoginErrorMessage(loginError, isRTL),
        primaryButtonText: isRTL ? 'حسناً' : 'OK',
      });
    }
  }, [loginError, isRTL, t.loginAlertTitle]);

  const handleBiometricAuth = async () => {
    try {
      setBiometricLoading(true);
      await authenticateWithBiometricsFlow(isRTL, onOtpSuccess, () => {
        setAlertConfig({
          type: 'info',
          title: isRTL ? 'تفعيل البصمة' : 'Biometrics Setup',
          message: isRTL
            ? 'يرجى تسجيل الدخول لمرة واحدة وتفعيل البصمة من الملف الشخصي لربط بصمتك بالحساب.'
            : 'Please log in once and enable biometrics from your profile to link your account.',
          primaryButtonText: isRTL ? 'حسناً' : 'OK',
        });
      });
    } catch (err) {
      console.log('Biometric auth error:', err);
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleLoginPress = async () => {
    if (submitting || biometricLoading) return;

    const rawNormalizedPhone = normalizeLoginDigits(loginInput.trim());
    const rawNormalizedPass = normalizeLoginDigits(passwordInput.trim());

    if (!rawNormalizedPhone) {
      setAlertConfig({
        type: 'error',
        title: isRTL ? 'تنبيه تسجيل الدخول' : t.loginAlertTitle || 'Login Notice',
        message: isRTL ? 'يرجى إدخال رقم الهاتف' : t.phoneRequired || 'Phone number is required',
        primaryButtonText: isRTL ? 'حسناً' : 'OK',
      });
      return;
    }
    if (!rawNormalizedPass) {
      setAlertConfig({
        type: 'error',
        title: isRTL ? 'تنبيه تسجيل الدخول' : t.loginAlertTitle || 'Login Notice',
        message: isRTL ? 'يرجى إدخال كلمة المرور' : t.passwordRequired || 'Password is required',
        primaryButtonText: isRTL ? 'حسناً' : 'OK',
      });
      return;
    }

    const cleanPhone = rawNormalizedPhone.replace(/[^0-9+]/g, '') || rawNormalizedPhone;
    setPendingCredentials({ phone: cleanPhone, pass: rawNormalizedPass });
    setScreenStep('verify');
  };

  if (screenStep === 'verify' && pendingCredentials) {
    return (
      <View style={{ flex: 1 }}>
        <ModuleErrorBoundary
          moduleName="شاشة التحقق البشري"
          colors={colors}
          onReset={() => setScreenStep('form')}
        >
          <HumanVerificationScreen
            colors={colors}
            isDarkMode={isDarkMode}
            appName="الإشراف"
            isRTL={isRTL}
            lang={lang}
            onSetLang={onSetLang}
            onVerify={() => onLogin(pendingCredentials.phone, pendingCredentials.pass)}
            onBack={() => setScreenStep('form')}
          />
        </ModuleErrorBoundary>
        <ActionAlertBottomSheet
          config={alertConfig}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onClose={() => setAlertConfig(null)}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.loginScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.loginWrapper}>
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
                <Text
                  style={[styles.brandMainTitle, { color: isDarkMode ? '#ffffff' : '#090a0f' }]}
                >
                  أبرار | إشراف
                </Text>
                <Text
                  style={[styles.brandSubTitle, { color: isDarkMode ? '#38bdf8' : '#0284c7' }]}
                >
                  ABRAR | SUPERVISION
                </Text>
              </View>
            </TouchableOpacity>

            <ModuleErrorBoundary moduleName="بطاقة تسجيل الدخول" colors={colors}>
              <View
                style={[
                  styles.loginCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[
                    styles.loginCardTitle,
                    { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {isRTL ? 'تسجيل الدخول' : t.loginTitle || 'Log In'}
                </Text>
                <Text
                  style={[
                    styles.loginCardSubtitle,
                    { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {isRTL
                    ? 'بوابة إدارة ومتابعة شفتات وعمليات المناديب الميدانية'
                    : t.loginSubtitle || 'Supervisor Operations Portal'}
                </Text>

                <View style={styles.formGroup}>
                  <Text
                    style={[
                      styles.label,
                      { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                    ]}
                  >
                    {isRTL ? 'رقم الهاتف' : t.phoneLabel || 'Phone Number'}
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
                        { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                      ]}
                      placeholder={isRTL ? 'رقم الهاتف' : 'Phone Number'}
                      placeholderTextColor="#94a3b8"
                      value={loginInput}
                      onChangeText={(val) => {
                        const normalized = normalizeLoginDigits(val);
                        const clean = normalized.replace(/[^0-9+]/g, '').slice(0, 14);
                        setLoginInput(clean);
                      }}
                      maxLength={14}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text
                    style={[
                      styles.label,
                      { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                    ]}
                  >
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
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.inputIcon}
                    >
                      <Feather
                        name={showPassword ? 'eye' : 'eye-off'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                    <TextInput
                      style={[
                        styles.input,
                        { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                      ]}
                      placeholder={isRTL ? 'كلمة السر' : t.passwordPlaceholder || 'Password'}
                      placeholderTextColor="#94a3b8"
                      value={passwordInput}
                      onChangeText={(val) => {
                        const clean = normalizeLoginDigits(val).replace(/[^0-9]/g, '');
                        setPasswordInput(clean);
                      }}
                      keyboardType="number-pad"
                      autoCapitalize="none"
                      secureTextEntry={!showPassword}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 12 }]}
                  onPress={handleLoginPress}
                  disabled={submitting || biometricLoading}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View
                      style={[
                        styles.buttonContentRow,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                    >
                      <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                      <Text style={styles.primaryButtonText}>
                        {isRTL ? 'سجل الدخول' : t.loginBtn}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

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
                      <View
                        style={[
                          styles.buttonContentRow,
                          { flexDirection: isRTL ? 'row-reverse' : 'row' },
                        ]}
                      >
                        <Ionicons name="finger-print" size={22} color={colors.primary} />
                        <Text style={[styles.biometricBtnText, { color: colors.textPrimary }]}>
                          {isRTL ? 'تسجيل الدخول بالبصمة' : 'Login with Biometrics'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ) : null}
              </View>
            </ModuleErrorBoundary>
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
