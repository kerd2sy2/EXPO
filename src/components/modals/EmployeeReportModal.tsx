import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { DelegateWithStatus, supervisorApi } from '../../services/supervisor';

export interface EmployeeReportModalProps {
  visible: boolean;
  onClose: () => void;
  branchDelegates: DelegateWithStatus[];
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL?: boolean;
  onSuccess?: () => void;
}

type ReportType = 'supervisor_report' | 'advance';

export const EmployeeReportModal: React.FC<EmployeeReportModalProps> = ({
  visible,
  onClose,
  branchDelegates,
  colors,
  isDarkMode,
  isRTL = true,
  onSuccess,
}) => {
  const [reportType, setReportType] = useState<ReportType>('supervisor_report');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateWithStatus | null>(null);
  const [reportText, setReportText] = useState('');
  const [amount, setAmount] = useState('');
  const [deductionMonth, setDeductionMonth] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [aiSuccessBadge, setAiSuccessBadge] = useState(false);

  // Candidate delegates matching the first 2+ characters
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return branchDelegates.filter((d) => {
      const name = (d.name || '').toLowerCase();
      const num = (d.employee_number || '').toLowerCase();
      const phone = (d.phone || '').toLowerCase();
      const bike = (d.motorcycle_number || '').toLowerCase();
      return name.includes(q) || num.includes(q) || phone.includes(q) || bike.includes(q);
    }).slice(0, 8);
  }, [searchQuery, branchDelegates]);

  const handleSelectDelegate = (delegate: DelegateWithStatus) => {
    setSelectedDelegate(delegate);
    setSearchQuery('');
  };

  const handleClearDelegate = () => {
    setSelectedDelegate(null);
    setSearchQuery('');
  };

  // AI Professional Rewriting Engine
  const handleAiRewrite = () => {
    if (!reportText.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة بعض الكلمات أو الملاحظات أولاً لتحسين صياغتها ولغتها');
      return;
    }

    setIsAiRewriting(true);
    setAiSuccessBadge(false);

    setTimeout(() => {
      try {
        let text = reportText.trim();

        // 1. Replacements for dialect and informal slang to clean concise Arabic
        const dialectMap: [RegExp, string][] = [
          // Negations & refusal
          [/\b(مش راضي|ما بدو|ما يبي|ما بيرضى|مش موافق)\b/gi, 'يرفض'],
          [/\b(مش عايز|مش عاوز|مش حابب|ما وده)\b/gi, 'لا يرغب في'],
          [/\b(مش بيسمع الكلام|مابيردش على التعليمات)\b/gi, 'عدم الالتزام بالتعليمات'],
          [/\b(مش ملتزم|مش منضبط)\b/gi, 'غير ملتزم'],

          // Attendance & Time
          [/\b(عمال يتاخر|بيتاخر كتير|دايما بيتاخر|عم يتأخر|بيتاخر)\b/gi, 'يتأخر باستمرار عن مواعيد العمل'],
          [/\b(تاخير كتير|تأخير كتير)\b/gi, 'تأخر متكرر'],
          [/\b(ما جاش|مجاش|ما حضرش|ما اجا|ماجا)\b/gi, 'لم يحضر للعمل'],
          [/\b(ساب الشغل|سيب الوردية|سيب الشغل|ساب الوردية)\b/gi, 'ترك الوردية دون إذن'],
          [/\b(اختفى|هرب|مش لاقينه|مش لاقيه)\b/gi, 'تعذر الوصول إليه في موقع العمل'],

          // Communication
          [/\b(مردش عليا|ما ردش عليا|ما ردش|مش بيرد|مابيردش|ما بيجاوب|قفل في وشي)\b/gi, 'لا يستجيب للاتصالات'],
          [/\b(تليفون|موبايل|جوال)\b/gi, 'الهاتف'],
          [/\b(مقفول|تليفونه مقفول)\b/gi, 'مغلق'],

          // Orders & Field Work
          [/\b(يروح يسلم|يروح يوصل)\b/gi, 'التوجه لتسليم'],
          [/\b(اوردرات|أوردرات)\b/gi, 'طلبات'],
          [/\b(اوردر|أوردر)\b/gi, 'طلب'],
          [/\b(كنسل الاوردر|كنسل الطلب)\b/gi, 'ألغى الطلب'],

          // Vehicles & incidents
          [/\b(دباب|موتوسيكل|سيكل)\b/gi, 'المركبة'],
          [/\b(اتخبط|خبط|صدم|عمل حادثة|وقع بالدباب)\b/gi, 'تعرض لحادث مروري'],
          [/\b(باظ|عطلان|خربان|خرب|مش شغال)\b/gi, 'معطل'],

          // Interpersonal
          [/\b(زبون|الزبون)\b/gi, 'العميل'],
          [/\b(اتخانق مع|بيزعق مع|مسك في)\b/gi, 'حدث خلاف وتلاسن مع'],
          [/\b(بيعمل مشاكل)\b/gi, 'يثير خلافات تشغيلية'],

          // Dialect fillers & modifiers
          [/\b(علشان|عشان|كرمال)\b/gi, 'بسبب'],
          [/\b(دلوقتي|هلق|الحين)\b/gi, 'حالياً'],
          [/\b(كويس|منيح)\b/gi, 'بشكل مناسب'],
          [/\b(شوية|شوي)\b/gi, 'قليلاً'],
          [/\b(كتير اوي|كتير|واجد)\b/gi, 'بشكل ملحوظ'],
          [/\b(معاهوش|معهوش|ما معه|مش معاه)\b/gi, 'لا يتوفر لديه'],
          [/\b(فلوس)\b/gi, 'مبلغ مالي'],
          [/\b(بصراحة|يعني|اصلا|أصلاً)\b/gi, ''],

          // Advance specifics
          [/\b(عاوز سلفة|عايز سلفة|بدي سلفة|محتاج سلفة)\b/gi, 'طلب سلفة مالية'],
          [/\b(ابنه تعبان|ابنه عيان)\b/gi, 'ظرف صحي يمر به ابنه'],
          [/\b(والده تعبان|والدته تعبانة)\b/gi, 'ظرف صحي عائلي طارئ'],
          [/\b(علاج|يجيب علاج|دوا)\b/gi, 'توفير مستلزمات علاجية'],
          [/\b(ايجار|الإيجار متأخر)\b/gi, 'سداد التزامات إيجارية متأخرة'],
        ];

        for (const [rgx, replacement] of dialectMap) {
          text = text.replace(rgx, replacement);
        }

        // 2. Clean spaces and typography
        text = text
          .replace(/[ \t]+/g, ' ')
          .replace(/ \n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/ ,/g, '،')
          .replace(/,/g, '،')
          .trim();

        // 3. For advance, keep concise directly
        if (reportType === 'advance' && !text.startsWith('طلب سلفة')) {
          text = `طلب سلفة: ${text}`;
        }

        // Add terminating punctuation if missing
        if (text && !/[.!?،。]$/.test(text)) {
          text += '.';
        }

        setReportText(text);
        setAiSuccessBadge(true);
      } catch (err) {
        console.warn('AI Polish error:', err);
      } finally {
        setIsAiRewriting(false);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    if (!selectedDelegate) {
      Alert.alert('تنبيه', 'يرجى اختيار المندوب المعني أولاً');
      return;
    }
    if (!reportText.trim()) {
      Alert.alert('تنبيه', reportType === 'advance' ? 'يرجى كتابة سبب طلب السلفة' : 'يرجى كتابة تفاصيل التقرير أو الشكوى');
      return;
    }
    if (reportType === 'advance' && (!amount || Number(amount) <= 0)) {
      Alert.alert('تنبيه', 'يرجى إدخال مبلغ السلفة بشكل صحيح');
      return;
    }

    try {
      setIsSubmitting(true);
      await supervisorApi.createEmployeeReportOrAdvance({
        employeeId: selectedDelegate.id,
        employeeName: selectedDelegate.name,
        nationalId: selectedDelegate.national_id,
        type: reportType,
        reportText: reportText.trim(),
        amount: reportType === 'advance' ? Number(amount) : undefined,
        deductionMonth: deductionMonth.trim() || undefined,
        notes: reportType === 'advance' ? `سلفة للمندوب: ${amount} ر.س` : 'تقرير إداري من المشرف الميداني',
      });

      Alert.alert(
        'تم بنجاح',
        reportType === 'advance'
          ? `تم رفع طلب السلفة للمندوب (${selectedDelegate.name}) بنجاح إلى الإدارة`
          : `تم تسجيل التقرير الإداري للمندوب (${selectedDelegate.name}) وإرساله للإدارة بنجاح`
      );

      // Reset Form
      setSelectedDelegate(null);
      setSearchQuery('');
      setReportText('');
      setAmount('');
      setDeductionMonth('');
      setAiSuccessBadge(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل إرسال الطلب، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.backdrop} />

        <View style={[styles.sheetContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header Bar */}
          <View style={styles.sheetHandleBar}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تقارير الموظفين والطلبات</Text>
              <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                رفع تقرير مشرف إداري أو تقديم طلب سلفة مالية
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.bg }]}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Segment: Report vs Advance */}
            <View style={[styles.typeSegment, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  reportType === 'supervisor_report' && [styles.typeBtnActive, { backgroundColor: colors.primary }],
                ]}
                onPress={() => {
                  setReportType('supervisor_report');
                  setAiSuccessBadge(false);
                }}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={reportType === 'supervisor_report' ? '#fff' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: reportType === 'supervisor_report' ? '#fff' : colors.textSecondary },
                  ]}
                >
                  تقرير مشرف / شكوى
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  reportType === 'advance' && [styles.typeBtnActive, { backgroundColor: colors.primary }],
                ]}
                onPress={() => {
                  setReportType('advance');
                  setAiSuccessBadge(false);
                }}
              >
                <Ionicons
                  name="cash-outline"
                  size={18}
                  color={reportType === 'advance' ? '#fff' : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.typeBtnText,
                    { color: reportType === 'advance' ? '#fff' : colors.textSecondary },
                  ]}
                >
                  طلب سلفة مالية
                </Text>
              </TouchableOpacity>
            </View>

            {/* Delegate Selector (First 2+ letters search) */}
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>المندوب المعني *</Text>
            {selectedDelegate ? (
              <View style={[styles.selectedCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <View style={styles.selectedAvatar}>
                  <Text style={styles.selectedAvatarText}>
                    {selectedDelegate.name ? selectedDelegate.name.charAt(0) : 'م'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.selectedName, { color: colors.primary }]}>{selectedDelegate.name}</Text>
                  <Text style={[styles.selectedMeta, { color: colors.textSecondary }]}>
                    {selectedDelegate.employee_number ? `كود: ${selectedDelegate.employee_number} • ` : ''}
                    {selectedDelegate.phone || ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleClearDelegate} style={styles.clearBtn}>
                  <Ionicons name="close-circle" size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <View style={[styles.searchBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <Ionicons name="search" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder="اكتب أول حرفين من اسم أو كود المندوب..."
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

                {/* Candidate Dropdown Chips */}
                {searchResults.length > 0 && (
                  <View style={[styles.candidateDropdown, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                    {searchResults.map((cand) => (
                      <TouchableOpacity
                        key={cand.id}
                        style={[styles.candidateRow, { borderBottomColor: colors.border }]}
                        onPress={() => handleSelectDelegate(cand)}
                      >
                        <View style={[styles.candidateDot, { backgroundColor: colors.primary }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.candidateName, { color: colors.textPrimary }]}>{cand.name}</Text>
                          <Text style={[styles.candidateSub, { color: colors.textSecondary }]}>
                            {cand.employee_number ? `كود: ${cand.employee_number} ` : ''}
                            {cand.motorcycle_number ? `• دباب: ${cand.motorcycle_number}` : ''}
                          </Text>
                        </View>
                        <Ionicons name="arrow-back" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Advance Specific Fields */}
            {reportType === 'advance' && (
              <View style={styles.advanceRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>مبلغ السلفة (ر.س) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="مثال: 500"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>شهر الخصم (اختياري)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]}
                    placeholder="الشهر القادم"
                    placeholderTextColor={colors.textSecondary}
                    value={deductionMonth}
                    onChangeText={setDeductionMonth}
                  />
                </View>
              </View>
            )}

            {/* Textarea Label + AI Prompt */}
            <View style={styles.labelWithAiRow}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
                {reportType === 'advance' ? 'سبب السلفة وتفاصيل الحاجة *' : 'نص الشكوى أو التقرير الإداري *'}
              </Text>

              {/* AI Language & Dialect Polish Button */}
              <TouchableOpacity
                style={[styles.aiBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                onPress={handleAiRewrite}
                disabled={isAiRewriting}
                activeOpacity={0.8}
              >
                {isAiRewriting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={15} color={colors.primary} />
                    <Text style={[styles.aiBtnText, { color: colors.primary }]}>تحسين الصياغة واللهجة</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Textarea */}
            <TextInput
              style={[
                styles.textArea,
                { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
              ]}
              multiline
              numberOfLines={6}
              placeholder={
                reportType === 'advance'
                  ? 'اكتب سبب السلفة، واضغط على تحسين الصياغة لضبط اللهجة واللغة فصحى ومباشرة...'
                  : 'اكتب الشكوى أو الملاحظات (سريعة أو بالعامية)، واضغط لتحسين اللهجة واللغة فصحى ومباشرة بدون إطالة...'
              }
              placeholderTextColor={colors.textSecondary}
              value={reportText}
              onChangeText={(text) => {
                setReportText(text);
                setAiSuccessBadge(false);
              }}
            />

            {aiSuccessBadge && (
              <View style={styles.aiBadgeRow}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={styles.aiBadgeText}>تم تحسين الصياغة وتعديل اللهجة فصحى ومباشرة</Text>
              </View>
            )}

            {/* Submit Action Button */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={reportType === 'advance' ? 'cash' : 'paper-plane'}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.submitBtnText}>
                    {reportType === 'advance' ? 'تأكيد وإرسال طلب السلفة' : 'اعتماد وإرسال التقرير للإدارة'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdrop: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 20,
    maxHeight: '90%',
  },
  sheetHandleBar: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sheetSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  typeSegment: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  selectedAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0284c7',
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '800',
  },
  selectedMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  clearBtn: {
    padding: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    height: 46,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  candidateDropdown: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  candidateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  candidateName: {
    fontSize: 13,
    fontWeight: '700',
  },
  candidateSub: {
    fontSize: 11,
    marginTop: 2,
  },
  advanceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  input: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  labelWithAiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    marginTop: 6,
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  aiBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textArea: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    fontSize: 13,
    lineHeight: 20,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  aiBadgeText: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '600',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
