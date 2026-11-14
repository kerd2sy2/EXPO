import React from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { DashboardScreen } from '../../screens/DashboardScreen';
import { ViolationsScreen } from '../../screens/ViolationsScreen';
import { FieldScreen } from '../../screens/FieldScreen';
import { ApprovalsScreen } from '../../screens/ApprovalsScreen';
import { ShiftScreen } from '../../features/shift';
import { ProfileScreen } from '../../screens/ProfileScreen';
import { SupervisorOpsAndHrTabs } from './SupervisorOpsAndHrTabs';
import { SupervisorTabContentProps } from './supervisorTabContentTypes';

export type { SupervisorTabContentProps } from './supervisorTabContentTypes';

const OPS_HR_TABS = new Set([
  'operations',
  'oil-change',
  'fleet-oil',
  'add-vehicle',
  'accident-report',
  'supervisor-report',
  'advance-request',
  'employees',
  'notifications',
  'orders-review',
  'history',
]);

export const SupervisorTabContent: React.FC<SupervisorTabContentProps> = React.memo((props) => {
  const {
    currentTab,
    colors,
    isDarkMode,
    isRTL,
    topInset,
    homeHeaderHeight,
    employee,
    dashboardScrollRef,
    branchStats,
    branchScopedWorkingDelegates,
    branchScopedDelegates,
    pendingSessions,
    vehicles,
    todayApprovedOrdersCount,
    todayApprovedDistance,
    todayApprovedFuel,
    isInitialSupervisorLoading,
    loadingSupervisorData,
    fetchSupervisorData,
    handleHomeScroll,
    setCurrentTab,
    handleNavigateToTab,
    setShowReportModal,
    setReportInitialMode,
    setAdvanceInitialMode,
    setShowOperationVideoModal,
    openOhdaApp,
    hasCustodyPermission,
    violations,
    violationsLoading,
    totalViolationsAmount,
    deductedViolationsAmount,
    fetchViolations,
    t,
    lang,
    branchSessions,
    handleOverrideSuccess,
    pendingAdvances,
    pendingMaintenance,
    loadingApprovalsOnly,
    refreshApprovalsOnly,
    setPreviewPhoto,
    targetApprovalSessionId,
    targetApprovalEmployeeId,
    setTargetApprovalSessionId,
    setTargetApprovalEmployeeId,
    setPendingSessions,
    setPendingAdvances,
    setPendingMaintenance,
    mainScrollRef,
    mainScrollEnabled,
    keyboardOffset,
    refreshing,
    onRefresh,
    checkSession,
    activeSession,
    enteredMotorcycle,
    setEnteredMotorcycle,
    startKm,
    setStartKm,
    autoKmFetched,
    isOdometerBroken,
    startKmImage,
    startPlateImage,
    isPlateConfirmed,
    setIsPlateConfirmed,
    startNotes,
    setStartNotes,
    endKm,
    setEndKm,
    endKmImage,
    ordersCount,
    setOrdersCount,
    fuelCost,
    setFuelCost,
    endNotes,
    setEndNotes,
    calculatedDistance,
    elapsedTime,
    submitting,
    takeOdometerPhoto,
    handleScanPlate,
    isScanningPlate,
    handleStartShift,
    handleEndShift,
    activeBikeRegistrationImage,
    needsOilChange,
    setOilChangeModalState,
    empPhotoUrl,
    setShowQrModal,
    setShowLangModal,
    toggleTheme,
    handleCheckForUpdates,
    setShowDiagnosticsModal,
    setMainScrollEnabled,
    handleLogout,
    setEmployee,
    saveCachedUser,
    formatTimeStr,
  } = props;

  return (
    <>
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          display: currentTab === 'dashboard' || currentTab === 'home' ? 'flex' : 'none',
        }}
      >
        <ModuleErrorBoundary
          moduleName="لوحة المؤشرات"
          colors={colors}
          onReset={() => fetchSupervisorData(false, true)}
        >
          <DashboardScreen
            scrollRef={dashboardScrollRef}
            adminName={employee?.name || 'المشرف'}
            branchName={employee?.branch_name || 'فرع الإشراف'}
            stats={branchStats}
            workingDelegates={branchScopedWorkingDelegates}
            allDelegates={branchScopedDelegates}
            pendingSessions={pendingSessions}
            vehicles={vehicles}
            approvedOrdersCount={todayApprovedOrdersCount}
            approvedKmCount={todayApprovedDistance}
            approvedFuelCount={todayApprovedFuel}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            loading={isInitialSupervisorLoading}
            onNavigateToTab={(tab) => {
              if (tab === 'dashboard') {
                setCurrentTab('home');
              } else {
                handleNavigateToTab(tab);
              }
            }}
            onOpenOverrideModal={() => setCurrentTab('field')}
            onOpenReportModal={(prefMode) => {
              if (prefMode === 'create') {
                setReportInitialMode('create');
                setAdvanceInitialMode('create');
              } else {
                setReportInitialMode('list');
                setAdvanceInitialMode('list');
              }
              setShowReportModal(true);
            }}
            onOpenOperationVideosModal={() => setShowOperationVideoModal(true)}
            onOpenOhdaApp={openOhdaApp}
            hasCustody={hasCustodyPermission(employee)}
            onRefresh={() => fetchSupervisorData(false, true)}
            refreshing={loadingSupervisorData}
            contentContainerStyle={{
              paddingTop: topInset + homeHeaderHeight + 8,
              paddingBottom: 40,
            }}
            onScroll={handleHomeScroll}
            scrollEventThrottle={16}
            progressViewOffset={topInset + homeHeaderHeight}
          />
        </ModuleErrorBoundary>
      </View>

      {currentTab === 'dashboard' || currentTab === 'home' ? null : currentTab === 'violations' ? (
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
      ) : currentTab === 'field' ? (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <ModuleErrorBoundary
            moduleName="إدارة الميدان"
            colors={colors}
            onReset={() => fetchSupervisorData(false, true)}
          >
            <FieldScreen
              delegates={branchScopedDelegates.map((d) => {
                const workingInfo = branchScopedWorkingDelegates.find((w) => w.id === d.id);
                const activeSess = branchSessions.find(
                  (s) => s.employee_id === d.id && (s.status === 'ACTIVE' || !s.end_time)
                );
                const isWorking = Boolean(
                  workingInfo &&
                    (workingInfo.active_session_id ||
                      workingInfo.shift_start_time ||
                      workingInfo.active_session)
                );
                const shiftStartTime =
                  activeSess?.start_time || workingInfo?.shift_start_time || d.shift_start_time;
                const startKmVal =
                  activeSess?.start_km !== undefined && activeSess?.start_km !== null
                    ? Number(activeSess.start_km)
                    : workingInfo?.start_km !== undefined && workingInfo?.start_km !== null
                    ? Number(workingInfo.start_km)
                    : d.start_km;
                const activeBike =
                  activeSess?.motorcycle_number ||
                  workingInfo?.active_motorcycle ||
                  d.active_motorcycle ||
                  d.motorcycle_number;

                return {
                  ...d,
                  ...(workingInfo || {}),
                  is_working: isWorking,
                  shift_start_time: shiftStartTime,
                  start_km: startKmVal,
                  active_motorcycle: activeBike,
                };
              })}
              loading={loadingSupervisorData}
              onRefresh={() => fetchSupervisorData(false, true)}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              onOverrideSuccess={handleOverrideSuccess}
            />
          </ModuleErrorBoundary>
        </View>
      ) : currentTab === 'approvals' ? (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          <ModuleErrorBoundary
            moduleName="مركز الموافقات"
            colors={colors}
            onReset={() => fetchSupervisorData(false, true)}
          >
            <ApprovalsScreen
              pendingSessions={pendingSessions}
              pendingAdvances={pendingAdvances}
              pendingMaintenance={pendingMaintenance}
              employees={branchScopedDelegates}
              loading={loadingApprovalsOnly}
              onRefresh={refreshApprovalsOnly}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              onPreviewPhoto={setPreviewPhoto}
              targetSessionId={targetApprovalSessionId}
              targetEmployeeId={targetApprovalEmployeeId}
              onClearTargetSession={() => {
                setTargetApprovalSessionId(null);
                setTargetApprovalEmployeeId(null);
              }}
              onSessionApproved={(sessionId) => {
                setPendingSessions((prev: any[]) => prev.filter((s) => s.id !== sessionId));
              }}
              onAdvanceDecision={(advId) => {
                setPendingAdvances((prev: any[]) => prev.filter((a) => a.id !== advId));
              }}
              onMaintenanceDecision={(maintId) => {
                setPendingMaintenance((prev: any[]) => prev.filter((m) => m.id !== maintId));
              }}
            />
          </ModuleErrorBoundary>
        </View>
      ) : OPS_HR_TABS.has(currentTab) ? (
        <SupervisorOpsAndHrTabs {...props} />
      ) : (
        <ScrollView
          ref={mainScrollRef}
          scrollEnabled={mainScrollEnabled}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: 12,
            paddingBottom: 24 + (keyboardOffset > 0 ? keyboardOffset + 24 : 0),
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {currentTab === 'shift' && (
            <ModuleErrorBoundary
              moduleName="إدارة الشفت"
              colors={colors}
              onReset={() => checkSession(false)}
            >
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

          {currentTab === 'profile' && (
            <ModuleErrorBoundary
              moduleName="الملف الشخصي"
              colors={colors}
              onReset={() => checkSession(false)}
            >
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
        </ScrollView>
      )}
    </>
  );
});
