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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { ThemeColors } from '@shared/theme';
import { WorkSession } from '@shared/types';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents } from '@shared/utils/plateUtils';
import { formatImageUrl, getStoredToken } from '../services/api';
import {
  supervisorApi,
  PendingAdvanceRequest,
  PendingMaintenanceRequest,
} from '../services/supervisor';

const { width } = Dimensions.get('window');

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
      Alert.alert('تم بنجاح', 'تم اعتماد الوردية بنجاح وتحديث السجلات');
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
          : 'تم تعديل واعتماد الوردية بنجاح وتحديث كافة السجلات.'
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
      {/* ── TOP SEARCH BAR ── */}
      <View style={[styles.topSearchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
          placeholder="ابحث باسم المندوب، الكود، أو رقم الدباب..."
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

      {/* ── Counter Header ── */}
      <View style={[styles.summaryBadgeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <View style={[styles.summaryIconBox, { backgroundColor: '#3b82f615' }]}>
            <Ionicons name="checkmark-done-circle" size={22} color="#2563eb" />
          </View>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
              ورديات مكتملة بانتظار الاعتماد
            </Text>
            <Text style={[styles.summarySub, { color: colors.textSecondary }]}>
              {filteredSessions.length > 0
                ? `${filteredSessions.length} مناديب أنهوا الشفت بانتظار المراجعة والاعتماد`
                : 'جميع ورديات المناديب معتمدة بالكامل'}
            </Text>
          </View>
        </View>
        {filteredSessions.length > 0 && (
          <View style={[styles.pendingCountPill, { backgroundColor: '#f59e0b15', borderColor: '#f59e0b' }]}>
            <Text style={[styles.pendingCountText, { color: '#d97706' }]}>{filteredSessions.length} منتهي</Text>
          </View>
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
              name={searchQuery ? 'search-outline' : 'shield-checkmark'}
              size={56}
              color={searchQuery ? colors.textSecondary : '#10B981'}
            />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {searchQuery ? `لا توجد نتائج مطابقة لـ "${searchQuery}"` : 'لا توجد ورديات معلقة'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery ? 'تأكد من كتابة الاسم أو رقم الدباب بشكل صحيح' : 'جميع ورديات المناديب في فرعك تمت مراجعتها واعتمادها'}
            </Text>
          </View>
        ) : (
          filteredSessions.map((session) => {
            const isLoading = actionLoadingId === session.id;
            const distance =
              session.end_km != null && session.start_km != null
                ? Math.max(0, session.end_km - session.start_km)
                : 0;
            const plateStr = session.motorcycle_number || session.employee?.motorcycle_number || '';
            const parsedPlate = plateStr ? parsePlateComponents(plateStr) : null;
            const delegateName = session.employee_name || session.employee?.name || 'مندوب';
            const delegateCode = session.employee?.employee_number || session.employee?.key_number || '';
            const appName = session.application_type || session.application_id || '';

            return (
              <TouchableOpacity
                key={session.id}
                activeOpacity={0.88}
                onPress={() => openEditModal(session)}
                style={[
                  styles.modernCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {/* ── CARD HEADER ── */}
                <View style={styles.cardHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '18' }]}>
                      <Ionicons name="person" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.delegateName, { color: colors.textPrimary }]}>
                          {delegateName}
                        </Text>
                        {delegateCode ? (
                          <View style={[styles.codeBadge, { backgroundColor: colors.border + '60' }]}>
                            <Text style={[styles.codeBadgeText, { color: colors.textSecondary }]}>
                              كود: {delegateCode}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                          {session.start_time ? new Date(session.start_time).toLocaleDateString('ar-SA') : 'اليوم'}
                        </Text>
                        {appName ? (
                          <View style={[styles.appBadge, { backgroundColor: '#3b82f615' }]}>
                            <Text style={styles.appBadgeText}>{appName}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <View style={[styles.statusTagPill, { backgroundColor: '#10b98115', borderColor: '#10b98140' }]}>
                      <Ionicons name="flag" size={12} color="#10b981" />
                      <Text style={[styles.statusTagText, { color: '#059669' }]}>أنهى الشفت</Text>
                    </View>
                    {parsedPlate && (
                      <SaudiPlateView
                        digits={parsedPlate.digits}
                        letters={parsedPlate.letters}
                        editable={false}
                        scale={0.52}
                        isDarkMode={isDarkMode}
                      />
                    )}
                  </View>
                </View>

                {/* ── 4 KPI TILES ── */}
                <View style={styles.kpiGrid}>
                  <View style={[styles.kpiTile, { backgroundColor: '#3b82f60e', borderColor: '#3b82f625' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="cube-outline" size={14} color="#2563eb" />
                      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>الطلبات</Text>
                    </View>
                    <Text style={[styles.kpiValue, { color: '#2563eb' }]}>
                      {session.orders_count || 0}
                    </Text>
                  </View>

                  <View style={[styles.kpiTile, { backgroundColor: '#10b9810e', borderColor: '#10b98125' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="speedometer-outline" size={14} color="#059669" />
                      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>المسافة</Text>
                    </View>
                    <Text style={[styles.kpiValue, { color: '#059669' }]}>
                      {distance.toFixed(1)} <Text style={{ fontSize: 11, fontWeight: 'normal' }}>كم</Text>
                    </Text>
                  </View>

                  <View style={[styles.kpiTile, { backgroundColor: '#f59e0b0e', borderColor: '#f59e0b25' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="flame-outline" size={14} color="#d97706" />
                      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>الوقود</Text>
                    </View>
                    <Text style={[styles.kpiValue, { color: '#d97706' }]}>
                      {session.fuel_cost || 0} <Text style={{ fontSize: 11, fontWeight: 'normal' }}>ر.س</Text>
                    </Text>
                  </View>

                  <View style={[styles.kpiTile, { backgroundColor: '#8b5cf60e', borderColor: '#8b5cf625' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="timer-outline" size={14} color="#7c3aed" />
                      <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>العدادين</Text>
                    </View>
                    <Text style={[styles.kpiValue, { color: '#7c3aed', fontSize: 12 }]} numberOfLines={1}>
                      {session.start_km ?? 0} ⬅ {session.end_km ?? 0}
                    </Text>
                  </View>
                </View>

                {/* ── ODOMETER THUMBNAILS PREVIEW ── */}
                {(session.start_km_image || session.end_km_image) && (
                  <View style={[styles.odometerStrip, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="images-outline" size={16} color={colors.primary} />
                      <Text style={[styles.odometerStripTitle, { color: colors.textPrimary }]}>
                        صور العدادات المسجلة:
                      </Text>
                    </View>

                    <View style={styles.thumbnailsRow}>
                      {session.start_km_image ? (
                        <TouchableOpacity
                          style={styles.thumbBox}
                          onPress={(e) => {
                            e.stopPropagation();
                            onPreviewPhoto?.({ url: formatImageUrl(session.start_km_image)!, title: 'صورة عداد البداية' });
                          }}
                        >
                          <Image
                            source={{ uri: formatImageUrl(session.start_km_image) || '' }}
                            style={styles.thumbImage}
                          />
                          <View style={[styles.thumbPill, { backgroundColor: '#10b981' }]}>
                            <Text style={styles.thumbPillText}>عداد البدء ({session.start_km ?? 0})</Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}

                      {session.end_km_image ? (
                        <TouchableOpacity
                          style={styles.thumbBox}
                          onPress={(e) => {
                            e.stopPropagation();
                            onPreviewPhoto?.({ url: formatImageUrl(session.end_km_image)!, title: 'صورة عداد النهاية' });
                          }}
                        >
                          <Image
                            source={{ uri: formatImageUrl(session.end_km_image) || '' }}
                            style={styles.thumbImage}
                          />
                          <View style={[styles.thumbPill, { backgroundColor: '#ef4444' }]}>
                            <Text style={styles.thumbPillText}>عداد النهاية ({session.end_km ?? 0})</Text>
                          </View>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                )}

                {/* ── CARD FOOTER & ACTIONS ── */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={[styles.editAndReviewBtn, { backgroundColor: colors.primary }]}
                    onPress={() => openEditModal(session)}
                  >
                    <Ionicons name="create-outline" size={17} color="#fff" />
                    <Text style={styles.editAndReviewBtnText}>مراجعة وتعديل العداد والطلبات</Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {session.review_video_url ? (
                      <TouchableOpacity
                        style={[styles.watchVideoBtn, { borderColor: '#10b981', backgroundColor: '#10b98115' }]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handlePlayVideo(session.review_video_url!);
                        }}
                      >
                        <Ionicons name="play-circle" size={18} color="#10b981" />
                        <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 12 }}>فيديو</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity
                      style={[styles.quickApproveBtn, { borderColor: '#10b981', backgroundColor: '#10b98112' }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleApproveShift(session);
                      }}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator size="small" color="#10b981" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Ionicons name="checkmark-done" size={16} color="#10b981" />
                          <Text style={{ color: '#059669', fontWeight: '700', fontSize: 13 }}>اعتماد فوري</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ── EDIT & REVIEW MODAL (المديولا الكاملة مع صور العدادين) ── */}
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
                <View>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                    مراجعة وتعديل وردية المندوب
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    {editingSession.employee_name || editingSession.employee?.name || 'مندوب'}
                    {editingSession.employee?.employee_number ? ` • كود: ${editingSession.employee.employee_number}` : ''}
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Ionicons name="camera" size={18} color={colors.primary} />
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                      صور العدادين (اضغط للتكبير)
                    </Text>
                  </View>

                  <View style={styles.odometerPhotosGrid}>
                    {/* Start KM Photo Card */}
                    <View style={[styles.odometerPhotoCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      <View style={styles.odometerPhotoHeader}>
                        <View style={[styles.dotIndicator, { backgroundColor: '#10b981' }]} />
                        <Text style={[styles.odometerPhotoTitle, { color: colors.textPrimary }]}>عداد البداية</Text>
                      </View>

                      {editingSession.start_km_image ? (
                        <TouchableOpacity
                          style={styles.modalPhotoTouch}
                          activeOpacity={0.8}
                          onPress={() =>
                            onPreviewPhoto?.({
                              url: formatImageUrl(editingSession.start_km_image)!,
                              title: 'صورة عداد البداية',
                            })
                          }
                        >
                          <Image
                            source={{ uri: formatImageUrl(editingSession.start_km_image) || '' }}
                            style={styles.modalPhotoImage}
                            resizeMode="cover"
                          />
                          <View style={styles.zoomHintBadge}>
                            <Ionicons name="expand" size={13} color="#fff" />
                            <Text style={styles.zoomHintText}>تكبير</Text>
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.emptyPhotoBox}>
                          <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
                          <Text style={[styles.emptyPhotoText, { color: colors.textSecondary }]}>لا توجد صورة</Text>
                        </View>
                      )}
                      <Text style={[styles.odometerCaption, { color: colors.textSecondary }]}>
                        مسجل: {editingSession.start_km ?? 0} كم
                      </Text>
                    </View>

                    {/* End KM Photo Card */}
                    <View style={[styles.odometerPhotoCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                      <View style={styles.odometerPhotoHeader}>
                        <View style={[styles.dotIndicator, { backgroundColor: '#ef4444' }]} />
                        <Text style={[styles.odometerPhotoTitle, { color: colors.textPrimary }]}>عداد النهاية</Text>
                      </View>

                      {editingSession.end_km_image ? (
                        <TouchableOpacity
                          style={styles.modalPhotoTouch}
                          activeOpacity={0.8}
                          onPress={() =>
                            onPreviewPhoto?.({
                              url: formatImageUrl(editingSession.end_km_image)!,
                              title: 'صورة عداد النهاية',
                            })
                          }
                        >
                          <Image
                            source={{ uri: formatImageUrl(editingSession.end_km_image) || '' }}
                            style={styles.modalPhotoImage}
                            resizeMode="cover"
                          />
                          <View style={styles.zoomHintBadge}>
                            <Ionicons name="expand" size={13} color="#fff" />
                            <Text style={styles.zoomHintText}>تكبير</Text>
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <View style={styles.emptyPhotoBox}>
                          <Ionicons name="image-outline" size={32} color={colors.textSecondary} />
                          <Text style={[styles.emptyPhotoText, { color: colors.textSecondary }]}>لا توجد صورة</Text>
                        </View>
                      )}
                      <Text style={[styles.odometerCaption, { color: colors.textSecondary }]}>
                        مسجل: {editingSession.end_km ?? 0} كم
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ── SECTION 2: تـعـديـل الـعـدادات والـمـسـافـة ── */}
                <View style={styles.modalSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Ionicons name="speedometer" size={18} color="#059669" />
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                      تعديل قراءات العداد والمسافة
                    </Text>
                  </View>

                  <View style={styles.twoInputsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                        🟢 عداد البداية (كم)
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
                      <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                        🏁 عداد النهاية (كم)
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
                    <Ionicons name="calculator-outline" size={18} color="#059669" />
                    <Text style={[styles.calculatedDistanceText, { color: colors.textPrimary }]}>
                      المسافة المحسوبة:{' '}
                      <Text style={{ fontWeight: '900', fontSize: 16, color: '#059669' }}>
                        {liveCalculatedDistance.toFixed(1)} كم
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* ── SECTION 3: تـعـديـل الـطـلـبـات والـوقـود ── */}
                <View style={styles.modalSection}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Ionicons name="cube" size={18} color="#2563eb" />
                    <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                      تعديل الطلبات والوقود
                    </Text>
                  </View>

                  <View style={styles.twoInputsRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                        📦 عدد الطلبات المعتمدة
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
                      <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                        ⛽ تكلفة الوقود (ريال)
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
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    📹 فيديو توثيق الطلبات (اختياري)
                  </Text>
                  {!editVideoUri ? (
                    <TouchableOpacity
                      style={[styles.recordVideoBtn, { backgroundColor: '#3b82f6' }]}
                      onPress={handleRecordReviewVideo}
                    >
                      <Ionicons name="videocam" size={18} color="#fff" />
                      <Text style={styles.recordVideoBtnText}>فتح الكاميرا لتصوير فيديو التوثيق</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.videoRecordedCard, { borderColor: '#10b981', backgroundColor: '#10b98115' }]}>
                      <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.videoRecordedTitle, { color: colors.textPrimary }]}>
                          تم تسجيل فيديو التوثيق
                        </Text>
                        <Text style={[styles.videoRecordedSub, { color: colors.textSecondary }]}>
                          سيتم حفظه على السيرفر لمدة 60 يوماً
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setEditVideoUri(null)} style={styles.reRecordSmallBtn}>
                        <Ionicons name="refresh" size={15} color="#ef4444" />
                        <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>إعادة</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* ── SECTION 5: مـلاحـظـات الاعـتـمـاد ── */}
                <View style={styles.modalSection}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    📝 ملاحظات الاعتماد والتدقيق
                  </Text>
                  <TextInput
                    style={[styles.modernTextArea, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                    multiline
                    numberOfLines={2}
                    value={editReviewNotes}
                    onChangeText={setEditReviewNotes}
                    placeholder="ملاحظات المشرف..."
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
                      <Ionicons name="shield-checkmark" size={20} color="#fff" />
                      <Text style={styles.confirmApprovalBtnText}>
                        اعتماد وحفظ الوردية الآن
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
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  summaryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  summarySub: {
    fontSize: 11,
    marginTop: 2,
  },
  pendingCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingCountText: {
    fontSize: 12,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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

  /* Modern Card Styles */
  modernCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delegateName: {
    fontSize: 15,
    fontWeight: '800',
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
  },
  appBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
  },
  appBadgeText: {
    color: '#2563eb',
    fontSize: 10,
    fontWeight: '700',
  },
  statusTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '800',
  },

  /* KPI Grid */
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiTile: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 3,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '900',
  },

  /* Odometer Strip */
  odometerStrip: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 8,
  },
  odometerStripTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  thumbnailsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  thumbBox: {
    flex: 1,
    height: 75,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#6b728030',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbPill: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    right: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbPillText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },

  /* Card Footer Actions */
  cardFooter: {
    gap: 8,
    marginTop: 2,
  },
  editAndReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  editAndReviewBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  watchVideoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickApproveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },

  /* ── Modal Styles ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    marginBottom: 12,
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
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '800',
  },

  /* Photos Grid in Modal */
  odometerPhotosGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  odometerPhotoCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8,
    gap: 6,
  },
  odometerPhotoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dotIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  odometerPhotoTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalPhotoTouch: {
    width: '100%',
    height: 110,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  modalPhotoImage: {
    width: '100%',
    height: '100%',
  },
  zoomHintBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  zoomHintText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyPhotoBox: {
    width: '100%',
    height: 110,
    borderRadius: 8,
    backgroundColor: '#6b728012',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  emptyPhotoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  odometerCaption: {
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '600',
  },

  /* Inputs */
  twoInputsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
  },
  modernInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  calculatedDistanceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  calculatedDistanceText: {
    fontSize: 13,
    fontWeight: '700',
  },
  recordVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
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
    borderRadius: 10,
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
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ef444415',
  },
  modernTextArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    height: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  confirmApprovalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
  },
  confirmApprovalBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
