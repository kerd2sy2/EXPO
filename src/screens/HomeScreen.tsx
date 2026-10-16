import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EmployeeProfile, WorkSession, TabType, ThemeColors, Language } from '../types/delegate';
import { DelegateViolation } from '../services/api';
import { formatBikePlateForDisplay } from '../utils/plateUtils';

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
  // Backward compatibility props
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
  violations?: DelegateViolation[];
  totalViolationsAmount?: number;
  deductedViolationsAmount?: number;
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
  t,
  lang = 'ar',
  onNavigateToTab,
  onConfirmOrders,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Edit Orders Modal State
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [editOrdersCount, setEditOrdersCount] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Normalize digits (Arabic/Persian -> English)
  const normalizeDigits = (str: string) => {
    return str
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
  };

  // Filter pending sessions by delegate name (min 2 characters) or show all if search is empty
  const filteredPendingSessions = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw) return pendingSessions;

    const normalized = normalizeDigits(raw).toLowerCase();
    // Search when 2 or more characters are entered
    if (normalized.length < 2) return pendingSessions;

    return pendingSessions.filter((s) => {
      const empName = (s.employee_name || s.employee?.name || '').toLowerCase();
      const empNum = (s.employee?.employee_number || '').toLowerCase();
      const natId = (s.employee?.national_id || '').toLowerCase();
      const bikeNum = (s.motorcycle_number || '').toLowerCase();
      return (
        empName.includes(normalized) ||
        empNum.includes(normalized) ||
        natId.includes(normalized) ||
        bikeNum.includes(normalized)
      );
    });
  }, [pendingSessions, searchQuery]);

  // Handle instant one-tap order confirmation
  const handleDirectConfirm = async (session: WorkSession) => {
    if (confirmingId) return;
    if (!onConfirmOrders) {
      Alert.alert('تنبيه', 'خدمة الاعتماد غير متوفرة حالياً.');
      return;
    }
    try {
      setConfirmingId(session.id);
      await onConfirmOrders(session, session.orders_count);
    } catch (err: any) {
      console.error('Error confirming orders:', err);
    } finally {
      setConfirmingId(null);
    }
  };

  // Open edit modal for a session
  const openEditModal = (session: WorkSession) => {
    setEditingSession(session);
    setEditOrdersCount(String(session.orders_count || 0));
    setEditNotes(session.review_notes || '');
  };

  // Save edited orders and confirm
  const handleSaveEditedOrders = async () => {
    if (!editingSession || !onConfirmOrders) return;
    const count = parseInt(normalizeDigits(editOrdersCount.trim()), 10);
    if (isNaN(count) || count < 0) {
      Alert.alert('خطأ', 'يرجى إدخال عدد طلبات صحيح.');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      await onConfirmOrders(editingSession, count, editNotes.trim() || 'تم تعديل واعتماد الطلبات بواسطة المشرف');
      setEditingSession(null);
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل حفظ وتأكيد الطلبات');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const isSearchActive = searchQuery.trim().length >= 2;

  return (
    <View style={styles.container}>
      {/* ── Supervisor Welcome & Branch Header Banner ── */}
      <View style={[styles.welcomeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.welcomeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.welcomeIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="shield-checkmark" size={24} color={colors.primary} />
          </View>
          <View style={[styles.welcomeTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.welcomeGreeting, { color: colors.textSecondary }]}>
              بوابة المشرف الميداني
            </Text>
            <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>
              {employee.name || 'المشرف'}
            </Text>
            <Text style={[styles.welcomeBranch, { color: colors.primary }]}>
              {employee.branch_name ? `فرع: ${employee.branch_name}` : 'إشراف عام'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Live Branch KPIs ── */}
      <View style={[styles.kpiGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Active on Shift */}
        <TouchableOpacity
          style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => onNavigateToTab('field')}
          activeOpacity={0.7}
        >
          <View style={[styles.kpiIconBox, { backgroundColor: '#10b98115' }]}>
            <Ionicons name="bicycle" size={20} color="#10b981" />
          </View>
          <Text style={[styles.kpiValue, { color: '#10b981' }]}>{workingDelegatesCount}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>على رأس العمل</Text>
        </TouchableOpacity>

        {/* Pending Orders to Confirm */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: pendingSessions.length > 0 ? '#f59e0b' : colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#f59e0b15' }]}>
            <Ionicons name="time" size={20} color="#f59e0b" />
          </View>
          <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>{pendingSessions.length}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>طلبات معلقة</Text>
        </View>

        {/* Total Branch Delegates */}
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

        {/* Today Orders */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#0284c715' }]}>
            <Ionicons name="cube" size={20} color="#0284c7" />
          </View>
          <Text style={[styles.kpiValue, { color: '#0284c7' }]}>{todayOrdersCount}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>طلبات اليوم</Text>
        </View>
      </View>

      {/* ── SEARCH & CONFIRM PENDING ORDERS SECTION ── */}
      <View style={[styles.searchSectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.sectionTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="checkmark-done-circle" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              اعتماد وتأكيد طلبات المناديب
            </Text>
          </View>
          {pendingSessions.length > 0 && (
            <View style={[styles.pendingCountBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.pendingCountBadgeText, { color: colors.primary }]}>
                {pendingSessions.length} معلقة
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.searchHintText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          اكتب أول حرفين من اسم المندوب أو رقمه لعرض طلباته المعلقة وتأكيدها فوراً:
        </Text>

        {/* Search Input Bar */}
        <View style={[styles.searchInputContainer, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: isSearchActive ? colors.primary : colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="search" size={20} color={isSearchActive ? colors.primary : colors.textSecondary} style={{ marginHorizontal: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder="ابحث باسم المندوب أو رقم الدباب أو الهوية..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} style={{ marginHorizontal: 8 }} />
            </TouchableOpacity>
          )}
        </View>

        {/* Pending Sessions List */}
        <View style={styles.sessionsListContainer}>
          {filteredPendingSessions.length > 0 ? (
            filteredPendingSessions.map((session) => {
              const isConfirming = confirmingId === session.id;
              const delegateName = session.employee_name || session.employee?.name || 'مندوب غير محدد';
              const bikePlate = session.motorcycle_number || session.employee?.motorcycle_number || '—';

              return (
                <View
                  key={session.id}
                  style={[styles.sessionCard, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: colors.border }]}
                >
                  {/* Card Header: Delegate Name & Bike */}
                  <View style={[styles.sessionCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.delegateMetaGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.avatarMini, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="person" size={15} color={colors.primary} />
                      </View>
                      <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text style={[styles.delegateName, { color: colors.textPrimary }]}>
                          {delegateName}
                        </Text>
                        <Text style={[styles.sessionSubMeta, { color: colors.textSecondary }]}>
                          {session.employee?.employee_number ? `كود: ${session.employee.employee_number} • ` : ''}
                          دباب: {formatBikePlateForDisplay(bikePlate, lang)}
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.statusPendingPill, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                      <Text style={styles.statusPendingPillText}>بانتظار التأكيد</Text>
                    </View>
                  </View>

                  {/* Orders, Fuel, Distance Metrics */}
                  <View style={[styles.metricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.metricBox, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.metricLabel, { color: colors.primary }]}>عدد الطلبات</Text>
                      <Text style={[styles.metricNumber, { color: colors.primary }]}>
                        {session.orders_count || 0} طلب
                      </Text>
                    </View>

                    <View style={[styles.metricBox, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
                      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>الوقود</Text>
                      <Text style={[styles.metricNumber, { color: colors.textPrimary }]}>
                        {session.fuel_cost || 0} ر.س
                      </Text>
                    </View>

                    <View style={[styles.metricBox, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
                      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>المسافة</Text>
                      <Text style={[styles.metricNumber, { color: colors.textPrimary }]}>
                        {session.distance || 0} كم
                      </Text>
                    </View>
                  </View>

                  {/* Actions Row: Confirm Orders + Edit Button */}
                  <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                      style={[styles.confirmButton, { backgroundColor: '#10b981' }]}
                      onPress={() => handleDirectConfirm(session)}
                      disabled={isConfirming}
                      activeOpacity={0.8}
                    >
                      {isConfirming ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <View style={[styles.btnInnerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                          <Text style={styles.confirmButtonText}>تأكيد الطلبات ({session.orders_count || 0})</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.editButton, { borderColor: colors.border }]}
                      onPress={() => openEditModal(session)}
                      disabled={isConfirming}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="create-outline" size={17} color={colors.textPrimary} />
                      <Text style={[styles.editButtonText, { color: colors.textPrimary }]}>تعديل</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyStateBox}>
              <Ionicons
                name={isSearchActive ? 'search-outline' : 'checkmark-circle-outline'}
                size={40}
                color={isSearchActive ? colors.textSecondary : '#10b981'}
              />
              <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                {isSearchActive
                  ? `لا توجد ورديات معلقة مطابقة لـ "${searchQuery}"`
                  : 'رائع! لا توجد طلبات معلقة بانتظار التأكيد 🎉'}
              </Text>
              <Text style={[styles.emptyStateSub, { color: colors.textSecondary }]}>
                {isSearchActive
                  ? 'تأكد من اسم المندوب أو رقم دبابته، أو امسح البحث لمشاهدة كافة السجلات.'
                  : 'كافة شفتات وطلبات مناديب الفرع معتمدة ومحدثة بالكامل.'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ── SUPERVISOR QUICK NAVIGATION MODULES ── */}
      <View style={styles.modulesSection}>
        <Text style={[styles.modulesSectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
          بوابات الإشراف الميداني
        </Text>

        {/* 1. Dashboard & KPIs */}
        <TouchableOpacity
          style={[styles.moduleCard, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 1.5, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => onNavigateToTab('dashboard')}
          activeOpacity={0.8}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="stats-chart" size={24} color={colors.primary} />
          </View>
          <View style={[styles.moduleTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.moduleTitle, { color: colors.primary }]}>لوحة مؤشرات الفرع</Text>
            <Text style={[styles.moduleSub, { color: colors.textSecondary }]}>
              إحصائيات الفرع الحية ونسبة تغطية الميدان
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.primary} />
        </TouchableOpacity>

        {/* 2. Field Management & Overrides */}
        <TouchableOpacity
          style={[styles.moduleCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => onNavigateToTab('field')}
          activeOpacity={0.8}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: '#10b98115' }]}>
            <Ionicons name="people" size={24} color="#10b981" />
          </View>
          <View style={[styles.moduleTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>متابعة الميدان والورديات</Text>
            <Text style={[styles.moduleSub, { color: colors.textSecondary }]}>
              المناديب النشطين، بدء وإنهاء الورديات استثنائياً
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* 3. Approvals Center */}
        <TouchableOpacity
          style={[styles.moduleCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => onNavigateToTab('approvals')}
          activeOpacity={0.8}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: '#f59e0b15' }]}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#f59e0b" />
          </View>
          <View style={[styles.moduleTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>مركز الموافقات والاعتمادات</Text>
            <Text style={[styles.moduleSub, { color: colors.textSecondary }]}>
              طلبات الصيانة، السلف، واعتماد تقارير الشفتات
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {/* 4. Operations & Fleet */}
        <TouchableOpacity
          style={[styles.moduleCard, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => onNavigateToTab('operations')}
          activeOpacity={0.8}
        >
          <View style={[styles.moduleIconBox, { backgroundColor: '#0284c715' }]}>
            <Ionicons name="construct-outline" size={24} color="#0284c7" />
          </View>
          <View style={[styles.moduleTextBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>إدارة العمليات والأسطول</Text>
            <Text style={[styles.moduleSub, { color: colors.textSecondary }]}>
              المركبات والدبابات، العهد ومستودع قطع الغيار
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* ── MODAL: EDIT & CONFIRM ORDERS ── */}
      {editingSession && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setEditingSession(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalContentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.modalHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.modalHeaderTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="create" size={20} color={colors.primary} />
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>تعديل واعتماد الطلبات</Text>
                </View>
                <TouchableOpacity onPress={() => setEditingSession(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalDelegateName, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                المندوب: {editingSession.employee_name || editingSession.employee?.name || '—'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  عدد الطلبات الفعلي:
                </Text>
                <TextInput
                  style={[styles.modalTextInput, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  keyboardType="numeric"
                  value={editOrdersCount}
                  onChangeText={setEditOrdersCount}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  ملاحظات المشرف:
                </Text>
                <TextInput
                  style={[styles.modalTextInput, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="ملاحظات الاعتماد (اختياري)..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={[styles.modalActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.modalSaveButton, { backgroundColor: '#10b981' }]}
                  onPress={handleSaveEditedOrders}
                  disabled={isSubmittingEdit}
                >
                  {isSubmittingEdit ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.modalSaveButtonText}>حفظ وتأكيد الوردية</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalCancelButton, { borderColor: colors.border }]}
                  onPress={() => setEditingSession(null)}
                  disabled={isSubmittingEdit}
                >
                  <Text style={[styles.modalCancelButtonText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 16,
  },
  welcomeCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  welcomeRow: {
    alignItems: 'center',
    gap: 14,
  },
  welcomeIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeTextGroup: {
    flex: 1,
    gap: 2,
  },
  welcomeGreeting: {
    fontSize: 12,
    fontWeight: '600',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  welcomeBranch: {
    fontSize: 13,
    fontWeight: '700',
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
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
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
  searchSectionCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleGroup: {
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  pendingCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingCountBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  searchHintText: {
    fontSize: 12,
    lineHeight: 18,
  },
  searchInputContainer: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  sessionsListContainer: {
    gap: 12,
    marginTop: 4,
  },
  sessionCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  sessionCardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  delegateMetaGroup: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  delegateName: {
    fontSize: 15,
    fontWeight: '800',
  },
  sessionSubMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  statusPendingPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPendingPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
  },
  metricsRow: {
    gap: 8,
  },
  metricBox: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricNumber: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionsRow: {
    gap: 8,
    marginTop: 2,
  },
  confirmButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnInnerRow: {
    alignItems: 'center',
    gap: 6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  editButton: {
    width: 76,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyStateBox: {
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyStateSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  modulesSection: {
    gap: 10,
  },
  modulesSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  moduleCard: {
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 12,
  },
  moduleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moduleTextBox: {
    flex: 1,
    gap: 2,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  moduleSub: {
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContentCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  modalHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderTitleGroup: {
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalDelegateName: {
    fontSize: 14,
    fontWeight: '700',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalTextInput: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '600',
  },
  modalActionsRow: {
    gap: 10,
    marginTop: 6,
  },
  modalSaveButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
