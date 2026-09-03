import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors, Language } from '../../types/delegate';
import { requestOtpApi, verifyOtpApi } from '../../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface OtpVerificationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccessLogin: (userData: any) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  initialNationalId?: string;
}

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
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 25,
          stiffness: 250,
          useNativeDriver: true,
        }),
      ]).start();

      if (cleanInit.length >= 5) {
        // Automatically trigger OTP request to supervisor
        handleRequestOtp(cleanInit);
      } else {
        setStep('REQUEST');
      }
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, initialNationalId]);

  // Resend Countdown Timer
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
      const res = await requestOtpApi(cleanId, 'تطبيق الجوال - توثيق المندوب');
      setEmployeeName(res?.employee_name || '');
      setStep('VERIFY');
      setResendCountdown(45);
      setSuccessMessage(
        isRTL
          ? 'تم توجيه رمز التحقق (4 أرقام) إلى لوحة تحكم المشرف'
          : 'OTP sent to supervisor dashboard'
      );
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 400);
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
      // User pasted whole 4 digits
      const pasted = clean.slice(0, 4).split('');
      for (let i = 0; i < 4; i++) {
        newDigits[i] = pasted[i] || '';
      }
      setOtpDigits(newDigits);
      if (pasted.length === 4) {
        Keyboard.dismiss();
        triggerVerification(nationalId, newDigits.join(''));
      }
      return;
    }

    newDigits[index] = clean;
    setOtpDigits(newDigits);

    // Auto-advance
    if (clean && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when 4th digit entered
    if (clean && index === 3) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 4) {
        Keyboard.dismiss();
        triggerVerification(nationalId, fullCode);
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
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
      setSuccessMessage(isRTL ? 'تم توثيق الجهاز بنجاح! جاري الدخول...' : 'Device trusted! Logging in...');
      setTimeout(() => {
        onSuccessLogin(loginResp);
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || (isRTL ? 'رمز التحقق غير صحيح' : 'Invalid OTP code'));
      setOtpDigits(['', '', '', '']);
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 200);
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
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
            },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: isDarkMode ? '#475569' : '#cbd5e1' }]} />
          </View>

          {/* Header Icon */}
          <View style={styles.headerIconRow}>
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.15)' : '#fff7ed',
                  borderColor: isDarkMode ? 'rgba(249, 115, 22, 0.3)' : '#fed7aa',
                },
              ]}
            >
              <MaterialCommunityIcons name="shield-key-outline" size={32} color="#f97316" />
            </View>
          </View>

          {/* Title & Subtitle */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {step === 'REQUEST'
              ? isRTL
                ? 'توثيق الجهاز عبر المشرف (OTP)'
                : 'Supervisor Device Verification'
              : isRTL
              ? 'أدخل رمز التحقق (4 أرقام)'
              : 'Enter 4-Digit OTP'}
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === 'REQUEST'
              ? isRTL
                ? 'في حال نسيت كلمة المرور أو لتسجيل الدخول من جهاز جديد، سيصل رمز سري إلى لوحة تحكم مشرفك مباشرة.'
                : 'Enter your National ID to generate a 4-digit code in your supervisor dashboard.'
              : isRTL
              ? `المندوب: ${employeeName || nationalId}\nاطلب الرمز المكون من 4 أرقام من المشرف وأدخله هنا لتوثيق جهازك.`
              : `Ask your supervisor for the 4-digit code shown on their dashboard.`}
          </Text>

          {/* Feedback Messages */}
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

          {/* STEP 1: Enter National ID */}
          {step === 'REQUEST' ? (
            <View style={styles.formSection}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.nationalIdLabel}
              </Text>
              <View
                style={[
                  styles.inputWrap,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Feather name="user" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.textInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t.nationalIdPlaceholder}
                  placeholderTextColor="#94a3b8"
                  value={nationalId}
                  onChangeText={(val) => setNationalId(val.replace(/[^0-9]/g, '').slice(0, 10))}
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f97316' }]}
                onPress={() => handleRequestOtp()}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>
                    {isRTL ? 'طلب رمز التحقق من المشرف 🚀' : 'Request OTP from Supervisor'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            /* STEP 2: 4-Digit OTP Entry */
            <View style={styles.formSection}>
              <View style={styles.otpBoxesRow}>
                {otpDigits.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={inputRefs[idx]}
                    style={[
                      styles.otpBox,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: digit ? '#f97316' : colors.inputBorder,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={digit}
                    onChangeText={(text) => handleOtpChange(text, idx)}
                    onKeyPress={(e) => handleKeyPress(e, idx)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10b981', marginTop: 20 }]}
                onPress={() => triggerVerification(nationalId, otpDigits.join(''))}
                disabled={loading || otpDigits.join('').length < 4}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>
                    {isRTL ? 'تأكيد الرمز وتوثيق الجهاز ✓' : 'Verify & Trust Device'}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Resend Action */}
              <View style={styles.resendRow}>
                {resendCountdown > 0 ? (
                  <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                    {isRTL
                      ? `إعادة طلب رمز جديد بعد (${resendCountdown} ثانية)`
                      : `Resend in (${resendCountdown}s)`}
                  </Text>
                ) : (
                  <TouchableOpacity onPress={() => handleRequestOtp()} disabled={loading}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#f97316' }}>
                      {isRTL ? 'إعادة إرسال رمز جديد للمشرف' : 'Resend new code to supervisor'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Close / Cancel Button */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
              {isRTL ? 'إلغاء والعودة لتسجيل الدخول' : 'Back to Login'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerIconRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  msgBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  msgText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  formSection: {
    width: '100%',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  actionBtn: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  otpBoxesRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginVertical: 12,
  },
  otpBox: {
    width: 58,
    height: 64,
    borderRadius: 16,
    borderWidth: 2,
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '900',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 16,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
