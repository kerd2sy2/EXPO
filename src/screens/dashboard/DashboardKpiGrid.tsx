import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { dashboardStyles as styles } from './dashboardStyles';

interface DashboardKpiGridProps {
  displayedOrdersCount: number;
  displayedKmCount: string;
  displayedFuelCount: string;
  oilDueCount: number;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onPressOilDue: () => void;
}

export const DashboardKpiGrid: React.FC<DashboardKpiGridProps> = ({
  displayedOrdersCount,
  displayedKmCount,
  displayedFuelCount,
  oilDueCount,
  colors,
  isDarkMode,
  isRTL,
  onPressOilDue,
}) => (
  <View style={[styles.kpiGrid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
    <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.kpiIconBox, { backgroundColor: '#10b98118' }]}>
        <Ionicons name="bag-check" size={22} color="#10b981" />
      </View>
      <Text style={[styles.kpiNumber, { color: colors.textPrimary }]}>
        {displayedOrdersCount}
      </Text>
      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>طلبات اليوم</Text>
    </View>

    <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.kpiIconBox, { backgroundColor: '#0284c718' }]}>
        <Ionicons name="speedometer" size={22} color="#0284c7" />
      </View>
      <Text style={[styles.kpiNumber, { color: colors.textPrimary }]}>
        {displayedKmCount} كم
      </Text>
      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>كيلومترات اليوم</Text>
    </View>

    <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.kpiIconBox, { backgroundColor: '#f59e0b18' }]}>
        <Ionicons name="flame" size={22} color="#f59e0b" />
      </View>
      <View style={[styles.riyalValueRow, { flexDirection: 'row', direction: 'ltr' }]}>
        <Image
          source={require('../../../assets/Saudi_Riyal_Symbol.svg.webp')}
          style={[styles.riyalSymbolImg, { tintColor: isDarkMode ? '#fbbf24' : '#d97706' }]}
          resizeMode="contain"
        />
        <Text style={[styles.kpiNumber, { color: colors.textPrimary }]}>
          {displayedFuelCount}
        </Text>
      </View>
      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>بنزين اليوم</Text>
    </View>

    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPressOilDue}
      style={[
        styles.kpiCard,
        {
          backgroundColor: colors.card,
          borderColor: oilDueCount > 0 ? '#ef444460' : colors.border,
        },
      ]}
    >
      <View style={[styles.kpiIconBox, { backgroundColor: '#ef444418' }]}>
        <Ionicons name="construct" size={22} color="#ef4444" />
      </View>
      <Text style={[styles.kpiNumber, { color: oilDueCount > 0 ? '#ef4444' : colors.textPrimary }]}>
        {oilDueCount}
      </Text>
      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]} numberOfLines={1}>
        تغيير زيت
      </Text>
    </TouchableOpacity>
  </View>
);
