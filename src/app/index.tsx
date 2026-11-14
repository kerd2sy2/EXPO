import React, { useState, useRef } from 'react';
import { StatusBar, ScrollView, View, ActivityIndicator, Animated, Platform, StyleSheet, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useObserve } from 'expo-observe';
import { useKeepAwake } from 'expo-keep-awake';

import { EmployeeProfile, WorkSession, TabType, Language } from '../types/delegate';
import { translations } from '../constants/translations';
import { saveCachedUser, saveStoredLanguage } from '../services/api';
import { hasCustodyPermission, openOhdaApp } from '../utils/custodyPermissions';
import { initGlobalErrorLogger } from '../services/errorLogger';
import { analytics } from '../services/analytics';
import { notificationService } from '../services/notificationService';

import { LoginScreen } from '../screens/LoginScreen';
import { HomeHeader } from '../components/HomeHeader';
import { getCurrentMonthInfo } from '../screens/HistoryScreen';
import { AppModalsContainer } from '../components/AppModalsContainer';
import { SubPageHeader } from '../components/layout/SubPageHeader';
import { SupervisorTabContent } from '../components/layout/SupervisorTabContent';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';

import { useSessionTimer } from '../hooks/useSessionTimer';
import { useBroadcasts } from '../hooks/useBroadcasts';
import { useAppUpdates } from '../hooks/useAppUpdates';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useShakeDetection } from '../hooks/useShakeDetection';
import { useShiftWorkflow } from '../hooks/useShiftWorkflow';
import { useViolations } from '../hooks/useViolations';
import { useSupervisorDataSync } from '../hooks/useSupervisorDataSync';
import { buildThemeColors, useAppAnalyticsAndDerivedState } from '../hooks/useAppAnalyticsAndDerivedState';
import { useAppAuthAndSession } from '../hooks/useAppAuthAndSession';
import { useAppShiftMediaAndActions } from '../hooks/useAppShiftMediaAndActions';
import { useAppLifecycleAndEffects, HOME_HEADER_HEIGHT } from '../hooks/useAppLifecycleAndEffects';
import { useAppUiAndModalsState } from '../hooks/useAppUiAndModalsState';

initGlobalErrorLogger();
analytics.init();

export default function DelegateApp() {
  useKeepAwake();
  const { markInteractive } = useObserve();
  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top : Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');
  const isDarkMode = themeMode === 'dark';
  const colors = buildThemeColors(isDarkMode);
  const toggleTheme = async () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
    try {
      await AsyncStorage.setItem('@aams_theme_mode', nextMode);
    } catch {}
  };

  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [lang, setLang] = useState<Language>('ar');
  const t = translations[lang];
  const isRTL = lang === 'ar' || lang === 'ur';

  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [historySessions, setHistorySessions] = useState<WorkSession[]>([]);
  const [selectedHistorySession, setSelectedHistorySession] = useState<WorkSession | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const mainScrollRef = useRef<ScrollView>(null);
  const dashboardScrollRef = useRef<ScrollView>(null);

  const ui = useAppUiAndModalsState(mainScrollRef);
  const supervisorSync = useSupervisorDataSync(employee);
  const shift = useShiftWorkflow(employee, activeSession);
  const violationsState = useViolations(employee?.id);
  const { elapsedTime } = useSessionTimer(activeSession);
  const updates = useAppUpdates(isRTL);
  const broadcasts = useBroadcasts(employee);

  usePushNotifications({
    employee,
    setCurrentTab,
    mainScrollRef,
    setHistorySessions,
    setSelectedHistorySession,
    setLoadingHistory,
    setActiveBroadcast: broadcasts.setActiveBroadcast,
    setShowBroadcastModal: broadcasts.setShowBroadcastModal,
    fetchViolations: violationsState.fetchViolations,
    setSelectedHistoryMonthKey: ui.setSelectedHistoryMonthKey,
    setSelectedHistoryMonthLabel: ui.setSelectedHistoryMonthLabel,
    lang,
    onSelectApprovalSession: (sessionId, employeeId) => {
      ui.setTargetApprovalSessionId(sessionId || null);
      ui.setTargetApprovalEmployeeId(employeeId || null);
      supervisorSync.syncPendingRequests(false);
    },
    onRefreshSupervisor: () => supervisorSync.syncPendingRequests(true),
  });

  useShakeDetection({
    enabled: Boolean(employee),
    cooldownMs: 8000,
    onShake: () => ui.setShowAccidentModal(true),
  });

  const auth = useAppAuthAndSession({
    employee,
    setEmployee,
    setLoading,
    setSubmitting,
    setLoginError,
    activeSession,
    setActiveSession,
    setHistorySessions,
    setLoadingHistory,
    setEnteredMotorcycle: shift.setEnteredMotorcycle,
    setOrdersCount: shift.setOrdersCount,
    setCurrentTab,
    setAlertConfig: ui.setAlertConfig,
    isTakingPhotoRef: shift.isTakingPhotoRef,
    fetchViolations: violationsState.fetchViolations,
    fetchSupervisorData: supervisorSync.fetchSupervisorData,
    fetchOperationsData: supervisorSync.fetchOperationsData,
    resetSupervisorState: supervisorSync.resetSupervisorState,
    lang,
    isRTL,
    t,
  });

  const shiftActions = useAppShiftMediaAndActions({
    employee,
    setEmployee,
    activeSession,
    setActiveSession,
    setSubmitting,
    ...shift,
    setCurrentTab,
    setAlertConfig: ui.setAlertConfig,
    setShowPlateScannerModal: ui.setShowPlateScannerModal,
    setOilChangeModalState: ui.setOilChangeModalState,
    setSelectedHistoryMonthKey: ui.setSelectedHistoryMonthKey,
    setSelectedHistoryMonthLabel: ui.setSelectedHistoryMonthLabel,
    mainScrollRef,
    fetchHistory: auth.fetchHistory,
    lang,
    isRTL,
    t,
  });

  const { headerTranslateY, handleHomeScroll } = useAppLifecycleAndEffects({
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
    setReadNotifIds: ui.setReadNotifIds,
    isTakingPhotoRef: shift.isTakingPhotoRef,
    hasLoadedSupervisorInitialRef: supervisorSync.hasLoadedSupervisorInitialRef,
    mainScrollRef,
    dashboardScrollRef,
    checkSession: auth.checkSession,
    performClearSession: auth.performClearSession,
    syncPendingRequests: supervisorSync.syncPendingRequests,
    fetchSupervisorData: supervisorSync.fetchSupervisorData,
    fetchOperationsData: supervisorSync.fetchOperationsData,
    setAlertConfig: ui.setAlertConfig,
    previewPhoto: ui.previewPhoto,
    setPreviewPhoto: ui.setPreviewPhoto,
    showQrModal: ui.showQrModal,
    setShowQrModal: ui.setShowQrModal,
    showLangModal: ui.showLangModal,
    setShowLangModal: ui.setShowLangModal,
    successModalData: ui.successModalData,
    closeSuccessModal: ui.closeSuccessModal,
    setSelectedHistoryMonthKey: ui.setSelectedHistoryMonthKey,
    setSelectedHistoryMonthLabel: ui.setSelectedHistoryMonthLabel,
    setKeyboardOffset: ui.setKeyboardOffset,
  });

  const derived = useAppAnalyticsAndDerivedState({
    employee,
    branchSessions: supervisorSync.branchSessions,
    historySessions,
    serverDashboardStats: supervisorSync.serverDashboardStats,
    branchDelegates: supervisorSync.branchDelegates,
    allBranchEmployees: supervisorSync.allBranchEmployees,
    workingDelegates: supervisorSync.workingDelegates,
    pendingSessions: supervisorSync.pendingSessions,
    vehicles: supervisorSync.vehicles,
    pendingMaintenance: supervisorSync.pendingMaintenance,
    pendingAdvances: supervisorSync.pendingAdvances,
    readNotifIds: ui.readNotifIds,
    endKm: shift.endKm,
    activeSession,
  });

  const handleSetLanguage = async (newLang: Language) => {
    setLang(newLang);
    await saveStoredLanguage(newLang);
    if (employee?.id) {
      notificationService.initNotifications(employee.id).catch(() => {});
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

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
          onLogin={auth.handleLogin}
          onOtpSuccess={auth.handleOtpSuccess}
          loginError={loginError}
          submitting={submitting}
        />
      </ModuleErrorBoundary>
    );
  }

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: topInset, backgroundColor: colors.bg, zIndex: 40 }}
        pointerEvents="none"
      />

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
          <HomeHeader
            employee={employee}
            empPhotoUrl={derived.empPhotoUrl}
            colors={colors}
            isRTL={isRTL}
            onPressProfile={() => setCurrentTab('profile')}
            onLongPressProfile={() => ui.setShowDiagnosticsModal(true)}
            onPressQr={() => ui.setShowQrModal(true)}
            unreadCount={derived.unreadNotificationsCount}
            onPressNotifications={() => setCurrentTab('notifications')}
          />
        </Animated.View>
      ) : (
        <View style={{ marginTop: topInset }}>
          <SubPageHeader
            currentTab={currentTab}
            colors={colors}
            isRTL={isRTL}
            onBack={() => {
              if (currentTab === 'history' && ui.selectedHistoryMonthKey) {
                ui.setSelectedHistoryMonthKey(null);
                ui.setSelectedHistoryMonthLabel(null);
              } else {
                setCurrentTab('home');
              }
            }}
            activeSession={activeSession}
            selectedHistoryMonthLabel={ui.selectedHistoryMonthLabel ?? undefined}
            lang={lang}
            t={t}
            onOpenOrdersDatePicker={() => ui.setOrdersDatePickerOpen(true)}
            onNotifMarkAll={() => ui.notifHeaderActionsRef.current?.markAll()}
            onNotifClearModal={() => ui.notifHeaderActionsRef.current?.openClearModal()}
          />
        </View>
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SupervisorTabContent
          currentTab={currentTab}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          topInset={topInset}
          homeHeaderHeight={HOME_HEADER_HEIGHT}
          employee={employee}
          dashboardScrollRef={dashboardScrollRef}
          branchStats={derived.branchStats}
          branchScopedWorkingDelegates={derived.branchScopedWorkingDelegates}
          branchScopedDelegates={derived.branchScopedDelegates}
          pendingSessions={supervisorSync.pendingSessions}
          vehicles={supervisorSync.vehicles}
          todayApprovedOrdersCount={derived.todayApprovedOrdersCount}
          todayApprovedDistance={derived.todayApprovedDistance}
          todayApprovedFuel={derived.todayApprovedFuel}
          isInitialSupervisorLoading={supervisorSync.isInitialSupervisorLoading}
          loadingSupervisorData={supervisorSync.loadingSupervisorData}
          fetchSupervisorData={supervisorSync.fetchSupervisorData}
          handleHomeScroll={handleHomeScroll}
          setCurrentTab={setCurrentTab}
          handleNavigateToTab={shiftActions.handleNavigateToTab}
          setShowReportModal={ui.setShowReportModal}
          setReportInitialMode={ui.setReportInitialMode}
          setAdvanceInitialMode={ui.setAdvanceInitialMode}
          setShowOperationVideoModal={ui.setShowOperationVideoModal}
          openOhdaApp={openOhdaApp}
          hasCustodyPermission={hasCustodyPermission}
          violations={violationsState.violations}
          violationsLoading={violationsState.violationsLoading}
          totalViolationsAmount={violationsState.totalViolationsAmount}
          deductedViolationsAmount={violationsState.deductedViolationsAmount}
          fetchViolations={violationsState.fetchViolations}
          t={t}
          lang={lang}
          branchSessions={supervisorSync.branchSessions}
          handleOverrideSuccess={supervisorSync.handleOverrideSuccess}
          pendingAdvances={supervisorSync.pendingAdvances}
          pendingMaintenance={supervisorSync.pendingMaintenance}
          loadingApprovalsOnly={supervisorSync.loadingApprovalsOnly}
          refreshApprovalsOnly={supervisorSync.refreshApprovalsOnly}
          setPreviewPhoto={ui.setPreviewPhoto}
          targetApprovalSessionId={ui.targetApprovalSessionId}
          targetApprovalEmployeeId={ui.targetApprovalEmployeeId}
          setTargetApprovalSessionId={ui.setTargetApprovalSessionId}
          setTargetApprovalEmployeeId={ui.setTargetApprovalEmployeeId}
          setPendingSessions={supervisorSync.setPendingSessions}
          setPendingAdvances={supervisorSync.setPendingAdvances}
          setPendingMaintenance={supervisorSync.setPendingMaintenance}
          inventoryItems={supervisorSync.inventoryItems}
          loadingOperationsData={supervisorSync.loadingOperationsData}
          fetchOperationsData={supervisorSync.fetchOperationsData}
          handleVehicleDispensedOptimistic={supervisorSync.handleVehicleDispensedOptimistic}
          reportInitialMode={ui.reportInitialMode}
          advanceInitialMode={ui.advanceInitialMode}
          setReadNotifIds={ui.setReadNotifIds}
          notifHeaderActionsRef={ui.notifHeaderActionsRef}
          ordersDatePickerOpen={ui.ordersDatePickerOpen}
          setOrdersDatePickerOpen={ui.setOrdersDatePickerOpen}
          historySessions={historySessions}
          loadingHistory={loadingHistory}
          selectedHistorySession={selectedHistorySession}
          setSelectedHistorySession={setSelectedHistorySession}
          selectedHistoryMonthKey={ui.selectedHistoryMonthKey}
          setSelectedHistoryMonthKey={ui.setSelectedHistoryMonthKey}
          setSelectedHistoryMonthLabel={ui.setSelectedHistoryMonthLabel}
          fetchHistory={auth.fetchHistory}
          formatDateStr={shiftActions.formatDateStr}
          formatTimeStr={shiftActions.formatTimeStr}
          monthlyTarget={derived.monthlyTarget}
          mainScrollRef={mainScrollRef}
          mainScrollEnabled={ui.mainScrollEnabled}
          keyboardOffset={ui.keyboardOffset}
          refreshing={auth.refreshing}
          onRefresh={auth.onRefresh}
          checkSession={auth.checkSession}
          activeSession={activeSession}
          {...shift}
          calculatedDistance={derived.calculatedDistance}
          elapsedTime={elapsedTime}
          submitting={submitting}
          takeOdometerPhoto={shiftActions.takeOdometerPhoto}
          handleScanPlate={shiftActions.handleScanPlate}
          handleStartShift={shiftActions.handleStartShift}
          handleEndShift={shiftActions.handleEndShift}
          setOilChangeModalState={ui.setOilChangeModalState}
          empPhotoUrl={derived.empPhotoUrl}
          setShowQrModal={ui.setShowQrModal}
          setShowLangModal={ui.setShowLangModal}
          toggleTheme={toggleTheme}
          handleCheckForUpdates={updates.handleCheckForUpdates}
          setShowDiagnosticsModal={ui.setShowDiagnosticsModal}
          setMainScrollEnabled={ui.setMainScrollEnabled}
          handleLogout={auth.handleLogout}
          setEmployee={setEmployee}
          saveCachedUser={saveCachedUser}
        />
      </KeyboardAvoidingView>

      <AppModalsContainer
        showQrModal={ui.showQrModal}
        setShowQrModal={ui.setShowQrModal}
        showLangModal={ui.showLangModal}
        setShowLangModal={ui.setShowLangModal}
        lang={lang}
        onSelectLang={async (newLang) => {
          await handleSetLanguage(newLang);
          ui.setShowLangModal(false);
        }}
        previewPhoto={ui.previewPhoto}
        setPreviewPhoto={ui.setPreviewPhoto}
        successModalData={ui.successModalData}
        backdropOpacity={ui.backdropOpacity}
        sheetTranslateY={ui.sheetTranslateY}
        formatTimeStr={shiftActions.formatTimeStr}
        onCloseSuccessModal={ui.closeSuccessModal}
        onNavigateToTab={(tab) => {
          if (tab === 'history') {
            const currentMonth = getCurrentMonthInfo(lang);
            ui.setSelectedHistoryMonthKey(currentMonth.key);
            ui.setSelectedHistoryMonthLabel(currentMonth.label);
          }
          mainScrollRef.current?.scrollTo({ y: 0, animated: false });
          setCurrentTab(tab);
        }}
        alertConfig={ui.alertConfig}
        setAlertConfig={ui.setAlertConfig}
        oilChangeModalState={ui.oilChangeModalState}
        setOilChangeModalState={ui.setOilChangeModalState}
        updateModalVisible={updates.updateModalVisible}
        updateState={updates.updateState}
        updateError={updates.updateError}
        onApplyUpdate={updates.handleApplyUpdate}
        onCheckAgain={() => updates.handleCheckForUpdates(true)}
        onCloseUpdateModal={() => updates.setUpdateModalVisible(false)}
        showDiagnosticsModal={ui.showDiagnosticsModal}
        setShowDiagnosticsModal={ui.setShowDiagnosticsModal}
        showBroadcastModal={broadcasts.showBroadcastModal}
        activeBroadcast={broadcasts.activeBroadcast}
        onCloseBroadcast={broadcasts.handleCloseBroadcast}
        onVoteBroadcast={broadcasts.handleVoteBroadcast}
        showBroadcastHistory={broadcasts.showBroadcastHistory}
        setShowBroadcastHistory={broadcasts.setShowBroadcastHistory}
        allBroadcasts={broadcasts.allBroadcasts}
        loadingBroadcastHistory={broadcasts.loadingBroadcastHistory}
        onSelectBroadcastFromHistory={(item) => {
          broadcasts.setActiveBroadcast(item);
          broadcasts.setShowBroadcastHistory(false);
          broadcasts.setShowBroadcastModal(true);
        }}
        onRefreshBroadcastHistory={broadcasts.handleRefreshNotificationsHistory}
        onMarkAllBroadcastsAsRead={broadcasts.handleMarkAllAsRead}
        showPlateScannerModal={ui.showPlateScannerModal}
        onClosePlateScanner={shiftActions.handleClosePlateScanner}
        onScannedPlate={shiftActions.handleProcessPlateScan}
        isScanningPlate={shift.isScanningPlate}
        showAccidentModal={ui.showAccidentModal}
        setShowAccidentModal={ui.setShowAccidentModal}
        showReportModal={ui.showReportModal}
        setShowReportModal={ui.setShowReportModal}
        onSelectReportAction={(action) => {
          ui.setShowReportModal(false);
          if (action === 'supervisor-report-create') {
            ui.setReportInitialMode('create');
            setCurrentTab('supervisor-report');
          } else if (action === 'supervisor-reports-list') {
            ui.setReportInitialMode('list');
            setCurrentTab('supervisor-report');
          } else if (action === 'advance-create') {
            ui.setAdvanceInitialMode('create');
            setCurrentTab('advance-request');
          } else {
            ui.setAdvanceInitialMode('list');
            setCurrentTab('advance-request');
          }
        }}
        showOperationVideoModal={ui.showOperationVideoModal}
        setShowOperationVideoModal={ui.setShowOperationVideoModal}
        branchDelegates={derived.branchScopedDelegates}
        pendingSessions={supervisorSync.pendingSessions}
        onRefreshSupervisorData={() => supervisorSync.fetchSupervisorData(false, true)}
        employee={employee}
        activeSession={activeSession}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        t={t}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
