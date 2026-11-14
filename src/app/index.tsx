import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { StatusBar, ScrollView, View, Animated, Platform, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useObserve } from 'expo-observe';

import { SuccessModalData, PreviewPhotoData, TabType, Language, ThemeColors, EmployeeProfile } from '../types/delegate';
import { translations } from '../constants/translations';
import { getDelegateThemeColors, formatDelegateTimeStr, formatDelegateDateStr } from '../constants/delegateTheme';
import { saveCachedUser, saveStoredLanguage, formatImageUrl } from '../services/api';
import { initGlobalErrorLogger } from '../services/errorLogger';
import { analytics } from '../services/analytics';
import { notificationService } from '../services/notificationService';

import { LoginScreen } from '../screens/LoginScreen';
import { HomeHeader } from '../components/HomeHeader';
import { DelegateSubPageHeader } from '../components/navigation/DelegateSubPageHeader';
import { DelegateTabContentRouter } from '../components/DelegateTabContentRouter';
import { AlertModalConfig } from '../components/modals/ActionAlertBottomSheet';
import { DelegateModalsPortal } from '../components/modals/DelegateModalsPortal';
import { TargetCelebrationModal } from '../features/performance/components/TargetCelebrationModal';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { HomeScreenSkeleton } from '../components/skeletons/HomeScreenSkeleton';

import { useBroadcasts } from '../hooks/useBroadcasts';
import { useAppUpdates } from '../hooks/useAppUpdates';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useShakeDetection } from '../hooks/useShakeDetection';
import { useShiftWorkflow } from '../hooks/useShiftWorkflow';
import { useViolations } from '../hooks/useViolations';
import { useCollapsibleHomeHeader, HOME_HEADER_HEIGHT } from '../hooks/useCollapsibleHomeHeader';
import { useDelegateAppLifecycle } from '../hooks/useDelegateAppLifecycle';
import { useAuthSession } from '../features/auth-session/useAuthSession';
import { useShiftController } from '../features/shift/hooks/useShiftController';
import { useMonthlyPerformance } from '../features/performance/useMonthlyPerformance';

initGlobalErrorLogger();
analytics.init();

export default function DelegateApp() {
  const { markInteractive } = useObserve();
  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top : Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const isDarkMode = themeMode === 'dark';
  const colors: ThemeColors = useMemo(() => getDelegateThemeColors(isDarkMode), [isDarkMode]);

  const toggleTheme = useCallback(async () => {
    setThemeMode((prev) => {
      const nextMode = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem('@aams_theme_mode', nextMode).catch(() => {});
      return nextMode;
    });
  }, []);

  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [lang, setLang] = useState<Language>('ar');
  const t = translations[lang];
  const isRTL = lang === 'ar' || lang === 'ur';

  const [showQrModal, setShowQrModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhotoData | null>(null);
  const [successModalData, setSuccessModalData] = useState<SuccessModalData | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [showPlateScannerModal, setShowPlateScannerModal] = useState(false);
  const [showAccidentModal, setShowAccidentModal] = useState(false);
  const [oilChangeModalState, setOilChangeModalState] = useState<{ visible: boolean; bikeNumber: string }>({
    visible: false,
    bikeNumber: '',
  });
  const [selectedHistoryMonthKey, setSelectedHistoryMonthKey] = useState<string | null>(null);
  const [selectedHistoryMonthLabel, setSelectedHistoryMonthLabel] = useState<string | null>(null);
  const [showTargetCelebrationModal, setShowTargetCelebrationModal] = useState(false);
  const celebrationCheckedRef = useRef(false);

  const sheetTranslateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const mainScrollRef = useRef<ScrollView>(null);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);
  const [mainScrollEnabled, setMainScrollEnabled] = useState(true);

  const enteredMotoSetterRef = useRef<React.Dispatch<React.SetStateAction<string>>>(() => {});
  const ordersCountSetterRef = useRef<React.Dispatch<React.SetStateAction<string>>>(() => {});
  const sharedTakingPhotoRef = useRef<boolean>(false);
  const fetchViolationsRef = useRef<(empId: string) => void>(() => {});

  const auth = useAuthSession({
    lang, isRTL, t, currentTab, setCurrentTab, setAlertConfig,
    setEnteredMotorcycle: (val) => enteredMotoSetterRef.current(val),
    setOrdersCount: (val) => ordersCountSetterRef.current(val),
    isTakingPhotoRef: sharedTakingPhotoRef,
    fetchViolations: (empId) => fetchViolationsRef.current(empId),
  });
  const {
    employee, setEmployee, loading, submitting, setSubmitting, loginError, activeSession, setActiveSession,
    isSessionSyncing, setIsSessionSyncing, historySessions, setHistorySessions, selectedHistorySession,
    setSelectedHistorySession, loadingHistory, setLoadingHistory, refreshing, checkSession, fetchHistory,
    onRefresh, handleLogin, handleOtpSuccess, handleLogout,
  } = auth;

  const shiftWorkflow = useShiftWorkflow(employee, activeSession);
  enteredMotoSetterRef.current = shiftWorkflow.setEnteredMotorcycle;
  ordersCountSetterRef.current = shiftWorkflow.setOrdersCount;
  const violationsState = useViolations(employee?.id);
  fetchViolationsRef.current = violationsState.fetchViolations;

  const shiftController = useShiftController({
    employee, setEmployee, activeSession, setActiveSession, setIsSessionSyncing,
    setSubmitting, setCurrentTab, mainScrollRef, setAlertConfig, setShowPlateScannerModal,
    setOilChangeModalState, setSelectedHistoryMonthKey, setSelectedHistoryMonthLabel,
    fetchHistory, lang, isRTL, t, ...shiftWorkflow, isTakingPhotoRef: sharedTakingPhotoRef,
  });
  useEffect(() => { sharedTakingPhotoRef.current = shiftWorkflow.isTakingPhotoRef.current; });

  const perf = useMonthlyPerformance(historySessions, activeSession, shiftWorkflow.endKm);
  useEffect(() => {
    if (employee && perf.totalApprovedOrdersCount >= 460 && !celebrationCheckedRef.current) {
      celebrationCheckedRef.current = true;
      setShowTargetCelebrationModal(true);
    }
  }, [employee, perf.totalApprovedOrdersCount]);

  const updates = useAppUpdates(isRTL);
  const broadcasts = useBroadcasts(employee, lang, (bike) => {
    setOilChangeModalState({ visible: true, bikeNumber: bike || shiftWorkflow.enteredMotorcycle || employee?.motorcycle_number || '' });
  });
  usePushNotifications({
    employee, setCurrentTab, mainScrollRef, setHistorySessions, setSelectedHistorySession, setLoadingHistory,
    setActiveBroadcast: broadcasts.setActiveBroadcast, setShowBroadcastModal: broadcasts.setShowBroadcastModal,
    fetchViolations: violationsState.fetchViolations, setSelectedHistoryMonthKey, setSelectedHistoryMonthLabel, lang,
  });
  useShakeDetection({ enabled: Boolean(employee), cooldownMs: 8000, onShake: useCallback(() => setShowAccidentModal(true), []) });
  const { headerTranslateY, handleHomeScroll } = useCollapsibleHomeHeader(currentTab);

  const handleSetLanguage = useCallback(async (newLang: Language) => {
    setLang(newLang);
    await saveStoredLanguage(newLang);
    if (employee?.id) notificationService.initNotifications(employee.id).catch(() => {});
  }, [employee?.id]);

  const closeSuccessModal = useCallback((callback?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: 600, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setSuccessModalData(null);
      if (callback) callback();
      setTimeout(() => mainScrollRef.current?.scrollTo({ y: 0, animated: false }), 60);
    });
  }, [backdropOpacity, sheetTranslateY]);

  useDelegateAppLifecycle({
    loading, markInteractive, setThemeMode, setLang, checkSession, currentTab, setCurrentTab,
    previewPhoto, setPreviewPhoto, showQrModal, setShowQrModal, showLangModal, setShowLangModal,
    successModalData, closeSuccessModal, setSelectedHistoryMonthKey, setSelectedHistoryMonthLabel,
    mainScrollRef, setKeyboardOffset,
  });

  const formatTimeStr = useCallback((iso?: string) => formatDelegateTimeStr(iso, lang), [lang]);
  const formatDateStr = useCallback((iso?: string) => formatDelegateDateStr(iso, lang), [lang]);
  const onUpdateEmployee = useCallback(async (updated: EmployeeProfile) => {
    setEmployee(updated);
    await saveCachedUser(updated);
  }, [setEmployee]);

  const rawEmpPhoto = employee?.personal_image || (employee as any)?.avatar || (employee as any)?.google_avatar || (employee as any)?.photo || (employee as any)?.image || null;
  const empPhotoUrl = formatImageUrl(rawEmpPhoto);

  if (loading) {
    return (
      <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
        <HomeScreenSkeleton colors={colors} isDarkMode={isDarkMode} isRTL={isRTL} includeHeader topInset={topInset} />
      </SafeAreaView>
    );
  }

  if (!employee) {
    return (
      <ModuleErrorBoundary moduleName="تسجيل الدخول" colors={colors}>
        <LoginScreen
          colors={colors} isDarkMode={isDarkMode} isRTL={isRTL} t={t} lang={lang}
          onSetLang={handleSetLanguage} onLogin={handleLogin} onOtpSuccess={handleOtpSuccess}
          loginError={loginError} submitting={submitting}
        />
      </ModuleErrorBoundary>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View style={[styles.statusBarCover, { height: topInset, backgroundColor: colors.bg }]} pointerEvents="none" />

      {currentTab === 'home' ? (
        <Animated.View style={[styles.homeHeaderAnimated, { top: topInset, height: HOME_HEADER_HEIGHT, backgroundColor: colors.bg, transform: [{ translateY: headerTranslateY }] }]}>
          <ModuleErrorBoundary moduleName="شريط الرأس" colors={colors} fallback={null}>
            <HomeHeader
              employee={employee} empPhotoUrl={empPhotoUrl} colors={colors} isRTL={isRTL}
              onPressProfile={() => setCurrentTab('profile')}
              onLongPressProfile={() => setShowDiagnosticsModal(true)}
              onPressQr={() => setShowQrModal(true)}
            />
          </ModuleErrorBoundary>
        </Animated.View>
      ) : (
        <ModuleErrorBoundary moduleName="شريط الصفحة الفرعية" colors={colors} fallback={null}>
          <DelegateSubPageHeader
            currentTab={currentTab} activeSession={activeSession}
            selectedHistoryMonthKey={selectedHistoryMonthKey} selectedHistoryMonthLabel={selectedHistoryMonthLabel}
            setSelectedHistoryMonthKey={setSelectedHistoryMonthKey} setSelectedHistoryMonthLabel={setSelectedHistoryMonthLabel}
            setCurrentTab={setCurrentTab} topInset={topInset} isRTL={isRTL} lang={lang} colors={colors} t={t}
          />
        </ModuleErrorBoundary>
      )}

      <DelegateTabContentRouter
        currentTab={currentTab} setCurrentTab={setCurrentTab} employee={employee} empPhotoUrl={empPhotoUrl}
        activeSession={activeSession} isSessionSyncing={isSessionSyncing} historySessions={historySessions}
        selectedHistorySession={selectedHistorySession} setSelectedHistorySession={setSelectedHistorySession}
        loadingHistory={loadingHistory} selectedHistoryMonthKey={selectedHistoryMonthKey}
        setSelectedHistoryMonthKey={setSelectedHistoryMonthKey} setSelectedHistoryMonthLabel={setSelectedHistoryMonthLabel}
        refreshing={refreshing} onRefresh={onRefresh} checkSession={checkSession} fetchHistory={fetchHistory}
        {...violationsState} {...perf} {...shiftWorkflow} {...shiftController} submitting={submitting}
        setOilChangeModalState={setOilChangeModalState} setShowPlateScannerModal={setShowPlateScannerModal}
        setShowTargetCelebrationModal={setShowTargetCelebrationModal} setShowQrModal={setShowQrModal}
        setShowLangModal={setShowLangModal} toggleTheme={toggleTheme} handleCheckForUpdates={updates.handleCheckForUpdates}
        setShowDiagnosticsModal={setShowDiagnosticsModal} setMainScrollEnabled={setMainScrollEnabled}
        handleLogout={handleLogout} setPreviewPhoto={setPreviewPhoto} onUpdateEmployee={onUpdateEmployee}
        mainScrollRef={mainScrollRef} mainScrollEnabled={mainScrollEnabled} handleHomeScroll={handleHomeScroll}
        topInset={topInset} keyboardOffset={keyboardOffset} formatTimeStr={formatTimeStr} formatDateStr={formatDateStr}
        colors={colors} isDarkMode={isDarkMode} isRTL={isRTL} lang={lang} t={t}
      />

      <DelegateModalsPortal
        employee={employee} activeSession={activeSession} colors={colors} isDarkMode={isDarkMode} isRTL={isRTL}
        lang={lang} t={t} mainScrollRef={mainScrollRef} setCurrentTab={setCurrentTab}
        setSelectedHistoryMonthKey={setSelectedHistoryMonthKey} setSelectedHistoryMonthLabel={setSelectedHistoryMonthLabel}
        showQrModal={showQrModal} setShowQrModal={setShowQrModal} showLangModal={showLangModal} setShowLangModal={setShowLangModal}
        handleSetLanguage={handleSetLanguage} previewPhoto={previewPhoto} setPreviewPhoto={setPreviewPhoto}
        successModalData={successModalData} backdropOpacity={backdropOpacity} sheetTranslateY={sheetTranslateY}
        formatTimeStr={formatTimeStr} closeSuccessModal={closeSuccessModal} alertConfig={alertConfig} setAlertConfig={setAlertConfig}
        oilChangeModalState={oilChangeModalState} setOilChangeModalState={setOilChangeModalState}
        {...updates} {...broadcasts} showDiagnosticsModal={showDiagnosticsModal} setShowDiagnosticsModal={setShowDiagnosticsModal}
        showPlateScannerModal={showPlateScannerModal} handleClosePlateScanner={shiftController.handleClosePlateScanner}
        handleProcessPlateScan={shiftController.handleProcessPlateScan} isScanningPlate={shiftWorkflow.isScanningPlate}
        showAccidentModal={showAccidentModal} setShowAccidentModal={setShowAccidentModal}
      />

      {showTargetCelebrationModal && (
        <ModuleErrorBoundary moduleName="الاحتفال بالهدف" colors={colors} fallback={null}>
          <TargetCelebrationModal
            visible={showTargetCelebrationModal} onClose={() => setShowTargetCelebrationModal(false)}
            ordersCount={perf.totalApprovedOrdersCount} monthlyTarget={perf.monthlyTarget}
            isDarkMode={isDarkMode} isRTL={isRTL}
          />
        </ModuleErrorBoundary>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  statusBarCover: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 40 },
  homeHeaderAnimated: { position: 'absolute', left: 0, right: 0, zIndex: 30 },
});
