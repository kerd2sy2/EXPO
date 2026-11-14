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
  setAuthToken,
  loadStoredToken,
  getCachedUser,
  saveCachedUser,
  onSessionExpired,
} from '../../services/api';
import { AlertModalConfig } from '../../components/modals/ActionAlertBottomSheet';
import { shiftSessionService } from '../shift/services/shiftSessionService';
import { analytics } from '../../services/analytics';
import {
  isAdminOrSupervisorRole,
  hasManadeebAppPermission,
  mergeEmployeeProfile,
} from './authProfileHelpers';
import { createAuthLoginHandlers } from './authLoginHandlers';

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

        const [cached, cachedActive, rawHistory] = await Promise.all([
          getCachedUser(),
          shiftSessionService.getCachedActiveSession(),
          AsyncStorage.getItem('@aams_cached_history_sessions'),
        ]);

        if (cached) {
          if (isAdminOrSupervisorRole(cached)) {
            await setAuthToken(null);
            await saveCachedUser(null);
            setEmployee(null);
            setIsSessionSyncing(false);
            setLoading(false);
            return;
          }

          if (cached.id) {
            setEmployee(cached);
            if (
              cachedActive &&
              (!cachedActive.employee_id || cachedActive.employee_id === cached.id)
            ) {
              setActiveSession(cachedActive);
            }

            if (!isSilentBackground) {
              setIsSessionSyncing(true);
              setTimeout(() => {
                setIsSessionSyncing(false);
              }, 800);
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

            if (!isSilentBackground) {
              fetchHistory(cached.id);
              fetchViolations(cached.id);
            }
          }
        }

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

            if (isAdminOrSupervisorRole(user)) {
              await setAuthToken(null);
              await saveCachedUser(null);
              setEmployee(null);
              setIsSessionSyncing(false);
              return;
            }

            if (user.id) {
              if (!hasManadeebAppPermission(user)) {
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

              const merged = mergeEmployeeProfile(cached, user);
              setEmployee(merged);
              await saveCachedUser(merged);

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
          workApi.getMe(true).then((u) => {
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

  const { handleLogin, handleOtpSuccess, handleLogout } = createAuthLoginHandlers({
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
  });

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
