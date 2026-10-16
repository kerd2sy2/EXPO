import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface CategoryItem {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

interface AhdaAddExpenseModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  categories: CategoryItem[];
  selectedCategory: string;
  expenseAmount: string;
  setExpenseAmount: (val: string) => void;
  expenseRecipient: string;
  setExpenseRecipient: (val: string) => void;
  invoiceImageUri: string | null;
  setInvoiceImageUri: (uri: string | null) => void;
  loading: boolean;
  onPickImage: (fromCamera: boolean) => void;
  onSave: () => void;
  onClose: () => void;
}

export const AhdaAddExpenseModal: React.FC<AhdaAddExpenseModalProps> = ({
  visible,
  colors,
  isDarkMode,
  categories,
  selectedCategory,
  expenseAmount,
  setExpenseAmount,
  expenseRecipient,
  setExpenseRecipient,
  invoiceImageUri,
  setInvoiceImageUri,
  loading,
  onPickImage,
  onSave,
  onClose,
}) => {
  const currentCategory = categories.find((c) => c.key === selectedCategory);
  const categoryLabel = currentCategory?.label || 'عام';

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
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                إضافة فاتورة - {categoryLabel}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: SCREEN_HEIGHT * 0.7 }}
            >
              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المبلغ المصروف (ريال) *</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                />
              </View>

              {/* Recipient / Details */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المستلم / البيان التفصيلي</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  placeholder="مثال: بنزين دباب #412 أو سلفة فلان"
                  placeholderTextColor="#94a3b8"
                  value={expenseRecipient}
                  onChangeText={setExpenseRecipient}
                />
              </View>

              {/* Invoice Image Upload */}
              <Text style={[styles.sheetLabel, { color: colors.textPrimary, marginTop: 4 }]}>صورة الفاتورة المعتمدة</Text>
              {invoiceImageUri ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: invoiceImageUri }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => setInvoiceImageUri(null)}>
                    <Ionicons name="trash" size={14} color="#ffffff" />
                    <Text style={styles.removeImageText}>حذف الصورة</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.imagePickRow}>
                  <TouchableOpacity
                    style={[styles.pickBtn, { backgroundColor: isDarkMode ? '#334155' : '#ecfdf5', borderColor: '#fed7aa' }]}
                    onPress={() => onPickImage(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={20} color="#047857" />
                    <Text style={styles.pickBtnText}>تصوير بالكاميرا</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pickBtn, { backgroundColor: isDarkMode ? '#334155' : '#f0f9ff', borderColor: '#bae6fd' }]}
                    onPress={() => onPickImage(false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images-outline" size={20} color="#0284c7" />
                    <Text style={[styles.pickBtnText, { color: '#0284c7' }]}>من المعرض</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Actions */}
              <View style={styles.sheetActions}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: '#047857' }]}
                  disabled={loading}
                  onPress={onSave}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveBtnText}>تأكيد وحفظ الفاتورة</Text>
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
  imagePickRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 16,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
  },
  pickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
  previewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    height: 140,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  removeImageText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
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
