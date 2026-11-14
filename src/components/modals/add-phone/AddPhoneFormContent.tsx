import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../../types/delegate';
import { addPhoneStyles as styles } from './addPhoneStyles';

interface AddPhoneFormContentProps {
  inputRef: React.RefObject<TextInput | null>;
  phoneNumber: string;
  normalized: string;
  isValid: boolean;
  loading: boolean;
  errorMessage: string;
  onChangeText: (txt: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
}

/** Form body inside AddPhoneBottomSheet containing input validation and action buttons. */
export const AddPhoneFormContent: React.FC<AddPhoneFormContentProps> = ({
  inputRef,
  phoneNumber,
  normalized,
  isValid,
  loading,
  errorMessage,
  onChangeText,
  onSubmit,
  onCancel,
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.inputSection}>
        <View style={[styles.labelRow, { flexDirection: rowDir }]}>
          <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
            {t.enterPhoneLabel || (isRTL ? 'اكتب رقم الهاتف' : 'Enter Phone Number')}
          </Text>
          <Text style={[styles.requiredStar, { color: '#ef4444' }]}>*</Text>
        </View>

        <View
          style={[
            styles.phoneInputBox,
            {
              backgroundColor: colors.inputBg,
              borderColor: errorMessage ? '#ef4444' : isValid ? '#10b981' : colors.inputBorder,
              flexDirection: 'row',
            },
          ]}
        >
          <View
            style={[
              styles.saudiBadge,
              {
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#f8fafc',
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.countryCode, { color: colors.textPrimary }]}>+966</Text>
          </View>

          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: colors.textPrimary, textAlign: 'left' }]}
            placeholder="05XXXXXXXX"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            value={phoneNumber}
            onChangeText={onChangeText}
            maxLength={14}
            editable={!loading}
            autoFocus={false}
            numberOfLines={1}
            multiline={false}
          />

          {phoneNumber.length > 0 && (
            <View style={styles.inputActionBox}>
              {isValid ? (
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
              ) : (
                <TouchableOpacity onPress={() => onChangeText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={[styles.hintRow, { flexDirection: rowDir }]}>
          <Ionicons
            name={isValid ? 'checkmark-circle-outline' : 'information-circle-outline'}
            size={14}
            color={isValid ? '#10b981' : colors.textSecondary}
          />
          <Text style={[styles.hintText, { color: isValid ? '#10b981' : colors.textSecondary }]}>
            {isValid
              ? t.phoneValidHint
                ? t.phoneValidHint.replace('{phone}', normalized)
                : isRTL
                ? `رقم سعودي صالح (${normalized})`
                : `Valid Saudi number (${normalized})`
              : t.phoneHelperHint || (isRTL ? 'يجب أن يبدأ بـ 05 ويتكون من 10 أرقام' : 'Must start with 05 and contain 10 digits')}
          </Text>
        </View>

        {errorMessage !== '' && (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fee2e2',
                borderColor: 'rgba(239, 68, 68, 0.3)',
                flexDirection: rowDir,
              },
            ]}
          >
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>{errorMessage}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionButtonsCol}>
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: isValid ? '#10b981' : colors.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <View style={[styles.btnInnerRow, { flexDirection: rowDir }]}>
              <Ionicons name="checkmark-done" size={20} color="#ffffff" />
              <Text style={styles.submitBtnText}>{t.savePhoneBtn || (isRTL ? 'حفظ وتثبيت الرقم' : 'Save & Lock Phone')}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.cancelBtn,
            { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9', borderColor: colors.border },
          ]}
          onPress={onCancel}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t.cancelBtn || (isRTL ? 'إلغاء' : 'Cancel')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};
