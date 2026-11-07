import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, WorkSession, PreviewPhotoData } from '../types/delegate';
import { DelegateWithStatus, supervisorApi } from '../services/supervisor';
import { formatImageUrl } from '../services/api';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';

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

type ReviewStatusFilter = 'ALL' | 'PENDING' | 'REVIEWED';

const formatTimeOnly = (iso?: string) => {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
};

const formatDateTimeFull = (iso?: string) => {
  if (!iso) return '---';
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timePart = d.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} • ${timePart}`;
  } catch {
    return iso;
  }
};

const calcShiftHours = (startIso?: string, endIso?: string) => {
  if (!startIso || !endIso) return '0 س';
  try {
    const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
    if (diffMs <= 0) return '0 س';
    const totalMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs === 0) return `${mins} د`;
    return mins > 0 ? `${hrs} س ${mins} د` : `${hrs} ساعة`;
  } catch {
    return '0 س';
  }
};

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

  // Edit Modal State
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

  // ONLY completed shifts (اعرض اللى خلص بس) + Sorted strictly descending by date & time (آخر حاجة تعرض الأول)
  const completedSessions = useMemo(() => {
    const q = toEnglishDigits(searchQuery.trim()).toLowerCase();

    return sessions
      .filter((s) => {
        // Show ONLY finished shifts
        if (s.status !== 'COMPLETED' || !s.end_time) return false;

        if (statusFilter === 'PENDING' && s.is_reviewed) return false;
        if (statusFilter === 'REVIEWED' && !s.is_reviewed) return false;

        if (!q) return true;

        const empRecord = employeeMap.get(String(s.employee_id));
        const name = (s.employee_name || s.employee?.name || empRecord?.name || '').toLowerCase();
        const bike = toEnglishDigits(s.motorcycle_number || '').toLowerCase();
        const keyNum = toEnglishDigits(
          (s as any).key_number || (s.employee as any)?.key_number || empRecord?.key_number || ''
        ).toLowerCase();
        const appId = toEnglishDigits(
          (s as any).application_id || (s.employee as any)?.application_id || empRecord?.application_id || ''
        ).toLowerCase();

        return name.includes(q) || bike.includes(q) || keyNum.includes(q) || appId.includes(q);
      })
      .sort((a, b) => {
        const timeB = new Date(b.end_time || b.start_time || 0).getTime();
        const timeA = new Date(a.end_time || a.start_time || 0).getTime();
        return timeB - timeA;
      });
  }, [sessions, searchQuery, statusFilter, employeeMap]);

  // Summary KPIs for completed shifts
  const summaryStats = useMemo(() => {
    let totalOrders = 0;
    let totalKm = 0;
    let pendingCount = 0;
    let reviewedCount = 0;

    sessions.forEach((s) => {
      if (s.status !== 'COMPLETED' || !s.end_time) return;
      totalOrders += Number(s.orders_count ?? 0);
      const dist =
        s.end_km && s.start_km && Number(s.end_km) >= Number(s.start_km)
          ? Number(s.end_km) - Number(s.start_km)
          : Number((s as any).total_km ?? s.distance ?? 0);
      totalKm += dist;
      if (s.is_reviewed) reviewedCount++;
      else pendingCount++;
    });

    return {
      totalFinished: pendingCount + reviewedCount,
      pendingCount,
      reviewedCount,
      totalOrders,
      totalKm,
    };
  }, [sessions]);

  const openEditModal = (session: WorkSession) => {
    setSelectedSession(session);
    setEditedOrders(String(session.orders_count ?? 0));
    setEditedFuel(String(session.fuel_cost ?? 0));
    setEditedStartKm(String(session.start_km ?? 0));
    setEditedEndKm(String(session.end_km ?? 0));
    setReviewNotes(session.review_notes || '');
  };

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

      const empName =
        selectedSession.employee_name ||
        selectedSession.employee?.name ||
        employeeMap.get(String(selectedSession.employee_id))?.name ||
        'المندوب';

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
      setTimeout(() => {
        showBottomAlert({
          type: 'success',
          title: 'تم الحفظ والاعتماد',
          message: `تم تحديث واعتماد طلبات (${empName}) بنجاح.`,
        });
      }, 150);
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
    ({ item: session }: { item: WorkSession }) => {
      const empRecord = employeeMap.get(String(session.employee_id));
      const empName =
        session.employee_name ||
        session.employee?.name ||
        empRecord?.name ||
        'مندوب';
      const keyNum =
        (session as any).key_number ||
        (session.employee as any)?.key_number ||
        empRecord?.key_number ||
        '';
      const appId =
        (session as any).application_id ||
        (session.employee as any)?.application_id ||
        empRecord?.application_id ||
        '---';
      const startKmVal = Number(session.start_km ?? 0);
      const endKmVal = Number(session.end_km ?? 0);
      const distanceKm =
        endKmVal >= startKmVal && endKmVal > 0
          ? endKmVal - startKmVal
          : Number((session as any).total_km ?? session.distance ?? 0);
      const hoursLabel = calcShiftHours(session.start_time, session.end_time);

      // Exact 9 ordered items:
      // 1. وقت البداية | 2. كيلو البداية | 3. وقت النهاية | 4. كيلو النهاية | 5. عدد الكيلوات | 6. الطلبات | 7. الساعات | 8. بنزين | 9. المعرف
      const orderedMetrics = [
        { label: '1. وقت البداية', value: formatTimeOnly(session.start_time), icon: 'play-circle-outline', color: '#0284c7' },
        { label: '2. كيلو البداية', value: `${startKmVal} كم`, icon: 'speedometer-outline', color: '#0284c7' },
        { label: '3. وقت النهاية', value: formatTimeOnly(session.end_time), icon: 'stop-circle-outline', color: '#6366f1' },
        { label: '4. كيلو النهاية', value: `${endKmVal} كم`, icon: 'flag-outline', color: '#6366f1' },
        { label: '5. عدد الكيلوات', value: `${distanceKm} كم`, icon: 'analytics-outline', color: '#0d9488' },
        { label: '6. الطلبات', value: `${session.orders_count ?? 0} طلب`, icon: 'bag-check-outline', color: '#10b981', highlight: true },
        { label: '7. الساعات', value: hoursLabel, icon: 'time-outline', color: '#8b5cf6' },
        { label: '8. بنزين', value: `${Math.round(Number(session.fuel_cost ?? 0))} ر.س`, icon: 'flame-outline', color: '#f59e0b' },
        { label: '9. المعرف', value: String(appId), icon: 'id-card-outline', color: '#ec4899' },
      ];

      return (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => openEditModal(session)}
          style={[
            styles.sessionCard,
            {
              backgroundColor: colors.card,
              borderColor: session.is_reviewed ? colors.border : '#f59e0b60',
            },
          ]}
        >
          {/* Card Header: Name, Key Badge, Full Date & Time, Review Status */}
          <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.nameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.empName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {empName}
                </Text>
                {!!keyNum && (
                  <View style={[styles.keyBadge, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b50', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="key" size={11} color="#d97706" />
                    <Text style={styles.keyBadgeText}>مفتاح {keyNum}</Text>
                  </View>
                )}
              </View>

              {/* Descending Full Date & Time */}
              <View style={[styles.dateTimeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
                <Text style={[styles.dateTimeText, { color: colors.textSecondary }]}>
                  {formatDateTimeFull(session.end_time || session.start_time)}
                </Text>
                {!!session.motorcycle_number && (
                  <Text style={[styles.dateTimeText, { color: colors.primary, fontWeight: '700' }]}>
                    • {session.motorcycle_number}
                  </Text>
                )}
              </View>
            </View>

            {/* Status Pill */}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: session.is_reviewed ? '#10b98118' : '#f59e0b18',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons
                name={session.is_reviewed ? 'checkmark-circle' : 'time'}
                size={13}
                color={session.is_reviewed ? '#10b981' : '#d97706'}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  { color: session.is_reviewed ? '#10b981' : '#d97706' },
                ]}
              >
                {session.is_reviewed ? 'معتمد' : 'بانتظار الاعتماد'}
              </Text>
            </View>
          </View>

          {/* 9 Ordered Metrics Grid */}
          <View style={[styles.orderedGrid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
            {orderedMetrics.map((m, idx) => (
              <View
                key={idx}
                style={[
                  styles.metricBox,
                  {
                    backgroundColor: m.highlight
                      ? isDarkMode
                        ? 'rgba(16, 185, 129, 0.14)'
                        : '#ecfdf5'
                      : isDarkMode
                      ? '#1e293b'
                      : '#f8fafc',
                    borderColor: m.highlight ? '#10b98150' : colors.border,
                  },
                ]}
              >
                <View style={[styles.metricLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name={m.icon as any} size={12} color={m.color} />
                  <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                    {m.label}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.metricValue,
                    { color: m.highlight ? '#10b981' : colors.textPrimary },
                  ]}
                  numberOfLines={1}
                >
                  {m.value}
                </Text>
              </View>
            ))}
          </View>

          {/* Footer: Odometer Photos + Edit Button */}
          <View style={[styles.cardFooter, { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopColor: colors.border }]}>
            <View style={[styles.photosActionGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {!!session.start_km_image && (
                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() =>
                    onPreviewPhoto({
                      url: formatImageUrl(session.start_km_image) || '',
                      title: `عداد البداية (${startKmVal} كم) - ${empName}`,
                    })
                  }
                >
                  <Image
                    source={{ uri: formatImageUrl(session.start_km_image) || '' }}
                    style={styles.tinyThumb}
                    contentFit="cover"
                  />
                  <Text style={[styles.photoBtnText, { color: colors.textPrimary }]}>صورة البداية</Text>
                </TouchableOpacity>
              )}

              {!!session.end_km_image && (
                <TouchableOpacity
                  style={[styles.photoBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() =>
                    onPreviewPhoto({
                      url: formatImageUrl(session.end_km_image) || '',
                      title: `عداد النهاية (${endKmVal} كم) - ${empName}`,
                    })
                  }
                >
                  <Image
                    source={{ uri: formatImageUrl(session.end_km_image) || '' }}
                    style={styles.tinyThumb}
                    contentFit="cover"
                  />
                  <Text style={[styles.photoBtnText, { color: colors.textPrimary }]}>صورة النهاية</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.editActionBtn, { backgroundColor: colors.primary }]}
              onPress={() => openEditModal(session)}
            >
              <Ionicons name="create-outline" size={15} color="#ffffff" />
              <Text style={styles.editActionBtnText}>
                {session.is_reviewed ? 'تعديل' : 'مراجعة واعتماد'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, isDarkMode, isRTL, employeeMap, onPreviewPhoto]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Controls: Filter Chips + Search Bar */}
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
              <Ionicons name="Clipboard-outline" size={42} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                لا توجد شفتات منتهية مطابقة
              </Text>
            </View>
          }
        />
      )}

      {/* Review & Edit Modal */}
      <Modal
        visible={Boolean(selectedSession)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSession(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                مراجعة وتعديل الشفت المنتهي
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedSession(null)}
                style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedSession && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View
                  style={[
                    styles.modalBanner,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.modalEmpName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {selectedSession.employee_name || selectedSession.employee?.name || 'مندوب'}
                  </Text>
                  <Text style={[styles.modalMetaText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    البداية: {formatDateTimeFull(selectedSession.start_time)}
                  </Text>
                  <Text style={[styles.modalMetaText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    النهاية: {formatDateTimeFull(selectedSession.end_time)}
                  </Text>
                </View>

                <View style={[styles.dualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      كيلو البداية
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          textAlign: 'center',
                        },
                      ]}
                      keyboardType="numeric"
                      value={editedStartKm}
                      onChangeText={(v) => setEditedStartKm(toEnglishDigits(v))}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      كيلو النهاية
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          textAlign: 'center',
                        },
                      ]}
                      keyboardType="numeric"
                      value={editedEndKm}
                      onChangeText={(v) => setEditedEndKm(toEnglishDigits(v))}
                    />
                  </View>
                </View>

                <View style={[styles.dualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      عدد الطلبات
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.primary,
                          color: colors.textPrimary,
                          textAlign: 'center',
                        },
                      ]}
                      keyboardType="numeric"
                      value={editedOrders}
                      onChangeText={(v) => setEditedOrders(toEnglishDigits(v))}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      بنزين (ر.س)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          textAlign: 'center',
                        },
                      ]}
                      keyboardType="numeric"
                      value={editedFuel}
                      onChangeText={(v) => setEditedFuel(toEnglishDigits(v))}
                    />
                  </View>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  ملاحظات المراجعة
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  placeholder="ملاحظات المشرف..."
                  placeholderTextColor={colors.textSecondary}
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                />

                <TouchableOpacity
                  style={[styles.saveReviewBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleSaveReview}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle" size={20} color="#ffffff" />
                      <Text style={styles.saveReviewBtnText}>حفظ واعتماد البيانات</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControls: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  filterRow: {
    gap: 8,
    marginBottom: 10,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterNum: {
    fontSize: 16,
    fontWeight: '800',
  },
  filterLbl: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  searchBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  centerEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sessionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  nameRow: {
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  empName: {
    fontSize: 15,
    fontWeight: '800',
  },
  keyBadge: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 7,
    borderWidth: 1,
  },
  keyBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706',
  },
  dateTimeRow: {
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
  },
  dateTimeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  orderedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  metricBox: {
    width: '31.8%',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 7,
  },
  metricLabelRow: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  cardFooter: {
    paddingTop: 10,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  photosActionGroup: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  photoBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    gap: 5,
  },
  tinyThumb: {
    width: 24,
    height: 24,
    borderRadius: 5,
  },
  photoBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  editActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 3,
  },
  modalEmpName: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalMetaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dualRow: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  saveReviewBtn: {
    height: 48,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 8,
  },
  saveReviewBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
