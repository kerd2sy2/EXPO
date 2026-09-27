import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
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
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'RECORDED' | 'DEDUCTED' | 'PAID'>('ALL');

  const pendingAmount = Math.max(0, totalAmount - deductedAmount);

  const filteredList = violations.filter((v) => {
    if (filter === 'ALL') return true;
    return v.status === filter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RECORDED':
        return {
          label: t.violationStatusRecorded || 'مسجلة',
          bg: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
          text: isDarkMode ? '#FCD34D' : '#D97706',
          border: isDarkMode ? 'rgba(245, 158, 11, 0.4)' : '#FDE68A',
          icon: 'alert-circle-outline' as const,
        };
      case 'DEDUCTED':
        return {
          label: t.violationStatusDeducted || 'تم الخصم',
          bg: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
          text: isDarkMode ? '#FCA5A5' : '#DC2626',
          border: isDarkMode ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
          icon: 'remove-circle-outline' as const,
        };
      case 'DISPUTED':
        return {
          label: t.violationStatusDisputed || 'معترض عليها',
          bg: isDarkMode ? 'rgba(139, 92, 246, 0.2)' : '#EDE9FE',
          text: isDarkMode ? '#C4B5FD' : '#7C3AED',
          border: isDarkMode ? 'rgba(139, 92, 246, 0.4)' : '#DDD6FE',
          icon: 'help-circle-outline' as const,
        };
      case 'PAID':
        return {
          label: t.violationStatusPaid || 'مسددة',
          bg: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
          text: isDarkMode ? '#6EE7B7' : '#059669',
          border: isDarkMode ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0',
          icon: 'checkmark-circle-outline' as const,
        };
      default:
        return {
          label: status,
          bg: isDarkMode ? 'rgba(107, 114, 128, 0.2)' : '#F3F4F6',
          text: isDarkMode ? '#9CA3AF' : '#4B5563',
          border: isDarkMode ? 'rgba(107, 114, 128, 0.4)' : '#E5E7EB',
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
      {/* Summary KPI Cards (Matching App Theme) */}
      <View style={[styles.kpiRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: colors.card,
              borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
            },
          ]}
        >
          <View style={styles.kpiIconWrapper}>
            <Ionicons name="receipt-outline" size={18} color="#EF4444" />
          </View>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
            {t.violationsTotalAmount || 'إجمالي المبالغ'}
          </Text>
          <Text style={[styles.kpiValue, { color: '#EF4444' }]}>
            {totalAmount.toLocaleString()} <Text style={styles.kpiUnit}>ر.س</Text>
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: colors.card,
              borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
            },
          ]}
        >
          <View style={styles.kpiIconWrapper}>
            <Ionicons name="checkmark-done-circle-outline" size={18} color="#10B981" />
          </View>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
            {t.violationsTotalDeducted || 'تم الخصم'}
          </Text>
          <Text style={[styles.kpiValue, { color: '#10B981' }]}>
            {deductedAmount.toLocaleString()} <Text style={styles.kpiUnit}>ر.س</Text>
          </Text>
        </View>

        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: colors.card,
              borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
            },
          ]}
        >
          <View style={styles.kpiIconWrapper}>
            <Ionicons name="time-outline" size={18} color="#F59E0B" />
          </View>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
            {t.violationsTotalPending || 'المتبقي'}
          </Text>
          <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>
            {pendingAmount.toLocaleString()} <Text style={styles.kpiUnit}>ر.س</Text>
          </Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {[
          { key: 'ALL', label: 'الكل' },
          { key: 'RECORDED', label: 'مسجلة' },
          { key: 'DEDUCTED', label: 'تم الخصم' },
          { key: 'PAID', label: 'مسددة' },
        ].map((tab) => {
          const isSelected = filter === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isSelected
                    ? colors.primary
                    : isDarkMode
                    ? 'rgba(255,255,255,0.06)'
                    : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter(tab.key as any)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: isSelected ? '#FFFFFF' : colors.textSecondary,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Loading Skeleton */}
      {loading && violations.length === 0 ? (
        <View style={styles.loadingContainer}>
          {[1, 2, 3].map((k) => (
            <View
              key={k}
              style={[
                styles.premiumCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  opacity: 0.7,
                },
              ]}
            >
              <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.skeletonLine, { width: 120, backgroundColor: colors.inputBg }]} />
                <View style={[styles.skeletonBadge, { backgroundColor: colors.inputBg }]} />
              </View>
              <View style={[styles.skeletonLine, { width: 180, backgroundColor: colors.inputBg, marginTop: 12 }]} />
            </View>
          ))}
        </View>
      ) : filteredList.length === 0 ? (
        /* Empty / Clean Record State */
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={52}
              color={isDarkMode ? '#34D399' : '#10B981'}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            {t.noViolations || 'سجلك نظيف! لا توجد أي مخالفات أو جزاءات مسجلة.'}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t.noViolationsSub || 'ممتاز! التزام تام بالأنظمة وقواعد السلامة المرورية'}
          </Text>
        </View>
      ) : (
        /* Violations List */
        <View style={styles.listContainer}>
          {filteredList.map((item) => {
            const badge = getStatusBadge(item.status);
            return (
              <View
                key={item.id}
                style={[
                  styles.premiumCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Header: Number & Status */}
                <View
                  style={[
                    styles.cardHeaderRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={[styles.numberGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                    <Text style={[styles.violationNumber, { color: colors.textPrimary }]}>
                      #{item.violation_number || item.id.substring(0, 8)}
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
                    <Ionicons name={badge.icon} size={13} color={badge.text} />
                    <Text style={[styles.statusText, { color: badge.text }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>

                {/* Body Row: Reason & Amount */}
                <View
                  style={[
                    styles.bodyRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={styles.reasonCol}>
                    <Text
                      style={[
                        styles.reasonTitle,
                        { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                      ]}
                    >
                      {item.reason || 'مخالفة مرورية'}
                    </Text>
                    <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {item.vehicle_plate ? (
                        <View
                          style={[
                            styles.platePill,
                            {
                              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
                              flexDirection: isRTL ? 'row-reverse' : 'row',
                            },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="motorbike"
                            size={14}
                            color={colors.textSecondary}
                          />
                          <Text style={[styles.plateText, { color: colors.textPrimary }]}>
                            {item.vehicle_plate}
                          </Text>
                        </View>
                      ) : null}
                      <View
                        style={[
                          styles.metaItem,
                          { flexDirection: isRTL ? 'row-reverse' : 'row' },
                        ]}
                      >
                        <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                          {formatDate(item.violation_date)}
                        </Text>
                      </View>
                      {item.city ? (
                        <View
                          style={[
                            styles.metaItem,
                            { flexDirection: isRTL ? 'row-reverse' : 'row' },
                          ]}
                        >
                          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                            {item.city}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Amount Box */}
                  <View
                    style={[
                      styles.amountBox,
                      { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2' },
                    ]}
                  >
                    <Text style={styles.amountNumber}>
                      {Number(item.amount || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.amountCurrency}>ر.س</Text>
                  </View>
                </View>

                {/* Supervisor Notes if present */}
                {item.notes ? (
                  <View
                    style={[
                      styles.notesContainer,
                      {
                        backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F9FAFB',
                        borderColor: colors.border,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.notesText,
                        { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                      ]}
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
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    padding: 16,
  },
  kpiRow: {
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIconWrapper: {
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '900',
  },
  kpiUnit: {
    fontSize: 10,
    fontWeight: '700',
  },
  filterBar: {
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  loadingContainer: {
    gap: 12,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
  },
  skeletonBadge: {
    width: 60,
    height: 22,
    borderRadius: 11,
  },
  emptyCard: {
    padding: 36,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  emptyIconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
  },
  premiumCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  numberGroup: {
    alignItems: 'center',
    gap: 6,
  },
  violationNumber: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bodyRow: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  reasonCol: {
    flex: 1,
    gap: 6,
  },
  reasonTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  metaRow: {
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  platePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
    gap: 4,
  },
  plateText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  metaItem: {
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  amountBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 72,
  },
  amountNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: '#DC2626',
  },
  amountCurrency: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  notesContainer: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  notesText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
