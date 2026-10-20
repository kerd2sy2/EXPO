import React, { useState } from 'react';
import {
  StatusBar,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ThemeColors } from '../types/delegate';
import { custodyService, hasCustodyPermission } from '../services/custodyService';
import { setAuthToken, saveCachedUser } from '../services/api';
import { AhdaActionAlertModal, AhdaAlertConfig } from '../components/modals/AhdaActionAlertModal';
import { HumanVerificationModal } from '../components/modals/HumanVerificationModal';

import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

interface AhdaLoginScreenProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  onSuccess: (user: any) => void;
}

export const AhdaLoginScreen: React.FC<AhdaLoginScreenProps> = ({
  colors,
  isDarkMode,
  onSuccess,
}) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AhdaAlertConfig | null>(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ phone: string; pass: string } | null>(null);

  // Eastern / Arabic digit conversion
  const normalizeDigits = (str: string) => {
    return str
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString());
  };

  // Execute Phone & Password Login after successful human verification
  const executePhoneLogin = async (phone: string, pass: string) => {
    try {
      setLoading(true);
      const res = await custodyService.login(phone, pass);
      const user = res?.admin || res?.user || res?.employee;

      // Strict Custody Permission Verification
      if (!hasCustodyPermission(user)) {
        await setAuthToken(null);
        await saveCachedUser(null);
        const deniedMsg = 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة';
        setAlertConfig({
          type: 'error',
          title: 'تنبيه الصلاحيات',
          message: deniedMsg,
          primaryButtonText: 'حسناً',
        });
        return;
      }

      const token = res?.access_token || res?.token;
      const refresh = res?.refresh_token;

      if (token && user) {
        await setAuthToken(token, refresh);
        await saveCachedUser(user);
        onSuccess(user);
      } else {
        throw new Error('بيانات الدخول غير صحيحة');
      }
    } catch (err: any) {
      console.error('Custody phone login error:', err);
      let msg = err?.message || 'تعذر تسجيل الدخول، تأكد من صحة رقم الهاتف وكلمة السر';
      if (
        msg.includes('صلاحية') ||
        msg.includes('مخصص') ||
        msg.toLowerCase().includes('permission') ||
        msg.toLowerCase().includes('access')
      ) {
        msg = 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة';
      }
      setAlertConfig({
        type: 'error',
        title: 'تنبيه تسجيل الدخول',
        message: msg,
        primaryButtonText: 'حسناً',
      });
    } finally {
      setLoading(false);
    }
  };

  // Regular Phone & Password Login Entry Point
  const handlePhoneLogin = async () => {
    if (loading) return;

    const rawNormalizedPhone = normalizeDigits(phoneInput.trim());
    const rawNormalizedPass = normalizeDigits(passwordInput.trim());

    if (!rawNormalizedPhone) {
      setAlertConfig({
        type: 'error',
        title: 'تنبيه تسجيل الدخول',
        message: 'يرجى إدخال رقم الهاتف',
        primaryButtonText: 'حسناً',
      });
      return;
    }
    if (!rawNormalizedPass) {
      setAlertConfig({
        type: 'error',
        title: 'تنبيه تسجيل الدخول',
        message: 'يرجى إدخال كلمة السر',
        primaryButtonText: 'حسناً',
      });
      return;
    }

    setPendingCredentials({ phone: rawNormalizedPhone, pass: rawNormalizedPass });
    setShowVerifyModal(true);
  };

  const handleVerificationSuccess = () => {
    setShowVerifyModal(false);
    if (pendingCredentials) {
      executePhoneLogin(pendingCredentials.phone, pendingCredentials.pass);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.loginScrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.loginWrapper}>
            {/* Horizontal Brand Lockup */}
            <View style={[styles.brandHorizontalLockup, { flexDirection: 'row' }]}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.brandLogoMark}
                resizeMode="contain"
              />
              <View style={[styles.brandTextCol, { alignItems: 'flex-start' }]}>
                <Text style={[styles.brandMainTitle, { color: isDarkMode ? '#ffffff' : '#090a0f' }]}>
                  أبرار العهدة
                </Text>
                <Text style={[styles.brandSubTitle, { color: isDarkMode ? '#34d399' : '#059669' }]}>
                  AAMS | CUSTODY
                </Text>
              </View>
            </View>

            {/* Login Card */}
            <View style={[styles.loginCard, { backgroundColor: colors.card, borderColor: colors.border }]}>

              <Text style={[styles.loginCardTitle, { color: colors.textPrimary, textAlign: 'right' }]}>
                تسجيل الدخول
              </Text>
              <Text style={[styles.loginCardSubtitle, { color: colors.textSecondary, textAlign: 'right' }]}>
                بوابة الإدارة المالية ومتابعة العهد والمصروفات
              </Text>

              {/* Phone Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary, textAlign: 'right' }]}>
                  رقم الهاتف
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      flexDirection: 'row-reverse',
                    },
                  ]}
                >
                  <View style={styles.inputIcon}>
                    <Feather name="phone" size={18} color={colors.textSecondary} />
                  </View>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.textPrimary,
                        textAlign: 'right',
                      },
                    ]}
                    placeholder="رقم الهاتف"
                    placeholderTextColor="#94a3b8"
                    value={phoneInput}
                    onChangeText={(val) => {
                      const clean = normalizeDigits(val).replace(/[^0-9+]/g, '').slice(0, 14);
                      setPhoneInput(clean);
                    }}
                    maxLength={14}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary, textAlign: 'right' }]}>
                  كلمة السر
                </Text>
                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      flexDirection: 'row-reverse',
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.inputIcon}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: colors.textPrimary,
                        textAlign: 'right',
                      },
                    ]}
                    placeholder="كلمة السر"
                    placeholderTextColor="#94a3b8"
                    value={passwordInput}
                    onChangeText={(val) => {
                      const clean = normalizeDigits(val).replace(/[^0-9]/g, '');
                      setPasswordInput(clean);
                    }}
                    keyboardType="number-pad"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 12 }]}
                onPress={handlePhoneLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={[styles.buttonContentRow, { flexDirection: 'row-reverse' }]}>
                    <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>سجل الدخول</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AhdaActionAlertModal
        config={alertConfig}
        colors={colors}
        isDarkMode={isDarkMode}
        onClose={() => setAlertConfig(null)}
      />

      <HumanVerificationModal
        visible={showVerifyModal}
        colors={colors}
        isDarkMode={isDarkMode}
        appName="العهدة"
        onSuccess={handleVerificationSuccess}
        onCancel={() => setShowVerifyModal(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loginScrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
  },
  loginWrapper: {
    width: '100%',
    maxWidth: 420,
  },
  brandHorizontalLockup: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 26,
  },
  brandLogoMark: {
    width: 62,
    height: 62,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandMainTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },
  brandSubTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: -2,
  },
  loginCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  appTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  appTypeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loginCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  loginCardSubtitle: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
  },
  inputIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContentRow: {
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
