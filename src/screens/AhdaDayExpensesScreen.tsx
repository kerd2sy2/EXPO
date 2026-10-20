import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Platform,
  Dimensions,
  Modal,
  Animated,
  LayoutAnimation,
  UIManager,
  TextInput,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors } from '../types/delegate';
import { CustodyDayData, CustodyExpenseItem } from '../services/custodyService';
import { formatImageUrl } from '../services/api';
import { toArabicDigits, formatArabicNumber } from '../utils/formatters';
import { AhdaInvoicesSkeleton } from '../components/skeleton/AhdaInvoicesSkeleton';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ExpenseCardProps {
  item: CustodyExpenseItem;
  idx: number;
  totalCount: number;
  catObj: { key: string; label: string; icon: string; color: string; bg: string };
  fullImg: string | null;
  timeStr: string;
  dateStr: string;
  isReorderMode: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  onPressDetails: () => void;
  onLongPressAction: () => void;
  onPreviewImage: (url: string) => void;
  onOpenReorderModal: (item: CustodyExpenseItem, idx: number) => void;
}

const ExpenseCard: React.FC<ExpenseCardProps> = ({
  item,
  idx,
  totalCount,
  catObj,
  fullImg,
  timeStr,
  dateStr,
  isReorderMode,
  colors,
  isDarkMode,
  onPressDetails,
  onLongPressAction,
  onPreviewImage,
  onOpenReorderModal,
}) => {
  return (
    <View
      style={[
        styles.invoiceCard,
        {
          backgroundColor: isReorderMode
            ? (isDarkMode ? '#064e3b18' : '#ecfdf5')
            : colors.card,
          borderColor: isReorderMode ? '#059669' : colors.border,
          borderWidth: isReorderMode ? 1.5 : 1,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => {
          if (isReorderMode) {
            onOpenReorderModal(item, idx);
          } else {
            onPressDetails();
          }
        }}
        onLongPress={() => {
          if (!isReorderMode) {
            onLongPressAction();
          }
        }}
      >
        {/* Top: Icon + Category + Date & Time Stamp + (Optional Reorder Button in Reorder Mode) + Thumbnail */}
        <View style={styles.invoiceCardTop}>
          <View style={styles.invoiceLeftInfo}>
            <View style={[styles.catBadge, { backgroundColor: catObj.bg }]}>
              <Ionicons name={catObj.icon as any} size={18} color={catObj.color} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.invoiceCategory, { color: colors.textPrimary }]}>
                {catObj.label}
              </Text>
              <View style={styles.timestampRow}>
                <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                <Text style={[styles.invoiceTime, { color: colors.textSecondary }]}>
                  {timeStr} • {toArabicDigits(dateStr)}
                </Text>
              </View>
            </View>
          </View>

          {/* Right side: Reorder Button (Only in Reorder Mode) OR Thumbnail (No index in normal view) */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            {isReorderMode ? (
              <TouchableOpacity
                style={[
                  styles.reorderCardPillBtn,
                  {
                    backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
                    borderColor: '#059669',
                  },
                ]}
                onPress={() => onOpenReorderModal(item, idx)}
                activeOpacity={0.8}
              >
                <Feather name="edit-3" size={13} color="#047857" style={{ marginLeft: 4 }} />
                <Text style={[styles.reorderCardPillText, { color: '#047857' }]}>
                  الكرت #{toArabicDigits(idx + 1)}
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Thumbnail in corner if attached */}
            {fullImg ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onPreviewImage(fullImg);
                }}
                style={styles.cardHeaderThumbBtn}
                activeOpacity={0.8}
                disabled={isReorderMode}
              >
                <Image source={{ uri: fullImg }} style={styles.cardHeaderThumbImg} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Middle: Recipient & Note */}
        <View style={styles.invoiceCardMiddle}>
          <View style={styles.invoiceRecipientRow}>
            <Ionicons name="person-outline" size={13} color="#047857" />
            <Text style={[styles.invoiceRecipientText, { color: colors.textPrimary }]} numberOfLines={2}>
              المستلم / البيان: {item.recipient_name || '—'}
            </Text>
          </View>
          {item.export_number ? (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <Ionicons name="barcode-outline" size={13} color="#0284c7" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284c7' }}>
                رقم الصادر: {item.export_number}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bottom: Amount Badge + Attachment indicator / Reorder Action Prompt */}
        <View style={styles.invoiceCardBottom}>
          <View style={styles.amountPill}>
            <Text style={styles.amountPillVal}>
              {formatArabicNumber(item.amount, 2)}
            </Text>
            <Image
              source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={{ width: 13, height: 13, tintColor: '#047857', marginLeft: 4 }}
              resizeMode="contain"
            />
          </View>

          {isReorderMode ? (
            <TouchableOpacity
              style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}
              onPress={() => onOpenReorderModal(item, idx)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={14} color="#047857" />
              <Text style={{ fontSize: 11, color: '#047857', fontWeight: '800' }}>
                اضغط لتحديد رقم الترتيب
              </Text>
            </TouchableOpacity>
          ) : fullImg ? (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <Ionicons name="image" size={13} color="#047857" />
              <Text style={{ fontSize: 11, color: '#047857', fontWeight: '700' }}>مرفق فاتورة</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <Ionicons name="receipt-outline" size={12} color={colors.textSecondary} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>لا يوجد مرفق لهذا الإيصال</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};


interface AhdaDayExpensesScreenProps {
  currentDay: CustodyDayData | null;
  selectedDate: string;
  categoryFilter?: string | null;
  loading?: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  categories: Array<{ key: string; label: string; icon: string; color: string; bg: string }>;
  onBack: () => void;
  onOpenAddExpense: () => void;
  onEditExpense: (item: CustodyExpenseItem) => void;
  onDeleteExpense: (item: CustodyExpenseItem) => void;
  onPreviewImage: (url: string) => void;
  onReorderExpenses?: (reorderedExpenses: CustodyExpenseItem[]) => void;
}

export const AhdaDayExpensesScreen: React.FC<AhdaDayExpensesScreenProps> = ({
  currentDay,
  selectedDate,
  categoryFilter = null,
  loading = false,
  colors,
  isDarkMode,
  categories,
  onBack,
  onOpenAddExpense,
  onEditExpense,
  onDeleteExpense,
  onPreviewImage,
  onReorderExpenses,
}) => {
  // Long press options modal state
  const [selectedExpenseForAction, setSelectedExpenseForAction] = useState<CustodyExpenseItem | null>(null);
  // Single press invoice details and picture modal state
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] = useState<CustodyExpenseItem | null>(null);

  // Local list of expenses ordered to match the physical ledger
  const [orderedExpenses, setOrderedExpenses] = useState<CustodyExpenseItem[]>([]);

  // Load and apply saved custom order from AsyncStorage
  useEffect(() => {
    let isMounted = true;
    const syncExpenses = async () => {
      const base = currentDay?.expenses || [];
      if (base.length === 0) {
        if (isMounted) setOrderedExpenses([]);
        return;
      }
      try {
        const storedOrderStr = await AsyncStorage.getItem(`@custody_expenses_order_${selectedDate}`);
        if (storedOrderStr && isMounted) {
          const ids: string[] = JSON.parse(storedOrderStr);
          if (Array.isArray(ids) && ids.length > 0) {
            const map = new Map(ids.map((id, idx) => [id, idx]));
            const sorted = [...base].sort((a, b) => {
              const aIdx = map.has(a.id) ? map.get(a.id)! : 9999;
              const bIdx = map.has(b.id) ? map.get(b.id)! : 9999;
              if (aIdx !== bIdx) return aIdx - bIdx;
              return 0;
            });
            setOrderedExpenses(sorted);
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to load expenses order:', err);
      }
      if (isMounted) setOrderedExpenses(base);
    };

    syncExpenses();
    return () => {
      isMounted = false;
    };
  }, [currentDay?.expenses, selectedDate]);

  const matchedCategory = categories.find((c) => c.key === categoryFilter);
  const pageTitle = matchedCategory ? matchedCategory.label : 'فواتير ومصاريف اليوم';

  const filteredExpenses = useMemo(() => {
    if (!categoryFilter) return orderedExpenses;
    return orderedExpenses.filter((e) => e.category === categoryFilter);
  }, [orderedExpenses, categoryFilter]);

  // Reorder State
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);

  // Target item selected for direct number ordering
  const [reorderTarget, setReorderTarget] = useState<{
    item: CustodyExpenseItem;
    currentIdx: number;
  } | null>(null);
  const [orderNumberInput, setOrderNumberInput] = useState<string>('1');

  const openReorderModal = (item: CustodyExpenseItem, currentIdx: number) => {
    setReorderTarget({ item, currentIdx });
    setOrderNumberInput(String(currentIdx + 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  // Commit atomic reorder with native 60fps LayoutAnimation
  const handleCommitReorder = (fromFilteredIdx: number, toFilteredIdx: number) => {
    if (fromFilteredIdx === toFilteredIdx) return;
    if (fromFilteredIdx < 0 || toFilteredIdx < 0) return;
    if (fromFilteredIdx >= filteredExpenses.length || toFilteredIdx >= filteredExpenses.length) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const fromItem = filteredExpenses[fromFilteredIdx];
    const toItem = filteredExpenses[toFilteredIdx];
    if (!fromItem || !toItem) return;

    setOrderedExpenses((prevList) => {
      const nextList = [...prevList];
      const fromMasterIdx = nextList.findIndex((e) => e.id === fromItem.id);
      const toMasterIdx = nextList.findIndex((e) => e.id === toItem.id);

      if (fromMasterIdx !== -1 && toMasterIdx !== -1) {
        const [moved] = nextList.splice(fromMasterIdx, 1);
        nextList.splice(toMasterIdx, 0, moved);

        const orderIds = nextList.map((e) => e.id);
        AsyncStorage.setItem(`@custody_expenses_order_${selectedDate}`, JSON.stringify(orderIds)).catch((e) =>
          console.warn('Failed to save order to storage:', e)
        );

        if (onReorderExpenses) {
          onReorderExpenses(nextList);
        }
        return nextList;
      }
      return prevList;
    });

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handleApplyNewOrderNumber = () => {
    if (!reorderTarget) return;
    const rawVal = parseInt(orderNumberInput, 10);
    if (isNaN(rawVal)) {
      Alert.alert('تنبيه', 'يرجى كتابة رقم صحيح للترتيب.');
      return;
    }
    const clamped1Based = Math.max(1, Math.min(filteredExpenses.length, rawVal));
    const toIdx = clamped1Based - 1;
    const fromIdx = reorderTarget.currentIdx;

    setReorderTarget(null);
    if (fromIdx !== toIdx) {
      handleCommitReorder(fromIdx, toIdx);
    }
  };

  const totalFilteredAmount = filteredExpenses.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      {/* ── Sub-Page Header Row (Matching Delegate Style) ── */}
      <View style={styles.subPageHeaderRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.subPageTitleContainer}>
          <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary }]}>
            {pageTitle}
          </Text>
          <View style={[styles.titleUnderlineBar, { backgroundColor: matchedCategory ? matchedCategory.color : '#047857' }]} />
        </View>

        {/* Toggle Reorder Mode Button in Header */}
        <TouchableOpacity
          style={[
            styles.headerReorderToggleBtn,
            isReorderMode && { backgroundColor: '#047857', borderColor: '#047857' },
          ]}
          onPress={() => {
            setIsReorderMode((prev) => !prev);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isReorderMode ? 'checkmark' : 'swap-vertical'}
            size={20}
            color={isReorderMode ? '#ffffff' : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, filteredExpenses.length === 0 && !loading && { flex: 1, justifyContent: 'center' }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Invoices List ── */}
        {loading ? (
          <AhdaInvoicesSkeleton colors={colors} isDarkMode={isDarkMode} count={4} />
        ) : filteredExpenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={56} color={colors.textSecondary} style={{ opacity: 0.25 }} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              لا توجد فواتير الان لعرضها
            </Text>
          </View>
        ) : (
          <View style={styles.invoicesList}>
            {filteredExpenses.map((item, idx) => {
              const catObj = categories.find((c) => c.key === item.category) || categories[5];
              const fullImg = formatImageUrl(item.image_url);

              const dateObj = item.created_at ? new Date(item.created_at) : null;
              const timeStr = dateObj
                ? dateObj.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                : '—';
              const dateStr = dateObj
                ? dateObj.toLocaleDateString('ar-SA', { month: 'numeric', day: 'numeric' })
                : selectedDate;

              return (
                <ExpenseCard
                  key={item.id || idx}
                  item={item}
                  idx={idx}
                  totalCount={filteredExpenses.length}
                  catObj={catObj}
                  fullImg={fullImg}
                  timeStr={timeStr}
                  dateStr={dateStr}
                  isReorderMode={isReorderMode}
                  colors={colors}
                  isDarkMode={isDarkMode}
                  onPressDetails={() => setSelectedExpenseForDetails(item)}
                  onLongPressAction={() => setSelectedExpenseForAction(item)}
                  onPreviewImage={onPreviewImage}
                  onOpenReorderModal={openReorderModal}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── 1. Single Tap Invoice Details & Picture Modal (View Only) ── */}
      <Modal
        visible={!!selectedExpenseForDetails}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedExpenseForDetails(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedExpenseForDetails(null)}
          />
          <View style={[styles.detailsSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHandle} />

            {/* Header: Category Badge + Close button */}
            {(() => {
              const detailsItem = selectedExpenseForDetails;
              if (!detailsItem) return null;
              const catObj = categories.find((c) => c.key === detailsItem.category) || categories[5];
              const detailsImg = formatImageUrl(detailsItem.image_url);
              const dateObj = detailsItem.created_at ? new Date(detailsItem.created_at) : null;
              const timeStr = dateObj
                ? dateObj.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
                : '—';
              const dateStr = dateObj
                ? dateObj.toLocaleDateString('ar-SA', { year: 'numeric', month: 'numeric', day: 'numeric' })
                : selectedDate;

              return (
                <>
                  <View style={styles.detailsHeaderRow}>
                    <TouchableOpacity
                      onPress={() => setSelectedExpenseForDetails(null)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle-outline" size={26} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                      <View style={[styles.catBadge, { backgroundColor: catObj.bg }]}>
                        <Ionicons name={catObj.icon as any} size={20} color={catObj.color} />
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.detailsCatTitle, { color: colors.textPrimary }]}>
                          فاتورة {catObj.label}
                        </Text>
                        <Text style={[styles.detailsTimeSub, { color: colors.textSecondary }]}>
                          {timeStr} • {toArabicDigits(dateStr)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Main Amount Card */}
                  <View style={[styles.detailsAmountCard, { backgroundColor: isDarkMode ? '#1e293b' : '#ecfdf5', borderColor: '#fed7aa' }]}>
                    <Text style={styles.detailsAmountLabel}>المبلغ المسجل للفاتورة</Text>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Text style={styles.detailsAmountValue}>
                        {formatArabicNumber(detailsItem.amount, 2)}
                      </Text>
                      <Image
                        source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
                        style={{ width: 20, height: 20, tintColor: '#047857' }}
                        resizeMode="contain"
                      />
                    </View>
                  </View>

                  {/* Recipient / Description Row */}
                  <View style={[styles.detailsInfoRow, { borderColor: colors.border, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' }]}>
                    <Text style={[styles.detailsInfoLabel, { color: colors.textSecondary }]}>المستلم / البيان:</Text>
                    <Text style={[styles.detailsInfoValue, { color: colors.textPrimary }]} numberOfLines={3}>
                      {detailsItem.recipient_name || '—'}
                    </Text>
                  </View>

                  {/* Export Number Row if present */}
                  {detailsItem.export_number ? (
                    <View style={[styles.detailsInfoRow, { borderColor: colors.border, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', marginTop: 8 }]}>
                      <Text style={[styles.detailsInfoLabel, { color: colors.textSecondary }]}>رقم الصادر:</Text>
                      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                        <Ionicons name="barcode-outline" size={16} color="#047857" />
                        <Text style={[styles.detailsInfoValue, { color: '#047857', fontWeight: '800', fontSize: 15 }]}>
                          {detailsItem.export_number}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Attached Picture Section */}
                  <View style={{ width: '100%', marginVertical: 14 }}>
                    <Text style={[styles.detailsSectionTitle, { color: colors.textPrimary }]}>
                      صورة الفاتورة المرفقة:
                    </Text>

                    {detailsImg ? (
                      <TouchableOpacity
                        style={styles.detailsImageContainer}
                        activeOpacity={0.85}
                        onPress={() => {
                          setSelectedExpenseForDetails(null);
                          onPreviewImage(detailsImg);
                        }}
                      >
                        <Image source={{ uri: detailsImg }} style={styles.detailsFullImage} resizeMode="cover" />
                        <View style={styles.detailsImageZoomBadge}>
                          <Ionicons name="expand" size={14} color="#ffffff" />
                          <Text style={styles.detailsImageZoomText}>اضغط للتكبير الكامل</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.detailsNoImageBox, { borderColor: colors.border }]}>
                        <Ionicons name="image-outline" size={32} color={colors.textSecondary} style={{ opacity: 0.4 }} />
                        <Text style={[styles.detailsNoImageText, { color: colors.textSecondary }]}>
                          لا توجد صورة مرفقة مع هذه الفاتورة
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Long press Hint */}
                  <View style={styles.detailsHintBox}>
                    <Ionicons name="information-circle-outline" size={15} color="#047857" />
                    <Text style={styles.detailsHintText}>
                      للتعديل أو الحذف، اضغط مطولاً على كرت الفاتورة من القائمة
                    </Text>
                  </View>

                  {/* Close button */}
                  <TouchableOpacity
                    style={[styles.sheetCancelBtn, { borderColor: colors.border, marginTop: 10 }]}
                    onPress={() => setSelectedExpenseForDetails(null)}
                  >
                    <Text style={[styles.sheetCancelBtnText, { color: colors.textSecondary }]}>إغلاق</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* ── 2. Long Press Options Bottom Sheet Modal (Reorder, Edit, Delete) ── */}
      <Modal
        visible={!!selectedExpenseForAction}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedExpenseForAction(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setSelectedExpenseForAction(null)}
          />
          <View style={[styles.actionSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHandle} />

            {/* Action Sheet Header with Category & Info */}
            {(() => {
              if (!selectedExpenseForAction) return null;
              const catObj = categories.find((c) => c.key === selectedExpenseForAction.category) || categories[5];
              return (
                <View style={styles.actionSheetHeaderRow}>
                  <View style={[styles.catBadge, { backgroundColor: catObj.bg }]}>
                    <Ionicons name={catObj.icon as any} size={20} color={catObj.color} />
                  </View>
                  <View style={{ alignItems: 'flex-end', flex: 1 }}>
                    <Text style={[styles.actionSheetTitle, { color: colors.textPrimary }]}>
                      إدارة فاتورة {catObj.label}
                    </Text>
                    <Text style={[styles.actionSheetSub, { color: colors.textSecondary }]}>
                      المستلم: {selectedExpenseForAction.recipient_name || 'بدون بيان'} • {formatArabicNumber(selectedExpenseForAction.amount, 2)} ر.س
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Standard Actions (Edit / Reorder / Delete) */}
            <View style={styles.actionSheetBtnsCol}>
              {/* Edit Option */}
              <TouchableOpacity
                style={[styles.sheetOptionBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}
                onPress={() => {
                  const target = selectedExpenseForAction;
                  setSelectedExpenseForAction(null);
                  if (target) onEditExpense(target);
                }}
              >
                <View style={styles.sheetOptionIconBox}>
                  <Feather name="edit-2" size={18} color="#047857" />
                </View>
                <Text style={[styles.sheetOptionText, { color: colors.textPrimary }]}>
                  تعديل بيانات ومبلغ الفاتورة
                </Text>
              </TouchableOpacity>


              {/* Delete Option */}
              <TouchableOpacity
                style={[styles.sheetOptionBtn, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
                onPress={() => {
                  const target = selectedExpenseForAction;
                  setSelectedExpenseForAction(null);
                  if (target) onDeleteExpense(target);
                }}
              >
                <View style={[styles.sheetOptionIconBox, { backgroundColor: '#fee2e2' }]}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </View>
                <Text style={[styles.sheetOptionText, { color: '#ef4444' }]}>
                  حذف الفاتورة نهائياً
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
              onPress={() => setSelectedExpenseForAction(null)}
            >
              <Text style={[styles.sheetCancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 3. Type Card Position / Reorder Bottom Sheet Modal ── */}
      <Modal
        visible={!!reorderTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setReorderTarget(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalBackdrop}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setReorderTarget(null)}
            />
            <View style={[styles.reorderInputSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sheetHandle} />

              {/* Header */}
              <View style={styles.reorderModalHeaderRow}>
                <TouchableOpacity
                  onPress={() => setReorderTarget(null)}
                  style={styles.reorderModalCloseBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                  <Text style={[styles.reorderSheetTitle, { color: colors.textPrimary }]}>
                    تحديد رقم ترتيب الكرت
                  </Text>
                  <Text style={[styles.reorderSheetSub, { color: colors.textSecondary }]}>
                    اكتب رقم الترتيب لنقل الفاتورة إلى الموضع المطلوب مباشرة
                  </Text>
                </View>
              </View>

              {/* Card Summary Card */}
              {reorderTarget && (
                <View style={[styles.reorderCardSummary, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
                  <View style={styles.reorderSummaryLeft}>
                    <Text style={[styles.reorderSummaryAmount, { color: '#047857' }]}>
                      {formatArabicNumber(reorderTarget.item.amount, 2)} ر.س
                    </Text>
                  </View>
                  <View style={styles.reorderSummaryRight}>
                    <Text style={[styles.reorderSummaryRecipient, { color: colors.textPrimary }]} numberOfLines={1}>
                      {reorderTarget.item.recipient_name || 'بدون بيان'}
                    </Text>
                    <Text style={[styles.reorderSummaryCurrentPos, { color: colors.textSecondary }]}>
                      الترتيب الحالي: الكرت رقم ({reorderTarget.currentIdx + 1}) من إجمالي ({filteredExpenses.length})
                    </Text>
                  </View>
                </View>
              )}

              {/* Number Input Control Row (+ / - and direct input) */}
              <View style={styles.reorderInputControlRow}>
                <TouchableOpacity
                  style={[styles.reorderStepBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}
                  onPress={() => {
                    const currentVal = parseInt(orderNumberInput, 10) || 1;
                    if (currentVal < filteredExpenses.length) {
                      setOrderNumberInput(String(currentVal + 1));
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={24} color="#047857" />
                </TouchableOpacity>

                <View style={[styles.reorderInputWrap, { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: '#047857' }]}>
                  <TextInput
                    style={[styles.reorderTextInput, { color: colors.textPrimary }]}
                    value={orderNumberInput}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/[^0-9]/g, '');
                      setOrderNumberInput(cleaned);
                    }}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    maxLength={3}
                    placeholder="1"
                    placeholderTextColor={colors.textSecondary}
                    textAlign="center"
                  />
                  <Text style={[styles.reorderInputLabel, { color: colors.textSecondary }]}>
                    من {filteredExpenses.length}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.reorderStepBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}
                  onPress={() => {
                    const currentVal = parseInt(orderNumberInput, 10) || 1;
                    if (currentVal > 1) {
                      setOrderNumberInput(String(currentVal - 1));
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={24} color="#047857" />
                </TouchableOpacity>
              </View>

              {/* Quick Jump Shortcuts */}
              <View style={styles.reorderQuickShortcutsRow}>
                <TouchableOpacity
                  style={[styles.reorderShortcutChip, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}
                  onPress={() => setOrderNumberInput('1')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.reorderShortcutText, { color: colors.textPrimary }]}>الأول (رقم 1)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reorderShortcutChip, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}
                  onPress={() => setOrderNumberInput(String(filteredExpenses.length))}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.reorderShortcutText, { color: colors.textPrimary }]}>الأخير (رقم {filteredExpenses.length})</Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.reorderSubmitBtn}
                onPress={handleApplyNewOrderNumber}
                activeOpacity={0.85}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" style={{ marginLeft: 6 }} />
                <Text style={styles.reorderSubmitBtnText}>تطبيق الترتيب الجديد</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subPageHeaderRow: {
    height: 56,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  headerBackBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerReorderToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderBanner: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'column',
    gap: 10,
  },
  reorderBannerInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  reorderBannerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  reorderBannerSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  reorderBannerDoneBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#047857',
    paddingVertical: 9,
    borderRadius: 10,
  },
  reorderBannerDoneBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  dragHandlePill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dragHandlePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  subPageTitleContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  subPageHeaderTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'right',
  },
  titleUnderlineBar: {
    width: 28,
    height: 3,
    borderRadius: 2,
    alignSelf: 'flex-end',
  },
  addTopBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  statUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ef4444',
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  dateTagRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  dateTagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoicesList: {
    gap: 12,
  },
  invoiceCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  invoiceCardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardHeaderThumbBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#047857',
    backgroundColor: '#f1f5f9',
  },
  cardHeaderThumbImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  invoiceLeftInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  catBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceCategory: {
    fontSize: 14,
    fontWeight: '800',
  },
  timestampRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  invoiceTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  invoiceActionsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  invoiceIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceCardMiddle: {
    marginBottom: 10,
    paddingVertical: 4,
  },
  invoiceRecipientRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  invoiceRecipientText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  invoiceCardBottom: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  imagePreviewBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  invoiceImgThumb: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  imageBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  imageBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  noImgBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  noImgText: {
    fontSize: 10,
    fontWeight: '500',
  },
  amountPill: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
  },
  amountPillVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#047857',
  },
  amountPillUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyAddBtn: {
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 6,
  },
  emptyAddBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  // Modal Backdrop and Action Sheet
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  actionSheetBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 16,
  },
  ledgerCardIndexPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerCardIndexText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  actionSheetHeaderRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  actionSheetSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  reorderControlsPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  reorderArrowBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reorderArrowBtnDisabled: {
    backgroundColor: 'transparent',
    opacity: 0.35,
    shadowOpacity: 0,
    elevation: 0,
  },
  reorderSlotBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
  },
  reorderSlotText: {
    fontSize: 12,
    fontWeight: '800',
  },
  actionSheetBtnsCol: {
    width: '100%',
    gap: 10,
    marginBottom: 14,
  },
  sheetOptionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  sheetOptionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sheetCancelBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Details Sheet Modal Styles
  detailsSheetBox: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
    maxHeight: '90%',
  },
  detailsHeaderRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  detailsCatTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  detailsTimeSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  detailsAmountCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsAmountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  detailsAmountValue: {
    fontSize: 26,
    fontWeight: '900',
    color: '#047857',
  },
  detailsInfoRow: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  detailsInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailsInfoValue: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'left',
  },
  detailsSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
  },
  detailsImageContainer: {
    width: '100%',
    height: 190,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  detailsFullImage: {
    width: '100%',
    height: '100%',
  },
  detailsImageZoomBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  detailsImageZoomText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  detailsNoImageBox: {
    width: '100%',
    height: 90,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  detailsNoImageText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailsHintBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  detailsHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  reorderCardPillBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  reorderCardPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  reorderInputSheetBox: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  reorderModalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  reorderModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  reorderSheetSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  reorderCardSummary: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reorderSummaryRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  reorderSummaryRecipient: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  reorderSummaryCurrentPos: {
    fontSize: 11,
    fontWeight: '600',
  },
  reorderSummaryLeft: {
    paddingLeft: 8,
  },
  reorderSummaryAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  reorderInputControlRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  reorderStepBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderInputWrap: {
    width: 140,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  reorderTextInput: {
    fontSize: 26,
    fontWeight: '900',
    width: '100%',
    textAlign: 'center',
    padding: 0,
  },
  reorderInputLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
  },
  reorderQuickShortcutsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  reorderShortcutChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  reorderShortcutText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reorderSubmitBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#047857',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  reorderSubmitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
