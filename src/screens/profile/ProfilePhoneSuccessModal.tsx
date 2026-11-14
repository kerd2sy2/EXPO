import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { profileScreenStyles as styles } from './profileScreenStyles';

interface ProfilePhoneSuccessModalProps {
  visible: boolean;
  translateY: Animated.Value;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  onClose: () => void;
}

export const ProfilePhoneSuccessModal: React.FC<ProfilePhoneSuccessModalProps> = React.memo(({
  visible,
  translateY,
  colors,
  isDarkMode,
  isRTL,
  t,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <ModuleErrorBoundary moduleName="إشعار حفظ رقم الهاتف" colors={colors} fallback={null}>
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.phoneSuccessOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
          <Animated.View
            style={[
              styles.phoneSuccessCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                transform: [{ translateY }],
              },
            ]}
          >
            <View
              style={[
                styles.phoneSuccessDragBar,
                {
                  backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                },
              ]}
            />
            <View
              style={[
                styles.phoneSuccessIconCircle,
                {
                  backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5',
                },
              ]}
            >
              <Ionicons name="checkmark-circle" size={34} color="#10b981" />
            </View>
            <Text style={[styles.phoneSuccessTitle, { color: colors.textPrimary }]}>
              {t.phoneSavedSuccess || (isRTL ? 'تم حفظ الرقم بنجاح' : 'Phone Saved Successfully')}
            </Text>
            <Text style={[styles.phoneSuccessSubtitle, { color: colors.textSecondary }]}>
              {t.phoneSavedSub ||
                (isRTL
                  ? 'تم تثبيت وتحديث رقم هاتفك في الملف الشخصي'
                  : 'Your phone number has been updated in your profile')}
            </Text>
            <TouchableOpacity
              style={[styles.phoneSuccessBtn, { backgroundColor: '#10b981' }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.phoneSuccessBtnText}>
                {t.okBtn || (isRTL ? 'حسناً' : 'OK')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </ModuleErrorBoundary>
  );
});
