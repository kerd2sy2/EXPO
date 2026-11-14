import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Platform,
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import {
  requestOtpApi,
  verifyOtpApi,
  setDeviceTrustedForNationalId,
  getDeviceDisplayName,
  getDeviceOsDisplay,
} from '../../services/api';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { otpVerificationStyles as styles } from './otp-verification/otpVerificationStyles';
import { OtpStepBody } from './otp-verification/OtpStepBody';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface OtpVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccessLogin: (userData: any) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  initialNationalId?: string;
}

/** Bottom-sheet modal for supervisor-approved device OTP verification on first login. */
export const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  visible,
  onClose,
  onSuccessLogin,
  colors,
  isDarkMode,
  isRTL,
  t,
  initialNationalId = '',
}) => {
  const [step, setStep] = useState<'REQUEST' | 'VERIFY'>('REQUEST');
  const [nationalId, setNationalId] = useState(initialNationalId);
  const [employeeName, setEmployeeName] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardOffset(e.endCoordinates.height);
      setIsKeyboardVisible(true);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const inputRefs = [
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
    useRef<TextInput>(null),
  ];

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const cleanInit = (initialNationalId || '').trim().replace(/[^0-9]/g, '');
      setNationalId(cleanInit);
      setErrorMessage('');
      setSuccessMessage('');
      setOtpDigits(['', '', '', '']);

      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, damping: 25, stiffness: 250, useNativeDriver: true }),
      ]).start();

      if (cleanInit.length >= 5) {
        handleRequestOtp(cleanInit);
      } else {
        setStep('REQUEST');
      }
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, initialNationalId]);

  useEffect(() => {
    let timer: any = null;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCountdown]);

  const handleRequestOtp = async (idToUse?: string) => {
    const cleanId = (idToUse || nationalId).trim().replace(/[^0-9]/g, '');
    if (cleanId.length < 5) {
      setErrorMessage(isRTL ? 'يرجى إدخال رقم الهوية الوطنية بشكل صحيح' : 'Please enter a valid National ID');
      return;
    }

    setNationalId(cleanId);
    setLoading(true);
    setErrorMessage('');
    try {
      const devName = `${getDeviceDisplayName()} (${getDeviceOsDisplay()})`.trim();
      const res = await requestOtpApi(cleanId, devName || 'هاتف المندوب');
      setEmployeeName(res?.employee_name || '');
      setStep('VERIFY');
      setResendCountdown(45);
      setSuccessMessage(isRTL ? 'تم توجيه رمز التحقق (4 أرقام) إلى لوحة تحكم المشرف' : 'OTP sent to supervisor dashboard');
      setTimeout(() => inputRefs[0].current?.focus(), 400);
    } catch (err: any) {
      setErrorMessage(err.message || (isRTL ? 'فشل في إرسال طلب الرمز' : 'Failed to request OTP'));
      setStep('REQUEST');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const clean = text.replace(/[^0-9]/g, '');
    const newDigits = [...otpDigits];

    if (clean.length > 1) {
      const pasted = clean.slice(0, 4).split('');
      for (let i = 0; i < 4; i++) newDigits[i] = pasted[i] || '';
      setOtpDigits(newDigits);
      if (pasted.length === 4) {
        setFocusedIndex(3);
        Keyboard.dismiss();
        triggerVerification(nationalId, newDigits.join(''));
      } else {
        const nextIdx = Math.min(pasted.length, 3);
        setFocusedIndex(nextIdx);
        inputRefs[nextIdx].current?.focus();
      }
      return;
    }

    newDigits[index] = clean;
    setOtpDigits(newDigits);

    if (clean && index < 3) {
      setFocusedIndex(index + 1);
      inputRefs[index + 1].current?.focus();
    }

    if (clean && index === 3) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 4) {
        Keyboard.dismiss();
        triggerVerification(nationalId, fullCode);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        setFocusedIndex(index - 1);
        inputRefs[index - 1].current?.focus();
      } else {
        setFocusedIndex(index);
      }
    }
  };

  const triggerVerification = async (natId: string, fullCode: string) => {
    if (fullCode.length < 4) {
      setErrorMessage(isRTL ? 'يرجى إدخال رمز التحقق كاملاً (4 أرقام)' : 'Please enter 4 digits');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const loginResp = await verifyOtpApi(natId, fullCode);
      await setDeviceTrustedForNationalId(natId);
      setSuccessMessage(isRTL ? 'تم توثيق الجهاز بنجاح! جاري الدخول...' : 'Device trusted! Logging in...');
      onClose();
      await onSuccessLogin(loginResp);
    } catch (err: any) {
      setErrorMessage(err.message || (isRTL ? 'رمز التحقق غير صحيح' : 'Invalid OTP code'));
      setOtpDigits(['', '', '', '']);
      setTimeout(() => inputRefs[0].current?.focus(), 200);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateY: slideAnim }],
              marginBottom: keyboardOffset > 0 ? keyboardOffset : 0,
              paddingBottom: keyboardOffset > 0 ? 12 : Platform.OS === 'ios' ? 34 : 20,
            },
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: isDarkMode ? '#475569' : '#cbd5e1' }]} />
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ flexGrow: 1 }}>
            {!isKeyboardVisible && (
              <View style={styles.headerIconRow}>
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.15)' : '#f0f9ff',
                      borderColor: isDarkMode ? 'rgba(2, 132, 199, 0.3)' : '#fed7aa',
                    },
                  ]}
                >
                  <MaterialCommunityIcons name="shield-key-outline" size={32} color="#0284c7" />
                </View>
              </View>
            )}

            <Text style={[styles.title, { color: colors.textPrimary, marginBottom: isKeyboardVisible ? 4 : 8 }]}>
              {step === 'REQUEST'
                ? isRTL
                  ? 'توثيق الجهاز لأول مرة (OTP)'
                  : 'First-time Device Verification'
                : isRTL
                ? 'أدخل رمز التحقق (4 أرقام)'
                : 'Enter 4-Digit OTP'}
            </Text>

            <Text
              style={[styles.subtitle, { color: colors.textSecondary, marginBottom: isKeyboardVisible ? 8 : 16, fontSize: isKeyboardVisible ? 12 : 13 }]}
              numberOfLines={isKeyboardVisible ? 2 : undefined}
            >
              {step === 'REQUEST'
                ? isRTL
                  ? 'لتسجيل الدخول من هذا الهاتف لأول مرة، سيتم إرسال رمز سري (4 أرقام) إلى لوحة تحكم المشرف لتوثيق جهازك.'
                  : 'To log in from this phone for the first time, a 4-digit code is sent to your supervisor dashboard.'
                : isRTL
                ? `المندوب: ${employeeName || nationalId} • أدخل رمز التحقق من المشرف`
                : 'Ask your supervisor for the 4-digit code shown on their dashboard.'}
            </Text>

            {errorMessage ? (
              <View style={[styles.msgBanner, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2' }]}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={[styles.msgText, { color: '#ef4444' }]}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={[styles.msgBanner, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#10b981" />
                <Text style={[styles.msgText, { color: '#10b981' }]}>{successMessage}</Text>
              </View>
            ) : null}

            <ModuleErrorBoundary moduleName="OtpVerificationModal" colors={colors}>
              <OtpStepBody
                step={step}
                nationalId={nationalId}
                onChangeNationalId={setNationalId}
                onRequestOtp={() => handleRequestOtp()}
                otpDigits={otpDigits}
                focusedIndex={focusedIndex}
                setFocusedIndex={setFocusedIndex}
                inputRefs={inputRefs}
                onOtpChange={handleOtpChange}
                onKeyPress={handleKeyPress}
                onVerify={() => triggerVerification(nationalId, otpDigits.join(''))}
                resendCountdown={resendCountdown}
                loading={loading}
                isKeyboardVisible={isKeyboardVisible}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                t={t}
              />
            </ModuleErrorBoundary>

            <TouchableOpacity style={[styles.cancelBtn, { paddingVertical: isKeyboardVisible ? 8 : 14 }]} onPress={onClose} disabled={loading}>
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                {isRTL ? 'إلغاء والعودة لتسجيل الدخول' : 'Back to Login'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};
