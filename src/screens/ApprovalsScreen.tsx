import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { ThemeColors } from '@shared/theme';
import { WorkSession } from '@shared/types';
import { formatImageUrl, getStoredToken, apiRequest } from '../services/api';
import {
  supervisorApi,
  PendingAdvanceRequest,
  PendingMaintenanceRequest,
} from '../services/supervisor';

interface ApprovalsScreenProps {
  pendingSessions: WorkSession[];
  pendingAdvances: PendingAdvanceRequest[];
  pendingMaintenance: PendingMaintenanceRequest[];
  loading: boolean;
  onRefresh: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onPreviewPhoto?: (photo: { url: string; title: string }) => void;
  targetSessionId?: string | null;
  targetEmployeeId?: string | null;
  onClearTargetSession?: () => void;
}

export const ApprovalsScreen: React.FC<ApprovalsScreenProps> = ({
  pendingSessions,
  loading,
  onRefresh,
  colors,
  isDarkMode,
  isRTL,
  onPreviewPhoto,
  targetSessionId,
  targetEmployeeId,
  onClearTargetSession,
}) => {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper: format time cleanly (e.g. 08:30 ص or 04:15 م)
  const formatTimeStr = (isoString?: string): string => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '—';
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const isPM = hours >= 12;
      hours = hours % 12 || 12;
      const padMin = minutes < 10 ? `0${minutes}` : `${minutes}`;
      const period = isPM ? 'م' : 'ص';
      return `${hours}:${padMin} ${period}`;
    } catch {
      return '—';
    }
  };

  // Helper: calculate total hours and minutes worked in the shift
  const calculateShiftDuration = (startTime?: string, endTime?: string | null): string => {
    if (!startTime || !endTime) return '—';
    try {
      const start = new Date(startTime).getTime();
      const end = new Date(endTime).getTime();
      if (isNaN(start) || isNaN(end) || end <= start) return '—';

      const diffMs = end - start;
      const totalMinutes = Math.round(diffMs / (1000 * 60));
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      if (hours === 0) {
        return `${minutes} د`;
      }
      if (minutes === 0) {
        return `${hours} س`;
      }
      return `${hours} س و ${minutes} د`;
    } catch {
      return '—';
    }
  };

  // Filter pending sessions: ONLY finished shifts that are not yet reviewed
  const filteredSessions = useMemo(() => {
    const finishedOnly = pendingSessions.filter(
      (s) => !s.is_reviewed && s.status === 'COMPLETED' && !!s.end_time
    );
    if (!searchQuery.trim()) return finishedOnly;
    const q = searchQuery.toLowerCase().trim();
    return finishedOnly.filter((s) => {
      const name = (s.employee_name || s.employee?.name || '').toLowerCase();
      const code = (s.employee?.employee_number || s.employee?.key_number || '').toLowerCase();
      const bike = (s.motorcycle_number || s.employee?.motorcycle_number || '').toLowerCase();
      const natId = (s.employee?.national_id || '').toLowerCase();
      return name.includes(q) || code.includes(q) || bike.includes(q) || natId.includes(q);
    });
  }, [pendingSessions, searchQuery]);

  // Edit & Review Shift Modal State
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [editOrdersCount, setEditOrdersCount] = useState('');
  const [editFuelCost, setEditFuelCost] = useState('');
  const [editStartKm, setEditStartKm] = useState('');
  const [editEndKm, setEditEndKm] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Live distance calculation in modal
  const liveCalculatedDistance = useMemo(() => {
    const s = parseFloat(editStartKm);
    const e = parseFloat(editEndKm);
    if (isNaN(s) || isNaN(e)) return 0;
    return Math.max(0, e - s);
  }, [editStartKm, editEndKm]);

  // Quick Approve Shift (without edits)
  const handleApproveShift = async (session: WorkSession) => {
    try {
      setActionLoadingId(session.id);
      await supervisorApi.reviewSession({
        sessionId: session.id,
        isReviewed: true,
        reviewNotes: 'معتمد بواسطة المشرف',
        ordersCount: session.orders_count,
        fuelCost: session.fuel_cost,
        startKm: session.start_km,
        endKm: session.end_km,
      });
      Alert.alert('تم بنجاح', `تم اعتماد وردية المندوب (${session.employee_name || session.employee?.name || 'المندوب'}) بنجاح.`);
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل اعتماد الوردية');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Edit Review Modal
  const openEditModal = (session: WorkSession) => {
    setEditingSession(session);
    setEditOrdersCount(String(session.orders_count || 0));
    setEditFuelCost(String(session.fuel_cost || 0));
    setEditStartKm(session.start_km != null ? String(session.start_km) : '');
    setEditEndKm(session.end_km != null ? String(session.end_km) : '');
  };

  // Automatically open review modal when navigating from push notification
  useEffect(() => {
    if (!targetSessionId && !targetEmployeeId) return;

    // 1. Search in current pendingSessions
    const found = pendingSessions.find(
      (s) =>
        (targetSessionId && s.id === targetSessionId) ||
        (targetEmployeeId && (s.employee_id === targetEmployeeId || s.employee?.id === targetEmployeeId))
    );

    if (found) {
      openEditModal(found);
      onClearTargetSession?.();
      return;
    }

    // 2. If not yet in pendingSessions (e.g. fresh notification), fetch directly by ID
    if (targetSessionId) {
      let isCancelled = false;
      apiRequest<any>(`/work/sessions/${targetSessionId}`)
        .then((res) => {
          if (isCancelled || !res) return;
          const sessionData = res?.data || res;
          if (sessionData && sessionData.id) {
            openEditModal(sessionData);
            onClearTargetSession?.();
          }
        })
        .catch(() => {});
      return () => {
        isCancelled = true;
      };
    }
  }, [targetSessionId, targetEmployeeId, pendingSessions]);

  // Play Video inside app with authenticated token
  const handlePlayVideo = async (videoUrl: string) => {
    try {
      let fullUrl = formatImageUrl(videoUrl);
      if (!fullUrl) {
        Alert.alert('خطأ', 'رابط الفيديو غير صالح');
        return;
      }
      const token = await getStoredToken();
      if (token) {
        const sep = fullUrl.includes('?') ? '&' : '?';
        fullUrl = `${fullUrl}${sep}token=${encodeURIComponent(token)}`;
      }
      await WebBrowser.openBrowserAsync(fullUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
        controlsColor: colors.primary,
        toolbarColor: isDarkMode ? '#0f172a' : '#ffffff',
        showTitle: true,
        enableBarCollapsing: true,
      });
    } catch {
      Alert.alert('خطأ', 'تعذر فتح مشغل الفيديو داخل التطبيق');
    }
  };

  // Save Edited Values & Approve Shift
  const handleSaveEditReview = async () => {
    if (!editingSession) return;
    try {
      setSubmittingReview(true);

      const parsedStartKm = editStartKm !== '' ? parseFloat(editStartKm) : undefined;
      const parsedEndKm = editEndKm !== '' ? parseFloat(editEndKm) : undefined;
      const parsedOrders = parseInt(editOrdersCount, 10) || 0;
      const parsedFuel = parseFloat(editFuelCost) || 0;

      await supervisorApi.reviewSession({
        sessionId: editingSession.id,
        isReviewed: true,
        ordersCount: parsedOrders,
        fuelCost: parsedFuel,
        startKm: parsedStartKm,
        endKm: parsedEndKm,
        reviewNotes: 'معتمد بواسطة المشرف',
      });

      Alert.alert('تم الاعتماد بنجاح', 'تم تعديل واعتماد بيانات الوردية بنجاح.');
      setEditingSession(null);
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل حفظ التعديلات والاعتماد');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ── SEARCH BAR ── */}
      <View style={[styles.topSearchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
          placeholder="ابحث باسم المندوب أو رقم الدباب..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── LIST OF COMPLETED SESSIONS ── */}
      <ScrollView
        contentContainerStyle={[
          styles.listContent,
          filteredSessions.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {loading && filteredSessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary, marginTop: 8 }]}>
              جارٍ تحميل الورديات...
            </Text>
          </View>
        ) : filteredSessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name={searchQuery ? 'search-outline' : 'checkmark-circle-outline'}
              size={56}
              color={searchQuery ? colors.textSecondary : '#10B981'}
            />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {searchQuery ? `لا توجد نتائج لـ "${searchQuery}"` : 'لا توجد ورديات معلقة'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery ? 'تأكد من كتابة الاسم أو رقم الدباب بشكل صحيح' : 'جميع ورديات المناديب في فرعك معتمدة بالكامل'}
            </Text>
          </View>
        ) : (
          filteredSessions.map((session) => {
            const isLoading = actionLoadingId === session.id;
            const distance =
              session.end_km != null && session.start_km != null
                ? Math.max(0, session.end_km - session.start_km)
                : 0;
            const bikeNumber = session.motorcycle_number || session.employee?.motorcycle_number || '';
            const delegateName = session.employee_name || session.employee?.name || 'مندوب';
            const delegateCode = session.employee?.employee_number || session.employee?.key_number || '';
            const startImgUrl = formatImageUrl(session.start_km_image);
            const endImgUrl = formatImageUrl(session.end_km_image);

            return (
              <TouchableOpacity
                key={session.id}
                style={[
                  styles.compactCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                activeOpacity={0.92}
                onPress={() => openEditModal(session)}
              >
                {/* ── 1. HEADER: اسم الموظف على اليمين + شارة أنهى الشفت والتاريخ على الشمال ── */}
                <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* Right side in RTL: Employee Name + Motorcycle number */}
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.employeeName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {delegateName}
                    </Text>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={[styles.bikeText, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                        رقم الدباب: {bikeNumber || '—'}
                      </Text>
                      {delegateCode ? (
                        <Text style={[styles.codeText, { color: colors.textSecondary }]}>
                          • كود: {delegateCode}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Left side in RTL: Status Badge + Date */}
                  <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    <View style={[styles.statusBadge, { backgroundColor: '#10b98115', borderColor: '#10b98135', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={styles.greenDot} />
                      <Text style={styles.statusBadgeText}>أنهى الشفت</Text>
                    </View>
                    <Text style={[styles.dateText, { color: colors.textSecondary, marginTop: 4, textAlign: isRTL ? 'left' : 'right' }]}>
                      {session.start_time ? new Date(session.start_time).toLocaleDateString('ar-SA') : 'اليوم'}
                    </Text>
                  </View>
                </View>

                {/* ── 2. STATS BAR: الطلبات | المسافة | الوقود | ساعات العمل ── */}
                <View style={[styles.compactStatsBar, { backgroundColor: colors.bg, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statItemVal, { color: '#2563eb' }]}>{session.orders_count || 0}</Text>
                    <Text style={[styles.statItemLbl, { color: colors.textSecondary }]}>الطلبات</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statItemVal, { color: '#059669' }]}>{distance.toFixed(1)} كم</Text>
                    <Text style={[styles.statItemLbl, { color: colors.textSecondary }]}>المسافة</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statItemVal, { color: '#d97706' }]}>{session.fuel_cost || 0} ر.س</Text>
                    <Text style={[styles.statItemLbl, { color: colors.textSecondary }]}>الوقود</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statItemVal, { color: '#7c3aed' }]}>
                      {calculateShiftDuration(session.start_time, session.end_time)}
                    </Text>
                    <Text style={[styles.statItemLbl, { color: colors.textSecondary }]}>ساعات العمل</Text>
                  </View>
                </View>

                {/* ── 3. ODOMETER TIME HEADERS: ساعة البداية فوق عداد البداية | ساعة النهاية فوق عداد النهاية ── */}
                <View style={[styles.odometerTimesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* فوق عداد البداية */}
                  <View style={[styles.odometerTimeBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={[styles.odometerTimeLabel, { color: colors.textSecondary }]}>ساعة البداية</Text>
                      <Ionicons name="time-outline" size={13} color="#2563eb" />
                    </View>
                    <Text style={[styles.odometerTimeValue, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {formatTimeStr(session.start_time)}
                    </Text>
                  </View>

                  {/* فوق عداد النهاية */}
                  <View style={[styles.odometerTimeBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={[styles.odometerTimeLabel, { color: colors.textSecondary }]}>ساعة النهاية</Text>
                      <Ionicons name="flag-outline" size={13} color="#059669" />
                    </View>
                    <Text style={[styles.odometerTimeValue, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {formatTimeStr(session.end_time)}
                    </Text>
                  </View>
                </View>

                {/* ── 4. ODOMETER PHOTOS: صورتين العداد جنب بعض زى المناديب (البداية يمين والنهاية شمال) ── */}
                <View style={[styles.odometerPhotosRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* Start KM Photo */}
                  <TouchableOpacity
                    style={[
                      styles.manadeebPhotoBox,
                      { backgroundColor: colors.bg, borderColor: colors.border },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (startImgUrl) {
                        onPreviewPhoto?.({
                          url: startImgUrl,
                          title: `عداد البداية (${session.start_km ?? 0} كم)`,
                        });
                      } else {
                        openEditModal(session);
                      }
                    }}
                  >
                    {startImgUrl ? (
                      <Image source={{ uri: startImgUrl }} style={styles.manadeebPhotoImg} resizeMode="cover" />
                    ) : (
                      <View style={styles.emptyPhotoPlaceholder}>
                        <Ionicons name="speedometer-outline" size={24} color={colors.textSecondary} />
                        <Text style={[styles.emptyPhotoPlaceholderText, { color: colors.textSecondary }]}>لا توجد صورة</Text>
                      </View>
                    )}
                    <View style={styles.manadeebPhotoOverlay}>
                      <Text style={styles.manadeebPhotoTag}>
                        البداية: {session.start_km ?? 0} كم
                      </Text>
                      {startImgUrl ? <Ionicons name="expand" size={13} color="#ffffff" /> : null}
                    </View>
                  </TouchableOpacity>

                  {/* End KM Photo */}
                  <TouchableOpacity
                    style={[
                      styles.manadeebPhotoBox,
                      { backgroundColor: colors.bg, borderColor: colors.border },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (endImgUrl) {
                        onPreviewPhoto?.({
                          url: endImgUrl,
                          title: `عداد النهاية (${session.end_km ?? 0} كم)`,
                        });
                      } else {
                        openEditModal(session);
                      }
                    }}
                  >
                    {endImgUrl ? (
                      <Image source={{ uri: endImgUrl }} style={styles.manadeebPhotoImg} resizeMode="cover" />
                    ) : (
                      <View style={styles.emptyPhotoPlaceholder}>
                        <Ionicons name="flag-outline" size={24} color={colors.textSecondary} />
                        <Text style={[styles.emptyPhotoPlaceholderText, { color: colors.textSecondary }]}>لا توجد صورة</Text>
                      </View>
                    )}
                    <View style={styles.manadeebPhotoOverlay}>
                      <Text style={styles.manadeebPhotoTag}>
                        النهاية: {session.end_km ?? 0} كم
                      </Text>
                      {endImgUrl ? <Ionicons name="expand" size={13} color="#ffffff" /> : null}
                    </View>
                  </TouchableOpacity>
                </View>

                {/* ── 4. BUTTONS: زرار الاعتماد تحت الصور وزر التعديل ── */}
                <View style={[styles.actionRowContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[styles.mainApproveBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => handleApproveShift(session)}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="checkmark-done" size={18} color="#fff" />
                        <Text style={styles.mainApproveBtnText}>اعتماد الوردية</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.editShiftBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                    onPress={() => openEditModal(session)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="create-outline" size={17} color={colors.primary} />
                    <Text style={[styles.editShiftBtnText, { color: colors.primary }]}>تعديل البيانات</Text>
                  </TouchableOpacity>

                  {session.review_video_url ? (
                    <TouchableOpacity
                      style={[styles.videoBtn, { borderColor: '#10b981', backgroundColor: '#10b98115' }]}
                      onPress={() => handlePlayVideo(session.review_video_url!)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="play-circle" size={18} color="#10b981" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── EDIT & APPROVE MODAL (مراجعة وتعديل الوردية) ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!editingSession}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingSession(null)}
      >
        {editingSession ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalOverlay}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={StyleSheet.absoluteFill} />
            </TouchableWithoutFeedback>

            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {editingSession.employee_name || editingSession.employee?.name || 'المندوب'}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                    رقم الدباب: {editingSession.motorcycle_number || editingSession.employee?.motorcycle_number || '—'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditingSession(null)}
                  style={[styles.modalCloseBtn, { backgroundColor: colors.bg }]}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {/* 1. أوقات الوردية وإجمالي الساعات فوق صورتي العداد */}
                <View style={[styles.odometerTimesRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginBottom: 8 }]}>
                  {/* فوق عداد البداية */}
                  <View style={[styles.odometerTimeBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={[styles.odometerTimeLabel, { color: colors.textSecondary }]}>ساعة البداية</Text>
                      <Ionicons name="time-outline" size={13} color="#2563eb" />
                    </View>
                    <Text style={[styles.odometerTimeValue, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {formatTimeStr(editingSession.start_time)}
                    </Text>
                  </View>

                  {/* فوق عداد النهاية */}
                  <View style={[styles.odometerTimeBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={[styles.odometerTimeLabel, { color: colors.textSecondary }]}>ساعة النهاية</Text>
                      <Ionicons name="flag-outline" size={13} color="#059669" />
                    </View>
                    <Text style={[styles.odometerTimeValue, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {formatTimeStr(editingSession.end_time)}
                    </Text>
                  </View>
                </View>

                {/* 2. صورتين العداد جنب بعض */}
                <View style={[styles.odometerPhotosRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginBottom: 14 }]}>
                  {/* عداد البداية */}
                  <TouchableOpacity
                    style={[
                      styles.manadeebPhotoBox,
                      { height: 110, backgroundColor: colors.bg, borderColor: colors.border },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (editingSession.start_km_image) {
                        onPreviewPhoto?.({
                          url: formatImageUrl(editingSession.start_km_image)!,
                          title: `صورة عداد البداية (${editingSession.start_km ?? 0} كم)`,
                        });
                      }
                    }}
                  >
                    {editingSession.start_km_image ? (
                      <Image
                        source={{ uri: formatImageUrl(editingSession.start_km_image) || '' }}
                        style={styles.manadeebPhotoImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.emptyPhotoPlaceholder}>
                        <Ionicons name="speedometer-outline" size={24} color={colors.textSecondary} />
                        <Text style={[styles.emptyPhotoPlaceholderText, { color: colors.textSecondary }]}>لا توجد صورة</Text>
                      </View>
                    )}
                    <View style={[styles.manadeebPhotoOverlay, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.manadeebPhotoTag}>
                        البداية: {editingSession.start_km ?? 0} كم
                      </Text>
                      {editingSession.start_km_image ? <Ionicons name="expand" size={13} color="#ffffff" /> : null}
                    </View>
                  </TouchableOpacity>

                  {/* عداد النهاية */}
                  <TouchableOpacity
                    style={[
                      styles.manadeebPhotoBox,
                      { height: 110, backgroundColor: colors.bg, borderColor: colors.border },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => {
                      if (editingSession.end_km_image) {
                        onPreviewPhoto?.({
                          url: formatImageUrl(editingSession.end_km_image)!,
                          title: `صورة عداد النهاية (${editingSession.end_km ?? 0} كم)`,
                        });
                      }
                    }}
                  >
                    {editingSession.end_km_image ? (
                      <Image
                        source={{ uri: formatImageUrl(editingSession.end_km_image) || '' }}
                        style={styles.manadeebPhotoImg}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.emptyPhotoPlaceholder}>
                        <Ionicons name="flag-outline" size={24} color={colors.textSecondary} />
                        <Text style={[styles.emptyPhotoPlaceholderText, { color: colors.textSecondary }]}>لا توجد صورة</Text>
                      </View>
                    )}
                    <View style={[styles.manadeebPhotoOverlay, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={styles.manadeebPhotoTag}>
                        النهاية: {editingSession.end_km ?? 0} كم
                      </Text>
                      {editingSession.end_km_image ? <Ionicons name="expand" size={13} color="#ffffff" /> : null}
                    </View>
                  </TouchableOpacity>
                </View>

                {/* 2. الحقول الأربعة: العدادات والطلبات والبنزين */}
                <View style={{ gap: 10, marginBottom: 16 }}>
                  {/* صف العدادات */}
                  <View style={[styles.twoInputsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        عداد البداية (كم)
                      </Text>
                      <TextInput
                        style={[styles.modernInput, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                        keyboardType="numeric"
                        value={editStartKm}
                        onChangeText={setEditStartKm}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
                          عداد النهاية (كم)
                        </Text>
                        {liveCalculatedDistance > 0 ? (
                          <Text style={{ fontSize: 11, fontWeight: '800', color: '#059669' }}>
                            ({liveCalculatedDistance.toFixed(1)} كم)
                          </Text>
                        ) : null}
                      </View>
                      <TextInput
                        style={[styles.modernInput, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                        keyboardType="numeric"
                        value={editEndKm}
                        onChangeText={setEditEndKm}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  {/* صف الطلبات والبنزين */}
                  <View style={[styles.twoInputsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        عدد الطلبات
                      </Text>
                      <TextInput
                        style={[styles.modernInput, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                        keyboardType="numeric"
                        value={editOrdersCount}
                        onChangeText={setEditOrdersCount}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        تكلفة الوقود (ريال)
                      </Text>
                      <TextInput
                        style={[styles.modernInput, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                        keyboardType="numeric"
                        value={editFuelCost}
                        onChangeText={setEditFuelCost}
                        placeholder="0"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>
                </View>

                {/* 3. زر اعتماد وحفظ الوردية */}
                <View style={[styles.modalActions, { borderTopColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[styles.confirmApprovalBtn, { backgroundColor: '#10b981', flex: 1 }]}
                    onPress={handleSaveEditReview}
                    disabled={submittingReview}
                    activeOpacity={0.85}
                  >
                    {submittingReview ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="checkmark-done" size={18} color="#fff" />
                        <Text style={styles.confirmApprovalBtnText}>
                          اعتماد وحفظ الوردية
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border, paddingHorizontal: 16 }]}
                    onPress={() => setEditingSession(null)}
                    disabled={submittingReview}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        ) : null}
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 30,
  },

  /* ── Compact & Clean Card Styles ── */
  compactCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
  },
  bikeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  codeText: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '800',
  },
  dateText: {
    fontSize: 11,
  },

  /* ── Compact Stats Bar ── */
  compactStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  statItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  statItemVal: {
    fontSize: 14,
    fontWeight: '900',
  },
  statItemLbl: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 22,
  },

  /* ── Odometer Times & Duration Row ── */
  odometerTimesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    alignItems: 'center',
  },
  odometerTimeBox: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  odometerTimeLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  odometerTimeValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  durationPillBox: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 76,
  },
  durationPillVal: {
    fontSize: 11,
    fontWeight: '900',
  },
  durationPillLbl: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },

  /* ── Odometer Photos Row (Same as Manadeeb) ── */
  odometerPhotosRow: {
    flexDirection: 'row',
    gap: 10,
  },
  manadeebPhotoBox: {
    flex: 1,
    height: 105,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  manadeebPhotoImg: {
    width: '100%',
    height: '100%',
  },
  manadeebPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manadeebPhotoTag: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyPhotoPlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
  },

  /* ── Action Buttons Under Photos ── */
  actionRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  mainApproveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  mainApproveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  editShiftBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 9.5,
    borderRadius: 10,
    borderWidth: 1,
  },
  editShiftBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  videoBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Modal Styles ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSection: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
  },

  /* Inputs */
  twoInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  modernInput: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  modalActions: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  confirmApprovalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  confirmApprovalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
