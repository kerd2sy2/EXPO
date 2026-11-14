import * as LocalAuthentication from 'expo-local-authentication';
import {
  isBiometricEnabled,
  getSavedCredentialsForBiometrics,
  setAuthToken,
  refreshAuthToken,
  saveCachedUser,
} from '../../services/api';

export function normalizeLoginDigits(str: string): string {
  return str
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
}

export function formatLoginErrorMessage(loginError: string, isRTL: boolean): string {
  const isPermissionDenied =
    loginError.includes('صلاحية') ||
    loginError.includes('مخصص') ||
    loginError.toLowerCase().includes('permission') ||
    loginError.toLowerCase().includes('access');

  return isPermissionDenied
    ? isRTL
      ? 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة'
      : 'You do not have permission to access the app. Please contact administration.'
    : loginError;
}

export async function checkBiometricAvailability(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const enabled = await isBiometricEnabled();
    const saved = await getSavedCredentialsForBiometrics();
    return Boolean(hasHardware && isEnrolled && enabled && saved && (saved.user || saved.token));
  } catch (e) {
    console.log('Biometric support check notice:', e);
    return false;
  }
}

export async function authenticateWithBiometricsFlow(
  isRTL: boolean,
  onOtpSuccess: (loginResp: any) => Promise<void>,
  onNeedSetup: () => void
): Promise<void> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: isRTL ? 'تسجيل الدخول باستخدام البصمة' : 'Login with Biometrics',
    cancelLabel: isRTL ? 'إلغاء' : 'Cancel',
    disableDeviceFallback: false,
  });

  if (!result.success) return;

  const saved = await getSavedCredentialsForBiometrics();
  if (saved && saved.user) {
    let tokenToUse = saved.token;
    if (saved.refreshToken) {
      await setAuthToken(saved.token, saved.refreshToken);
    } else if (saved.token) {
      await setAuthToken(saved.token);
    }

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
      admin: saved.user,
    });
  } else {
    onNeedSetup();
  }
}
