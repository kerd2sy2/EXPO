import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { DelegateViolation } from '../../services/api';

interface ViolationsModalProps {
  visible: boolean;
  onClose: () => void;
  violations: DelegateViolation[];
  loading: boolean;
  totalAmount: number;
  deductedAmount: number;
  onRefresh: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
}

export const ViolationsModal: React.FC<ViolationsModalProps> = ({
  visible,
  onClose,
  violations,
  loading,
  totalAmount,
  deductedAmount,
  onRefresh,
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  const isDark = isDarkMode;
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
          bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
          text: isDark ? '#FCD34D' : '#D97706',
          border: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FDE68A',
          icon: 'alert-circle-outline' as const,
        };
      case 'DEDUCTED':
        return {
          label: t.violationStatusDeducted || 'تم الخصم',
          bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
          text: isDark ? '#FCA5A5' : '#DC2626',
          border: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
          icon: 'remove-circle-outline' as const,
        };
      case 'DISPUTED':
        return {
          label: t.violationStatusDisputed || 'معترض عليها',
          bg: isDark ? 'rgba(139, 92, 246, 0.2)' : '#EDE9FE',
          text: isDark ? '#C4B5FD' : '#7C3AED',
          border: isDark ? 'rgba(139, 92, 246, 0.4)' : '#DDD6FE',
          icon: 'help-circle-outline' as const,
        };
      case 'PAID':
        return {
          label: t.violationStatusPaid || 'مسددة',
          bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
          text: isDark ? '#6EE7B7' : '#059669',
          border: isDark ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0',
          icon: 'checkmark-circle-outline' as const,
        };
      default:
        return {
          label: status,
          bg: isDark ? 'rgba(107, 114, 128, 0.2)' : '#F3F4F6',
          text: isDark ? '#9CA3AF' : '#4B5563',
          border: isDark ? 'rgba(107, 114, 128, 0.4)' : '#E5E7EB',
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
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={[styles.headerTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}>
              <MaterialCommunityIcons
                name="shield-alert-outline"
                size={22}
                color={isDark ? '#F87171' : '#DC2626'}
              />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.quickViolationsTitle || 'المخالفات والجزاءات'}
              </Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.quickViolationsSub || 'متابعة المخالفات المرورية والجزاءات المسجلة'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6' }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Scroll Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          {/* Summary KPI Cards */}
          <View style={[styles.kpiRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.kpiCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA',
                  borderWidth: 1,
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
                  borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
                  borderWidth: 1,
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
                  borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
                  borderWidth: 1,
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

          {/* Filter Pills */}
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
                        : isDark
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

          {/* Loading Indicator */}
          {loading && violations.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : filteredList.length === 0 ? (
            /* Clean Record / Empty State */
            <View
              style={[
                styles.emptyStateCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
                  },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={54}
                  color={isDark ? '#34D399' : '#10B981'}
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
                      styles.violationCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {/* Top Row: Violation Number & Status */}
                    <View
                      style={[
                        styles.violationCardHeader,
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

                    {/* Main Amount & Reason Row */}
                    <View
                      style={[
                        styles.violationBodyRow,
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
                                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F3F4F6',
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
                              styles.datePill,
                              { flexDirection: isRTL ? 'row-reverse' : 'row' },
                            ]}
                          >
                            <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                            <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                              {formatDate(item.violation_date)}
                            </Text>
                          </View>
                          {item.city ? (
                            <View
                              style={[
                                styles.datePill,
                                { flexDirection: isRTL ? 'row-reverse' : 'row' },
                              ]}
                            >
                              <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                                {item.city}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      {/* Amount Box */}
                      <View style={[styles.amountBox, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2' }]}>
                        <Text style={styles.amountNumber}>
                          {Number(item.amount || 0).toLocaleString()}
                        </Text>
                        <Text style={styles.amountCurrency}>ر.س</Text>
                      </View>
                    </View>

                    {/* Notes if present */}
                    {item.notes ? (
                      <View
                        style={[
                          styles.notesContainer,
                          {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : '#F9FAFB',
                            borderColor: colors.border,
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
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiRow: {
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    padding: 12,
    borderRadius: 16,
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
  loadingBox: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateCard: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  listContainer: {
    gap: 12,
  },
  violationCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  violationCardHeader: {
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
  violationBodyRow: {
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
  datePill: {
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notesText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
});
