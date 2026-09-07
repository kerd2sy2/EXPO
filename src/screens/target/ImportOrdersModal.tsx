import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { ExcelImportPreview } from '../../types/target';
import { targetApi } from '../../services/targetApi';

interface ImportOrdersModalProps {
  visible: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  isDarkMode?: boolean;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const getYesterdayFormatted = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getTodayFormatted = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getTwoDaysAgoFormatted = () => {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatArabicDisplayDate = (dateStr: string) => {
  if (!dateStr || dateStr.length < 10) return dateStr || 'غير محدد';
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  return `${d} ${ARABIC_MONTHS[m] || ''} ${y}`;
};

export const ImportOrdersModal: React.FC<ImportOrdersModalProps> = ({
  visible,
  onClose,
  onImportSuccess,
  isDarkMode = false,
}) => {
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    mimeType?: string;
    file?: any;
  } | null>(null);

  const [customDate, setCustomDate] = useState(getYesterdayFormatted());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [pickerMonthIdx, setPickerMonthIdx] = useState(() => new Date().getMonth());
  const [pickerDay, setPickerDay] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getDate();
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<ExcelImportPreview | null>(null);
  const [showRowsPreview, setShowRowsPreview] = useState(false);
  const [dedupAction, setDedupAction] = useState<
    'IGNORE_DUPLICATES' | 'REPLACE_DUPLICATES' | 'CANCEL'
  >('IGNORE_DUPLICATES');

  const daysInPickerMonth = new Date(pickerYear, pickerMonthIdx + 1, 0).getDate();

  const handlePickFile = async () => {
    // 1. Web Browser Support (Direct HTML5 File Input)
    if (Platform.OS === 'web') {
      try {
        if (typeof document !== 'undefined') {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel';
          input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (file) {
              const fileObj = {
                uri: URL.createObjectURL(file),
                name: file.name,
                mimeType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                file: file,
              };
              setSelectedFile(fileObj);
              setPreview(null);
              analyzeFile(fileObj);
            }
          };
          input.click();
          return;
        }
      } catch (err: any) {
        Alert.alert('خطأ', 'تعذر فتح مستعرض الملفات: ' + err.message);
        return;
      }
    }

    // 2. Mobile Native Device Files Picker (Direct Native Storage Access)
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'application/*',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const fileObj = {
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          file: (file as any).file,
        };
        setSelectedFile(fileObj);
        setPreview(null);
        analyzeFile(fileObj);
      }
    } catch (err: any) {
      Alert.alert('مستكشف ملفات الهاتف', 'تعذر فتح ملفات الهاتف: ' + (err?.message || 'يرجى المحاولة مرة أخرى'));
    }
  };

  const analyzeFile = async (fileToAnalyze = selectedFile, dateOverride = customDate) => {
    if (!fileToAnalyze) {
      Alert.alert('تنبيه', 'يرجى اختيار ملف إكسل أولاً');
      return;
    }

    try {
      setAnalyzing(true);
      const res = await targetApi.previewExcel(fileToAnalyze, dateOverride);
      setPreview(res);
      setShowRowsPreview(false);
      if (res.order_date && !customDate) {
        setCustomDate(res.order_date);
      }
    } catch (err: any) {
      Alert.alert('خطأ في فحص الملف', err.message || 'تعذر قراءة بيانات الملف');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || !selectedFile) return;

    if (preview.has_duplicates && dedupAction === 'CANCEL') {
      Alert.alert('تنبيه', 'تم إلغاء العملية بناءً على اختيارك');
      return;
    }

    try {
      setConfirming(true);
      const res = await targetApi.confirmExcel({
        file_name: preview.file_name,
        order_date: customDate || preview.order_date,
        deduplication_action: dedupAction,
        rows: preview.rows,
      });

      Alert.alert('تم الحفظ بنجاح', res.message, [
        {
          text: 'حسناً',
          onPress: () => {
            resetState();
            onImportSuccess();
            onClose();
          },
        },
      ]);
    } catch (err: any) {
      Alert.alert('خطأ في الحفظ', err.message || 'فشل في حفظ البيانات');
    } finally {
      setConfirming(false);
    }
  };

  const handlePrevPickerMonth = () => {
    if (pickerMonthIdx === 0) {
      setPickerYear(y => y - 1);
      setPickerMonthIdx(11);
    } else {
      setPickerMonthIdx(m => m - 1);
    }
  };

  const handleNextPickerMonth = () => {
    if (pickerMonthIdx === 11) {
      setPickerYear(y => y + 1);
      setPickerMonthIdx(0);
    } else {
      setPickerMonthIdx(m => m + 1);
    }
  };

  const handleQuickSelectDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      setPickerYear(parseInt(parts[0], 10));
      setPickerMonthIdx(parseInt(parts[1], 10) - 1);
      setPickerDay(parseInt(parts[2], 10));
    }
    setCustomDate(dateStr);
    setShowDatePicker(false);
    if (selectedFile) {
      analyzeFile(selectedFile, dateStr);
    }
  };

  const handleApplyPickedDate = () => {
    const validDay = Math.min(pickerDay, daysInPickerMonth);
    const dayStr = String(validDay).padStart(2, '0');
    const monthStr = String(pickerMonthIdx + 1).padStart(2, '0');
    const fullDateStr = `${pickerYear}-${monthStr}-${dayStr}`;
    setCustomDate(fullDateStr);
    setShowDatePicker(false);
    if (selectedFile) {
      analyzeFile(selectedFile, fullDateStr);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setPreview(null);
    setShowRowsPreview(false);
    setCustomDate(getYesterdayFormatted());
    setDedupAction('IGNORE_DUPLICATES');
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, isDarkMode && styles.darkContainer]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#1e293b'} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, isDarkMode && styles.darkText]}>استيراد طلبات الإكسل اليومية</Text>
              <Text style={styles.subtitle}>رفع ومعاينة طلبات المعرفين والمندوبين</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* File Picker Section */}
            <View style={[styles.pickerCard, isDarkMode && styles.darkCard]}>
              <Ionicons name="document-text-outline" size={36} color="#f97316" />
              {selectedFile ? (
                <View style={styles.fileSelectedBox}>
                  <Text style={[styles.fileNameText, isDarkMode && styles.darkText]} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <TouchableOpacity style={styles.repickBtn} onPress={handlePickFile}>
                    <Text style={styles.repickBtnText}>تغيير الملف</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.emptyPickerBox}>
                  <Text style={[styles.pickerPromptText, isDarkMode && styles.darkText]}>
                    اضغط لاختيار ملف إكسل (.xlsx)
                  </Text>
                  <Text style={styles.pickerHintText}>مثل ملف: 3-9-2026.xlsx</Text>
                  <TouchableOpacity style={styles.pickBtn} onPress={handlePickFile}>
                    <Feather name="upload" size={18} color="#fff" />
                    <Text style={styles.pickBtnText}>اختيار الملف</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Date Selector Box */}
            {selectedFile && (
              <View style={[styles.dateBox, isDarkMode && styles.darkCard]}>
                <View style={styles.dateHeaderRow}>
                  <Text style={styles.dateLabel}>تاريخ الطلبات المعتمد في الملف:</Text>
                  <View style={styles.defaultTag}>
                    <Text style={styles.defaultTagText}>تقرير يوم أمس</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.datePickerBtn, isDarkMode && styles.darkDatePickerBtn]}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.datePickerLeft}>
                    <View style={styles.editDateBadge}>
                      <Feather name="calendar" size={14} color="#f97316" />
                      <Text style={styles.editDateBadgeText}>تغيير التاريخ</Text>
                    </View>
                  </View>
                  <View style={styles.datePickerRight}>
                    <Text style={[styles.dateDisplayArabic, isDarkMode && styles.darkText]}>
                      {formatArabicDisplayDate(customDate)}
                    </Text>
                    <Text style={styles.dateDisplayIso}>({customDate})</Text>
                  </View>
                </TouchableOpacity>

                <Text style={styles.dateHint}>
                  * اضغط على التاريخ لاختيار تاريخ آخر من القائمة المنبثقة إذا لزم الأمر.
                </Text>
              </View>
            )}

            {/* Analyzing Indicator */}
            {analyzing && (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#f97316" />
                <Text style={styles.loadingText}>جارٍ قراءة وفحص ملف الإكسل واكتشاف التكرار...</Text>
              </View>
            )}

            {/* Preview Results */}
            {preview && !analyzing && (
              <View style={styles.previewSection}>
                {/* Stats Chips */}
                <View style={styles.statsRow}>
                  <View style={[styles.statBadge, isDarkMode && styles.darkCard]}>
                    <Text style={styles.statBadgeNum}>{preview.total_rows}</Text>
                    <Text style={styles.statBadgeLabel}>عدد الصفوف</Text>
                  </View>
                  <View style={[styles.statBadge, isDarkMode && styles.darkCard]}>
                    <Text style={[styles.statBadgeNum, { color: '#f97316' }]}>{preview.total_orders}</Text>
                    <Text style={styles.statBadgeLabel}>إجمالي الطلبات</Text>
                  </View>
                  <View style={[styles.statBadge, isDarkMode && styles.darkCard]}>
                    <Text style={styles.statBadgeNum}>{preview.identifiers_count}</Text>
                    <Text style={styles.statBadgeLabel}>المعرفين</Text>
                  </View>
                  <View style={[styles.statBadge, isDarkMode && styles.darkCard]}>
                    <Text style={styles.statBadgeNum}>{preview.drivers_count}</Text>
                    <Text style={styles.statBadgeLabel}>المندوبين</Text>
                  </View>
                </View>

                {/* Duplicates Warning & Actions */}
                {preview.has_duplicates && (
                  <View style={styles.dupWarningCard}>
                    <View style={styles.dupWarningHeader}>
                      <Ionicons name="warning-outline" size={22} color="#b45309" />
                      <Text style={styles.dupWarningTitle}>
                        تنبيه: تم اكتشاف {preview.duplicates_count} طلب مكرر لنفس التاريخ!
                      </Text>
                    </View>
                    <Text style={styles.dupWarningSub}>
                      يرجى تحديد الإجراء المطلوب للتعامل مع السجلات المكررة:
                    </Text>

                    <View style={styles.dupActionsRow}>
                      <TouchableOpacity
                        style={[
                          styles.dupActionPill,
                          dedupAction === 'IGNORE_DUPLICATES' && styles.dupActionActive,
                        ]}
                        onPress={() => setDedupAction('IGNORE_DUPLICATES')}
                      >
                        <Text
                          style={[
                            styles.dupActionText,
                            dedupAction === 'IGNORE_DUPLICATES' && styles.dupActionTextActive,
                          ]}
                        >
                          تجاهل المكرر
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.dupActionPill,
                          dedupAction === 'REPLACE_DUPLICATES' && styles.dupActionActive,
                        ]}
                        onPress={() => setDedupAction('REPLACE_DUPLICATES')}
                      >
                        <Text
                          style={[
                            styles.dupActionText,
                            dedupAction === 'REPLACE_DUPLICATES' && styles.dupActionTextActive,
                          ]}
                        >
                          استبدال البيانات
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.dupActionPill,
                          dedupAction === 'CANCEL' && styles.dupActionCancelActive,
                        ]}
                        onPress={() => setDedupAction('CANCEL')}
                      >
                        <Text
                          style={[
                            styles.dupActionText,
                            dedupAction === 'CANCEL' && styles.dupActionTextActive,
                          ]}
                        >
                          إلغاء العملية
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Empty Identifiers Warnings */}
                {((preview.empty_identifiers_count ?? 0) > 0 || (preview.warnings && preview.warnings.length > 0)) && (
                  <View style={styles.emptyIdentWarningCard}>
                    <View style={styles.emptyIdentWarningHeader}>
                      <Ionicons name="alert-circle-outline" size={22} color="#c2410c" />
                      <Text style={styles.emptyIdentWarningTitle}>
                        تنبيه: يوجد {preview.empty_identifiers_count || preview.warnings?.length} صف بدون اسم معرف!
                      </Text>
                    </View>
                    <Text style={styles.emptyIdentWarningSub}>
                      تم ترك المعرف فارغاً كما هو في ملف الإكسل دون استبداله باسم المندوب.
                    </Text>
                  </View>
                )}

                {/* Actions & Preview Dropdown Section */}
                <View style={styles.actionButtonsContainer}>
                  {/* Primary Save Button: Directly available without scrolling */}
                  <TouchableOpacity
                    style={[styles.confirmBtn, confirming && styles.disabledBtn]}
                    onPress={handleConfirm}
                    disabled={confirming}
                    activeOpacity={0.8}
                  >
                    {confirming ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="cloud-upload" size={20} color="#fff" />
                        <Text style={styles.confirmBtnText}>حفظ في قاعدة البيانات</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Dropdown Toggle Button for Preview */}
                  <TouchableOpacity
                    style={[
                      styles.previewDropdownBtn,
                      isDarkMode && styles.darkPreviewDropdownBtn,
                      showRowsPreview && styles.previewDropdownBtnActive,
                    ]}
                    onPress={() => setShowRowsPreview(!showRowsPreview)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.previewDropdownContent}>
                      <View style={styles.previewDropdownLeft}>
                        <Ionicons
                          name={showRowsPreview ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={showRowsPreview ? '#f97316' : (isDarkMode ? '#94a3b8' : '#64748b')}
                        />
                        <Text style={[styles.previewDropdownHint, isDarkMode && styles.darkTextSecondary]}>
                          {showRowsPreview ? 'إغلاق المعاينة' : 'اضغط للعرض'}
                        </Text>
                      </View>

                      <View style={styles.previewDropdownRight}>
                        <Ionicons
                          name={showRowsPreview ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color={showRowsPreview ? '#f97316' : (isDarkMode ? '#f8fafc' : '#1e293b')}
                        />
                        <Text style={[styles.previewDropdownTitle, isDarkMode && styles.darkText, showRowsPreview && { color: '#f97316' }]}>
                          معاينة تفاصيل البيانات ({preview.rows.length} صف)
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Collapsible Rows Preview (قائمة منسدلة للمعاينة) */}
                {showRowsPreview && (
                  <View style={styles.collapsibleRowsWrapper}>
                    <Text style={[styles.tableSectionTitle, isDarkMode && styles.darkText]}>
                      الصفوف المستخرجة من الإكسل:
                    </Text>
                    {preview.rows.map((row, idx) => {
                      const isNinja = row.app?.includes('نينجا');
                      const isKeeta = row.app?.includes('كيتا') || row.app?.includes('كينتا');
                      const isToyo = row.app?.includes('تويو');
                      const hasEmptyIdent = !row.identifier || row.identifier.trim() === '';

                      return (
                        <View
                          key={idx}
                          style={[
                            styles.rowCard,
                            isDarkMode && styles.darkCard,
                            row.is_duplicate && styles.dupRowCard,
                            hasEmptyIdent && styles.emptyIdentRowCard,
                          ]}
                        >
                          <View style={styles.rowTop}>
                            <View style={styles.rowMeta}>
                              <Text style={[styles.rowIdent, isDarkMode && styles.darkText, hasEmptyIdent && styles.emptyIdentText]}>
                                {hasEmptyIdent ? '⚠️ المعرف: (فارغ)' : `المعرف: ${row.identifier}`}
                              </Text>
                              <Text style={styles.rowDriver}>المندوب: {row.driver_name}</Text>
                            </View>
                            <View style={styles.ordersBadge}>
                              <Text style={styles.ordersBadgeText}>{row.total_orders} طلب</Text>
                            </View>
                          </View>

                          <View style={styles.rowBottom}>
                            <View style={[
                              styles.appBadge,
                              isNinja && styles.appBadgeNinja,
                              isKeeta && styles.appBadgeKeeta,
                              isToyo && styles.appBadgeToyo,
                            ]}>
                              <Text style={[
                                styles.appBadgeText,
                                isNinja && styles.appBadgeNinjaText,
                                isKeeta && styles.appBadgeKeetaText,
                                isToyo && styles.appBadgeToyoText,
                              ]}>
                                {row.app || 'غير محدد'}
                              </Text>
                            </View>
                            {row.branch ? (
                              <View style={[styles.appBadge, { backgroundColor: '#e0f2fe' }]}>
                                <Text style={[styles.appBadgeText, { color: '#0369a1' }]}>
                                  فرع {row.branch}
                                </Text>
                              </View>
                            ) : null}
                            {row.plate_number ? <Text style={styles.rowSub}>اللوحة: {row.plate_number}</Text> : null}
                            {row.notes ? <Text style={styles.rowSub}>ملاحظات: {row.notes}</Text> : null}
                            {row.is_duplicate ? (
                              <Text style={styles.dupTag}>⚠️ مكرر مسجل مسبقاً</Text>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}

                    {/* Bottom Save Button when expanded for convenience */}
                    <TouchableOpacity
                      style={[styles.confirmBtn, { marginTop: 14, marginBottom: 16 }, confirming && styles.disabledBtn]}
                      onPress={handleConfirm}
                      disabled={confirming}
                      activeOpacity={0.8}
                    >
                      {confirming ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <Ionicons name="cloud-upload" size={20} color="#fff" />
                          <Text style={styles.confirmBtnText}>حفظ في قاعدة البيانات</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* Date Picker Bottom Sheet Modal */}
      <Modal
        visible={showDatePicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          />
          <View style={[styles.pickerModalCard, isDarkMode && styles.darkCard]}>
            <View style={[styles.pickerDragHandle, isDarkMode && { backgroundColor: '#475569' }]} />
            <View style={styles.pickerModalHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.pickerCloseBtn}>
                <Ionicons name="close" size={22} color={isDarkMode ? '#fff' : '#1e293b'} />
              </TouchableOpacity>
              <View style={styles.pickerTitleCol}>
                <Text style={[styles.pickerModalTitle, isDarkMode && styles.darkText]}>
                  تحديد تاريخ تقرير الإكسل
                </Text>
                <Text style={styles.pickerModalSub}>
                  الافتراضي هو تقرير يوم أمس ({formatArabicDisplayDate(getYesterdayFormatted())})
                </Text>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pickerModalScroll}>
              {/* Quick Select Buttons */}
              <Text style={[styles.pickerSectionLabel, isDarkMode && styles.darkTextSecondary]}>
                اختيارات سريعة:
              </Text>
              <View style={styles.quickDateRow}>
                <TouchableOpacity
                  style={[
                    styles.quickDateBtn,
                    customDate === getYesterdayFormatted() && styles.activeQuickDateBtn,
                    isDarkMode && styles.darkQuickDateBtn,
                  ]}
                  onPress={() => handleQuickSelectDate(getYesterdayFormatted())}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.quickDateBtnTitle,
                      customDate === getYesterdayFormatted() && styles.activeQuickDateText,
                      isDarkMode && styles.darkText,
                    ]}
                  >
                    ⭐ أمس (الافتراضي)
                  </Text>
                  <Text style={styles.quickDateBtnSub}>{formatArabicDisplayDate(getYesterdayFormatted())}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickDateBtn,
                    customDate === getTodayFormatted() && styles.activeQuickDateBtn,
                    isDarkMode && styles.darkQuickDateBtn,
                  ]}
                  onPress={() => handleQuickSelectDate(getTodayFormatted())}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.quickDateBtnTitle,
                      customDate === getTodayFormatted() && styles.activeQuickDateText,
                      isDarkMode && styles.darkText,
                    ]}
                  >
                    📅 اليوم
                  </Text>
                  <Text style={styles.quickDateBtnSub}>{formatArabicDisplayDate(getTodayFormatted())}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.quickDateBtn,
                    customDate === getTwoDaysAgoFormatted() && styles.activeQuickDateBtn,
                    isDarkMode && styles.darkQuickDateBtn,
                  ]}
                  onPress={() => handleQuickSelectDate(getTwoDaysAgoFormatted())}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.quickDateBtnTitle,
                      customDate === getTwoDaysAgoFormatted() && styles.activeQuickDateText,
                      isDarkMode && styles.darkText,
                    ]}
                  >
                    أول أمس
                  </Text>
                  <Text style={styles.quickDateBtnSub}>{formatArabicDisplayDate(getTwoDaysAgoFormatted())}</Text>
                </TouchableOpacity>
              </View>

              {/* Month Navigator */}
              <View style={[styles.pickerMonthNav, isDarkMode && styles.darkSubCard]}>
                <TouchableOpacity onPress={handlePrevPickerMonth} style={styles.pickerNavArrow}>
                  <Ionicons name="chevron-back" size={20} color={isDarkMode ? '#e2e8f0' : '#1e293b'} />
                </TouchableOpacity>
                <Text style={[styles.pickerMonthNavText, isDarkMode && styles.darkText]}>
                  {ARABIC_MONTHS[pickerMonthIdx]} {pickerYear}
                </Text>
                <TouchableOpacity onPress={handleNextPickerMonth} style={styles.pickerNavArrow}>
                  <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#e2e8f0' : '#1e293b'} />
                </TouchableOpacity>
              </View>

              {/* Days Grid */}
              <Text style={[styles.pickerSectionLabel, isDarkMode && styles.darkTextSecondary]}>
                اختر يوماً من التقويم:
              </Text>
              <View style={styles.pickerDaysGrid}>
                {Array.from({ length: daysInPickerMonth }, (_, i) => i + 1).map(day => {
                  const isSelected = pickerDay === day;
                  const yesterdayObj = new Date();
                  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
                  const isYesterday =
                    yesterdayObj.getFullYear() === pickerYear &&
                    yesterdayObj.getMonth() === pickerMonthIdx &&
                    yesterdayObj.getDate() === day;

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.pickerDayBox,
                        isDarkMode && styles.darkDayBox,
                        isSelected && styles.pickerSelectedDayBox,
                        isYesterday && !isSelected && styles.pickerYesterdayDayBox,
                      ]}
                      onPress={() => setPickerDay(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.pickerDayText,
                          isDarkMode && styles.darkText,
                          isSelected && styles.pickerSelectedDayText,
                          isYesterday && !isSelected && styles.pickerYesterdayDayText,
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Selected Day Preview */}
              <View style={[styles.pickedPreviewBox, isDarkMode && styles.darkSubCard]}>
                <Ionicons name="checkmark-circle" size={18} color="#f97316" />
                <Text style={[styles.pickedPreviewText, isDarkMode && styles.darkText]}>
                  التاريخ المختار:{' '}
                  <Text style={{ fontWeight: '800', color: '#f97316' }}>
                    {pickerDay} {ARABIC_MONTHS[pickerMonthIdx]} {pickerYear} (
                    {pickerYear}-{String(pickerMonthIdx + 1).padStart(2, '0')}-{String(pickerDay).padStart(2, '0')})
                  </Text>
                </Text>
              </View>

              {/* Confirm Picked Date Button */}
              <TouchableOpacity
                style={styles.pickerApplyBtn}
                onPress={handleApplyPickedDate}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <Text style={styles.pickerApplyBtnText}>تأكيد هذا التاريخ وفحص الملف</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    minHeight: '60%',
    paddingBottom: 24,
  },
  darkContainer: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  titleContainer: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  darkText: {
    color: '#f8fafc',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
  },
  pickerCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  emptyPickerBox: {
    alignItems: 'center',
    marginTop: 8,
  },
  pickerPromptText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 4,
  },
  pickerHintText: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 12,
  },
  pickBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pickBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  fileSelectedBox: {
    alignItems: 'center',
    marginTop: 8,
  },
  fileNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
  },
  repickBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
  },
  repickBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  dateBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
  },
  defaultTag: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c2410c',
  },
  datePickerBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#fed7aa',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  darkDatePickerBtn: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
  },
  datePickerRight: {
    alignItems: 'flex-end',
  },
  dateDisplayArabic: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  dateDisplayIso: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  datePickerLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  editDateBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  editDateBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  dateHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 8,
    textAlign: 'right',
  },
  centerBox: {
    padding: 30,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    textAlign: 'center',
  },
  previewSection: {
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: 6,
    marginBottom: 14,
  },
  statBadge: {
    flex: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statBadgeNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  statBadgeLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  dupWarningCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  dupWarningHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  dupWarningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400e',
    flex: 1,
    textAlign: 'right',
  },
  dupWarningSub: {
    fontSize: 11,
    color: '#78350f',
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'right',
  },
  dupActionsRow: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  dupActionPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    alignItems: 'center',
  },
  dupActionActive: {
    backgroundColor: '#d97706',
    borderColor: '#b45309',
  },
  dupActionCancelActive: {
    backgroundColor: '#ef4444',
    borderColor: '#dc2626',
  },
  dupActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  dupActionTextActive: {
    color: '#fff',
  },
  emptyIdentWarningCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  emptyIdentWarningHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  emptyIdentWarningTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#c2410c',
    flex: 1,
    textAlign: 'right',
  },
  emptyIdentWarningSub: {
    fontSize: 11,
    color: '#9a3412',
    marginTop: 4,
    textAlign: 'right',
  },
  emptyIdentRowCard: {
    borderColor: '#fdba74',
    backgroundColor: '#fffaf5',
  },
  emptyIdentText: {
    color: '#ea580c',
    fontWeight: '800',
  },
  tableSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'right',
  },
  rowCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dupRowCard: {
    borderColor: '#fed7aa',
    backgroundColor: '#fffaf5',
  },
  rowTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowMeta: {
    alignItems: 'flex-end',
  },
  rowIdent: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  rowDriver: {
    fontSize: 12,
    color: '#475569',
    marginTop: 1,
  },
  ordersBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ordersBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#c2410c',
  },
  rowBottom: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  rowSub: {
    fontSize: 11,
    color: '#64748b',
  },
  dupTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },
  appBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  appBadgeNinja: {
    backgroundColor: '#ecfdf5',
  },
  appBadgeKeeta: {
    backgroundColor: '#fef3c7',
  },
  appBadgeToyo: {
    backgroundColor: '#eff6ff',
  },
  appBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  appBadgeNinjaText: {
    color: '#059669',
  },
  appBadgeKeetaText: {
    color: '#d97706',
  },
  appBadgeToyoText: {
    color: '#2563eb',
  },
  confirmBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonsContainer: {
    marginTop: 14,
    marginBottom: 10,
    gap: 10,
  },
  previewDropdownBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  darkPreviewDropdownBtn: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  previewDropdownBtnActive: {
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
  },
  previewDropdownContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewDropdownRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewDropdownTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  previewDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  previewDropdownHint: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  collapsibleRowsWrapper: {
    marginTop: 6,
    marginBottom: 12,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  darkTextSecondary: {
    color: '#94a3b8',
  },
  /* Date Picker Bottom Sheet Modal Styles */
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  pickerModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '88%',
  },
  pickerDragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerCloseBtn: {
    padding: 6,
    borderRadius: 8,
  },
  pickerTitleCol: {
    alignItems: 'flex-end',
    flex: 1,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  pickerModalSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  pickerModalScroll: {
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
  },
  pickerSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
  },
  quickDateRow: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  quickDateBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  darkQuickDateBtn: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  activeQuickDateBtn: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
    borderWidth: 1.5,
  },
  quickDateBtnTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  activeQuickDateText: {
    color: '#ea580c',
    fontWeight: '800',
  },
  quickDateBtnSub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  pickerMonthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkSubCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  pickerNavArrow: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  pickerMonthNavText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  pickerDaysGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
  },
  pickerDayBox: {
    width: '12.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkDayBox: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  pickerSelectedDayBox: {
    backgroundColor: '#f97316',
    borderColor: '#ea580c',
  },
  pickerYesterdayDayBox: {
    borderColor: '#f97316',
    borderWidth: 1.5,
  },
  pickerDayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  pickerSelectedDayText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  pickerYesterdayDayText: {
    color: '#ea580c',
    fontWeight: '800',
  },
  pickedPreviewBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff7ed',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginTop: 4,
  },
  pickedPreviewText: {
    fontSize: 12,
    color: '#9a3412',
    fontWeight: '600',
  },
  pickerApplyBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
    marginTop: 6,
  },
  pickerApplyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
