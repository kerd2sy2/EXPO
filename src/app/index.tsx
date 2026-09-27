import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StatusBar,
  ScrollView,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  BackHandler,
  useColorScheme,
  KeyboardAvoidingView,
  Keyboard,
  KeyboardEvent,
  Platform,
  StyleSheet,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types & Constants
import {
  EmployeeProfile,
  WorkSession,
  SuccessModalData,
  PreviewPhotoData,
  TabType,
  Language,
  ThemeColors,
} from '../types/delegate';
import { translations } from '../constants/translations';

// Services
import { workApi } from '../services/work';
import {
  API_BASE_URL,
  setAuthToken,
  getStoredToken,
  loadStoredToken,
  getCachedUser,
  saveCachedUser,
  isBiometricEnabled,
  saveLastCredentialsForBiometrics,
  onSessionExpired,
  getStoredLanguage,
  saveStoredLanguage,
} from '../services/api';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ShiftScreen } from '../screens/ShiftScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ViolationsScreen } from '../screens/ViolationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AdminTargetDashboard } from '../screens/target/AdminTargetDashboard';
import { SupervisorTargetDashboard } from '../screens/target/SupervisorTargetDashboard';
import { getMyViolationsApi, DelegateViolation } from '../services/api';

// Modals
import { SuccessShiftModal } from '../components/modals/SuccessShiftModal';
import { LanguageModal } from '../components/modals/LanguageModal';
import { QrCodeModal } from '../components/modals/QrCodeModal';
import { ImagePreviewModal } from '../components/modals/ImagePreviewModal';
import { ActionAlertBottomSheet, AlertModalConfig } from '../components/modals/ActionAlertBottomSheet';
import { AppUpdateBottomSheet } from '../components/modals/AppUpdateBottomSheet';
import { DiagnosticsModal } from '../components/modals/DiagnosticsModal';
import { BroadcastModal } from '../components/modals/BroadcastModal';
import { BroadcastHistoryModal } from '../components/modals/BroadcastHistoryModal';
import { PlateScannerModal } from '../components/ui/PlateScannerModal';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';

// Modular Hooks
import { useSessionTimer } from '../hooks/useSessionTimer';
import { useBroadcasts } from '../hooks/useBroadcasts';
import { useAppUpdates } from '../hooks/useAppUpdates';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { initGlobalErrorLogger } from '../services/errorLogger';

// Initialize global crash/error interception immediately on app boot
initGlobalErrorLogger();

export default function DelegateApp() {
  const systemColorScheme = useColorScheme();
  const isDarkMode = systemColorScheme === 'dark';

  // Navigation & Language
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [lang, setLang] = useState<Language>('ar');
  const t = translations[lang];
  const isRTL = lang === 'ar';

  // Authentication State
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [adminUser, setAdminUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Work Session State
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [historySessions, setHistorySessions] = useState<WorkSession[]>([]);
  const [selectedHistorySession, setSelectedHistorySession] = useState<WorkSession | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Shift Inputs
  const [enteredMotorcycle, setEnteredMotorcycle] = useState('');
  const [startKm, setStartKm] = useState('');
  const [startKmImage, setStartKmImage] = useState<string | null>(null);
  const startKmImageRef = useRef<string | null>(null);
  const [startNotes, setStartNotes] = useState('');
  const [autoKmFetched, setAutoKmFetched] = useState(false);
  const [isOdometerBroken, setIsOdometerBroken] = useState(false);
  const [activeBikeRegistrationImage, setActiveBikeRegistrationImage] = useState<string | null>(null);
  const [startPlateImage, setStartPlateImage] = useState<string | null>(null);
  const startPlateImageRef = useRef<string | null>(null);
  const [isPlateConfirmed, setIsPlateConfirmed] = useState(false);
  const [isScanningPlate, setIsScanningPlate] = useState(false);
  const isTakingPhotoRef = useRef(false);
  const lastFetchedBikeRef = useRef<string>('');

  const [endKm, setEndKm] = useState('');
  const [endKmImage, setEndKmImage] = useState<string | null>(null);
  const endKmImageRef = useRef<string | null>(null);
  const [ordersCount, setOrdersCount] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [endNotes, setEndNotes] = useState('');

  // Violations & Penalties State
  const [violations, setViolations] = useState<DelegateViolation[]>([]);
  const [violationsLoading, setViolationsLoading] = useState(false);
  const [totalViolationsAmount, setTotalViolationsAmount] = useState(0);
  const [deductedViolationsAmount, setDeductedViolationsAmount] = useState(0);

  const fetchViolations = useCallback(async (empId?: string) => {
    setViolationsLoading(true);
    try {
      const targetId = empId || employee?.id;
      const res = await getMyViolationsApi(targetId);
      setViolations(res.data || []);
      setTotalViolationsAmount(res.total_amount || 0);
      setDeductedViolationsAmount(res.deducted_amount || 0);
    } catch (err) {
      console.warn('[index.tsx] Error fetching violations:', err);
    } finally {
      setViolationsLoading(false);
    }
  }, [employee?.id]);

  // Modals & Popups
  const [showQrModal, setShowQrModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhotoData | null>(null);
  const [successModalData, setSuccessModalData] = useState<SuccessModalData | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [showPlateScannerModal, setShowPlateScannerModal] = useState(false);

  // Success Sheet Animations
  const sheetTranslateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const mainScrollRef = useRef<ScrollView>(null);

  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);
  const [mainScrollEnabled, setMainScrollEnabled] = useState(true);

  // Modular Hooks: Active Shift Timer
  const { elapsedTime } = useSessionTimer(activeSession);

  // Modular Hooks: Over-The-Air Updates
  const {
    updateModalVisible,
    setUpdateModalVisible,
    updateState,
    updateError,
    handleCheckForUpdates,
    handleApplyUpdate,
  } = useAppUpdates(isRTL);

  // Modular Hooks: Announcements & Survey Polls
  const {
    activeBroadcast,
    setActiveBroadcast,
    showBroadcastModal,
    setShowBroadcastModal,
    showBroadcastHistory,
    setShowBroadcastHistory,
    allBroadcasts,
    unreadBroadcastsCount,
    loadingBroadcastHistory,
    handleVoteBroadcast,
    handleCloseBroadcast,
    handleOpenNotificationsHistory,
    handleRefreshNotificationsHistory,
    handleMarkAllAsRead,
  } = useBroadcasts(employee);

  // Modular Hooks: Direct Shift Notification Routing
  usePushNotifications({
    employee,
    setCurrentTab,
    mainScrollRef,
    setHistorySessions,
    setSelectedHistorySession,
    setLoadingHistory,
    setActiveBroadcast,
    setShowBroadcastModal,
  });

  // Theme Colors
  const colors: ThemeColors = isDarkMode
    ? {
        bg: '#000000',
        card: '#16161a',
        cardHeader: '#202026',
        textPrimary: '#ffffff',
        textSecondary: '#9ca3af',
        border: '#27272e',
        primary: '#f97316',
        primaryLight: 'rgba(249, 115, 22, 0.16)',
        primaryText: '#fb923c',
        accent: '#38bdf8',
        accentLight: 'rgba(56, 189, 248, 0.16)',
        inputBg: '#1c1c22',
        inputBorder: '#2e2e38',
        warningBg: 'rgba(234, 179, 8, 0.15)',
        warningBorder: 'rgba(234, 179, 8, 0.3)',
        warningText: '#fef08a',
        errorBg: 'rgba(239, 68, 68, 0.15)',
        errorText: '#fca5a5',
      }
    : {
        bg: '#f8fafc',
        card: '#ffffff',
        cardHeader: '#f1f5f9',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        primary: '#ea580c',
        primaryLight: '#fff7ed',
        primaryText: '#ea580c',
        accent: '#0284c7',
        accentLight: '#f0f9ff',
        inputBg: '#ffffff',
        inputBorder: '#cbd5e1',
        warningBg: '#fef9c3',
        warningBorder: '#facc15',
        warningText: '#854d0e',
        errorBg: '#fee2e2',
        errorText: '#ef4444',
      };

  const handleSetLanguage = async (newLang: Language) => {
    setLang(newLang);
    await saveStoredLanguage(newLang);
  };

  // Check Active Session & Employee on Mount
  useEffect(() => {
    getStoredLanguage().then((l) => {
      if (l) setLang(l);
    });
    checkSession();
  }, []);

  // Silently re-sync session and data when app returns from background / unlocked
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        if (!isTakingPhotoRef.current) {
          checkSession(true);
        }
      }
    });
    return () => sub.remove();
  }, [employee?.id]);



  // Listen for unrecoverable session expiry (when token refresh fails)
  useEffect(() => {
    const unsub = onSessionExpired(() => {
      setAlertConfig({
        type: 'warning',
        title: lang === 'ar' ? 'انتهت الجلسة' : 'Session Expired',
        message: lang === 'ar' ? 'انتهت صلاحية جلسة الدخول بالكامل، يرجى تسجيل الدخول مجدداً.' : 'Your session has expired. Please log in again.',
        primaryButtonText: lang === 'ar' ? 'تسجيل الدخول' : 'Log In',
        onPrimaryPress: async () => {
          try {
            await setAuthToken(null);
            await saveCachedUser(null);
          } catch {}
          setAdminUser(null);
          setEmployee(null);
          setActiveSession(null);
          setHistorySessions([]);
          setCurrentTab('home');
        },
      });
    });
    return unsub;
  }, [lang]);

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
        setCurrentTab('home');
        return true; // Go back to home page without exiting
      }
      // On home page, return false to exit the app
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [currentTab, previewPhoto, showQrModal, showLangModal, successModalData]);



  // Keep active session in sync with local cache instantly
  useEffect(() => {
    if (activeSession && activeSession.status === 'ACTIVE') {
      AsyncStorage.setItem('@aams_cached_active_session', JSON.stringify(activeSession)).catch(() => {});
    } else if (!activeSession) {
      AsyncStorage.removeItem('@aams_cached_active_session').catch(() => {});
    }
  }, [activeSession]);

  // Dynamic Keyboard Height Listener for Seamless Scroll Padding
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      if (e?.endCoordinates?.height) {
        setKeyboardOffset(e.endCoordinates.height);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Auto-fetch Last End KM and registration image when entered motorcycle changes (with debounce)
  const bikeFetchSeqRef = useRef<number>(0);

  useEffect(() => {
    if (activeSession || !employee) return;
    const rawBike = enteredMotorcycle.trim();
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const bike = rawBike.replace(/[٠-٩]/g, (w) => `${arabicDigits.indexOf(w)}`).trim();

    if (!bike) {
      lastFetchedBikeRef.current = '';
      setStartKm('');
      setAutoKmFetched(false);
      setIsOdometerBroken(false);
      setActiveBikeRegistrationImage(null);
      return;
    }

    const currentSeq = ++bikeFetchSeqRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await workApi.getLastKM(employee.id, bike);
        if (bikeFetchSeqRef.current !== currentSeq) return; // Stale request, ignore

        lastFetchedBikeRef.current = bike;

        if (res?.registration_image) {
          setActiveBikeRegistrationImage(res.registration_image);
        } else {
          setActiveBikeRegistrationImage(null);
        }

        if (res?.is_odometer_broken) {
          setIsOdometerBroken(true);
          setStartKm('0');
          setAutoKmFetched(false);
        } else {
          setIsOdometerBroken(false);
          if (res && res.last_end_km > 0) {
            setStartKm(String(res.last_end_km));
            setAutoKmFetched(true);
          } else {
            setStartKm('');
            setAutoKmFetched(false);
          }
        }
      } catch (err) {
        if (bikeFetchSeqRef.current !== currentSeq) return;
        setIsOdometerBroken(false);
        console.log('No prior KM found for bike:', bike);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [enteredMotorcycle, activeSession, employee?.id]);

  // Check broken odometer and registration image for active session
  useEffect(() => {
    if (activeSession && employee) {
      const bike = activeSession.motorcycle_number || employee.motorcycle_number;
      if (bike) {
        workApi
          .getLastKM(employee.id, bike)
          .then((res) => {
            if (res?.is_odometer_broken || (activeSession.start_km === 0 && !activeSession.start_km_image)) {
              setIsOdometerBroken(true);
            } else {
              setIsOdometerBroken(false);
            }
            if (res && res.registration_image) {
              setActiveBikeRegistrationImage(res.registration_image);
            } else {
              setActiveBikeRegistrationImage(null);
            }
          })
          .catch(() => {
            if (activeSession.start_km === 0 && !activeSession.start_km_image) {
              setIsOdometerBroken(true);
            }
            setActiveBikeRegistrationImage(null);
          });
      } else {
        setActiveBikeRegistrationImage(null);
      }
    } else {
      setActiveBikeRegistrationImage(null);
    }
  }, [activeSession?.id, activeSession?.motorcycle_number, employee?.id]);



  const checkSession = async (isSilentBackground: boolean = false) => {
    try {
      // 1. Fast Token Check - If no token exists at all, immediately show login screen in < 5ms
      const token = await loadStoredToken();
      if (!token) {
        if (!isSilentBackground) {
          setAdminUser(null);
          setEmployee(null);
          setLoading(false);
        }
        return;
      }

      // 2. Instant Render from Local Cache (< 10ms Cold Start!)
      // Load cached user, active session, and history ALL TOGETHER before toggling loading state!
      const [cached, rawActiveSession, rawHistory] = await Promise.all([
        getCachedUser(),
        AsyncStorage.getItem('@aams_cached_active_session'),
        AsyncStorage.getItem('@aams_cached_history_sessions'),
      ]);

      if (cached) {
        if (cached.is_admin || cached.role === 'ADMIN' || cached.role === 'SUPERVISOR' || cached.role === 'SUPER_ADMIN') {
          setAdminUser(cached);
          setEmployee(null);
          setLoading(false);
          return;
        }
        if (cached.id) {
          setAdminUser(null);
          setEmployee(cached);

          // Restore cached active shift session immediately on the FIRST render frame
          if (rawActiveSession) {
            try {
              const parsed = JSON.parse(rawActiveSession);
              if (parsed && parsed.status === 'ACTIVE' && parsed.employee_id === cached.id) {
                setActiveSession(parsed);
              }
            } catch {}
          }

          if (cached.motorcycle_number && !isSilentBackground) {
            setEnteredMotorcycle((prev) => prev || cached.motorcycle_number);
          }

          // Restore cached shift history instantly (< 5ms)
          if (rawHistory) {
            try {
              const parsed = JSON.parse(rawHistory);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setHistorySessions(parsed);
                setLoadingHistory(false);
              }
            } catch {}
          }

          // Immediately hide loading spinner only after activeSession and employee are primed!
          setLoading(false);

          // Fetch shift session, history, and violations in background
          fetchActiveSession(cached.id);
          fetchHistory(cached.id);
          fetchViolations(cached.id);
        }
      }

      // 3. Silent Background Server Sync (Does NOT freeze the screen with a spinner)
      workApi.getMe().then(async (user) => {
        if (!user) {
          if (!cached) {
            setEmployee(null);
            setAdminUser(null);
          }
          return;
        }

        if ((user as any).is_admin || (user as any).role === 'ADMIN' || (user as any).role === 'SUPERVISOR' || (user as any).role === 'SUPER_ADMIN') {
          setAdminUser(user);
          setEmployee(null);
          return;
        }

        if (user.id) {
          setAdminUser(null);
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
          if (merged.motorcycle_number) {
            setEnteredMotorcycle(merged.motorcycle_number);
          }
          fetchActiveSession(merged.id);
          fetchHistory(merged.id);
          fetchViolations(merged.id);
        }
      }).catch((err) => {
        console.log('Background session refresh notice:', err);
      });

    } catch (err) {
      console.log('Session check notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSession = async (employeeId: string) => {
    try {
      const active = await workApi.getActiveSession(employeeId);
      if (active && active.status === 'ACTIVE') {
        setActiveSession((prev) => {
          // If already active with the same session, preserve client start_time so timer doesn't stutter/reset
          if (prev && prev.id === active.id && prev.start_time) {
            return { ...active, start_time: prev.start_time };
          }
          return active as WorkSession;
        });
        setOrdersCount((prev) => prev || (active.orders_count ? String(active.orders_count) : ''));
        AsyncStorage.setItem('@aams_cached_active_session', JSON.stringify(active)).catch(() => {});
      } else {
        setActiveSession(null);
        AsyncStorage.removeItem('@aams_cached_active_session').catch(() => {});
      }
    } catch (err) {
      console.log('Error fetching active session:', err);
    }
  };

  const fetchHistory = async (employeeId: string) => {
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
  };

  const [refreshing, setRefreshing] = useState(false);

  // Pull-to-refresh across all screens
  const onRefresh = async () => {
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
  };

  // Auto-fetch fresh profile data when user opens Profile tab without requiring manual pull-to-refresh
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
  }, [currentTab]);

  // Scroll to top whenever tab changes (e.g. returning to Home after start shift)
  useEffect(() => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    const timer = setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 60);
    return () => clearTimeout(timer);
  }, [currentTab]);

  // Open Success Bottom Sheet
  const openSuccessModal = (data: SuccessModalData) => {
    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(400);
    setSuccessModalData(data);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        bounciness: 2,
        speed: 18,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Close Success Bottom Sheet
  const closeSuccessModal = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSuccessModalData(null);
      if (callback) callback();
      setTimeout(() => {
        mainScrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 60);
    });
  };

  // Login Handler
  const handleLogin = async (rawNatId?: string, rawPass?: string) => {
    const inputVal = (rawNatId || '').trim();
    if (!inputVal) {
      setLoginError(t.nationalIdLabel + ' ' + (lang === 'ar' ? 'مطلوب' : 'is required'));
      return;
    }

    const password = (rawPass || '').trim();
    if (!password) {
      setLoginError(lang === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Password is required');
      return;
    }

    setSubmitting(true);
    setLoginError('');
    try {
      const res = await workApi.login(inputVal, password);

      const isActualAdmin =
        Boolean(res && res.admin && (res.admin.role === 'ADMIN' || res.admin.role === 'SUPER_ADMIN' || res.admin.role === 'SUPERVISOR'));

      if (isActualAdmin && res.admin) {
        setAdminUser(res.admin);
        setEmployee(null);
        await saveCachedUser({ ...res.admin, is_admin: true });
        if (res.access_token) {
          await setAuthToken(res.access_token, res.refresh_token);
          const bioOn = await isBiometricEnabled();
          if (bioOn) {
            await saveLastCredentialsForBiometrics(inputVal, res.access_token, { ...res.admin, is_admin: true }, res.refresh_token);
          }
        }
        setCurrentTab('home');
        return;
      } else if (res && (res.employee || res.is_employee)) {
        const emp = (res.employee || res) as EmployeeProfile;
        setAdminUser(null);
        setEmployee(emp);
        if (emp.motorcycle_number) {
          setEnteredMotorcycle(emp.motorcycle_number);
        }
        await saveCachedUser(emp);
        if (res.access_token) {
          await setAuthToken(res.access_token, res.refresh_token);
          const bioOn = await isBiometricEnabled();
          if (bioOn && emp.national_id) {
            await saveLastCredentialsForBiometrics(emp.national_id, res.access_token, emp, res.refresh_token);
          }
        }
        setCurrentTab('home');

        // Non-blocking background sync of profile, session, and history
        workApi
          .getMe()
          .then(async (fresh) => {
            if (fresh && fresh.id) {
              setEmployee((prev) => ({
                ...(prev || {}),
                ...fresh,
                personal_image: fresh.personal_image || prev?.personal_image || '',
                motorcycle_number: fresh.motorcycle_number || prev?.motorcycle_number || '',
                key_number: fresh.key_number || prev?.key_number || '',
                national_id: fresh.national_id || prev?.national_id || '',
                phone: fresh.phone || prev?.phone || '',
                branch_name: fresh.branch_name || prev?.branch_name || '',
              } as EmployeeProfile));
              const bioOn = await isBiometricEnabled();
              if (bioOn && res.access_token && fresh.national_id) {
                saveLastCredentialsForBiometrics(fresh.national_id, res.access_token, fresh, res.refresh_token);
              }
            }
          })
          .catch((e) => console.log('Notice refreshing profile on Login:', e));

        fetchActiveSession(emp.id).catch(() => {});
        fetchHistory(emp.id).catch(() => {});
      } else {
        setLoginError(t.passwordHint || 'بيانات الدخول غير صحيحة');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError(err?.message || 'تعذر تسجيل الدخول، تأكد من صحة البيانات');
    } finally {
      setSubmitting(false);
    }
  };

  // Immediate Login via OTP Success or Biometrics
  const handleOtpSuccess = async (loginResp?: any) => {
    if (loginResp?.access_token) {
      await setAuthToken(loginResp.access_token, loginResp.refresh_token);
    }

    const isActualAdmin =
      Boolean(loginResp && loginResp.admin && (loginResp.admin.role === 'ADMIN' || loginResp.admin.role === 'SUPER_ADMIN' || loginResp.admin.role === 'SUPERVISOR'));

    if (isActualAdmin && loginResp.admin) {
      setAdminUser(loginResp.admin);
      setEmployee(null);
      await saveCachedUser({ ...loginResp.admin, is_admin: true });
      const bioOn = await isBiometricEnabled();
      if (bioOn) {
        const idVal = loginResp.admin.phone || loginResp.admin.username || 'admin';
        await saveLastCredentialsForBiometrics(idVal, loginResp.access_token, { ...loginResp.admin, is_admin: true }, loginResp.refresh_token);
      }
      setCurrentTab('home');
      return;
    }

    const emp = loginResp?.employee || (loginResp?.id ? loginResp : null);
    if (emp && emp.id) {
      setAdminUser(null);
      setEmployee(emp);
      if (emp.motorcycle_number) {
        setEnteredMotorcycle(emp.motorcycle_number);
      }
      await saveCachedUser(emp);
      setCurrentTab('home');

      // Non-blocking background sync of profile, session, and history
      workApi
        .getMe()
        .then(async (fresh) => {
          if (fresh && fresh.id) {
            setEmployee((prev) => ({
              ...(prev || {}),
              ...fresh,
              personal_image: fresh.personal_image || prev?.personal_image || '',
              motorcycle_number: fresh.motorcycle_number || prev?.motorcycle_number || '',
              key_number: fresh.key_number || prev?.key_number || '',
              national_id: fresh.national_id || prev?.national_id || '',
              phone: fresh.phone || prev?.phone || '',
              branch_name: fresh.branch_name || prev?.branch_name || '',
            } as EmployeeProfile));
            const bioOn = await isBiometricEnabled();
            const curTok = loginResp?.access_token || getStoredToken();
            if (bioOn && curTok && fresh.national_id) {
              saveLastCredentialsForBiometrics(fresh.national_id, curTok, fresh, loginResp?.refresh_token);
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

  // Admin / Supervisor Logout Handler
  const handleAdminLogout = async () => {
    try {
      await setAuthToken(null);
      await saveCachedUser(null);
    } catch (e) {
      console.log('Admin logout error', e);
    }
    setAdminUser(null);
  };

  // Logout Handler
  const handleLogout = async () => {
    setAlertConfig({
      type: 'confirm',
      title: t.logout,
      message: lang === 'ar' ? 'هل أنت متأكد من رغبتك في تسجيل الخروج من التطبيق؟' : 'Are you sure you want to log out from the app?',
      primaryButtonText: t.logout,
      secondaryButtonText: isRTL ? 'إلغاء' : 'Cancel',
      onPrimaryPress: async () => {
        try {
          await setAuthToken(null);
          await saveCachedUser(null);
        } catch (e) {
          console.log('Logout error', e);
        }
        setEmployee(null);
        setAdminUser(null);
        setActiveSession(null);
        setHistorySessions([]);
        setCurrentTab('home');
      },
    });
  };

  // Camera Capture for Odometer
  const takeOdometerPhoto = async (type: 'start' | 'end') => {
    isTakingPhotoRef.current = true;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        setAlertConfig({
          type: 'camera_permission',
          title: lang === 'ar' ? 'إذن استخدام الكاميرا مطلوب' : 'Camera Access Required',
          message:
            lang === 'ar'
              ? 'يرجى السماح للتطبيق باستخدام الكاميرا لالتقاط صورة واضحة لعداد الدراجة.'
              : 'Please allow camera access to take odometer photos for your shift records.',
          primaryButtonText: lang === 'ar' ? 'فتح إعدادات الهاتف' : 'Open Settings',
          secondaryButtonText: isRTL ? 'لاحقاً' : 'Later',
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.08,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        if (type === 'start') {
          startKmImageRef.current = base64Uri;
          setStartKmImage(asset.uri);
        } else {
          endKmImageRef.current = base64Uri;
          setEndKmImage(asset.uri);
        }
      }
    } catch (err) {
      console.error('Camera capture error:', err);
      setAlertConfig({
        type: 'error',
        title: lang === 'ar' ? 'خطأ في الكاميرا' : 'Camera Error',
        message: lang === 'ar' ? 'تعذر فتح الكاميرا، يرجى المحاولة مرة أخرى' : 'Could not launch camera, please try again.',
      });
    } finally {
      setTimeout(() => {
        isTakingPhotoRef.current = false;
      }, 1000);
    }
  };

  // Smart Plate Camera Scan Handlers
  const handleScanPlate = () => {
    setShowPlateScannerModal(true);
  };

  const handleProcessPlateScan = async (imageUri: string, base64Uri: string, plateData?: any) => {
    setIsScanningPlate(true);
    startPlateImageRef.current = base64Uri;
    setStartPlateImage(imageUri);

    if (plateData && (plateData.full_plate || plateData.digits)) {
      const combined = plateData.full_plate || (plateData.letters ? `${plateData.digits} ${plateData.letters}` : plateData.digits);
      setEnteredMotorcycle(combined || '');
      setIsScanningPlate(false);
      return;
    }

    try {
      const scanRes = await workApi.scanPlate(base64Uri);
      if (scanRes && scanRes.full_plate) {
        setEnteredMotorcycle(scanRes.full_plate);
      } else if (scanRes && scanRes.digits) {
        setEnteredMotorcycle(scanRes.letters ? `${scanRes.digits} ${scanRes.letters}` : scanRes.digits);
      }
    } catch (scanErr) {
      console.error('Plate scan API error:', scanErr);
    } finally {
      setIsScanningPlate(false);
    }
  };

  // Start Shift Handler
  const handleStartShift = async () => {
    if (!employee) return;

    if (!enteredMotorcycle.trim()) {
      setAlertConfig({
        type: 'warning',
        title: t.actualBikeNumber,
        message: t.actualBikePlaceholder,
      });
      return;
    }

    let startVal = Number(startKm);
    let photoUri = startKmImageRef.current || startKmImage;

    if (!isOdometerBroken) {
      if (!startKm || isNaN(startVal) || startVal <= 0) {
        setAlertConfig({
          type: 'warning',
          title: t.startKmInputLabel,
          message: t.startKmPlaceholder,
        });
        return;
      }

      if (!photoUri) {
        setAlertConfig({
          type: 'warning',
          title: t.startKmPhotoLabel,
          message: t.odometerGuideSub,
        });
        return;
      }
    } else {
      startVal = 0;
      photoUri = '';
    }

    proceedStartShift(startVal, photoUri);
  };

  const proceedStartShift = async (startVal: number, photoUri: string) => {
    if (!employee) return;

    const savedMoto = enteredMotorcycle.trim();
    const savedStartKm = startVal;
    const savedPhoto = photoUri;
    const savedNotes = startNotes;

    // 1. الانتقال فوراً وبشكل لحظي للداشبورد دون أي انتظار ودون أي موديول
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    setCurrentTab('home');

    // تنظيف حقول شاشة البداية فوراً
    setStartKm('');
    startKmImageRef.current = null;
    setStartKmImage(null);
    startPlateImageRef.current = null;
    setStartPlateImage(null);
    setIsPlateConfirmed(false);
    setStartNotes('');
    setAutoKmFetched(false);

    // تفعيل حالة الشفت التفاؤلية فوراً ليراها الموظف نشطة بالداشبورد
    const optimisticSession: WorkSession = {
      id: 'temp-' + Date.now(),
      employee_id: employee.id,
      motorcycle_number: savedMoto,
      start_km: savedStartKm,
      start_km_image: savedPhoto || undefined,
      notes: savedNotes,
      start_time: new Date().toISOString(),
      end_time: null,
      end_km: 0,
      distance: 0,
      orders_count: 0,
      fuel_cost: 0,
      status: 'ACTIVE',
    };
    setActiveSession(optimisticSession);
    setSubmitting(true);

    try {
      const newSession = await workApi.startShift({
        employee_id: employee.id,
        motorcycle_number: savedMoto,
        start_km: savedStartKm,
        start_km_image: savedPhoto || undefined,
        notes: savedNotes,
      });

      if (newSession && newSession.id) {
        setActiveSession({
          ...newSession,
          start_time: optimisticSession.start_time || newSession.start_time,
        });
        fetchHistory(employee.id).catch(() => {});
        workApi.getMe().then((me) => {
          if (me) setEmployee(me);
        }).catch(() => {});
      }
    } catch (err: any) {
      console.error('Start shift error:', err);
      // في حال وجود خطأ من الخادم (مثل تنبيه الزيت أو خطأ بيانات)، إعادة الحالة لصفحة الدوام وتنبيه الموظف
      setActiveSession(null);
      setCurrentTab('shift');
      setStartKm(String(savedStartKm));
      setStartNotes(savedNotes);
      setAlertConfig({
        type: 'error',
        title: lang === 'ar' ? 'خطأ في بدء الدوام' : 'Shift Error',
        message: err?.message || (lang === 'ar' ? 'تعذر بدء الشفت، يرجى المحاولة ثانية' : 'Failed to start shift'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // End Shift Handler
  const handleEndShift = async () => {
    if (!employee || !activeSession) return;

    let endVal = Number(endKm);
    const startVal = Number(activeSession.start_km || 0);
    const isExemptOdometer = isOdometerBroken || (startVal === 0 && !activeSession.start_km_image);

    const countVal = Number(ordersCount) || 0;
    const fuelVal = Number(fuelCost) || 0;
    const distanceVal = isExemptOdometer ? 0 : Math.max(0, endVal - startVal);
    const photoUri = endKmImageRef.current || endKmImage;

    if (!isExemptOdometer) {
      if (!endKm || isNaN(endVal) || endVal <= 0) {
        setAlertConfig({
          type: 'warning',
          title: t.endKmInputLabel,
          message: `${t.startKmLabel}: ${startVal} ${t.km}`,
        });
        return;
      }

      if (endVal < startVal) {
        setAlertConfig({
          type: 'warning',
          title: lang === 'ar' ? 'تنبيه في قراءة العداد' : 'Odometer Error',
          message:
            lang === 'ar'
              ? `عداد النهاية (${endVal}) لا يمكن أن يكون أقل من عداد البداية (${startVal})`
              : `End KM (${endVal}) cannot be less than Start KM (${startVal})`,
        });
        return;
      }

      if (!photoUri) {
        setAlertConfig({
          type: 'warning',
          title: t.endKmPhotoLabel,
          message: t.odometerGuideSub,
        });
        return;
      }
    } else {
      endVal = 0;
    }

    // Zero orders confirmation bottom sheet modal
    if (countVal < 1) {
      setAlertConfig({
        type: 'confirm',
        title: lang === 'ar' ? 'تأكيد عدد الطلبات' : 'Confirm Orders Count',
        message: lang === 'ar' ? 'هل أنت متأكد أن عدد الطلبات هو 0؟' : 'Are you sure the orders count is 0?',
        primaryButtonText: lang === 'ar' ? 'نعم، تأكيد إنهاء الدوام' : 'Yes, End Shift',
        secondaryButtonText: lang === 'ar' ? 'تعديل عدد الطلبات' : 'Edit Orders',
        onPrimaryPress: () => {
          proceedEndShift(endVal, distanceVal, countVal, fuelVal, photoUri, isExemptOdometer);
        },
      });
      return;
    }

    proceedEndShift(endVal, distanceVal, countVal, fuelVal, photoUri, isExemptOdometer);
  };

  const proceedEndShift = async (
    endVal: number,
    distanceVal: number,
    countVal: number,
    fuelVal: number,
    photoUri: string | null,
    isExemptOdometer: boolean
  ) => {
    if (!employee || !activeSession) return;

    setSubmitting(true);
    try {
      const savedEndKm = endVal;
      const savedOrders = countVal;
      const savedFuel = fuelVal;
      const savedPhoto = isExemptOdometer ? undefined : (photoUri || undefined);
      const savedNotes = endNotes;

      await workApi.endShift({
        employee_id: employee.id,
        end_km: savedEndKm,
        orders_count: savedOrders,
        fuel_cost: savedFuel,
        end_km_image: savedPhoto,
        notes: savedNotes,
      });

      // 1. الانتقال فوراً لسجل الشفتات والتمرير لأعلى الصفحة مباشرة دون أي موديول
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
      setCurrentTab('history');

      // 2. تنظيف الحالة بعد الانتقال
      setActiveSession(null);
      setEndKm('');
      endKmImageRef.current = null;
      setEndKmImage(null);
      setOrdersCount('');
      setFuelCost('');
      setEndNotes('');

      // 3. إعادة تحميل بروفايل الموظف الأصلي والدباب الرسمي وإلغاء استمارة الدباب البديل
      workApi
        .getMe()
        .then(async (fresh) => {
          if (fresh && fresh.id) {
            setEmployee(fresh);
            if (fresh.motorcycle_number) {
              setEnteredMotorcycle(fresh.motorcycle_number);
            }
            await saveCachedUser(fresh);
          }
        })
        .catch((e) => console.log('Notice refreshing profile on End Shift:', e));

      fetchHistory(employee.id);
    } catch (err: any) {
      console.error('End shift error:', err);
      setAlertConfig({
        type: 'error',
        title: lang === 'ar' ? 'خطأ' : 'Error',
        message: err?.message || (lang === 'ar' ? 'تعذر إنهاء الشفت، يرجى المحاولة ثانية' : 'Failed to end shift'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Format Helper Functions
  const formatTimeStr = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  const formatDateStr = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return isoString;
    }
  };

  // Performance & Monthly Target Calculations (Current Calendar Month: Day 1 to End of Month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // All completed sessions in current month (including pending review)
  const currentMonthCompletedSessions = historySessions.filter((s) => {
    if (s.status === 'ACTIVE') return false;
    if (!s.start_time) return true;
    try {
      const sDate = new Date(s.start_time);
      return sDate.getFullYear() === currentYear && sDate.getMonth() === currentMonth;
    } catch (e) {
      return true;
    }
  });

  // Total orders delivered this month:
  // Only supervisor-approved sessions count toward official monthly target & salary calculation
  const totalApprovedOrdersCount = currentMonthCompletedSessions
    .filter((s) => Boolean(s.is_reviewed))
    .reduce((acc, s) => acc + (Number(s.orders_count) || 0), 0);

  const totalApprovedDistance = currentMonthCompletedSessions
    .filter((s) => Boolean(s.is_reviewed))
    .reduce(
      (acc, s) =>
        acc +
        (Number(s.distance) ||
          (s.end_km && s.start_km && Number(s.end_km) >= Number(s.start_km)
            ? Number(s.end_km) - Number(s.start_km)
            : 0)),
      0
    );

  const totalApprovedFuel = currentMonthCompletedSessions
    .filter((s) => Boolean(s.is_reviewed))
    .reduce((acc, s) => acc + (Number(s.fuel_cost) || 0), 0);

  const totalApprovedShifts = currentMonthCompletedSessions.filter((s) => Boolean(s.is_reviewed)).length;

  // Monthly Target Rule:
  // Target = 460 orders
  // 1 to 459 orders -> 5 SAR / order
  // 460 or more orders -> 6 SAR / order
  const monthlyTarget = 460;
  const isTargetAchieved = totalApprovedOrdersCount >= monthlyTarget;
  const currentRatePerOrder = isTargetAchieved ? 6 : 5;
  const expectedSalary = totalApprovedOrdersCount * currentRatePerOrder;
  const targetProgressPct = Math.min(100, Math.round((totalApprovedOrdersCount / monthlyTarget) * 100));
  const remainingOrdersToTarget = Math.max(0, monthlyTarget - totalApprovedOrdersCount);
  const calculatedDistance =
    endKm && activeSession?.start_km && Number(endKm) >= Number(activeSession.start_km)
      ? Number(endKm) - Number(activeSession.start_km)
      : 0;

  const empPhotoUrl = employee?.personal_image
    ? (employee.personal_image.startsWith('http') || employee.personal_image.startsWith('data:')
        ? employee.personal_image
        : `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/uploads/${employee.personal_image.replace(/^\/+/, '')}`)
    : null;

  // Loading Screen
  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not Logged In -> Login Screen
  if (!employee && !adminUser) {
    return (
      <ModuleErrorBoundary moduleName="تسجيل الدخول" colors={colors}>
        <LoginScreen
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          t={t}
          lang={lang}
          onSetLang={handleSetLanguage}
          onLogin={handleLogin}
          onOtpSuccess={handleOtpSuccess}
          loginError={loginError}
          submitting={submitting}
        />
      </ModuleErrorBoundary>
    );
  }

  // Admin Dashboard Portal
  if (adminUser && (adminUser.role === 'ADMIN' || adminUser.role === 'SUPER_ADMIN')) {
    return (
      <ModuleErrorBoundary moduleName="لوحة تحكم الإدارة" colors={colors}>
        <AdminTargetDashboard
          user={adminUser}
          onLogout={handleAdminLogout}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      </ModuleErrorBoundary>
    );
  }

  // Supervisor Dashboard Portal
  if (adminUser && adminUser.role === 'SUPERVISOR') {
    return (
      <ModuleErrorBoundary moduleName="لوحة تحكم المشرف" colors={colors}>
        <SupervisorTargetDashboard
          user={adminUser}
          onLogout={handleAdminLogout}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      </ModuleErrorBoundary>
    );
  }

  // Delegate App - must have authenticated employee
  if (!employee) {
    return (
      <ModuleErrorBoundary moduleName="تسجيل الدخول" colors={colors}>
        <LoginScreen
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          t={t}
          lang={lang}
          onSetLang={handleSetLanguage}
          onLogin={handleLogin}
          onOtpSuccess={handleOtpSuccess}
          loginError={loginError}
          submitting={submitting}
        />
      </ModuleErrorBoundary>
    );
  }

  // Logged In Portal
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Dynamic Header (Seamless & Transparent) */}
      <View style={[styles.appHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {currentTab === 'home' ? (
          /* Home Header: Delegate Profile & Quick QR Trigger */
          <>
            <TouchableOpacity
              style={[styles.headerUserInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => setCurrentTab('profile')}
              onLongPress={() => setShowDiagnosticsModal(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.headerAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                {empPhotoUrl ? (
                  <Image source={{ uri: empPhotoUrl }} style={styles.headerAvatarImg} />
                ) : (
                  <Ionicons name="person" size={20} color={colors.primary} />
                )}
              </View>
              <View style={[styles.headerUserText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.headerNameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="person-outline" size={13} color={colors.primary} />
                  <Text
                    style={[styles.headerUserName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.75}
                  >
                    {employee.name}
                  </Text>
                </View>
                <View style={[styles.headerIdBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="card-outline" size={13} color={colors.primary} />
                  <Text style={[styles.headerUserNationalId, { color: colors.textSecondary }]}>
                    {employee.national_id || '—'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.headerActionBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => setShowQrModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="qr-code-outline" size={24} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* Sub-Page Header: Back Button + Start-Aligned Title with Orange Underline */
          <View style={[styles.subPageHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={() => setCurrentTab('home')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>

            <View style={[styles.subPageTitleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {currentTab === 'shift'
                  ? (activeSession ? t.endShiftTitle : t.startShiftTitle)
                  : currentTab === 'history'
                  ? t.historyTitle
                  : currentTab === 'violations'
                  ? (t.violationsTitle || 'سجل المخالفات والجزاءات')
                  : t.profileTitle}
              </Text>
              <View style={[styles.titleUnderlineBar, { backgroundColor: colors.primary }]} />
            </View>
          </View>
        )}
      </View>

      {/* Main Content Body */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={mainScrollRef}
          scrollEnabled={mainScrollEnabled}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.mainScrollContent,
            { paddingBottom: 24 + (keyboardOffset > 0 ? keyboardOffset + 24 : 0) },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {currentTab === 'home' && (
            <ModuleErrorBoundary moduleName="الرئيسية" colors={colors} onReset={onRefresh}>
              <HomeScreen
                employee={employee}
                activeSession={activeSession}
                historySessions={historySessions}
                totalApprovedOrdersCount={totalApprovedOrdersCount}
                monthlyTarget={monthlyTarget}
                isTargetAchieved={isTargetAchieved}
                expectedSalary={expectedSalary}
                targetProgressPct={targetProgressPct}
                remainingOrdersToTarget={remainingOrdersToTarget}
                elapsedTime={elapsedTime}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                t={t}
                onNavigateToTab={setCurrentTab}
              />
            </ModuleErrorBoundary>
          )}

          {currentTab === 'shift' && (
            <ModuleErrorBoundary moduleName="إدارة الشفت" colors={colors} onReset={() => checkSession(false)}>
              <ShiftScreen
                employee={employee}
                activeSession={activeSession}
                enteredMotorcycle={enteredMotorcycle}
                setEnteredMotorcycle={setEnteredMotorcycle}
                startKm={startKm}
                setStartKm={setStartKm}
                autoKmFetched={autoKmFetched}
                isOdometerBroken={isOdometerBroken}
                startKmImage={startKmImage}
                startPlateImage={startPlateImage}
                isPlateConfirmed={isPlateConfirmed}
                setIsPlateConfirmed={setIsPlateConfirmed}
                startNotes={startNotes}
                setStartNotes={setStartNotes}
                endKm={endKm}
                setEndKm={setEndKm}
                endKmImage={endKmImage}
                ordersCount={ordersCount}
                setOrdersCount={setOrdersCount}
                fuelCost={fuelCost}
                setFuelCost={setFuelCost}
                endNotes={endNotes}
                setEndNotes={setEndNotes}
                calculatedDistance={calculatedDistance}
                elapsedTime={elapsedTime}
                onScrollToInput={(y) => mainScrollRef.current?.scrollTo({ y, animated: true })}
                submitting={submitting}
                onTakeOdometerPhoto={takeOdometerPhoto}
                onScanPlate={handleScanPlate}
                isScanningPlate={isScanningPlate}
                onStartShift={handleStartShift}
                onEndShift={handleEndShift}
                onPreviewPhoto={setPreviewPhoto}
                formatTimeStr={formatTimeStr}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                t={t}
              />
            </ModuleErrorBoundary>
          )}

          {currentTab === 'history' && (
            <ModuleErrorBoundary
              moduleName="سجل الشفتات"
              colors={colors}
              onReset={() => {
                if (employee?.id) fetchHistory(employee.id);
              }}
            >
              <HistoryScreen
                historySessions={historySessions}
                loading={loadingHistory}
                selectedSession={selectedHistorySession}
                onSelectSession={setSelectedHistorySession}
                onPreviewPhoto={setPreviewPhoto}
                formatDateStr={formatDateStr}
                formatTimeStr={formatTimeStr}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                t={t}
              />
            </ModuleErrorBoundary>
          )}

          {currentTab === 'violations' && (
            <ModuleErrorBoundary
              moduleName="المخالفات والجزاءات"
              colors={colors}
              onReset={() => {
                if (employee?.id) fetchViolations(employee.id);
              }}
            >
              <ViolationsScreen
                violations={violations}
                loading={violationsLoading}
                totalAmount={totalViolationsAmount}
                deductedAmount={deductedViolationsAmount}
                onRefresh={() => {
                  if (employee?.id) fetchViolations(employee.id);
                }}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                t={t}
              />
            </ModuleErrorBoundary>
          )}

          {currentTab === 'profile' && (
            <ModuleErrorBoundary moduleName="الملف الشخصي" colors={colors} onReset={() => checkSession(false)}>
              <ProfileScreen
                employee={employee}
                activeSession={activeSession}
                activeBikeRegistrationImage={activeBikeRegistrationImage}
                empPhotoUrl={empPhotoUrl}
                lang={lang}
                onOpenQrModal={() => setShowQrModal(true)}
                onOpenLangModal={() => setShowLangModal(true)}
                onCheckForUpdates={() => handleCheckForUpdates(true)}
                onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
                setParentScrollEnabled={setMainScrollEnabled}
                onLogout={handleLogout}
                onPreviewPhoto={setPreviewPhoto}
                onUpdateEmployee={async (updated) => {
                  setEmployee(updated);
                  await saveCachedUser(updated);
                }}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                t={t}
              />
            </ModuleErrorBoundary>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Fullscreen QR Modal */}
      <QrCodeModal
        visible={showQrModal}
        employee={employee}
        colors={colors}
        isRTL={isRTL}
        t={t}
        onClose={() => setShowQrModal(false)}
      />

      {/* Language Selector Modal */}
      <LanguageModal
        visible={showLangModal}
        currentLang={lang}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        t={t}
        onSelectLang={async (newLang) => {
          await handleSetLanguage(newLang);
          setShowLangModal(false);
        }}
        onClose={() => setShowLangModal(false)}
      />

      {/* Photo Preview Lightbox Modal */}
      <ImagePreviewModal
        previewPhoto={previewPhoto}
        colors={colors}
        isRTL={isRTL}
        onClose={() => setPreviewPhoto(null)}
      />

      {/* Simple Start & End Shift Success Bottom Sheet Modal */}
      {successModalData && (
        <SuccessShiftModal
          data={successModalData}
          employee={employee}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          t={t}
          backdropOpacity={backdropOpacity}
          sheetTranslateY={sheetTranslateY}
          formatTimeStr={formatTimeStr}
          onClose={closeSuccessModal}
          onNavigateToTab={(tab) => {
            mainScrollRef.current?.scrollTo({ y: 0, animated: false });
            setCurrentTab(tab);
          }}
          onPreviewPhoto={setPreviewPhoto}
        />
      )}

      {/* Unified Action Alert & Permissions Bottom Sheet */}
      <ActionAlertBottomSheet
        config={alertConfig}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        onClose={() => setAlertConfig(null)}
      />

      {/* Modern OTA App Update Bottom Sheet */}
      <AppUpdateBottomSheet
        visible={updateModalVisible}
        state={updateState}
        errorMessage={updateError}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        onApplyUpdate={handleApplyUpdate}
        onCheckAgain={() => handleCheckForUpdates(true)}
        onClose={() => setUpdateModalVisible(false)}
      />

      {/* Real-time Diagnostics & Crash Tracing Modal */}
      <DiagnosticsModal
        visible={showDiagnosticsModal}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        onClose={() => setShowDiagnosticsModal(false)}
      />

      {/* Broadcast Announcement & Survey Poll Modal */}
      <BroadcastModal
        visible={showBroadcastModal}
        broadcast={activeBroadcast}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        lang={lang}
        onClose={handleCloseBroadcast}
        onVote={handleVoteBroadcast}
        onPreviewImage={(url) => {
          if (activeBroadcast) {
            setPreviewPhoto({ url, title: activeBroadcast.title });
          }
        }}
      />

      {/* Broadcast History Modal (مركز الإشعارات) */}
      <BroadcastHistoryModal
        visible={showBroadcastHistory}
        broadcasts={allBroadcasts}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        lang={lang}
        onClose={() => setShowBroadcastHistory(false)}
        onSelectBroadcast={(item) => {
          setActiveBroadcast(item);
          setShowBroadcastHistory(false);
          setShowBroadcastModal(true);
        }}
        onPreviewImage={(url) => setPreviewPhoto({ url, title: 'معاينة صورة التعميم' })}
        onRefresh={handleRefreshNotificationsHistory}
        onMarkAllAsRead={handleMarkAllAsRead}
        loading={loadingBroadcastHistory}
      />

      {/* Smart Saudi Plate Live Scanner Modal */}
      <PlateScannerModal
        visible={showPlateScannerModal}
        onClose={() => setShowPlateScannerModal(false)}
        onScanned={handleProcessPlateScan}
        isProcessing={isScanningPlate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appHeader: {
    minHeight: 72,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerUserInfo: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerUserText: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  headerNameRow: {
    alignItems: 'center',
    gap: 5,
  },
  headerUserName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerIdBadgeRow: {
    alignItems: 'center',
    gap: 5,
  },
  headerUserNationalId: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  notifBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  subPageHeaderRow: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  subPageTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  subPageHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  titleUnderlineBar: {
    width: 34,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
  },
  mainScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
});
