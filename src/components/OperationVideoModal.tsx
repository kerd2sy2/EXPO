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

// Arabic weekdays & month names helper
const ARABIC_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

function formatDateToYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatArabicDateLabel(ymd: string): string {
  if (!ymd) return '';
  const parts = ymd.split('-');
  if (parts.length !== 3) return ymd;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const dateObj = new Date(year, monthIdx, day);
  const weekday = ARABIC_WEEKDAYS[dateObj.getDay()];
  const monthName = ARABIC_MONTHS[monthIdx] || '';
  return `${weekday}، ${day} ${monthName} ${year}`;
}

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
  // Archive Data & State
  const [archiveVideos, setArchiveVideos] = useState<OperationVideo[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD

  // Calendar / Date Picker Bottom Sheet Modal State
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState<string>(''); // YYYY-MM

  // Record Proof Video Modal State
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateWithStatus | null>(null);
  const [showDelegatePicker, setShowDelegatePicker] = useState(false);
  const [delegateSearch, setDelegateSearch] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Generate 60 days history for calendar picker
  const availableDates = useMemo(() => {
    const list: { ymd: string; day: number; weekday: string; monthKey: string; monthLabel: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const ymd = formatDateToYMD(d);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = `${ARABIC_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      list.push({
        ymd,
        day: d.getDate(),
        weekday: ARABIC_WEEKDAYS[d.getDay()],
        monthKey,
        monthLabel,
      });
    }
    return list;
  }, []);

  // Distinct months within the 60-day range
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, string>();
    availableDates.forEach((item) => {
      if (!monthsMap.has(item.monthKey)) {
        monthsMap.set(item.monthKey, item.monthLabel);
      }
    });
    return Array.from(monthsMap.entries()).map(([key, label]) => ({ key, label }));
  }, [availableDates]);

  // Set default calendar month to current month if unset
  useEffect(() => {
    if (availableMonths.length > 0 && !selectedCalendarMonth) {
      setSelectedCalendarMonth(availableMonths[0].key);
    }
  }, [availableMonths, selectedCalendarMonth]);

  // Days for currently selected month in calendar
  const currentMonthDays = useMemo(() => {
    return availableDates.filter((item) => item.monthKey === selectedCalendarMonth);
  }, [availableDates, selectedCalendarMonth]);

  // Load Archive Videos from Backend
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
    if (visible) {
      fetchArchive();
    }
  }, [visible, dateFilter]);

  // Filter delegates in delegate picker
  const filteredDelegates = useMemo(() => {
    if (!delegateSearch.trim()) return branchDelegates;
    const q = delegateSearch.toLowerCase().trim();
    return branchDelegates.filter(
      (d) =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.employee_number || '').toLowerCase().includes(q)
    );
  }, [branchDelegates, delegateSearch]);

  // Filter local archive by search query & date filter
  const filteredArchive = useMemo(() => {
    return archiveVideos.filter((v) => {
      // Date filter check
      if (dateFilter) {
        const vDate = v.recorded_at ? formatDateToYMD(new Date(v.recorded_at)) : '';
        if (vDate !== dateFilter) return false;
      }
      // Search query check
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const emp = (v.employee_name || '').toLowerCase();
        const ord = (v.order_number || '').toLowerCase();
        const note = (v.notes || '').toLowerCase();
        if (!emp.includes(q) && !ord.includes(q) && !note.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [archiveVideos, searchQuery, dateFilter]);

  // Launch Camera (Silent, Compressed 480p, Rear Camera)
  const handleLaunchCamera = async () => {
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
        setRecordedVideoUri(result.assets[0].uri);
        setShowRecordModal(true);
      }
    } catch (err: any) {
      Alert.alert('خطأ بالكاميرا', err?.message || 'فشل فتح الكاميرا لتسجيل الفيديو');
    }
  };

  // Upload Video to Backend
  const handleUploadVideo = async () => {
    if (!recordedVideoUri) {
      Alert.alert('تنبيه', 'يرجى تسجيل الفيديو أولاً قبل الحفظ.');
      return;
    }

    try {
      setUploading(true);
      const empName = selectedDelegate?.name || 'توثيق عام للفرع';
      await supervisorApi.uploadOperationVideo({
        videoUri: recordedVideoUri,
        employeeId: selectedDelegate?.id,
        employeeName: empName,
        orderNumber: orderNumber.trim(),
        notes: notes.trim() || `توثيق مراجعة وردية - طلبات: ${orderNumber}`,
      });

      Alert.alert('تم بنجاح', 'تم رفع الفيديو وحفظه في أرشيف السيرفر لمدة 60 يوماً بنجاح.');
      setShowRecordModal(false);
      setRecordedVideoUri(null);
      setSelectedDelegate(null);
      setOrderNumber('');
      setNotes('');
      fetchArchive();
      onRefresh?.();
    } catch (err: any) {
      Alert.alert('خطأ في الرفع', err?.message || 'فشل رفع الفيديو إلى السيرفر');
    } finally {
      setUploading(false);
    }
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

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        {/* ── HEADER IDENTICAL TO "لوحة مؤشرات الفرع" ── */}
        <View style={[styles.subPageHeaderContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.subPageHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[
                styles.headerBackBtn,
                { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border },
              ]}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={22}
                color={colors.textPrimary}
              />
            </TouchableOpacity>

            <View style={[styles.subPageTitleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                مراجعة الفيديوهات
              </Text>
              <View style={[styles.titleUnderlineBar, { backgroundColor: colors.primary }]} />
              <Text style={[styles.subPageHeaderSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                أرشيف وفيديوهات التوثيق • حفظ تلقائي 60 يوماً
              </Text>
            </View>

            {/* Quick Action: Record proof video */}
            <TouchableOpacity
              style={[styles.headerCameraBtn, { backgroundColor: colors.primary }]}
              onPress={handleLaunchCamera}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="videocam" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── SEARCH & CALENDAR DATE FILTER BAR ── */}
        <View style={[styles.filterBarContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {/* Search Input */}
          <View style={[styles.searchBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder="ابحث بالاسم، رقم الطلب، الملاحظة..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Calendar Picker Trigger Button */}
          <TouchableOpacity
            style={[
              styles.calendarFilterBtn,
              {
                backgroundColor: dateFilter ? `${colors.primary}15` : colors.bg,
                borderColor: dateFilter ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setShowDatePickerModal(true)}
          >
            <Ionicons
              name={dateFilter ? 'calendar' : 'calendar-outline'}
              size={18}
              color={dateFilter ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.calendarFilterBtnText,
                { color: dateFilter ? colors.primary : colors.textPrimary, fontWeight: dateFilter ? '800' : '600' },
              ]}
              numberOfLines={1}
            >
              {dateFilter ? formatArabicDateLabel(dateFilter) : 'التقويم (تحديد اليوم)'}
            </Text>
            {dateFilter ? (
              <TouchableOpacity
                onPress={() => setDateFilter('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color={colors.primary} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Active Filter Summary Strip */}
        <View style={[styles.activeFilterStrip, { backgroundColor: colors.bg }]}>
          <Text style={[styles.filterCountText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {dateFilter
              ? `فيديوهات يوم (${formatArabicDateLabel(dateFilter)}): ${filteredArchive.length} فيديو`
              : `إجمالي فيديوهات الأرشيف: ${filteredArchive.length} فيديو (آخر 60 يوماً)`}
          </Text>

          <TouchableOpacity style={styles.refreshBtn} onPress={fetchArchive}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>تحديث</Text>
          </TouchableOpacity>
        </View>

        {/* ── VIDEOS ARCHIVE LIST ── */}
        {loadingArchive ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loaderText, { color: colors.textSecondary }]}>جاري تحميل فيديوهات الأرشيف...</Text>
          </View>
        ) : filteredArchive.length === 0 ? (
          <View style={styles.emptyCenter}>
            <Ionicons
              name={dateFilter || searchQuery ? 'search-outline' : 'film-outline'}
              size={54}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {dateFilter
                ? `لا توجد فيديوهات مسجلة لتاريخ ${formatArabicDateLabel(dateFilter)}`
                : searchQuery
                ? `لا توجد نتائج مطابقة لـ "${searchQuery}"`
                : 'لا توجد فيديوهات مسجلة بالأرشيف'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {dateFilter
                ? 'يمكنك اختيار يوم آخر من التقويم أو الضغط على "عرض الكل"'
                : 'أي فيديو يتم توثيقه بالفرع يظهر هنا تلقائياً لمدة 60 يوماً مع إمكانية التشغيل والمراجعة.'}
            </Text>

            {dateFilter ? (
              <TouchableOpacity
                style={[styles.clearFilterActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => setDateFilter('')}
              >
                <Ionicons name="calendar-outline" size={16} color="#fff" />
                <Text style={styles.clearFilterActionText}>عرض فيديوهات كافة الأيام</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.clearFilterActionBtn, { backgroundColor: colors.primary }]}
                onPress={handleLaunchCamera}
              >
                <Ionicons name="videocam" size={16} color="#fff" />
                <Text style={styles.clearFilterActionText}>تسجيل وتوثيق فيديو جديد</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.archiveList} showsVerticalScrollIndicator={false}>
            {filteredArchive.map((video) => {
              const formattedDate = new Date(video.recorded_at).toLocaleDateString('ar-SA', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <View
                  key={video.id}
                  style={[styles.videoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  {/* Top Info */}
                  <View style={[styles.videoCardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.videoCardHeader}>
                      <Text
                        style={[
                          styles.videoEmployeeName,
                          { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                        ]}
                      >
                        {video.employee_name || 'توثيق عام للفرع'}
                      </Text>
                      <Text
                        style={[
                          styles.videoDate,
                          { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                        ]}
                      >
                        {formattedDate}
                      </Text>
                    </View>

                    {/* Retention Days Left Badge */}
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

                  {/* Order Tag & Notes */}
                  {video.order_number ? (
                    <View
                      style={[
                        styles.orderTag,
                        { backgroundColor: '#3b82f615', flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                    >
                      <Ionicons name="receipt-outline" size={14} color="#2563eb" />
                      <Text style={[styles.orderTagText, { color: '#2563eb' }]}>
                        الطلبات: {video.order_number}
                      </Text>
                    </View>
                  ) : null}

                  {video.notes ? (
                    <Text
                      style={[
                        styles.videoNotes,
                        { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                      ]}
                    >
                      {video.notes}
                    </Text>
                  ) : null}

                  {/* Action Buttons */}
                  <View style={[styles.videoActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                      style={[styles.playVideoBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handlePlayVideo(video.video_url)}
                    >
                      <Ionicons name="play" size={16} color="#fff" />
                      <Text style={styles.playVideoBtnText}>مشاهدة وتشغيل الفيديو</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.deleteVideoBtn, { borderColor: '#ef4444', backgroundColor: '#ef444410' }]}
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

        {/* ── BOTTOM SHEET CALENDAR MODAL (موديولا التقويم لآخر شهرين) ── */}
        <Modal
          visible={showDatePickerModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePickerModal(false)}
        >
          <View style={styles.calendarModalOverlay}>
            <View style={[styles.calendarModalCard, { backgroundColor: colors.card }]}>
              {/* Calendar Modal Header */}
              <View style={[styles.calendarModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[styles.calendarModalTitle, { color: colors.textPrimary }]}>
                    تقويم مراجعة الفيديوهات
                  </Text>
                  <Text style={[styles.calendarModalSub, { color: colors.textSecondary }]}>
                    اختر يوماً محدداً لمراجعة تسجيلاته (فترة الحفظ 60 يوماً)
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowDatePickerModal(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Quick Presets */}
              <View style={styles.presetsWrapper}>
                <Text style={[styles.presetsSectionTitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  فلاتر سريعة:
                </Text>
                <View style={[styles.presetsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: !dateFilter ? colors.primary : colors.bg,
                        borderColor: !dateFilter ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setDateFilter('');
                      setShowDatePickerModal(false);
                    }}
                  >
                    <Text style={[styles.presetChipText, { color: !dateFilter ? '#fff' : colors.textPrimary }]}>
                      عرض كل الأيام
                    </Text>
                  </TouchableOpacity>

                  {availableDates.length > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: dateFilter === availableDates[0].ymd ? colors.primary : colors.bg,
                          borderColor: dateFilter === availableDates[0].ymd ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setDateFilter(availableDates[0].ymd);
                        setShowDatePickerModal(false);
                      }}
                    >
                      <Text style={[styles.presetChipText, { color: dateFilter === availableDates[0].ymd ? '#fff' : colors.textPrimary }]}>
                        اليوم
                      </Text>
                    </TouchableOpacity>
                  )}

                  {availableDates.length > 1 && (
                    <TouchableOpacity
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: dateFilter === availableDates[1].ymd ? colors.primary : colors.bg,
                          borderColor: dateFilter === availableDates[1].ymd ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        setDateFilter(availableDates[1].ymd);
                        setShowDatePickerModal(false);
                      }}
                    >
                      <Text style={[styles.presetChipText, { color: dateFilter === availableDates[1].ymd ? '#fff' : colors.textPrimary }]}>
                        أمس
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Month Selector Tabs */}
              <View style={[styles.monthsTabsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {availableMonths.map((m) => {
                  const isSelected = selectedCalendarMonth === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      style={[
                        styles.monthTabBtn,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.bg,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => setSelectedCalendarMonth(m.key)}
                    >
                      <Text
                        style={[
                          styles.monthTabText,
                          { color: isSelected ? '#fff' : colors.textPrimary, fontWeight: isSelected ? '800' : '600' },
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Days List for the selected Month */}
              <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
                <View style={[styles.daysGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {currentMonthDays.map((item) => {
                    const isSelected = dateFilter === item.ymd;
                    return (
                      <TouchableOpacity
                        key={item.ymd}
                        style={[
                          styles.dayCard,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.bg,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                        onPress={() => {
                          setDateFilter(item.ymd);
                          setShowDatePickerModal(false);
                        }}
                      >
                        <Text style={[styles.dayCardNumber, { color: isSelected ? '#fff' : colors.textPrimary }]}>
                          {item.day}
                        </Text>
                        <Text style={[styles.dayCardWeekday, { color: isSelected ? '#fff' : colors.textSecondary }]}>
                          {item.weekday}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Modal Footer */}
              <View style={[styles.calendarModalFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.resetCalendarBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    setDateFilter('');
                    setShowDatePickerModal(false);
                  }}
                >
                  <Text style={[styles.resetCalendarBtnText, { color: colors.textSecondary }]}>إلغاء التصفية</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.closeCalendarBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowDatePickerModal(false)}
                >
                  <Text style={styles.closeCalendarBtnText}>تم</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ── RECORD & UPLOAD VIDEO MODAL ── */}
        <Modal
          visible={showRecordModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowRecordModal(false)}
        >
          <View style={styles.calendarModalOverlay}>
            <View style={[styles.calendarModalCard, { backgroundColor: colors.card, maxHeight: '90%' }]}>
              <View style={[styles.calendarModalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[styles.calendarModalTitle, { color: colors.textPrimary }]}>
                    حفظ وتوثيق الفيديو
                  </Text>
                  <Text style={[styles.calendarModalSub, { color: colors.textSecondary }]}>
                    تسجيل صامت بجودة مضغوطة • حفظ لمدة 60 يوماً
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowRecordModal(false)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Video ready banner */}
                <View style={[styles.videoReadyBadge, { backgroundColor: '#10b98115', borderColor: '#10b98140' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text style={[styles.videoReadyText, { color: '#059669' }]}>
                    تم تسجيل الفيديو بنجاح وجاهز للرفع على السيرفر
                  </Text>
                </View>

                {/* Delegate Selector (Optional) */}
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  المندوب (اختياري)
                </Text>
                <TouchableOpacity
                  style={[styles.pickerTrigger, { backgroundColor: colors.bg, borderColor: colors.border }]}
                  onPress={() => setShowDelegatePicker(!showDelegatePicker)}
                >
                  <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
                  <Text
                    style={[
                      styles.pickerTriggerText,
                      { color: selectedDelegate ? colors.textPrimary : colors.textSecondary },
                    ]}
                  >
                    {selectedDelegate ? selectedDelegate.name : 'اختر المندوب إن وُجد...'}
                  </Text>
                  {selectedDelegate && (
                    <TouchableOpacity
                      onPress={() => setSelectedDelegate(null)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
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
                    <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled>
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
                          <Text style={[styles.delegateItemCode, { color: colors.textSecondary }]}>
                            {d.employee_number}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Order Number Input */}
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', marginTop: 14 },
                  ]}
                >
                  عدد الطلبات المعتمد أو رقم الطلب
                </Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  placeholder="مثلاً: 16"
                  placeholderTextColor={colors.textSecondary}
                  value={orderNumber}
                  onChangeText={setOrderNumber}
                  keyboardType="numeric"
                />

                {/* Notes Input */}
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', marginTop: 14 },
                  ]}
                >
                  ملاحظات التوثيق
                </Text>
                <TextInput
                  style={[
                    styles.inputField,
                    styles.textAreaField,
                    {
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  placeholder="أي ملاحظات حول مراجعة الوردية أو التوثيق..."
                  placeholderTextColor={colors.textSecondary}
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />

                {/* Submit Video Upload Button */}
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                  onPress={handleUploadVideo}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={20} color="#fff" />
                      <Text style={styles.submitBtnText}>حفظ الفيديو في الأرشيف (60 يوماً)</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Sub-page header matching "لوحة مؤشرات الفرع"
  subPageHeaderContainer: {
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  subPageHeaderRow: {
    alignItems: 'center',
    gap: 12,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  subPageTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  subPageHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  titleUnderlineBar: {
    width: 34,
    height: 3,
    borderRadius: 2,
    marginTop: 4,
  },
  subPageHeaderSub: {
    fontSize: 11,
    marginTop: 3,
  },
  headerCameraBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Filter Bar
  filterBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  calendarFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  calendarFilterBtnText: {
    flex: 1,
    fontSize: 13,
  },

  // Active filter strip
  activeFilterStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  // Archive List
  archiveList: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  videoCard: {
    borderRadius: 16,
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
    fontWeight: '800',
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderTagText: {
    fontSize: 12,
    fontWeight: '700',
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

  // Loaders & Empty states
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
    padding: 30,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  clearFilterActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  clearFilterActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Calendar Modal Bottom Sheet
  calendarModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  calendarModalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '85%',
  },
  calendarModalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  calendarModalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  presetsWrapper: {
    marginBottom: 12,
    gap: 6,
  },
  presetsSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  presetsRow: {
    gap: 8,
    flexWrap: 'wrap',
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthsTabsRow: {
    gap: 8,
    marginBottom: 12,
  },
  monthTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  monthTabText: {
    fontSize: 13,
  },
  daysGrid: {
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  dayCard: {
    width: '18%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  dayCardNumber: {
    fontSize: 15,
    fontWeight: '800',
  },
  dayCardWeekday: {
    fontSize: 10,
    marginTop: 2,
  },
  calendarModalFooter: {
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#6B728030',
  },
  resetCalendarBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  resetCalendarBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  closeCalendarBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  closeCalendarBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },

  // Record Proof Modal Inside
  videoReadyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  videoReadyText: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
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
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
