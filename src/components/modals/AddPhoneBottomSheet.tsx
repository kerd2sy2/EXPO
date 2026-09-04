import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, EmployeeProfile } from '../../types/delegate';
import { setMyPhoneApi } from '../../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AddPhoneBottomSheetProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  onClose: () => void;
  onSuccess: (newPhone: string, updatedEmp?: EmployeeProfile) => void;
}

// Convert Arabic digits to standard English digits
const normalizeArabicDigits = (str: string): string => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => `${arabicDigits.indexOf(w)}`);
};

// Normalize and format to standard Saudi mobile format (05XXXXXXXX)
export const normalizeSaudiPhone = (raw: string): string => {
  let cleaned = normalizeArabicDigits(raw).trim();
  cleaned = cleaned.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+966')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('00966')) {
    cleaned = '0' + cleaned.slice(5);
  } else if (cleaned.startsWith('966')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.length === 9 && cleaned.startsWith('5')) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
};

export const isValidSaudiPhone = (raw: string): boolean => {
  const normalized = normalizeSaudiPhone(raw);
  return /^05[0-9]{8}$/.test(normalized);
};

export const AddPhoneBottomSheet: React.FC<AddPhoneBottomSheetProps> = ({
  visible,
  colors,
  isDarkMode,
  isRTL,
  t,
  onClose,
  onSuccess,
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setPhoneNumber('');
      setErrorMessage('');
      setLoading(false);

      Animated.spring(sheetTranslateY, {
        toValue: 0,
        bounciness: 3,
        speed: 14,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 150);
      });
    } else {
      Keyboard.dismiss();
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleClose = () => {
    if (loading) return;
    Keyboard.dismiss();
    Animated.timing(sheetTranslateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleTextChange = (text: string) => {
    setPhoneNumber(text);
    if (errorMessage) setErrorMessage('');
  };

  const normalized = normalizeSaudiPhone(phoneNumber);
  const isValid = isValidSaudiPhone(phoneNumber);

  const handleSubmit = async () => {
    if (!phoneNumber.trim()) {
      setErrorMessage(
        isRTL ? 'اكتب رقم الهاتف أولاً للمتابعة' : 'Please enter a phone number first'
      );
      return;
    }

    if (!isValid) {
      setErrorMessage(
        isRTL
          ? 'يرجى إدخال رقم هاتف سعودي صحيح يبدأ بـ 05 ويتكون من 10 أرقام (مثال: 05XXXXXXXX)'
          : 'Please enter a valid Saudi phone number starting with 05 (10 digits)'
      );
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const res = await setMyPhoneApi(normalized);
      if (res && res.success) {
        handleClose();
        setTimeout(() => {
          onSuccess(res.phone || normalized, res.employee);
        }, 250);
      } else {
        setErrorMessage(
          res?.message ||
            (isRTL ? 'فشل حفظ رقم الهاتف' : 'Failed to save phone number')
        );
      }
    } catch (err: any) {
      console.log('Error saving phone:', err);
      const msg =
        err?.message ||
        (isRTL
          ? 'حدث خطأ أثناء حفظ رقم الهاتف، يرجى المحاولة لاحقاً'
          : 'Error saving phone number, please try again');
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
      onShow={() => {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 100);
      }}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        {/* Sheet */}
        <Animated.View
          style={[
            styles.sheetContent,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Drag Handle Bar */}
          <View style={styles.dragBarContainer}>
            <View
              style={[
                styles.dragBar,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(0, 0, 0, 0.15)',
                },
              ]}
            />
          </View>

          {/* Header */}
          <View
            style={[
              styles.headerRow,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View
              style={[
                styles.headerIconBox,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(16, 185, 129, 0.15)'
                    : '#ecfdf5',
                },
              ]}
            >
              <Ionicons name="call" size={22} color="#10b981" />
            </View>

            <View
              style={[
                styles.headerTextCol,
                { alignItems: isRTL ? 'flex-end' : 'flex-start' },
              ]}
            >
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {isRTL ? 'إضافة رقم الهاتف' : 'Add Phone Number'}
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              >
                {isRTL
                  ? 'يرجى تسجيل رقم هاتفك السعودي للتواصل الميداني'
                  : 'Enter your Saudi phone number for field communications'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.08)'
                    : '#f1f5f9',
                },
              ]}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Input Section */}
            <View style={styles.inputSection}>
              {/* Label */}
              <View
                style={[
                  styles.labelRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  {isRTL ? 'اكتب رقم الهاتف' : 'Enter Phone Number'}
                </Text>
                <Text style={[styles.requiredStar, { color: '#ef4444' }]}>*</Text>
              </View>

              {/* Phone Input Box */}
              <View
                style={[
                  styles.phoneInputBox,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: errorMessage
                      ? '#ef4444'
                      : isValid
                      ? '#10b981'
                      : colors.inputBorder,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                {/* Saudi Code Prefix */}
                <View
                  style={[
                    styles.saudiBadge,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(255, 255, 255, 0.06)'
                        : '#f8fafc',
                      borderColor: colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Text style={[styles.countryCode, { color: colors.textPrimary }]}>
                    +966
                  </Text>
                </View>

                {/* Text Input */}
                <TextInput
                  ref={inputRef}
                  style={[
                    styles.textInput,
                    {
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  placeholder={'05XXXXXXXX'}
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={handleTextChange}
                  maxLength={14}
                  editable={!loading}
                  autoFocus={false}
                  numberOfLines={1}
                  multiline={false}
                />

                {/* Status Icon */}
                {phoneNumber.length > 0 && (
                  <View style={styles.inputActionBox}>
                    {isValid ? (
                      <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleTextChange('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              {/* Hint */}
              <View
                style={[
                  styles.hintRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <Ionicons
                  name={isValid ? 'checkmark-circle-outline' : 'information-circle-outline'}
                  size={14}
                  color={isValid ? '#10b981' : colors.textSecondary}
                />
                <Text
                  style={[styles.hintText, { color: isValid ? '#10b981' : colors.textSecondary }]}
                >
                  {isValid
                    ? isRTL
                      ? `رقم سعودي صالح (${normalized})`
                      : `Valid Saudi number (${normalized})`
                    : isRTL
                    ? 'يجب أن يبدأ بـ 05 ويتكون من 10 أرقام'
                    : 'Must start with 05 and contain 10 digits'}
                </Text>
              </View>

              {/* Error */}
              {errorMessage !== '' && (
                <View
                  style={[
                    styles.errorBox,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(239, 68, 68, 0.12)'
                        : '#fee2e2',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons name="alert-circle" size={18} color="#ef4444" />
                  <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {errorMessage}
                  </Text>
                </View>
              )}


            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsCol}>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  {
                    backgroundColor: isValid ? '#10b981' : colors.primary,
                    opacity: loading ? 0.7 : 1,
                  },
                ]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View
                    style={[
                      styles.btnInnerRow,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                    <Text style={styles.submitBtnText}>
                      {isRTL ? 'حفظ وتثبيت الرقم' : 'Save & Lock Phone'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(255, 255, 255, 0.05)'
                      : '#f1f5f9',
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleClose}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheetContent: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  dragBarContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  inputSection: {
    marginBottom: 20,
  },
  labelRow: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  requiredStar: {
    fontSize: 15,
    fontWeight: '800',
  },
  phoneInputBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    paddingHorizontal: 10,
    height: 54,
  },
  saudiBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 0,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    marginRight: 6,
    height: 36,
    flexShrink: 0,
  },
  flagEmoji: {
    fontSize: 15,
    lineHeight: 18,
  },
  countryCode: {
    fontSize: 13,
    fontWeight: '800',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 8,
    height: 50,
  },
  inputActionBox: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorBox: {
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  warningLockCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  warningLockHeader: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  warningLockTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  warningLockDesc: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
  actionButtonsCol: {
    gap: 10,
    marginTop: 8,
  },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  btnInnerRow: {
    alignItems: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
