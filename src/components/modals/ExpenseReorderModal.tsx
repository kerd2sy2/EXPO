import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { CustodyExpenseItem } from '../../services/custodyService';
import { formatArabicNumber } from '../../utils/formatters';

interface ExpenseReorderModalProps {
  visible: boolean;
  reorderTarget: { item: CustodyExpenseItem; currentIdx: number } | null;
  orderNumberInput: string;
  totalExpensesCount: number;
  colors: ThemeColors;
  isDarkMode: boolean;
  onChangeOrderInput: (val: string) => void;
  onApplyReorder: () => void;
  onClose: () => void;
}

export const ExpenseReorderModal: React.FC<ExpenseReorderModalProps> = ({
  visible,
  reorderTarget,
  orderNumberInput,
  totalExpensesCount,
  colors,
  isDarkMode,
  onChangeOrderInput,
  onApplyReorder,
  onClose,
}) => {
  if (!reorderTarget || !visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
          <View style={[styles.reorderInputSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHandle} />

            {/* Header */}
            <View style={styles.reorderModalHeaderRow}>
              <TouchableOpacity
                onPress={onClose}
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
            <View
              style={[
                styles.reorderCardSummary,
                { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border },
              ]}
            >
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
                  الترتيب الحالي: الكرت رقم ({reorderTarget.currentIdx + 1}) من إجمالي ({totalExpensesCount})
                </Text>
              </View>
            </View>

            {/* Number Input Control Row (+ / - and direct input) */}
            <View style={styles.reorderInputControlRow}>
              <TouchableOpacity
                style={[
                  styles.reorderStepBtn,
                  { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border },
                ]}
                onPress={() => {
                  const currentVal = parseInt(orderNumberInput, 10) || 1;
                  if (currentVal < totalExpensesCount) {
                    onChangeOrderInput(String(currentVal + 1));
                  }
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={24} color="#047857" />
              </TouchableOpacity>

              <View
                style={[
                  styles.reorderInputWrap,
                  { backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderColor: '#047857' },
                ]}
              >
                <TextInput
                  style={[styles.reorderTextInput, { color: colors.textPrimary }]}
                  value={orderNumberInput}
                  onChangeText={(val) => {
                    const cleaned = val.replace(/[^0-9]/g, '');
                    onChangeOrderInput(cleaned);
                  }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  maxLength={3}
                  placeholder="1"
                  placeholderTextColor={colors.textSecondary}
                  textAlign="center"
                />
                <Text style={[styles.reorderInputLabel, { color: colors.textSecondary }]}>
                  من {totalExpensesCount}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.reorderStepBtn,
                  { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border },
                ]}
                onPress={() => {
                  const currentVal = parseInt(orderNumberInput, 10) || 1;
                  if (currentVal > 1) {
                    onChangeOrderInput(String(currentVal - 1));
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
                style={[
                  styles.reorderShortcutChip,
                  { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border },
                ]}
                onPress={() => onChangeOrderInput('1')}
                activeOpacity={0.7}
              >
                <Text style={[styles.reorderShortcutText, { color: colors.textPrimary }]}>الأول (رقم 1)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.reorderShortcutChip,
                  { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border },
                ]}
                onPress={() => onChangeOrderInput(String(totalExpensesCount))}
                activeOpacity={0.7}
              >
                <Text style={[styles.reorderShortcutText, { color: colors.textPrimary }]}>
                  الأخير (رقم {totalExpensesCount})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={styles.reorderSubmitBtn}
              onPress={onApplyReorder}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" style={{ marginLeft: 6 }} />
              <Text style={styles.reorderSubmitBtnText}>تطبيق الترتيب الجديد</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  reorderInputSheetBox: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  reorderModalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  reorderModalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  reorderSheetSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  reorderCardSummary: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  reorderSummaryRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  reorderSummaryLeft: {
    alignItems: 'flex-start',
  },
  reorderSummaryRecipient: {
    fontSize: 13,
    fontWeight: '700',
  },
  reorderSummaryCurrentPos: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  reorderSummaryAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  reorderInputControlRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
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
    width: 100,
    height: 60,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderTextInput: {
    fontSize: 22,
    fontWeight: '900',
    width: '100%',
    padding: 0,
  },
  reorderInputLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  reorderQuickShortcutsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 18,
  },
  reorderShortcutChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  reorderShortcutText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reorderSubmitBtn: {
    backgroundColor: '#047857',
    borderRadius: 14,
    paddingVertical: 14,
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
    fontSize: 14,
    fontWeight: '800',
  },
});
