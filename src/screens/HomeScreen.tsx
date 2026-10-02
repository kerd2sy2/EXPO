import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

      <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* 1. Bike */}
        <View
          style={[
            styles.statBox,
            {
              backgroundColor: colors.card,
              borderColor: isDifferentBike ? '#f59e0b' : colors.border,
              borderWidth: isDifferentBike ? 1.5 : 1,
              flexDirection: isRTL ? 'row-reverse' : 'row',
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
              size={18}
              color={isDifferentBike ? '#d97706' : colors.primary}
            />
          </View>
          <View style={[styles.statTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text
              style={[
                styles.statNumber,
                { color: isDifferentBike ? '#d97706' : colors.textPrimary },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
            >
              {isDifferentBike
                ? activeSession?.motorcycle_number
                : (employee.motorcycle_number || '—')}
            </Text>
            <Text style={[styles.statLabel, { color: isDifferentBike ? '#d97706' : colors.textSecondary }]} numberOfLines={1}>
              {isDifferentBike ? (t.outOnDifferentBike || 'دباب بديل') : t.assignedBike}
            </Text>
          </View>
        </View>

        {/* 2. Key */}
        <View
          style={[
            styles.statBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="key-variant" size={18} color={colors.primary} />
          </View>
          <View style={[styles.statTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.statNumber, { color: colors.textPrimary }]} numberOfLines={1}>
              {employee.key_number || '—'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {t.keyNumber}
            </Text>
          </View>
        </View>

        {/* 3. Working Days */}
        <View
          style={[
            styles.statBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="calendar-check" size={18} color={colors.primary} />
          </View>
          <View style={[styles.statTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.statNumber, { color: colors.textPrimary }]} numberOfLines={1}>
              {currentMonthWorkingDays}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {t.workingDays || 'أيام العمل'}
            </Text>
          </View>
        </View>

        {/* 4. Expected Salary */}
        <View
          style={[
            styles.statBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View
            style={[
              styles.statIconCircle,
              { backgroundColor: isTargetAchieved ? 'rgba(34,197,94,0.12)' : colors.primaryLight },
            ]}
          >
            <Ionicons name="wallet-outline" size={18} color={isTargetAchieved ? '#22c55e' : colors.primary} />
          </View>
          <View style={[styles.statTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.salaryAmountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text
                style={[
                  styles.statNumber,
                  { color: isTargetAchieved ? '#22c55e' : colors.textPrimary },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
              >
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
            <Text style={[styles.statLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {t.expectedSalary || 'متوقع الراتب'}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Navigation Cards */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t.quickAccess}
        </Text>
      </View>

      {/* 1. Shift Quick Access Row */}
      <TouchableOpacity
        style={[
          styles.quickShiftCard,
          {
            backgroundColor: activeSession
              ? (isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fff1f2')
              : colors.card,
            borderColor: activeSession ? '#ef4444' : colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
        onPress={() => {
          if (!activeSession && onStartShiftClick) {
            onStartShiftClick();
          } else {
            onNavigateToTab('shift');
          }
        }}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.quickShiftIconCircle,
            {
              backgroundColor: activeSession
                ? '#ef4444'
                : colors.primary,
            },
          ]}
        >
          <Ionicons
            name={activeSession ? 'stop-circle' : 'play'}
            size={18}
            color="#ffffff"
          />
        </View>
        <View style={[styles.quickCardTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.quickCardTitle, { color: activeSession ? '#ef4444' : colors.textPrimary }]}>
            {activeSession ? t.endShiftNow : t.quickShiftTitle}
          </Text>
          <Text style={[styles.quickCardSub, { color: colors.textSecondary }]}>
            {activeSession ? `${t.durationLabel}: ${elapsedTime}` : t.quickShiftSub}
          </Text>
        </View>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* 2. History & Violations Side-by-Side Dual Row */}
      <View style={[styles.dualQuickRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* History */}
        <TouchableOpacity
          style={[
            styles.compactQuickCard,
            { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
          onPress={() => onNavigateToTab('history')}
          activeOpacity={0.8}
        >
          <View style={[styles.compactQuickIcon, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="receipt-outline" size={17} color={colors.accent} />
          </View>
          <View style={[styles.compactQuickTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.compactQuickTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {t.quickHistoryTitle}
            </Text>
            <Text style={[styles.compactQuickSub, { color: colors.textSecondary }]} numberOfLines={1}>
              سجل الشفتات
            </Text>
          </View>
        </TouchableOpacity>

        {/* Violations */}
        <TouchableOpacity
          style={[
            styles.compactQuickCard,
            {
              backgroundColor: colors.card,
              borderColor: violations.length > 0 && totalDuePending > 0 ? '#ef4444' : colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={() => onNavigateToTab('violations')}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.compactQuickIcon,
              {
                backgroundColor: violations.length > 0
                  ? (isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2')
                  : (isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5'),
              },
            ]}
          >
            <MaterialCommunityIcons
              name={violations.length > 0 ? 'shield-alert-outline' : 'shield-check-outline'}
              size={17}
              color={violations.length > 0 ? (isDarkMode ? '#F87171' : '#DC2626') : (isDarkMode ? '#34D399' : '#059669')}
            />
          </View>
          <View style={[styles.compactQuickTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.compactQuickTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {t.quickViolationsTitle || 'المخالفات'}
            </Text>
            <Text
              style={[
                styles.compactQuickSub,
                { color: violations.length > 0 && totalDuePending > 0 ? '#ef4444' : '#10b981' },
              ]}
              numberOfLines={1}
            >
              {violations.length > 0
                ? (totalDuePending > 0 ? `${totalDuePending} ر.س` : 'مسددة')
                : 'سجل نظيف'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  targetCardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  targetCardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  targetTitleGroup: {
    alignItems: 'center',
    gap: 6,
  },
  targetCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  targetRatioText: {
    fontSize: 12,
    fontWeight: '600',
  },
  targetRatioBold: {
    fontWeight: '800',
  },
  targetProgressContainer: {
    marginBottom: 8,
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  targetFooterRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetFooterNotice: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  targetFooterPct: {
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 8,
  },
  sectionHeader: {
    marginBottom: 6,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  statsGrid: {
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
    justifyContent: 'space-between',
  },
  statBox: {
    width: '48.5%',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
    minHeight: 56,
  },
  statIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statTextCol: {
    flex: 1,
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  salaryAmountRow: {
    alignItems: 'center',
    gap: 3,
  },
  riyalSymbolImg: {
    width: 13,
    height: 13,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
  },
  quickShiftCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  quickShiftIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCardTextCol: {
    flex: 1,
  },
  quickCardTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  quickCardSub: {
    fontSize: 11,
    marginTop: 1,
  },
  dualQuickRow: {
    gap: 8,
    alignItems: 'center',
  },
  compactQuickCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
  },
  compactQuickIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactQuickTextCol: {
    flex: 1,
  },
  compactQuickTitle: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  compactQuickSub: {
    fontSize: 10.5,
    marginTop: 1,
    fontWeight: '500',
  },
});
