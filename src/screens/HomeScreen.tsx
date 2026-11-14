import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EmployeeProfile, WorkSession, TabType, ThemeColors, Language } from '../types/delegate';
import { DelegateViolation } from '../services/api';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { HomeShiftQuickCard } from '../features/shift/components/HomeShiftQuickCard';
import { HomeScreenSkeleton } from '../components/skeletons/HomeScreenSkeleton';
import { homeScreenStyles as styles } from './home/homeScreenStyles';
import { HomeTargetAndCelebration } from './home/HomeTargetAndCelebration';
import { HomeKpiStatsGrid } from './home/HomeKpiStatsGrid';

interface HomeScreenProps {
  employee: EmployeeProfile;
  activeSession: WorkSession | null;
  isSessionSyncing?: boolean;
  isHomeLoading?: boolean;
  historySessions: WorkSession[];
  totalApprovedOrdersCount: number;
  pendingOrdersCount?: number;
  monthlyTarget: number;
  isTargetAchieved: boolean;
  expectedSalary: number;
  targetProgressPct: number;
  remainingOrdersToTarget: number;
  elapsedTime?: string;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  lang?: Language;
  onNavigateToTab: (tab: TabType) => void;
  onStartShiftClick?: () => void;
  violations?: DelegateViolation[];
  totalViolationsAmount?: number;
  deductedViolationsAmount?: number;
  onShowCelebration?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = React.memo(({
  employee,
  activeSession,
  isSessionSyncing = false,
  isHomeLoading = false,
  historySessions,
  totalApprovedOrdersCount,
  monthlyTarget,
  isTargetAchieved,
  expectedSalary,
  targetProgressPct,
  remainingOrdersToTarget,
  elapsedTime,
  colors,
  isDarkMode,
  isRTL,
  t,
  lang = 'ar',
  onNavigateToTab,
  onStartShiftClick,
  violations = [],
  totalViolationsAmount = 0,
  deductedViolationsAmount = 0,
  onShowCelebration,
}) => {
  const totalDuePending = Math.max(0, totalViolationsAmount - deductedViolationsAmount);

  const currentMonthWorkingDays = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const uniqueDays = new Set<string>();

    (historySessions || []).forEach((s) => {
      if (!s || s.status === 'CANCELLED' || !s.start_time) return;
      try {
        const d = new Date(s.start_time);
        if (!isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          uniqueDays.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
        }
      } catch {}
    });

    if (activeSession?.start_time) {
      try {
        const d = new Date(activeSession.start_time);
        if (!isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          uniqueDays.add(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);
        }
      } catch {}
    }

    return uniqueDays.size;
  }, [historySessions, activeSession]);

  if (isHomeLoading || isSessionSyncing) {
    return (
      <HomeScreenSkeleton
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
      />
    );
  }

  return (
    <View style={styles.tabContainer}>
      <HomeTargetAndCelebration
        totalApprovedOrdersCount={totalApprovedOrdersCount}
        monthlyTarget={monthlyTarget}
        isTargetAchieved={isTargetAchieved}
        targetProgressPct={targetProgressPct}
        remainingOrdersToTarget={remainingOrdersToTarget}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        t={t}
        onShowCelebration={onShowCelebration}
      />

      <HomeKpiStatsGrid
        employee={employee}
        activeSession={activeSession}
        currentMonthWorkingDays={currentMonthWorkingDays}
        expectedSalary={expectedSalary}
        isTargetAchieved={isTargetAchieved}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        lang={lang}
        t={t}
      />

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t.quickAccess}
        </Text>
      </View>

      <HomeShiftQuickCard
        activeSession={activeSession}
        isSessionSyncing={isSessionSyncing}
        elapsedTime={elapsedTime}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        t={t}
        onNavigateToTab={onNavigateToTab}
        onStartShiftClick={onStartShiftClick}
      />

      <ModuleErrorBoundary moduleName="كرت سجل الشفتات" colors={colors}>
        <TouchableOpacity
          style={[
            styles.quickCardRow,
            { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
          onPress={() => onNavigateToTab('history')}
        >
          <View style={[styles.quickCardIconCircle, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="receipt-outline" size={24} color={colors.accent} />
          </View>
          <View style={styles.quickCardTextCol}>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t.quickHistoryTitle}
            </Text>
            <Text style={[styles.quickCardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t.quickHistorySub}
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="كرت المخالفات والجزاءات" colors={colors}>
        <TouchableOpacity
          style={[
            styles.quickCardRow,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderWidth: 1,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={() => onNavigateToTab('violations')}
        >
          <View
            style={[
              styles.quickCardIconCircle,
              {
                backgroundColor:
                  violations.length > 0
                    ? isDarkMode
                      ? 'rgba(239, 68, 68, 0.15)'
                      : '#FEE2E2'
                    : isDarkMode
                      ? 'rgba(16, 185, 129, 0.15)'
                      : '#ECFDF5',
              },
            ]}
          >
            <MaterialCommunityIcons
              name={violations.length > 0 ? 'shield-alert-outline' : 'shield-check-outline'}
              size={24}
              color={
                violations.length > 0
                  ? isDarkMode
                    ? '#F87171'
                    : '#DC2626'
                  : isDarkMode
                    ? '#34D399'
                    : '#059669'
              }
            />
          </View>
          <View style={styles.quickCardTextCol}>
            <View style={[styles.quickCardTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.quickCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.quickViolationsTitle || 'المخالفات والجزاءات'}
              </Text>
            </View>
            <Text
              style={[
                styles.quickCardSub,
                { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', marginTop: 2 },
              ]}
            >
              {violations.length > 0
                ? totalDuePending > 0
                  ? t.pendingDuesNotice
                    ? t.pendingDuesNotice.replace('{amount}', totalDuePending.toLocaleString('en-US'))
                    : `المتبقي عليك: ${totalDuePending.toLocaleString('en-US')} ر.س`
                  : t.allDuesPaid || 'تم سداد كامل المستحقات (لا يوجد متبقي)'
                : t.noViolationsSub || 'سجلك نظيف! لا توجد مخالفات أو جزاءات مسجلة'}
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </ModuleErrorBoundary>
    </View>
  );
});
