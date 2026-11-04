import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { ThemeColors } from '@shared/theme';
import { WorkSession } from '@shared/types';
import InAppVideoPlayer from './InAppVideoPlayer';
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

type DateFilterType = 'ALL' | 'TODAY' | 'WEEK';

const formatArabicRelativeTime = (iso?: string) => {
  if (!iso) return '---';
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'الآن';
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `منذ ${diffHrs} ساعة`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  } catch {
    return '---';
  }
};

export const OperationVideoModal: React.FC<OperationVideoModalProps> = ({
  visible,
  onClose,
  branchDelegates,
  colors,
  isDarkMode,
  isRTL = true,
}) => {
  const [archiveVideos, setArchiveVideos] = useState<OperationVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DateFilterType>('TODAY');

  // Video playback
  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);

  // Edit Modal State
  const [editingVideo, setEditingVideo] = useState<OperationVideo | null>(null);
  const [editOrderNumber, setEditOrderNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Record / Upload State
  const [showRecordSheet, setShowRecordSheet] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [selectedDelegateId, setSelectedDelegateId] = useState<string>('');
  const [newOrderNumber, setNewOrderNumber] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      const list = await supervisorApi.getOperationVideos();
      setArchiveVideos(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('[OperationVideoModal] Error fetching videos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchVideos();
    }
  }, [visible, fetchVideos]);

  // Fast filter by query and date type
  const filteredVideos = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    return archiveVideos.filter((v) => {
      // 1. Date filter
      if (v.recorded_at) {
        const vDate = new Date(v.recorded_at).toISOString().slice(0, 10);
        if (filterType === 'TODAY' && vDate !== todayStr) {
          return false;
        }
        if (filterType === 'WEEK') {
          const diffDays = (now.getTime() - new Date(v.recorded_at).getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        }
      }

      // 2. Search query filter
      if (!q) return true;
      const empMatch = v.employee_name?.toLowerCase().includes(q);
      const orderMatch = v.order_number?.toLowerCase().includes(q);
      const notesMatch = v.notes?.toLowerCase().includes(q);
      return empMatch || orderMatch || notesMatch;
    });
  }, [archiveVideos, searchQuery, filterType]);

  const handlePlay = async (videoUrl?: string) => {
    if (!videoUrl) {
      Alert.alert('خطأ', 'رابط الفيديو غير متوفر');
      return;
    }
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
    setPlayingVideoUrl(fullUrl);
  };

  const handleOpenExternal = async () => {
    if (playingVideoUrl) {
      await WebBrowser.openBrowserAsync(playingVideoUrl).catch(() => {});
    }
  };

  // Launch camera
  const handleRecordNew = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('صلاحية الكاميرا', 'يرجى تفعيل صلاحية الكاميرا لتسجيل الفيديو.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        cameraType: ImagePicker.CameraType.back,
        quality: 0.4,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Low,
        videoMaxDuration: 60,
      });

      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setRecordedUri(res.assets[0].uri);
        setShowRecordSheet(true);
      }
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'تعذر فتح الكاميرا.');
    }
  };

  const handleSaveUpload = async () => {
    if (!recordedUri) return;
    try {
      setUploading(true);
      const matched = branchDelegates.find((d) => String(d.id) === String(selectedDelegateId));
      await supervisorApi.uploadOperationVideo({
        videoUri: recordedUri,
        employeeId: selectedDelegateId || undefined,
        employeeName: matched?.name || undefined,
        orderNumber: newOrderNumber.trim() || undefined,
        notes: newNotes.trim() || undefined,
      });

      setShowRecordSheet(false);
      setRecordedUri(null);
      setNewOrderNumber('');
      setNewNotes('');
      fetchVideos();
      Alert.alert('تم بنجاح', 'تم حفظ وتوثيق الفيديو في الأرشيف بنجاح.');
    } catch (err: any) {
      Alert.alert('فشل الرفع', err?.message || 'تعذر رفع الفيديو إلى السيرفر.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (video: OperationVideo) => {
    Alert.alert(
      'حذف توثيق الفيديو',
      `هل أنت متأكد من حذف هذا الفيديو نهائياً؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await supervisorApi.deleteOperationVideo(video.id);
              setArchiveVideos((prev) => prev.filter((v) => v.id !== video.id));
            } catch (err: any) {
              Alert.alert('خطأ', err?.message || 'فشل حذف الفيديو');
            }
          },
        },
      ]
    );
  };

  const handleSaveEdit = async () => {
    if (!editingVideo) return;
    try {
      setSavingEdit(true);
      await supervisorApi.updateOperationVideo(editingVideo.id, {
        orderNumber: editOrderNumber.trim(),
        notes: editNotes.trim(),
      });
      setArchiveVideos((prev) =>
        prev.map((v) =>
          v.id === editingVideo.id
            ? { ...v, order_number: editOrderNumber.trim(), notes: editNotes.trim() }
            : v
        )
      );
      setEditingVideo(null);
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل تحديث الفيديو');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[styles.headerRow, { backgroundColor: colors.card, borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity style={styles.backBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={[styles.titleCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>مراجعة وفيديوهات التوثيق</Text>
            <Text style={[styles.headerSub, { color: colors.textSecondary }]}>أرشيف الفيديوهات السحابي • حفظ 60 يوماً</Text>
          </View>

          <TouchableOpacity
            style={[styles.recordBtn, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleRecordNew}
            activeOpacity={0.8}
          >
            <Ionicons name="videocam" size={17} color="#ffffff" />
            <Text style={styles.recordBtnText}>توثيق جديد</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Fast Filters */}
        <View style={[styles.searchBarWrapper, { backgroundColor: colors.card }]}>
          <View style={[styles.searchBox, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="search" size={17} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder="ابحث بالاسم، رقم الطلب، الملاحظة..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[styles.chip, filterType === 'TODAY' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setFilterType('TODAY')}
            >
              <Text style={[styles.chipText, { color: filterType === 'TODAY' ? '#ffffff' : colors.textPrimary }]}>فيديوهات اليوم</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, filterType === 'WEEK' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setFilterType('WEEK')}
            >
              <Text style={[styles.chipText, { color: filterType === 'WEEK' ? '#ffffff' : colors.textPrimary }]}>هذا الأسبوع</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, filterType === 'ALL' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => setFilterType('ALL')}
            >
              <Text style={[styles.chipText, { color: filterType === 'ALL' ? '#ffffff' : colors.textPrimary }]}>جميع الفيديوهات ({archiveVideos.length})</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Video Cards List */}
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchVideos} colors={[colors.primary]} tintColor={colors.primary} />}
        >
          {filteredVideos.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={[styles.emptyIconCircle, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
                <Ionicons name="film-outline" size={38} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا توجد فيديوهات توثيق</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {filterType === 'TODAY'
                  ? 'لم يتم تسجيل فيديوهات توثيق اليوم حتى الآن.'
                  : 'لا توجد نتائج تطابق خيارات البحث الحالية.'}
              </Text>
            </View>
          ) : (
            filteredVideos.map((video) => (
              <View key={video.id} style={[styles.videoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {/* Card Top: Delegate & Meta */}
                <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '18' }]}>
                    <Ionicons name="person" size={16} color={colors.primary} />
                  </View>

                  <View style={[styles.cardHeaderCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.cardDelegateName, { color: colors.textPrimary }]}>
                      {video.employee_name || 'توثيق عام للفرع'}
                    </Text>
                    <Text style={[styles.cardTimeText, { color: colors.textSecondary }]}>
                      {formatArabicRelativeTime(video.recorded_at)}
                    </Text>
                  </View>

                  {!!video.order_number && (
                    <View style={[styles.orderPill, { backgroundColor: '#0284c718' }]}>
                      <Text style={styles.orderPillText}>طلب #{video.order_number}</Text>
                    </View>
                  )}
                </View>

                {/* Big Visual Video Container with Centered Play Button */}
                <TouchableOpacity
                  style={styles.previewBox}
                  activeOpacity={0.88}
                  onPress={() => handlePlay(video.video_url)}
                >
                  <View style={styles.previewBackdrop}>
                    <View style={styles.bigPlayButton}>
                      <Ionicons name="play" size={30} color="#ffffff" style={{ marginLeft: 3 }} />
                    </View>
                    <Text style={styles.previewTapText}>اضغط لتشغيل الفيديو</Text>
                  </View>
                </TouchableOpacity>

                {/* Notes if any */}
                {!!video.notes && (
                  <Text style={[styles.cardNotes, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {video.notes}
                  </Text>
                )}

                {/* Card Bottom Actions */}
                <View style={[styles.cardActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[styles.primaryPlayBtn, { backgroundColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    onPress={() => handlePlay(video.video_url)}
                  >
                    <Ionicons name="play" size={16} color="#ffffff" />
                    <Text style={styles.primaryPlayBtnText}>مشاهدة الفيديو</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionIconBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}
                    onPress={() => {
                      setEditingVideo(video);
                      setEditOrderNumber(video.order_number || '');
                      setEditNotes(video.notes || '');
                    }}
                  >
                    <Ionicons name="create-outline" size={17} color={colors.textPrimary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionIconBtn, { backgroundColor: '#ef444415', borderColor: '#ef444430' }]}
                    onPress={() => handleDelete(video)}
                  >
                    <Ionicons name="trash-outline" size={17} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* ── HIGH PERFORMANCE VIDEO PLAYER MODAL ── */}
        <Modal visible={!!playingVideoUrl} transparent={false} animationType="fade" onRequestClose={() => setPlayingVideoUrl(null)}>
          <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
            <View style={[styles.playerHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity style={styles.playerCloseBtn} onPress={() => setPlayingVideoUrl(null)}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.playerTitle}>مشاهدة توثيق الفيديو</Text>
              <TouchableOpacity style={styles.externalBtn} onPress={handleOpenExternal}>
                <Ionicons name="open-outline" size={18} color="#f59e0b" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1, backgroundColor: '#000000' }}>
              {playingVideoUrl && <InAppVideoPlayer url={playingVideoUrl} />}
            </View>
          </SafeAreaView>
        </Modal>

        {/* ── EDIT VIDEO DETAILS MODAL ── */}
        <Modal visible={!!editingVideo} transparent animationType="fade" onRequestClose={() => setEditingVideo(null)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.modalHeaderTitle, { color: colors.textPrimary }]}>تعديل بيانات الفيديو</Text>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>رقم الطلب (اختياري)</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg }]}
                value={editOrderNumber}
                onChangeText={setEditOrderNumber}
                placeholder="مثال: 94821"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>الملاحظات</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg, height: 75 }]}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="اكتب ملاحظات التوثيق..."
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <View style={[styles.modalButtonsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveBtnText}>حفظ التعديلات</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setEditingVideo(null)}>
                  <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── RECORD & UPLOAD BOTTOM SHEET ── */}
        <Modal visible={showRecordSheet} transparent animationType="slide" onRequestClose={() => setShowRecordSheet(false)}>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
              <View style={[styles.recordReadyBadge, { backgroundColor: '#10b98118' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 13 }}>تم التقاط الفيديو وجاهز للرفع</Text>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>المندوب المرتبط بالفيديو</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 6 }}>
                {branchDelegates.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.delegatePill, selectedDelegateId === d.id && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => setSelectedDelegateId(d.id)}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: selectedDelegateId === d.id ? '#fff' : colors.textPrimary }}>{d.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>رقم الطلب</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg }]}
                value={newOrderNumber}
                onChangeText={setNewOrderNumber}
                placeholder="أدخل رقم الطلب إذا توفر"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 10 }]}>ملاحظات</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.bg, height: 70 }]}
                value={newNotes}
                onChangeText={setNewNotes}
                placeholder="تفاصيل التوثيق..."
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <View style={[styles.modalButtonsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]} onPress={handleSaveUpload} disabled={uploading}>
                  {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalSaveBtnText}>رفع وتأكيد التوثيق</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: colors.border }]} onPress={() => setShowRecordSheet(false)}>
                  <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  recordBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    gap: 5,
  },
  recordBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 10,
  },
  searchBox: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  chipsRow: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  videoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  cardHeaderRow: {
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeaderCol: {
    flex: 1,
  },
  cardDelegateName: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardTimeText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  orderPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderPillText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '800',
  },
  previewBox: {
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  previewBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    gap: 8,
  },
  bigPlayButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  previewTapText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardNotes: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  cardActionsRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  primaryPlayBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryPlayBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  actionIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerHeader: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  playerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  externalBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
    gap: 8,
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  modalButtonsRow: {
    gap: 10,
    marginTop: 14,
  },
  modalSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalCancelBtn: {
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  recordReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
  },
  delegatePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
});
