import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
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

interface OrdersReviewScreenProps {
  employees?: DelegateWithStatus[];
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  isDatePickerOpen?: boolean;
  onOpenDatePicker?: () => void;
  onCloseDatePicker?: () => void;
}

export const OrdersReviewScreen: React.FC<OrdersReviewScreenProps> = ({
  employees = [],
  colors,
  isDarkMode,
  isRTL,
  onPreviewPhoto,
}) => {
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>('ALL');

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

  const completedSessions = useMemo(
    () => filterCompletedReviewSessions(sessions, searchQuery, statusFilter, employeeMap),
    [sessions, searchQuery, statusFilter, employeeMap]
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

      setSessions((prev) =>
        prev.map((s) =>
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
        )
      );
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
                backgroundColor: statusFilter === 'ALL' ? colors.primary : colors.card,
                borderColor: statusFilter === 'ALL' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setStatusFilter('ALL')}
          >
            <Text style={[styles.filterNum, { color: statusFilter === 'ALL' ? '#fff' : colors.textPrimary }]}>
              {summaryStats.totalFinished}
            </Text>
            <Text style={[styles.filterLbl, { color: statusFilter === 'ALL' ? '#e0f2fe' : colors.textSecondary }]}>
              المنتهية (الأحدث أولاً)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: statusFilter === 'PENDING' ? '#d97706' : colors.card,
                borderColor: statusFilter === 'PENDING' ? '#d97706' : colors.border,
              },
            ]}
            onPress={() => setStatusFilter('PENDING')}
          >
            <Text style={[styles.filterNum, { color: statusFilter === 'PENDING' ? '#fff' : '#d97706' }]}>
              {summaryStats.pendingCount}
            </Text>
            <Text style={[styles.filterLbl, { color: statusFilter === 'PENDING' ? '#fef3c7' : colors.textSecondary }]}>
              بانتظار المراجعة
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor: statusFilter === 'REVIEWED' ? '#10b981' : colors.card,
                borderColor: statusFilter === 'REVIEWED' ? '#10b981' : colors.border,
              },
            ]}
            onPress={() => setStatusFilter('REVIEWED')}
          >
            <Text style={[styles.filterNum, { color: statusFilter === 'REVIEWED' ? '#fff' : '#10b981' }]}>
              {summaryStats.reviewedCount}
            </Text>
            <Text style={[styles.filterLbl, { color: statusFilter === 'REVIEWED' ? '#d1fae5' : colors.textSecondary }]}>
              تم اعتمادها
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
          <TextInput
            style={[
              styles.searchInput,
              { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
            ]}
            placeholder="ابحث بالاسم، رقم المفتاح، اللوحة، أو المعرف..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
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
    </View>
  );
};
