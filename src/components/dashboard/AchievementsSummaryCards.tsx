import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { EmployeeProfile, WorkSession, ThemeColors } from '../../types/delegate';

interface AchievementsSummaryCardsProps {
  employee: EmployeeProfile;
  activeSession: WorkSession | null;
  historySessions: WorkSession[];
  expectedSalary: number;
  isDifferentBike: boolean;
  isTargetAchieved: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
}

export const AchievementsSummaryCards: React.FC<AchievementsSummaryCardsProps> = ({
  employee,
  activeSession,
  historySessions,
  expectedSalary,
  isDifferentBike,
  isTargetAchieved,
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  const completedShiftsCount = historySessions.filter((s) => s.status !== 'ACTIVE').length;
  const currentBike = isDifferentBike
    ? activeSession?.motorcycle_number
    : (employee.motorcycle_number || '—');

  return (
    <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {/* 1. Bike Card (الدباب المعتمد / الحالي) */}
      <View
        style={[
          styles.modernStatCard,
          {
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            borderColor: isDifferentBike
              ? (isDarkMode ? 'rgba(245, 158, 11, 0.45)' : '#fcd34d')
              : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'),
          },
        ]}
      >
        {/* Top Header of Card: Icon + Status Pill */}
        <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.iconSquircle,
              {
                backgroundColor: isDifferentBike
                  ? (isDarkMode ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7')
                  : (isDarkMode ? 'rgba(249, 115, 22, 0.16)' : '#fff7ed'),
                borderColor: isDifferentBike
                  ? 'rgba(245, 158, 11, 0.35)'
                  : 'rgba(249, 115, 22, 0.25)',
              },
            ]}
          >
            <MaterialCommunityIcons
              name="motorbike"
              size={22}
              color={isDifferentBike ? '#f59e0b' : '#f97316'}
            />
          </View>

          <View
            style={[
              styles.miniStatusPill,
              {
                backgroundColor: isDifferentBike
                  ? (isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7')
                  : (isDarkMode ? 'rgba(34, 197, 94, 0.15)' : '#f0fdf4'),
              },
            ]}
          >
            <Text
              style={[
                styles.miniStatusText,
                { color: isDifferentBike ? '#d97706' : '#16a34a' },
              ]}
            >
              {isDifferentBike ? (isRTL ? 'مؤقت' : 'Alt') : (isRTL ? 'معتمد' : 'Active')}
            </Text>
          </View>
        </View>

        {/* Value Display */}
        <View style={styles.cardValueWrap}>
          <Text
            style={[
              styles.statNumberText,
              {
                color: isDifferentBike
                  ? (isDarkMode ? '#fbbf24' : '#d97706')
                  : (isDarkMode ? '#ffffff' : '#0f172a'),
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            {currentBike}
          </Text>
        </View>

        {/* Bottom Label */}
        <Text
          style={[
            styles.statLabelText,
            {
              color: isDifferentBike ? '#d97706' : (isDarkMode ? '#94a3b8' : '#64748b'),
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          numberOfLines={1}
        >
          {isDifferentBike ? (t.outOnDifferentBike || 'طالع الآن بدباب') : t.assignedBike}
        </Text>
      </View>

      {/* 2. Key Card (رقم المفتاح) */}
      <View
        style={[
          styles.modernStatCard,
          {
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
          },
        ]}
      >
        <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.iconSquircle,
              {
                backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.16)' : '#eef2ff',
                borderColor: 'rgba(99, 102, 241, 0.25)',
              },
            ]}
          >
            <MaterialCommunityIcons name="key-wireless" size={22} color="#6366f1" />
          </View>

          <View
            style={[
              styles.miniStatusPill,
              { backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.15)' : '#f5f3ff' },
            ]}
          >
            <Text style={[styles.miniStatusText, { color: '#6366f1' }]}>
              {isRTL ? 'عهدة' : 'Key'}
            </Text>
          </View>
        </View>

        <View style={styles.cardValueWrap}>
          <Text
            style={[
              styles.statNumberText,
              {
                color: isDarkMode ? '#ffffff' : '#0f172a',
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            numberOfLines={1}
          >
            {employee.key_number || '—'}
          </Text>
        </View>

        <Text
          style={[
            styles.statLabelText,
            {
              color: isDarkMode ? '#94a3b8' : '#64748b',
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          numberOfLines={1}
        >
          {t.keyNumber}
        </Text>
      </View>

      {/* 3. Shifts Card (إجمالي الشفتات) */}
      <View
        style={[
          styles.modernStatCard,
          {
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
          },
        ]}
      >
        <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.iconSquircle,
              {
                backgroundColor: isDarkMode ? 'rgba(14, 165, 233, 0.16)' : '#f0f9ff',
                borderColor: 'rgba(14, 165, 233, 0.25)',
              },
            ]}
          >
            <MaterialCommunityIcons name="calendar-check" size={22} color="#0284c7" />
          </View>

          <View
            style={[
              styles.miniStatusPill,
              { backgroundColor: isDarkMode ? 'rgba(14, 165, 233, 0.15)' : '#e0f2fe' },
            ]}
          >
            <Text style={[styles.miniStatusText, { color: '#0284c7' }]}>
              {isRTL ? 'مكتمل' : 'Done'}
            </Text>
          </View>
        </View>

        <View style={[styles.cardValueWrap, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'baseline', gap: 4 }]}>
          <Text
            style={[
              styles.statNumberText,
              {
                color: isDarkMode ? '#ffffff' : '#0f172a',
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            numberOfLines={1}
          >
            {completedShiftsCount}
          </Text>
          <Text style={[styles.unitSubText, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
            {isRTL ? 'شفت' : 'shifts'}
          </Text>
        </View>

        <Text
          style={[
            styles.statLabelText,
            {
              color: isDarkMode ? '#94a3b8' : '#64748b',
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          numberOfLines={1}
        >
          {t.totalShifts}
        </Text>
      </View>

      {/* 4. Expected Salary Card (متوقع الراتب) */}
      <View
        style={[
          styles.modernStatCard,
          {
            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
            borderColor: isTargetAchieved
              ? (isDarkMode ? 'rgba(34, 197, 94, 0.45)' : '#86efac')
              : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0'),
          },
        ]}
      >
        <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.iconSquircle,
              {
                backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5',
                borderColor: 'rgba(16, 185, 129, 0.25)',
              },
            ]}
          >
            <Ionicons name="wallet-outline" size={22} color="#10b981" />
          </View>

          <View
            style={[
              styles.miniStatusPill,
              {
                backgroundColor: isTargetAchieved
                  ? (isDarkMode ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7')
                  : (isDarkMode ? 'rgba(16, 185, 129, 0.12)' : '#f0fdf4'),
              },
            ]}
          >
            <Text
              style={[
                styles.miniStatusText,
                { color: isTargetAchieved ? '#16a34a' : '#059669' },
              ]}
            >
              {isTargetAchieved ? (isRTL ? 'مكتمل 🎉' : 'Goal') : (isRTL ? 'تقديري' : 'Est.')}
            </Text>
          </View>
        </View>

        <View style={[styles.cardValueWrap, styles.salaryRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text
            style={[
              styles.statNumberText,
              {
                color: isTargetAchieved
                  ? '#16a34a'
                  : (isDarkMode ? '#ffffff' : '#0f172a'),
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
          >
            {expectedSalary > 0 ? expectedSalary.toLocaleString('en-US') : '0'}
          </Text>
          <Image
            source={require('../../../assets/Saudi_Riyal_Symbol.svg.webp')}
            style={[
              styles.riyalSymbolImg,
              { tintColor: isTargetAchieved ? '#16a34a' : (isDarkMode ? '#cbd5e1' : '#334155') },
            ]}
            resizeMode="contain"
          />
        </View>

        <Text
          style={[
            styles.statLabelText,
            {
              color: isDarkMode ? '#94a3b8' : '#64748b',
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          numberOfLines={1}
        >
          {t.expectedSalary || 'متوقع الراتب'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsGrid: {
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    marginBottom: 18,
  },
  modernStatCard: {
    width: '48.3%',
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 14,
    minHeight: 130,
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconSquircle: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  miniStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  miniStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardValueWrap: {
    marginVertical: 2,
  },
  statNumberText: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  unitSubText: {
    fontSize: 11,
    fontWeight: '700',
  },
  salaryRow: {
    alignItems: 'center',
    gap: 4,
  },
  riyalSymbolImg: {
    width: 15,
    height: 15,
  },
  statLabelText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
});
