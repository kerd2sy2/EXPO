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
import { ItemActionBottomSheet } from '../components/modals/ItemActionBottomSheet';

interface SupervisorReportScreenProps {
  branchDelegates: DelegateWithStatus[];
  initialMode?: 'list' | 'create';
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onSuccess?: () => void;
  onBack?: () => void;
}

export const SupervisorReportScreen: React.FC<SupervisorReportScreenProps> = ({
  branchDelegates,
  initialMode = 'list',
  colors,
  isDarkMode,
  isRTL,
  onSuccess,
  onBack,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>(initialMode);
  const [reports, setReports] = useState<PendingAdvanceRequest[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateWithStatus | null>(null);
  const [reportText, setReportText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [aiSuccessBadge, setAiSuccessBadge] = useState(false);

  // Long press action sheet state
  const [actionItem, setActionItem] = useState<PendingAdvanceRequest | null>(null);

  // Fetch reports on mount
  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const all = await supervisorApi.getAllInvestigations();
      // Filter ONLY supervisor reports
      const supReports = all.filter((inv) => inv.type === 'supervisor_report');
      setReports(supReports);
    } catch (e) {
      console.warn('Fetch reports error:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
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

  // Clean, non-exaggerated dialect and language polisher
  const handlePolishText = () => {
    if (!reportText.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة نص الملاحظات أو الشكوى أولاً لتحسين صياغتها ولغتها');
      return;
    }

    setIsAiRewriting(true);
    setAiSuccessBadge(false);

    setTimeout(() => {
      try {
        let text = reportText.trim();
        const dialectMap: [RegExp, string][] = [
          [/\b(مش راضي|ما بدو|ما يبي|ما بيرضى|مش موافق)\b/gi, 'يرفض'],
          [/\b(مش عايز|مش عاوز|مش حابب|ما وده)\b/gi, 'لا يرغب في'],
          [/\b(مش بيسمع الكلام|مابيردش على التعليمات)\b/gi, 'عدم الالتزام بالتعليمات'],
          [/\b(مش ملتزم|مش منضبط)\b/gi, 'غير ملتزم'],
          [/\b(عمال يتاخر|بيتاخر كتير|دايما بيتاخر|عم يتأخر|بيتاخر)\b/gi, 'يتأخر باستمرار عن مواعيد العمل'],
          [/\b(تاخير كتير|تأخير كتير)\b/gi, 'تأخر متكرر'],
          [/\b(ما جاش|مجاش|ما حضرش|ما اجا|ماجا)\b/gi, 'لم يحضر للعمل'],
          [/\b(ساب الشغل|سيب الوردية|سيب الشغل|ساب الوردية)\b/gi, 'ترك الوردية دون إذن'],
          [/\b(اختفى|هرب|مش لاقينه|مش لاقيه)\b/gi, 'تعذر الوصول إليه في موقع العمل'],
          [/\b(مردش عليا|ما ردش عليا|ما ردش|مش بيرد|مابيردش|ما بيجاوب|قفل في وشي)\b/gi, 'لا يستجيب للاتصالات'],
          [/\b(تليفون|موبايل|جوال)\b/gi, 'الهاتف'],
          [/\b(مقفول|تليفونه مقفول)\b/gi, 'مغلق'],
          [/\b(يروح يسلم|يروح يوصل)\b/gi, 'التوجه لتسليم'],
          [/\b(اوردرات|أوردرات)\b/gi, 'طلبات'],
          [/\b(اوردر|أوردر)\b/gi, 'طلب'],
          [/\b(كنسل الاوردر|كنسل الطلب)\b/gi, 'ألغى الطلب'],
          [/\b(دباب|موتوسيكل|سيكل)\b/gi, 'المركبة'],
          [/\b(اتخبط|خبط|صدم|عمل حادثة|وقع بالدباب)\b/gi, 'تعرض لحادث مروري'],
          [/\b(باظ|عطلان|خربان|خرب|مش شغال)\b/gi, 'معطل'],
          [/\b(زبون|الزبون)\b/gi, 'العميل'],
          [/\b(اتخانق مع|بيزعق مع|مسك في)\b/gi, 'حدث خلاف وتلاسن مع'],
          [/\b(بيعمل مشاكل)\b/gi, 'يثير خلافات تشغيلية'],
          [/\b(علشان|عشان|كرمال)\b/gi, 'بسبب'],
          [/\b(دلوقتي|هلق|الحين)\b/gi, 'حالياً'],
          [/\b(كويس|منيح)\b/gi, 'بشكل مناسب'],
          [/\b(شوية|شوي)\b/gi, 'قليلاً'],
          [/\b(كتير اوي|كتير|واجد)\b/gi, 'بشكل ملحوظ'],
          [/\b(معاهوش|معهوش|ما معه|مش معاه)\b/gi, 'لا يتوفر لديه'],
          [/\b(فلوس)\b/gi, 'مبلغ مالي'],
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

        if (text && !/[.!?،。]$/.test(text)) {
          text += '.';
        }

        setReportText(text);
        setAiSuccessBadge(true);
      } catch (e) {
        console.warn('Polish text error:', e);
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
    if (!reportText.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة نص التقرير أو الشكوى');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        // Edit existing
        await supervisorApi.updateInvestigation(editingId, {
          reportText: reportText.trim(),
        });
        Alert.alert('تم التعديل', 'تم تحديث بيانات التقرير الإداري بنجاح.');
      } else {
        // Create new
        await supervisorApi.createEmployeeReportOrAdvance({
          employeeId: selectedDelegate!.id,
          employeeName: selectedDelegate!.name,
          nationalId: selectedDelegate!.national_id,
          type: 'supervisor_report',
          reportText: reportText.trim(),
        });
        Alert.alert('تم بنجاح', `تم رفع التقرير الإداري الخاص بالمندوب (${selectedDelegate!.name}) للإدارة.`);
      }

      setEditingId(null);
      setSelectedDelegate(null);
      setSearchQuery('');
      setReportText('');
      setAiSuccessBadge(false);
      fetchReports();
      setActiveTab('list');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل حفظ التقرير، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start editing a report
  const handleStartEdit = (rep: PendingAdvanceRequest) => {
    setEditingId(rep.id);
    setReportText(rep.report_text || rep.reason || rep.notes || '');
    const del = branchDelegates.find((d) => d.id === rep.employee_id) || {
      id: rep.employee_id,
      name: rep.employee_name,
    } as any;
    setSelectedDelegate(del);
    setActiveTab('create');
  };

  // Delete a report permanently
  const handleDeleteReport = (rep: PendingAdvanceRequest) => {
    Alert.alert(
      'تأكيد الحذف النهائي',
      `هل أنت متأكد من حذف تقرير المندوب (${rep.employee_name}) نهائياً؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف نهائياً',
          style: 'destructive',
          onPress: async () => {
            try {
              await supervisorApi.deleteInvestigation(rep.id);
              Alert.alert('تم الحذف', 'تم حذف التقرير نهائياً.');
              fetchReports();
              if (onSuccess) onSuccess();
            } catch (err: any) {
              Alert.alert('خطأ', err?.message || 'تعذر حذف التقرير من السيرفر');
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
      {/* Top Mode Segment (سجل التقارير | إنشاء تقرير جديد) */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'list' && { backgroundColor: '#8b5cf6', elevation: 2 },
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
            سجل تقارير المشرف ({reports.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'create' && { backgroundColor: '#8b5cf6', elevation: 2 },
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
            {editingId ? 'تعديل التقرير' : 'إنشاء تقرير جديد'}
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
              refreshing={loadingReports}
              onRefresh={fetchReports}
              colors={['#8b5cf6']}
              tintColor="#8b5cf6"
            />
          ) : undefined
        }
      >
        {/* VIEW 1: LIST OF SUPERVISOR REPORTS */}
        {activeTab === 'list' ? (
          <View style={styles.listWrapper}>
            <View style={[styles.listHeaderInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.listSectionTitle, { color: colors.textPrimary }]}>
                تقارير المشرف الميدانية
              </Text>
              <Text style={[styles.listHint, { color: colors.textSecondary }]}>
                اضغط مطولاً على أي تقرير لتعديله أو حذفه
              </Text>
            </View>

            {loadingReports && reports.length === 0 ? (
              <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 40 }} />
            ) : reports.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={54} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  لا توجد تقارير مشرف مسجلة
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  يمكنك رفع تقرير جديد عن أي ملاحظة ميدانية أو مخالفة
                </Text>
                <TouchableOpacity
                  style={[styles.createFirstBtn, { backgroundColor: '#8b5cf6' }]}
                  onPress={() => setActiveTab('create')}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.createFirstBtnText}>إنشاء أول تقرير</Text>
                </TouchableOpacity>
              </View>
            ) : (
              reports.map((rep) => (
                <TouchableOpacity
                  key={rep.id}
                  style={[
                    styles.reportCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  activeOpacity={0.8}
                  onLongPress={() => setActionItem(rep)}
                  delayLongPress={350}
                >
                  <View style={[styles.reportIconBox, { backgroundColor: '#8b5cf618' }]}>
                    <Ionicons name="document-text" size={22} color="#8b5cf6" />
                  </View>
                  <View style={[styles.reportInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <View style={[styles.repHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.repName, { color: colors.textPrimary }]}>
                        {rep.employee_name}
                      </Text>
                      <View style={styles.repBadge}>
                        <Text style={styles.repBadgeText}>تقرير مشرف</Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.repText,
                        { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                      ]}
                      numberOfLines={3}
                    >
                      {rep.report_text || rep.reason || rep.notes || 'لا يوجد نص'}
                    </Text>
                    <View style={[styles.repFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.repDate, { color: colors.textSecondary }]}>
                        {rep.created_at ? new Date(rep.created_at).toLocaleDateString('ar-SA') : ''}
                      </Text>
                      <Text style={styles.longPressHint}>اضغط مطولاً للخيارات</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          /* VIEW 2: CREATE / EDIT SUPERVISOR REPORT FORM */
          <View style={styles.formWrapper}>
            {/* Delegate Search Section */}
            <View style={styles.sectionCard}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                اختيار المندوب المعني بالتقرير *
              </Text>

              {selectedDelegate ? (
                <View
                  style={[
                    styles.selectedCard,
                    { backgroundColor: isDarkMode ? '#1e1b4b30' : '#f5f3ff', borderColor: '#8b5cf6' },
                  ]}
                >
                  <View style={[styles.selectedAvatar, { backgroundColor: '#8b5cf6' }]}>
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
                            <View style={[styles.avatarMini, { backgroundColor: colors.primaryLight }]}>
                              <Text style={[styles.avatarMiniText, { color: colors.primary }]}>
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

            {/* Report Text Section */}
            <View style={styles.sectionCard}>
              <View style={[styles.labelWithActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
                  تفاصيل التقرير أو الشكوى الإدارية *
                </Text>

                {/* Polish Language Button */}
                <TouchableOpacity
                  style={[styles.aiBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                  onPress={handlePolishText}
                  disabled={isAiRewriting}
                  activeOpacity={0.8}
                >
                  {isAiRewriting ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={14} color={colors.primary} />
                      <Text style={[styles.aiBtnText, { color: colors.primary }]}>تحسين الصياغة واللهجة</Text>
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
                numberOfLines={6}
                placeholder="اكتب الملاحظات أو الشكوى (سريعة أو بالعامية)، واضغط على تحسين الصياغة لضبط اللهجة واللغة فصحى ومباشرة بدون إطالة..."
                placeholderTextColor={colors.textSecondary}
                value={reportText}
                onChangeText={(text) => {
                  setReportText(text);
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
              style={[styles.submitBtn, { backgroundColor: '#8b5cf6' }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name={editingId ? 'save' : 'paper-plane'} size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {editingId ? 'حفظ تعديلات التقرير' : 'اعتماد وإرسال التقرير للإدارة'}
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
                  setReportText('');
                  setActiveTab('list');
                }}
              >
                <Text style={[styles.cancelEditBtnText, { color: colors.textSecondary }]}>إلغاء التعديل</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* Long Press Action Bottom Sheet (Ohda Style) */}
      <ItemActionBottomSheet
        visible={!!actionItem}
        title={actionItem ? `تقرير المندوب: ${actionItem.employee_name}` : ''}
        subtitle="اختر الإجراء المطلوب تنفيذه على هذا التقرير"
        itemTypeLabel="التقرير"
        onEdit={() => {
          if (actionItem) handleStartEdit(actionItem);
          setActionItem(null);
        }}
        onDelete={() => {
          if (actionItem) handleDeleteReport(actionItem);
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
  reportCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  reportIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportInfo: {
    flex: 1,
    gap: 4,
  },
  repHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  repName: {
    fontSize: 15,
    fontWeight: '800',
  },
  repBadge: {
    backgroundColor: '#8b5cf618',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  repBadgeText: {
    color: '#8b5cf6',
    fontSize: 11,
    fontWeight: '700',
  },
  repText: {
    fontSize: 13,
    lineHeight: 19,
  },
  repFooterRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 4,
  },
  repDate: {
    fontSize: 11,
  },
  longPressHint: {
    fontSize: 10,
    color: '#8b5cf6',
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
    backgroundColor: '#8b5cf620',
    borderRadius: 8,
  },
  changeBtnText: {
    color: '#8b5cf6',
    fontSize: 12,
    fontWeight: '700',
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
    minHeight: 140,
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
    marginTop: 10,
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
