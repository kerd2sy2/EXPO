import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ThemeColors } from '../types/delegate';
import { CustodyDayData, CustodyExpenseItem } from '../services/custodyService';
import { formatImageUrl } from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AhdaDayExpensesScreenProps {
  currentDay: CustodyDayData | null;
  selectedDate: string;
  categoryFilter?: string | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  categories: Array<{ key: string; label: string; icon: string; color: string; bg: string }>;
  onBack: () => void;
  onOpenAddExpense: () => void;
  onEditExpense: (item: CustodyExpenseItem) => void;
  onDeleteExpense: (item: CustodyExpenseItem) => void;
  onPreviewImage: (url: string) => void;
}

export const AhdaDayExpensesScreen: React.FC<AhdaDayExpensesScreenProps> = ({
  currentDay,
  selectedDate,
  categoryFilter = null,
  colors,
  isDarkMode,
  categories,
  onBack,
  onOpenAddExpense,
  onEditExpense,
  onDeleteExpense,
  onPreviewImage,
}) => {
  // Long press options modal state
  const [selectedExpenseForAction, setSelectedExpenseForAction] = useState<CustodyExpenseItem | null>(null);

  const matchedCategory = categories.find((c) => c.key === categoryFilter);
  const pageTitle = matchedCategory ? matchedCategory.label : 'فواتير ومصاريف اليوم';

  const allExpenses = currentDay?.expenses || [];
  const filteredExpenses = categoryFilter
    ? allExpenses.filter((e) => e.category === categoryFilter)
    : allExpenses;

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
          <View style={[styles.titleUnderlineBar, { backgroundColor: matchedCategory ? matchedCategory.color : '#ea580c' }]} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, filteredExpenses.length === 0 && { flex: 1, justifyContent: 'center' }]} showsVerticalScrollIndicator={false}>
        {/* ── Invoices List ── */}
        {filteredExpenses.length === 0 ? (
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
                <TouchableOpacity
                  key={item.id || idx}
                  style={[
                    styles.invoiceCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  activeOpacity={0.88}
                  onPress={() => {
                    if (fullImg) {
                      onPreviewImage(fullImg);
                    } else {
                      setSelectedExpenseForAction(item);
                    }
                  }}
                  onLongPress={() => setSelectedExpenseForAction(item)}
                >
                  {/* Top: Icon + Category + Date & Time Stamp (Clean header without direct delete/edit icons) */}
                  <View style={styles.invoiceCardTop}>
                    <View style={styles.invoiceLeftInfo}>
                      <View style={[styles.catBadge, { backgroundColor: catObj.bg }]}>
                        <Ionicons name={catObj.icon as any} size={18} color={catObj.color} />
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.invoiceCategory, { color: colors.textPrimary }]}>
                          {catObj.label}
                        </Text>
                        {/* Date and Time Badge */}
                        <View style={styles.timestampRow}>
                          <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                          <Text style={[styles.invoiceTime, { color: colors.textSecondary }]}>
                            {timeStr} • {dateStr}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Hint indicator for long press options */}
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 10, color: colors.textSecondary, opacity: 0.7 }}>خيارات</Text>
                      <Ionicons name="ellipsis-vertical" size={15} color={colors.textSecondary} style={{ opacity: 0.6 }} />
                    </View>
                  </View>

                  {/* Middle: Recipient & Note */}
                  <View style={styles.invoiceCardMiddle}>
                    <View style={styles.invoiceRecipientRow}>
                      <Ionicons name="person-outline" size={13} color="#ea580c" />
                      <Text style={[styles.invoiceRecipientText, { color: colors.textPrimary }]} numberOfLines={2}>
                        المستلم / البيان: {item.recipient_name || '—'}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom: Invoice Image (if exists) + Amount Badge */}
                  <View style={styles.invoiceCardBottom}>
                    {fullImg ? (
                      <TouchableOpacity
                        onPress={() => onPreviewImage(fullImg)}
                        style={styles.imagePreviewBtn}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: fullImg }} style={styles.invoiceImgThumb} />
                        <View style={styles.imageBadge}>
                          <Ionicons name="image" size={11} color="#ffffff" />
                          <Text style={styles.imageBadgeText}>عرض الفاتورة</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.noImgBadge}>
                        <Ionicons name="receipt-outline" size={12} color={colors.textSecondary} />
                        <Text style={[styles.noImgText, { color: colors.textSecondary }]}>بدون مرفق</Text>
                      </View>
                    )}

                    <View style={styles.amountPill}>
                      <Text style={styles.amountPillVal}>
                        {item.amount.toLocaleString()}
                      </Text>
                      <Image
                        source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
                        style={{ width: 13, height: 13, tintColor: '#ea580c', marginLeft: 4 }}
                        resizeMode="contain"
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ── Long Press Options Bottom Sheet Modal (Edit or Delete) ── */}
      <Modal
        visible={!!selectedExpenseForAction}
        transparent
        animationType="fade"
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

            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Text style={[styles.actionSheetTitle, { color: colors.textPrimary }]}>
                إدارة الفاتورة ({selectedExpenseForAction?.amount}
              </Text>
              <Image
                source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
                style={{ width: 14, height: 14, tintColor: '#ea580c' }}
                resizeMode="contain"
              />
              <Text style={[styles.actionSheetTitle, { color: colors.textPrimary }]}>)</Text>
            </View>
            <Text style={[styles.actionSheetSub, { color: colors.textSecondary }]}>
              المستلم: {selectedExpenseForAction?.recipient_name || '—'}
            </Text>

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
                  <Feather name="edit-2" size={18} color="#ea580c" />
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
    color: '#ea580c',
  },
  amountPillUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
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
    backgroundColor: '#ea580c',
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
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  actionSheetSub: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 18,
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
    backgroundColor: '#fff7ed',
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
});
