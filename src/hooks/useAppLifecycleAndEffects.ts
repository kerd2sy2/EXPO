import { useEffect, useRef, useCallback } from 'react';
import {
  Animated,
  AppState,
  BackHandler,
  Keyboard,
  KeyboardEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {
  EmployeeProfile,
  Language,
  PreviewPhotoData,
  SuccessModalData,
  TabType,
  WorkSession,
} from '../types/delegate';
import { workApi } from '../services/work';
import {
  apiRequest,
  getStoredLanguage,
  onSessionExpired,
  resolveEffectiveBranchId,
  saveCachedUser,
  setCurrentBranchId,
} from '../services/api';
import { analytics } from '../services/analytics';
import { offlineQueue } from '../services/offlineQueue';
import { AlertModalConfig } from '../components/modals/ActionAlertBottomSheet';

export const HOME_HEADER_HEIGHT = 72;

interface LifecycleDeps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  employee: EmployeeProfile | null;
  setEmployee: React.Dispatch<React.SetStateAction<EmployeeProfile | null>>;
  activeSession: WorkSession | null;
  lang: Language;
  setLang: (l: Language) => void;
  setThemeMode: (m: 'light' | 'dark') => void;
  loading: boolean;
  markInteractive: () => void;
  setReadNotifIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  isTakingPhotoRef: React.MutableRefObject<boolean>;
  hasLoadedSupervisorInitialRef: React.MutableRefObject<boolean>;
  mainScrollRef: React.RefObject<ScrollView | null>;
  dashboardScrollRef: React.RefObject<ScrollView | null>;
  checkSession: (isSilent?: boolean) => Promise<void>;
  performClearSession: () => Promise<void>;
  syncPendingRequests: (isSilent?: boolean, explicitBranchId?: string) => Promise<void>;
  fetchSupervisorData: (isSilent?: any, force?: any, explicitBranchId?: string) => Promise<void>;
  fetchOperationsData: (isSilent?: any, force?: any, explicitBranchId?: string) => Promise<void>;
  setAlertConfig: (cfg: AlertModalConfig | null) => void;
  previewPhoto: PreviewPhotoData | null;
  setPreviewPhoto: (p: PreviewPhotoData | null) => void;
  showQrModal: boolean;
  setShowQrModal: (v: boolean) => void;
  showLangModal: boolean;
  setShowLangModal: (v: boolean) => void;
  successModalData: SuccessModalData | null;
  closeSuccessModal: (cb?: () => void) => void;
  setSelectedHistoryMonthKey: (k: string | null) => void;
  setSelectedHistoryMonthLabel: (l: string | null) => void;
  setKeyboardOffset: (n: number) => void;
}

export function useAppLifecycleAndEffects(deps: LifecycleDeps) {
  const {
    currentTab,
    setCurrentTab,
    employee,
    setEmployee,
    activeSession,
    lang,
    setLang,
    setThemeMode,
    loading,
    markInteractive,
    setReadNotifIds,
    isTakingPhotoRef,
    hasLoadedSupervisorInitialRef,
    mainScrollRef,
    dashboardScrollRef,
    checkSession,
    performClearSession,
    syncPendingRequests,
    fetchSupervisorData,
    fetchOperationsData,
    setAlertConfig,
    previewPhoto,
    setPreviewPhoto,
    showQrModal,
    setShowQrModal,
    showLangModal,
    setShowLangModal,
    successModalData,
    closeSuccessModal,
    setSelectedHistoryMonthKey,
    setSelectedHistoryMonthLabel,
    setKeyboardOffset,
  } = deps;

  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const savedHomeScrollY = useRef(0);
  const isHeaderHidden = useRef(false);
  const scrollDelta = useRef(0);

  useEffect(() => {
    if (!loading) {
      markInteractive();
    }
  }, [loading, markInteractive]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('@eshraf_read_notifications_v1');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setReadNotifIds(new Set(parsed));
        }
      } catch {}
    })();
  }, [setReadNotifIds]);

  useEffect(() => {
    headerTranslateY.setValue(0);
    isHeaderHidden.current = false;
    if (currentTab === 'home') {
      lastScrollY.current = savedHomeScrollY.current;
      if (savedHomeScrollY.current > 0) {
        requestAnimationFrame(() => {
          dashboardScrollRef.current?.scrollTo({
            y: savedHomeScrollY.current,
            animated: false,
          });
        });
      }
    } else {
      scrollDelta.current = 0;
    }
  }, [currentTab, dashboardScrollRef, headerTranslateY]);

  const handleHomeScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (currentTab !== 'home') return;
      const currentY = event.nativeEvent.contentOffset.y;
      savedHomeScrollY.current = currentY;
      const diff = currentY - lastScrollY.current;
      lastScrollY.current = currentY;

      if (currentY <= 0) {
        if (isHeaderHidden.current) {
          isHeaderHidden.current = false;
          Animated.timing(headerTranslateY, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }).start();
        }
        return;
      }

      if (diff > 1.5 && !isHeaderHidden.current) {
        isHeaderHidden.current = true;
        Animated.timing(headerTranslateY, {
          toValue: -HOME_HEADER_HEIGHT,
          duration: 180,
          useNativeDriver: true,
        }).start();
      } else if (diff < -1.5 && isHeaderHidden.current) {
        isHeaderHidden.current = false;
        Animated.timing(headerTranslateY, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }).start();
      }
    },
    [currentTab, headerTranslateY]
  );

  // Pre-warm camera permission
  useEffect(() => {
    ImagePicker.getCameraPermissionsAsync()
      .then(({ granted }) => {
        if (!granted) {
          ImagePicker.requestCameraPermissionsAsync().catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  // Boot restore
  useEffect(() => {
    AsyncStorage.getItem('@aams_theme_mode')
      .then((savedTheme) => {
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setThemeMode(savedTheme);
        }
      })
      .catch(() => {});

    getStoredLanguage().then((l) => {
      if (l) setLang(l);
    });
    checkSession();
  }, []);

  // Foreground resume & 20s periodic sync
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && !isTakingPhotoRef.current) {
        checkSession(true);
        if (employee?.id) {
          syncPendingRequests(true);
          offlineQueue.processQueue(apiRequest).catch(() => {});
        }
      }
    });

    const timer = setInterval(() => {
      if (AppState.currentState === 'active' && !isTakingPhotoRef.current && employee?.id) {
        syncPendingRequests(true);
        offlineQueue.processQueue(apiRequest).catch(() => {});
      }
    }, 20000);

    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [checkSession, employee?.id, isTakingPhotoRef, syncPendingRequests]);

  // Session expiry listener
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
        onPrimaryPress: performClearSession,
      });
    });
    return unsub;
  }, [lang, performClearSession, setAlertConfig]);

  // Hardware Back Button (Android)
  useEffect(() => {
    const onBackPress = () => {
      if (previewPhoto) {
        setPreviewPhoto(null);
        return true;
      }
      if (showQrModal) {
        setShowQrModal(false);
        return true;
      }
      if (showLangModal) {
        setShowLangModal(false);
        return true;
      }
      if (successModalData) {
        closeSuccessModal();
        return true;
      }
      if (currentTab !== 'home') {
        setSelectedHistoryMonthKey(null);
        setSelectedHistoryMonthLabel(null);
        setCurrentTab('home');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [
    closeSuccessModal,
    currentTab,
    previewPhoto,
    setCurrentTab,
    setPreviewPhoto,
    setSelectedHistoryMonthKey,
    setSelectedHistoryMonthLabel,
    setShowLangModal,
    setShowQrModal,
    showLangModal,
    showQrModal,
    successModalData,
  ]);

  // Sync active session cache
  useEffect(() => {
    if (activeSession && activeSession.status === 'ACTIVE') {
      AsyncStorage.setItem('@aams_cached_active_session', JSON.stringify(activeSession)).catch(() => {});
    } else if (!activeSession) {
      AsyncStorage.removeItem('@aams_cached_active_session').catch(() => {});
    }
  }, [activeSession]);

  // Clarity analytics
  useEffect(() => {
    analytics.setScreen(`Tab_${currentTab}`);
  }, [currentTab]);

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

  // Keyboard listener
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      if (e?.endCoordinates?.height) setKeyboardOffset(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOffset(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [setKeyboardOffset]);

  // Auto-fetch supervisor & operations data when entering tabs or changing branch
  const effectiveBranchId = resolveEffectiveBranchId(employee) || undefined;
  useEffect(() => {
    if (!employee?.id) return;
    const isInitial = !hasLoadedSupervisorInitialRef.current;
    hasLoadedSupervisorInitialRef.current = true;
    const shouldForce = currentTab === 'approvals' || currentTab === 'dashboard';

    if (
      currentTab === 'dashboard' ||
      currentTab === 'field' ||
      currentTab === 'approvals' ||
      currentTab === 'home' ||
      currentTab === 'supervisor-report' ||
      currentTab === 'advance-request' ||
      currentTab === 'employees' ||
      currentTab === 'orders-review' ||
      currentTab === 'operations' ||
      currentTab === 'oil-change' ||
      currentTab === 'accident-report'
    ) {
      fetchSupervisorData(!isInitial, shouldForce, effectiveBranchId);
    }

    if (
      currentTab === 'operations' ||
      currentTab === 'oil-change' ||
      currentTab === 'add-vehicle' ||
      currentTab === 'accident-report' ||
      currentTab === 'employees' ||
      currentTab === 'dashboard' ||
      currentTab === 'home'
    ) {
      fetchOperationsData(!isInitial, false, effectiveBranchId);
    }
  }, [
    currentTab,
    employee?.id,
    effectiveBranchId,
    fetchOperationsData,
    fetchSupervisorData,
    hasLoadedSupervisorInitialRef,
  ]);

  // Silent profile refresh when opening Profile tab
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
            setCurrentBranchId(resolveEffectiveBranchId(updated));
            setEmployee(updated);
            saveCachedUser(updated);
          }
        })
        .catch((err) => {
          console.log('Silent profile sync error:', err);
        });
    }
  }, [currentTab, employee?.id, setEmployee]);

  // Scroll to top when tab switches
  useEffect(() => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    const timer = setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 60);
    return () => clearTimeout(timer);
  }, [currentTab, mainScrollRef]);

  return { headerTranslateY, handleHomeScroll };
}
