import React from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, Language } from '../types/delegate';
import { DelegateViolation } from '../services/api';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { violationsStyles as styles } from './violations/violationsStyles';
import { ViolationCard } from './violations/ViolationCard';

interface ViolationsScreenProps {
  violations: DelegateViolation[];
  loading?: boolean;
  totalAmount: number;
  deductedAmount: number;
  onRefresh?: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  lang?: Language;
}

export const ViolationsScreen: React.FC<ViolationsScreenProps> = ({
  violations,
  loading = false,
  totalAmount,
  deductedAmount,
  onRefresh,
  colors,
  isDarkMode,
  isRTL,
  t,
  lang = 'ar',
}) => {
  const pendingAmount = Math.max(0, totalAmount - deductedAmount);

  return (
    <View style={styles.tabContainer}>
      <ModuleErrorBoundary moduleName="ملخص المخالفات" colors={colors}>
        <View style={[styles.fixedHeaderWrap, { backgroundColor: colors.bg }]}>
          <View style={[styles.kpiRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.kpiCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.25)' : '#FEE2E2',
                },
              ]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
                {t.violationsTotalAmount || 'إجمالي المخالفات'}
              </Text>
              <Text style={[styles.kpiValue, { color: '#EF4444' }]}>
                {totalAmount.toLocaleString()} <Text style={styles.kpiUnit}>{t.sar || 'ر.س'}</Text>
              </Text>
            </View>

            <View
              style={[
                styles.kpiCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.25)' : '#D1FAE5',
                },
              ]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
                {t.violationsTotalDeducted || 'تم خصمه'}
              </Text>
              <Text style={[styles.kpiValue, { color: '#10B981' }]}>
                {deductedAmount.toLocaleString()} <Text style={styles.kpiUnit}>{t.sar || 'ر.س'}</Text>
              </Text>
            </View>

            <View
              style={[
                styles.kpiCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.25)' : '#FEF3C7',
                },
              ]}
            >
              <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
                {t.violationsTotalPending || 'المتبقي عليك'}
              </Text>
              <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>
                {pendingAmount.toLocaleString()} <Text style={styles.kpiUnit}>{t.sar || 'ر.س'}</Text>
              </Text>
            </View>
          </View>
        </View>
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="قائمة المخالفات" colors={colors} onReset={onRefresh}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={Boolean(loading)}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {loading && violations.length === 0 ? (
            <View style={styles.loadingContainer}>
              {[1, 2, 3].map((k) => (
                <View
                  key={k}
                  style={[
                    styles.card,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: 0.6 },
                  ]}
                >
                  <View
                    style={[
                      styles.cardTopRow,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <View
                      style={[styles.skeletonLine, { width: 140, backgroundColor: colors.inputBg }]}
                    />
                    <View style={[styles.skeletonBadge, { backgroundColor: colors.inputBg }]} />
                  </View>
                  <View
                    style={[
                      styles.skeletonLine,
                      { width: 100, backgroundColor: colors.inputBg, marginTop: 8 },
                    ]}
                  />
                </View>
              ))}
            </View>
          ) : violations.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={48}
                  color={isDarkMode ? '#34D399' : '#10B981'}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {t.noViolations || 'سجلك نظيف! لا توجد مخالفات مسجلة.'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {t.noViolationsSub || 'التزام ممتاز بقواعد وأنظمة السلامة المرورية'}
              </Text>
            </View>
          ) : (
            <View style={styles.listContainer}>
              {violations.map((item) => (
                <ModuleErrorBoundary key={item.id} moduleName="بطاقة مخالفة" colors={colors}>
                  <ViolationCard
                    item={item}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    isRTL={isRTL}
                    t={t}
                    lang={lang}
                  />
                </ModuleErrorBoundary>
              ))}
            </View>
          )}
        </ScrollView>
      </ModuleErrorBoundary>
    </View>
  );
};
