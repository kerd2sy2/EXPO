import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '../../types/delegate';

interface AhdaAvatarSuccessModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export const AhdaAvatarSuccessModal: React.FC<AhdaAvatarSuccessModalProps> = ({
  visible,
  colors,
  isDarkMode,
  onClose,
  title = 'تم حفظ الصورة بنجاح',
  subtitle = 'تم تحديث صورتك الشخصية وحفظها في حسابك بنجاح',
}) => {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (!visible) return;

    // Haptic notification feedback on success popup
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Ensure animation plays
    lottieRef.current?.play();

    // Auto-dismiss safety timer (animation is 4.0s)
    const timer = setTimeout(() => {
      onClose();
    }, 3800);

    return () => clearTimeout(timer);
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.modalBackdrop}>
        {/* Backdrop tap to dismiss */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Bottom Sheet Box (Slides from bottom) */}
        <View
          style={[
            styles.bottomSheetBox,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
            },
          ]}
        >
          {/* Subtle Pull Indicator Handle Bar */}
          <View
            style={[
              styles.handleBar,
              { backgroundColor: isDarkMode ? '#475569' : '#cbd5e1' },
            ]}
          />

          {/* Lottie Animation: Zt7a58Tu7M */}
          <View style={styles.lottieWrap}>
            <LottieView
              ref={lottieRef}
              source={require('../../../assets/Lottie/json/avatar_saved_success.json')}
              autoPlay
              loop={false}
              style={styles.lottie}
              resizeMode="contain"
              onAnimationFinish={() => {
                setTimeout(() => {
                  onClose();
                }, 400);
              }}
            />
          </View>

          {/* Clean Message Underneath */}
          <Text
            style={[
              styles.title,
              { color: isDarkMode ? '#f8fafc' : '#0f172a' },
            ]}
          >
            {title}
          </Text>

          {!!subtitle && (
            <Text
              style={[
                styles.subtitle,
                { color: isDarkMode ? '#94a3b8' : '#64748b' },
              ]}
            >
              {subtitle}
            </Text>
          )}

          {/* Confirm / Close Button */}
          <TouchableOpacity
            style={[
              styles.confirmBtn,
              {
                backgroundColor: isDarkMode ? '#047857' : '#059669',
              },
            ]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmBtnText}>حسناً</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 24,
  },
  handleBar: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    marginBottom: 12,
  },
  lottieWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  lottie: {
    width: 230,
    height: 160,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  confirmBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
