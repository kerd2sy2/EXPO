import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../types/delegate';
import { CustodyDayData, CustodyLogItem } from '../services/custodyService';
import { toArabicDigits, formatArabicNumber } from '../utils/formatters';

interface AhdaNetCustodyCardProps {
  currentDay: CustodyDayData | null;
  effectiveOpeningBalance: number;
  custodyAddedLogs: CustodyLogItem[];
  colors: ThemeColors;
  isDarkMode: boolean;
  onPressCard: () => void;
  onPressManageLogs: () => void;
}

export const AhdaNetCustodyCard: React.FC<AhdaNetCustodyCardProps> = ({
  currentDay,
  effectiveOpeningBalance,
  custodyAddedLogs,
  colors,
  isDarkMode,
  onPressCard,
  onPressManageLogs,
}) => {
  const custodyTotalAvailable = effectiveOpeningBalance + (currentDay?.added_amount ?? 0);
  const spentPct = custodyTotalAvailable > 0
    ? Math.min(100, Math.round(((currentDay?.total_expenses ?? 0) / custodyTotalAvailable) * 100))
    : 0;

  return (
    <TouchableOpacity
      style={[styles.targetCardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPressCard}
      activeOpacity={0.9}
    >
      {/* Header: Title + Net Balance */}
      <View style={styles.targetCardHeader}>
        <View style={styles.targetTitleGroup}>
          <View style={styles.walletIconCircle}>
            <Ionicons name="wallet-outline" size={18} color="#047857" />
          </View>
          <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
            <Text style={[styles.targetCardTitle, { color: colors.textPrimary }]}>
              صافي العهدة المتبقي
            </Text>
          </View>
        </View>

        <View style={{ alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image
              source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={{ width: 22, height: 22, tintColor: '#047857' }}
              resizeMode="contain"
            />
            <Text style={[styles.targetNetValue, { color: '#047857' }]}>
              {formatArabicNumber(
                (currentDay?.closing_balance !== undefined && currentDay?.closing_balance !== null && currentDay.closing_balance !== 0)
                  ? currentDay.closing_balance
                  : (custodyTotalAvailable - (currentDay?.total_expenses ?? 0)),
                2
              )}
            </Text>
          </View>
          <Text style={[styles.targetNetUnit, { color: colors.textSecondary }]}>الرصيد الصافي المتاح</Text>
        </View>
      </View>

      {/* Progress bar showing spent vs available */}
      <View style={styles.targetProgressContainer}>
        <View style={[styles.progressBarTrack, { backgroundColor: isDarkMode ? '#1f2433' : '#f1f5f9' }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.max(3, spentPct)}%`,
                backgroundColor: spentPct > 85 ? '#ef4444' : '#047857',
              },
            ]}
          />
        </View>
      </View>

      {/* Footer 3-Stats Details: باقي أمس • المضاف للعهدة • إجمالي المصاريف */}
      <View style={[styles.targetDetailsRow, { borderTopColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
        {/* 1. باقي أمس (افتتاحي) */}
        <View style={styles.detailCol}>
          <Text style={[styles.detailColLabel, { color: colors.textSecondary }]}>باقي أمس</Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.detailColValue, { color: colors.textPrimary }]}>
              {formatArabicNumber(effectiveOpeningBalance, 2)}
            </Text>
            <Image
              source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={{ width: 11, height: 11, tintColor: colors.textPrimary }}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={[styles.detailDivider, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]} />

        {/* 2. عهدة اليوم المضافة */}
        <View style={styles.detailCol}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.detailColLabel, { color: '#047857' }]}>العهدة المضافة</Text>
          </View>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.detailColValue, { color: '#047857' }]}>
              {formatArabicNumber(currentDay?.added_amount ?? 0, 2)}
            </Text>
            <Image
              source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={{ width: 11, height: 11, tintColor: '#047857' }}
              resizeMode="contain"
            />
          </View>
          {custodyAddedLogs.length > 0 && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onPressManageLogs();
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.miniLogLink}>{toArabicDigits(custodyAddedLogs.length)} إضافات (إدارة/حذف)</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.detailDivider, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]} />

        {/* 3. إجمالي المصاريف */}
        <View style={styles.detailCol}>
          <Text style={[styles.detailColLabel, { color: '#ef4444' }]}>إجمالي المصاريف</Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.detailColValue, { color: '#ef4444' }]}>
              {formatArabicNumber(currentDay?.total_expenses ?? 0, 2)}
            </Text>
            <Image
              source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={{ width: 11, height: 11, tintColor: '#ef4444' }}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  targetCardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  targetCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetTitleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  walletIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  targetCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  targetCardHint: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
    marginTop: 1,
  },
  targetNetValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  targetNetUnit: {
    fontSize: 10,
    fontWeight: '600',
  },
  targetProgressContainer: {
    marginBottom: 14,
  },
  progressBarTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetDetailsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  detailCol: {
    flex: 1,
    alignItems: 'center',
  },
  detailColLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  detailColValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  detailColUnit: {
    fontSize: 9,
    fontWeight: '600',
  },
  detailDivider: {
    width: 1,
    height: 24,
  },
  miniLogLink: {
    fontSize: 9,
    fontWeight: '700',
    color: '#047857',
    textDecorationLine: 'underline',
    marginTop: 2,
  },
});
