import React from 'react';
import { View, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemeColors } from '../../types/delegate';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { IdentifierDetailsModal } from './IdentifierDetailsModal';
import { DriverDetailsScreen } from './DriverDetailsScreen';
import { AdminProfileScreen } from './AdminProfileScreen';
import { TargetRulesScreen } from './TargetRulesScreen';
import { TargetLogsScreen } from './TargetLogsScreen';
import { DateFilterModal } from './DateFilterModal';
import { BranchFilterModal } from './BranchFilterModal';
import { getTargetDashboardColors } from './dashboard/targetDashboardColors';
import { getSubPageTitle } from './dashboard/targetDashboardHelpers';
import { targetDashboardHeaderStyles as styles } from './dashboard/targetDashboardHeaderStyles';
import { useTargetDashboardData } from './dashboard/useTargetDashboardData';
import { TargetDashboardHeader } from './dashboard/TargetDashboardHeader';
import { TargetPlatformsView } from './dashboard/TargetPlatformsView';
import { TargetHomeView } from './dashboard/TargetHomeView';
import { TargetDataListView } from './dashboard/TargetDataListView';

interface SupervisorTargetDashboardProps {
  user: any;
  onLogout: () => void;
  isDarkMode?: boolean;
  colors?: ThemeColors;
  isRTL?: boolean;
}

export const SupervisorTargetDashboard: React.FC<SupervisorTargetDashboardProps> = ({
  user,
  onLogout,
  isDarkMode = false,
  colors: propColors,
  isRTL = true,
}) => {
  const colors = getTargetDashboardColors(isDarkMode, propColors);
  const state = useTargetDashboardData('supervisor', colors);

  const handleBack = () => {
    if (state.currentView === 'rules') {
      state.setCurrentView('profile');
      return;
    }
    if (state.currentView === 'driver_details') {
      state.setCurrentView('data');
      state.setActiveTab('drivers');
      return;
    }
    state.setCurrentView('home');
    state.setPlatformTab('ninja');
    state.setStatusFilter('');
    state.setSearchQuery('');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <TargetDashboardHeader
        currentView={state.currentView}
        activeTab={state.activeTab}
        subPageTitle={getSubPageTitle(
          state.currentView,
          state.activeTab,
          state.statusFilter,
          state.selectedDriver?.name
        )}
        colors={colors}
        isRTL={isRTL}
        onLogoTap={state.handleLogoTap}
        onOpenBranchModal={() => state.setShowBranchModal(true)}
        onOpenProfile={() => state.setCurrentView('profile')}
        onBack={handleBack}
        onResolveAllAlerts={state.handleResolveAllAlerts}
      />

      <View style={{ flex: 1 }}>
        {state.currentView === 'profile' ? (
          <ModuleErrorBoundary moduleName="الملف الشخصي" colors={colors} onReset={() => state.setCurrentView('home')}>
            <AdminProfileScreen
              user={user}
              onOpenTargetRules={() => state.setCurrentView('rules')}
              onLogout={onLogout}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
            />
          </ModuleErrorBoundary>
        ) : state.currentView === 'rules' ? (
          <ModuleErrorBoundary moduleName="قواعد التارچت" colors={colors} onReset={() => state.setCurrentView('profile')}>
            <TargetRulesScreen
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              onBack={() => state.setCurrentView('profile')}
            />
          </ModuleErrorBoundary>
        ) : state.currentView === 'logs' ? (
          <ModuleErrorBoundary moduleName="سجل العمليات" colors={colors} onReset={() => state.setCurrentView('home')}>
            <TargetLogsScreen colors={colors} isDarkMode={isDarkMode} isRTL={isRTL} />
          </ModuleErrorBoundary>
        ) : state.currentView === 'platforms' ? (
          <ModuleErrorBoundary moduleName="تطبيقات التوصيل" colors={colors} onReset={() => state.setCurrentView('home')}>
            <TargetPlatformsView
              platformsList={state.platformsList}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              refreshing={state.refreshing}
              onRefresh={state.onRefresh}
              onSelectPlatformStatus={(platKey, status) => {
                state.handleCardPress('identifiers', status);
                state.setPlatformTab(platKey as any);
              }}
            />
          </ModuleErrorBoundary>
        ) : state.currentView === 'home' ? (
          <ModuleErrorBoundary moduleName="لوحة التارچت" colors={colors} onReset={state.loadData}>
            <TargetHomeView
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              refreshing={state.refreshing}
              onRefresh={state.onRefresh}
              loadError={state.loadError}
              retrying={state.retrying}
              onRetry={state.handleRetry}
              summary={state.summary}
              identifiersCount={state.identifiers.length}
              driversCount={state.drivers.length}
              totalDriversPeriodOrders={state.totalDriversPeriodOrders}
              dateFilterType={state.dateFilter.type}
              unresolvedAlertsCount={state.unresolvedAlertsCount}
              platformsCount={state.platformsList.length}
              onCardPress={state.handleCardPress}
              onOpenPlatforms={() => {
                state.setStatusFilter('');
                state.setSearchQuery('');
                state.setCurrentView('platforms');
              }}
              onOpenLogs={() => state.setCurrentView('logs')}
            />
          </ModuleErrorBoundary>
        ) : (
          <ModuleErrorBoundary moduleName="بيانات التارچت" colors={colors} onReset={() => state.setCurrentView('home')}>
            <TargetDataListView
              isAdmin={false}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              refreshing={state.refreshing}
              onRefresh={state.onRefresh}
              loading={state.loading}
              activeTab={state.activeTab}
              searchQuery={state.searchQuery}
              onChangeSearch={state.setSearchQuery}
              platformTab={state.platformTab}
              onChangePlatformTab={state.setPlatformTab}
              ninjaCount={state.ninjaCount}
              keetaCount={state.keetaCount}
              identsList={state.identsList}
              driversList={state.driversList}
              alertsList={state.alertsList}
              dateFilterType={state.dateFilter.type}
              getDriverPeriodOrders={state.getDriverPeriodOrders}
              getAssignedDriverName={state.getDriverForAlert}
              onSelectIdentifier={state.setSelectedIdentifierId}
              onSelectDriver={(drv) => {
                state.setSelectedDriver(drv);
                state.setCurrentView('driver_details');
              }}
            />
          </ModuleErrorBoundary>
        )}

        {state.currentView === 'driver_details' && (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
            <ModuleErrorBoundary
              moduleName="تفاصيل المندوب"
              colors={colors}
              onReset={() => {
                state.setCurrentView('data');
                state.setActiveTab('drivers');
              }}
            >
              <DriverDetailsScreen
                driver={state.selectedDriver}
                month={state.dateFilter.month || state.summary?.current_month}
                dateFilter={state.dateFilter}
                maxElapsedDays={state.summary?.days_elapsed}
                onBack={() => {
                  state.setCurrentView('data');
                  state.setActiveTab('drivers');
                }}
                isDarkMode={isDarkMode}
                colors={colors}
                isRTL={isRTL}
              />
            </ModuleErrorBoundary>
          </View>
        )}
      </View>

      <ModuleErrorBoundary moduleName="تفاصيل المعرف" colors={colors} onReset={() => state.setSelectedIdentifierId(null)}>
        <IdentifierDetailsModal
          visible={!!state.selectedIdentifierId}
          identifierId={state.selectedIdentifierId}
          month={state.dateFilter.month}
          onClose={() => state.setSelectedIdentifierId(null)}
          isDarkMode={isDarkMode}
          isAdmin={false}
          onUpdated={state.loadData}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="فلتر التاريخ" colors={colors} onReset={() => state.setShowDateFilterModal(false)}>
        <DateFilterModal
          visible={state.showDateFilterModal}
          currentFilter={state.dateFilter}
          onApply={(newFilter) => state.setDateFilter(newFilter)}
          onClose={() => state.setShowDateFilterModal(false)}
          isDarkMode={isDarkMode}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="فلتر الفرع" colors={colors} onReset={() => state.setShowBranchModal(false)}>
        <BranchFilterModal
          visible={state.showBranchModal}
          selectedBranch={state.branchFilter}
          onSelectBranch={(b) => state.setBranchFilter(b)}
          onClose={() => state.setShowBranchModal(false)}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      </ModuleErrorBoundary>
    </SafeAreaView>
  );
};
