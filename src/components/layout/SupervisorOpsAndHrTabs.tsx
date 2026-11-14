import React from 'react';
import { View } from 'react-native';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { OperationsScreen } from '../../screens/OperationsScreen';
import { OilChangeScreen } from '../../screens/OilChangeScreen';
import { FleetOilScreen } from '../../screens/FleetOilScreen';
import { SupervisorReportScreen } from '../../screens/SupervisorReportScreen';
import { AdvanceRequestScreen } from '../../screens/AdvanceRequestScreen';
import { EmployeesScreen } from '../../screens/EmployeesScreen';
import { NotificationsScreen } from '../../screens/NotificationsScreen';
import { OrdersReviewScreen } from '../../screens/OrdersReviewScreen';
import { HistoryScreen } from '../../screens/HistoryScreen';
import { SupervisorTabContentProps } from './supervisorTabContentTypes';

export const SupervisorOpsAndHrTabs: React.FC<SupervisorTabContentProps> = React.memo((props) => {
  const {
    currentTab,
    colors,
    isDarkMode,
    isRTL,
    employee,
    branchScopedWorkingDelegates,
    branchScopedDelegates,
    pendingSessions,
    vehicles,
    loadingSupervisorData,
    fetchSupervisorData,
    setCurrentTab,
    handleNavigateToTab,
    t,
    lang,
    pendingAdvances,
    pendingMaintenance,
    setPreviewPhoto,
    setTargetApprovalSessionId,
    setTargetApprovalEmployeeId,
    inventoryItems,
    loadingOperationsData,
    fetchOperationsData,
    handleVehicleDispensedOptimistic,
    reportInitialMode,
    advanceInitialMode,
    setReadNotifIds,
    notifHeaderActionsRef,
    ordersDatePickerOpen,
    setOrdersDatePickerOpen,
    historySessions,
    loadingHistory,
    selectedHistorySession,
    setSelectedHistorySession,
    selectedHistoryMonthKey,
    setSelectedHistoryMonthKey,
    setSelectedHistoryMonthLabel,
    fetchHistory,
    formatDateStr,
    formatTimeStr,
    monthlyTarget,
  } = props;

  if (currentTab === 'operations') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ModuleErrorBoundary moduleName="العمليات والأسطول" colors={colors} onReset={() => fetchOperationsData(false, true)}>
          <OperationsScreen
            mode="all"
            inventoryItems={inventoryItems}
            vehicles={vehicles}
            employees={branchScopedDelegates}
            loading={loadingOperationsData}
            onRefresh={() => fetchOperationsData(false, true)}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
        </ModuleErrorBoundary>
      </View>
    );
  }

  if (currentTab === 'oil-change') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ModuleErrorBoundary moduleName="تغيير زيت" colors={colors} onReset={() => fetchOperationsData(false, true)}>
          <OilChangeScreen
            vehicles={vehicles}
            delegates={branchScopedDelegates}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            loading={loadingOperationsData}
            onRefresh={() => fetchOperationsData(false, true)}
            adminName={employee?.name || 'المشرف'}
            onNavigateToTab={handleNavigateToTab}
            onVehicleDispensed={handleVehicleDispensedOptimistic}
          />
        </ModuleErrorBoundary>
      </View>
    );
  }

  if (currentTab === 'fleet-oil') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ModuleErrorBoundary moduleName="متابعة زيوت الدبابات" colors={colors} onReset={() => fetchOperationsData(false, true)}>
          <FleetOilScreen
            vehicles={vehicles}
            delegates={branchScopedDelegates}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            loading={loadingOperationsData}
            onRefresh={() => fetchOperationsData(false, true)}
            adminName={employee?.name || 'المشرف'}
            onNavigateToTab={handleNavigateToTab}
            onVehicleDispensed={handleVehicleDispensedOptimistic}
          />
        </ModuleErrorBoundary>
      </View>
    );
  }

  if (currentTab === 'add-vehicle') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ModuleErrorBoundary moduleName="إضافة مركبة جديدة" colors={colors} onReset={() => fetchOperationsData(false, true)}>
          <OperationsScreen
            mode="add-vehicle"
            inventoryItems={inventoryItems}
            vehicles={vehicles}
            employees={branchScopedDelegates}
            loading={loadingOperationsData}
            onRefresh={() => fetchOperationsData(false, true)}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
        </ModuleErrorBoundary>
      </View>
    );
  }

  if (currentTab === 'accident-report') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ModuleErrorBoundary moduleName="بلاغ عن حادث" colors={colors} onReset={() => fetchOperationsData(false, true)}>
          <OperationsScreen
            mode="accidents"
            inventoryItems={inventoryItems}
            vehicles={vehicles}
            employees={branchScopedDelegates}
            loading={loadingOperationsData}
            onRefresh={() => fetchOperationsData(false, true)}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
        </ModuleErrorBoundary>
      </View>
    );
  }

  if (currentTab === 'supervisor-report') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ModuleErrorBoundary moduleName="تقرير مشرف" colors={colors} onReset={() => fetchSupervisorData(false, true)}>
          <SupervisorReportScreen
            initialMode={reportInitialMode}
            branchDelegates={branchScopedDelegates}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            onSuccess={() => fetchSupervisorData(false, true)}
            onBack={() => setCurrentTab('home')}
          />
        </ModuleErrorBoundary>
      </View>
    );
  }

  if (currentTab === 'advance-request') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ModuleErrorBoundary moduleName="سلفة" colors={colors} onReset={() => fetchSupervisorData(false, true)}>
          <AdvanceRequestScreen
            initialMode={advanceInitialMode}
            branchDelegates={branchScopedDelegates}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            onSuccess={() => fetchSupervisorData(false, true)}
            onBack={() => setCurrentTab('home')}
          />
        </ModuleErrorBoundary>
      </View>
    );
  }

  if (currentTab === 'employees') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ModuleErrorBoundary moduleName="إدارة الموظفين" colors={colors} onReset={() => fetchSupervisorData(false, true)}>
          <EmployeesScreen
            employees={branchScopedDelegates.map((e) => ({
              ...e,
              is_working: branchScopedWorkingDelegates.some((w) => w.id === e.id),
            }))}
            vehicles={vehicles}
            loading={loadingSupervisorData}
            onRefresh={() => fetchSupervisorData(false, true)}
            onEmployeeUpdated={() => {
              fetchSupervisorData(false, true);
            }}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
        </ModuleErrorBoundary>
      </View>
    );
  }

  if (currentTab === 'notifications') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ModuleErrorBoundary moduleName="مركز الإشعارات" colors={colors} onReset={() => fetchSupervisorData(false, true)}>
          <NotificationsScreen
            pendingSessions={pendingSessions}
            workingDelegates={branchScopedWorkingDelegates}
            vehicles={vehicles}
            pendingMaintenance={pendingMaintenance}
            pendingAdvances={pendingAdvances}
            onNavigateToTab={(tab, meta) => {
              if (meta?.sessionId) setTargetApprovalSessionId(meta.sessionId);
              if (meta?.employeeId) setTargetApprovalEmployeeId(meta.employeeId);
              setCurrentTab(tab);
            }}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            onRefresh={() => fetchSupervisorData(false, true)}
            loading={loadingSupervisorData}
            onReadStatusChange={(ids) => setReadNotifIds(new Set(ids))}
            onRegisterHeaderActions={(actions) => {
              notifHeaderActionsRef.current = actions;
            }}
          />
        </ModuleErrorBoundary>
      </View>
    );
  }

  if (currentTab === 'orders-review') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ModuleErrorBoundary moduleName="مراجعة الطلبات" colors={colors} onReset={() => fetchSupervisorData(false, true)}>
          <OrdersReviewScreen
            employees={branchScopedDelegates}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            onPreviewPhoto={setPreviewPhoto}
            isDatePickerOpen={ordersDatePickerOpen}
            onOpenDatePicker={() => setOrdersDatePickerOpen(true)}
            onCloseDatePicker={() => setOrdersDatePickerOpen(false)}
          />
        </ModuleErrorBoundary>
      </View>
    );
  }

  if (currentTab === 'history') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
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
      </View>
    );
  }

  return null;
});
