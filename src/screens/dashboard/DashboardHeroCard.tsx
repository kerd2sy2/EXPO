import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { dashboardStyles as styles } from './dashboardStyles';
import { DashboardAnalytics } from './dashboardHelpers';

interface DashboardHeroCardProps {
  analyticsData: DashboardAnalytics;
  isDarkMode: boolean;
  isRTL: boolean;
  onOpenFieldTracking: () => void;
}

export const DashboardHeroCard: React.FC<DashboardHeroCardProps> = ({
  analyticsData,
  isDarkMode,
  isRTL,
  onOpenFieldTracking,
}) => (
  <TouchableOpacity
    activeOpacity={0.92}
    delayLongPress={450}
    onLongPress={onOpenFieldTracking}
    style={[
      styles.heroCard,
      {
        backgroundColor: isDarkMode ? '#0f172a' : '#0369a1',
        borderColor: isDarkMode ? '#1e293b' : '#0284c7',
      },
    ]}
  >
    <View style={[styles.heroTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }]}>
      <Text style={styles.heroTitle}>مؤشرات الأداء والتشغيل</Text>

      <View style={[styles.ratePill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="speedometer-outline" size={16} color="#38bdf8" />
        <Text style={styles.ratePillValue}>{analyticsData.attendanceRate}%</Text>
      </View>
    </View>

    <View style={styles.progressBarTrack}>
      <View
        style={[
          styles.progressBarFill,
          { width: `${Math.min(100, analyticsData.attendanceRate)}%` },
        ]}
      />
    </View>

    <View style={[styles.heroBottomStats, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <View style={styles.heroStatItem}>
        <Text style={[styles.heroStatVal, { color: '#ffffff' }]}>{analyticsData.totalDrivers}</Text>
        <Text style={styles.heroStatLbl}>إجمالي المناديب</Text>
      </View>
      <View style={styles.heroDivider} />
      <View style={styles.heroStatItem}>
        <Text style={[styles.heroStatVal, { color: '#38bdf8' }]}>{analyticsData.todayCount}</Text>
        <Text style={styles.heroStatLbl}>مناديب اليوم</Text>
      </View>
      <View style={styles.heroDivider} />
      <View style={styles.heroStatItem}>
        <Text style={[styles.heroStatVal, { color: '#4ade80' }]}>{analyticsData.activeCount}</Text>
        <Text style={styles.heroStatLbl}>يعملون الآن</Text>
      </View>
      <View style={styles.heroDivider} />
      <View style={styles.heroStatItem}>
        <Text style={[styles.heroStatVal, { color: '#fbbf24' }]}>{analyticsData.finishedCount}</Text>
        <Text style={styles.heroStatLbl}>أنهوا الشفت</Text>
      </View>
    </View>
  </TouchableOpacity>
);
