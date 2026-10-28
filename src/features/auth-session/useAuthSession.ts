import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  loadStoredToken,
  getCachedUser,
  saveCachedUser,
  isBiometricEnabled,
  saveLastCredentialsForBiometrics,
  onSessionExpired,
} from '../../services/api';
import { AlertModalConfig } from '../../components/modals/ActionAlertBottomSheet';
import { shiftSessionService } from '../shift/services/shiftSessionService';
import { analytics } from '../../services/analytics';

interface UseAuthSessionParams {
  lang: Language;
  isRTL: boolean;
  t: any;
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  setAlertConfig: (config: AlertModalConfig | null) => void;
  setEnteredMotorcycle: React.Dispatch<React.SetStateAction<string>>;
  setOrdersCount: React.Dispatch<React.SetStateAction<string>>;
  isTakingPhotoRef: React.MutableRefObject<boolean>;
  fetchViolations: (empId: string) => void;
}

export function useAuthSession({
  lang,
  isRTL,
  t,
  currentTab,
  setCurrentTab,
  setAlertConfig,
  setEnteredMotorcycle,
  setOrdersCount,
  isTakingPhotoRef,
  fetchViolations,
}: UseAuthSessionParams) {
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [isSessionSyncing, setIsSessionSyncing] = useState<boolean>(true);
  const [historySessions, setHistorySessions] = useState<WorkSession[]>([]);
  const [selectedHistorySession, setSelectedHistorySession] = useState<WorkSession | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const lastBackgroundCheckRef = useRef<number>(0);

  const fetchActiveSession = useCallback(
    async (employeeId: string) => {
      try {
        const result = await shiftSessionService.syncWithServer(employeeId);

        // Discard stale responses if shift was started/ended while request was in flight
        if (result.seq !== shiftSessionService.getCurrentSeq()) {
          return;
        }

        if (result.status === 'ACTIVE' && result.session) {
          const active = result.session;
          setActiveSession((prev) => {
            if (prev && prev.id === active.id && prev.start_time) {
              return { ...active, start_time: prev.start_time };
            }
            return active;
          });
          setOrdersCount((prev) => prev || (active.orders_count ? String(active.orders_count) : ''));
        } else if (result.status === 'INACTIVE') {
          setActiveSession(null);
        }
        // If result.status === 'NETWORK_ERROR', keep current/cached activeSession untouched!
      } catch (err) {
        console.log('Error syncing active session:', err);
      } finally {
        setIsSessionSyncing(false);
      }
    },
    [setOrdersCount]
  );

  const fetchHistory = useCallback(async (employeeId: string) => {
    try {
      const history = await workApi.getMySessions(employeeId);
      if (Array.isArray(history)) {
        setHistorySessions(history as WorkSession[]);
        AsyncStorage.setItem('@aams_cached_history_sessions', JSON.stringify(history)).catch(() => {});
      }
    } catch (err) {
      console.log('Error fetching shift history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const checkSession = useCallback(
    async (isSilentBackground: boolean = false) => {
      try {
        const token = await loadStoredToken();
        if (!token) {
          if (!isSilentBackground) {
            setEmployee(null);
            setIsSessionSyncing(false);
            setLoading(false);
          }
          return;
        }

        // Load cached user, cached active session, and history together before first render
        const [cached, cachedActive, rawHistory] = await Promise.all([
          getCachedUser(),
          shiftSessionService.getCachedActiveSession(),
          AsyncStorage.getItem('@aams_cached_history_sessions'),
        ]);

        if (cached) {
          if (
            cached.is_admin ||
            cached.role === 'ADMIN' ||
            cached.role === 'SUPERVISOR' ||
            cached.role === 'SUPER_ADMIN'
          ) {
            await setAuthToken(null);
            await saveCachedUser(null);
            setEmployee(null);
            setIsSessionSyncing(false);
            setLoading(false);
            return;
          }

          if (cached.id) {
            setEmployee(cached);

            // Restore cached active shift immediately on first frame
            if (
              cachedActive &&
              (!cachedActive.employee_id || cachedActive.employee_id === cached.id)
            ) {
              setActiveSession(cachedActive);
              setIsSessionSyncing(false);
            } else if (!isSilentBackground) {
              // No cached active session yet: show Skeleton until fetchActiveSession resolves
              setIsSessionSyncing(true);
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

            // Sync active shift session with server
            fetchActiveSession(cached.id);

            if (!isSilentBackground) {
              fetchHistory(cached.id);
              fetchViolations(cached.id);
            }
          }
        }

        // Silent background profile & permission verification
        workApi
          .getMe()
          .then(async (user) => {
            if (!user) {
              if (!cached) {
                setEmployee(null);
                setIsSessionSyncing(false);
              }
              return;
            }

            if (
              (user as any).is_admin ||
              (user as any).role === 'ADMIN' ||
              (user as any).role === 'SUPERVISOR' ||
              (user as any).role === 'SUPER_ADMIN'
            ) {
              await setAuthToken(null);
              await saveCachedUser(null);
              setEmployee(null);
              setIsSessionSyncing(false);
              return;
            }

            if (user.id) {
              const anyUser = user as any;
              const perms = Array.isArray(anyUser.permissions) ? anyUser.permissions : [];
              const hasManadeebAccess =
                anyUser.app_permissions?.manadeeb === true ||
                perms.includes('*') ||
                perms.includes('apps.manadeeb') ||
                perms.includes('app.manadeeb') ||
                perms.length === 0;

              if (!hasManadeebAccess || anyUser.app_permissions?.manadeeb === false) {
                await setAuthToken(null);
                await saveCachedUser(null);
                setEmployee(null);
                setIsSessionSyncing(false);
                setAlertConfig({
                  type: 'warning',
                  title: 'تنبيه الصلاحيات',
                  message: 'ليس لديك صلاحية للوصول إلى هذا التطبيق الآن.',
                  primaryButtonText: 'حسناً',
                });
                return;
              }

              const merged: EmployeeProfile = {
                ...(cached || {}),
                ...user,
                motorcycle_number: user.motorcycle_number || '',
                key_number: user.key_number || '',
                national_id: user.national_id || '',
                personal_image: user.personal_image || '',
                national_id_image: user.national_id_image || '',
                driving_license_image: user.driving_license_image || '',
                passport_image: user.passport_image || '',
                vehicle_registration_image: user.vehicle_registration_image || '',
                employee_number: user.employee_number || '',
                phone: user.phone || '',
                branch_name: user.branch_name || '',
              } as EmployeeProfile;

              setEmployee(merged);
              await saveCachedUser(merged);

              // Only re-fetch if we didn't already have a cached user id
              if (!cached?.id) {
                fetchActiveSession(merged.id);
                fetchHistory(merged.id);
                fetchViolations(merged.id);
              }
            }
          })
          .catch(async (err) => {
            console.log('Background session refresh notice:', err);
            const errMsg = String(err?.message || '');
            if (errMsg.includes('403') || errMsg.includes('غير مصرح')) {
              await setAuthToken(null);
              await saveCachedUser(null);
              setEmployee(null);
              setIsSessionSyncing(false);
              setAlertConfig({
                type: 'warning',
                title: 'تنبيه الصلاحيات',
                message: 'ليس لديك صلاحية للوصول إلى هذا التطبيق الآن.',
                primaryButtonText: 'حسناً',
              });
            }
          });
      } catch (err) {
        console.log('Session check notice:', err);
        setIsSessionSyncing(false);
      } finally {
        setLoading(false);
      }
    },
    [fetchActiveSession, fetchHistory, fetchViolations, setAlertConfig]
  );

  // Foreground resume & heartbeat sync
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        const now = Date.now();
        if (
          !isTakingPhotoRef.current &&
          employee?.id &&
          now - lastBackgroundCheckRef.current > 15000
        ) {
          lastBackgroundCheckRef.current = now;
          fetchActiveSession(employee.id);
        }
      }
    });

    const timer = setInterval(() => {
      if (
        AppState.currentState === 'active' &&
        !isTakingPhotoRef.current &&
        employee?.id &&
        activeSession
      ) {
        fetchActiveSession(employee.id).catch(() => {});
      }
    }, 60000);

    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [employee?.id, Boolean(activeSession), fetchActiveSession, isTakingPhotoRef]);

  // Listen for unrecoverable session expiry
  useEffect(() => {
    const unsub = onSessionExpired(() => {
      setAlertConfig({
        type: 'warning',
        title: lang === 'ar' ? 'انتهت الجلسة' : 'Session Expired',
        message:
          lang === 'ar'
            ? 'انتهت صلاحية جلسة الدخول بالكامل، يرجى تسجيل الدخول مجدداً.'
            : 'Your session has expired. Please log in again.',
        primaryButtonText: lang === 'ar' ? 'تسجيل الدخول' : 'Log In',
        onPrimaryPress: async () => {
          try {
            await setAuthToken(null);
            await saveCachedUser(null);
            await shiftSessionService.confirmShiftEnded();
          } catch {}
          setEmployee(null);
          setActiveSession(null);
          setHistorySessions([]);
          setCurrentTab('home');
        },
      });
    });
    return unsub;
  }, [lang, setAlertConfig, setCurrentTab]);

  // Identify employee in analytics
  useEffect(() => {
    if (employee?.id) {
      analytics.identify(employee.id, {
        name: employee.name || '',
        national_id: employee.national_id || '',
        branch: employee.branch_name || '',
        motorcycle: employee.motorcycle_number || '',
      });
    }
  }, [employee?.id]);

  // Auto-refresh profile when opening Profile tab
  useEffect(() => {
    if (currentTab === 'profile' && employee?.id) {
      workApi
        .getMe()
        .then((u) => {
          if (u && u.id) {
            const updated = {
              ...(u as EmployeeProfile),
              vehicle_registration_image: u.vehicle_registration_image || '',
            };
            setEmployee(updated);
            saveCachedUser(updated);
          }
        })
        .catch((err) => {
          console.log('Silent profile sync error:', err);
        });
    }
  }, [currentTab, employee?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (employee && employee.id) {
        await Promise.all([
          workApi.getMe().then((u) => {
            if (u) {
              const updated = {
                ...(u as EmployeeProfile),
                vehicle_registration_image: u.vehicle_registration_image || '',
              };
              setEmployee(updated);
              saveCachedUser(updated);
            }
          }),
          fetchActiveSession(employee.id),
          fetchHistory(employee.id),
          fetchViolations(employee.id),
        ]);
      } else {
        await checkSession();
      }
    } catch (err) {
      console.log('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [employee, fetchActiveSession, fetchHistory, fetchViolations, checkSession]);

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

      const isActualAdmin = Boolean(
        res &&
          res.admin &&
          (res.admin.role === 'ADMIN' ||
            res.admin.role === 'SUPER_ADMIN' ||
            res.admin.role === 'SUPERVISOR')
      );

      if (isActualAdmin) {
        const errorMsg =
          lang === 'ar'
            ? 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة'
            : 'You do not have permission to access the app. Please contact administration.';
        setLoginError(errorMsg);
        await setAuthToken(null);
        await saveCachedUser(null);
        setEmployee(null);
        throw new Error(errorMsg);
      } else if (res && (res.employee || res.is_employee || (res as any).id)) {
        const emp = (res.employee || res) as EmployeeProfile;

        const cachedSession = await shiftSessionService.getCachedActiveSession(emp.id);
        if (cachedSession) {
          setActiveSession(cachedSession);
          setIsSessionSyncing(false);
        } else {
          setIsSessionSyncing(true);
        }

        setEmployee(emp);
        await saveCachedUser(emp);
        if (res.access_token) {
          await setAuthToken(res.access_token, res.refresh_token);
          const bioOn = await isBiometricEnabled();
          if (bioOn && emp.national_id) {
            await saveLastCredentialsForBiometrics(
              emp.national_id,
              res.access_token,
              emp,
              res.refresh_token
            );
          }
        }
        setCurrentTab('home');

        workApi
          .getMe()
          .then(async (fresh) => {
            if (fresh && fresh.id) {
              setEmployee(
                (prev) =>
                  ({
                    ...(prev || {}),
                    ...fresh,
                    personal_image: fresh.personal_image || prev?.personal_image || '',
                    motorcycle_number: fresh.motorcycle_number || prev?.motorcycle_number || '',
                    key_number: fresh.key_number || prev?.key_number || '',
                    national_id: fresh.national_id || prev?.national_id || '',
                    phone: fresh.phone || prev?.phone || '',
                    branch_name: fresh.branch_name || prev?.branch_name || '',
                  }) as EmployeeProfile
              );
              const bioOn = await isBiometricEnabled();
              if (bioOn && res.access_token && fresh.national_id) {
                saveLastCredentialsForBiometrics(
                  fresh.national_id,
                  res.access_token,
                  fresh,
                  res.refresh_token
                );
              }
            }
          })
          .catch((e) => console.log('Notice refreshing profile on Login:', e));

        fetchActiveSession(emp.id).catch(() => {});
        fetchHistory(emp.id).catch(() => {});
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
        errorMsg =
          lang === 'ar'
            ? 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة'
            : 'You do not have permission to access the app. Please contact administration.';
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

    const isActualAdmin = Boolean(
      loginResp &&
        loginResp.admin &&
        (loginResp.admin.role === 'ADMIN' ||
          loginResp.admin.role === 'SUPER_ADMIN' ||
          loginResp.admin.role === 'SUPERVISOR')
    );

    if (isActualAdmin) {
      const errorMsg =
        lang === 'ar'
          ? 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة'
          : 'You do not have permission to access the app. Please contact administration.';
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
      const cachedSession = await shiftSessionService.getCachedActiveSession(emp.id);
      if (cachedSession) {
        setActiveSession(cachedSession);
        setIsSessionSyncing(false);
      } else {
        setIsSessionSyncing(true);
      }

      setEmployee(emp);
      await saveCachedUser(emp);
      setCurrentTab('home');

      workApi
        .getMe()
        .then(async (fresh) => {
          if (fresh && fresh.id) {
            setEmployee(
              (prev) =>
                ({
                  ...(prev || {}),
                  ...fresh,
                  personal_image: fresh.personal_image || prev?.personal_image || '',
                  motorcycle_number: fresh.motorcycle_number || prev?.motorcycle_number || '',
                  key_number: fresh.key_number || prev?.key_number || '',
                  national_id: fresh.national_id || prev?.national_id || '',
                  phone: fresh.phone || prev?.phone || '',
                  branch_name: fresh.branch_name || prev?.branch_name || '',
                }) as EmployeeProfile
            );
            const bioOn = await isBiometricEnabled();
            const curTok = loginResp?.access_token || getStoredToken();
            if (bioOn && curTok && fresh.national_id) {
              saveLastCredentialsForBiometrics(
                fresh.national_id,
                curTok,
                fresh,
                loginResp?.refresh_token
              );
            }
          }
        })
        .catch((e) => console.log('Notice refreshing profile on OTP/Bio:', e));

      fetchActiveSession(emp.id).catch(() => {});
      fetchHistory(emp.id).catch(() => {});
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
    employee,
    setEmployee,
    loading,
    submitting,
    setSubmitting,
    loginError,
    activeSession,
    setActiveSession,
    isSessionSyncing,
    setIsSessionSyncing,
    historySessions,
    setHistorySessions,
    selectedHistorySession,
    setSelectedHistorySession,
    loadingHistory,
    setLoadingHistory,
    refreshing,
    checkSession,
    fetchActiveSession,
    fetchHistory,
    onRefresh,
    handleLogin,
    handleOtpSuccess,
    handleLogout,
  };
}

