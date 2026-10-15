import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustodyDayData, CustodyLogItem } from '../../services/custodyService';
import { formatArabicNumber, toArabicDigits } from '../../utils/formatters';

interface AhdaReportPreviewModalProps {
  visible: boolean;
  currentDay: CustodyDayData | null;
  selectedDate: string;
  currentUser: any;
  dayLogs?: CustodyLogItem[];
  effectiveOpeningBalance: number;
  colors: any;
  isDarkMode: boolean;
  loading?: boolean;
  onClose: () => void;
  onExportAndShare: () => void;
  onPreviewImage: (url: string) => void;
}

const CATEGORIES = [
  { key: 'fuel', label: 'بنزين', icon: 'speedometer-outline', color: '#ea580c', bg: '#fff7ed' },
  { key: 'internet_advance', label: 'سلفة نت', icon: 'wifi-outline', color: '#0284c7', bg: '#f0f9ff' },
  { key: 'advance', label: 'سلفة شخصية', icon: 'person-add-outline', color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'license', label: 'رخصة القيادة', icon: 'card-outline', color: '#2563eb', bg: '#eff6ff' },
  { key: 'spare_parts', label: 'قطع غيار', icon: 'build-outline', color: '#d97706', bg: '#fffbeb' },
  { key: 'other', label: 'مصاريف أخرى', icon: 'receipt-outline', color: '#059669', bg: '#ecfdf5' },
];

export const AhdaReportPreviewModal: React.FC<AhdaReportPreviewModalProps> = ({
  visible,
  currentDay,
  selectedDate,
  currentUser,
  dayLogs = [],
  effectiveOpeningBalance,
  colors,
  isDarkMode,
  loading = false,
  onClose,
  onExportAndShare,
  onPreviewImage,
}) => {
  if (!visible || !currentDay) return null;

  const supervisorName = currentUser?.name || currentUser?.username || 'ابراهيم محمود';
  const cleanDateStr = toArabicDigits(selectedDate);

  // Financial calculations
  const effectiveOpening = Number(effectiveOpeningBalance || currentDay.opening_balance || 0);
  const custodyAddedLogs = dayLogs.filter(
    (log) => log.action_type === 'ADD_CUSTODY' || log.action_type === 'add' || log.action_type === 'custody_added'
  );
  const logsAddedSum = custodyAddedLogs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const addedAmount = Number(currentDay.added_amount || 0) > 0 ? Number(currentDay.added_amount) : logsAddedSum;
  const totalExpenses = Number(currentDay.total_expenses || 0);
  const closingBalance = Number(effectiveOpening + addedAmount - totalExpenses);

  const expenses = currentDay.expenses || [];

  // Group expenses by category
  const groupedCategories = CATEGORIES.map((cat) => {
    const catExpenses = expenses.filter((e) => e.category === cat.key);
    const catTotal = catExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    return {
      ...cat,
      expenses: catExpenses,
      total: catTotal,
    };
  }).filter((group) => group.expenses.length > 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#0b0f19' : '#f8fafc' }]}>
        {/* ── Top Header Navigation Bar ── */}
        <View
          style={[
            styles.navHeader,
            {
              backgroundColor: isDarkMode ? '#111827' : '#ffffff',
              borderBottomColor: isDarkMode ? '#1f2937' : '#e2e8f0',
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.closeIconBtn, { backgroundColor: isDarkMode ? '#1f2937' : '#f1f5f9' }]}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.navTitleGroup}>
            <Text style={[styles.navTitle, { color: colors.textPrimary }]}>
              معاينة تقرير العهدة اليومية
            </Text>
            <Text style={[styles.navSubtitle, { color: colors.textSecondary }]}>
              نسخة مطابقة لملف الـ PDF النهائي
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.quickShareBtn, { backgroundColor: '#ea580c' }]}
            onPress={onExportAndShare}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="share-social-outline" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Scrollable Document Preview ── */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Document Sheet Simulation */}
          <View
            style={[
              styles.documentSheet,
              {
                backgroundColor: isDarkMode ? '#131b2e' : '#ffffff',
                borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
              },
            ]}
          >
            {/* Header Document Banner */}
            <View style={styles.docHeaderBanner}>
              <View style={styles.docHeaderAccent} />
              <View style={styles.docHeaderContent}>
                <Ionicons name="document-text" size={22} color="#ffffff" />
                <Text style={styles.docHeaderTitle}>تقرير العهدة والمصاريف اليومية</Text>
              </View>
            </View>

            {/* Supervisor & Date Info Card */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                },
              ]}
            >
              <View style={styles.infoColRight}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>المشرف:</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{supervisorName}</Text>
              </View>

              <View style={styles.infoColLeft}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>تاريخ العهدة:</Text>
                <Text style={[styles.infoValueDate, { color: '#ea580c' }]}>{cleanDateStr}</Text>
              </View>
            </View>

            {/* Section 1: Financial Summary Cards */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIndicator} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                أولاً: ملخص حركة العهدة والرصيد الصافي المتبقي
              </Text>
            </View>

            <View style={styles.statCardsGrid}>
              {/* Stat 1: باقي أمس */}
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                  },
                ]}
              >
                <Text style={[styles.statTitle, { color: colors.textSecondary }]}>باقي أمس - افتتاحي</Text>
                <Text style={[styles.statAmount, { color: colors.textPrimary }]}>
                  {formatArabicNumber(effectiveOpening)}
                </Text>
                <Text style={[styles.statCurrency, { color: colors.textSecondary }]}>ر.س</Text>
              </View>

              {/* Stat 2: العهدة المضافة */}
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDarkMode ? '#2c1e14' : '#fff7ed',
                    borderColor: isDarkMode ? '#7c2d12' : '#fed7aa',
                  },
                ]}
              >
                <Text style={[styles.statTitle, { color: '#ea580c' }]}>العهدة المضافة اليوم</Text>
                <Text style={[styles.statAmount, { color: '#ea580c' }]}>
                  {formatArabicNumber(addedAmount)}
                </Text>
                <Text style={[styles.statCurrency, { color: '#ea580c' }]}>ر.س</Text>
              </View>

              {/* Stat 3: إجمالي المصاريف */}
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDarkMode ? '#2d1417' : '#fef2f2',
                    borderColor: isDarkMode ? '#991b1b' : '#fecaca',
                  },
                ]}
              >
                <Text style={[styles.statTitle, { color: '#dc2626' }]}>إجمالي المصاريف</Text>
                <Text style={[styles.statAmount, { color: '#dc2626' }]}>
                  {formatArabicNumber(totalExpenses)}
                </Text>
                <Text style={[styles.statCurrency, { color: '#dc2626' }]}>ر.س</Text>
              </View>

              {/* Stat 4: صافي العهدة */}
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: isDarkMode ? '#13281d' : '#f0fdf4',
                    borderColor: isDarkMode ? '#166534' : '#bbf7d0',
                  },
                ]}
              >
                <Text style={[styles.statTitle, { color: '#16a34a' }]}>صافي العهدة المتبقي</Text>
                <Text style={[styles.statAmount, { color: '#16a34a' }]}>
                  {formatArabicNumber(closingBalance)}
                </Text>
                <Text style={[styles.statCurrency, { color: '#16a34a' }]}>ر.س</Text>
              </View>
            </View>

            {/* Section 2: Categories Breakdown Table */}
            <View style={[styles.sectionHeaderRow, { marginTop: 20 }]}>
              <View style={styles.sectionIndicator} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                ثانياً: تفاصيل المصاريف حسب الأقسام
              </Text>
            </View>

            <View
              style={[
                styles.categoryTable,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                },
              ]}
            >
              <View style={styles.categoryTableHeader}>
                <Text style={[styles.colHeader, { flex: 2, color: colors.textSecondary }]}>القسم / التصنيف</Text>
                <Text style={[styles.colHeader, { flex: 1, textAlign: 'center', color: colors.textSecondary }]}>
                  العدد
                </Text>
                <Text style={[styles.colHeader, { flex: 1.5, textAlign: 'left', color: colors.textSecondary }]}>
                  المبلغ (ر.س)
                </Text>
              </View>

              {CATEGORIES.map((cat, idx) => {
                const grp = groupedCategories.find((g) => g.key === cat.key);
                const count = grp ? grp.expenses.length : 0;
                const total = grp ? grp.total : 0;
                const isLast = idx === CATEGORIES.length - 1;

                return (
                  <View
                    key={cat.key}
                    style={[
                      styles.categoryTableRow,
                      {
                        borderBottomWidth: isLast ? 0 : 1,
                        borderBottomColor: isDarkMode ? '#334155' : '#e2e8f0',
                      },
                    ]}
                  >
                    <View style={[styles.catNameCell, { flex: 2 }]}>
                      <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                      <Text style={[styles.catNameText, { color: colors.textPrimary }]}>{cat.label}</Text>
                    </View>

                    <Text
                      style={[
                        styles.catCountText,
                        { flex: 1, color: count > 0 ? colors.textPrimary : colors.textSecondary },
                      ]}
                    >
                      {toArabicDigits(count)}
                    </Text>

                    <Text
                      style={[
                        styles.catAmountText,
                        { flex: 1.5, color: total > 0 ? '#ea580c' : colors.textSecondary },
                      ]}
                    >
                      {formatArabicNumber(total)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Section 3: Invoices Grouped By Category */}
            <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
              <View style={styles.sectionIndicator} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                ثالثاً: بيان وتوثيق الفواتير المرفقة ({toArabicDigits(expenses.length)} فاتورة)
              </Text>
            </View>

            {expenses.length === 0 ? (
              <View style={styles.emptyExpensesBox}>
                <Ionicons name="receipt-outline" size={38} color={colors.textSecondary} />
                <Text style={[styles.emptyExpensesText, { color: colors.textSecondary }]}>
                  لا توجد فواتير مسجلة لهذا اليوم
                </Text>
              </View>
            ) : (
              groupedCategories.map((group) => {
                let invoiceCounter = 0;
                return (
                  <View key={group.key} style={styles.groupContainer}>
                    {/* Category Group Header Banner */}
                    <View style={[styles.groupBanner, { backgroundColor: group.color }]}>
                      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                        <Ionicons name={group.icon as any} size={18} color="#ffffff" />
                        <Text style={styles.groupBannerTitle}>
                          {group.label} ({toArabicDigits(group.expenses.length)} فواتير)
                        </Text>
                      </View>
                      <Text style={styles.groupBannerTotal}>
                        {formatArabicNumber(group.total)} ر.س
                      </Text>
                    </View>

                    {/* Invoices List under this Category */}
                    <View style={styles.invoicesList}>
                      {group.expenses.map((exp) => {
                        invoiceCounter += 1;
                        const hasImg = !!exp.image_url;

                        return (
                          <View
                            key={exp.id || invoiceCounter}
                            style={[
                              styles.invoiceCard,
                              {
                                backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                              },
                            ]}
                          >
                            {/* Invoice Header */}
                            <View style={styles.invoiceCardHeader}>
                              <View style={styles.invoiceTitleWrap}>
                                <Text style={[styles.invoiceNumber, { color: colors.textPrimary }]}>
                                  فاتورة رقم {toArabicDigits(invoiceCounter)} • {group.label}
                                </Text>
                              </View>
                              <View style={[styles.amountBadge, { backgroundColor: '#fff7ed', borderColor: '#fed7aa' }]}>
                                <Text style={styles.amountBadgeText}>
                                  {formatArabicNumber(exp.amount)} ر.س
                                </Text>
                              </View>
                            </View>

                            {/* Recipient & Description */}
                            <View style={styles.invoiceRecipientRow}>
                              <Ionicons name="person-outline" size={14} color="#ea580c" />
                              <Text style={[styles.recipientLabel, { color: colors.textSecondary }]}>البيان:</Text>
                              <Text style={[styles.recipientVal, { color: colors.textPrimary }]}>
                                {exp.recipient_name || '—'}
                              </Text>
                            </View>

                            {/* Invoice Image Preview */}
                            {hasImg ? (
                              <TouchableOpacity
                                style={styles.imagePreviewWrap}
                                activeOpacity={0.9}
                                onPress={() => onPreviewImage(exp.image_url!)}
                              >
                                <Image
                                  source={{ uri: exp.image_url }}
                                  style={styles.invoiceImg}
                                  resizeMode="contain"
                                />
                                <View style={styles.imageOverlayBtn}>
                                  <Ionicons name="scan-outline" size={14} color="#ffffff" />
                                  <Text style={styles.imageOverlayText}>انقر لتكبير الفاتورة</Text>
                                </View>
                              </TouchableOpacity>
                            ) : (
                              <View style={styles.noImageCard}>
                                <Ionicons name="image-outline" size={16} color={colors.textSecondary} />
                                <Text style={[styles.noImageText, { color: colors.textSecondary }]}>
                                  بدون مرفق صورة
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}

            {/* Footer Signoff */}
            <View style={styles.docFooter}>
              <Text style={[styles.docFooterText, { color: colors.textSecondary }]}>
                — تم إعداد التقرير وتوثيق الفواتير بنجاح —
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* ── Fixed Bottom Action Bar ── */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: isDarkMode ? '#111827' : '#ffffff',
              borderTopColor: isDarkMode ? '#1f2937' : '#e2e8f0',
            },
          ]}
        >
          {/* Share PDF Button */}
          <TouchableOpacity
            style={[
              styles.shareActionBtn,
              {
                backgroundColor: '#ea580c',
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={onExportAndShare}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={styles.btnRow}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={styles.shareActionBtnText}>جاري إنشاء ملف الـ PDF...</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <Ionicons name="share-social-outline" size={20} color="#ffffff" />
                <Text style={styles.shareActionBtnText}>مشاركة وإرسال ملف الـ PDF</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity
            style={[
              styles.closeActionBtn,
              {
                borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                backgroundColor: isDarkMode ? '#1f2937' : '#f1f5f9',
              },
            ]}
            onPress={onClose}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeActionBtnText, { color: colors.textPrimary }]}>
              إغلاق المعاينة
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 14 : 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  closeIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleGroup: {
    alignItems: 'center',
    flex: 1,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  navSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  quickShareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 30,
  },
  documentSheet: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingBottom: 20,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  docHeaderBanner: {
    backgroundColor: '#0f172a',
    paddingVertical: 14,
    paddingHorizontal: 16,
    position: 'relative',
  },
  docHeaderAccent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#ea580c',
  },
  docHeaderContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  docHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  infoCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoColRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  infoColLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  infoValueDate: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  sectionIndicator: {
    width: 4,
    height: 16,
    backgroundColor: '#ea580c',
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  statCardsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    gap: 8,
  },
  statCard: {
    width: '48%',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  statAmount: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  statCurrency: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  categoryTable: {
    marginHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryTableHeader: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '800',
  },
  categoryTableRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
  },
  catNameCell: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  catNameText: {
    fontSize: 12,
    fontWeight: '700',
  },
  catCountText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  catAmountText: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'left',
  },
  emptyExpensesBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyExpensesText: {
    fontSize: 13,
    fontWeight: '600',
  },
  groupContainer: {
    marginTop: 14,
    marginHorizontal: 12,
  },
  groupBanner: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  groupBannerTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  groupBannerTotal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
  },
  invoicesList: {
    gap: 10,
  },
  invoiceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
  },
  invoiceCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  invoiceTitleWrap: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  amountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  amountBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ea580c',
  },
  invoiceRecipientRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  recipientLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  recipientVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  imagePreviewWrap: {
    height: 180,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  invoiceImg: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBtn: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  imageOverlayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  noImageCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  noImageText: {
    fontSize: 11,
    fontWeight: '600',
  },
  docFooter: {
    marginTop: 20,
    alignItems: 'center',
  },
  docFooterText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomBar: {
    padding: 14,
    borderTopWidth: 1,
    gap: 8,
  },
  shareActionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  shareActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  closeActionBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
});
