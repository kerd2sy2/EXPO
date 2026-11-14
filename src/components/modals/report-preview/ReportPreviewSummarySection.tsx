import React from 'react';
import { Image, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustodyExpenseItem } from '../../../services/custodyService';
import { formatArabicNumber, toArabicDigits } from '../../../utils/formatters';
import { ahdaReportPreviewStyles as styles } from './ahdaReportPreviewStyles';

export const REPORT_CATEGORIES = [
  { key: 'fuel', label: 'بنزين', icon: 'speedometer-outline', color: '#047857', bg: '#ecfdf5' },
  { key: 'internet_advance', label: 'سلفة نت', icon: 'wifi-outline', color: '#0284c7', bg: '#f0f9ff' },
  { key: 'advance', label: 'سلفة شخصية', icon: 'person-add-outline', color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'license', label: 'رخصة القيادة', icon: 'card-outline', color: '#2563eb', bg: '#eff6ff' },
  { key: 'spare_parts', label: 'قطع غيار', icon: 'build-outline', color: '#d97706', bg: '#fffbeb' },
  { key: 'other', label: 'مصاريف أخرى', icon: 'receipt-outline', color: '#059669', bg: '#ecfdf5' },
];

export interface ReportPreviewCategoryGroup {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  expenses: CustodyExpenseItem[];
  total: number;
}

interface ReportPreviewSummarySectionProps {
  supervisorName: string;
  cleanDateStr: string;
  effectiveOpening: number;
  addedAmount: number;
  totalExpenses: number;
  closingBalance: number;
  groupedCategories: ReportPreviewCategoryGroup[];
  colors: any;
  isDarkMode: boolean;
}

export const ReportPreviewSummarySection: React.FC<ReportPreviewSummarySectionProps> = ({
  supervisorName,
  cleanDateStr,
  effectiveOpening,
  addedAmount,
  totalExpenses,
  closingBalance,
  groupedCategories,
  colors,
  isDarkMode,
}) => (
  <>
    <View style={{ flexDirection: 'row', height: 4, width: '100%' }}>
      <View style={{ width: 110, backgroundColor: '#047857' }} />
      <View style={{ flex: 1, backgroundColor: isDarkMode ? '#334155' : '#1e293b' }} />
    </View>

    <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, backgroundColor: isDarkMode ? '#131b2e' : '#ffffff' }}>
      <View style={{ flexDirection: 'row-reverse', justifyContent: 'flex-start', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
          <Image
            source={require('../../../../assets/images/logo.png')}
            style={{ width: 34, height: 34 }}
            resizeMode="contain"
          />
          <View style={{ alignItems: 'flex-start' }}>
            <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 }}>AAMS</Text>
            <Text style={{ fontSize: 7, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1 }}>LOGISTICS</Text>
          </View>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 10,
          marginTop: 10,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: isDarkMode ? '#1e293b' : '#f1f5f9',
        }}
      >
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#fed7aa', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="person-outline" size={12} color="#047857" />
          </View>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>{supervisorName}</Text>
        </View>

        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#fed7aa', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="calendar-outline" size={12} color="#047857" />
          </View>
          <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>{cleanDateStr.replace(/-/g, '/')}</Text>
        </View>
      </View>
    </View>

    <View style={styles.sectionHeaderRow}>
      <View style={styles.sectionIndicator} />
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        أولاً: ملخص حركة العهدة والرصيد الصافي المتبقي
      </Text>
    </View>

    <View style={styles.statCardsGrid}>
      <View
        style={[
          styles.statCard,
          {
            backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
            borderColor: isDarkMode ? '#334155' : '#cbd5e1',
          },
        ]}
      >
        <Text style={[styles.statTitle, { color: colors.textSecondary }]}>باقي أمس - افتتاحي</Text>
        <Text style={[styles.statAmount, { color: colors.textPrimary }]}>
          {formatArabicNumber(effectiveOpening)}
        </Text>
        <Text style={[styles.statCurrency, { color: colors.textSecondary }]}>ر.س</Text>
      </View>

      <View
        style={[
          styles.statCard,
          {
            backgroundColor: isDarkMode ? '#2c1e14' : '#ecfdf5',
            borderColor: isDarkMode ? '#7c2d12' : '#fed7aa',
          },
        ]}
      >
        <Text style={[styles.statTitle, { color: '#047857' }]}>العهدة المضافة اليوم</Text>
        <Text style={[styles.statAmount, { color: '#047857' }]}>
          {formatArabicNumber(addedAmount)}
        </Text>
        <Text style={[styles.statCurrency, { color: '#047857' }]}>ر.س</Text>
      </View>

      <View
        style={[
          styles.statCard,
          {
            backgroundColor: isDarkMode ? '#2d1417' : '#fef2f2',
            borderColor: isDarkMode ? '#991b1b' : '#fecaca',
          },
        ]}
      >
        <Text style={[styles.statTitle, { color: '#dc2626' }]}>إجمالي المصاريف</Text>
        <Text style={[styles.statAmount, { color: '#dc2626' }]}>
          {formatArabicNumber(totalExpenses)}
        </Text>
        <Text style={[styles.statCurrency, { color: '#dc2626' }]}>ر.س</Text>
      </View>

      <View
        style={[
          styles.statCard,
          {
            backgroundColor: isDarkMode ? '#13281d' : '#f0fdf4',
            borderColor: isDarkMode ? '#166534' : '#bbf7d0',
          },
        ]}
      >
        <Text style={[styles.statTitle, { color: '#16a34a' }]}>صافي العهدة المتبقي</Text>
        <Text style={[styles.statAmount, { color: '#16a34a' }]}>
          {formatArabicNumber(closingBalance)}
        </Text>
        <Text style={[styles.statCurrency, { color: '#16a34a' }]}>ر.س</Text>
      </View>
    </View>

    <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
      <View style={styles.sectionIndicator} />
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        ثانياً: تفاصيل المصاريف حسب الأقسام
      </Text>
    </View>

    <View
      style={[
        styles.categoryTable,
        {
          backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
        },
      ]}
    >
      <View style={styles.categoryTableHeader}>
        <Text style={[styles.colHeader, { flex: 2, color: colors.textSecondary }]}>القسم / التصنيف</Text>
        <Text style={[styles.colHeader, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>
          العدد
        </Text>
        <Text style={[styles.colHeader, { flex: 1.5, textAlign: 'left', color: colors.textSecondary }]}>
          المبلغ (ر.س)
        </Text>
      </View>

      {REPORT_CATEGORIES.map((cat, idx) => {
        const grp = groupedCategories.find((g) => g.key === cat.key);
        const count = grp ? grp.expenses.length : 0;
        const total = grp ? grp.total : 0;
        const isLast = idx === REPORT_CATEGORIES.length - 1;

        return (
          <View
            key={cat.key}
            style={[
              styles.categoryTableRow,
              {
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
              },
            ]}
          >
            <View style={[styles.catNameCell, { flex: 2 }]}>
              <View style={[styles.catDot, { backgroundColor: cat.color }]} />
              <Text style={[styles.catNameText, { color: colors.textPrimary }]}>{cat.label}</Text>
            </View>

            <Text
              style={[
                styles.catCountText,
                { flex: 1, color: count > 0 ? colors.textPrimary : colors.textSecondary },
              ]}
            >
              {toArabicDigits(count)}
            </Text>

            <Text
              style={[
                styles.catAmountText,
                { flex: 1.5, color: total > 0 ? '#047857' : colors.textSecondary },
              ]}
            >
              {formatArabicNumber(total)}
            </Text>
          </View>
        );
      })}
    </View>
  </>
);
