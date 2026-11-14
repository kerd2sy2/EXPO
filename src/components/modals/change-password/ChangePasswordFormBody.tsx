import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../../types/delegate';
import { ModuleErrorBoundary } from '../../ModuleErrorBoundary';
import { normalizePasswordDigits } from './changePasswordHelpers';
import { changePasswordStyles as styles } from './changePasswordStyles';

interface ChangePasswordFormBodyProps {
  scrollViewRef: React.RefObject<ScrollView | null>;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  showOld: boolean;
  showNew: boolean;
  showConfirm: boolean;
  onChangeOld: (v: string) => void;
  onChangeNew: (v: string) => void;
  onChangeConfirm: (v: string) => void;
  onToggleOld: () => void;
  onToggleNew: () => void;
  onToggleConfirm: () => void;
  errorMessage: string;
  loading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
}

/** Form body and action buttons for the ChangePasswordModal bottom sheet. */
export const ChangePasswordFormBody: React.FC<ChangePasswordFormBodyProps> = ({
  scrollViewRef,
  oldPassword,
  newPassword,
  confirmPassword,
  showOld,
  showNew,
  showConfirm,
  onChangeOld,
  onChangeNew,
  onChangeConfirm,
  onToggleOld,
  onToggleNew,
  onToggleConfirm,
  errorMessage,
  loading,
  onSubmit,
  onCancel,
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const alignTxt = isRTL ? 'right' : 'left';

  const fields = [
    {
      key: 'old',
      label: t.currentPassword,
      placeholder: t.currentPasswordPlaceholder,
      icon: 'lock-closed-outline' as const,
      value: oldPassword,
      show: showOld,
      onToggle: onToggleOld,
      onChange: (val: string) => onChangeOld(normalizePasswordDigits(val).replace(/[^0-9]/g, '')),
    },
    {
      key: 'new',
      label: t.newPassword,
      placeholder: t.newPasswordPlaceholder,
      icon: 'shield-outline' as const,
      value: newPassword,
      show: showNew,
      onToggle: onToggleNew,
      onChange: (val: string) => onChangeNew(normalizePasswordDigits(val).replace(/[^0-9]/g, '')),
    },
    {
      key: 'confirm',
      label: t.confirmNewPassword,
      placeholder: t.confirmNewPasswordPlaceholder,
      icon: 'checkmark-done-outline' as const,
      value: confirmPassword,
      show: showConfirm,
      onToggle: onToggleConfirm,
      onChange: (val: string) => onChangeConfirm(normalizePasswordDigits(val).replace(/[^0-9]/g, '')),
    },
  ];

  return (
    <ModuleErrorBoundary moduleName="ChangePasswordFormBody" colors={colors}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
      >
        {!!errorMessage && (
          <View
            style={[
              styles.errorBox,
              {
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
                flexDirection: rowDir,
              },
            ]}
          >
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={[styles.errorText, { color: '#ef4444', textAlign: alignTxt }]}>{errorMessage}</Text>
          </View>
        )}

        {fields.map((field) => (
          <View key={field.key} style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.textPrimary, textAlign: alignTxt }]}>{field.label}</Text>
            <View style={[styles.inputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border, flexDirection: rowDir }]}>
              <Ionicons name={field.icon} size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary, textAlign: alignTxt }]}
                placeholder={field.placeholder}
                placeholderTextColor={colors.textSecondary + '88'}
                secureTextEntry={!field.show}
                value={field.value}
                onChangeText={field.onChange}
                keyboardType="number-pad"
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={field.onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={field.show ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.actionsRow, { borderTopColor: colors.border, flexDirection: rowDir }]}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={onSubmit} disabled={loading} activeOpacity={0.8}>
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={19} color="#ffffff" style={{ marginHorizontal: 4 }} />
              <Text style={styles.saveBtnText}>{t.savePasswordBtn}</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
          onPress={onCancel}
          disabled={loading}
        >
          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t.cancelBtn || 'إلغاء'}</Text>
        </TouchableOpacity>
      </View>
    </ModuleErrorBoundary>
  );
};
