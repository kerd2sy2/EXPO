import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmployeeProfile, WorkSession, TabType, ThemeColors, Language } from '../types/delegate';

export interface HomeScreenProps {
  employee: EmployeeProfile;
  pendingSessions?: WorkSession[];
  workingDelegatesCount?: number;
  totalDelegatesCount?: number;
  todayOrdersCount?: number;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  lang?: Language;
  onNavigateToTab: (tab: TabType) => void;
  onConfirmOrders?: (session: WorkSession, ordersCount?: number, notes?: string) => Promise<void>;
  onRefresh?: () => void;
  // Backward compatibility
  activeSession?: WorkSession | null;
  historySessions?: WorkSession[];
  totalApprovedOrdersCount?: number;
  pendingOrdersCount?: number;
  monthlyTarget?: number;
  isTargetAchieved?: boolean;
  expectedSalary?: number;
  targetProgressPct?: number;
  remainingOrdersToTarget?: number;
  elapsedTime?: string;
  onStartShiftClick?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  employee,
  pendingSessions = [],
  workingDelegatesCount = 0,
  totalDelegatesCount = 0,
  todayOrdersCount = 0,
  colors,
  isDarkMode,
  isRTL = true,
  onNavigateToTab,
}) => {
  const pendingCount = pendingSessions.length;

  return (
    <View style={styles.container}>
      {/* ── Live Branch KPIs (Quick Stats Bar) ── */}
      <View style={[styles.kpiGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* 1. Active on Shift */}
        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: '#10b98135' }]}
          onPress={() => onNavigateToTab('field')}
          activeOpacity={0.7}
        >
          <View style={[styles.kpiIconBox, { backgroundColor: '#10b98115' }]}>
            <Ionicons name="bicycle" size={20} color="#10b981" />
          </View>
          <Text style={[styles.kpiValue, { color: '#10b981' }]}>{workingDelegatesCount}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>في الميدان</Text>
        </TouchableOpacity>

        {/* 2. Pending Orders / Approvals */}
        <TouchableOpacity
          style={[
            styles.kpiCard,
            {
              backgroundColor: colors.card,
              borderColor: pendingCount > 0 ? '#f59e0b50' : colors.border,
            },
          ]}
          onPress={() => onNavigateToTab('approvals')}
          activeOpacity={0.7}
        >
          <View style={[styles.kpiIconBox, { backgroundColor: '#f59e0b15' }]}>
            <Ionicons name="time" size={20} color="#f59e0b" />
          </View>
          <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>{pendingCount}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>طلبات معلقة</Text>
        </TouchableOpacity>

        {/* 3. Total Branch Delegates */}
        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => onNavigateToTab('field')}
          activeOpacity={0.7}
        >
          <View style={[styles.kpiIconBox, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="people" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{totalDelegatesCount}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>إجمالي المناديب</Text>
        </TouchableOpacity>

        {/* 4. Today Orders */}
        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => onNavigateToTab('dashboard')}
          activeOpacity={0.7}
        >
          <View style={[styles.kpiIconBox, { backgroundColor: '#0284c715' }]}>
            <Ionicons name="cube" size={20} color="#0284c7" />
          </View>
          <Text style={[styles.kpiValue, { color: '#0284c7' }]}>{todayOrdersCount}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>طلبات اليوم</Text>
        </TouchableOpacity>
      </View>

      {/* ── CORE SUPERVISOR HUBS & MODULES ── */}
      <View style={styles.modulesSection}>
        {/* Module 1: Branch Dashboard & Live KPIs */}
        <TouchableOpacity
          style={[
            styles.moduleCard,
            { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
          onPress={() => onNavigateToTab('dashboard')}
          activeOpacity={0.75}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="stats-chart" size={24} color={colors.primary} />
          </View>
          <View style={[styles.moduleTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>لوحة مؤشرات الفرع</Text>
            <Text style={[styles.moduleSub, { color: colors.textSecondary }]}>
              إحصائيات الأداء، معدل تغطية الميدان، والطلبات
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Module 2: Field Live Monitoring */}
        <TouchableOpacity
          style={[
            styles.moduleCard,
            { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
          onPress={() => onNavigateToTab('field')}
          activeOpacity={0.75}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: '#10b98115' }]}>
            <Ionicons name="people" size={24} color="#10b981" />
          </View>
          <View style={[styles.moduleTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.titleWithBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>متابعة الميدان والمناديب</Text>
              {workingDelegatesCount > 0 && (
                <View style={[styles.miniBadge, { backgroundColor: '#10b98120' }]}>
                  <Text style={[styles.miniBadgeText, { color: '#10b981' }]}>{workingDelegatesCount} نشط</Text>
                </View>
              )}
            </View>
            <Text style={[styles.moduleSub, { color: colors.textSecondary }]}>
              المناديب على رأس العمل، الدبابات، وبدء الورديات استثنائياً
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* Module 3: Approvals & Confirmation (صفحة اعتماد وتأكيد مستقلة) */}
        <TouchableOpacity
          style={[
            styles.moduleCard,
            {
              backgroundColor: colors.card,
              borderColor: pendingCount > 0 ? '#f59e0b' : colors.border,
              borderWidth: pendingCount > 0 ? 1.5 : 1,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={() => onNavigateToTab('approvals')}
          activeOpacity={0.75}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: '#f59e0b15' }]}>
            <Ionicons name="checkmark-done-circle" size={26} color="#f59e0b" />
          </View>
          <View style={[styles.moduleTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <View style={[styles.titleWithBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>مركز الاعتماد والتأكيد</Text>
              {pendingCount > 0 && (
                <View style={[styles.alertBadge, { backgroundColor: '#ef4444' }]}>
                  <Text style={styles.alertBadgeText}>{pendingCount} معلق</Text>
                </View>
              )}
            </View>
            <Text style={[styles.moduleSub, { color: colors.textSecondary }]}>
              اعتماد شفتات المناديب، مراجعة الطلبات، والسلف والصيانة
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={pendingCount > 0 ? '#f59e0b' : colors.textSecondary} />
        </TouchableOpacity>

        {/* Module 4: Fleet & Operations */}
        <TouchableOpacity
          style={[
            styles.moduleCard,
            { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
          onPress={() => onNavigateToTab('operations')}
          activeOpacity={0.75}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: '#0284c715' }]}>
            <Ionicons name="construct-outline" size={24} color="#0284c7" />
          </View>
          <View style={[styles.moduleTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>إدارة الأسطول والدبابات</Text>
            <Text style={[styles.moduleSub, { color: colors.textSecondary }]}>
              جاهزية الدبابات، الصيانة الدورية، وصرف الزيت
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 16,
  },
  kpiGrid: {
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  kpiCard: {
    flex: 1,
    minWidth: '22%',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  kpiIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  modulesSection: {
    gap: 12,
    marginTop: 4,
  },
  moduleCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  moduleIconBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleTextBox: {
    flex: 1,
    gap: 4,
  },
  titleWithBadge: {
    alignItems: 'center',
    gap: 8,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  moduleSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  alertBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  alertBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
});
