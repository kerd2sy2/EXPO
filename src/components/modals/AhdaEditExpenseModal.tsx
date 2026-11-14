import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Keyboard,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { CategoryItem } from './AhdaAddExpenseModal';
import { CustodyDayData } from '../../services/custodyService';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { EditExpenseDateSection } from './edit-expense/EditExpenseDateSection';
import { ahdaEditExpenseStyles as styles } from './edit-expense/ahdaEditExpenseStyles';

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
  editDate: string;
  setEditDate: (date: string) => void;
  days?: CustodyDayData[];
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
  editDate,
  setEditDate,
  days = [],
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

  const editAmountRef = useRef<TextInput>(null);
  const editExportNumberRef = useRef<TextInput>(null);
  const editRecipientRef = useRef<TextInput>(null);

  const dismissAndBlurAll = useCallback(() => {
    Keyboard.dismiss();
    editAmountRef.current?.blur();
    editExportNumberRef.current?.blur();
    editRecipientRef.current?.blur();
  }, []);

  useEffect(() => {
    if (editImageUri) {
      dismissAndBlurAll();
      const t1 = setTimeout(dismissAndBlurAll, 100);
      const t2 = setTimeout(dismissAndBlurAll, 300);
      const t3 = setTimeout(dismissAndBlurAll, 600);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [editImageUri, dismissAndBlurAll]);

  useEffect(() => {
    if (!visible) {
      dismissAndBlurAll();
    }
  }, [visible, dismissAndBlurAll]);

  const keyboardOffsetAnim = useRef(new Animated.Value(0)).current;
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    let currentHeight = 0;

    const onShow = (e: any) => {
      const targetHeight = e?.endCoordinates?.height || 280;
      if (currentHeight === targetHeight) return;
      currentHeight = targetHeight;
      setIsKeyboardVisible(true);

      Animated.timing(keyboardOffsetAnim, {
        toValue: targetHeight,
        duration: Platform.OS === 'ios' ? (e?.duration || 260) : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    };

    const onHide = (e: any) => {
      currentHeight = 0;
      setIsKeyboardVisible(false);

      Animated.timing(keyboardOffsetAnim, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e?.duration || 200) : 180,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: false,
      }).start();
    };

    const willShowSub = Keyboard.addListener('keyboardWillShow', onShow);
    const didShowSub = Keyboard.addListener('keyboardDidShow', onShow);
    const willHideSub = Keyboard.addListener('keyboardWillHide', onHide);
    const didHideSub = Keyboard.addListener('keyboardDidHide', onHide);

    return () => {
      willShowSub.remove();
      didShowSub.remove();
      willHideSub.remove();
      didHideSub.remove();
    };
  }, [keyboardOffsetAnim]);

  const handlePick = (fromCamera: boolean) => {
    dismissAndBlurAll();
    onPickImage(fromCamera);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Animated.View
        style={[
          styles.bottomSheetBackdrop,
          { paddingBottom: keyboardOffsetAnim },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => {
            if (isKeyboardVisible) {
              Keyboard.dismiss();
            } else {
              onClose();
            }
          }}
        />
        <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border, zIndex: 10 }]}>
          <View style={styles.sheetIndicator} />

          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تعديل الفاتورة</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            style={{ maxHeight: SCREEN_HEIGHT * 0.58 }}
            contentContainerStyle={{ paddingBottom: 10 }}
          >
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

            <ModuleErrorBoundary moduleName="تقويم تعديل الفاتورة">
              <EditExpenseDateSection
                colors={colors}
                isDarkMode={isDarkMode}
                editDate={editDate}
                setEditDate={setEditDate}
                days={days}
              />
            </ModuleErrorBoundary>

            <View style={styles.inputGroup}>
              <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المبلغ المصروف (ريال) *</Text>
              <TextInput
                ref={editAmountRef}
                style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                value={editAmount}
                onChangeText={setEditAmount}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>البيان التفصيلي</Text>
              <TextInput
                ref={editRecipientRef}
                style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                placeholder="البيان التفصيلي للفاتورة"
                placeholderTextColor="#94a3b8"
                value={editRecipient}
                onChangeText={setEditRecipient}
              />
            </View>

            {isAdvanceCategory && (
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={[styles.sheetLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
                    رقم الوارد *
                  </Text>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Ionicons name="barcode-outline" size={12} color="#047857" />
                    <Text style={{ fontSize: 11, color: '#047857', fontWeight: '700' }}>رقم الوارد</Text>
                  </View>
                </View>
                <TextInput
                  ref={editExportNumberRef}
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
                  تسلسل رقم الوارد (مثل 1/أ، 2/أ) مع إمكانية تعديل الرقم أو الحرف
                </Text>
              </View>
            )}

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
                    onPress={() => handlePick(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-outline" size={20} color="#047857" />
                    <Text style={styles.pickBtnText}>تصوير بالكاميرا</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pickBtn, { backgroundColor: isDarkMode ? '#334155' : '#f0f9ff', borderColor: '#bae6fd' }]}
                    onPress={() => handlePick(false)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="images-outline" size={20} color="#0284c7" />
                    <Text style={styles.pickBtnText}>من المعرض</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                disabled={loading}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
              </TouchableOpacity>

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
      </Animated.View>
    </Modal>
  );
};
