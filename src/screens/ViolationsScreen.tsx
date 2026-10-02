import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors } from '../types/delegate';
import { DelegateViolation } from '../services/api';

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
}) => {
  const pendingAmount = Math.max(0, totalAmount - deductedAmount);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECORDED':
        return {
          label: 'مسجلة',
          bg: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
          text: isDarkMode ? '#F87171' : '#DC2626',
          border: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
          icon: 'alert-circle-outline' as const,
        };
      case 'PARTIAL':
        return {
          label: 'مخصومة جزئياً',
          bg: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
          text: isDarkMode ? '#FBBF24' : '#D97706',
          border: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
          icon: 'hourglass-outline' as const,
        };
      case 'DEDUCTED':
        return {
          label: 'تم الخصم',
          bg: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
          text: isDarkMode ? '#34D399' : '#059669',
          border: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
          icon: 'checkmark-circle-outline' as const,
        };
      case 'DISPUTED':
        return {
          label: 'معترض عليها',
          bg: isDarkMode ? 'rgba(139, 92, 246, 0.15)' : '#EDE9FE',
          text: isDarkMode ? '#C4B5FD' : '#7C3AED',
          border: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : '#DDD6FE',
          icon: 'help-circle-outline' as const,
        };
      case 'PAID':
        return {
          label: 'مسددة',
          bg: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
          text: isDarkMode ? '#34D399' : '#059669',
          border: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
          icon: 'checkmark-circle-outline' as const,
        };
      default:
        return {
          label: status,
          bg: isDarkMode ? 'rgba(107, 114, 128, 0.15)' : '#F3F4F6',
          text: isDarkMode ? '#9CA3AF' : '#4B5563',
          border: isDarkMode ? 'rgba(107, 114, 128, 0.3)' : '#E5E7EB',
          icon: 'information-circle-outline' as const,
        };
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split('T')[0];
      return d.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr.split('T')[0];
    }
  };

  return (
    <View style={styles.tabContainer}>
      {/* 1. Sticky / Fixed Summary KPI Header (Never Scrolls) */}
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
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>إجمالي المخالفات</Text>
            <Text style={[styles.kpiValue, { color: '#EF4444' }]}>
              {totalAmount.toLocaleString()} <Text style={styles.kpiUnit}>ر.س</Text>
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
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>تم خصمه</Text>
            <Text style={[styles.kpiValue, { color: '#10B981' }]}>
              {deductedAmount.toLocaleString()} <Text style={styles.kpiUnit}>ر.س</Text>
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
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>المتبقي عليك</Text>
            <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>
              {pendingAmount.toLocaleString()} <Text style={styles.kpiUnit}>ر.س</Text>
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Scrollable Body for Violations Content */}
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
        {/* Loading State */}
        {loading && violations.length === 0 ? (
          <View style={styles.loadingContainer}>
            {[1, 2, 3].map((k) => (
              <View
                key={k}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: 0.6,
                  },
                ]}
              >
                <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.skeletonLine, { width: 140, backgroundColor: colors.inputBg }]} />
                  <View style={[styles.skeletonBadge, { backgroundColor: colors.inputBg }]} />
                </View>
                <View style={[styles.skeletonLine, { width: 100, backgroundColor: colors.inputBg, marginTop: 8 }]} />
              </View>
            ))}
          </View>
        ) : violations.length === 0 ? (
          /* Empty State */
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
          /* Streamlined, Elegant Violations & Penalties List */
          <View style={styles.listContainer}>
          {violations.map((item) => {
            const badge = getStatusBadge(item.status);
            const paid = item.paid_amount !== undefined
              ? item.paid_amount
              : (item.status === 'DEDUCTED' || item.status === 'PAID' ? item.amount : 0);
            const remaining = Math.max(0, item.amount - paid);
            const progressPct = item.amount > 0 ? Math.min(100, Math.round((paid / item.amount) * 100)) : 0;

            const isPenalty =
              item.reason?.includes('جزاء') ||
              item.reason?.includes('خصم') ||
              item.reason?.includes('تأخير') ||
              item.reason?.includes('غياب') ||
              item.reason?.includes('زي') ||
              item.reason?.includes('عهدة') ||
              item.reason?.includes('إهمال');

            return (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: isPenalty
                      ? (isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A')
                      : colors.border,
                  },
                ]}
              >
                {/* Header: Reason & Status */}
                <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.reasonWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons
                      name={isPenalty ? 'alert-circle' : 'warning-outline'}
                      size={18}
                      color={isPenalty ? '#F59E0B' : '#EF4444'}
                      style={{ marginHorizontal: 2 }}
                    />
                    <Text
                      style={[
                        styles.reasonText,
                        { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                      ]}
                      numberOfLines={1}
                    >
                      {item.reason || (isPenalty ? 'جزاء إداري' : 'مخالفة مرورية')}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: badge.bg,
                        borderColor: badge.border,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Ionicons name={badge.icon} size={12} color={badge.text} />
                    <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {/* Sub Row: Plate & Date */}
                <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {item.vehicle_plate ? (
                    <View
                      style={[
                        styles.platePill,
                        {
                          backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="motorbike"
                        size={13}
                        color={colors.textSecondary}
                      />
                      <Text style={[styles.plateText, { color: colors.textPrimary }]}>
                        {item.vehicle_plate}
                      </Text>
                    </View>
                  ) : null}

                  <Text style={[styles.metaDate, { color: colors.textSecondary }]}>
                    {formatDate(item.violation_date)}
                  </Text>

                  {item.violation_number ? (
                    <Text style={[styles.violationRef, { color: colors.textSecondary }]}>
                      #{item.violation_number}
                    </Text>
                  ) : null}
                </View>

                {/* Amount Details Box */}
                <View
                  style={[
                    styles.amountBox,
                    {
                      backgroundColor: isDarkMode ? 'rgba(255,255,255,0.025)' : '#F8FAFC',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={[styles.amountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.amountCol}>
                      <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>المبلغ</Text>
                      <Text style={[styles.amountVal, { color: colors.textPrimary }]}>
                        {Number(item.amount || 0).toLocaleString()} ر.س
                      </Text>
                    </View>

                    <View style={styles.amountCol}>
                      <Text style={[styles.amountLabel, { color: '#10B981' }]}>المخصوم</Text>
                      <Text style={[styles.amountVal, { color: '#10B981' }]}>
                        {Number(paid).toLocaleString()} ر.س
                      </Text>
                    </View>

                    <View style={styles.amountCol}>
                      <Text
                        style={[
                          styles.amountLabel,
                          { color: remaining > 0 ? '#F59E0B' : '#10B981' },
                        ]}
                      >
                        المتبقي
                      </Text>
                      <Text
                        style={[
                          styles.amountVal,
                          { color: remaining > 0 ? '#F59E0B' : '#10B981' },
                        ]}
                      >
                        {Number(remaining).toLocaleString()} ر.س
                      </Text>
                    </View>
                  </View>

                  {/* Clean Mini Progress for installments */}
                  {item.amount > 0 && remaining > 0 && paid > 0 ? (
                    <View style={styles.progressWrap}>
                      <View
                        style={[
                          styles.progressBar,
                          { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
                        ]}
                      >
                        <View
                          style={[
                            styles.progressFill,
                            { width: `${progressPct}%`, backgroundColor: '#10B981' },
                          ]}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>

                {/* Notes if any */}
                {item.notes ? (
                  <View
                    style={[
                      styles.notesBox,
                      {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#F8FAFC',
                        borderColor: colors.border,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={13}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.notesText,
                        { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                      ]}
                      numberOfLines={2}
                    >
                      {item.notes}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flex: 1,
  },
  fixedHeaderWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    zIndex: 10,
  },
  kpiRow: {
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  kpiUnit: {
    fontSize: 10,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  listContainer: {
    gap: 10,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  cardTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  reasonWrap: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    alignItems: 'center',
    gap: 8,
  },
  platePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    gap: 4,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  metaDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  violationRef: {
    fontSize: 11,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  amountBox: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  amountRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountCol: {
    alignItems: 'center',
    gap: 1,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  amountVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressWrap: {
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  notesBox: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  notesText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  loadingContainer: {
    gap: 10,
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
  },
  skeletonBadge: {
    width: 50,
    height: 18,
    borderRadius: 9,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
