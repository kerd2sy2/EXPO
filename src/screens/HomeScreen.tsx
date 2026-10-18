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
  onOpenReportModal?: () => void;
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
  onOpenReportModal,
}) => {
  const pendingCount = pendingSessions.length;

  return (
    <View style={styles.container}>
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

        {/* Module 3: Approvals Hub (مركز الموافقات) */}
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
              <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>مركز الموافقات</Text>
              {pendingCount > 0 && (
                <View style={[styles.alertBadge, { backgroundColor: '#ef4444' }]}>
                  <Text style={styles.alertBadgeText}>{pendingCount} معلق</Text>
                </View>
              )}
            </View>
            <Text style={[styles.moduleSub, { color: colors.textSecondary }]}>
              موافقة شفتات المناديب، الطلبات المعلقة، والسلف والصيانة
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

        {/* Module 5: Employee Reports & Advances (تقارير الموظفين والسلف) */}
        {onOpenReportModal && (
          <TouchableOpacity
            style={[
              styles.moduleCard,
              { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
            onPress={onOpenReportModal}
            activeOpacity={0.75}
          >
            <View style={[styles.moduleIconBox, { backgroundColor: '#8b5cf615' }]}>
              <Ionicons name="document-text" size={24} color="#8b5cf6" />
            </View>
            <View style={[styles.moduleTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.titleWithBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>التقارير</Text>
              </View>
              <Text style={[styles.moduleSub, { color: colors.textSecondary }]}>
                رفع تقرير مشرف أو طلب سلفة مالية
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
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
