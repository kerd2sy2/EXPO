import React, { useState, useEffect, useCallback } from 'react';
import {
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import { ThemeColors, Language } from '../types/delegate';
import { LanguageModal } from '../components/modals/LanguageModal';
import { ActionAlertBottomSheet, AlertModalConfig } from '../components/modals/ActionAlertBottomSheet';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { HumanVerificationScreen } from './HumanVerificationScreen';
import {
  isBiometricEnabled,
  getSavedCredentialsForBiometrics,
  setAuthToken,
  refreshAuthToken,
  saveCachedUser,
} from '../services/api';
import { loginScreenStyles as styles } from './login/loginScreenStyles';
import { LoginFormCard } from './login/LoginFormCard';

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

const normalizeDigits = (str: string) =>
  str
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());

export const LoginScreen: React.FC<LoginScreenProps> = React.memo(({
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
  const [pendingCredentials, setPendingCredentials] = useState<{ phone: string; pass: string } | null>(null);

  useEffect(() => {
    const checkBiometrics = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const enabled = await isBiometricEnabled();
        const saved = await getSavedCredentialsForBiometrics();
        setIsBiometricSupported(Boolean(hasHardware && isEnrolled && enabled && saved && saved.user));
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
        ? isRTL
          ? 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة'
          : 'You do not have permission to access the app. Please contact administration.'
        : loginError;

      setAlertConfig({
        type: 'error',
        title: isRTL ? 'تنبيه تسجيل الدخول' : t.loginAlertTitle || 'Login Notice',
        message: displayMessage,
        primaryButtonText: isRTL ? 'حسناً' : 'OK',
      });
    }
  }, [loginError, isRTL, t.loginAlertTitle]);

  const handleBiometricAuth = useCallback(async () => {
    try {
      setBiometricLoading(true);
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: isRTL ? 'تسجيل الدخول باستخدام البصمة' : 'Login with Biometrics',
        cancelLabel: isRTL ? 'إلغاء' : 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        const saved = await getSavedCredentialsForBiometrics();
        const isAdmin =
          saved?.user?.role === 'ADMIN' ||
          saved?.user?.role === 'SUPER_ADMIN' ||
          saved?.user?.role === 'SUPERVISOR' ||
          saved?.user?.is_admin;

        if (saved && saved.user && !isAdmin) {
          let tokenToUse = saved.token;
          let refreshToUse = saved.refreshToken || saved.token;
          if (refreshToUse) {
            await setAuthToken(saved.token, refreshToUse);
          } else if (saved.token) {
            await setAuthToken(saved.token, saved.token);
          }

          try {
            const refreshed = await refreshAuthToken();
            if (refreshed) {
              tokenToUse = refreshed;
              refreshToUse = refreshed;
            }
          } catch {}

          await saveCachedUser(saved.user);
          await onOtpSuccess({
            access_token: tokenToUse,
            refresh_token: refreshToUse,
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
  }, [isRTL, onOtpSuccess]);

  const handleLoginPress = useCallback(async () => {
    if (submitting || biometricLoading) return;

    const rawNormalizedPhone = normalizeDigits(loginInput.trim());
    const rawNormalizedPass = normalizeDigits(passwordInput.trim());

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
  }, [submitting, biometricLoading, loginInput, passwordInput, isRTL, t.loginAlertTitle, t.phoneRequired, t.passwordRequired]);

  if (screenStep === 'verify' && pendingCredentials) {
    return (
      <View style={{ flex: 1 }}>
        <ModuleErrorBoundary moduleName="التحقق البشري" colors={colors} onReset={() => setScreenStep('form')}>
          <HumanVerificationScreen
            colors={colors}
            isDarkMode={isDarkMode}
            appName="المناديب"
            isRTL={isRTL}
            lang={lang}
            onSetLang={onSetLang}
            onVerify={() => onLogin(pendingCredentials.phone, pendingCredentials.pass)}
            onBack={() => setScreenStep('form')}
          />
        </ModuleErrorBoundary>
        {Boolean(alertConfig) && (
          <ModuleErrorBoundary moduleName="تنبيه تسجيل الدخول" colors={colors} fallback={null}>
            <ActionAlertBottomSheet
              config={alertConfig}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              onClose={() => setAlertConfig(null)}
            />
          </ModuleErrorBoundary>
        )}
      </View>
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

            <LoginFormCard
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              t={t}
              loginInput={loginInput}
              passwordInput={passwordInput}
              showPassword={showPassword}
              submitting={submitting}
              biometricLoading={biometricLoading}
              isBiometricSupported={isBiometricSupported}
              normalizeDigits={normalizeDigits}
              onChangeLogin={setLoginInput}
              onChangePassword={setPasswordInput}
              onToggleShowPassword={() => setShowPassword((prev) => !prev)}
              onLoginPress={handleLoginPress}
              onBiometricAuth={handleBiometricAuth}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showLangModal && (
        <ModuleErrorBoundary moduleName="اختيار اللغة" colors={colors} fallback={null}>
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
        </ModuleErrorBoundary>
      )}

      {Boolean(alertConfig) && (
        <ModuleErrorBoundary moduleName="تنبيه تسجيل الدخول" colors={colors} fallback={null}>
          <ActionAlertBottomSheet
            config={alertConfig}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            onClose={() => setAlertConfig(null)}
          />
        </ModuleErrorBoundary>
      )}
    </SafeAreaView>
  );
});
