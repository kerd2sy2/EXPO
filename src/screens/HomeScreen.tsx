import React from 'react';
import { DashboardScreen } from './DashboardScreen';
import { EmployeeProfile, WorkSession, TabType, ThemeColors, Language } from '../types/delegate';
import { BranchStats, DelegateWithStatus } from '../services/supervisor';
import { VehicleItem } from '../services/operations';

export interface HomeScreenProps {
  employee: EmployeeProfile;
  stats?: BranchStats;
  workingDelegates?: DelegateWithStatus[];
  allDelegates?: DelegateWithStatus[];
  pendingSessions?: WorkSession[];
  vehicles?: VehicleItem[];
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t?: any;
  lang?: Language;
  onNavigateToTab: (tab: TabType) => void;
  onOpenReportModal?: (preferredMode?: 'list' | 'create') => void;
  onOpenOperationVideosModal?: () => void;
  onOpenOverrideModal?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  contentContainerStyle?: any;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  progressViewOffset?: number;
  // Legacy props
  workingDelegatesCount?: number;
  totalDelegatesCount?: number;
  todayOrdersCount?: number;
  onConfirmOrders?: any;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  employee,
  stats,
  workingDelegates = [],
  allDelegates = [],
  pendingSessions = [],
  vehicles = [],
  colors,
  isDarkMode,
  isRTL,
  onNavigateToTab,
  onOpenReportModal,
  onOpenOperationVideosModal,
  onOpenOverrideModal,
  onRefresh,
  refreshing = false,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle = 16,
  progressViewOffset = 0,
}) => {
  const branchStats: BranchStats = stats || {
    workingCount: workingDelegates.length,
    totalCount: allDelegates.length,
    notStartedCount: Math.max(0, allDelegates.length - workingDelegates.length),
    pendingApprovalsCount: pendingSessions.filter((s) => s.status === 'COMPLETED' && !s.is_reviewed).length,
    todayOrdersCount: 0,
  };

  return (
    <DashboardScreen
      adminName={employee.name || 'المشرف'}
      branchName={employee.branch_name || 'فرع الإشراف'}
      stats={branchStats}
      workingDelegates={workingDelegates}
      allDelegates={allDelegates}
      pendingSessions={pendingSessions}
      vehicles={vehicles}
      colors={colors}
      isDarkMode={isDarkMode}
      isRTL={isRTL}
      onNavigateToTab={onNavigateToTab}
      onOpenOverrideModal={onOpenOverrideModal || (() => onNavigateToTab('field'))}
      onOpenReportModal={onOpenReportModal ? () => onOpenReportModal('list') : () => {}}
      onOpenOperationVideosModal={onOpenOperationVideosModal}
      onRefresh={onRefresh || (() => {})}
      refreshing={refreshing}
      contentContainerStyle={contentContainerStyle}
      onScroll={onScroll}
      scrollEventThrottle={scrollEventThrottle}
      progressViewOffset={progressViewOffset}
    />
  );
};
