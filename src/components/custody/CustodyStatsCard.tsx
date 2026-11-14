import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WidgetErrorBoundary } from '../WidgetErrorBoundary';

interface CustodyStatsProps {
  initialAmount: number;
  totalExpenses: number;
  balance: number;
  isDarkMode: boolean;
  onRefresh?: () => void;
}

export const CustodyStatsCard: React.FC<CustodyStatsProps> = React.memo(({
  initialAmount,
  totalExpenses,
  balance,
  isDarkMode,
  onRefresh,
}) => {
  return (
    <WidgetErrorBoundary widgetName="بطاقة رصيد العهدة" onRetry={onRefresh}>
      <View style={[styles.card, { backgroundColor: isDarkMode ? '#1e293b' : '#0369a1' }]}>
        <View style={styles.topRow}>
          <Text style={styles.title}>صافي رصيد العهدة الحالي</Text>
          <View style={styles.badge}>
            <Ionicons name="wallet-outline" size={16} color="#38bdf8" />
            <Text style={styles.badgeText}>مباشر</Text>
          </View>
        </View>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceVal}>{balance.toLocaleString('ar-SA')} ريال</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>إجمالي الوارد</Text>
            <Text style={[styles.statVal, { color: '#4ade80' }]}>
              {initialAmount.toLocaleString('ar-SA')} ر.س
            </Text>
          </View>
          <View style={styles.vertDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>إجمالي المنصرف</Text>
            <Text style={[styles.statVal, { color: '#f87171' }]}>
              {totalExpenses.toLocaleString('ar-SA')} ر.س
            </Text>
          </View>
        </View>
      </View>
    </WidgetErrorBoundary>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#bae6fd',
    textAlign: 'right',
  },
  badge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
  },
  balanceRow: {
    marginVertical: 12,
    alignItems: 'center',
  },
  balanceVal: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 10,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  vertDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  statVal: {
    fontSize: 15,
    fontWeight: '700',
  },
});
