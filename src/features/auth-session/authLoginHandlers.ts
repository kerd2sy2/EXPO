import React from 'react';
import {
  EmployeeProfile,
  WorkSession,
  TabType,
  Language,
} from '../../types/delegate';
import { workApi } from '../../services/work';
import {
  apiRequest,
  setAuthToken,
  getStoredToken,
  saveCachedUser,
  isBiometricEnabled,
  saveLastCredentialsForBiometrics,
} from '../../services/api';
import { AlertModalConfig } from '../../components/modals/ActionAlertBottomSheet';
import { shiftSessionService } from '../shift/services/shiftSessionService';
import { isAdminOrSupervisorRole, mergeAfterAuthEmployee } from './authProfileHelpers';

export interface CreateAuthHandlersParams {
  lang: Language;
  isRTL: boolean;
  t: any;
  employee: EmployeeProfile | null;
  setEmployee: React.Dispatch<React.SetStateAction<EmployeeProfile | null>>;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setLoginError: React.Dispatch<React.SetStateAction<string>>;
  setActiveSession: React.Dispatch<React.SetStateAction<WorkSession | null>>;
  setIsSessionSyncing: React.Dispatch<React.SetStateAction<boolean>>;
  setHistorySessions: React.Dispatch<React.SetStateAction<WorkSession[]>>;
  setCurrentTab: (tab: TabType) => void;
  setAlertConfig: (config: AlertModalConfig | null) => void;
  fetchActiveSession: (employeeId: string) => Promise<void>;
  fetchHistory: (employeeId: string) => Promise<void>;
  checkSession: (isSilentBackground?: boolean) => Promise<void>;
}

const getAdminBlockedMsg = (lang: Language) =>
  lang === 'ar'
    ? 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة'
    : 'You do not have permission to access the app. Please contact administration.';

export function createAuthLoginHandlers({
  lang,
  isRTL,
  t,
  employee,
  setEmployee,
  setSubmitting,
  setLoginError,
  setActiveSession,
  setIsSessionSyncing,
  setHistorySessions,
  setCurrentTab,
  setAlertConfig,
  fetchActiveSession,
  fetchHistory,
  checkSession,
}: CreateAuthHandlersParams) {
  const syncPostLoginState = async (
    emp: EmployeeProfile,
    accessToken?: string,
    refreshToken?: string
  ) => {
    const cachedSession = await shiftSessionService.getCachedActiveSession(emp.id);
    if (cachedSession) {
      setActiveSession(cachedSession);
    }
    setIsSessionSyncing(true);
    // Safety cap so initial skeleton never spins endlessly on slow networks
    setTimeout(() => {
      setIsSessionSyncing(false);
    }, 800);

    setEmployee(emp);
    await saveCachedUser(emp);
    setCurrentTab('home');

    workApi
      .getMe()
      .then(async (fresh) => {
        if (fresh && fresh.id) {
          setEmployee((prev) => mergeAfterAuthEmployee(prev, fresh));
          const bioOn = await isBiometricEnabled();
          const tokenToSave = accessToken || getStoredToken();
          if (bioOn && tokenToSave && fresh.national_id) {
            saveLastCredentialsForBiometrics(
              fresh.national_id,
              tokenToSave,
              fresh,
              refreshToken
            );
          }
        }
      })
      .catch((e) => console.log('Notice refreshing profile on auth:', e));

    fetchActiveSession(emp.id).catch(() => {});
    fetchHistory(emp.id).catch(() => {});
  };

  const handleLogin = async (rawPhone?: string, rawPass?: string) => {
    const inputVal = (rawPhone || '').trim();
    if (!inputVal) {
      const msg = t.phoneRequired || (lang === 'ar' ? 'يرجى إدخال رقم الهاتف' : 'Phone number is required');
      setLoginError(msg);
      throw new Error(msg);
    }

    const password = (rawPass || '').trim();
    if (!password) {
      const msg = t.passwordRequired || (lang === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Password is required');
      setLoginError(msg);
      throw new Error(msg);
    }

    setSubmitting(true);
    setLoginError('');
    try {
      const res = await workApi.login(inputVal, password);
      if (isAdminOrSupervisorRole(res?.admin)) {
        const errorMsg = getAdminBlockedMsg(lang);
        setLoginError(errorMsg);
        await setAuthToken(null);
        await saveCachedUser(null);
        setEmployee(null);
        throw new Error(errorMsg);
      } else if (res && (res.employee || res.is_employee || (res as any).id)) {
        const emp = (res.employee || res) as EmployeeProfile;
        if (res.access_token) {
          await setAuthToken(res.access_token, res.refresh_token || res.access_token);
          const bioOn = await isBiometricEnabled();
          if (bioOn && emp.national_id) {
            await saveLastCredentialsForBiometrics(
              emp.national_id,
              res.access_token,
              emp,
              res.refresh_token || res.access_token
            );
          }
        }
        await syncPostLoginState(emp, res.access_token, res.refresh_token);
      } else {
        const errorMsg =
          t.passwordHint ||
          (lang === 'ar'
            ? 'بيانات الدخول غير صحيحة، يرجى التأكد من كلمة المرور'
            : 'Invalid login credentials');
        setLoginError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMsg =
        err?.message ||
        (lang === 'ar' ? 'تعذر تسجيل الدخول، تأكد من صحة البيانات' : 'Failed to log in');
      if (
        errorMsg.includes('صلاحية') ||
        errorMsg.includes('مخصص') ||
        errorMsg.toLowerCase().includes('permission') ||
        errorMsg.toLowerCase().includes('access')
      ) {
        errorMsg = getAdminBlockedMsg(lang);
      }
      setLoginError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSuccess = async (loginResp?: any) => {
    const token = loginResp?.access_token || loginResp?.token;
    if (token) {
      await setAuthToken(token, loginResp?.refresh_token || token);
    }

    if (isAdminOrSupervisorRole(loginResp?.admin)) {
      const errorMsg = getAdminBlockedMsg(lang);
      setLoginError(errorMsg);
      await setAuthToken(null);
      await saveCachedUser(null);
      setEmployee(null);
      throw new Error(errorMsg);
    }

    let emp = loginResp?.employee || (loginResp?.id ? loginResp : null);
    if (!emp) {
      try {
        const fresh = await workApi.getMe();
        if (fresh && fresh.id) {
          emp = fresh;
        }
      } catch (e) {
        console.log('Notice getting fresh me:', e);
      }
    }

    if (emp && emp.id) {
      await syncPostLoginState(emp, loginResp?.access_token, loginResp?.refresh_token);
    } else {
      await checkSession();
      setCurrentTab('home');
    }
  };

  const handleLogout = async () => {
    setAlertConfig({
      type: 'confirm',
      title: t.logout,
      message:
        lang === 'ar'
          ? 'هل أنت متأكد من رغبتك في تسجيل الخروج من التطبيق؟'
          : 'Are you sure you want to log out from the app?',
      primaryButtonText: t.logout,
      secondaryButtonText: isRTL ? 'إلغاء' : 'Cancel',
      onPrimaryPress: async () => {
        try {
          if (employee?.id) {
            await apiRequest(`/employees/me/push-token?employee_id=${employee.id}`, {
              method: 'POST',
              body: JSON.stringify({ push_token: '' }),
              timeoutMs: 3000,
            }).catch(() => {});
          }
          await setAuthToken(null);
          await saveCachedUser(null);
          await shiftSessionService.confirmShiftEnded();
        } catch (e) {
          console.log('Logout error', e);
        }
        setEmployee(null);
        setActiveSession(null);
        setHistorySessions([]);
        setCurrentTab('home');
      },
    });
  };

  return {
    handleLogin,
    handleOtpSuccess,
    handleLogout,
  };
}
