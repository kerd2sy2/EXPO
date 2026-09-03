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
  KeyboardEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { changeMyPasswordApi } from '../../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ChangePasswordModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  visible,
  colors,
  isDarkMode,
  isRTL,
  t,
  onClose,
  onSuccess,
}) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const keyboardPadding = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onKeyboardShow = (e: KeyboardEvent) => {
      setIsKeyboardVisible(true);
      const h = e.endCoordinates.height;
      Animated.timing(keyboardPadding, {
        toValue: h,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
        useNativeDriver: false,
      }).start();
    };

    const onKeyboardHide = (e?: KeyboardEvent) => {
      setIsKeyboardVisible(false);
      Animated.timing(keyboardPadding, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? (e?.duration || 200) : 180,
        useNativeDriver: false,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onKeyboardShow);
    const hideSub = Keyboard.addListener(hideEvent, onKeyboardHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          bounciness: 3,
          speed: 13,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const handleReset = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setShowOld(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleAnimatedClose = (callback?: () => void) => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      handleReset();
      onClose();
      if (callback) callback();
    });
  };

  const handleSubmit = async () => {
    if (!oldPassword.trim()) {
      setErrorMessage(t.currentPasswordPlaceholder || 'يرجى إدخال كلمة المرور الحالية');
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setErrorMessage(
        isRTL
          ? 'كلمة المرور الجديدة يجب ألا تقل عن 4 أرقام / أحرف'
          : 'New password must be at least 4 characters'
      );
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setErrorMessage(t.passwordMismatchError || 'كلمات المرور الجديدة غير متطابقة');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      await changeMyPasswordApi(oldPassword, newPassword);
      handleAnimatedClose(() => {
        onSuccess();
      });
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشل في تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
      {/* Background Dim Clickable Dismiss */}
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={() => !loading && handleAnimatedClose()}
      />

      <Animated.View
        style={[
          styles.sheetWrapper,
          {
            paddingBottom: keyboardPadding,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.sheetCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Top Handle Indicator */}
          <View style={styles.handleWrap}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: isDarkMode ? '#3f3f46' : '#cbd5e1' },
              ]}
            />
          </View>

          {/* Compact Header */}
          <View style={[styles.headerRow, isKeyboardVisible && styles.headerRowCompact]}>
            {!isKeyboardVisible && (
              <View
                style={[
                  styles.iconBox,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(59, 130, 246, 0.18)'
                      : '#eff6ff',
                  },
                ]}
              >
                <Ionicons name="key" size={24} color={colors.primary} />
              </View>
            )}
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t.changePassword}
              </Text>
              {!isKeyboardVisible && (
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {t.changePasswordSub}
                </Text>
              )}
            </View>
          </View>

          {/* Scrollable Inputs Area */}
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Error Box */}
            {!!errorMessage && (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: isDarkMode
                      ? 'rgba(239, 68, 68, 0.12)'
                      : '#fef2f2',
                    borderColor: isDarkMode
                      ? 'rgba(239, 68, 68, 0.3)'
                      : '#fecaca',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text
                  style={[
                    styles.errorText,
                    { color: '#ef4444', textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  {errorMessage}
                </Text>
              </View>
            )}

            {/* Old Password Input */}
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.label,
                  { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t.currentPassword}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  placeholder={t.currentPasswordPlaceholder}
                  placeholderTextColor={colors.textSecondary + '88'}
                  secureTextEntry={!showOld}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowOld(!showOld)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showOld ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* New Password Input */}
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.label,
                  { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t.newPassword}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons
                  name="shield-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  placeholder={t.newPasswordPlaceholder}
                  placeholderTextColor={colors.textSecondary + '88'}
                  secureTextEntry={!showNew}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowNew(!showNew)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showNew ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.label,
                  { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {t.confirmNewPassword}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  placeholder={t.confirmNewPasswordPlaceholder}
                  placeholderTextColor={colors.textSecondary + '88'}
                  secureTextEntry={!showConfirm}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Fixed Bottom Action Buttons - Directly Above Keyboard */}
          <View
            style={[
              styles.actionsRow,
              {
                borderTopColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons
                    name="checkmark-circle"
                    size={19}
                    color="#ffffff"
                    style={{ marginHorizontal: 4 }}
                  />
                  <Text style={styles.saveBtnText}>{t.savePasswordBtn}</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleAnimatedClose()}
              disabled={loading}
            >
              <Text
                style={[styles.cancelBtnText, { color: colors.textSecondary }]}
              >
                {t.cancelBtn || 'إلغاء'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    zIndex: 9998,
  },
  sheetWrapper: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  handleWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 4,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRowCompact: {
    marginBottom: 8,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollArea: {
    maxHeight: SCREEN_HEIGHT * 0.45,
  },
  scrollContent: {
    paddingBottom: 6,
  },
  errorBox: {
    padding: 9,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  inputWrapper: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  actionsRow: {
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 4,
    gap: 10,
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});

