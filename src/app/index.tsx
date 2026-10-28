import React, { useState, useEffect, useRef } from 'react';
import {
  StatusBar,
  ScrollView,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Keyboard,
  KeyboardEvent,
  Platform,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types & Constants
import {
  SuccessModalData,
  PreviewPhotoData,
  TabType,
  Language,
  ThemeColors,
} from '../types/delegate';
import { translations } from '../constants/translations';
import {
  getDelegateThemeColors,
  formatDelegateTimeStr,
  formatDelegateDateStr,
} from '../constants/delegateTheme';

// Services
import {
  saveCachedUser,
  getStoredLanguage,
  saveStoredLanguage,
  formatImageUrl,
} from '../services/api';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { HomeHeader } from '../components/HomeHeader';
import { ShiftScreen } from '../features/shift';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ViolationsScreen } from '../screens/ViolationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { OilChangeScreen } from '../screens/OilChangeScreen';

// Modals & Boundaries
import { AlertModalConfig } from '../components/modals/ActionAlertBottomSheet';
import { DelegateModalsPortal } from '../components/modals/DelegateModalsPortal';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { HomeScreenSkeleton } from '../components/skeletons/HomeScreenSkeleton';

// Modular Feature Hooks & Micro-Modules
import { useSessionTimer } from '../hooks/useSessionTimer';
import { useBroadcasts } from '../hooks/useBroadcasts';
import { useAppUpdates } from '../hooks/useAppUpdates';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useShakeDetection } from '../hooks/useShakeDetection';
import { useShiftWorkflow } from '../hooks/useShiftWorkflow';
import { useViolations } from '../hooks/useViolations';
import { useAuthSession } from '../features/auth-session/useAuthSession';
import { useShiftController } from '../features/shift/hooks/useShiftController';
import { useMonthlyPerformance } from '../features/performance/useMonthlyPerformance';
import { initGlobalErrorLogger } from '../services/errorLogger';
import { analytics } from '../services/analytics';
import { notificationService } from '../services/notificationService';
import { useObserve } from 'expo-observe';

// Initialize global crash/error interception immediately on app boot
initGlobalErrorLogger();
analytics.init();

export default function DelegateApp() {
  const { markInteractive } = useObserve();
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight || 0
      : 0;

  // Theme state: Default is Light Mode ('light')
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const isDarkMode = themeMode === 'dark';
  const colors: ThemeColors = getDelegateThemeColors(isDarkMode);

  const toggleTheme = async () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
    try {
      await AsyncStorage.setItem('@aams_theme_mode', nextMode);
    } catch {}
  };

  // Navigation & Language
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [lang, setLang] = useState<Language>('ar');
  const t = translations[lang];
  const isRTL = lang === 'ar' || lang === 'ur';

  // Modals & Popups State
  const [showQrModal, setShowQrModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhotoData | null>(null);
  const [successModalData, setSuccessModalData] = useState<SuccessModalData | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [showPlateScannerModal, setShowPlateScannerModal] = useState(false);
  const [showAccidentModal, setShowAccidentModal] = useState(false);
  const [oilChangeModalState, setOilChangeModalState] = useState<{
    visible: boolean;
    bikeNumber: string;
  }>({
    visible: false,
    bikeNumber: '',
  });
  const [selectedHistoryMonthKey, setSelectedHistoryMonthKey] = useState<string | null>(null);
  const [selectedHistoryMonthLabel, setSelectedHistoryMonthLabel] = useState<string | null>(null);

  // Refs & Layout State
  const sheetTranslateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const mainScrollRef = useRef<ScrollView>(null);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);
  const [mainScrollEnabled, setMainScrollEnabled] = useState(true);

  // Bridge refs for cross-hook wiring without circular dependency
  const enteredMotoSetterRef = useRef<React.Dispatch<React.SetStateAction<string>>>(() => {});
  const ordersCountSetterRef = useRef<React.Dispatch<React.SetStateAction<string>>>(() => {});
  const sharedTakingPhotoRef = useRef<boolean>(false);
  const fetchViolationsRef = useRef<(empId: string) => void>(() => {});

  // 1. Auth & Active Session Micro-Module
  const {
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
    fetchHistory,
    onRefresh,
    handleLogin,
    handleOtpSuccess,
    handleLogout,
  } = useAuthSession({
    lang,
    isRTL,
    t,
    currentTab,
    setCurrentTab,
    setAlertConfig,
    setEnteredMotorcycle: (val) => enteredMotoSetterRef.current(val),
    setOrdersCount: (val) => ordersCountSetterRef.current(val),
    isTakingPhotoRef: sharedTakingPhotoRef,
    fetchViolations: (empId) => fetchViolationsRef.current(empId),
  });

  useEffect(() => {
    if (!loading) {
      markInteractive();
    }
  }, [loading, markInteractive]);

  // 2. Shift Workflow State Hook
  const {
    enteredMotorcycle,
    setEnteredMotorcycle,
    startKm,
    setStartKm,
    startKmImage,
    setStartKmImage,
    startKmImageRef,
    startPlateImage,
    setStartPlateImage,
    startPlateImageRef,
    isPlateConfirmed,
    setIsPlateConfirmed,
    isScanningPlate,
    startNotes,
    setStartNotes,
    autoKmFetched,
    setAutoKmFetched,
    isOdometerBroken,
    activeBikeRegistrationImage,
    setActiveBikeRegistrationImage,
    needsOilChange,
    setNeedsOilChange,
    isTakingPhotoRef,
    endKm,
    setEndKm,
    endKmImage,
    setEndKmImage,
    endKmImageRef,
    ordersCount,
    setOrdersCount,
    fuelCost,
    setFuelCost,
    endNotes,
    setEndNotes,
  } = useShiftWorkflow(employee, activeSession);

  enteredMotoSetterRef.current = setEnteredMotorcycle;
  ordersCountSetterRef.current = setOrdersCount;

  // 3. Violations & Penalties Micro-Module
  const {
    violations,
    violationsLoading,
    totalViolationsAmount,
    deductedViolationsAmount,
    fetchViolations,
  } = useViolations(employee?.id);

  fetchViolationsRef.current = fetchViolations;

  // 4. Shift Controller Micro-Module (Start/End Shift, Camera, Plate OCR, Oil Check)
  const {
    takeOdometerPhoto,
    handleScanPlate,
    handleClosePlateScanner,
    handleStartShiftClick,
    handleNavigateToTab,
    handleRecheckOil,
    handleProcessPlateScan,
    handleStartShift,
    handleEndShift,
  } = useShiftController({
    employee,
    setEmployee,
    activeSession,
    setActiveSession,
    setIsSessionSyncing,
    setSubmitting,
    setCurrentTab,
    mainScrollRef,
    setAlertConfig,
    setShowPlateScannerModal,
    setOilChangeModalState,
    setSelectedHistoryMonthKey,
    setSelectedHistoryMonthLabel,
    fetchHistory,
    lang,
    isRTL,
    t,
    enteredMotorcycle,
    setEnteredMotorcycle,
    startKm,
    setStartKm,
    startKmImage,
    setStartKmImage,
    startKmImageRef,
    startPlateImage,
    setStartPlateImage,
    startPlateImageRef,
    isPlateConfirmed,
    setIsPlateConfirmed,
    startNotes,
    setStartNotes,
    setAutoKmFetched,
    isOdometerBroken,
    setActiveBikeRegistrationImage,
    setNeedsOilChange,
    isTakingPhotoRef: sharedTakingPhotoRef,
    endKm,
    setEndKm,
    endKmImage,
    setEndKmImage,
    endKmImageRef,
    ordersCount,
    setOrdersCount,
    fuelCost,
    setFuelCost,
    endNotes,
    setEndNotes,
  });

  // Sync camera flag ref
  useEffect(() => {
    sharedTakingPhotoRef.current = isTakingPhotoRef.current;
  });

  // 5. Active Shift Timer Micro-Module
  const { elapsedTime } = useSessionTimer(activeSession);

  // 6. Monthly Target & Earnings Micro-Module
  const {
    monthlyTarget,
    totalApprovedOrdersCount,
    totalPendingOrdersCount,
    isTargetAchieved,
    expectedSalary,
    targetProgressPct,
    remainingOrdersToTarget,
    calculatedDistance,
  } = useMonthlyPerformance(historySessions, activeSession, endKm);

  // 7. OTA Updates Micro-Module
  const {
    updateModalVisible,
    setUpdateModalVisible,
    updateState,
    updateError,
    handleCheckForUpdates,
    handleApplyUpdate,
  } = useAppUpdates(isRTL);

  // 8. Broadcasts & Polls Micro-Module
  const {
    activeBroadcast,
    setActiveBroadcast,
    showBroadcastModal,
    setShowBroadcastModal,
    showBroadcastHistory,
    setShowBroadcastHistory,
    allBroadcasts,
    loadingBroadcastHistory,
    handleVoteBroadcast,
    handleCloseBroadcast,
    handleRefreshNotificationsHistory,
    handleMarkAllAsRead,
  } = useBroadcasts(employee);

  // 9. Push Notifications Micro-Module
  usePushNotifications({
    employee,
    setCurrentTab,
    mainScrollRef,
    setHistorySessions,
    setSelectedHistorySession,
    setLoadingHistory,
    setActiveBroadcast,
    setShowBroadcastModal,
    fetchViolations,
    setSelectedHistoryMonthKey,
    setSelectedHistoryMonthLabel,
    lang,
  });

  // 10. Emergency Shake Detection Micro-Module
  useShakeDetection({
    enabled: Boolean(employee),
    cooldownMs: 8000,
    onShake: () => {
      setShowAccidentModal(true);
    },
  });

  // Collapsible Home Header Animation
  const HOME_HEADER_HEIGHT = 72;
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isHeaderHidden = useRef(false);
  const scrollDelta = useRef(0);

  useEffect(() => {
    headerTranslateY.setValue(0);
    isHeaderHidden.current = false;
    lastScrollY.current = 0;
    scrollDelta.current = 0;
  }, [currentTab]);

  const handleHomeScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (currentTab !== 'home') return;

    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;
    lastScrollY.current = currentY;

    if (currentY <= 10) {
      scrollDelta.current = 0;
      if (isHeaderHidden.current) {
        isHeaderHidden.current = false;
        Animated.spring(headerTranslateY, {
          toValue: 0,
          damping: 20,
          stiffness: 220,
          useNativeDriver: true,
        }).start();
      }
      return;
    }

    if (diff > 0) {
      if (scrollDelta.current < 0) scrollDelta.current = 0;
      scrollDelta.current += diff;
      if (scrollDelta.current >= 6 && currentY > 15 && !isHeaderHidden.current) {
        isHeaderHidden.current = true;
        Animated.timing(headerTranslateY, {
          toValue: -HOME_HEADER_HEIGHT,
          duration: 180,
          useNativeDriver: true,
        }).start();
      }
    } else if (diff < 0) {
      if (scrollDelta.current > 0) scrollDelta.current = 0;
      scrollDelta.current += diff;
      if (scrollDelta.current <= -6 && isHeaderHidden.current) {
        isHeaderHidden.current = false;
        Animated.spring(headerTranslateY, {
          toValue: 0,
          damping: 20,
          stiffness: 220,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const handleSetLanguage = async (newLang: Language) => {
    setLang(newLang);
    await saveStoredLanguage(newLang);
    if (employee?.id) {
      notificationService.initNotifications(employee.id).catch(() => {});
    }
  };

  // Initial Boot: Theme, Language, Camera Warmup & Session Restoration
  useEffect(() => {
    ImagePicker.getCameraPermissionsAsync()
      .then(({ granted }) => {
        if (!granted) {
          ImagePicker.requestCameraPermissionsAsync().catch(() => {});
        }
      })
      .catch(() => {});

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
  }, [currentTab, previewPhoto, showQrModal, showLangModal, successModalData]);

  // Analytics Screen Tracking & Scroll Reset on Tab Change
  useEffect(() => {
    analytics.setScreen(`Tab_${currentTab}`);
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    const timer = setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 60);
    return () => clearTimeout(timer);
  }, [currentTab]);

  // Dynamic Keyboard Height Listener
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

  const formatTimeStr = (isoString?: string) => formatDelegateTimeStr(isoString, lang);
  const formatDateStr = (isoString?: string) => formatDelegateDateStr(isoString, lang);

  const rawEmpPhoto =
    employee?.personal_image ||
    (employee as any)?.avatar ||
    (employee as any)?.google_avatar ||
    (employee as any)?.photo ||
    (employee as any)?.image ||
    null;
  const empPhotoUrl = formatImageUrl(rawEmpPhoto);

  // Loading Screen -> Full Home Skeleton (Header + Target + KPIs + Quick Cards)
  if (loading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
        <HomeScreenSkeleton
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          includeHeader
          topInset={topInset}
        />
      </SafeAreaView>
    );
  }

  // Not Logged In -> Login Screen
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
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Status Bar Cover */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: topInset,
          backgroundColor: colors.bg,
          zIndex: 40,
        }}
        pointerEvents="none"
      />

      {/* Collapsible Header on 'home', Sub-Page Header on other tabs */}
      {currentTab === 'home' ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: topInset,
            left: 0,
            right: 0,
            height: HOME_HEADER_HEIGHT,
            backgroundColor: colors.bg,
            zIndex: 30,
            transform: [{ translateY: headerTranslateY }],
          }}
        >
          <ModuleErrorBoundary moduleName="شريط الرأس" colors={colors} fallback={null}>
            <HomeHeader
              employee={employee}
              empPhotoUrl={empPhotoUrl}
              colors={colors}
              isRTL={isRTL}
              onPressProfile={() => setCurrentTab('profile')}
              onLongPressProfile={() => setShowDiagnosticsModal(true)}
              onPressQr={() => setShowQrModal(true)}
            />
          </ModuleErrorBoundary>
        </Animated.View>
      ) : (
        <View style={[styles.appHeader, { marginTop: topInset, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.subPageHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={() => {
                if (currentTab === 'history' && selectedHistoryMonthKey) {
                  setSelectedHistoryMonthKey(null);
                  setSelectedHistoryMonthLabel(null);
                } else {
                  setCurrentTab('home');
                }
              }}
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
                  ? activeSession
                    ? t.endShiftTitle
                    : t.startShiftTitle
                  : currentTab === 'history'
                  ? selectedHistoryMonthLabel
                    ? lang === 'ar'
                      ? `طلبات شهر ${selectedHistoryMonthLabel}`
                      : lang === 'ur'
                      ? `${selectedHistoryMonthLabel} کے آرڈرز`
                      : lang === 'bn'
                      ? `${selectedHistoryMonthLabel} এর অর্ডারসমূহ`
                      : `${selectedHistoryMonthLabel} Orders`
                    : t.historyTitle
                  : currentTab === 'violations'
                  ? t.violationsTitle || 'سجل المخالفات والجزاءات'
                  : currentTab === 'oil-change'
                  ? t.oilChangeScreenTitle || (lang === 'ar' ? 'صفحة تغيير الزيت' : 'Oil Change Page')
                  : t.profileTitle}
              </Text>
              <View style={[styles.titleUnderlineBar, { backgroundColor: colors.primary }]} />
            </View>
          </View>
        </View>
      )}

      {/* Main Content Body */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {currentTab === 'violations' ? (
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
              lang={lang}
            />
          </ModuleErrorBoundary>
        ) : (
          <ScrollView
            ref={mainScrollRef}
            scrollEnabled={mainScrollEnabled}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onScroll={handleHomeScroll}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.mainScrollContent,
              {
                paddingTop: currentTab === 'home' ? topInset + HOME_HEADER_HEIGHT : 0,
                paddingBottom: 24 + (keyboardOffset > 0 ? keyboardOffset + 24 : 0),
              },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
                progressViewOffset={topInset + (currentTab === 'home' ? HOME_HEADER_HEIGHT : 0)}
              />
            }
          >
            {currentTab === 'home' && (
              <ModuleErrorBoundary moduleName="الرئيسية" colors={colors} onReset={onRefresh}>
                <HomeScreen
                  employee={employee}
                  activeSession={activeSession}
                  isSessionSyncing={isSessionSyncing}
                  isHomeLoading={isSessionSyncing || (loadingHistory && historySessions.length === 0 && !activeSession)}
                  historySessions={historySessions}
                  totalApprovedOrdersCount={totalApprovedOrdersCount}
                  pendingOrdersCount={totalPendingOrdersCount}
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
                  lang={lang}
                  violations={violations}
                  totalViolationsAmount={totalViolationsAmount}
                  deductedViolationsAmount={deductedViolationsAmount}
                  onNavigateToTab={handleNavigateToTab}
                  onStartShiftClick={handleStartShiftClick}
                />
              </ModuleErrorBoundary>
            )}

            {currentTab === 'shift' && (
              <ModuleErrorBoundary moduleName="إدارة الشفت" colors={colors} onReset={() => checkSession(false)}>
                <ShiftScreen
                  employee={employee}
                  activeSession={activeSession}
                  isSessionSyncing={isSessionSyncing}
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
                  activeBikeRegistrationImage={activeBikeRegistrationImage}
                  needsOilChange={needsOilChange}
                  onOpenOilChangeModal={() =>
                    setOilChangeModalState({
                      visible: true,
                      bikeNumber: enteredMotorcycle,
                    })
                  }
                  onPreviewPhoto={setPreviewPhoto}
                  formatTimeStr={formatTimeStr}
                  colors={colors}
                  isDarkMode={isDarkMode}
                  isRTL={isRTL}
                  t={t}
                  lang={lang}
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
                  selectedMonthKey={selectedHistoryMonthKey}
                  onSelectMonthKey={(key, label) => {
                    setSelectedHistoryMonthKey(key);
                    setSelectedHistoryMonthLabel(label);
                  }}
                  onPreviewPhoto={setPreviewPhoto}
                  formatDateStr={formatDateStr}
                  formatTimeStr={formatTimeStr}
                  colors={colors}
                  isDarkMode={isDarkMode}
                  isRTL={isRTL}
                  t={t}
                  lang={lang}
                  monthlyTarget={monthlyTarget}
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
                  onToggleTheme={toggleTheme}
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

            {currentTab === 'oil-change' && (
              <ModuleErrorBoundary moduleName="صفحة تغيير الزيت" colors={colors} onReset={handleRecheckOil}>
                <OilChangeScreen
                  motorcycleNumber={enteredMotorcycle}
                  distanceSinceOil={Number(startKm) || 0}
                  colors={colors}
                  isDarkMode={isDarkMode}
                  isRTL={isRTL}
                  lang={lang}
                  t={t}
                  onRecheck={handleRecheckOil}
                  onScanAnother={() => setShowPlateScannerModal(true)}
                  onBackToHome={() => setCurrentTab('home')}
                />
              </ModuleErrorBoundary>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Isolated Modals Portal Micro-Module */}
      <DelegateModalsPortal
        employee={employee}
        activeSession={activeSession}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        lang={lang}
        t={t}
        mainScrollRef={mainScrollRef}
        setCurrentTab={setCurrentTab}
        setSelectedHistoryMonthKey={setSelectedHistoryMonthKey}
        setSelectedHistoryMonthLabel={setSelectedHistoryMonthLabel}
        showQrModal={showQrModal}
        setShowQrModal={setShowQrModal}
        showLangModal={showLangModal}
        setShowLangModal={setShowLangModal}
        handleSetLanguage={handleSetLanguage}
        previewPhoto={previewPhoto}
        setPreviewPhoto={setPreviewPhoto}
        successModalData={successModalData}
        backdropOpacity={backdropOpacity}
        sheetTranslateY={sheetTranslateY}
        formatTimeStr={formatTimeStr}
        closeSuccessModal={closeSuccessModal}
        alertConfig={alertConfig}
        setAlertConfig={setAlertConfig}
        oilChangeModalState={oilChangeModalState}
        setOilChangeModalState={setOilChangeModalState}
        updateModalVisible={updateModalVisible}
        setUpdateModalVisible={setUpdateModalVisible}
        updateState={updateState}
        updateError={updateError}
        handleApplyUpdate={handleApplyUpdate}
        handleCheckForUpdates={handleCheckForUpdates}
        showDiagnosticsModal={showDiagnosticsModal}
        setShowDiagnosticsModal={setShowDiagnosticsModal}
        activeBroadcast={activeBroadcast}
        setActiveBroadcast={setActiveBroadcast}
        showBroadcastModal={showBroadcastModal}
        setShowBroadcastModal={setShowBroadcastModal}
        showBroadcastHistory={showBroadcastHistory}
        setShowBroadcastHistory={setShowBroadcastHistory}
        allBroadcasts={allBroadcasts}
        loadingBroadcastHistory={loadingBroadcastHistory}
        handleCloseBroadcast={handleCloseBroadcast}
        handleVoteBroadcast={handleVoteBroadcast}
        handleRefreshNotificationsHistory={handleRefreshNotificationsHistory}
        handleMarkAllAsRead={handleMarkAllAsRead}
        showPlateScannerModal={showPlateScannerModal}
        handleClosePlateScanner={handleClosePlateScanner}
        handleProcessPlateScan={handleProcessPlateScan}
        isScanningPlate={isScanningPlate}
        showAccidentModal={showAccidentModal}
        setShowAccidentModal={setShowAccidentModal}
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
