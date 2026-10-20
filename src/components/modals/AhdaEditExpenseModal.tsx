import React, { useState } from 'react';
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
  editExportNumber?: string;
  setEditExportNumber?: (val: string) => void;
  editImageUri: string | null;
  setEditImageUri: (uri: string | null) => void;
  onPickImage: (fromCamera: boolean) => void;
  loading: boolean;
  onSave: () => void;
  onDelete?: () => void;
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
  editExportNumber = '',
  setEditExportNumber,
  editImageUri,
  setEditImageUri,
  onPickImage,
  loading,
  onSave,
  onDelete,
  onClose,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentCat = categories.find((c) => c.key === editCategory) || categories[0];
  const isAdvanceCategory = editCategory === 'internet_advance' || editCategory === 'advance';

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

            {/* Header: Exact Title requested "تعديل الفاتورة" */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تعديل الفاتورة</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: SCREEN_HEIGHT * 0.72 }}
            >
              {/* Category Dropdown (شريط منسدل) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>نوع المصروف (القسم)</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownBar,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: dropdownOpen ? '#047857' : colors.border,
                    },
                  ]}
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownSelectedRow}>
                    <View style={[styles.dropdownCatIcon, { backgroundColor: currentCat.bg }]}>
                      <Ionicons name={currentCat.icon as any} size={16} color={currentCat.color} />
                    </View>
                    <Text style={[styles.dropdownBarText, { color: colors.textPrimary }]}>
                      {currentCat.label}
                    </Text>
                  </View>
                  <Ionicons
                    name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Collapsible Dropdown Options */}
                {dropdownOpen && (
                  <View
                    style={[
                      styles.dropdownList,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {categories.map((c) => {
                      const isSelected = editCategory === c.key;
                      return (
                        <TouchableOpacity
                          key={c.key}
                          style={[
                            styles.dropdownItem,
                            isSelected && {
                              backgroundColor: isDarkMode ? '#334155' : '#ecfdf5',
                            },
                          ]}
                          onPress={() => {
                            setEditCategory(c.key);
                            setDropdownOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.dropdownItemRight}>
                            <View style={[styles.dropdownCatIcon, { backgroundColor: c.bg }]}>
                              <Ionicons name={c.icon as any} size={15} color={c.color} />
                            </View>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                {
                                  color: isSelected ? '#047857' : colors.textPrimary,
                                  fontWeight: isSelected ? '800' : '600',
                                },
                              ]}
                            >
                              {c.label}
                            </Text>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={18} color="#047857" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
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

              {/* Outgoing Sequence Number Input (رقم الصادر) for Internet & Personal Advances */}
              {isAdvanceCategory && (
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={[styles.sheetLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
                      رقم الصادر *
                    </Text>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Ionicons name="barcode-outline" size={12} color="#047857" />
                      <Text style={{ fontSize: 11, color: '#047857', fontWeight: '700' }}>رقم الصادر</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#f0fdf4',
                        borderColor: '#059669',
                        color: colors.textPrimary,
                        fontWeight: '700',
                        fontSize: 15,
                        textAlign: 'right',
                      },
                    ]}
                    placeholder="مثال: 1/أ"
                    placeholderTextColor="#94a3b8"
                    value={editExportNumber}
                    onChangeText={(val) => setEditExportNumber && setEditExportNumber(val)}
                  />
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: 'right' }}>
                    تسلسل رقم الصادر (مثل 1/أ، 2/أ) مع إمكانية تعديل الرقم أو الحرف
                  </Text>
                </View>
              )}

              {/* Image Upload / Change Section */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>صورة الفاتورة المرفقة</Text>
                {editImageUri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: editImageUri }} style={styles.previewImage} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setEditImageUri(null)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={15} color="#ffffff" style={{ marginLeft: 4 }} />
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
                      <Text style={styles.pickBtnText}>من المعرض</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Actions: Save & Cancel Buttons ("حفظ أو إلغاء") */}
              <View style={styles.sheetActions}>
                {/* Cancel Button */}
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  disabled={loading}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>

                {/* Edit / Save Button (Primary) */}
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: '#047857' }]}
                  disabled={loading}
                  onPress={onSave}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <View style={styles.btnInnerRow}>
                      <Ionicons name="checkmark-done-outline" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                      <Text style={styles.saveBtnText}>حفظ التعديل</Text>
                    </View>
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
    fontSize: 17,
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
  dropdownBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownSelectedRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  dropdownBarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownCatIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  dropdownItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f033',
  },
  dropdownItemRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  dropdownItemText: {
    fontSize: 13,
  },
  previewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    height: 140,
    backgroundColor: '#f1f5f9',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeImageText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  imagePickRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  sheetActions: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 10,
  },
  saveBtn: {
    flex: 1.2,
    paddingVertical: 13,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnInnerRow: {
    flexDirection: 'row-reverse',
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
