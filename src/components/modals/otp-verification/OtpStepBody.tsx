import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemeColors } from '../../../types/delegate';
import { ModuleErrorBoundary } from '../../ModuleErrorBoundary';
import { otpVerificationStyles as styles } from './otpVerificationStyles';

interface OtpStepBodyProps {
  step: 'REQUEST' | 'VERIFY';
  nationalId: string;
  onChangeNationalId: (val: string) => void;
  onRequestOtp: () => void;
  otpDigits: string[];
  focusedIndex: number;
  setFocusedIndex: (idx: number) => void;
  inputRefs: React.RefObject<TextInput | null>[];
  onOtpChange: (text: string, index: number) => void;
  onKeyPress: (e: any, index: number) => void;
  onVerify: () => void;
  resendCountdown: number;
  loading: boolean;
  isKeyboardVisible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
}

/** Form body for Step 1 (National ID request) and Step 2 (4-digit OTP entry). */
export const OtpStepBody: React.FC<OtpStepBodyProps> = ({
  step,
  nationalId,
  onChangeNationalId,
  onRequestOtp,
  otpDigits,
  focusedIndex,
  setFocusedIndex,
  inputRefs,
  onOtpChange,
  onKeyPress,
  onVerify,
  resendCountdown,
  loading,
  isKeyboardVisible,
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  return (
    <ModuleErrorBoundary moduleName="OtpStepBody" colors={colors}>
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
              onChangeText={(val) => onChangeNationalId(val.replace(/[^0-9]/g, '').slice(0, 10))}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#0284c7' }]} onPress={onRequestOtp} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>{isRTL ? 'طلب رمز التحقق من المشرف' : 'Request OTP from Supervisor'}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formSection}>
          <View style={styles.otpBoxesRow}>
            {otpDigits.map((digit, idx) => {
              const isFocused = focusedIndex === idx;
              return (
                <TextInput
                  key={idx}
                  ref={inputRefs[idx]}
                  style={[
                    styles.otpBox,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                      borderColor: isFocused ? '#0284c7' : digit ? '#10b981' : isDarkMode ? '#334155' : '#cbd5e1',
                      borderWidth: isFocused ? 2.5 : 2,
                      color: isDarkMode ? '#ffffff' : '#0f172a',
                      shadowColor: isFocused ? '#0284c7' : '#000',
                      shadowOpacity: isFocused ? 0.3 : 0.05,
                      shadowRadius: 6,
                      elevation: isFocused ? 5 : 1,
                    },
                  ]}
                  value={digit}
                  onFocus={() => setFocusedIndex(idx)}
                  onChangeText={(text) => onOtpChange(text, idx)}
                  onKeyPress={(e) => onKeyPress(e, idx)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  selectionColor="#0284c7"
                  autoFocus={idx === 0}
                />
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#10b981', marginTop: isKeyboardVisible ? 12 : 20 }]}
            onPress={onVerify}
            disabled={loading || otpDigits.join('').length < 4}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>{isRTL ? 'تأكيد الرمز وتوثيق الجهاز' : 'Verify & Trust Device'}</Text>
            )}
          </TouchableOpacity>

          <View style={[styles.resendRow, { marginTop: isKeyboardVisible ? 10 : 16 }]}>
            {resendCountdown > 0 ? (
              <Text style={{ fontSize: 13, color: colors.textSecondary }}>
                {isRTL ? `إعادة طلب رمز جديد بعد (${resendCountdown} ثانية)` : `Resend in (${resendCountdown}s)`}
              </Text>
            ) : (
              <TouchableOpacity onPress={onRequestOtp} disabled={loading}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#0284c7' }}>
                  {isRTL ? 'إعادة إرسال رمز جديد للمشرف' : 'Resend new code to supervisor'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </ModuleErrorBoundary>
  );
};
