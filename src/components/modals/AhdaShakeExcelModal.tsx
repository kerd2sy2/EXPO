import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { ThemeColors } from '../../types/delegate';
import { toArabicDigits } from '../../utils/formatters';

interface AhdaShakeExcelModalProps {
  visible: boolean;
  selectedDate: string;
  colors: ThemeColors;
  isDarkMode: boolean;
  loading: boolean;
  expensesCount?: number;
  onPreview: () => void;
  onExportAndShare: () => void;
  onAddExpense?: () => void;
  onClose: () => void;
}

export const AhdaShakeExcelModal: React.FC<AhdaShakeExcelModalProps> = ({
  visible,
  selectedDate,
  colors,
  isDarkMode,
  loading,
  expensesCount = 0,
  onPreview,
  onExportAndShare,
  onAddExpense,
  onClose,
}) => {
  const hasExpenses = expensesCount > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        {/* Static non-clickable backdrop (Must use X or cancel button to close) */}
        <View style={StyleSheet.absoluteFill} />

        <View
          style={[
            styles.modalBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Top Row: Close X Button + Handle Bar */}
          <View style={styles.topControlRow}>
            <TouchableOpacity
              onPress={onClose}
              disabled={loading}
              style={[
                styles.modalCloseXBtn,
                { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <View style={styles.handleBar} />
            <View style={{ width: 32 }} />
          </View>

          {/* Lottie Animation / PDF Icon + Title */}
          <View style={styles.headerGroup}>
            <View style={styles.lottieContainer}>
              <LottieView
                source={
                  hasExpenses
                    ? require('../../../assets/Lottie/json/pdf.json')
                    : require('../../../assets/Lottie/json/empty_invoices.json')
                }
                autoPlay
                loop
                style={{ width: hasExpenses ? 100 : 125, height: hasExpenses ? 100 : 125 }}
              />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {hasExpenses ? 'تقرير عهدة ومصاريف اليوم (PDF)' : 'لا توجد فواتير مسجلة لهذا اليوم'}
            </Text>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                تاريخ العهدة: {toArabicDigits(selectedDate)}
              </Text>
              {hasExpenses && (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{toArabicDigits(expensesCount)} فواتير</Text>
                </View>
              )}
            </View>
          </View>

          {hasExpenses ? (
            /* Features Highlights Box when there are expenses */
            <View
              style={[
                styles.featuresBox,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                },
              ]}
            >
              <View style={styles.featureRow}>
                <Ionicons name="images-outline" size={16} color="#047857" />
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                  عرض صور الفواتير واضحة بدقة عالية
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="layers-outline" size={16} color="#0284c7" />
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                  ترتيب وتجميع كل قسم وفواتيره تحت بعضها
                </Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="document-text-outline" size={16} color="#16a34a" />
                <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                  تقرير رسمي بالأرقام العربية معتمد للطباعة
                </Text>
              </View>
            </View>
          ) : (
            /* Empty Notice Box when there are NO expenses */
            <View
              style={[
                styles.emptyNoticeBox,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#fff7ed',
                  borderColor: isDarkMode ? '#334155' : '#fed7aa',
                },
              ]}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Ionicons name="receipt-outline" size={16} color="#ea580c" />
                <Text style={[styles.emptyNoticeTitle, { color: isDarkMode ? '#fed7aa' : '#9a3412' }]}>
                  سجل فواتير اليوم فارغ
                </Text>
              </View>
              <Text style={[styles.emptyNoticeSub, { color: colors.textSecondary }]}>
                لم يتم تسجيل أي مصاريف أو فواتير لهذا اليوم. يمكنك إضافة أول فاتورة الآن، أو تصدير ومشاركة كشف حساب رصيد العهدة.
              </Text>
            </View>
          )}

          {/* Actions List */}
          <View style={styles.actionButtonsCol}>
            {!hasExpenses && onAddExpense && (
              /* Add Expense Hero Button when empty */
              <TouchableOpacity
                style={[styles.actionBtnPrimary, { backgroundColor: '#ea580c' }]}
                onPress={onAddExpense}
                disabled={loading}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                  <Text style={styles.actionBtnPrimaryText}>+ إضافة أول فاتورة للعهدة الآن</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* 1. Preview PDF Button (معاينة قبل الإرسال) */}
            <TouchableOpacity
              style={[
                styles.actionBtnSecondary,
                {
                  backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
                  borderColor: isDarkMode ? '#475569' : '#cbd5e1',
                  opacity: loading ? 0.7 : 1,
                },
              ]}
              onPress={onPreview}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                <Ionicons name="eye-outline" size={20} color={isDarkMode ? '#38bdf8' : '#0f172a'} />
                <Text style={[styles.actionBtnSecondaryText, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                  {hasExpenses ? 'معاينة الملف قبل الإرسال (PDF)' : 'معاينة كشف الرصيد (PDF)'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* 2. Share / Send PDF Button */}
            <TouchableOpacity
              style={[
                styles.actionBtnPrimary,
                {
                  backgroundColor: hasExpenses ? '#047857' : (isDarkMode ? '#334155' : '#0f172a'),
                  opacity: loading ? 0.7 : 1,
                },
              ]}
              onPress={onExportAndShare}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.actionBtnPrimaryText}>جاري إنشاء ملف الـ PDF وتجهيزه...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="share-social-outline" size={20} color="#ffffff" />
                  <Text style={styles.actionBtnPrimaryText}>
                    {hasExpenses ? 'مشاركة وإرسال ملف الـ PDF' : 'مشاركة كشف رصيد العهدة (PDF)'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                إلغاء
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  topControlRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalCloseXBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handleBar: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
  },
  shakeBadgeRow: {
    alignItems: 'center',
    marginBottom: 6,
  },
  shakeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  shakeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  headerGroup: {
    alignItems: 'center',
    marginBottom: 14,
  },
  lottieContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  countBadge: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  countBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },
  emptyNoticeBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
    alignItems: 'flex-end',
  },
  emptyNoticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right',
  },
  emptyNoticeSub: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
    textAlign: 'right',
  },
  featuresBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionButtonsCol: {
    gap: 10,
  },
  actionBtnSecondary: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionBtnPrimary: {
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
  actionBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
