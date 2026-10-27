import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { CustodyExpenseItem } from '../../services/custodyService';
import { formatArabicNumber } from '../../utils/formatters';

interface ExpenseActionModalProps {
  visible: boolean;
  expense: CustodyExpenseItem | null;
  categories: Array<{ key: string; label: string; icon: string; color: string; bg: string }>;
  colors: ThemeColors;
  isDarkMode: boolean;
  onEdit: (item: CustodyExpenseItem) => void;
  onDelete: (item: CustodyExpenseItem) => void;
  onClose: () => void;
}

export const ExpenseActionModal: React.FC<ExpenseActionModalProps> = ({
  visible,
  expense,
  categories,
  colors,
  isDarkMode,
  onEdit,
  onDelete,
  onClose,
}) => {
  if (!expense || !visible) return null;

  const catObj = categories.find((c) => c.key === expense.category) || categories[categories.length - 1];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.actionSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sheetHandle} />

          {/* Action Sheet Header with Category & Info */}
          <View style={styles.actionSheetHeaderRow}>
            <View style={[styles.catBadge, { backgroundColor: catObj.bg }]}>
              <Ionicons name={catObj.icon as any} size={20} color={catObj.color} />
            </View>
            <View style={{ alignItems: 'flex-end', flex: 1 }}>
              <Text style={[styles.actionSheetTitle, { color: colors.textPrimary }]}>
                إدارة فاتورة {catObj.label}
              </Text>
              <Text style={[styles.actionSheetSub, { color: colors.textSecondary }]}>
                البيان: {expense.recipient_name || 'بدون بيان'} • {formatArabicNumber(expense.amount, 2)} ر.س
              </Text>
            </View>
          </View>

          {/* Standard Actions (Edit / Delete) */}
          <View style={styles.actionSheetBtnsCol}>
            {/* Edit Option */}
            <TouchableOpacity
              style={[
                styles.sheetOptionBtn,
                { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border },
              ]}
              onPress={() => {
                onClose();
                onEdit(expense);
              }}
              activeOpacity={0.8}
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
                onClose();
                onDelete(expense);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.sheetOptionIconBox, { backgroundColor: '#fee2e2' }]}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </View>
              <Text style={[styles.sheetOptionText, { color: '#ef4444' }]}>
                حذف الفاتورة نهائياً
              </Text>
            </TouchableOpacity>
          </View>

          {/* Cancel button */}
          <TouchableOpacity
            style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.sheetCancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
          </TouchableOpacity>
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
  actionSheetBox: {
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
  actionSheetHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  catBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  actionSheetSub: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  actionSheetBtnsCol: {
    gap: 10,
    marginBottom: 16,
  },
  sheetOptionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 14,
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
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
