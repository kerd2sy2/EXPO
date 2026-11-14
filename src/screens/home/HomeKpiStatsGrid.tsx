import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EmployeeProfile, WorkSession, ThemeColors, Language } from '../../types/delegate';
import { formatBikePlateForDisplay } from '../../utils/plateUtils';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { homeScreenStyles as styles } from './homeScreenStyles';

interface HomeKpiStatsGridProps {
  employee: EmployeeProfile;
  activeSession: WorkSession | null;
  currentMonthWorkingDays: number;
  expectedSalary: number;
  isTargetAchieved: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  lang: Language;
  t: any;
}

export const HomeKpiStatsGrid: React.FC<HomeKpiStatsGridProps> = React.memo(({
  employee,
  activeSession,
  currentMonthWorkingDays,
  expectedSalary,
  isTargetAchieved,
  colors,
  isDarkMode,
  isRTL,
  lang,
  t,
}) => {
  const isDifferentBike = Boolean(
    activeSession &&
      activeSession.motorcycle_number &&
      (!employee.motorcycle_number ||
        activeSession.motorcycle_number.trim().toUpperCase() !==
          employee.motorcycle_number.trim().toUpperCase())
  );

  return (
    <ModuleErrorBoundary moduleName="إحصائيات المندوب" colors={colors}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
          {t.myAchievements}
        </Text>
      </View>

      <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                  ? isDarkMode
                    ? 'rgba(245, 158, 11, 0.2)'
                    : '#fef3c7'
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
              : formatBikePlateForDisplay(employee.motorcycle_number, lang) || '—'}
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
            {isDifferentBike ? t.outOnDifferentBike || 'أنت طالع الآن بدباب' : t.assignedBike}
          </Text>
          {isDifferentBike && employee.motorcycle_number ? (
            <Text style={[styles.originalBikeNotice, { color: colors.textSecondary }]} numberOfLines={1}>
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
          <View
            style={[
              styles.statIconCircle,
              {
                backgroundColor: isTargetAchieved
                  ? 'rgba(34,197,94,0.12)'
                  : colors.primaryLight,
              },
            ]}
          >
            <Ionicons
              name="wallet-outline"
              size={20}
              color={isTargetAchieved ? '#22c55e' : colors.primary}
            />
          </View>
          <View style={[styles.salaryAmountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text
              style={[
                styles.statNumber,
                { color: isTargetAchieved ? '#22c55e' : colors.textPrimary, marginBottom: 0 },
              ]}
            >
              {expectedSalary > 0 ? expectedSalary.toLocaleString('en-US') : '0'}
            </Text>
            <Image
              source={require('../../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={[
                styles.riyalSymbolImg,
                { tintColor: isTargetAchieved ? '#22c55e' : colors.textPrimary },
              ]}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t.expectedSalary || 'متوقع الراتب'}
          </Text>
        </View>
      </View>
    </ModuleErrorBoundary>
  );
});
