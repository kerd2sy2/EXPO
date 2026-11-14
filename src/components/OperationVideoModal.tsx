import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  Modal,
  Alert,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { ThemeColors } from '@shared/theme';
import { WorkSession } from '@shared/types';
import { formatImageUrl, getStoredToken } from '../services/api';
import { supervisorApi, OperationVideo, DelegateWithStatus } from '../services/supervisor';
import { ModuleErrorBoundary } from './ModuleErrorBoundary';
import { DateFilterType, filterOperationVideos } from './operation-video/operationVideoHelpers';
import { operationVideoStyles as styles } from './operation-video/operationVideoStyles';
import { OperationVideoCard } from './operation-video/OperationVideoCard';
import { OperationVideoSubModals } from './operation-video/OperationVideoSubModals';

export interface OperationVideoModalProps {
  visible: boolean;
  onClose: () => void;
  branchDelegates: DelegateWithStatus[];
  pendingSessions?: WorkSession[];
  onRefresh?: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL?: boolean;
}

/** Full-screen cloud archive modal for recording, reviewing, editing, and deleting operation videos. */
export const OperationVideoModal: React.FC<OperationVideoModalProps> = ({
  visible,
  onClose,
  branchDelegates,
  colors,
  isDarkMode,
  isRTL = true,
}) => {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0);

  const [archiveVideos, setArchiveVideos] = useState<OperationVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DateFilterType>('TODAY');

  const [playingVideoUrl, setPlayingVideoUrl] = useState<string | null>(null);
  const [editingVideo, setEditingVideo] = useState<OperationVideo | null>(null);
  const [editOrderNumber, setEditOrderNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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
    if (visible) fetchVideos();
  }, [visible, fetchVideos]);

  const filteredVideos = useMemo(
    () => filterOperationVideos(archiveVideos, searchQuery, filterType),
    [archiveVideos, searchQuery, filterType]
  );

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
    Alert.alert('حذف توثيق الفيديو', 'هل أنت متأكد من حذف هذا الفيديو نهائياً؟', [
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
    ]);
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
        prev.map((v) => (v.id === editingVideo.id ? { ...v, order_number: editOrderNumber.trim(), notes: editNotes.trim() } : v))
      );
      setEditingVideo(null);
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل تحديث الفيديو');
    } finally {
      setSavingEdit(false);
    }
  };

  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModuleErrorBoundary moduleName="OperationVideoModal" colors={colors}>
        <View style={[styles.container, { backgroundColor: colors.bg, paddingTop: topPadding }]}>
          <View style={[styles.headerRow, { backgroundColor: colors.card, borderBottomColor: colors.border, flexDirection: rowDir }]}>
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={[styles.titleCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>توثيق ومراجعة الفيديوهات</Text>
              <Text style={[styles.headerSub, { color: colors.textSecondary }]}>أرشيف التوثيق الميداني السحابي</Text>
            </View>

            <TouchableOpacity
              style={[styles.recordBtn, { backgroundColor: colors.primary, flexDirection: rowDir }]}
              onPress={handleRecordNew}
              activeOpacity={0.8}
            >
              <Ionicons name="videocam" size={17} color="#ffffff" />
              <Text style={styles.recordBtnText}>توثيق جديد</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.searchBarWrapper, { backgroundColor: colors.card }]}>
            <View
              style={[
                styles.searchBox,
                { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border, flexDirection: rowDir },
              ]}
            >
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

            <View style={[styles.chipsRow, { flexDirection: rowDir }]}>
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
                <Text style={[styles.chipText, { color: filterType === 'ALL' ? '#ffffff' : colors.textPrimary }]}>
                  جميع الفيديوهات ({archiveVideos.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <ModuleErrorBoundary moduleName="OperationVideoList" colors={colors}>
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
                    {filterType === 'TODAY' ? 'لم يتم تسجيل فيديوهات توثيق اليوم حتى الآن.' : 'لا توجد نتائج تطابق خيارات البحث الحالية.'}
                  </Text>
                </View>
              ) : (
                filteredVideos.map((video) => (
                  <OperationVideoCard
                    key={video.id}
                    video={video}
                    onPlay={handlePlay}
                    onEdit={(v) => {
                      setEditingVideo(v);
                      setEditOrderNumber(v.order_number || '');
                      setEditNotes(v.notes || '');
                    }}
                    onDelete={handleDelete}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    isRTL={isRTL}
                  />
                ))
              )}
            </ScrollView>
          </ModuleErrorBoundary>

          <OperationVideoSubModals
            playingVideoUrl={playingVideoUrl}
            onClosePlayer={() => setPlayingVideoUrl(null)}
            onOpenExternal={handleOpenExternal}
            editingVideo={editingVideo}
            editOrderNumber={editOrderNumber}
            editNotes={editNotes}
            savingEdit={savingEdit}
            onChangeEditOrder={setEditOrderNumber}
            onChangeEditNotes={setEditNotes}
            onSaveEdit={handleSaveEdit}
            onCloseEdit={() => setEditingVideo(null)}
            showRecordSheet={showRecordSheet}
            branchDelegates={branchDelegates}
            selectedDelegateId={selectedDelegateId}
            newOrderNumber={newOrderNumber}
            newNotes={newNotes}
            uploading={uploading}
            onSelectDelegate={setSelectedDelegateId}
            onChangeNewOrder={setNewOrderNumber}
            onChangeNewNotes={setNewNotes}
            onSaveUpload={handleSaveUpload}
            onCloseRecordSheet={() => setShowRecordSheet(false)}
            colors={colors}
            isRTL={isRTL}
          />
        </View>
      </ModuleErrorBoundary>
    </Modal>
  );
};
