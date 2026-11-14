import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView, Animated, Dimensions, Keyboard, KeyboardEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { changeMyPasswordApi } from '../../services/api';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { normalizePasswordDigits } from './change-password/changePasswordHelpers';
import { changePasswordStyles as styles } from './change-password/changePasswordStyles';
import { ChangePasswordFormBody } from './change-password/ChangePasswordFormBody';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface ChangePasswordModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  onClose: () => void;
  onSuccess: () => void;
}

/** Bottom-sheet overlay allowing delegates or supervisors to update their numeric password. */
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
      Animated.timing(keyboardPadding, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
        useNativeDriver: false,
      }).start();
    };

    const onKeyboardHide = (e?: KeyboardEvent) => {
      setIsKeyboardVisible(false);
      Animated.timing(keyboardPadding, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e?.duration || 200 : 180,
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
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, { toValue: 0, bounciness: 3, speed: 13, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
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
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      handleReset();
      onClose();
      if (callback) callback();
    });
  };

  const handleSubmit = async () => {
    const cleanOld = normalizePasswordDigits(oldPassword.trim()).replace(/[^0-9]/g, '');
    const cleanNew = normalizePasswordDigits(newPassword.trim()).replace(/[^0-9]/g, '');
    const cleanConfirm = normalizePasswordDigits(confirmPassword.trim()).replace(/[^0-9]/g, '');

    if (!cleanOld) {
      setErrorMessage(t.currentPasswordPlaceholder || 'يرجى إدخال كلمة المرور الحالية');
      return;
    }
    if (!cleanNew || cleanNew.length < 4) {
      setErrorMessage(
        isRTL ? 'كلمة المرور الجديدة يجب أن تكون أرقاماً فقط ولا تقل عن 4 أرقام' : 'New password must be numbers only and at least 4 digits'
      );
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setErrorMessage(t.passwordMismatchError || 'كلمات المرور الجديدة غير متطابقة');
      return;
    }

    setErrorMessage('');
    setLoading(true);

    try {
      await changeMyPasswordApi(cleanOld, cleanNew);
      handleAnimatedClose(() => onSuccess());
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشل في تغيير كلمة المرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => !loading && handleAnimatedClose()} />

      <Animated.View style={[styles.sheetWrapper, { paddingBottom: keyboardPadding }]}>
        <Animated.View
          style={[
            styles.sheetCard,
            { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <View style={styles.handleWrap}>
            <View style={[styles.handleBar, { backgroundColor: isDarkMode ? '#3f3f46' : '#cbd5e1' }]} />
          </View>

          <View style={[styles.headerRow, isKeyboardVisible && styles.headerRowCompact]}>
            {!isKeyboardVisible && (
              <View style={[styles.iconBox, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.18)' : '#eff6ff' }]}>
                <Ionicons name="key" size={24} color={colors.primary} />
              </View>
            )}
            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{t.changePassword}</Text>
              {!isKeyboardVisible && <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.changePasswordSub}</Text>}
            </View>
          </View>

          <ModuleErrorBoundary moduleName="ChangePasswordModal" colors={colors}>
            <ChangePasswordFormBody
              scrollViewRef={scrollViewRef}
              oldPassword={oldPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              showOld={showOld}
              showNew={showNew}
              showConfirm={showConfirm}
              onChangeOld={setOldPassword}
              onChangeNew={setNewPassword}
              onChangeConfirm={setConfirmPassword}
              onToggleOld={() => setShowOld(!showOld)}
              onToggleNew={() => setShowNew(!showNew)}
              onToggleConfirm={() => setShowConfirm(!showConfirm)}
              errorMessage={errorMessage}
              loading={loading}
              onSubmit={handleSubmit}
              onCancel={() => handleAnimatedClose()}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              t={t}
            />
          </ModuleErrorBoundary>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};
