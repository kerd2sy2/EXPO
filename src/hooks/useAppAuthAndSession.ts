import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmployeeProfile, WorkSession, TabType, Language } from '../types/delegate';
import { workApi } from '../services/work';
import {
  setAuthToken,
  getStoredToken,
  loadStoredToken,
  getCachedUser,
  saveCachedUser,
  isBiometricEnabled,
  saveLastCredentialsForBiometrics,
  resolveEffectiveBranchId,
  setCurrentBranchId,
} from '../services/api';
import { AlertModalConfig } from '../components/modals/ActionAlertBottomSheet';
import {
  CACHED_ACTIVE_SESSION_KEY,
  CACHED_HISTORY_SESSIONS_KEY,
  checkHasEshrafAccess,
  mapLoginResponseToEmployee,
  mergeEmployeeWithFresh,
} from './authSessionHelpers';

interface AuthSessionDeps {
  employee: EmployeeProfile | null;
  setEmployee: React.Dispatch<React.SetStateAction<EmployeeProfile | null>>;
  setLoading: (v: boolean) => void;
  setSubmitting: (v: boolean) => void;
  setLoginError: (msg: string) => void;
  activeSession: WorkSession | null;
  setActiveSession: React.Dispatch<React.SetStateAction<WorkSession | null>>;
  setHistorySessions: React.Dispatch<React.SetStateAction<WorkSession[]>>;
  setLoadingHistory: (v: boolean) => void;
  setEnteredMotorcycle: React.Dispatch<React.SetStateAction<string>>;
  setOrdersCount: React.Dispatch<React.SetStateAction<string>>;
  setCurrentTab: (tab: TabType) => void;
  setAlertConfig: (cfg: AlertModalConfig | null) => void;
  isTakingPhotoRef: React.MutableRefObject<boolean>;
  fetchViolations: (employeeId?: string) => void;
  fetchSupervisorData: (isSilent?: any, force?: any, explicitBranchId?: string) => Promise<void>;
  fetchOperationsData: (isSilent?: any, force?: any, explicitBranchId?: string) => Promise<void>;
  resetSupervisorState: () => Promise<void>;
  lang: Language;
  isRTL: boolean;
  t: any;
}

export function useAppAuthAndSession(deps: AuthSessionDeps) {
  const {
    employee,
    setEmployee,
    setLoading,
    setSubmitting,
    setLoginError,
    activeSession,
    setActiveSession,
    setHistorySessions,
    setLoadingHistory,
    setEnteredMotorcycle,
    setOrdersCount,
    setCurrentTab,
    setAlertConfig,
    fetchViolations,
    fetchSupervisorData,
    fetchOperationsData,
    resetSupervisorState,
    lang,
    isRTL,
    t,
  } = deps;

  const [refreshing, setRefreshing] = useState(false);

  const performClearSession = useCallback(async () => {
    try {
      await Promise.allSettled([
        setAuthToken(null),
        saveCachedUser(null),
        AsyncStorage.multiRemove([CACHED_ACTIVE_SESSION_KEY, CACHED_HISTORY_SESSIONS_KEY]),
        resetSupervisorState(),
      ]);
    } catch (e) {
      console.log('Clear session error', e);
    }
    setEmployee(null);
    setActiveSession(null);
    setHistorySessions([]);
    setCurrentTab('home');
  }, [resetSupervisorState, setActiveSession, setCurrentTab, setEmployee, setHistorySessions]);

  const fetchActiveSession = useCallback(
    async (employeeId: string) => {
      try {
        const active = await workApi.getActiveSession(employeeId);
        if (active && active.status === 'ACTIVE') {
          setActiveSession((prev) => {
            if (prev && prev.id === active.id && prev.start_time) {
              return { ...active, start_time: prev.start_time };
            }
            return active as WorkSession;
          });
          setOrdersCount((prev) => prev || (active.orders_count ? String(active.orders_count) : ''));
          AsyncStorage.setItem(CACHED_ACTIVE_SESSION_KEY, JSON.stringify(active)).catch(() => {});
        } else {
          setActiveSession(null);
          AsyncStorage.removeItem(CACHED_ACTIVE_SESSION_KEY).catch(() => {});
        }
      } catch (err) {
        console.log('Error fetching active session:', err);
      }
    },
    [setActiveSession, setOrdersCount]
  );

  const fetchHistory = useCallback(
    async (employeeId: string) => {
      try {
        const history = await workApi.getMySessions(employeeId);
        if (Array.isArray(history)) {
          setHistorySessions(history as WorkSession[]);
          AsyncStorage.setItem(CACHED_HISTORY_SESSIONS_KEY, JSON.stringify(history)).catch(() => {});
        }
      } catch (err) {
        console.log('Error fetching shift history:', err);
      } finally {
        setLoadingHistory(false);
      }
    },
    [setHistorySessions, setLoadingHistory]
  );

  const syncFreshProfileInBackground = useCallback(
    (emp: EmployeeProfile, initialBranch: string | undefined, bioToken?: string | null, refreshTok?: string, inputId?: string) => {
      workApi
        .getMe()
        .then(async (fresh) => {
          if (!fresh || !fresh.id) return;
          const mergedFresh = mergeEmployeeWithFresh(emp, fresh);
          const freshBranch = resolveEffectiveBranchId(mergedFresh) || undefined;
          setCurrentBranchId(freshBranch || null);
          setEmployee(mergedFresh);
          await saveCachedUser(mergedFresh);

          if (freshBranch !== initialBranch) {
            fetchSupervisorData(true, true, freshBranch);
            fetchOperationsData(true, true, freshBranch);
          }
          const bioOn = await isBiometricEnabled();
          const curTok = bioToken || getStoredToken();
          if (bioOn && curTok && (fresh.national_id || fresh.phone)) {
            saveLastCredentialsForBiometrics(
              fresh.national_id || fresh.phone || inputId || '',
              curTok,
              fresh,
              refreshTok
            );
          }
        })
        .catch((e) => console.log('Notice refreshing profile:', e));
    },
    [fetchOperationsData, fetchSupervisorData, setEmployee]
  );

  const checkSession = useCallback(
    async (isSilentBackground: boolean = false) => {
      try {
        const token = await loadStoredToken();
        if (!token) {
          if (!isSilentBackground) {
            setEmployee(null);
            setLoading(false);
          }
          return;
        }

        const [cachedRes, activeRes, historyRes] = await Promise.allSettled([
          getCachedUser(),
          AsyncStorage.getItem(CACHED_ACTIVE_SESSION_KEY),
          AsyncStorage.getItem(CACHED_HISTORY_SESSIONS_KEY),
        ]);

        const cached = cachedRes.status === 'fulfilled' ? cachedRes.value : null;
        const rawActive = activeRes.status === 'fulfilled' ? activeRes.value : null;
        const rawHistory = historyRes.status === 'fulfilled' ? historyRes.value : null;

        if (cached && cached.id) {
          const cachedBranch = resolveEffectiveBranchId(cached) || undefined;
          setCurrentBranchId(cachedBranch || null);
          setEmployee(cached);

          if (rawActive) {
            try {
              const parsed = JSON.parse(rawActive);
              if (parsed?.status === 'ACTIVE' && parsed?.employee_id === cached.id) setActiveSession(parsed);
            } catch {}
          }
          if (cached.motorcycle_number && !isSilentBackground && activeSession) {
            setEnteredMotorcycle((prev) => prev || cached.motorcycle_number);
          }
          if (rawHistory) {
            try {
              const parsed = JSON.parse(rawHistory);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setHistorySessions(parsed);
                setLoadingHistory(false);
              }
            } catch {}
          }

          setLoading(false);
          fetchActiveSession(cached.id);
          fetchHistory(cached.id);
          fetchViolations(cached.id);
        }

        workApi
          .getMe()
          .then(async (user) => {
            if (!user) {
              if (!cached) setEmployee(null);
              return;
            }
            if (user.id) {
              if (!checkHasEshrafAccess(user)) {
                await performClearSession();
                setAlertConfig({
                  type: 'warning',
                  title: 'تنبيه الصلاحيات',
                  message: 'ليس لديك صلاحية للوصول إلى هذا التطبيق الآن.',
                  primaryButtonText: 'حسناً',
                });
                return;
              }

              const merged = mergeEmployeeWithFresh(cached, user);
              const prevBranch = resolveEffectiveBranchId(cached) || undefined;
              const nextBranch = resolveEffectiveBranchId(merged) || undefined;
              setCurrentBranchId(nextBranch || null);
              setEmployee(merged);
              await saveCachedUser(merged);

              if (merged.motorcycle_number && activeSession) {
                setEnteredMotorcycle(merged.motorcycle_number);
              }

              if (!cached?.id || cached.id !== merged.id || prevBranch !== nextBranch) {
                fetchActiveSession(merged.id);
                fetchHistory(merged.id);
                fetchViolations(merged.id);
                fetchSupervisorData(true, true, nextBranch);
                fetchOperationsData(true, true, nextBranch);
              }
            }
          })
          .catch(async (err) => {
            console.log('Background session refresh notice:', err);
            const errMsg = String(err?.message || '');
            if (errMsg.includes('403') || errMsg.includes('غير مصرح')) {
              await performClearSession();
              setAlertConfig({
                type: 'warning',
                title: 'تنبيه الصلاحيات',
                message: 'ليس لديك صلاحية للوصول إلى هذا التطبيق الآن.',
                primaryButtonText: 'حسناً',
              });
            }
          })
          .finally(() => {
            if (!isSilentBackground) setLoading(false);
          });
      } catch (err) {
        console.log('Session check notice:', err);
      } finally {
        setLoading(false);
      }
    },
    [
      activeSession,
      fetchActiveSession,
      fetchHistory,
      fetchOperationsData,
      fetchSupervisorData,
      fetchViolations,
      performClearSession,
      setActiveSession,
      setAlertConfig,
      setEmployee,
      setEnteredMotorcycle,
      setHistorySessions,
      setLoading,
      setLoadingHistory,
    ]
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (employee && employee.id) {
        const currentBranch = resolveEffectiveBranchId(employee) || undefined;
        await Promise.allSettled([
          workApi.getMe().then((u) => {
            if (u) {
              const updated = { ...(u as EmployeeProfile), vehicle_registration_image: u.vehicle_registration_image || '' };
              setCurrentBranchId(resolveEffectiveBranchId(updated));
              setEmployee(updated);
              saveCachedUser(updated);
            }
          }),
          fetchActiveSession(employee.id),
          fetchHistory(employee.id),
          fetchViolations(employee.id),
          fetchSupervisorData(false, true, currentBranch),
          fetchOperationsData(false, true, currentBranch),
        ]);
      } else {
        await checkSession();
      }
    } catch (err) {
      console.log('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [checkSession, employee, fetchActiveSession, fetchHistory, fetchOperationsData, fetchSupervisorData, fetchViolations, setEmployee]);

  const handleLogin = useCallback(
    async (rawPhone?: string, rawPass?: string) => {
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
        if (!checkHasEshrafAccess(res)) {
          const errorMsg =
            lang === 'ar'
              ? 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة'
              : 'You do not have permission to access the app. Please contact administration.';
          setLoginError(errorMsg);
          await performClearSession();
          throw new Error(errorMsg);
        }

        const emp = mapLoginResponseToEmployee(res)!;
        const effectiveBranch = resolveEffectiveBranchId(emp) || undefined;
        setCurrentBranchId(effectiveBranch || null);
        setEmployee(emp);
        await saveCachedUser(emp);

        if (res.access_token) {
          await setAuthToken(res.access_token, res.refresh_token);
          const bioOn = await isBiometricEnabled();
          if (bioOn) {
            await saveLastCredentialsForBiometrics(emp.national_id || emp.phone || inputVal, res.access_token, emp, res.refresh_token);
          }
        }
        setCurrentTab('home');

        fetchActiveSession(emp.id).catch(() => {});
        fetchHistory(emp.id).catch(() => {});
        fetchViolations(emp.id);
        fetchSupervisorData(false, true, effectiveBranch);
        fetchOperationsData(false, true, effectiveBranch);
        syncFreshProfileInBackground(emp, effectiveBranch, res.access_token, res.refresh_token, inputVal);
      } catch (err: any) {
        console.error('Login error:', err);
        let errorMsg = err?.message || (lang === 'ar' ? 'تعذر تسجيل الدخول، تأكد من صحة البيانات' : 'Failed to log in');
        if (errorMsg.includes('صلاحية') || errorMsg.includes('مخصص') || errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('access')) {
          errorMsg = lang === 'ar' ? 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة' : 'You do not have permission to access the app. Please contact administration.';
        }
        setLoginError(errorMsg);
        throw new Error(errorMsg);
      } finally {
        setSubmitting(false);
      }
    },
    [fetchActiveSession, fetchHistory, fetchOperationsData, fetchSupervisorData, fetchViolations, lang, performClearSession, setCurrentTab, setEmployee, setLoginError, setSubmitting, syncFreshProfileInBackground, t]
  );

  const handleOtpSuccess = useCallback(
    async (loginResp?: any) => {
      const token = loginResp?.access_token || loginResp?.token;
      if (token) await setAuthToken(token, loginResp?.refresh_token || token);

      if (!checkHasEshrafAccess(loginResp)) {
        const errorMsg =
          lang === 'ar'
            ? 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة'
            : 'You do not have permission to access the app. Please contact administration.';
        setLoginError(errorMsg);
        await performClearSession();
        throw new Error(errorMsg);
      }

      let emp = mapLoginResponseToEmployee(loginResp);
      if (!emp) {
        try {
          const fresh = await workApi.getMe();
          if (fresh?.id) emp = fresh;
        } catch (e) {
          console.log('Notice getting fresh me:', e);
        }
      }

      if (emp && emp.id) {
        const effectiveBranch = resolveEffectiveBranchId(emp) || undefined;
        setCurrentBranchId(effectiveBranch || null);
        setEmployee(emp);
        await saveCachedUser(emp);
        setCurrentTab('home');

        fetchActiveSession(emp.id).catch(() => {});
        fetchHistory(emp.id).catch(() => {});
        fetchViolations(emp.id);
        fetchSupervisorData(false, true, effectiveBranch);
        fetchOperationsData(false, true, effectiveBranch);
        syncFreshProfileInBackground(emp, effectiveBranch, loginResp?.access_token, loginResp?.refresh_token);
      } else {
        await checkSession();
        setCurrentTab('home');
      }
    },
    [checkSession, fetchActiveSession, fetchHistory, fetchOperationsData, fetchSupervisorData, fetchViolations, lang, performClearSession, setCurrentTab, setEmployee, setLoginError, syncFreshProfileInBackground]
  );

  const handleLogout = useCallback(async () => {
    setAlertConfig({
      type: 'confirm',
      title: t.logout,
      message: lang === 'ar' ? 'هل أنت متأكد من رغبتك في تسجيل الخروج من التطبيق؟' : 'Are you sure you want to log out from the app?',
      primaryButtonText: t.logout,
      secondaryButtonText: isRTL ? 'إلغاء' : 'Cancel',
      onPrimaryPress: performClearSession,
    });
  }, [isRTL, lang, performClearSession, setAlertConfig, t.logout]);

  return {
    refreshing,
    performClearSession,
    fetchActiveSession,
    fetchHistory,
    checkSession,
    onRefresh,
    handleLogin,
    handleOtpSuccess,
    handleLogout,
  };
}
