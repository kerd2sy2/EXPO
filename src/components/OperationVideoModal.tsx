import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { ThemeColors } from '@shared/theme';
import { WorkSession } from '@shared/types';
import { formatImageUrl, getStoredToken } from '../services/api';
import {
  supervisorApi,
  OperationVideo,
  DelegateWithStatus,
} from '../services/supervisor';

interface OperationVideoModalProps {
  visible: boolean;
  onClose: () => void;
  branchDelegates: DelegateWithStatus[];
  pendingSessions?: WorkSession[];
  onRefresh?: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL?: boolean;
}

type ModalTab = 'record' | 'archive';

export const OperationVideoModal: React.FC<OperationVideoModalProps> = ({
  visible,
  onClose,
  branchDelegates,
  pendingSessions = [],
  onRefresh,
  colors,
  isDarkMode,
  isRTL = true,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('record');

  // Form State
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<WorkSession | null>(null);
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateWithStatus | null>(null);
  const [showDelegatePicker, setShowDelegatePicker] = useState(false);
  const [delegateSearch, setDelegateSearch] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Archive State
  const [archiveVideos, setArchiveVideos] = useState<OperationVideo[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Filter delegates in picker
  const filteredDelegates = useMemo(() => {
    if (!delegateSearch.trim()) return branchDelegates;
    const q = delegateSearch.toLowerCase().trim();
    return branchDelegates.filter(
      (d) =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.employee_number || '').toLowerCase().includes(q)
    );
  }, [branchDelegates, delegateSearch]);

  // Load Archive Videos
  const fetchArchive = async () => {
    try {
      setLoadingArchive(true);
      const list = await supervisorApi.getOperationVideos({
        date: dateFilter || undefined,
        employeeName: searchQuery || undefined,
        orderNumber: searchQuery || undefined,
      });
      setArchiveVideos(list);
    } catch (err: any) {
      console.warn('[OperationVideoModal] fetchArchive error:', err);
    } finally {
      setLoadingArchive(false);
    }
  };

  useEffect(() => {
    if (visible && activeTab === 'archive') {
      fetchArchive();
    }
  }, [visible, activeTab, dateFilter]);

  // Launch Camera for Silent, Compressed Video
  const handleRecordVideo = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('إذن الكاميرا مطلوب', 'يرجى منح الإذن للوصول إلى الكاميرا لتسجيل فيديو التوثيق.');
        return;
      }

      // Record video with Low quality (480p) to keep size tiny (1-3MB) and digits fully readable, defaulting to REAR / BACK camera
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        cameraType: ImagePicker.CameraType.back,
        quality: 0.3,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Low,
        videoMaxDuration: 45, // 45 seconds max
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setRecordedVideoUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('خطأ بالكاميرا', err?.message || 'فشل فتح الكاميرا لتسجيل الفيديو');
    }
  };

  // Submit Video & Optionally Approve Pending Session
  const handleUpload = async () => {
    if (!recordedVideoUri) {
      Alert.alert('تنبيه', 'يرجى تسجيل الفيديو أولاً قبل الحفظ.');
      return;
    }

    try {
      setUploading(true);
      const empName = selectedDelegate?.name || 'توثيق عام للفرع';
      const videoRes = await supervisorApi.uploadOperationVideo({
        videoUri: recordedVideoUri,
        employeeId: selectedDelegate?.id,
        employeeName: empName,
        orderNumber: orderNumber.trim(),
        sessionId: selectedSession?.id,
        notes: notes.trim() || `توثيق مراجعة وردية - عدد الطلبات: ${orderNumber}`,
      });

      // If tied to a pending shift, approve the shift with video proof
      if (selectedSession) {
        await supervisorApi.reviewSession({
          sessionId: selectedSession.id,
          isReviewed: true,
          ordersCount: Number(orderNumber) || selectedSession.orders_count || 0,
          fuelCost: selectedSession.fuel_cost || 0,
          reviewNotes: notes.trim() || 'معتمد بواسطة المشرف مع فيديو التوثيق',
          reviewVideoUrl: videoRes.video_url,
        });
      }

      Alert.alert(
        'تم التوثيق والاعتماد بنجاح',
        selectedSession
          ? 'تم اعتماد وردية المندوب والعدد النهائي وحفظ فيديو التوثيق على سيرفر AAMS لمدة 60 يوماً.'
          : 'تم حفظ الفيديو بنجاح على سيرفر AAMS وسيتم الاحتفاظ به لمدة 60 يوماً.',
        [
          {
            text: 'حسناً',
            onPress: () => {
              setRecordedVideoUri(null);
              setSelectedDelegate(null);
              setSelectedSession(null);
              setOrderNumber('');
              setNotes('');
              onRefresh?.();
              setActiveTab('archive');
              fetchArchive();
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('خطأ في الرفع والاعتماد', err?.message || 'فشل رفع الفيديو إلى السيرفر');
    } finally {
      setUploading(false);
    }
  };

  // Delete Video
  const handleDeleteVideo = (video: OperationVideo) => {
    Alert.alert(
      'تأكيد الحذف',
      'هل أنت متأكد من حذف هذا الفيديو نهائياً من سيرفر AAMS؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await supervisorApi.deleteOperationVideo(video.id);
              setArchiveVideos((prev) => prev.filter((v) => v.id !== video.id));
              Alert.alert('تم', 'تم حذف الفيديو بنجاح.');
            } catch (err: any) {
              Alert.alert('خطأ', err?.message || 'فشل حذف الفيديو');
            }
          },
        },
      ]
    );
  };

  // Play Video inside app via authenticated in-app browser
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

  // Filtered Archive
  const filteredArchive = useMemo(() => {
    if (!searchQuery.trim()) return archiveVideos;
    const q = searchQuery.toLowerCase().trim();
    return archiveVideos.filter(
      (v) =>
        (v.employee_name || '').toLowerCase().includes(q) ||
        (v.order_number || '').toLowerCase().includes(q) ||
        (v.notes || '').toLowerCase().includes(q)
    );
  }, [archiveVideos, searchQuery]);

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={26} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>توثيق العمليات</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>حفظ محلي آمن لمدة 60 يوماً</Text>
          </View>
          <View style={{ width: 26 }} />
        </View>

        {/* Top Segment Tabs */}
        <View style={[styles.tabsRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'record' && [styles.activeTabBtn, { borderBottomColor: colors.primary }]]}
            onPress={() => setActiveTab('record')}
          >
            <Ionicons
              name="videocam"
              size={18}
              color={activeTab === 'record' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabBtnText, { color: activeTab === 'record' ? colors.primary : colors.textSecondary }]}>
              تسجيل وتوثيق
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'archive' && [styles.activeTabBtn, { borderBottomColor: colors.primary }]]}
            onPress={() => setActiveTab('archive')}
          >
            <Ionicons
              name="film"
              size={18}
              color={activeTab === 'archive' ? colors.primary : colors.textSecondary}
            />
            <Text style={[styles.tabBtnText, { color: activeTab === 'archive' ? colors.primary : colors.textSecondary }]}>
              أرشيف الفيديوهات ({archiveVideos.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab 1: Record & Upload */}
        {activeTab === 'record' && (
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Auto-Purge Notice Badge */}
            <View style={[styles.noticeBox, { backgroundColor: '#3b82f615', borderColor: '#3b82f640' }]}>
              <Ionicons name="shield-checkmark" size={20} color="#3b82f6" />
              <Text style={[styles.noticeText, { color: colors.textPrimary }]}>
                يتم رفع الفيديو وتخزينه مباشرة على سيرفر AAMS لمدة 60 يوماً، ويتم حذفه تلقائياً بعدها لتوفير المساحة.
              </Text>
            </View>

            {/* Pending Shifts Section: Shows actual delegate reported orders */}
            {pendingSessions && pendingSessions.length > 0 && (
              <View style={[styles.cardBox, { backgroundColor: colors.card, borderColor: '#3b82f640', borderWidth: 1.5 }]}>
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    مناديب بانتظار اعتماد الطلبات ({pendingSessions.length})
                  </Text>
                  <View style={[styles.badgePill, { backgroundColor: '#3b82f620' }]}>
                    <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: '700' }}>مباشر</Text>
                  </View>
                </View>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  اضغط على المندوب لمراجعة عدد الطلبات التي سجلها، وتصوير فيديو التوثيق بالخلفية
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
                  {pendingSessions.map((sess) => {
                    const isSelected = selectedSession?.id === sess.id;
                    const empName = sess.employee_name || sess.employee?.name || 'مندوب';
                    return (
                      <TouchableOpacity
                        key={sess.id}
                        style={[
                          styles.pendingShiftCard,
                          {
                            backgroundColor: isSelected ? '#3b82f615' : colors.bg,
                            borderColor: isSelected ? '#2563eb' : colors.border,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedSession(null);
                            setSelectedDelegate(null);
                            setOrderNumber('');
                          } else {
                            setSelectedSession(sess);
                            setSelectedDelegate({
                              id: sess.employee_id,
                              name: empName,
                              employee_number: sess.employee?.employee_number,
                            } as any);
                            setOrderNumber(String(sess.orders_count || 0));
                            setNotes(`مراجعة وتوثيق وردية مندوب: ${empName}`);
                          }
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="person" size={14} color={isSelected ? '#2563eb' : colors.textSecondary} />
                          <Text style={[styles.pendingShiftName, { color: colors.textPrimary, fontWeight: '700' }]}>{empName}</Text>
                        </View>
                        <View style={[styles.pendingOrdersTag, { backgroundColor: isSelected ? '#2563eb' : '#3b82f615' }]}>
                          <Ionicons name="receipt" size={12} color={isSelected ? '#fff' : '#2563eb'} />
                          <Text style={[styles.pendingOrdersText, { color: isSelected ? '#fff' : '#2563eb', fontWeight: 'bold' }]}>
                            {sess.orders_count || 0} طلب مسجل
                          </Text>
                        </View>
                        {sess.employee?.employee_number && (
                          <Text style={[styles.pendingShiftCode, { color: colors.textSecondary }]}>
                            كود: {sess.employee.employee_number}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Video Capture Box */}
            <View style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {selectedSession ? `فيديو التوثيق للمندوب: ${selectedSession.employee_name || selectedSession.employee?.name || ''}` : 'فيديو التوثيق الصامت'}
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                يتم تصوير فيديو صامت بالكاميرا الخلفية بجودة خفيفة موفرة للمساحة وبدقة كافية لقراءة الأرقام والشاشة بوضوح.
              </Text>

              {!recordedVideoUri ? (
                <TouchableOpacity style={[styles.cameraActionBtn, { backgroundColor: colors.primary }]} onPress={handleRecordVideo}>
                  <Ionicons name="camera" size={28} color="#fff" />
                  <Text style={styles.cameraActionText}>فتح الكاميرا الخلفية لتسجيل الفيديو</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.videoPreviewCard, { borderColor: '#10b981', backgroundColor: '#10b98110' }]}>
                  <Ionicons name="checkmark-circle" size={32} color="#10b981" />
                  <View style={styles.videoPreviewInfo}>
                    <Text style={[styles.videoPreviewTitle, { color: colors.textPrimary }]}>تم تسجيل الفيديو بنجاح</Text>
                    <Text style={[styles.videoPreviewSub, { color: colors.textSecondary }]}>جاهز للرفع والتوثيق</Text>
                  </View>
                  <TouchableOpacity onPress={() => setRecordedVideoUri(null)} style={styles.reRecordBtn}>
                    <Ionicons name="refresh" size={18} color="#ef4444" />
                    <Text style={styles.reRecordText}>إعادة</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Link Options (Option C: Employee, Order, or Both) */}
            <View style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                بيانات الربط والطلب
              </Text>

              {/* Delegate Selector */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                المندوب / الموظف (اختياري)
              </Text>
              <TouchableOpacity
                style={[styles.pickerTrigger, { backgroundColor: colors.bg, borderColor: colors.border }]}
                onPress={() => setShowDelegatePicker(!showDelegatePicker)}
              >
                <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.pickerTriggerText, { color: selectedDelegate ? colors.textPrimary : colors.textSecondary }]}>
                  {selectedDelegate ? selectedDelegate.name : 'اختر المندوب إن وُجد...'}
                </Text>
                {selectedDelegate && (
                  <TouchableOpacity onPress={() => setSelectedDelegate(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Delegate Picker Dropdown */}
              {showDelegatePicker && (
                <View style={[styles.dropdownBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.dropdownSearch, { color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="ابحث باسم المندوب..."
                    placeholderTextColor={colors.textSecondary}
                    value={delegateSearch}
                    onChangeText={setDelegateSearch}
                  />
                  <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled>
                    {filteredDelegates.map((d) => (
                      <TouchableOpacity
                        key={d.id}
                        style={[styles.delegateItem, { borderBottomColor: colors.border }]}
                        onPress={() => {
                          setSelectedDelegate(d);
                          setShowDelegatePicker(false);
                        }}
                      >
                        <Text style={[styles.delegateItemName, { color: colors.textPrimary }]}>{d.name}</Text>
                        <Text style={[styles.delegateItemCode, { color: colors.textSecondary }]}>{d.employee_number}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Order Number Input */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', marginTop: 14 }]}>
                رقم الطلب أو عدد الطلبات (اختياري)
              </Text>
              <TextInput
                style={[styles.inputField, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder="مثلاً: 16 أو رقم طلب التوصيل..."
                placeholderTextColor={colors.textSecondary}
                value={orderNumber}
                onChangeText={setOrderNumber}
              />

              {/* Notes Input */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', marginTop: 14 }]}>
                ملاحظات التوثيق
              </Text>
              <TextInput
                style={[
                  styles.inputField,
                  styles.textAreaField,
                  { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                ]}
                placeholder="أي تفاصيل أو ملاحظات إضافية حول العملية..."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: recordedVideoUri ? colors.primary : colors.border }]}
              onPress={handleUpload}
              disabled={!recordedVideoUri || uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name={selectedSession ? "checkmark-done-circle" : "cloud-upload"} size={22} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {selectedSession ? 'موافقة واعتماد الوردية مع حفظ الفيديو' : 'حفظ وتوثيق الفيديو على السيرفر'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Tab 2: Video Archive */}
        {activeTab === 'archive' && (
          <View style={{ flex: 1 }}>
            {/* Search and Filters */}
            <View style={[styles.archiveFilters, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
              <View style={[styles.searchBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.archiveSearchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="ابحث بالموظف، رقم الطلب، أو الملاحظة..."
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

              <TouchableOpacity style={styles.refreshArchiveBtn} onPress={fetchArchive}>
                <Ionicons name="refresh" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {loadingArchive ? (
              <View style={styles.loaderCenter}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loaderText, { color: colors.textSecondary }]}>جاري تحميل الأرشيف...</Text>
              </View>
            ) : filteredArchive.length === 0 ? (
              <View style={styles.emptyCenter}>
                <Ionicons name="film-outline" size={54} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا توجد فيديوهات مسجلة</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  أي فيديو يتم تصويره سيظهر هنا لمدة 60 يوماً مع إمكانية البحث والتشغيل.
                </Text>
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.archiveList}>
                {filteredArchive.map((video) => {
                  const formattedDate = new Date(video.recorded_at).toLocaleDateString('ar-SA', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <View key={video.id} style={[styles.videoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      {/* Top Info */}
                      <View style={[styles.videoCardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={styles.videoCardHeader}>
                          <Text style={[styles.videoEmployeeName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                            {video.employee_name || 'توثيق عام'}
                          </Text>
                          <Text style={[styles.videoDate, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                            {formattedDate}
                          </Text>
                        </View>

                        {/* Days Left Badge */}
                        <View
                          style={[
                            styles.retentionBadge,
                            {
                              backgroundColor: video.days_left <= 7 ? '#ef444420' : '#10b98120',
                              borderColor: video.days_left <= 7 ? '#ef4444' : '#10b981',
                            },
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={14}
                            color={video.days_left <= 7 ? '#ef4444' : '#10b981'}
                          />
                          <Text
                            style={[
                              styles.retentionBadgeText,
                              { color: video.days_left <= 7 ? '#ef4444' : '#10b981' },
                            ]}
                          >
                            متبقي {video.days_left} يوم
                          </Text>
                        </View>
                      </View>

                      {/* Order and Notes */}
                      {video.order_number ? (
                        <View style={[styles.orderTag, { backgroundColor: colors.bg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Ionicons name="receipt-outline" size={14} color={colors.primary} />
                          <Text style={[styles.orderTagText, { color: colors.primary }]}>
                            الطلب: {video.order_number}
                          </Text>
                        </View>
                      ) : null}

                      {video.notes ? (
                        <Text style={[styles.videoNotes, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                          {video.notes}
                        </Text>
                      ) : null}

                      {/* Actions */}
                      <View style={[styles.videoActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <TouchableOpacity
                          style={[styles.playVideoBtn, { backgroundColor: colors.primary }]}
                          onPress={() => handlePlayVideo(video.video_url)}
                        >
                          <Ionicons name="play" size={16} color="#fff" />
                          <Text style={styles.playVideoBtnText}>مشاهدة الفيديو</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.deleteVideoBtn, { borderColor: '#ef4444' }]}
                          onPress={() => handleDeleteVideo(video)}
                        >
                          <Ionicons name="trash-outline" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabBtn: {
    borderBottomWidth: 2.5,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  cardBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  cameraActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginVertical: 8,
  },
  cameraActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  videoPreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  videoPreviewInfo: {
    flex: 1,
  },
  videoPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  videoPreviewSub: {
    fontSize: 12,
    marginTop: 2,
  },
  reRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ef444415',
  },
  reRecordText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerTriggerText: {
    flex: 1,
    fontSize: 14,
  },
  dropdownBox: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  dropdownSearch: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    fontSize: 13,
  },
  delegateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  delegateItemName: {
    fontSize: 14,
    fontWeight: '600',
  },
  delegateItemCode: {
    fontSize: 12,
  },
  inputField: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  textAreaField: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 30,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  archiveFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  archiveSearchInput: {
    flex: 1,
    fontSize: 13,
  },
  refreshArchiveBtn: {
    padding: 8,
  },
  loaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  archiveList: {
    padding: 16,
    gap: 12,
  },
  videoCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  videoCardTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  videoCardHeader: {
    flex: 1,
  },
  videoEmployeeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  videoDate: {
    fontSize: 12,
    marginTop: 2,
  },
  retentionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  retentionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orderTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  videoNotes: {
    fontSize: 13,
    lineHeight: 18,
  },
  videoActionsRow: {
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  playVideoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  playVideoBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteVideoBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingShiftCard: {
    padding: 12,
    borderRadius: 12,
    minWidth: 140,
    gap: 6,
  },
  pendingShiftName: {
    fontSize: 13,
  },
  pendingOrdersTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  pendingOrdersText: {
    fontSize: 12,
  },
  pendingShiftCode: {
    fontSize: 11,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
});
