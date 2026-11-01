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
  exportNumber?: string;
  setExportNumber?: (val: string) => void;
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
  exportNumber = '',
  setExportNumber,
  invoiceImageUri,
  setInvoiceImageUri,
  loading,
  onPickImage,
  onSave,
  onClose,
}) => {
  const currentCategory = categories.find((c) => c.key === selectedCategory);
  const categoryLabel = currentCategory?.label || 'عام';
  const isAdvanceCategory = selectedCategory === 'internet_advance' || selectedCategory === 'advance';

  const amountInputRef = useRef<TextInput>(null);
  const exportNumberInputRef = useRef<TextInput>(null);
  const recipientInputRef = useRef<TextInput>(null);

  const dismissAndBlurAll = useCallback(() => {
    Keyboard.dismiss();
    amountInputRef.current?.blur();
    exportNumberInputRef.current?.blur();
    recipientInputRef.current?.blur();
  }, []);

  // When image URI is set or changes (or modal closes), dismiss keyboard and blur all inputs
  useEffect(() => {
    if (invoiceImageUri) {
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
  }, [invoiceImageUri, dismissAndBlurAll]);

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
            bounces={false}
            style={{
              maxHeight: SCREEN_HEIGHT * 0.58,
            }}
            contentContainerStyle={{ paddingBottom: 10 }}
          >
              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المبلغ المصروف (ريال) *</Text>
                <TextInput
                  ref={amountInputRef}
                  style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={expenseAmount}
                  onChangeText={setExpenseAmount}
                />
              </View>

              {/* Outgoing Sequence Number Input (رقم الوارد) for Internet & Personal Advances */}
              {isAdvanceCategory && (
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={[styles.sheetLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
                      رقم الوارد *
                    </Text>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Ionicons name="sparkles" size={11} color="#047857" />
                      <Text style={{ fontSize: 11, color: '#047857', fontWeight: '700' }}>تسلسل تلقائي</Text>
                    </View>
                  </View>
                  <TextInput
                    ref={exportNumberInputRef}
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
                    value={exportNumber}
                    onChangeText={(val) => setExportNumber && setExportNumber(val)}
                  />
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: 'right' }}>
                    تم إدراج الرقم والحرف تلقائياً (مثل 1/أ، 2/أ) ويمكنك تعديلهما بحرية
                  </Text>
                </View>
              )}

              {/* Statement / Details */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>البيان التفصيلي</Text>
                <TextInput
                  ref={recipientInputRef}
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
        </Animated.View>
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
