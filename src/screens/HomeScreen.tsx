import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EmployeeProfile, WorkSession, TabType, ThemeColors, Language } from '../types/delegate';
import { getMyViolationsApi, DelegateViolation } from '../services/api';
import { formatBikePlateForDisplay } from '../utils/plateUtils';

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
  lang?: Language;
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
  lang = 'ar',
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

  // Calculate distinct working days for the current month
  // Multiple shifts on the same day count as 1 working day
  const currentMonthWorkingDays = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const uniqueDays = new Set<string>();

    historySessions.forEach((s) => {
      if (s.status === 'CANCELLED' || !s.start_time) return;
      try {
        const d = new Date(s.start_time);
        if (!isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
          uniqueDays.add(dayKey);
        }
      } catch (err) {
        // ignore invalid dates
      }
    });

    if (activeSession?.start_time) {
      try {
        const d = new Date(activeSession.start_time);
        if (!isNaN(d.getTime()) && d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          const dayKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
          uniqueDays.add(dayKey);
        }
      } catch (err) {
        // ignore
      }
    }

    return uniqueDays.size;
  }, [historySessions, activeSession]);

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
            <Text style={[styles.targetRatioBold, { color: colors.primary }]}>{totalApprovedOrdersCount}</Text> {t.ofRatio || 'من'} {monthlyTarget} {t.ordersUnit || 'طلب'}
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
              : (t.targetRemainingNotice
                  ? t.targetRemainingNotice.replace('{n}', String(remainingOrdersToTarget))
                  : `متبقي ${remainingOrdersToTarget} طلب للوصول للهدف`)}
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

      <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Row 1: Bike & Key */}
        <View
          style={[
            styles.statBox,
            {
              backgroundColor: colors.card,
              borderColor: isDifferentBike ? '#f59e0b' : colors.border,
              borderWidth: isDifferentBike ? 1.5 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.statIconCircle,
              {
                backgroundColor: isDifferentBike
                  ? (isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7')
                  : colors.primaryLight,
              },
            ]}
          >
            <MaterialCommunityIcons
              name="bike"
              size={20}
              color={isDifferentBike ? '#d97706' : colors.primary}
            />
          </View>
          <Text
            style={[
              styles.statNumber,
              { color: isDifferentBike ? '#d97706' : colors.textPrimary },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            {isDifferentBike
              ? formatBikePlateForDisplay(activeSession?.motorcycle_number, lang)
              : (formatBikePlateForDisplay(employee.motorcycle_number, lang) || '—')}
          </Text>
          <Text
            style={[
              styles.statLabel,
              {
                color: isDifferentBike ? '#d97706' : colors.textSecondary,
                fontWeight: isDifferentBike ? '700' : '500',
              },
            ]}
            numberOfLines={1}
          >
            {isDifferentBike ? (t.outOnDifferentBike || 'أنت طالع الآن بدباب') : t.assignedBike}
          </Text>
          {isDifferentBike && employee.motorcycle_number ? (
            <Text
              style={[
                styles.originalBikeNotice,
                { color: colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              ({t.assignedBike}: {formatBikePlateForDisplay(employee.motorcycle_number, lang)})
            </Text>
          ) : null}
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="key-variant" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
            {employee.key_number || '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.keyNumber}</Text>
        </View>


        {/* Row 2: Working Days & Expected Salary */}
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="calendar-check" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
            {currentMonthWorkingDays}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t.workingDays || 'أيام العمل'}
          </Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIconCircle, { backgroundColor: isTargetAchieved ? 'rgba(34,197,94,0.12)' : colors.primaryLight }]}>
            <Ionicons name="wallet-outline" size={20} color={isTargetAchieved ? '#22c55e' : colors.primary} />
          </View>
          <View style={[styles.salaryAmountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.statNumber, { color: isTargetAchieved ? '#22c55e' : colors.textPrimary, marginBottom: 0 }]}>
              {expectedSalary > 0 ? expectedSalary.toLocaleString('en-US') : '0'}
            </Text>
            <Image
              source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={[
                styles.riyalSymbolImg,
                { tintColor: isTargetAchieved ? '#22c55e' : colors.textPrimary },
              ]}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.expectedSalary || 'متوقع الراتب'}</Text>
        </View>
      </View>

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
                  ? (t.pendingDuesNotice
                      ? t.pendingDuesNotice.replace('{amount}', totalDuePending.toLocaleString('en-US'))
                      : `المتبقي عليك: ${totalDuePending.toLocaleString('en-US')} ر.س`)
                  : (t.allDuesPaid || 'تم سداد كامل المستحقات (لا يوجد متبقي)'))
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
  statsGrid: {
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 92,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 1,
  },
  salaryAmountRow: {
    alignItems: 'center',
    gap: 3,
    marginBottom: 1,
  },
  riyalSymbolImg: {
    width: 14,
    height: 14,
  },
  statLabel: {
    fontSize: 11.5,
    fontWeight: '500',
    textAlign: 'center',
  },
  originalBikeNotice: {
    fontSize: 10,
    marginTop: 3,
    textAlign: 'center',
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
