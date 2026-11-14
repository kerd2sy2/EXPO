import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { CustodyExpenseItem } from '../../../services/custodyService';
import { formatImageUrl } from '../../../services/api';
import { formatArabicNumber, toArabicDigits } from '../../../utils/formatters';
import { ReportPreviewCategoryGroup } from './ReportPreviewSummarySection';

interface ReportPreviewInvoicesSectionProps {
  expenses: CustodyExpenseItem[];
  groupedCategories: ReportPreviewCategoryGroup[];
  colors: any;
  isDarkMode: boolean;
  onPreviewImage: (url: string) => void;
}

export const ReportPreviewInvoicesSection: React.FC<ReportPreviewInvoicesSectionProps> = ({
  expenses,
  groupedCategories,
  colors,
  isDarkMode,
  onPreviewImage,
}) => {
  if (expenses.length === 0) {
    return (
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
          source={require('../../../../assets/Lottie/json/empty_invoices.json')}
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
    );
  }

  return (
    <>
      {groupedCategories.map((group) => {
        let invoiceCounter = 0;
        return (
          <View key={group.key} style={styles.groupContainer}>
            <View style={[styles.groupBanner, { backgroundColor: group.color }]}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                <Ionicons name={group.icon as any} size={18} color="#ffffff" />
                <Text style={styles.groupBannerTitle}>{group.label}</Text>
              </View>
            </View>

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

                    <View style={styles.invoiceRecipientRow}>
                      <Ionicons name="person-outline" size={14} color="#047857" />
                      <Text style={[styles.recipientLabel, { color: colors.textSecondary }]}>البيان:</Text>
                      <Text style={[styles.recipientVal, { color: colors.textPrimary }]}>
                        {exp.recipient_name || '—'}
                      </Text>
                    </View>

                    <View style={[styles.invoiceRecipientRow, { marginBottom: 10 }]}>
                      <Ionicons name="cash-outline" size={14} color="#047857" />
                      <Text style={[styles.recipientLabel, { color: colors.textSecondary }]}>المبلغ:</Text>
                      <Text style={[styles.recipientVal, { color: '#047857', fontWeight: '900' }]}>
                        {formatArabicNumber(exp.amount)} ر.س
                      </Text>
                    </View>

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
      })}
    </>
  );
};

const styles = StyleSheet.create({
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
});
