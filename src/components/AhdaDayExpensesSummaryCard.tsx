import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustodyDayData } from '../services/custodyService';
import { toArabicDigits, formatArabicNumber } from '../utils/formatters';

interface AhdaDayExpensesSummaryCardProps {
  currentDay: CustodyDayData | null;
  onPress: () => void;
}

export const AhdaDayExpensesSummaryCard: React.FC<AhdaDayExpensesSummaryCardProps> = ({
  currentDay,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={styles.simpleInvoicesOrangeCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.simpleInvoicesRight}>
        <View style={styles.simpleInvoicesIconCircle}>
          <Ionicons name="receipt-outline" size={20} color="#ffffff" />
        </View>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.simpleInvoicesOrangeTitle}>
            فواتير ومصاريف اليوم بالكامل
          </Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Text style={styles.simpleInvoicesOrangeSub}>
              {toArabicDigits(currentDay?.expenses?.length || 0)} فواتير مسجلة • إجمالي: {formatArabicNumber(currentDay?.total_expenses ?? 0, 2)}
            </Text>
            <Image
              source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={{ width: 12, height: 12, tintColor: 'rgba(255, 255, 255, 0.85)' }}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
      <Ionicons name="chevron-back" size={18} color="rgba(255, 255, 255, 0.85)" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  simpleInvoicesOrangeCard: {
    backgroundColor: '#ea580c',
    borderRadius: 16,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  simpleInvoicesRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  simpleInvoicesIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleInvoicesOrangeTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'right',
    marginBottom: 2,
  },
  simpleInvoicesOrangeSub: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'right',
  },
});
