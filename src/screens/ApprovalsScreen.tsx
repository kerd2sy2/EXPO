import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { ThemeColors } from '@shared/theme';
import { WorkSession } from '@shared/types';
import { formatImageUrl, getStoredToken } from '../services/api';
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
}

export const ApprovalsScreen: React.FC<ApprovalsScreenProps> = ({
  pendingSessions,
  loading,
  onRefresh,
  colors,
  isDarkMode,
  isRTL,
  onPreviewPhoto,
}) => {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
  const [editReviewNotes, setEditReviewNotes] = useState('');
  const [editVideoUri, setEditVideoUri] = useState<string | null>(null);
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
    setEditReviewNotes(session.review_notes || 'معتمد بواسطة المشرف');
    setEditVideoUri(null);
  };

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

  // Record Silent Review Proof Video
  const handleRecordReviewVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('إذن الكاميرا مطلوب', 'يرجى تفعيل صلاحية الكاميرا لتسجيل فيديو توثيق الطلبات.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        cameraType: ImagePicker.CameraType.back,
        quality: 0.3,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Low,
        videoMaxDuration: 45,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setEditVideoUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('خطأ بالكاميرا', err?.message || 'فشل فتح الكاميرا');
    }
  };

  // Unified Save: Final Order Count + Start/End KM + Fuel + Video Upload + Shift Approval
  const handleSaveEditReview = async () => {
    if (!editingSession) return;
    try {
      setSubmittingReview(true);

      let uploadedVideoUrl: string | undefined = undefined;
      if (editVideoUri) {
        const empName = editingSession.employee_name || editingSession.employee?.name || 'مندوب';
        const videoRes = await supervisorApi.uploadOperationVideo({
          videoUri: editVideoUri,
          employeeId: editingSession.employee_id,
          employeeName: empName,
          orderNumber: editOrdersCount,
          sessionId: editingSession.id,
          notes: `توثيق مراجعة وردية - عدد الطلبات المعتمد: ${editOrdersCount}`,
        });
        uploadedVideoUrl = videoRes.video_url;
      }

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
        reviewNotes: editReviewNotes.trim(),
        reviewVideoUrl: uploadedVideoUrl,
      });

      Alert.alert(
        'تم الاعتماد بنجاح',
        editVideoUri
          ? 'تم تعديل واعتماد الوردية بنجاح ورفع فيديو التوثيق على السيرفر.'
          : 'تم تعديل واعتماد الوردية وتحديث كافة السجلات بنجاح.'
      );
      setEditingSession(null);
      setEditVideoUri(null);
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {filteredSessions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name={searchQuery ? 'search-outline' : 'checkmark-circle-outline'}
              size={54}
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
              <View
                key={session.id}
                style={[
                  styles.compactCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {/* ── 1. HEADER: اسم الموظف + تحته رقم الدباب بدون لوحة ── */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.employeeName, { color: colors.textPrimary }]}>
                      {delegateName}
                    </Text>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Text style={[styles.bikeText, { color: colors.primary }]}>
                        رقم الدباب: {bikeNumber || '—'}
                      </Text>
                      {delegateCode ? (
                        <Text style={[styles.codeText, { color: colors.textSecondary }]}>
                          • كود: {delegateCode}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                    <View style={[styles.statusBadge, { backgroundColor: '#10b98115', borderColor: '#10b98135' }]}>
                      <View style={styles.greenDot} />
                      <Text style={styles.statusBadgeText}>أنهى الشفت</Text>
                    </View>
                    <Text style={[styles.dateText, { color: colors.textSecondary, marginTop: 4 }]}>
                      {session.start_time ? new Date(session.start_time).toLocaleDateString('ar-SA') : 'اليوم'}
                    </Text>
                  </View>
                </View>

                {/* ── 2. STATS BAR: الطلبات | المسافة | الوقود ── */}
                <View style={[styles.compactStatsBar, { backgroundColor: colors.bg, borderColor: colors.border }]}>
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
                </View>

                {/* ── 3. ODOMETER PHOTOS: صورتين العداد جنب بعض زى المناديب ── */}
                <View style={styles.odometerPhotosRow}>
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
                <View style={styles.actionRowContainer}>
                  <TouchableOpacity
                    style={[styles.mainApproveBtn, { backgroundColor: '#10b981' }]}
                    onPress={() => handleApproveShift(session)}
                    disabled={isLoading}
                    activeOpacity={0.85}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── EDIT & REVIEW MODAL (نافذة تعديل العداد والطلبات) ── */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        visible={!!editingSession}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingSession(null)}
      >
        {editingSession ? (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              {/* Modal Header */}
              <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    مراجعة وتعديل بيانات الوردية
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    {editingSession.employee_name || editingSession.employee?.name || 'مندوب'}
                    {editingSession.motorcycle_number ? ` • دباب: ${editingSession.motorcycle_number}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setEditingSession(null)}
                  style={[styles.modalCloseBtn, { backgroundColor: colors.bg }]}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* ── SECTION 1: صــور الــعــداديــن ── */}
                <View style={styles.modalSection}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 8 }]}>
                    صور العدادين المسجلة (اضغط للتكبير):
                  </Text>

                  <View style={styles.odometerPhotosRow}>
                    {/* Start KM Photo Card */}
                    <TouchableOpacity
                      style={[
                        styles.manadeebPhotoBox,
                        { height: 115, backgroundColor: colors.bg, borderColor: colors.border },
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
                          <Ionicons name="speedometer-outline" size={28} color={colors.textSecondary} />
                          <Text style={[styles.emptyPhotoPlaceholderText, { color: colors.textSecondary }]}>لا توجد صورة</Text>
                        </View>
                      )}
                      <View style={styles.manadeebPhotoOverlay}>
                        <Text style={styles.manadeebPhotoTag}>
                          البداية: {editingSession.start_km ?? 0} كم
                        </Text>
                        {editingSession.start_km_image ? <Ionicons name="expand" size={13} color="#ffffff" /> : null}
                      </View>
                    </TouchableOpacity>

                    {/* End KM Photo Card */}
                    <TouchableOpacity
                      style={[
                        styles.manadeebPhotoBox,
                        { height: 115, backgroundColor: colors.bg, borderColor: colors.border },
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
                          <Ionicons name="flag-outline" size={28} color={colors.textSecondary} />
                          <Text style={[styles.emptyPhotoPlaceholderText, { color: colors.textSecondary }]}>لا توجد صورة</Text>
                        </View>
                      )}
                      <View style={styles.manadeebPhotoOverlay}>
                        <Text style={styles.manadeebPhotoTag}>
                          النهاية: {editingSession.end_km ?? 0} كم
                        </Text>
                        {editingSession.end_km_image ? <Ionicons name="expand" size={13} color="#ffffff" /> : null}
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* ── SECTION 2: تـعـديـل الـعـدادات والـمـسـافـة ── */}
                <View style={styles.modalSection}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 8 }]}>
                    تعديل قراءة العدادين والمسافة:
                  </Text>

                  <View style={styles.twoInputsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
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
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                        عداد النهاية (كم)
                      </Text>
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

                  {/* Calculated Live Distance */}
                  <View style={[styles.calculatedDistanceBanner, { backgroundColor: '#10b98115', borderColor: '#10b98140' }]}>
                    <Ionicons name="calculator-outline" size={17} color="#059669" />
                    <Text style={[styles.calculatedDistanceText, { color: colors.textPrimary }]}>
                      المسافة المحسوبة:{' '}
                      <Text style={{ fontWeight: '900', fontSize: 15, color: '#059669' }}>
                        {liveCalculatedDistance.toFixed(1)} كم
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* ── SECTION 3: تـعـديـل الـطـلـبـات والـوقـود ── */}
                <View style={styles.modalSection}>
                  <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginBottom: 8 }]}>
                    تعديل الطلبات والوقود:
                  </Text>

                  <View style={styles.twoInputsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                        الطلبات المعتمدة
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
                      <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
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

                {/* ── SECTION 4: فـيـديـو الـتـوثـيـق (اخـتـيـاري) ── */}
                <View style={styles.modalSection}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    فيديو توثيق الطلبات (اختياري)
                  </Text>
                  {!editVideoUri ? (
                    <TouchableOpacity
                      style={[styles.recordVideoBtn, { backgroundColor: '#3b82f6' }]}
                      onPress={handleRecordReviewVideo}
                    >
                      <Ionicons name="videocam" size={17} color="#fff" />
                      <Text style={styles.recordVideoBtnText}>فتح الكاميرا لتسجيل فيديو التوثيق</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.videoRecordedCard, { borderColor: '#10b981', backgroundColor: '#10b98115' }]}>
                      <Ionicons name="checkmark-circle" size={22} color="#10b981" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.videoRecordedTitle, { color: colors.textPrimary }]}>
                          تم تسجيل فيديو التوثيق
                        </Text>
                        <Text style={[styles.videoRecordedSub, { color: colors.textSecondary }]}>
                          سيتم حفظه على السيرفر لمدة 60 يوماً
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setEditVideoUri(null)} style={styles.reRecordSmallBtn}>
                        <Ionicons name="refresh" size={14} color="#ef4444" />
                        <Text style={{ color: '#ef4444', fontSize: 11, fontWeight: '700' }}>إعادة</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* ── SECTION 5: مـلاحـظـات الاعـتـمـاد ── */}
                <View style={styles.modalSection}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    ملاحظات المشرف
                  </Text>
                  <TextInput
                    style={[styles.modernTextArea, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                    multiline
                    numberOfLines={2}
                    value={editReviewNotes}
                    onChangeText={setEditReviewNotes}
                    placeholder="ملاحظات الاعتماد والتدقيق..."
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </ScrollView>

              {/* ── MODAL FOOTER ACTION BUTTONS ── */}
              <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.confirmApprovalBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleSaveEditReview}
                  disabled={submittingReview}
                >
                  {submittingReview ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.confirmApprovalBtnText}>
                        اعتماد وحفظ الوردية
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setEditingSession(null)}
                  disabled={submittingReview}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
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
  calculatedDistanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  calculatedDistanceText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recordVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  recordVideoBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  videoRecordedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 9,
    borderWidth: 1.5,
  },
  videoRecordedTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  videoRecordedSub: {
    fontSize: 10,
  },
  reRecordSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#ef444415',
  },
  modernTextArea: {
    borderWidth: 1,
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    height: 56,
    textAlignVertical: 'top',
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
