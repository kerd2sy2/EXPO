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
  PanResponder,
  LayoutAnimation,
  UIManager,
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

interface DraggableExpenseCardProps {
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
  onNudge: (idx: number, direction: 'up' | 'down') => void;
  onDragStart: (id: string) => void;
  onDragCommit: (fromIdx: number, toIdx: number) => void;
  onDragEnd: () => void;
}

const DraggableExpenseCard: React.FC<DraggableExpenseCardProps> = ({
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
  onNudge,
  onDragStart,
  onDragCommit,
  onDragEnd,
}) => {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);
  const [targetSlot, setTargetSlot] = useState<number | null>(null);

  const idxRef = useRef(idx);
  idxRef.current = idx;
  const totalCountRef = useRef(totalCount);
  totalCountRef.current = totalCount;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => isReorderMode,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          if (!isReorderMode) return false;
          return Math.abs(gestureState.dx) > 6 || Math.abs(gestureState.dy) > 6;
        },
        onPanResponderGrant: () => {
          setIsDragging(true);
          setTargetSlot(idxRef.current);
          onDragStart(item.id);
          Animated.spring(scale, {
            toValue: 1.03,
            friction: 7,
            tension: 120,
            useNativeDriver: false,
          }).start();
        },
        onPanResponderMove: (_, gestureState) => {
          pan.setValue({ x: gestureState.dx, y: gestureState.dy });
          const rowOffset = Math.round(gestureState.dy / 125);
          const computedTarget = Math.max(0, Math.min(totalCountRef.current - 1, idxRef.current + rowOffset));
          setTargetSlot(computedTarget);
        },
        onPanResponderRelease: (_, gestureState) => {
          const rowOffset = Math.round(gestureState.dy / 125);
          const finalTarget = Math.max(0, Math.min(totalCountRef.current - 1, idxRef.current + rowOffset));
          const from = idxRef.current;

          setIsDragging(false);
          setTargetSlot(null);

          Animated.parallel([
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 8,
              tension: 90,
              useNativeDriver: false,
            }),
            Animated.spring(scale, {
              toValue: 1,
              friction: 7,
              tension: 100,
              useNativeDriver: false,
            }),
          ]).start(() => {
            onDragEnd();
          });

          if (finalTarget !== from) {
            onDragCommit(from, finalTarget);
          }
        },
        onPanResponderTerminate: () => {
          setIsDragging(false);
          setTargetSlot(null);
          Animated.parallel([
            Animated.spring(pan, {
              toValue: { x: 0, y: 0 },
              friction: 8,
              tension: 90,
              useNativeDriver: false,
            }),
            Animated.spring(scale, {
              toValue: 1,
              friction: 7,
              tension: 100,
              useNativeDriver: false,
            }),
          ]).start(() => {
            onDragEnd();
          });
        },
      }),
    [isReorderMode, item.id]
  );

  return (
    <Animated.View
      style={[
        styles.invoiceCard,
        {
          backgroundColor: isDragging
            ? (isDarkMode ? '#1e3a2f' : '#ecfdf5')
            : colors.card,
          borderColor: isDragging
            ? '#047857'
            : (isReorderMode ? '#a7f3d0' : colors.border),
          borderWidth: isDragging ? 2 : (isReorderMode ? 1.5 : 1),
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale },
          ],
          zIndex: isDragging ? 9999 : 1,
          elevation: isDragging ? 16 : 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: isDragging ? 12 : 2 },
          shadowOpacity: isDragging ? 0.35 : 0.05,
          shadowRadius: isDragging ? 16 : 8,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={isReorderMode ? 1 : 0.88}
        onPress={() => {
          if (!isReorderMode) onPressDetails();
        }}
        onLongPress={() => {
          if (!isReorderMode) onLongPressAction();
        }}
        disabled={isReorderMode}
      >
        {/* Top: Icon + Category + Date & Time Stamp + Ledger Index / Reorder Nudge */}
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

          {/* Right side: Reorder Controls (Arrows + Position) OR Ledger Index & Thumbnail */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            {isReorderMode ? (
              <View style={[styles.reorderControlsPill, { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5' }]}>
                {/* Nudge Up Button */}
                <TouchableOpacity
                  style={[
                    styles.reorderArrowBtn,
                    idx === 0 && styles.reorderArrowBtnDisabled,
                  ]}
                  disabled={idx === 0}
                  onPress={() => onNudge(idx, 'up')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name="chevron-up"
                    size={17}
                    color={idx === 0 ? (isDarkMode ? '#334155' : '#cbd5e1') : '#047857'}
                  />
                </TouchableOpacity>

                {/* Line number / Destination preview badge */}
                <View style={[styles.reorderSlotBadge, isDragging && { backgroundColor: '#047857' }]}>
                  <Ionicons
                    name="reorder-three"
                    size={14}
                    color={isDragging ? '#ffffff' : '#047857'}
                  />
                  <Text style={[styles.reorderSlotText, { color: isDragging ? '#ffffff' : '#047857' }]}>
                    {isDragging && targetSlot !== null && targetSlot !== idx
                      ? `إلى #${toArabicDigits(targetSlot + 1)}`
                      : `#${toArabicDigits(idx + 1)}`}
                  </Text>
                </View>

                {/* Nudge Down Button */}
                <TouchableOpacity
                  style={[
                    styles.reorderArrowBtn,
                    idx >= totalCount - 1 && styles.reorderArrowBtnDisabled,
                  ]}
                  disabled={idx >= totalCount - 1}
                  onPress={() => onNudge(idx, 'down')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name="chevron-down"
                    size={17}
                    color={idx >= totalCount - 1 ? (isDarkMode ? '#334155' : '#cbd5e1') : '#047857'}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View
                style={[
                  styles.ledgerCardIndexPill,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.ledgerCardIndexText, { color: colors.textSecondary }]}>
                  #{toArabicDigits(idx + 1)}
                </Text>
              </View>
            )}

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
        </View>

        {/* Bottom: Amount Badge + Attachment indicator / Reorder Hint */}
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
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <Ionicons name="swap-vertical" size={13} color="#047857" />
              <Text style={{ fontSize: 11, color: '#047857', fontWeight: '800' }}>
                {isDragging
                  ? `جارِ النقل إلى السطر #${toArabicDigits((targetSlot ?? idx) + 1)}`
                  : 'اضغط الأسهم 🔼 🔽 أو اسحب الكرت للترتيب'}
              </Text>
            </View>
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
    </Animated.View>
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
  const [scrollEnabled, setScrollEnabled] = useState<boolean>(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

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

  const handleNudgeExpense = (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1;
    handleCommitReorder(fromIdx, toIdx);
  };

  const handleDragStart = (id: string) => {
    setScrollEnabled(false);
    setActiveDragId(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const handleDragEnd = () => {
    setScrollEnabled(true);
    setActiveDragId(null);
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
        scrollEnabled={scrollEnabled}
        contentContainerStyle={[styles.scrollContent, filteredExpenses.length === 0 && !loading && { flex: 1, justifyContent: 'center' }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Floating Active Banner in Reorder Mode ── */}
        {isReorderMode && (
          <View style={[styles.reorderBanner, { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', borderColor: '#059669' }]}>
            <View style={styles.reorderBannerInfo}>
              <View style={styles.reorderBannerIconBox}>
                <Ionicons name="swap-vertical" size={20} color="#047857" />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[styles.reorderBannerTitle, { color: isDarkMode ? '#34d399' : '#047857' }]}>
                  وضع ترتيب الفواتير
                </Text>
                <Text style={[styles.reorderBannerSub, { color: isDarkMode ? '#a7f3d0' : '#065f46' }]}>
                  اضغط الأسهم 🔼 🔽 أو اسحب الكرت للترتيب الفوري والسلس
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.reorderBannerDoneBtn}
              activeOpacity={0.8}
              onPress={() => {
                setIsReorderMode(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              }}
            >
              <Ionicons name="checkmark-circle" size={17} color="#ffffff" />
              <Text style={styles.reorderBannerDoneBtnText}>تم الاعتماد ✓</Text>
            </TouchableOpacity>
          </View>
        )}

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
                <DraggableExpenseCard
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
                  onNudge={handleNudgeExpense}
                  onDragStart={handleDragStart}
                  onDragCommit={handleCommitReorder}
                  onDragEnd={handleDragEnd}
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

            {/* Standard Actions (Edit / Delete) */}
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
});
