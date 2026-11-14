import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, WorkSession, PreviewPhotoData } from '../types/delegate';
import { DelegateWithStatus, supervisorApi } from '../services/supervisor';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { ordersReviewStyles as styles } from './orders-review/ordersReviewStyles';
import {
  ReviewStatusFilter,
  computeReviewSummaryStats,
  filterCompletedReviewSessions,
} from './orders-review/ordersReviewHelpers';
import { OrderSessionCard } from './orders-review/OrderSessionCard';
import { OrderReviewEditModal } from './orders-review/OrderReviewEditModal';
import {
  OrdersDatePickerModal,
  OrdersEmployeeSearchModal,
} from './orders-review/OrdersReviewModals';

interface OrdersReviewScreenProps {
  employees?: DelegateWithStatus[];
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  isDatePickerOpen?: boolean;
  onOpenDatePicker?: () => void;
  onCloseDatePicker?: () => void;
  isSearchPickerOpen?: boolean;
  onOpenSearchPicker?: () => void;
  onCloseSearchPicker?: () => void;
}

export const OrdersReviewScreen: React.FC<OrdersReviewScreenProps> = ({
  employees = [],
  colors,
  isDarkMode,
  isRTL,
  onPreviewPhoto,
  isDatePickerOpen = false,
  onCloseDatePicker,
  isSearchPickerOpen = false,
  onCloseSearchPicker,
}) => {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [extraScopedSessions, setExtraScopedSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>('TODAY');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<DelegateWithStatus | null>(null);

  const [selectedSession, setSelectedSession] = useState<WorkSession | null>(null);
  const [editedOrders, setEditedOrders] = useState('');
  const [editedFuel, setEditedFuel] = useState('');
  const [editedStartKm, setEditedStartKm] = useState('');
  const [editedEndKm, setEditedEndKm] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const employeeMap = useMemo(() => {
    const map = new Map<string, DelegateWithStatus>();
    employees.forEach((e) => {
      if (e.id) map.set(String(e.id), e);
    });
    return map;
  }, [employees]);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await supervisorApi.getBranchSessions(300, 1);
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('[OrdersReviewScreen] error fetching branch sessions:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Fetch full employee or selected-date sessions from backend whenever employee or date filter is active
  useEffect(() => {
    if (!selectedEmployee && !selectedDate) {
      setExtraScopedSessions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fetched = await supervisorApi.getOrdersReview({
          employeeId: selectedEmployee?.id,
          date: selectedDate || undefined,
          limit: 500,
        });
        if (!cancelled && Array.isArray(fetched)) {
          setExtraScopedSessions(fetched);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedEmployee, selectedDate]);

  const mergedSessions = useMemo(() => {
    if (extraScopedSessions.length === 0) return sessions;
    const byId = new Map<string, WorkSession>();
    sessions.forEach((s) => byId.set(String(s.id), s));
    extraScopedSessions.forEach((s) => byId.set(String(s.id), s));
    return Array.from(byId.values());
  }, [sessions, extraScopedSessions]);

  const completedSessions = useMemo(
    () =>
      filterCompletedReviewSessions(
        mergedSessions,
        statusFilter,
        selectedDate,
        selectedEmployee?.id || null
      ),
    [mergedSessions, statusFilter, selectedDate, selectedEmployee]
  );

  const displayedOrdersTotal = useMemo(
    () => completedSessions.reduce((acc, s) => acc + Number(s.orders_count ?? 0), 0),
    [completedSessions]
  );

  const summaryStats = useMemo(() => computeReviewSummaryStats(sessions), [sessions]);

  const openEditModal = useCallback((session: WorkSession) => {
    setSelectedSession(session);
    setEditedOrders(String(session.orders_count ?? 0));
    setEditedFuel(String(session.fuel_cost ?? 0));
    setEditedStartKm(String(session.start_km ?? 0));
    setEditedEndKm(String(session.end_km ?? 0));
    setReviewNotes(session.review_notes || '');
  }, []);

  const handleSaveReview = async () => {
    if (!selectedSession) return;
    const startVal = Number(toEnglishDigits(editedStartKm)) || 0;
    const endVal = Number(toEnglishDigits(editedEndKm)) || 0;

    if (endVal > 0 && endVal < startVal) {
      showBottomAlert({
        type: 'warning',
        title: 'قراءة عداد غير صحيحة',
        message: 'كيلو النهاية لا يمكن أن يكون أقل من كيلو البداية.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const ordersVal = Number(toEnglishDigits(editedOrders)) || 0;
      const fuelVal = Number(toEnglishDigits(editedFuel)) || 0;

      await supervisorApi.reviewSession({
        sessionId: selectedSession.id,
        isReviewed: true,
        ordersCount: ordersVal,
        fuelCost: fuelVal,
        startKm: startVal,
        endKm: endVal,
        reviewNotes: reviewNotes.trim() || 'تمت المراجعة والاعتماد',
      });

      const applyPatch = (list: WorkSession[]) =>
        list.map((s) =>
          s.id === selectedSession.id
            ? {
                ...s,
                is_reviewed: true,
                orders_count: ordersVal,
                fuel_cost: fuelVal,
                start_km: startVal,
                end_km: endVal,
                review_notes: reviewNotes.trim(),
              }
            : s
        );
      setSessions(applyPatch);
      setExtraScopedSessions(applyPatch);
      setSelectedSession(null);
    } catch (e: any) {
      showBottomAlert({
        type: 'error',
        title: 'فشل التحديث',
        message: e?.message || 'حدث خطأ أثناء حفظ المراجعة.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderSessionCard = useCallback(
    ({ item: session }: { item: WorkSession }) => (
      <ModuleErrorBoundary moduleName="بطاقة شفت منتهي" colors={colors}>
        <OrderSessionCard
          session={session}
          empRecord={employeeMap.get(String(session.employee_id))}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onPreviewPhoto={onPreviewPhoto}
          onOpenEdit={openEditModal}
        />
      </ModuleErrorBoundary>
    ),
    [colors, isDarkMode, isRTL, employeeMap, onPreviewPhoto, openEditModal]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={styles.topControls}>
        <View style={[styles.filterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  statusFilter === 'TODAY' && !selectedDate && !selectedEmployee
                    ? colors.primary
                    : colors.card,
                borderColor:
                  statusFilter === 'TODAY' && !selectedDate && !selectedEmployee
                    ? colors.primary
                    : colors.border,
              },
            ]}
            onPress={() => {
              setSelectedDate(null);
              setSelectedEmployee(null);
              setStatusFilter('TODAY');
            }}
          >
            <Text
              style={[
                styles.filterNum,
                {
                  color:
                    statusFilter === 'TODAY' && !selectedDate && !selectedEmployee
                      ? '#fff'
                      : colors.primary,
                },
              ]}
            >
              {summaryStats.todayOrdersCount}
            </Text>
            <Text
              style={[
                styles.filterLbl,
                {
                  color:
                    statusFilter === 'TODAY' && !selectedDate && !selectedEmployee
                      ? '#e0f2fe'
                      : colors.textSecondary,
                },
              ]}
            >
              اليوم الحالي ({summaryStats.todaySessionsCount} شفت)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  statusFilter === 'ALL' && !selectedDate && !selectedEmployee
                    ? '#10b981'
                    : colors.card,
                borderColor:
                  statusFilter === 'ALL' && !selectedDate && !selectedEmployee
                    ? '#10b981'
                    : colors.border,
              },
            ]}
            onPress={() => {
              setSelectedDate(null);
              setSelectedEmployee(null);
              setStatusFilter('ALL');
            }}
          >
            <Text
              style={[
                styles.filterNum,
                {
                  color:
                    statusFilter === 'ALL' && !selectedDate && !selectedEmployee
                      ? '#fff'
                      : '#10b981',
                },
              ]}
            >
              {summaryStats.allOrdersCount}
            </Text>
            <Text
              style={[
                styles.filterLbl,
                {
                  color:
                    statusFilter === 'ALL' && !selectedDate && !selectedEmployee
                      ? '#d1fae5'
                      : colors.textSecondary,
                },
              ]}
            >
              الكل ({summaryStats.allSessionsCount} شفت)
            </Text>
          </TouchableOpacity>
        </View>

        {(selectedEmployee || selectedDate) && (
          <View
            style={{
              flexDirection: isRTL ? 'row-reverse' : 'row',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 4,
            }}
          >
            {selectedEmployee && (
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: colors.primary + '18',
                  borderWidth: 1,
                  borderColor: colors.primary + '45',
                }}
              >
                <Ionicons name="person" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, fontWeight: '800', color: colors.primary }}>
                  {selectedEmployee.name} • {displayedOrdersTotal} طلب ({completedSessions.length} شفت)
                </Text>
                <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
                  <Ionicons name="close-circle" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {selectedDate && (
              <View
                style={{
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: '#f59e0b18',
                  borderWidth: 1,
                  borderColor: '#f59e0b45',
                }}
              >
                <Ionicons name="calendar" size={14} color="#d97706" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#d97706' }}>
                  {selectedDate}
                </Text>
                <TouchableOpacity onPress={() => setSelectedDate(null)}>
                  <Ionicons name="close-circle" size={16} color="#d97706" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      <ModuleErrorBoundary moduleName="سجل مراجعة الطلبات والورديات" colors={colors} onReset={fetchSessions}>
        {loading && sessions.length === 0 ? (
          <View style={styles.centerEmpty}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
              جاري تحميل الشفتات المنتهية...
            </Text>
          </View>
        ) : (
          <FlatList
            data={completedSessions}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderSessionCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={5}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={fetchSessions}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="clipboard-outline" size={42} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  لا توجد شفتات منتهية مطابقة
                </Text>
              </View>
            }
          />
        )}
      </ModuleErrorBoundary>

      <ModuleErrorBoundary
        moduleName="نافذة تعديل ومراجعة الطلبات"
        colors={colors}
        onReset={() => setSelectedSession(null)}
      >
        <OrderReviewEditModal
          selectedSession={selectedSession}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          editedStartKm={editedStartKm}
          editedEndKm={editedEndKm}
          editedOrders={editedOrders}
          editedFuel={editedFuel}
          reviewNotes={reviewNotes}
          submitting={submitting}
          onChangeStartKm={setEditedStartKm}
          onChangeEndKm={setEditedEndKm}
          onChangeOrders={setEditedOrders}
          onChangeFuel={setEditedFuel}
          onChangeReviewNotes={setReviewNotes}
          onSave={handleSaveReview}
          onClose={() => setSelectedSession(null)}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary
        moduleName="التقويم لمراجعة الطلبات"
        colors={colors}
        onReset={() => onCloseDatePicker?.()}
      >
        <OrdersDatePickerModal
          visible={Boolean(isDatePickerOpen)}
          selectedDate={selectedDate}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onSelectDate={setSelectedDate}
          onClose={() => onCloseDatePicker?.()}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary
        moduleName="البحث بالموظفين لمراجعة الطلبات"
        colors={colors}
        onReset={() => onCloseSearchPicker?.()}
      >
        <OrdersEmployeeSearchModal
          visible={Boolean(isSearchPickerOpen)}
          employees={employees}
          selectedEmployeeId={selectedEmployee?.id || null}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onSelectEmployee={setSelectedEmployee}
          onClose={() => onCloseSearchPicker?.()}
        />
      </ModuleErrorBoundary>
    </View>
  );
};
