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
import { toArabicDigits, formatArabicNumber } from '../utils/formatters';
import { AhdaInvoicesSkeleton } from '../components/skeleton/AhdaInvoicesSkeleton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
}) => {
  // Long press options modal state
  const [selectedExpenseForAction, setSelectedExpenseForAction] = useState<CustodyExpenseItem | null>(null);
  // Single press invoice details and picture modal state
  const [selectedExpenseForDetails, setSelectedExpenseForDetails] = useState<CustodyExpenseItem | null>(null);

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
          <View style={[styles.titleUnderlineBar, { backgroundColor: matchedCategory ? matchedCategory.color : '#047857' }]} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, filteredExpenses.length === 0 && !loading && { flex: 1, justifyContent: 'center' }]} showsVerticalScrollIndicator={false}>
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
                  onPress={() => setSelectedExpenseForDetails(item)}
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
                            {timeStr} • {toArabicDigits(dateStr)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Thumbnail in corner if attached (replacing 3 dots and options text) */}
                    {fullImg ? (
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          onPreviewImage(fullImg);
                        }}
                        style={styles.cardHeaderThumbBtn}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: fullImg }} style={styles.cardHeaderThumbImg} />
                      </TouchableOpacity>
                    ) : null}
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

                  {/* Bottom: Amount Badge (with halalas) + Attachment indicator */}
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

                    {fullImg ? (
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

      {/* ── 2. Long Press Options Bottom Sheet Modal (Edit or Delete) ── */}
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

            <Text style={[styles.actionSheetTitle, { color: colors.textPrimary, marginBottom: 16 }]}>
              إدارة الفاتورة
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
