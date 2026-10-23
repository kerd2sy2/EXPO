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
import LottieView from 'lottie-react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CustodyDayData, CustodyLogItem } from '../../services/custodyService';
import { formatImageUrl } from '../../services/api';
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
  { key: 'fuel', label: 'بنزين', icon: 'speedometer-outline', color: '#047857', bg: '#ecfdf5' },
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
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  const topInset = Math.max(insets.top, Platform.OS === 'android' ? 38 : 20);
  const bottomInset = Math.max(insets.bottom, 12);

  const supervisorName = currentUser?.name || currentUser?.username || 'ابراهيم محمود';
  const cleanDateStr = toArabicDigits(selectedDate);

  // Financial calculations
  const effectiveOpening = Number(effectiveOpeningBalance || currentDay?.opening_balance || 0);
  const custodyAddedLogs = dayLogs.filter(
    (log) => log.action_type === 'ADD_CUSTODY' || log.action_type === 'add' || log.action_type === 'custody_added'
  );
  const logsAddedSum = custodyAddedLogs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const addedAmount = Number(currentDay?.added_amount || 0) > 0 ? Number(currentDay?.added_amount) : logsAddedSum;
  const totalExpenses = Number(currentDay?.total_expenses || 0);
  const closingBalance = Number(effectiveOpening + addedAmount - totalExpenses);

  const expenses = currentDay?.expenses || [];

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
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar style="light" />
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#0b0f19' : '#f1f5f9' }]}>
        {/* ── Executive Top Header Bar (Safe from Notch and Status Bar) ── */}
        <View style={[styles.navHeader, { paddingTop: topInset + 6 }]}>
          <TouchableOpacity
            style={styles.closeIconBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.navTitleGroup}>
            <View style={styles.navTitleRow}>
              <Image
                source={require('../../../assets/images/logo.png')}
                style={{ width: 22, height: 22, borderRadius: 6, marginLeft: 4 }}
                resizeMode="contain"
              />
              <Text style={styles.navTitleText}>معاينة تقرير العهدة اليومية</Text>
            </View>
            <View style={styles.navDateBadge}>
              <Text style={styles.navDateText}>تاريخ: {cleanDateStr}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.quickShareBtn, { opacity: loading ? 0.7 : 1 }]}
            onPress={onExportAndShare}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons name="share-social" size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Scrollable Document Preview ── */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Document Sheet Container */}
          <View
            style={[
              styles.documentSheet,
              {
                backgroundColor: isDarkMode ? '#131b2e' : '#ffffff',
                borderColor: isDarkMode ? '#1e293b' : '#e2e8f0',
              },
            ]}
          >
            {/* Top Two-tone Accent Stripe (Orange on Left, Dark on Right) */}
            <View style={{ flexDirection: 'row', height: 4, width: '100%' }}>
              <View style={{ width: 110, backgroundColor: '#047857' }} />
              <View style={{ flex: 1, backgroundColor: isDarkMode ? '#334155' : '#1e293b' }} />
            </View>

            {/* Document Executive Header (Pure White Background matching PDF) */}
            <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, backgroundColor: isDarkMode ? '#131b2e' : '#ffffff' }}>
              {/* Top Row: Brand on Right (Logo with NO background box) */}
              <View style={{ flexDirection: 'row-reverse', justifyContent: 'flex-start', alignItems: 'center' }}>
                {/* Brand Lockup: Logo + AAMS LOGISTICS */}
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <Image
                    source={require('../../../assets/images/logo.png')}
                    style={{ width: 34, height: 34 }}
                    resizeMode="contain"
                  />
                  <View style={{ alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: colors.textPrimary, letterSpacing: 0.5 }}>AAMS</Text>
                    <Text style={{ fontSize: 7, fontWeight: '800', color: colors.textSecondary, letterSpacing: 1 }}>LOGISTICS</Text>
                  </View>
                </View>
              </View>

              {/* Bottom Info Bar: 2 Columns with Circular Orange Icons (Supervisor Name & Date Only) */}
              <View
                style={{
                  flexDirection: 'row-reverse',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 10,
                  marginTop: 10,
                  borderTopWidth: 1,
                  borderBottomWidth: 1,
                  borderColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                }}
              >
                {/* 1. Supervisor */}
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#fed7aa', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="person-outline" size={12} color="#047857" />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>{supervisorName}</Text>
                </View>

                {/* 2. Date */}
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#ecfdf5', borderWidth: 1, borderColor: '#fed7aa', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="calendar-outline" size={12} color="#047857" />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}>{cleanDateStr.replace(/-/g, '/')}</Text>
                </View>
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
                    backgroundColor: isDarkMode ? '#2c1e14' : '#ecfdf5',
                    borderColor: isDarkMode ? '#7c2d12' : '#fed7aa',
                  },
                ]}
              >
                <Text style={[styles.statTitle, { color: '#047857' }]}>العهدة المضافة اليوم</Text>
                <Text style={[styles.statAmount, { color: '#047857' }]}>
                  {formatArabicNumber(addedAmount)}
                </Text>
                <Text style={[styles.statCurrency, { color: '#047857' }]}>ر.س</Text>
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
            <View style={[styles.sectionHeaderRow, { marginTop: 22 }]}>
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
                        { flex: 1.5, color: total > 0 ? '#047857' : colors.textSecondary },
                      ]}
                    >
                      {formatArabicNumber(total)}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* ── Daily Ledger Section ── */}
            {currentDay.ledger_image_url ? (
              <View style={{ marginTop: 22, paddingHorizontal: 12 }}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionIndicator} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    صورة الدفتر
                  </Text>
                </View>

                {(() => {
                  const fullLedger = formatImageUrl(currentDay.ledger_image_url);
                  if (!fullLedger) return null;
                  return (
                    <View
                      style={[
                        styles.invoiceCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          marginTop: 6,
                          padding: 6,
                        },
                      ]}
                    >
                      {/* Image Box */}
                      <TouchableOpacity
                        style={[
                          styles.imagePreviewWrap,
                          {
                            height: 280,
                            backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                            borderWidth: 1,
                            borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                          },
                        ]}
                        activeOpacity={0.88}
                        onPress={() => onPreviewImage(fullLedger)}
                      >
                        <Image
                          source={{ uri: fullLedger }}
                          style={styles.invoiceImg}
                          resizeMode="contain"
                        />
                        <View style={styles.imageOverlayBtn}>
                          <Ionicons name="scan-outline" size={14} color="#ffffff" />
                          <Text style={styles.imageOverlayText}>انقر لتكبير صورة الدفتر</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  );
                })()}
              </View>
            ) : null}

            {/* Section 3: Invoices Grouped By Category */}
            {expenses.length === 0 ? (
              <View
                style={[
                  styles.emptyExpensesBox,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#fff7ed',
                    borderColor: isDarkMode ? '#334155' : '#fed7aa',
                  },
                ]}
              >
                <LottieView
                  source={require('../../../assets/Lottie/json/empty_invoices.json')}
                  autoPlay
                  loop
                  style={{ width: 130, height: 130 }}
                />
                <Text style={[styles.emptyExpensesText, { color: isDarkMode ? '#fed7aa' : '#9a3412' }]}>
                  لا توجد فواتير مسجلة لهذا اليوم
                </Text>
                <Text style={[styles.emptyExpensesSub, { color: colors.textSecondary }]}>
                  يحتوي التقرير المصدّر حالياً على كشف الأرصدة (رصيد البداية، العهد المضافة، ورصيد الإغلاق) فقط.
                </Text>
              </View>
            ) : (
              groupedCategories.map((group) => {
                let invoiceCounter = 0;
                return (
                  <View key={group.key} style={styles.groupContainer}>
                    {/* Category Group Header Banner (Clean - No verbose totals/counts) */}
                    <View style={[styles.groupBanner, { backgroundColor: group.color }]}>
                      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                        <Ionicons name={group.icon as any} size={18} color="#ffffff" />
                        <Text style={styles.groupBannerTitle}>
                          {group.label}
                        </Text>
                      </View>
                    </View>

                    {/* Invoices List under this Category */}
                    <View style={styles.invoicesList}>
                      {group.expenses.map((exp) => {
                        invoiceCounter += 1;
                        const fullImgUrl = formatImageUrl(exp.image_url);
                        const hasImg = !!fullImgUrl;

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
                                  فاتورة رقم {toArabicDigits(invoiceCounter)}
                                </Text>
                              </View>
                              {exp.export_number ? (
                                <View
                                  style={{
                                    flexDirection: 'row-reverse',
                                    alignItems: 'center',
                                    gap: 5,
                                    backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
                                    borderWidth: 1.1,
                                    borderColor: '#059669',
                                    paddingHorizontal: 9,
                                    paddingVertical: 3.5,
                                    borderRadius: 7,
                                  }}
                                >
                                  <Ionicons name="barcode-outline" size={13} color="#047857" />
                                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#047857' }}>
                                    رقم الوارد: {exp.export_number}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* Recipient & Description */}
                            <View style={styles.invoiceRecipientRow}>
                              <Ionicons name="person-outline" size={14} color="#047857" />
                              <Text style={[styles.recipientLabel, { color: colors.textSecondary }]}>البيان:</Text>
                              <Text style={[styles.recipientVal, { color: colors.textPrimary }]}>
                                {exp.recipient_name || '—'}
                              </Text>
                            </View>

                            {/* Amount Directly Under Description */}
                            <View style={[styles.invoiceRecipientRow, { marginBottom: 10 }]}>
                              <Ionicons name="cash-outline" size={14} color="#047857" />
                              <Text style={[styles.recipientLabel, { color: colors.textSecondary }]}>المبلغ:</Text>
                              <Text style={[styles.recipientVal, { color: '#047857', fontWeight: '900' }]}>
                                {formatArabicNumber(exp.amount)} ر.س
                              </Text>
                            </View>

                            {/* Invoice Image Preview or Dedicated No-Attachment Box */}
                            {hasImg ? (
                              <TouchableOpacity
                                style={styles.imagePreviewWrap}
                                activeOpacity={0.88}
                                onPress={() => onPreviewImage(fullImgUrl)}
                              >
                                <Image
                                  source={{ uri: fullImgUrl }}
                                  style={styles.invoiceImg}
                                  resizeMode="contain"
                                />
                                <View style={styles.imageOverlayBtn}>
                                  <Ionicons name="scan-outline" size={14} color="#ffffff" />
                                  <Text style={styles.imageOverlayText}>انقر لتكبير الفاتورة</Text>
                                </View>
                              </TouchableOpacity>
                            ) : (
                              <View
                                style={[
                                  styles.noImageBox,
                                  {
                                    backgroundColor: isDarkMode ? '#182234' : '#f1f5f9',
                                    borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                                  },
                                ]}
                              >
                                <Ionicons
                                  name="document-text-outline"
                                  size={18}
                                  color={isDarkMode ? '#64748b' : '#94a3b8'}
                                />
                                <Text style={[styles.noImageBoxText, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
                                  لا يوجد مرفق لهذا الإيصال
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

        {/* ── Fixed Bottom Action Bar (Safe from Home Indicator) ── */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: isDarkMode ? '#111827' : '#ffffff',
              borderTopColor: isDarkMode ? '#1f2937' : '#e2e8f0',
              paddingBottom: bottomInset + 4,
            },
          ]}
        >
          {/* Share PDF Button */}
          <TouchableOpacity
            style={[
              styles.shareActionBtn,
              {
                backgroundColor: '#047857',
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
    backgroundColor: '#0f172a',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  closeIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleGroup: {
    alignItems: 'center',
    flex: 1,
  },
  navTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  navTitleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  navDateBadge: {
    marginTop: 4,
    backgroundColor: 'rgba(4, 120, 87, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(4, 120, 87, 0.4)',
  },
  navDateText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  quickShareBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#047857',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
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
  docTopStripe: {
    height: 4,
    backgroundColor: '#047857',
  },
  docHeaderBanner: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  docHeaderRightSide: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  docHeaderLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#047857',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  docHeaderLogo: {
    width: 36,
    height: 36,
  },
  docHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'right',
  },
  docHeaderSubtitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 2,
  },
  docHeaderBadge: {
    backgroundColor: 'rgba(4, 120, 87, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(4, 120, 87, 0.35)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  docHeaderBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
  },
  infoCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    backgroundColor: '#047857',
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
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 14,
    marginHorizontal: 12,
    gap: 8,
  },
  emptyExpensesText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyExpensesSub: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
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
    color: '#047857',
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
    height: 200,
    backgroundColor: '#020617',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  invoiceImg: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBtn: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  noImageBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  noImageBoxText: {
    fontSize: 12,
    fontWeight: '700',
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
    paddingHorizontal: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  shareActionBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#047857',
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
