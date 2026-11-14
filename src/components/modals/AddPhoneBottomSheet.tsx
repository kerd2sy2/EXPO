import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, EmployeeProfile } from '../../types/delegate';
import { setMyPhoneApi } from '../../services/api';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { normalizeSaudiPhone, isValidSaudiPhone } from './add-phone/addPhoneHelpers';
import { addPhoneStyles as styles } from './add-phone/addPhoneStyles';
import { AddPhoneFormContent } from './add-phone/AddPhoneFormContent';

export { normalizeSaudiPhone, isValidSaudiPhone };

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface AddPhoneBottomSheetProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  onClose: () => void;
  onSuccess: (newPhone: string, updatedEmp?: EmployeeProfile) => void;
}

/** Animated bottom sheet allowing users to register and lock their Saudi mobile number. */
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
      setErrorMessage(isRTL ? 'اكتب رقم الهاتف أولاً للمتابعة' : 'Please enter a phone number first');
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
        setLoading(false);
        Keyboard.dismiss();
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_HEIGHT,
          duration: 180,
          useNativeDriver: true,
        }).start(() => {
          onClose();
          onSuccess(res.phone || normalized, res.employee);
        });
        return;
      } else {
        setErrorMessage(res?.message || (isRTL ? 'فشل حفظ رقم الهاتف' : 'Failed to save phone number'));
      }
    } catch (err: any) {
      console.log('Error saving phone:', err);
      const msg =
        err?.message ||
        (isRTL ? 'حدث خطأ أثناء حفظ رقم الهاتف، يرجى المحاولة لاحقاً' : 'Error saving phone number, please try again');
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const rowDir = isRTL ? 'row-reverse' : 'row';

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
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />

        <Animated.View
          style={[
            styles.sheetContent,
            { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <View style={styles.dragBarContainer}>
            <View
              style={[styles.dragBar, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)' }]}
            />
          </View>

          <View style={[styles.headerRow, { flexDirection: rowDir }]}>
            <View style={[styles.headerIconBox, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5' }]}>
              <Ionicons name="call" size={22} color="#10b981" />
            </View>

            <View style={[styles.headerTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {t.addPhoneTitle || (isRTL ? 'إضافة رقم الهاتف' : 'Add Phone Number')}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {t.addPhoneSub ||
                  (isRTL ? 'يرجى تسجيل رقم هاتفك السعودي للتواصل الميداني' : 'Enter your Saudi phone number for field communications')}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9' }]}
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ModuleErrorBoundary moduleName="AddPhoneFormContent" colors={colors}>
            <AddPhoneFormContent
              inputRef={inputRef}
              phoneNumber={phoneNumber}
              normalized={normalized}
              isValid={isValid}
              loading={loading}
              errorMessage={errorMessage}
              onChangeText={handleTextChange}
              onSubmit={handleSubmit}
              onCancel={handleClose}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              t={t}
            />
          </ModuleErrorBoundary>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
