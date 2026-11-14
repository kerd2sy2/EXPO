import React, { useMemo } from 'react';
import { Text, ScrollView, RefreshControl } from 'react-native';
import { ThemeColors, TabType, WorkSession } from '../types/delegate';
import { BranchStats, DelegateWithStatus } from '../services/supervisor';
import { VehicleItem } from '../services/operations';
import { DashboardSkeleton } from '../components/skeletons/DashboardSkeleton';
import { WidgetErrorBoundary } from '../components/WidgetErrorBoundary';
import { dashboardStyles as styles } from './dashboard/dashboardStyles';
import { computeDashboardAnalytics } from './dashboard/dashboardHelpers';
import { DashboardHeroCard } from './dashboard/DashboardHeroCard';
import { DashboardKpiGrid } from './dashboard/DashboardKpiGrid';
import {
  DashboardDistributionAndShortcuts,
  DashboardShortcutItem,
} from './dashboard/DashboardDistributionAndShortcuts';

interface DashboardScreenProps {
  adminName: string;
  branchName: string;
  stats: BranchStats;
  workingDelegates: DelegateWithStatus[];
  allDelegates?: DelegateWithStatus[];
  pendingSessions?: WorkSession[];
  vehicles?: VehicleItem[];
  approvedOrdersCount?: number;
  approvedKmCount?: number;
  approvedFuelCount?: number;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onNavigateToTab: (tab: TabType) => void;
  onOpenOverrideModal?: () => void;
  onOpenReportModal?: (preferredMode?: 'list' | 'create') => void;
  onOpenOperationVideosModal?: () => void;
  onOpenOhdaApp?: () => void;
  hasCustody?: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  loading?: boolean;
  contentContainerStyle?: any;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  progressViewOffset?: number;
  scrollRef?: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = React.memo(({
  stats,
  workingDelegates,
  allDelegates = [],
  pendingSessions = [],
  vehicles = [],
  approvedOrdersCount,
  approvedKmCount,
  approvedFuelCount,
  colors,
  isDarkMode,
  isRTL,
  onNavigateToTab,
  onOpenReportModal,
  onOpenOperationVideosModal,
  onOpenOhdaApp,
  hasCustody = false,
  onRefresh,
  refreshing,
  loading = false,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle = 16,
  progressViewOffset = 0,
  scrollRef,
}) => {
  const analyticsData = useMemo(
    () =>
      computeDashboardAnalytics(
        allDelegates,
        workingDelegates,
        stats,
        pendingSessions,
        vehicles
      ),
    [allDelegates, workingDelegates, stats, pendingSessions, vehicles]
  );

  const shortcuts: DashboardShortcutItem[] = [
    { title: 'مركز الموافقات', sub: `${analyticsData.completedPendingCount} بانتظارك`, icon: 'checkmark-done-circle-outline', color: '#f59e0b', onPress: () => onNavigateToTab('approvals') },
    { title: 'مراجعة الطلبات', sub: 'السجل التنازلي', icon: 'list-circle-outline', color: '#0284c7', onPress: () => onNavigateToTab('orders-review') },
    { title: 'تغيير الزيت', sub: 'مرتب برقم المفتاح', icon: 'construct-outline', color: '#8b5cf6', onPress: () => onNavigateToTab('fleet-oil') },
    { title: 'التقارير والسلف', sub: 'رفع تقرير مشرف', icon: 'document-text-outline', color: '#ec4899', onPress: () => onOpenReportModal?.('list') },
    { title: 'المخزن', sub: 'المخزون والعهد', icon: 'cube-outline', color: '#10b981', onPress: () => onNavigateToTab('operations') },
    { title: 'إدارة الموظفين', sub: 'مرتب بالمفاتيح', icon: 'people-outline', color: '#6366f1', onPress: () => onNavigateToTab('employees') },
  ];

  const rawOrdersCount = approvedOrdersCount !== undefined ? approvedOrdersCount : (stats.todayOrdersCount || 0);
  const rawKmCount = approvedKmCount !== undefined ? approvedKmCount : 0;
  const rawFuelCount = approvedFuelCount !== undefined ? approvedFuelCount : 0;

  const displayedOrdersCount = Number(rawOrdersCount || 0);
  const displayedKmCount =
    Number(rawKmCount || 0) % 1 === 0 ? String(Number(rawKmCount || 0)) : Number(rawKmCount || 0).toFixed(1);
  const displayedFuelCount = String(Math.round(Number(rawFuelCount || 0)));

  if (loading) {
    return (
      <ScrollView
        ref={scrollRef}
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        <DashboardSkeleton colors={colors} isDarkMode={isDarkMode} isRTL={isRTL} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
          progressViewOffset={progressViewOffset}
        />
      }
    >
      <WidgetErrorBoundary widgetName="مؤشرات الأداء الرئيسية">
        <DashboardHeroCard
          analyticsData={analyticsData}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onOpenFieldTracking={() => onNavigateToTab('field')}
        />
      </WidgetErrorBoundary>

      <Text style={[styles.sectionHeader, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
        مؤشرات اليوم للفرع والأسطول
      </Text>

      <WidgetErrorBoundary widgetName="مؤشرات اليوم والأسطول">
        <DashboardKpiGrid
          displayedOrdersCount={displayedOrdersCount}
          displayedKmCount={displayedKmCount}
          displayedFuelCount={displayedFuelCount}
          oilDueCount={analyticsData.oilDueCount}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onPressOilDue={() => onNavigateToTab('oil-change')}
        />
      </WidgetErrorBoundary>

      <WidgetErrorBoundary widgetName="توزيع المنصات والوصول السريع">
        <DashboardDistributionAndShortcuts
          analyticsData={analyticsData}
          shortcuts={shortcuts}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onOpenOperationVideosModal={onOpenOperationVideosModal}
          onOpenOhdaApp={onOpenOhdaApp}
          hasCustody={hasCustody}
        />
      </WidgetErrorBoundary>
    </ScrollView>
  );
});
