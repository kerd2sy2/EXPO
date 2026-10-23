import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  LayoutAnimation,
  UIManager,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors } from '../types/delegate';
import { CustodyDayData, CustodyExpenseItem } from '../services/custodyService';
import { formatImageUrl } from '../services/api';
import { AhdaInvoicesSkeleton } from '../components/skeleton/AhdaInvoicesSkeleton';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { ExpenseCard } from '../components/expenses/ExpenseCard';
import { ExpenseDetailsModal } from '../components/modals/ExpenseDetailsModal';
import { ExpenseActionModal } from '../components/modals/ExpenseActionModal';
import { ExpenseReorderModal } from '../components/modals/ExpenseReorderModal';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  initialExpenseDetails?: CustodyExpenseItem | null;
  onClearInitialExpenseDetails?: () => void;
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
  initialExpenseDetails = null,
  onClearInitialExpenseDetails,
}) => {
  // Long press options modal state
  const [selectedExpenseForAction, setSelectedExpenseForAction] = useState<CustodyExpenseItem | null>(null);
  // Single press invoice details and picture modal state
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] = useState<CustodyExpenseItem | null>(initialExpenseDetails || null);

  useEffect(() => {
    if (initialExpenseDetails) {
      setSelectedExpenseForDetails(initialExpenseDetails);
      onClearInitialExpenseDetails?.();
    }
  }, [initialExpenseDetails, onClearInitialExpenseDetails]);

  // Local list of expenses ordered to match the physical ledger
  const [orderedExpenses, setOrderedExpenses] = useState<CustodyExpenseItem[]>(() => currentDay?.expenses || []);

  // Load and apply saved custom order from AsyncStorage without empty state flash
  useEffect(() => {
    let isMounted = true;
    const base = currentDay?.expenses || [];
    if (base.length === 0) {
      if (isMounted) setOrderedExpenses([]);
      return;
    }

    setOrderedExpenses((prev) => (prev.length === 0 ? base : prev));

    AsyncStorage.getItem(`@custody_expenses_order_${selectedDate}`)
      .then((storedOrderStr) => {
        if (!isMounted) return;
        if (storedOrderStr) {
          try {
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
          } catch (_) {}
        }
        setOrderedExpenses(base);
      })
      .catch(() => {
        if (isMounted) setOrderedExpenses(base);
      });

    return () => {
      isMounted = false;
    };
  }, [currentDay?.expenses, selectedDate]);

  const matchedCategory = categories.find((c) => c.key === categoryFilter);
  const pageTitle = matchedCategory ? matchedCategory.label : 'فواتير ومصاريف اليوم';

  const filteredExpenses = useMemo(() => {
    const sourceList = orderedExpenses.length > 0 ? orderedExpenses : (currentDay?.expenses || []);
    if (!categoryFilter) return sourceList;
    return sourceList.filter((e) => e.category === categoryFilter);
  }, [orderedExpenses, currentDay?.expenses, categoryFilter]);

  // Reorder State
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  const [reorderTarget, setReorderTarget] = useState<{
    item: CustodyExpenseItem;
    currentIdx: number;
  } | null>(null);
  const [orderNumberInput, setOrderNumberInput] = useState<string>('1');

  const openReorderModal = useCallback((item: CustodyExpenseItem, currentIdx: number) => {
    setReorderTarget({ item, currentIdx });
    setOrderNumberInput(String(currentIdx + 1));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const handleCommitReorder = useCallback((fromFilteredIdx: number, toFilteredIdx: number) => {
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
  }, [filteredExpenses, onReorderExpenses, selectedDate]);

  const handleApplyNewOrderNumber = useCallback(() => {
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
  }, [reorderTarget, orderNumberInput, filteredExpenses.length, handleCommitReorder]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ── Sub-Page Header Row ── */}
      <View style={styles.subPageHeaderRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.subPageTitleContainer}>
          <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary }]}>
            {pageTitle}
          </Text>
          <View
            style={[
              styles.titleUnderlineBar,
              { backgroundColor: matchedCategory ? matchedCategory.color : '#047857' },
            ]}
          />
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
        contentContainerStyle={[
          styles.scrollContent,
          filteredExpenses.length === 0 && !loading && { flex: 1, justifyContent: 'center' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Invoices List (Fault-Isolated) ── */}
        <ModuleErrorBoundary moduleName="ExpensesList">
          {loading ? (
            <AhdaInvoicesSkeleton colors={colors} isDarkMode={isDarkMode} count={4} />
          ) : filteredExpenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <LottieView
                source={require('../../assets/Lottie/json/empty_invoices.json')}
                autoPlay
                loop
                style={{ width: 140, height: 140 }}
              />
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
        </ModuleErrorBoundary>
      </ScrollView>

      {/* ── 1. Single Tap Invoice Details Modal (Fault-Isolated) ── */}
      <ModuleErrorBoundary moduleName="ExpenseDetailsModal">
        <ExpenseDetailsModal
          visible={!!selectedExpenseForDetails}
          expense={selectedExpenseForDetails}
          selectedDate={selectedDate}
          categories={categories}
          colors={colors}
          isDarkMode={isDarkMode}
          onClose={() => setSelectedExpenseForDetails(null)}
          onPreviewImage={onPreviewImage}
        />
      </ModuleErrorBoundary>

      {/* ── 2. Long Press Options Modal (Fault-Isolated) ── */}
      <ModuleErrorBoundary moduleName="ExpenseActionModal">
        <ExpenseActionModal
          visible={!!selectedExpenseForAction}
          expense={selectedExpenseForAction}
          categories={categories}
          colors={colors}
          isDarkMode={isDarkMode}
          onEdit={onEditExpense}
          onDelete={onDeleteExpense}
          onClose={() => setSelectedExpenseForAction(null)}
        />
      </ModuleErrorBoundary>

      {/* ── 3. Type Card Position / Reorder Modal (Fault-Isolated) ── */}
      <ModuleErrorBoundary moduleName="ExpenseReorderModal">
        <ExpenseReorderModal
          visible={!!reorderTarget}
          reorderTarget={reorderTarget}
          orderNumberInput={orderNumberInput}
          totalExpensesCount={filteredExpenses.length}
          colors={colors}
          isDarkMode={isDarkMode}
          onChangeOrderInput={setOrderNumberInput}
          onApplyReorder={handleApplyNewOrderNumber}
          onClose={() => setReorderTarget(null)}
        />
      </ModuleErrorBoundary>
    </View>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  invoicesList: {
    gap: 12,
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
});
