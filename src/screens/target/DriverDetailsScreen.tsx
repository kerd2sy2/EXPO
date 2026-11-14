import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DriverPerformance } from '../../types/target';
import { DateFilterValue } from './DateFilterModal';
import { calculateDriverMetrics } from './driver-details/driverDetailsHelpers';
import { driverDetailsScreenStyles as styles } from './driver-details/driverDetailsScreenStyles';
import { DriverDayRowCard } from './driver-details/DriverDayRowCard';

interface DriverDetailsScreenProps {
  driver: DriverPerformance | null;
  month?: string;
  dateFilter?: DateFilterValue;
  maxElapsedDays?: number;
  onBack: () => void;
  isDarkMode?: boolean;
  colors?: any;
  isRTL?: boolean;
}

export const DriverDetailsScreen: React.FC<DriverDetailsScreenProps> = ({
  driver,
  month,
  dateFilter,
  maxElapsedDays,
  onBack,
  isDarkMode = false,
  colors: propColors,
  isRTL = true,
}) => {
  const defaultColors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    cardAlt: isDarkMode ? '#161f30' : '#f1f5f9',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    borderLight: isDarkMode ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.8)',
    textPrimary: isDarkMode ? '#f8fafc' : '#0f172a',
    textSecondary: isDarkMode ? '#94a3b8' : '#64748b',
    primary: '#0284c7',
    primaryLight: isDarkMode ? 'rgba(2, 132, 199, 0.16)' : '#f0f9ff',
    success: '#10b981',
    successLight: isDarkMode ? 'rgba(16, 185, 129, 0.16)' : '#dcfce7',
    danger: '#ef4444',
    dangerLight: isDarkMode ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2',
    warning: '#f59e0b',
    warningLight: isDarkMode ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7',
    accent: '#3b82f6',
    accentLight: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#eff6ff',
  };
  const colors = propColors || defaultColors;

  const metrics = useMemo(
    () => calculateDriverMetrics(driver, month, dateFilter, maxElapsedDays),
    [driver, month, dateFilter, maxElapsedDays]
  );

  if (!driver) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.bg }]}>
        <Ionicons name="person-outline" size={60} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لم يتم تحديد مندوب</Text>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.primary }]} onPress={onBack}>
          <Text style={styles.backButtonText}>العودة لقائمة المناديب</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.targetStatusBanner,
          {
            backgroundColor: metrics.targetDiff >= 0 ? colors.successLight : colors.dangerLight,
            borderColor: metrics.targetDiff >= 0 ? colors.success : colors.danger,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Ionicons
          name={metrics.targetDiff >= 0 ? 'checkmark-circle' : 'alert-circle'}
          size={26}
          color={metrics.targetDiff >= 0 ? colors.success : colors.danger}
        />
        <View style={[styles.bannerTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text
            style={[
              styles.bannerTitle,
              { color: metrics.targetDiff >= 0 ? colors.success : colors.danger, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {metrics.targetDiff >= 0
              ? `محقق التارچت ومتقدم بـ +${metrics.targetDiff} طلب عن المطلوب`
              : `متأخر عن التارچت التراكمي بعجز ${Math.abs(metrics.targetDiff)} طلب`}
          </Text>
          <Text style={[styles.bannerSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            المطلوب حتى يوم {metrics.maxDayNumber}: {metrics.totalRequiredTargetSoFar} طلب • تم إنجاز: {metrics.totalOrders} طلب
          </Text>
        </View>
      </View>

      <View style={[styles.kpiGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {metrics.isFilteredPeriod && metrics.periodOrders !== null && (
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 2 }]}>
            <Text style={[styles.kpiValue, { color: colors.primary, fontSize: 22 }]}>{metrics.periodOrders}</Text>
            <Text style={[styles.kpiLabel, { color: colors.primary, fontWeight: '800' }]}>
              {dateFilter?.type === 'day' ? 'طلبات اليوم المختار' : 'طلبات الفترة المحددة'}
            </Text>
          </View>
        )}

        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{metrics.totalOrders}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>إجمالي الشهر</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.kpiValue, { color: colors.success }]}>{metrics.activeDaysCount}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>أيام الحضور</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.kpiValue, { color: colors.danger }]}>{metrics.absentDaysCount}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>أيام الغياب</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.kpiValue, { color: colors.accent }]}>{metrics.dailyAvg}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>متوسط الحضور</Text>
        </View>
      </View>

      <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>سجل الأيام والمعرفات اليومية</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            عرض كافة المعرفات والتطبيقات المسجلة لكل يوم من 1 إلى {metrics.maxDayNumber}
          </Text>
        </View>
        <View style={[styles.targetInfoBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.targetInfoBadgeText, { color: colors.primary }]}>التارچت: {metrics.dailyTarget}/يوم</Text>
        </View>
      </View>

      <View style={styles.daysListContainer}>
        {metrics.daysList.map((dItem) => (
          <DriverDayRowCard
            key={dItem.day}
            driver={driver}
            dItem={dItem}
            dayOrders={Number(metrics.dailyOrders[dItem.date]) || 0}
            dailyTarget={metrics.dailyTarget}
            inPeriod={metrics.isDayInPeriod(dItem.day, dItem.date)}
            dailyIdentifiers={metrics.dailyIdentifiers}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
          />
        ))}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};
