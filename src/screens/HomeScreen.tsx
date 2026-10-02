import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EmployeeProfile, WorkSession, TabType, ThemeColors } from '../types/delegate';
import { getMyViolationsApi, DelegateViolation } from '../services/api';
import { AchievementsSummaryCards } from '../components/dashboard/AchievementsSummaryCards';


interface HomeScreenProps {
  employee: EmployeeProfile;
  activeSession: WorkSession | null;
  historySessions: WorkSession[];
  totalApprovedOrdersCount: number;
  pendingOrdersCount?: number;
  monthlyTarget: number;
  isTargetAchieved: boolean;
  expectedSalary: number;
  targetProgressPct: number;
  remainingOrdersToTarget: number;
  elapsedTime: string;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  onNavigateToTab: (tab: TabType) => void;
  onStartShiftClick?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  employee,
  activeSession,
  historySessions,
  totalApprovedOrdersCount,
  pendingOrdersCount = 0,
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
  onNavigateToTab,
  onStartShiftClick,
}) => {
  const [violations, setViolations] = useState<DelegateViolation[]>([]);
  const [violationsLoading, setViolationsLoading] = useState(false);
  const [totalViolationsAmount, setTotalViolationsAmount] = useState(0);
  const [deductedViolationsAmount, setDeductedViolationsAmount] = useState(0);

  const fetchViolations = useCallback(async () => {
    setViolationsLoading(true);
    try {
      const res = await getMyViolationsApi(employee?.id);
      setViolations(res.data || []);
      setTotalViolationsAmount(res.total_amount || 0);
      setDeductedViolationsAmount(res.deducted_amount || 0);
    } catch (err) {
      console.warn('[HomeScreen] Error fetching violations:', err);
    } finally {
      setViolationsLoading(false);
    }
  }, [employee?.id]);

  useEffect(() => {
    fetchViolations();
  }, [fetchViolations]);

  const isDifferentBike = Boolean(
    activeSession &&
    activeSession.motorcycle_number &&
    (!employee.motorcycle_number ||
      activeSession.motorcycle_number.trim().toUpperCase() !== employee.motorcycle_number.trim().toUpperCase())
  );

  // Split calculations for traffic violations and administrative penalties
  const isPenaltyRecord = (v: DelegateViolation) =>
    v.reason?.includes('جزاء') ||
    v.reason?.includes('خصم') ||
    v.reason?.includes('تأخير') ||
    v.reason?.includes('غياب') ||
    v.reason?.includes('زي') ||
    v.reason?.includes('عهدة') ||
    v.reason?.includes('إهمال');

  const trafficRecords = violations.filter((v) => !isPenaltyRecord(v));
  const penaltyRecords = violations.filter((v) => isPenaltyRecord(v));

  const totalTrafficAmt = trafficRecords.reduce((acc, v) => acc + (v.amount || 0), 0);
  const totalPenaltiesAmt = penaltyRecords.reduce((acc, v) => acc + (v.amount || 0), 0);
  const totalDuePending = Math.max(0, totalViolationsAmount - deductedViolationsAmount);

  return (
    <View style={styles.tabContainer}>
      {/* Clean Monthly Target & Earnings Card */}
      <View style={[styles.targetCardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header: Title + Orders Completed / Target Ratio */}
        <View style={[styles.targetCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.targetTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="flag-outline" size={17} color={colors.primary} />
            <Text style={[styles.targetCardTitle, { color: colors.textPrimary }]}>
              {t.monthlyTarget || 'الهدف الشهري'}
            </Text>
          </View>
          <Text style={[styles.targetRatioText, { color: colors.textSecondary }]}>
            <Text style={[styles.targetRatioBold, { color: colors.primary }]}>{totalApprovedOrdersCount}</Text> من {monthlyTarget} {t.ordersUnit || 'طلب'}
          </Text>
        </View>

        {/* Smooth Progress Bar */}
        <View style={styles.targetProgressContainer}>
          <View style={[styles.progressBarTrack, { backgroundColor: isDarkMode ? '#1f2433' : '#f1f5f9' }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.max(2, targetProgressPct)}%`,
                  backgroundColor: isTargetAchieved ? '#22c55e' : colors.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* Footer: Target Notice & Percentage */}
        <View style={[styles.targetFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text
            style={[
              styles.targetFooterNotice,
              { color: isTargetAchieved ? '#22c55e' : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
            ]}
            numberOfLines={1}
          >
            {isTargetAchieved
              ? (t.targetAchievedBadge || 'تم تحقيق الهدف الشهري بنجاح 🎉')
              : (isRTL ? `متبقي ${remainingOrdersToTarget} طلب للوصول للهدف` : `${remainingOrdersToTarget} orders left to target`)}
          </Text>
          <Text style={[styles.targetFooterPct, { color: isTargetAchieved ? '#22c55e' : colors.primary }]}>
            {targetProgressPct}%
          </Text>
        </View>
      </View>

      {/* Quick KPI Stats */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t.myAchievements}
        </Text>
      </View>

      <AchievementsSummaryCards
        employee={employee}
        activeSession={activeSession}
        historySessions={historySessions}
        expectedSalary={expectedSalary}
        isDifferentBike={isDifferentBike}
        isTargetAchieved={isTargetAchieved}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        t={t}
      />


      {/* Quick Navigation Cards */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t.quickAccess}
        </Text>
      </View>

      {/* 1. Shift Quick Access */}
      <TouchableOpacity
        style={[styles.quickCardRow, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={() => {
          if (!activeSession && onStartShiftClick) {
            onStartShiftClick();
          } else {
            onNavigateToTab('shift');
          }
        }}
      >
        <View
          style={[
            styles.quickCardIconCircle,
            {
              backgroundColor: activeSession
                ? isDarkMode
                  ? 'rgba(239, 68, 68, 0.18)'
                  : '#fee2e2'
                : colors.primaryLight,
            },
          ]}
        >
          <Ionicons
            name={activeSession ? 'stop-circle-outline' : 'play-circle-outline'}
            size={24}
            color={activeSession ? '#ef4444' : colors.primary}
          />
        </View>
        <View style={styles.quickCardTextCol}>
          <Text style={[styles.quickCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            {activeSession ? t.endShiftNow : t.quickShiftTitle}
          </Text>
          <Text style={[styles.quickCardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {activeSession ? `${t.durationLabel}: ${elapsedTime}` : t.quickShiftSub}
          </Text>
        </View>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* 2. History Quick Access */}
      <TouchableOpacity
        style={[styles.quickCardRow, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
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

      {/* 3. Violations & Penalties Quick Access (المخالفات والجزاءات) */}
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
              backgroundColor: violations.length > 0
                ? (isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2')
                : (isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5'),
            },
          ]}
        >
          <MaterialCommunityIcons
            name={violations.length > 0 ? 'shield-alert-outline' : 'shield-check-outline'}
            size={24}
            color={violations.length > 0 ? (isDarkMode ? '#F87171' : '#DC2626') : (isDarkMode ? '#34D399' : '#059669')}
          />
        </View>
        <View style={styles.quickCardTextCol}>
          <View style={[styles.quickCardTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.quickCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t.quickViolationsTitle || 'المخالفات والجزاءات'}
            </Text>
          </View>
          <Text style={[styles.quickCardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', marginTop: 2 }]}>
            {violations.length > 0
              ? (totalDuePending > 0
                  ? `المتبقي عليك: ${totalDuePending.toLocaleString('en-US')} ر.س`
                  : 'تم سداد كامل المستحقات (لا يوجد متبقي)')
              : (t.noViolationsSub || 'سجلك نظيف! لا توجد مخالفات أو جزاءات مسجلة')}
          </Text>
        </View>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    padding: 16,
  },
  targetCardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  targetCardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetTitleGroup: {
    alignItems: 'center',
    gap: 8,
  },
  targetCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  targetRatioText: {
    fontSize: 13,
    fontWeight: '600',
  },
  targetRatioBold: {
    fontWeight: '800',
  },
  targetProgressContainer: {
    marginBottom: 10,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetFooterRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetFooterNotice: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  targetFooterPct: {
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 8,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  quickCardRow: {

    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  quickCardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCardTextCol: {
    flex: 1,
  },
  quickCardTitleRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  violationCountBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  violationCountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  quickCardSub: {
    fontSize: 12,
  },
  pendingBadgeRow: {
    marginTop: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  pendingOrdersText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
});
