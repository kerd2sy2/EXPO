import React, { useState, useMemo, useEffect } from 'react';
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
  RefreshControl,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { DelegateWithStatus, PendingAdvanceRequest, supervisorApi } from '../services/supervisor';
import { ThemeColors } from '../types/delegate';
import { MonthPickerBottomSheet } from '../components/modals/MonthPickerBottomSheet';
import { ItemActionBottomSheet } from '../components/modals/ItemActionBottomSheet';

interface AdvanceRequestScreenProps {
  branchDelegates: DelegateWithStatus[];
  initialMode?: 'list' | 'create';
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onSuccess?: () => void;
  onBack?: () => void;
}

export const AdvanceRequestScreen: React.FC<AdvanceRequestScreenProps> = ({
  branchDelegates,
  initialMode = 'list',
  colors,
  isDarkMode,
  isRTL,
  onSuccess,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>(initialMode);
  const [advances, setAdvances] = useState<PendingAdvanceRequest[]>([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [advanceType, setAdvanceType] = useState<'advance' | 'internet_advance'>('advance');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateWithStatus | null>(null);
  const [amount, setAmount] = useState('');
  const [deductionMonth, setDeductionMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [aiSuccessBadge, setAiSuccessBadge] = useState(false);

  // Long press action sheet state
  const [actionItem, setActionItem] = useState<PendingAdvanceRequest | null>(null);

  // Fetch advances on mount
  const fetchAdvances = async () => {
    try {
      setLoadingAdvances(true);
      const all = await supervisorApi.getAllInvestigations();
      // Filter ONLY advances (cash or internet)
      const advList = all.filter(
        (inv) => inv.type === 'advance' || inv.type === 'internet_advance'
      );
      setAdvances(advList);
    } catch (e) {
      console.warn('Fetch advances error:', e);
    } finally {
      setLoadingAdvances(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
  }, []);

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
    if (!selectedDelegate && !editingId) {
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
      if (editingId) {
        // Edit existing advance
        await supervisorApi.updateInvestigation(editingId, {
          amount: numAmount,
          deductionMonth,
          reportText: reason.trim(),
          type: advanceType,
        });
        Alert.alert('تم التعديل', 'تم تحديث بيانات طلب السلفة بنجاح.');
      } else {
        // Create new advance
        await supervisorApi.createEmployeeReportOrAdvance({
          employeeId: selectedDelegate!.id,
          employeeName: selectedDelegate!.name,
          nationalId: selectedDelegate!.national_id,
          type: advanceType,
          amount: numAmount,
          deductionMonth,
          reportText: reason.trim(),
        });

        Alert.alert(
          'تم رفع الطلب بنجاح',
          `تم إرسال طلب ${advanceType === 'internet_advance' ? 'سلفة باقة إنترنت' : 'السلفة النقدية'} بقيمة (${numAmount} ريال) للمندوب (${selectedDelegate!.name}) إلى الإدارة والحسابات المالية للاعتماد.`
        );
      }

      setEditingId(null);
      setSelectedDelegate(null);
      setSearchQuery('');
      setAmount('');
      setReason('');
      setAiSuccessBadge(false);
      fetchAdvances();
      setActiveTab('list');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل إرسال طلب السلفة، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing advance
  const handleStartEdit = (adv: PendingAdvanceRequest) => {
    setEditingId(adv.id);
    setAdvanceType(adv.type === 'internet_advance' ? 'internet_advance' : 'advance');
    setAmount(adv.amount ? String(adv.amount) : '');
    setDeductionMonth(adv.deduction_month || '');
    setReason(adv.report_text || adv.reason || adv.notes || '');
    const del = branchDelegates.find((d) => d.id === adv.employee_id) || {
      id: adv.employee_id,
      name: adv.employee_name,
    } as any;
    setSelectedDelegate(del);
    setActiveTab('create');
  };

  // Delete advance permanently
  const handleDeleteAdvance = (adv: PendingAdvanceRequest) => {
    Alert.alert(
      'تأكيد الحذف النهائي',
      `هل أنت متأكد من حذف طلب سلفة المندوب (${adv.employee_name}) بقيمة (${adv.amount || 0} ر.س) نهائياً؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف نهائياً',
          style: 'destructive',
          onPress: async () => {
            try {
              await supervisorApi.deleteInvestigation(adv.id);
              Alert.alert('تم الحذف', 'تم حذف طلب السلفة نهائياً.');
              fetchAdvances();
              if (onSuccess) onSuccess();
            } catch (err: any) {
              Alert.alert('خطأ', err?.message || 'تعذر حذف طلب السلفة من السيرفر');
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      {/* Top Mode Segment (سجل السلف | طلب سلفة جديدة) */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'list' && { backgroundColor: '#10b981', elevation: 2 },
          ]}
          onPress={() => {
            setEditingId(null);
            setActiveTab('list');
          }}
        >
          <Ionicons
            name="list-outline"
            size={16}
            color={activeTab === 'list' ? '#fff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              { color: activeTab === 'list' ? '#fff' : colors.textSecondary },
            ]}
          >
            سجل السلف ({advances.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'create' && { backgroundColor: '#10b981', elevation: 2 },
          ]}
          onPress={() => setActiveTab('create')}
        >
          <Ionicons
            name={editingId ? 'pencil' : 'add-circle-outline'}
            size={16}
            color={activeTab === 'create' ? '#fff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              { color: activeTab === 'create' ? '#fff' : colors.textSecondary },
            ]}
          >
            {editingId ? 'تعديل السلفة' : 'طلب سلفة جديدة'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          activeTab === 'list' ? (
            <RefreshControl
              refreshing={loadingAdvances}
              onRefresh={fetchAdvances}
              colors={['#10b981']}
              tintColor="#10b981"
            />
          ) : undefined
        }
      >
        {/* VIEW 1: ADVANCES LIST */}
        {activeTab === 'list' ? (
          <View style={styles.listWrapper}>
            <View style={[styles.listHeaderInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.listSectionTitle, { color: colors.textPrimary }]}>
                سجل طلبات السلف المالية
              </Text>
              <Text style={[styles.listHint, { color: colors.textSecondary }]}>
                اضغط مطولاً لتعديل أو حذف السلفة
              </Text>
            </View>

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
              <Ionicons name="information-circle" size={20} color="#10b981" />
              <View style={[styles.noticeTextWrapper, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.noticeTitle, { color: '#047857' }]}>صلاحية الموافقة والاعتماد</Text>
                <Text style={[styles.noticeSub, { color: isDarkMode ? '#a7f3d0' : '#065f46', textAlign: isRTL ? 'right' : 'left' }]}>
                  المشرف يرفع الطلب فقط، بينما اعتماد وصرف السلف يخضع حصرياً لموافقة الإدارة العامة والحسابات المالية.
                </Text>
              </View>
            </View>

            {loadingAdvances && advances.length === 0 ? (
              <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
            ) : advances.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cash-outline" size={54} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  لا توجد طلبات سلف مسجلة
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  يمكنك رفع طلب سلفة نقدية أو سلفة إنترنت لمندوب
                </Text>
                <TouchableOpacity
                  style={[styles.createFirstBtn, { backgroundColor: '#10b981' }]}
                  onPress={() => setActiveTab('create')}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.createFirstBtnText}>طلب سلفة جديدة</Text>
                </TouchableOpacity>
              </View>
            ) : (
              advances.map((adv) => {
                const isInternet = adv.type === 'internet_advance';
                const isPending = adv.status === 'pending' || adv.status === 'PENDING' || !adv.status;
                const isApproved = adv.status === 'approved' || adv.status === 'APPROVED';

                return (
                  <TouchableOpacity
                    key={adv.id}
                    style={[
                      styles.advanceCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                    activeOpacity={0.8}
                    onLongPress={() => setActionItem(adv)}
                    delayLongPress={350}
                  >
                    <View
                      style={[
                        styles.advanceIconBox,
                        { backgroundColor: isInternet ? '#0284c718' : '#10b98118' },
                      ]}
                    >
                      <Ionicons
                        name={isInternet ? 'wifi' : 'cash'}
                        size={22}
                        color={isInternet ? '#0284c7' : '#10b981'}
                      />
                    </View>
                    <View style={[styles.advanceInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <View style={[styles.advHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.advName, { color: colors.textPrimary }]}>
                          {adv.employee_name}
                        </Text>
                        <Text style={[styles.advAmount, { color: '#10b981' }]}>
                          {adv.amount || 0} ر.س
                        </Text>
                      </View>

                      <View style={[styles.advTagsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.typeBadge, { backgroundColor: isInternet ? '#0284c715' : '#10b98115' }]}>
                          <Text style={[styles.typeBadgeText, { color: isInternet ? '#0284c7' : '#059669' }]}>
                            {isInternet ? 'سلفة باقة نت' : 'سلفة نقدية'}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isApproved
                                ? '#10b98118'
                                : isPending
                                ? '#f59e0b18'
                                : '#ef444418',
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              {
                                color: isApproved ? '#059669' : isPending ? '#d97706' : '#ef4444',
                              },
                            ]}
                          >
                            {isApproved
                              ? 'معتمدة من الإدارة'
                              : isPending
                              ? 'قيد مراجعة الإدارة والمالية'
                              : 'مرفوضة من الإدارة'}
                          </Text>
                        </View>
                      </View>

                      {adv.deduction_month ? (
                        <Text style={[styles.advMonth, { color: colors.textSecondary }]}>
                          شهر الاستقطاع: {adv.deduction_month}
                        </Text>
                      ) : null}

                      {(adv.report_text || adv.reason) && (
                        <Text
                          style={[
                            styles.advReason,
                            { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                          ]}
                          numberOfLines={2}
                        >
                          {adv.report_text || adv.reason}
                        </Text>
                      )}

                      <View style={[styles.advFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.advDate, { color: colors.textSecondary }]}>
                          {adv.created_at ? new Date(adv.created_at).toLocaleDateString('ar-SA') : ''}
                        </Text>
                        <Text style={styles.longPressHintGreen}>اضغط مطولاً للخيارات</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        ) : (
          /* VIEW 2: CREATE / EDIT ADVANCE FORM */
          <View style={styles.formWrapper}>
            {/* Advance Type Toggle (Audio 4: سلفة شخصية أو سلفة إنترنت) */}
            <View style={styles.sectionCard}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                نوع السلفة المطلوبة *
              </Text>
              <View style={[styles.typeSegmentRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.typeSegmentItem,
                    advanceType === 'advance' && { backgroundColor: '#10b981' },
                  ]}
                  onPress={() => setAdvanceType('advance')}
                >
                  <Ionicons
                    name="cash-outline"
                    size={16}
                    color={advanceType === 'advance' ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeSegmentText,
                      { color: advanceType === 'advance' ? '#fff' : colors.textPrimary },
                    ]}
                  >
                    سلفة نقدية / شخصية
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeSegmentItem,
                    advanceType === 'internet_advance' && { backgroundColor: '#0284c7' },
                  ]}
                  onPress={() => {
                    setAdvanceType('internet_advance');
                    if (!amount) setAmount('100'); // default preset for internet
                  }}
                >
                  <Ionicons
                    name="wifi-outline"
                    size={16}
                    color={advanceType === 'internet_advance' ? '#fff' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.typeSegmentText,
                      { color: advanceType === 'internet_advance' ? '#fff' : colors.textPrimary },
                    ]}
                  >
                    سلفة باقة إنترنت
                  </Text>
                </TouchableOpacity>
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
                  {!editingId && (
                    <TouchableOpacity
                      onPress={() => setSelectedDelegate(null)}
                      style={styles.changeBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.changeBtnText}>تغيير</Text>
                    </TouchableOpacity>
                  )}
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
                {(advanceType === 'internet_advance'
                  ? ['50', '80', '100', '120', '150']
                  : ['200', '300', '500', '800', '1000']
                ).map((val) => (
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

            {/* Deduction Month with Calendar Picker (Audio 5) */}
            <View style={styles.sectionCard}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                شهر الاستقطاع المستهدف (اضغط للاختيار بدون كتابة) *
              </Text>
              <TouchableOpacity
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                    justifyContent: 'space-between',
                  },
                ]}
                activeOpacity={0.8}
                onPress={() => setShowMonthPicker(true)}
              >
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="calendar" size={20} color="#10b981" />
                  <Text style={[styles.selectedMonthText, { color: colors.textPrimary }]}>
                    {deductionMonth || 'اختر الشهر'}
                  </Text>
                </View>
                <View style={styles.pickMonthBadge}>
                  <Text style={styles.pickMonthBadgeText}>تحديد الشهر</Text>
                </View>
              </TouchableOpacity>
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
                  <Ionicons name={editingId ? 'save' : 'cash'} size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {editingId ? 'حفظ تعديلات السلفة' : 'إرسال طلب السلفة للإدارة والمالية'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {editingId && (
              <TouchableOpacity
                style={[styles.cancelEditBtn, { borderColor: colors.border }]}
                onPress={() => {
                  setEditingId(null);
                  setSelectedDelegate(null);
                  setAmount('');
                  setReason('');
                  setActiveTab('list');
                }}
              >
                <Text style={[styles.cancelEditBtnText, { color: colors.textSecondary }]}>إلغاء التعديل</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Month Picker BottomSheet Modal (Audio 5) */}
      <MonthPickerBottomSheet
        visible={showMonthPicker}
        selectedMonth={deductionMonth}
        onSelect={(m) => setDeductionMonth(m)}
        onClose={() => setShowMonthPicker(false)}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
      />

      {/* Long Press Action Bottom Sheet (Ohda Style - Audio 7) */}
      <ItemActionBottomSheet
        visible={!!actionItem}
        title={actionItem ? `سلفة المندوب: ${actionItem.employee_name}` : ''}
        subtitle={actionItem ? `المبلغ: ${actionItem.amount || 0} ر.س | شهر: ${actionItem.deduction_month || '---'}` : ''}
        itemTypeLabel="طلب السلفة"
        onEdit={() => {
          if (actionItem) handleStartEdit(actionItem);
          setActionItem(null);
        }}
        onDelete={() => {
          if (actionItem) handleDeleteAdvance(actionItem);
          setActionItem(null);
        }}
        onClose={() => setActionItem(null)}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  listWrapper: {
    gap: 12,
  },
  listHeaderInfo: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  listSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  listHint: {
    fontSize: 11,
  },
  noticeBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 10,
  },
  noticeTextWrapper: {
    flex: 1,
    gap: 2,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  noticeSub: {
    fontSize: 11,
    lineHeight: 16,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  createFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  createFirstBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  advanceCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  advanceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  advanceInfo: {
    flex: 1,
    gap: 4,
  },
  advHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  advName: {
    fontSize: 15,
    fontWeight: '800',
  },
  advAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  advTagsRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  advMonth: {
    fontSize: 12,
    marginTop: 2,
  },
  advReason: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  advFooterRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 6,
  },
  advDate: {
    fontSize: 11,
  },
  longPressHintGreen: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '600',
  },
  formWrapper: {
    gap: 16,
  },
  sectionCard: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  typeSegmentRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  typeSegmentItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeSegmentText: {
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
  selectedMonthText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickMonthBadge: {
    backgroundColor: '#10b98120',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pickMonthBadgeText: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
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
  cancelEditBtn: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelEditBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
