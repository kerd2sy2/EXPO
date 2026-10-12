import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { CategoryItem } from './AhdaAddExpenseModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AhdaEditExpenseModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  categories: CategoryItem[];
  editCategory: string;
  setEditCategory: (cat: string) => void;
  editAmount: string;
  setEditAmount: (amt: string) => void;
  editRecipient: string;
  setEditRecipient: (rec: string) => void;
  loading: boolean;
  onSave: () => void;
  onClose: () => void;
}

export const AhdaEditExpenseModal: React.FC<AhdaEditExpenseModalProps> = ({
  visible,
  colors,
  isDarkMode,
  categories,
  editCategory,
  setEditCategory,
  editAmount,
  setEditAmount,
  editRecipient,
  setEditRecipient,
  loading,
  onSave,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        style={styles.keyboardModalWrapper}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border, zIndex: 10 }]}>
            <View style={styles.sheetIndicator} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تعديل بيانات الفاتورة</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: SCREEN_HEIGHT * 0.7 }}
            >
              {/* Category Radio Tabs */}
              <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>نوع المصروف</Text>
              <View style={styles.categoriesRadioList}>
                {categories.map((c) => {
                  const isSelected = editCategory === c.key;
                  return (
                    <TouchableOpacity
                      key={c.key}
                      style={[
                        styles.catRadioItem,
                        {
                          backgroundColor: isSelected ? '#ea580c' : isDarkMode ? '#1e293b' : '#f8fafc',
                          borderColor: isSelected ? '#ea580c' : colors.border,
                        },
                      ]}
                      onPress={() => setEditCategory(c.key)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={c.icon as any}
                        size={14}
                        color={isSelected ? '#ffffff' : c.color}
                        style={{ marginLeft: 6 }}
                      />
                      <Text
                        style={[
                          styles.catRadioText,
                          { color: isSelected ? '#ffffff' : colors.textPrimary, fontWeight: isSelected ? '800' : '600' },
                        ]}
                      >
                        {c.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المبلغ المصروف (ريال) *</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={editAmount}
                  onChangeText={setEditAmount}
                />
              </View>

              {/* Recipient */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المستلم / البيان التفصيلي</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  placeholder="اسم المستلم أو البيان"
                  placeholderTextColor="#94a3b8"
                  value={editRecipient}
                  onChangeText={setEditRecipient}
                />
              </View>

              {/* Actions */}
              <View style={styles.sheetActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: '#ea580c' }]}
                  disabled={loading}
                  onPress={onSave}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveBtnText}>حفظ التعديلات</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardModalWrapper: {
    flex: 1,
  },
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
  },
  categoriesRadioList: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  catRadioItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  catRadioText: {
    fontSize: 11,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  sheetActions: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 8,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
