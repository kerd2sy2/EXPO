import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { ExcelImportPreview } from '../../types/target';
import { targetApi } from '../../services/targetApi';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import {
  formatArabicDisplayDate,
  getYesterdayFormatted,
} from './import-orders/importOrdersDateHelpers';
import { importOrdersMainStyles as styles } from './import-orders/importOrdersMainStyles';
import { ImportDatePickerModal } from './import-orders/ImportDatePickerModal';
import { ImportPreviewSection } from './import-orders/ImportPreviewSection';

interface ImportOrdersModalProps {
  visible: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  isDarkMode?: boolean;
}

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
  const [dedupAction, setDedupAction] = useState<'IGNORE_DUPLICATES' | 'REPLACE_DUPLICATES' | 'CANCEL'>('IGNORE_DUPLICATES');

  const daysInPickerMonth = new Date(pickerYear, pickerMonthIdx + 1, 0).getDate();

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

  const handlePickFile = async () => {
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
                file,
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

  const resetState = () => {
    setSelectedFile(null);
    setPreview(null);
    setShowRowsPreview(false);
    setCustomDate(getYesterdayFormatted());
    setDedupAction('IGNORE_DUPLICATES');
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

  const handleQuickSelectDate = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      setPickerYear(parseInt(parts[0], 10));
      setPickerMonthIdx(parseInt(parts[1], 10) - 1);
      setPickerDay(parseInt(parts[2], 10));
    }
    setCustomDate(dateStr);
    setShowDatePicker(false);
    if (selectedFile) analyzeFile(selectedFile, dateStr);
  };

  const handleApplyPickedDate = () => {
    const validDay = Math.min(pickerDay, daysInPickerMonth);
    const fullDateStr = `${pickerYear}-${String(pickerMonthIdx + 1).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;
    setCustomDate(fullDateStr);
    setShowDatePicker(false);
    if (selectedFile) analyzeFile(selectedFile, fullDateStr);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, isDarkMode && styles.darkContainer]}>
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
            <View style={[styles.pickerCard, isDarkMode && styles.darkCard]}>
              <Ionicons name="document-text-outline" size={36} color="#0284c7" />
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
                      <Feather name="calendar" size={14} color="#0284c7" />
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

            {analyzing && (
              <View style={styles.centerBox}>
                <ActivityIndicator size="large" color="#0284c7" />
                <Text style={styles.loadingText}>جارٍ قراءة وفحص ملف الإكسل واكتشاف التكرار...</Text>
              </View>
            )}

            {preview && !analyzing && (
              <ModuleErrorBoundary moduleName="معاينة ملف الإكسل" onReset={() => setPreview(null)}>
                <ImportPreviewSection
                  preview={preview}
                  isDarkMode={isDarkMode}
                  dedupAction={dedupAction}
                  onChangeDedupAction={setDedupAction}
                  confirming={confirming}
                  onConfirm={handleConfirm}
                  showRowsPreview={showRowsPreview}
                  onToggleRowsPreview={() => setShowRowsPreview((prev) => !prev)}
                />
              </ModuleErrorBoundary>
            )}
          </ScrollView>
        </View>
      </View>

      <ModuleErrorBoundary moduleName="اختيار التاريخ" onReset={() => setShowDatePicker(false)}>
        <ImportDatePickerModal
          visible={showDatePicker}
          isDarkMode={isDarkMode}
          customDate={customDate}
          pickerYear={pickerYear}
          pickerMonthIdx={pickerMonthIdx}
          pickerDay={pickerDay}
          daysInPickerMonth={daysInPickerMonth}
          onClose={() => setShowDatePicker(false)}
          onPrevMonth={() => {
            if (pickerMonthIdx === 0) {
              setPickerYear((y) => y - 1);
              setPickerMonthIdx(11);
            } else {
              setPickerMonthIdx((m) => m - 1);
            }
          }}
          onNextMonth={() => {
            if (pickerMonthIdx === 11) {
              setPickerYear((y) => y + 1);
              setPickerMonthIdx(0);
            } else {
              setPickerMonthIdx((m) => m + 1);
            }
          }}
          onSelectDay={setPickerDay}
          onQuickSelectDate={handleQuickSelectDate}
          onApplyPickedDate={handleApplyPickedDate}
        />
      </ModuleErrorBoundary>
    </Modal>
  );
};
