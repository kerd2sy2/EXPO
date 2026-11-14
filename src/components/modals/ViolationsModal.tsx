import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors, Language } from '../../types/delegate';
import { DelegateViolation } from '../../services/api';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { ViolationFilter } from './violations/violationsModalHelpers';
import { violationsModalStyles as styles } from './violations/violationsModalStyles';
import { ViolationItemCard } from './violations/ViolationItemCard';

export interface ViolationsModalProps {
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
  lang?: Language;
}

/** Modal showing delegate traffic violations summary KPIs, filters, and detailed records. */
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
  lang = 'ar',
}) => {
  const isDark = isDarkMode;
  const [filter, setFilter] = useState<ViolationFilter>('ALL');

  const pendingAmount = Math.max(0, totalAmount - deductedAmount);
  const filteredList = violations.filter((v) => (filter === 'ALL' ? true : v.status === filter));
  const rowDir = isRTL ? 'row-reverse' : 'row';

  const tabs: { key: ViolationFilter; label: string }[] = [
    { key: 'ALL', label: t.allLabel || 'الكل' },
    { key: 'RECORDED', label: t.violationStatusRecorded || 'مسجلة' },
    { key: 'DEDUCTED', label: t.violationStatusDeducted || 'تم الخصم' },
    { key: 'PAID', label: t.violationStatusPaid || 'مسددة' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, flexDirection: rowDir }]}>
          <View style={[styles.headerTitleRow, { flexDirection: rowDir }]}>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2' }]}>
              <MaterialCommunityIcons name="shield-alert-outline" size={22} color={isDark ? '#F87171' : '#DC2626'} />
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

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={colors.primary} />}
        >
          <ModuleErrorBoundary moduleName="ViolationsKpis" colors={colors}>
            <View style={[styles.kpiRow, { flexDirection: rowDir }]}>
              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#FECACA', borderWidth: 1 }]}>
                <View style={styles.kpiIconWrapper}>
                  <Ionicons name="receipt-outline" size={18} color="#EF4444" />
                </View>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{t.violationsTotalAmount || 'إجمالي المبالغ'}</Text>
                <Text style={[styles.kpiValue, { color: '#EF4444' }]}>
                  {totalAmount.toLocaleString()} <Text style={styles.kpiUnit}>{t.sar || 'ر.س'}</Text>
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0', borderWidth: 1 }]}>
                <View style={styles.kpiIconWrapper}>
                  <Ionicons name="checkmark-done-circle-outline" size={18} color="#10B981" />
                </View>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{t.violationsTotalDeducted || 'تم الخصم'}</Text>
                <Text style={[styles.kpiValue, { color: '#10B981' }]}>
                  {deductedAmount.toLocaleString()} <Text style={styles.kpiUnit}>{t.sar || 'ر.س'}</Text>
                </Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A', borderWidth: 1 }]}>
                <View style={styles.kpiIconWrapper}>
                  <Ionicons name="time-outline" size={18} color="#F59E0B" />
                </View>
                <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{t.violationsTotalPending || 'المتبقي'}</Text>
                <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>
                  {pendingAmount.toLocaleString()} <Text style={styles.kpiUnit}>{t.sar || 'ر.س'}</Text>
                </Text>
              </View>
            </View>
          </ModuleErrorBoundary>

          <View style={[styles.filterBar, { flexDirection: rowDir }]}>
            {tabs.map((tab) => {
              const isSelected = filter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? colors.primary : isDark ? 'rgba(255,255,255,0.06)' : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setFilter(tab.key)}
                >
                  <Text style={[styles.filterChipText, { color: isSelected ? '#FFFFFF' : colors.textSecondary, fontWeight: isSelected ? '700' : '500' }]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ModuleErrorBoundary moduleName="ViolationsModalList" colors={colors}>
            {loading && violations.length === 0 ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : filteredList.length === 0 ? (
              <View style={[styles.emptyStateCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                  <Ionicons name="shield-checkmark" size={54} color={isDark ? '#34D399' : '#10B981'} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {t.noViolations || 'سجلك نظيف! لا توجد أي مخالفات أو جزاءات مسجلة.'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {t.noViolationsSub || 'ممتاز! التزام تام بالأنظمة وقواعد السلامة المرورية'}
                </Text>
              </View>
            ) : (
              <View style={styles.listContainer}>
                {filteredList.map((item) => (
                  <ViolationItemCard key={item.id} item={item} colors={colors} isDarkMode={isDarkMode} isRTL={isRTL} t={t} lang={lang} />
                ))}
              </View>
            )}
          </ModuleErrorBoundary>
        </ScrollView>
      </View>
    </Modal>
  );
};
