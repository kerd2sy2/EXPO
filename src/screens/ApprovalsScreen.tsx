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
import * as Linking from 'expo-linking';
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
  ReviewSessionParams,
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

type ApprovalTab = 'shifts' | 'advances' | 'maintenance';

export const ApprovalsScreen: React.FC<ApprovalsScreenProps> = ({
  pendingSessions,
  pendingAdvances,
  pendingMaintenance,
  loading,
  onRefresh,
  colors,
  isDarkMode,
  isRTL,
  onPreviewPhoto,
}) => {
  const [activeTab, setActiveTab] = useState<ApprovalTab>('shifts');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter pending sessions by delegate name, employee code, motorcycle, or national id
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return pendingSessions;
    const q = searchQuery.toLowerCase().trim();
    return pendingSessions.filter((s) => {
      const name = (s.employee_name || s.employee?.name || '').toLowerCase();
      const code = (s.employee?.employee_number || '').toLowerCase();
      const bike = (s.motorcycle_number || s.employee?.motorcycle_number || '').toLowerCase();
      const natId = (s.employee?.national_id || '').toLowerCase();
      return name.includes(q) || code.includes(q) || bike.includes(q) || natId.includes(q);
    });
  }, [pendingSessions, searchQuery]);

  // Filter pending advances and reports by delegate name, reason, or type
  const filteredAdvances = useMemo(() => {
    if (!searchQuery.trim()) return pendingAdvances;
    const q = searchQuery.toLowerCase().trim();
    return pendingAdvances.filter((a) => {
      const name = (a.employee_name || '').toLowerCase();
      const reason = (a.reason || a.notes || a.report_text || '').toLowerCase();
      const type = (a.type || '').toLowerCase();
      return name.includes(q) || reason.includes(q) || type.includes(q);
    });
  }, [pendingAdvances, searchQuery]);

  // Filter pending maintenance requests by delegate name, plate, or description
  const filteredMaintenance = useMemo(() => {
    if (!searchQuery.trim()) return pendingMaintenance;
    const q = searchQuery.toLowerCase().trim();
    return pendingMaintenance.filter((m) => {
      const name = (m.employee_name || '').toLowerCase();
      const bike = (m.motorcycle_number || '').toLowerCase();
      const desc = (m.issue_description || '').toLowerCase();
      return name.includes(q) || bike.includes(q) || desc.includes(q);
    });
  }, [pendingMaintenance, searchQuery]);

  // Edit & Review Shift Modal State
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [editOrdersCount, setEditOrdersCount] = useState('');
  const [editFuelCost, setEditFuelCost] = useState('');
  const [editReviewNotes, setEditReviewNotes] = useState('');
  const [editVideoUri, setEditVideoUri] = useState<string | null>(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Quick Approve Shift
  const handleApproveShift = async (session: WorkSession) => {
    try {
      setActionLoadingId(session.id);
      await supervisorApi.reviewSession({
        sessionId: session.id,
        isReviewed: true,
        reviewNotes: 'معتمد بواسطة المشرف',
        ordersCount: session.orders_count,
        fuelCost: session.fuel_cost,
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
    } catch (err: any) {
      Alert.alert('خطأ', 'تعذر فتح مشغل الفيديو داخل التطبيق');
    }
  };

  // Record Silent Review Proof Video (Default to Back / Rear Camera)
  const handleRecordReviewVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('إذن الكاميرا مطلوب', 'يرجى تفعيل صلاحية الكاميرا لتسجيل فيديو توثيق الطلبات.');
        return;
      }

      // Record compressed low-quality video (480p) defaulting to REAR / BACK camera
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

  // Unified Save: Final Order Count + Video Upload + Shift Approval
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

      await supervisorApi.reviewSession({
        sessionId: editingSession.id,
        isReviewed: true,
        ordersCount: Number(editOrdersCount) || 0,
        fuelCost: Number(editFuelCost) || 0,
        reviewNotes: editReviewNotes.trim(),
        reviewVideoUrl: uploadedVideoUrl,
      });

      Alert.alert(
        'تم بنجاح',
        editVideoUri
          ? 'تم اعتماد الوردية والعدد النهائي وحفظ فيديو التوثيق على السيرفر لمدة 60 يوماً.'
          : 'تم تعديل واعتماد الوردية بنجاح.'
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

  // Maintenance action
  const handleAdvanceAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      setActionLoadingId(id);
      if (action === 'approve') {
        await supervisorApi.approveInvestigation(id);
        Alert.alert('تم بنجاح', 'تمت الموافقة على الطلب بنجاح وتحديث السجلات');
      } else {
        await supervisorApi.rejectInvestigation(id, 'مرفوض بواسطة المشرف');
        Alert.alert('تم', 'تم رفض الطلب');
      }
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشلت معالجة الطلب');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMaintenanceAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setActionLoadingId(id);
      await supervisorApi.updateMaintenanceStatus(id, status);
      Alert.alert('تم', status === 'APPROVED' ? 'تمت الموافقة وإحالة الدباب لمركز الصيانة' : 'تم رفض الطلب');
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل تحديث طلب الصيانة');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ── TOP SEARCH BAR (ابحث بالحرفين يظهر فوراً) ── */}
      <View style={[styles.topSearchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
          placeholder="ابحث باسم المندوب (حرفين أو أكثر)، الكود، أو رقم الدباب..."
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

      {/* Segmented Top Bar */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'shifts' && [styles.activeSegment, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('shifts')}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'shifts' ? '#fff' : colors.textSecondary }]}>
            الورديات ({filteredSessions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'advances' && [styles.activeSegment, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('advances')}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'advances' ? '#fff' : colors.textSecondary }]}>
            السلف والتقارير ({filteredAdvances.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'maintenance' && [styles.activeSegment, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('maintenance')}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'maintenance' ? '#fff' : colors.textSecondary }]}>
            الصيانة ({filteredMaintenance.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {/* SHIFTS TAB */}
        {activeTab === 'shifts' && (
          <>
            {filteredSessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name={searchQuery ? 'search-outline' : 'checkmark-done-circle'} size={54} color={searchQuery ? colors.textSecondary : '#10B981'} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {searchQuery ? `لا توجد نتائج مطابقة لـ "${searchQuery}"` : 'لا توجد ورديات معلقة'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {searchQuery ? 'تأكد من كتابة الاسم أو رقم الدباب بشكل صحيح' : 'جميع ورديات فرعك معتمدة ومحدثة بالكامل'}
                </Text>
              </View>
            ) : (
              filteredSessions.map((session) => {
                const isLoading = actionLoadingId === session.id;
                const distance =
                  session.end_km && session.start_km ? Math.max(0, session.end_km - session.start_km) : 0;
                const plateStr = session.motorcycle_number || session.employee?.motorcycle_number || '';
                const parsedPlate = plateStr ? parsePlateComponents(plateStr) : null;

                return (
                  <View key={session.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.headerTitleCol}>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                          مندوب: {session.employee_name || session.employee?.name || session.employee_id}
                        </Text>
                        <Text style={[styles.cardTime, { color: colors.textSecondary }]}>
                          {session.employee?.employee_number ? `كود: ${session.employee.employee_number} • ` : ''}
                          {session.start_time ? new Date(session.start_time).toLocaleDateString('ar-SA') : 'اليوم'}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        <View style={[styles.statusTag, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
                          <Text style={styles.statusTagText}>بانتظار الاعتماد</Text>
                        </View>
                        {parsedPlate && (
                          <SaudiPlateView
                            digits={parsedPlate.digits}
                            letters={parsedPlate.letters}
                            editable={false}
                            scale={0.55}
                            isDarkMode={isDarkMode}
                          />
                        )}
                      </View>
                    </View>

                    {/* Highlight Reported Orders Banner */}
                    <View style={[styles.ordersHighlightBanner, { backgroundColor: '#3b82f615', borderColor: '#3b82f640' }]}>
                      <Ionicons name="receipt" size={18} color="#2563eb" />
                      <Text style={[styles.ordersHighlightText, { color: colors.textPrimary }]}>
                        الطلبات المسجلة من المندوب:{' '}
                        <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#2563eb' }}>
                          {session.orders_count || 0}
                        </Text>{' '}
                        طلب
                      </Text>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={[styles.statVal, { color: colors.primary }]}>{session.orders_count || 0}</Text>
                        <Text style={[styles.statLbl, { color: colors.textSecondary }]}>الطلبات</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={[styles.statVal, { color: colors.textPrimary }]}>{distance} كم</Text>
                        <Text style={[styles.statLbl, { color: colors.textSecondary }]}>المسافة</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={[styles.statVal, { color: colors.textPrimary }]}>{session.fuel_cost || 0} ر.س</Text>
                        <Text style={[styles.statLbl, { color: colors.textSecondary }]}>الوقود</Text>
                      </View>
                    </View>

                    {/* Photo previews if available */}
                    {(session.start_km_image || session.end_km_image) && (
                      <View style={styles.photoRow}>
                        {session.start_km_image && (
                          <TouchableOpacity
                            style={styles.photoThumbWrapper}
                            onPress={() =>
                              onPreviewPhoto?.({ url: session.start_km_image!, title: 'عداد البداية' })
                            }
                          >
                            <Image source={{ uri: session.start_km_image }} style={styles.photoThumb} />
                            <Text style={styles.photoThumbLabel}>عداد البدء</Text>
                          </TouchableOpacity>
                        )}
                        {session.end_km_image && (
                          <TouchableOpacity
                            style={styles.photoThumbWrapper}
                            onPress={() =>
                              onPreviewPhoto?.({ url: session.end_km_image!, title: 'عداد النهاية' })
                            }
                          >
                            <Image source={{ uri: session.end_km_image }} style={styles.photoThumb} />
                            <Text style={styles.photoThumbLabel}>عداد الإغلاق</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Action buttons */}
                    <View style={[styles.actionsRow, { flexDirection: 'column', gap: 8 }]}>
                      <TouchableOpacity
                        style={[styles.primaryReviewActionBtn, { backgroundColor: colors.primary }]}
                        onPress={() => openEditModal(session)}
                      >
                        <Ionicons name="videocam" size={18} color="#fff" />
                        <Text style={styles.primaryReviewActionText}>توثيق ومراجعة الطلبات بالفيديو</Text>
                      </TouchableOpacity>

                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {session.review_video_url ? (
                          <TouchableOpacity
                            style={[styles.videoProofBadgeBtn, { borderColor: '#10b981', backgroundColor: '#10b98115', flex: 1 }]}
                            onPress={() => handlePlayVideo(session.review_video_url!)}
                          >
                            <Ionicons name="play-circle" size={18} color="#10b981" />
                            <Text style={{ color: '#10b981', fontWeight: 'bold', fontSize: 13 }}>مشاهدة الفيديو</Text>
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={[styles.directApproveBtn, { borderColor: '#10B981', backgroundColor: '#10B98110', flex: 1 }]}
                          onPress={() => handleApproveShift(session)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <ActivityIndicator size="small" color="#10B981" />
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                              <Ionicons name="checkmark-done" size={16} color="#10B981" />
                              <Text style={{ color: '#10B981', fontWeight: '600', fontSize: 13 }}>اعتماد فوري</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ADVANCES & REPORTS TAB */}
        {activeTab === 'advances' && (
          <>
            {filteredAdvances.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name={searchQuery ? 'search-outline' : 'wallet-outline'} size={54} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {searchQuery ? `لا توجد طلبات سلف أو تقارير مطابقة لـ "${searchQuery}"` : 'لا توجد طلبات سلف أو تقارير معلقة'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {searchQuery ? 'تأكد من كتابة اسم المندوب بشكل صحيح' : 'جميع طلبات السلف والتقارير الإدارية معتمدة ومحدثة'}
                </Text>
              </View>
            ) : (
              filteredAdvances.map((adv) => {
                const isLoading = actionLoadingId === adv.id;
                const isReport = adv.type === 'supervisor_report';

                return (
                  <View key={adv.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{adv.employee_name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <View
                            style={[
                              styles.typeBadge,
                              { backgroundColor: isReport ? '#8b5cf615' : colors.primaryLight },
                            ]}
                          >
                            <Text style={[styles.typeBadgeText, { color: isReport ? '#8b5cf6' : colors.primary }]}>
                              {isReport
                                ? 'تقرير مشرف / شكوى'
                                : adv.type === 'internet_advance'
                                ? 'سلفة باقة نت'
                                : 'طلب سلفة مالية'}
                            </Text>
                          </View>
                          <Text style={[styles.cardTime, { color: colors.textSecondary }]}>
                            {adv.created_at ? new Date(adv.created_at).toLocaleDateString('ar-SA') : 'اليوم'}
                          </Text>
                        </View>
                      </View>

                      {adv.amount ? (
                        <Text style={[styles.amountText, { color: colors.primary }]}>{adv.amount} ر.س</Text>
                      ) : null}
                    </View>

                    {(adv.report_text || adv.reason || adv.notes) && (
                      <View style={[styles.issueBox, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.issueLabel, { color: colors.textSecondary }]}>
                          {isReport ? 'بيان التقرير الإداري:' : 'سبب طلب السلفة:'}
                        </Text>
                        <Text style={[styles.issueText, { color: colors.textPrimary }]}>
                          {adv.report_text || adv.reason || adv.notes}
                        </Text>
                        {adv.deduction_month ? (
                          <Text style={[styles.issueText, { color: colors.textSecondary, marginTop: 4, fontSize: 11 }]}>
                            شهر الاستقطاع: {adv.deduction_month}
                          </Text>
                        ) : null}
                      </View>
                    )}

                    {/* Advance / Report Management Notice */}
                    <View
                      style={[
                        styles.adminApprovalNotice,
                        {
                          backgroundColor: isDarkMode ? '#064e3b20' : '#ecfdf5',
                          borderColor: '#10b981',
                        },
                      ]}
                    >
                      <Ionicons name="shield-checkmark-outline" size={16} color="#059669" />
                      <Text style={[styles.adminApprovalNoticeText, { color: '#059669' }]}>
                        {isReport
                          ? 'تم إرسال التقرير للإدارة العامة للمتابعة واتخاذ الإجراء'
                          : 'بانتظار الاعتماد المالي: صلاحية الموافقة لدى الإدارة العامة والحسابات'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* MAINTENANCE TAB */}
        {activeTab === 'maintenance' && (
          <>
            {filteredMaintenance.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name={searchQuery ? 'search-outline' : 'build-outline'} size={54} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {searchQuery ? `لا توجد طلبات صيانة مطابقة لـ "${searchQuery}"` : 'لا توجد طلبات صيانة معلقة'}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  {searchQuery ? 'تأكد من كتابة الاسم أو اللوحة بشكل صحيح' : 'أسطول دبابات الفرع في حالة ممتازة'}
                </Text>
              </View>
            ) : (
              filteredMaintenance.map((maint) => {
                const isLoading = actionLoadingId === maint.id;
                const plate = parsePlateComponents(maint.motorcycle_number || '');

                return (
                  <View key={maint.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                          المندوب: {maint.employee_name || 'غير محدد'}
                        </Text>
                        <Text style={[styles.cardTime, { color: colors.textSecondary }]}>
                          {new Date(maint.created_at).toLocaleDateString('ar-SA')}
                        </Text>
                      </View>
                      <SaudiPlateView
                        digits={plate.digits}
                        letters={plate.letters}
                        editable={false}
                        scale={0.65}
                        isDarkMode={isDarkMode}
                      />
                    </View>

                    <View style={styles.issueBox}>
                      <Text style={[styles.issueLabel, { color: colors.textSecondary }]}>وصف العطل المبلغ عنه:</Text>
                      <Text style={[styles.issueText, { color: colors.textPrimary }]}>{maint.issue_description}</Text>
                    </View>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.rejectBtn, { borderColor: '#EF4444' }]}
                        onPress={() => handleMaintenanceAction(maint.id, 'REJECTED')}
                        disabled={isLoading}
                      >
                        <Text style={[styles.rejectBtnText, { color: '#EF4444' }]}>رفض</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.approveBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => handleMaintenanceAction(maint.id, 'APPROVED')}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.approveBtnText}>إحالة للورشة والعهدة</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Edit & Review Modal */}
      <Modal visible={!!editingSession} transparent animationType="slide" onRequestClose={() => setEditingSession(null)}>
        {editingSession ? (
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>مراجعة وتعديل بيانات الوردية</Text>
                <TouchableOpacity onPress={() => setEditingSession(null)}>
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Guidance Badge with Delegate info */}
                <View style={[styles.infoCallout, { backgroundColor: '#3b82f615', borderColor: '#3b82f640' }]}>
                  <Ionicons name="information-circle" size={24} color="#3b82f6" />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoCalloutTitle, { color: colors.textPrimary, fontWeight: 'bold', fontSize: 15 }]}>
                      المندوب: {editingSession.employee_name || editingSession.employee?.name || 'مندوب'}
                    </Text>
                    <Text style={[styles.infoCalloutText, { color: colors.textPrimary, marginTop: 4, fontSize: 14 }]}>
                      عدد الطلبات المسجل من المندوب:{' '}
                      <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 16 }}>
                        {editingSession.orders_count || 0}
                      </Text>{' '}
                      طلب.{'\n'}
                      سجّل فيديو التوثيق الصامت بالكاميرا الخلفية، ثم أكد أو عدّل العدد النهائي قبل الموافقة.
                    </Text>
                  </View>
                </View>

                {/* Video Documentation Section */}
                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: 12 }]}>
                  1. فيديو التوثيق الصامت (الكاميرا الخلفية)
                </Text>
                {!editVideoUri ? (
                  <TouchableOpacity
                    style={[styles.cameraActionBtn, { backgroundColor: '#3b82f6' }]}
                    onPress={handleRecordReviewVideo}
                  >
                    <Ionicons name="videocam" size={20} color="#fff" />
                    <Text style={styles.cameraActionText}>فتح الكاميرا الخلفية لتصوير فيديو التوثيق (صامت)</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.videoRecordedCard, { borderColor: '#10b981', backgroundColor: '#10b98115' }]}>
                    <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.videoRecordedTitle, { color: colors.textPrimary }]}>تم تسجيل فيديو الإثبات (صامت)</Text>
                      <Text style={[styles.videoRecordedSub, { color: colors.textSecondary }]}>
                        سيتم حفظه بأمان على السيرفر لمدة 60 يوماً
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setEditVideoUri(null)} style={styles.reRecordSmallBtn}>
                      <Ionicons name="refresh" size={16} color="#ef4444" />
                      <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '600' }}>إعادة</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: 14 }]}>
                  2. العدد النهائي المعتمد للطلبات
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                  keyboardType="numeric"
                  value={editOrdersCount}
                  onChangeText={setEditOrdersCount}
                  placeholder={`العدد المسجل: ${editingSession.orders_count || 0}`}
                  placeholderTextColor={colors.textSecondary}
                />

                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: 10 }]}>
                  3. تكلفة الوقود المعتمدة (ريال)
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                  keyboardType="numeric"
                  value={editFuelCost}
                  onChangeText={setEditFuelCost}
                />

                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginTop: 10 }]}>
                  4. ملاحظات الاعتماد والتدقيق
                </Text>
                <TextInput
                  style={[styles.textArea, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                  multiline
                  numberOfLines={2}
                  value={editReviewNotes}
                  onChangeText={setEditReviewNotes}
                />
              </ScrollView>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveEditReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-done" size={20} color="#fff" />
                    <Text style={styles.saveBtnText}>
                      {editVideoUri ? 'موافقة واعتماد الوردية (مع حفظ الفيديو)' : 'موافقة واعتماد الوردية'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
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
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  topSearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegment: {},
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleCol: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardTime: {
    fontSize: 12,
  },
  statusTag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusTagText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#6B728025',
  },
  statBox: {
    alignItems: 'center',
    gap: 2,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLbl: {
    fontSize: 11,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoThumbWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  photoThumbLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  rejectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  issueBox: {
    backgroundColor: '#6B728010',
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  issueLabel: {
    fontSize: 11,
  },
  issueText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    height: 70,
    textAlignVertical: 'top',
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  adminApprovalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  adminApprovalNoticeText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  infoCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  cameraActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 4,
    marginBottom: 6,
  },
  cameraActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  videoRecordedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 4,
    marginBottom: 6,
  },
  videoRecordedTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  videoRecordedSub: {
    fontSize: 11,
    marginTop: 2,
  },
  reRecordSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#ef444415',
  },
  ordersHighlightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  ordersHighlightText: {
    fontSize: 13,
    fontWeight: '700',
  },
  primaryReviewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 10,
  },
  primaryReviewActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  videoProofBadgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  directApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoCalloutTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
});
