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
import { ExcelImportPreview } from '../../types/target';
import { targetApi } from '../../services/targetApi';

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
  } | null>(null);

  const [customDate, setCustomDate] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preview, setPreview] = useState<ExcelImportPreview | null>(null);
  const [dedupAction, setDedupAction] = useState<
    'IGNORE_DUPLICATES' | 'REPLACE_DUPLICATES' | 'CANCEL'
  >('IGNORE_DUPLICATES');

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

    // 2. Mobile Native Safe Dynamic Picker (Won't crash if missing from APK)
    try {
      let picker: any = null;
      try {
        picker = require('expo-document-picker');
      } catch {
        picker = null;
      }

      if (!picker || typeof picker.getDocumentAsync !== 'function') {
        Alert.alert(
          'مستكشف الملفات',
          'يتطلب اختيار ملف الإكسل مباشرة من ذاكرة الهاتف تثبيت ملف الـ APK المحدث، أو يمكنك رفع الملف بكل سهولة عبر متصفح الهاتف أو الكمبيوتر.',
          [{ text: 'حسناً' }]
        );
        return;
      }

      const res = await picker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        const fileObj = {
          uri: file.uri,
          name: file.name,
          mimeType: file.mimeType,
        };
        setSelectedFile(fileObj);
        setPreview(null);
        analyzeFile(fileObj);
      }
    } catch (e: any) {
      Alert.alert(
        'تنبيه',
        'يرجى تثبيت النسخة المحدثة من التطبيق (APK) لتفعيل مستكشف ملفات الهاتف، أو رفع الملف عبر المتصفح.'
      );
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

  const resetState = () => {
    setSelectedFile(null);
    setPreview(null);
    setCustomDate('');
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

            {/* Date Input Box */}
            {selectedFile && (
              <View style={[styles.dateBox, isDarkMode && styles.darkCard]}>
                <Text style={styles.dateLabel}>تاريخ الطلبات المعتمد (YYYY-MM-DD):</Text>
                <View style={styles.dateInputRow}>
                  <TextInput
                    style={[styles.dateInput, isDarkMode && styles.darkInput]}
                    value={customDate}
                    onChangeText={setCustomDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                    textAlign="center"
                  />
                  <TouchableOpacity
                    style={styles.reAnalyzeBtn}
                    onPress={() => analyzeFile(selectedFile, customDate)}
                    disabled={analyzing}
                  >
                    <Text style={styles.reAnalyzeText}>إعادة الفحص</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.dateHint}>
                  * تاريخ الطلبات يتم تسجيله باليوم المحدد أعلاه وليس تاريخ الرفع.
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

                {/* Rows Preview Table */}
                <Text style={[styles.tableSectionTitle, isDarkMode && styles.darkText]}>
                  معاينة البيانات المستخرجة ({preview.rows.length} صف):
                </Text>
                {preview.rows.map((row, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.rowCard,
                      isDarkMode && styles.darkCard,
                      row.is_duplicate && styles.dupRowCard,
                    ]}
                  >
                    <View style={styles.rowTop}>
                      <View style={styles.rowMeta}>
                        <Text style={[styles.rowIdent, isDarkMode && styles.darkText]}>
                          المعرف: {row.identifier}
                        </Text>
                        <Text style={styles.rowDriver}>المندوب: {row.driver_name}</Text>
                      </View>
                      <View style={styles.ordersBadge}>
                        <Text style={styles.ordersBadgeText}>{row.total_orders} طلب</Text>
                      </View>
                    </View>

                    <View style={styles.rowBottom}>
                      <Text style={styles.rowSub}>التطبيق: {row.app}</Text>
                      {row.plate_number ? <Text style={styles.rowSub}>اللوحة: {row.plate_number}</Text> : null}
                      {row.notes ? <Text style={styles.rowSub}>ملاحظات: {row.notes}</Text> : null}
                      {row.is_duplicate ? (
                        <Text style={styles.dupTag}>⚠️ مكرر مسجل مسبقاً</Text>
                      ) : null}
                    </View>
                  </View>
                ))}

                {/* Confirm Import Button */}
                <TouchableOpacity
                  style={[styles.confirmBtn, confirming && styles.disabledBtn]}
                  onPress={handleConfirm}
                  disabled={confirming}
                >
                  {confirming ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                      <Text style={styles.confirmBtnText}>حفظ في قاعدة البيانات</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
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
  dateLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    textAlign: 'right',
  },
  dateInputRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    backgroundColor: '#fff',
  },
  darkInput: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    color: '#f8fafc',
  },
  reAnalyzeBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 8,
  },
  reAnalyzeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  dateHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 6,
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
  confirmBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 14,
    marginBottom: 20,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
