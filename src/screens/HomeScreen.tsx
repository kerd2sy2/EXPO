import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EmployeeProfile, WorkSession, TabType, ThemeColors } from '../types/delegate';

interface HomeScreenProps {
  employee: EmployeeProfile;
  activeSession: WorkSession | null;
  historySessions: WorkSession[];
  totalApprovedOrdersCount: number;
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
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  employee,
  activeSession,
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
  onNavigateToTab,
}) => {
  return (
    <View style={styles.tabContainer}>
      {/* Clean Monthly Target & Earnings Card */}
      <View style={[styles.targetCardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header: Title + Orders Completed / Target Ratio */}
        <View style={[styles.targetCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.targetTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="flag-outline" size={17} color={colors.primary} />
            <Text style={[styles.targetCardTitle, { color: colors.textPrimary }]}>
              {t.monthlyTarget}
            </Text>
          </View>
          <Text style={[styles.targetRatioText, { color: colors.textSecondary }]}>
            <Text style={[styles.targetRatioBold, { color: colors.textPrimary }]}>{totalApprovedOrdersCount}</Text> / {monthlyTarget} {t.ordersUnit}
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
              ? t.targetAchievedBadge
              : t.targetRemainingNotice.replace('{n}', String(remainingOrdersToTarget))}
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
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="bike" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
            {employee.motorcycle_number || '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.assignedBike}</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIconCircle, { backgroundColor: colors.accentLight }]}>
            <MaterialCommunityIcons name="key-variant" size={22} color={colors.accent} />
          </View>
          <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
            {employee.key_number || '—'}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.keyNumber}</Text>
        </View>

        {/* Row 2: Shifts & Expected Salary */}
        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
            <MaterialCommunityIcons name="calendar-check" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
            {historySessions.filter((s) => Boolean(s.is_reviewed)).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.totalShifts}</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.statIconCircle, { backgroundColor: isTargetAchieved ? 'rgba(34,197,94,0.12)' : colors.primaryLight }]}>
            <Ionicons name="wallet-outline" size={22} color={isTargetAchieved ? '#22c55e' : colors.primary} />
          </View>
          <Text style={[styles.statNumber, { color: isTargetAchieved ? '#22c55e' : colors.textPrimary }]}>
            {expectedSalary.toLocaleString()}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.expectedSalary}</Text>
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
        onPress={() => onNavigateToTab('shift')}
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
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
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
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickCardSub: {
    fontSize: 12,
  },
});
