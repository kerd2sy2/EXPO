import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '../types/delegate';
import { CustodyDayData } from '../services/custodyService';
import { toArabicDigits, formatArabicNumber } from '../utils/formatters';

interface AhdaDayExpensesSummaryCardProps {
  currentDay: CustodyDayData | null;
  colors?: ThemeColors;
  isDarkMode?: boolean;
  loadingPdf?: boolean;
  onPress: () => void;
  onPressPdf?: () => void;
  onLongPressPdf?: () => void;
}

const AhdaDayExpensesSummaryCardComponent: React.FC<AhdaDayExpensesSummaryCardProps> = ({
  currentDay,
  colors,
  isDarkMode = false,
  loadingPdf = false,
  onPress,
  onPressPdf,
  onLongPressPdf,
}) => {
  return (
    <View style={styles.rowWrapper}>
      {/* 1. PDF Icon Button on the RIGHT (Tap -> Download/Share, Long-Press -> Preview) */}
      {(onPressPdf || onLongPressPdf) && (
        <TouchableOpacity
          style={[
            styles.pdfBtn,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
              opacity: loadingPdf ? 0.7 : 1,
            },
          ]}
          disabled={loadingPdf}
          onPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            } catch (_) {}
            onPressPdf?.();
          }}
          onLongPress={() => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            } catch (_) {}
            onLongPressPdf?.();
          }}
          delayLongPress={350}
          activeOpacity={0.78}
        >
          <View
            style={[
              styles.pdfIconCircle,
              {
                backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2',
                borderColor: isDarkMode ? '#7f1d1d' : '#fecaca',
              },
            ]}
          >
            {loadingPdf ? (
              <ActivityIndicator size="small" color="#dc2626" />
            ) : (
              <Ionicons name="document-text" size={18} color="#dc2626" />
            )}
          </View>
          <Text style={[styles.pdfBtnText, { color: isDarkMode ? '#f87171' : '#dc2626' }]}>
            {loadingPdf ? '...' : 'PDF'}
          </Text>
        </TouchableOpacity>
      )}

      {/* 2. Main Invoices Card on the LEFT */}
      <TouchableOpacity
        style={styles.simpleInvoicesCard}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={styles.simpleInvoicesRight}>
          <View style={styles.simpleInvoicesIconCircle}>
            <Ionicons name="receipt-outline" size={20} color="#ffffff" />
          </View>
          <View style={{ alignItems: 'flex-start', justifyContent: 'center' }}>
            <Text style={styles.simpleInvoicesTitle}>
              فواتير ومصاريف اليوم بالكامل
            </Text>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Text style={styles.simpleInvoicesSub}>
                {toArabicDigits(currentDay?.expenses?.length || 0)} فواتير مسجلة • {formatArabicNumber(currentDay?.total_expenses ?? 0, 2)}
              </Text>
              <Image
                source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
                style={{ width: 11, height: 11, tintColor: 'rgba(255, 255, 255, 0.85)' }}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
        <Ionicons name="chevron-back" size={17} color="rgba(255, 255, 255, 0.85)" />
      </TouchableOpacity>
    </View>
  );
};

export const AhdaDayExpensesSummaryCard = React.memo(AhdaDayExpensesSummaryCardComponent);

const styles = StyleSheet.create({
  rowWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'stretch',
    gap: 8,
    marginBottom: 12,
  },
  simpleInvoicesCard: {
    flex: 1,
    backgroundColor: '#047857',
    borderRadius: 16,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  simpleInvoicesRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  simpleInvoicesIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simpleInvoicesTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'right',
    marginBottom: 2,
  },
  simpleInvoicesSub: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.88)',
    textAlign: 'right',
  },
  pdfBtn: {
    width: 62,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  pdfIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  pdfBtnText: {
    fontSize: 10.5,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
});
