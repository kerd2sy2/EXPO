import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DelegateWithStatus, PendingAdvanceRequest, supervisorApi } from '../services/supervisor';
import { ThemeColors } from '../types/delegate';

interface AdvanceRequestScreenProps {
  branchDelegates: DelegateWithStatus[];
  pendingAdvances?: PendingAdvanceRequest[];
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onSuccess?: () => void;
  onBack?: () => void;
}

export const AdvanceRequestScreen: React.FC<AdvanceRequestScreenProps> = ({
  branchDelegates,
  pendingAdvances = [],
  colors,
  isDarkMode,
  isRTL,
  onSuccess,
  onBack,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateWithStatus | null>(null);
  const [amount, setAmount] = useState('');
  const [deductionMonth, setDeductionMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [aiSuccessBadge, setAiSuccessBadge] = useState(false);

  // Filter delegates by search (requires 2+ chars)
  const filteredDelegates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return branchDelegates.filter((d) => {
      const name = (d.name || '').toLowerCase();
      const code = (d.employee_number || '').toLowerCase();
      const phone = (d.phone || (d as any).phone_number || '').toLowerCase();
      return name.includes(q) || code.includes(q) || phone.includes(q);
    });
  }, [searchQuery, branchDelegates]);

  // Clean language and dialect polisher for advance reason
  const handlePolishText = () => {
    if (!reason.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة سبب طلب السلفة أولاً لتحسين صياغته ولغته');
      return;
    }

    setIsAiRewriting(true);
    setAiSuccessBadge(false);

    setTimeout(() => {
      try {
        let text = reason.trim();

        const dialectMap: [RegExp, string][] = [
          [/\b(عاوز سلفة|عايز سلفة|بدي سلفة|محتاج سلفة)\b/gi, 'طلب سلفة مالية'],
          [/\b(ابنه تعبان|ابنه عيان)\b/gi, 'ظرف صحي يمر به ابنه'],
          [/\b(والده تعبان|والدته تعبانة)\b/gi, 'ظرف صحي عائلي طارئ'],
          [/\b(علاج|يجيب علاج|دوا)\b/gi, 'توفير مستلزمات علاجية'],
          [/\b(ايجار|الإيجار متأخر)\b/gi, 'سداد التزامات إيجارية متأخرة'],
          [/\b(علشان|عشان|كرمال)\b/gi, 'بسبب'],
          [/\b(دلوقتي|هلق|الحين)\b/gi, 'حالياً'],
          [/\b(معاهوش|معهوش|ما معه|مش معاه)\b/gi, 'لا يتوفر لديه'],
          [/\b(فلوس)\b/gi, 'مبلغ مالي'],
          [/\b(كتير اوي|كتير|واجد)\b/gi, 'بشكل ملحوظ'],
          [/\b(بصراحة|يعني|اصلا|أصلاً)\b/gi, ''],
        ];

        for (const [rgx, replacement] of dialectMap) {
          text = text.replace(rgx, replacement);
        }

        text = text
          .replace(/[ \t]+/g, ' ')
          .replace(/ \n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/ ,/g, '،')
          .replace(/,/g, '،')
          .trim();

        if (!text.startsWith('طلب سلفة')) {
          text = `طلب سلفة: ${text}`;
        }

        if (text && !/[.!?،。]$/.test(text)) {
          text += '.';
        }

        setReason(text);
        setAiSuccessBadge(true);
      } catch (e) {
        console.warn('Polish advance error:', e);
      } finally {
        setIsAiRewriting(false);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    if (!selectedDelegate) {
      Alert.alert('تنبيه', 'يرجى اختيار المندوب المعني أولاً من شريط البحث');
      return;
    }
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال مبلغ سلفة صحيح أكبر من صفر');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة سبب طلب السلفة');
      return;
    }

    try {
      setIsSubmitting(true);
      await supervisorApi.createEmployeeReportOrAdvance({
        employeeId: selectedDelegate.id,
        employeeName: selectedDelegate.name,
        nationalId: selectedDelegate.national_id,
        type: 'advance',
        amount: numAmount,
        deductionMonth: deductionMonth,
        reportText: reason.trim(),
      });

      Alert.alert(
        'تم رفع الطلب بنجاح',
        `تم إرسال طلب السلفة بقيمة (${numAmount} ريال) للمندوب (${selectedDelegate.name}) إلى الإدارة والحسابات المالية للاعتماد.`
      );
      setSelectedDelegate(null);
      setSearchQuery('');
      setAmount('');
      setReason('');
      setAiSuccessBadge(false);
      if (onSuccess) onSuccess();
      if (onBack) onBack();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل إرسال طلب السلفة، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Management & Finance Notice Banner */}
        <View
          style={[
            styles.noticeBanner,
            {
              backgroundColor: isDarkMode ? '#064e3b30' : '#ecfdf5',
              borderColor: '#10b981',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="information-circle" size={22} color="#10b981" />
          <View style={[styles.noticeTextWrapper, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.noticeTitle, { color: '#047857' }]}>موافقة الإدارة والمالية</Text>
            <Text style={[styles.noticeSub, { color: isDarkMode ? '#a7f3d0' : '#065f46', textAlign: isRTL ? 'right' : 'left' }]}>
              يقوم المشرف برفع طلب السلفة نيابة عن المندوب، وتخضع للمراجعة والموافقة حصرياً من قبل الإدارة العامة والحسابات المالية.
            </Text>
          </View>
        </View>

        {/* Delegate Search Section */}
        <View style={styles.sectionCard}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            اختيار المندوب المستفيد من السلفة *
          </Text>

          {selectedDelegate ? (
            <View
              style={[
                styles.selectedCard,
                { backgroundColor: isDarkMode ? '#064e3b25' : '#ecfdf5', borderColor: '#10b981' },
              ]}
            >
              <View style={[styles.selectedAvatar, { backgroundColor: '#10b981' }]}>
                <Ionicons name="person" size={20} color="#fff" />
              </View>
              <View style={[styles.selectedInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.selectedName, { color: colors.textPrimary }]}>{selectedDelegate.name}</Text>
                <Text style={[styles.selectedMeta, { color: colors.textSecondary }]}>
                  رقم المندوب: {selectedDelegate.employee_number || '---'} | الفرع: {selectedDelegate.branch_name || 'الفرع'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedDelegate(null)}
                style={styles.changeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.changeBtnText}>تغيير</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[
                    styles.searchInput,
                    { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                  ]}
                  placeholder="اكتب أول حرفين من اسم أو رقم المندوب..."
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

              {/* Autocomplete Dropdown */}
              {searchQuery.trim().length >= 2 && (
                <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {filteredDelegates.length === 0 ? (
                    <View style={styles.emptySearchRow}>
                      <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
                        لا يوجد مندوب مطابق لبحثك في الفرع
                      </Text>
                    </View>
                  ) : (
                    filteredDelegates.slice(0, 6).map((del) => (
                      <TouchableOpacity
                        key={del.id}
                        style={[
                          styles.delegateRow,
                          {
                            borderBottomColor: colors.border,
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          },
                        ]}
                        onPress={() => {
                          setSelectedDelegate(del);
                          setSearchQuery('');
                        }}
                      >
                        <View style={[styles.avatarMini, { backgroundColor: '#10b98120' }]}>
                          <Text style={[styles.avatarMiniText, { color: '#10b981' }]}>
                            {del.name.charAt(0)}
                          </Text>
                        </View>
                        <View style={[styles.delegateRowInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                          <Text style={[styles.delName, { color: colors.textPrimary }]}>{del.name}</Text>
                          <Text style={[styles.delMeta, { color: colors.textSecondary }]}>
                            {del.employee_number ? `كود: ${del.employee_number}` : (del.phone || '')}
                          </Text>
                        </View>
                        <Ionicons
                          name={isRTL ? 'chevron-back' : 'chevron-forward'}
                          size={18}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Amount Section */}
        <View style={styles.sectionCard}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            مبلغ السلفة المطلوب (ريال سعودي) *
          </Text>
          <View
            style={[
              styles.amountInputRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>ر.س</Text>
            <TextInput
              style={[
                styles.amountInput,
                { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
              ]}
              placeholder="مثال: 500"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          {/* Quick Amount Chips */}
          <View style={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {['200', '300', '500', '800', '1000'].map((val) => (
              <TouchableOpacity
                key={val}
                style={[
                  styles.chip,
                  {
                    backgroundColor: amount === val ? '#10b98125' : colors.card,
                    borderColor: amount === val ? '#10b981' : colors.border,
                  },
                ]}
                onPress={() => setAmount(val)}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: amount === val ? '#10b981' : colors.textPrimary, fontWeight: amount === val ? '800' : '600' },
                  ]}
                >
                  {val} ر.س
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Deduction Month */}
        <View style={styles.sectionCard}>
          <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            شهر الاستقطاع المستهدف
          </Text>
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[
                styles.searchInput,
                { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
              ]}
              placeholder="YYYY-MM (مثال: 2026-11)"
              placeholderTextColor={colors.textSecondary}
              value={deductionMonth}
              onChangeText={setDeductionMonth}
            />
          </View>
        </View>

        {/* Reason Section */}
        <View style={styles.sectionCard}>
          <View style={[styles.labelWithActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
              سبب السلفة وتفاصيل الحاجة *
            </Text>

            {/* Polish Language Button */}
            <TouchableOpacity
              style={[styles.aiBtn, { backgroundColor: '#10b98115', borderColor: '#10b981' }]}
              onPress={handlePolishText}
              disabled={isAiRewriting}
              activeOpacity={0.8}
            >
              {isAiRewriting ? (
                <ActivityIndicator size="small" color="#10b981" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={14} color="#10b981" />
                  <Text style={[styles.aiBtnText, { color: '#10b981' }]}>تحسين الصياغة واللهجة</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.textPrimary,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            multiline
            numberOfLines={5}
            placeholder="اكتب سبب طلب السلفة (سريعاً أو بالعامية)، واضغط على تحسين الصياغة لضبط اللهجة واللغة فصحى ومباشرة..."
            placeholderTextColor={colors.textSecondary}
            value={reason}
            onChangeText={(text) => {
              setReason(text);
              setAiSuccessBadge(false);
            }}
          />

          {aiSuccessBadge && (
            <View style={[styles.aiBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="checkmark-circle" size={14} color="#10B981" />
              <Text style={styles.aiBadgeText}>تم تحسين الصياغة وتعديل اللهجة فصحى ومباشرة</Text>
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: '#10b981' }]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="cash" size={18} color="#fff" />
              <Text style={styles.submitBtnText}>إرسال طلب السلفة للإدارة والمالية</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Section: Live status of pending advances in branch */}
        {pendingAdvances && pendingAdvances.length > 0 && (
          <View style={[styles.historySection, { borderTopColor: colors.border }]}>
            <View style={[styles.historyHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.historyTitle, { color: colors.textPrimary }]}>سلف قيد مراجعة الإدارة والمالية</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{pendingAdvances.length}</Text>
              </View>
            </View>

            <View style={styles.historyList}>
              {pendingAdvances.map((adv) => (
                <View
                  key={adv.id}
                  style={[
                    styles.historyCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <View style={[styles.historyIconBox, { backgroundColor: '#10b98115' }]}>
                    <Ionicons name="time" size={20} color="#10b981" />
                  </View>
                  <View style={[styles.historyInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.historyDelegateName, { color: colors.textPrimary }]}>
                      {adv.employee_name || 'مندوب'}
                    </Text>
                    <Text style={[styles.historyDetail, { color: colors.textSecondary }]}>
                      المبلغ: {adv.amount || '---'} ر.س | شهر: {adv.deduction_month || '---'}
                    </Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>بانتظار الإدارة</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  noticeBanner: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 12,
  },
  noticeTextWrapper: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  noticeSub: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionCard: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  searchBox: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  dropdownList: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 6,
    maxHeight: 220,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  emptySearchRow: {
    padding: 16,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 13,
  },
  delegateRow: {
    padding: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  avatarMini: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarMiniText: {
    fontSize: 14,
    fontWeight: '800',
  },
  delegateRowInfo: {
    flex: 1,
  },
  delName: {
    fontSize: 14,
    fontWeight: '700',
  },
  delMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  selectedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '800',
  },
  selectedMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  changeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#10b98120',
    borderRadius: 8,
  },
  changeBtnText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  amountInputRow: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: '800',
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  chipsRow: {
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  labelWithActionRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  aiBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textArea: {
    minHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  aiBadgeRow: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  aiBadgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  submitBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  historySection: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  historyHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: '#10b98120',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
  },
  historyList: {
    gap: 8,
  },
  historyCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: {
    flex: 1,
  },
  historyDelegateName: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyDetail: {
    fontSize: 12,
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadgeText: {
    color: '#d97706',
    fontSize: 11,
    fontWeight: '700',
  },
});
