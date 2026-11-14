import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { loginScreenStyles as styles } from './loginScreenStyles';

interface LoginFormCardProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  loginInput: string;
  passwordInput: string;
  showPassword: boolean;
  submitting: boolean;
  biometricLoading: boolean;
  isBiometricSupported: boolean;
  normalizeDigits: (str: string) => string;
  onChangeLogin: (val: string) => void;
  onChangePassword: (val: string) => void;
  onToggleShowPassword: () => void;
  onLoginPress: () => void;
  onBiometricAuth: () => void;
}

export const LoginFormCard: React.FC<LoginFormCardProps> = React.memo(({
  colors,
  isDarkMode,
  isRTL,
  t,
  loginInput,
  passwordInput,
  showPassword,
  submitting,
  biometricLoading,
  isBiometricSupported,
  normalizeDigits,
  onChangeLogin,
  onChangePassword,
  onToggleShowPassword,
  onLoginPress,
  onBiometricAuth,
}) => (
  <ModuleErrorBoundary moduleName="بطاقة تسجيل الدخول" colors={colors}>
    <View style={[styles.loginCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text
        style={[
          styles.loginCardTitle,
          { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
        ]}
      >
        {isRTL ? 'تسجيل الدخول' : t.loginTitle || 'Log In'}
      </Text>
      <Text
        style={[
          styles.loginCardSubtitle,
          { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
        ]}
      >
        {isRTL
          ? 'بوابة شفتات المناديب والمتابعة الميدانية والطلبات'
          : t.loginSubtitle || 'Delegate Shift Portal'}
      </Text>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
          {isRTL ? 'رقم الهاتف' : t.phoneLabel || 'Phone Number'}
        </Text>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.inputBorder,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={styles.inputIcon}>
            <Feather name="phone" size={18} color={colors.textSecondary} />
          </View>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={isRTL ? 'رقم الهاتف' : 'Phone Number'}
            placeholderTextColor="#94a3b8"
            value={loginInput}
            onChangeText={(val) => {
              const clean = normalizeDigits(val).replace(/[^0-9+]/g, '').slice(0, 14);
              onChangeLogin(clean);
            }}
            maxLength={14}
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
        </View>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
          {isRTL ? 'كلمة السر' : t.passwordLabel}
        </Text>
        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.inputBorder,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <TouchableOpacity onPress={onToggleShowPassword} style={styles.inputIcon}>
            <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={isRTL ? 'كلمة السر' : t.passwordPlaceholder || 'Password'}
            placeholderTextColor="#94a3b8"
            value={passwordInput}
            onChangeText={(val) => {
              const clean = normalizeDigits(val).replace(/[^0-9]/g, '');
              onChangePassword(clean);
            }}
            keyboardType="number-pad"
            autoCapitalize="none"
            secureTextEntry={!showPassword}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 12 }]}
        onPress={onLoginPress}
        disabled={submitting || biometricLoading}
      >
        {submitting ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="log-in-outline" size={20} color="#ffffff" />
            <Text style={styles.primaryButtonText}>{isRTL ? 'سجل الدخول' : t.loginBtn}</Text>
          </View>
        )}
      </TouchableOpacity>

      {isBiometricSupported ? (
        <TouchableOpacity
          style={[
            styles.biometricBtn,
            {
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : '#e2e8f0',
              backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
            },
          ]}
          onPress={onBiometricAuth}
          disabled={biometricLoading || submitting}
          activeOpacity={0.8}
        >
          {biometricLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="finger-print" size={22} color={colors.primary} />
              <Text style={[styles.biometricBtnText, { color: colors.textPrimary }]}>
                {isRTL ? 'تسجيل الدخول بالبصمة' : 'Login with Biometrics'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  </ModuleErrorBoundary>
));
