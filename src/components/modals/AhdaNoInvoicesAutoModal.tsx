import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '../../types/delegate';

interface AhdaNoInvoicesAutoModalProps {
  visible: boolean;
  isDarkMode: boolean;
  colors: ThemeColors;
  onClose: () => void;
}

export const AhdaNoInvoicesAutoModal: React.FC<AhdaNoInvoicesAutoModalProps> = ({
  visible,
  isDarkMode,
  colors,
  onClose,
}) => {
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (!visible) return;

    // Haptic feedback on bottom sheet slide up
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    // Ensure animation plays
    lottieRef.current?.play();

    // Fallback auto-dismiss timer matching animation duration (~4.8 seconds)
    const timer = setTimeout(() => {
      onClose();
    }, 4800);

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
        {/* Backdrop tap to dismiss optional area */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Bottom Sheet Box (Slides from bottom like updates modal) */}
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

          {/* Lottie Animation: EbQYDZdEzt */}
          <View style={styles.lottieWrap}>
            <LottieView
              ref={lottieRef}
              source={require('../../../assets/Lottie/json/no_invoices_notice.json')}
              autoPlay
              loop={false}
              style={styles.lottie}
              resizeMode="contain"
              onAnimationFinish={onClose}
            />
          </View>

          {/* Clean Message Underneath: "لا توجد فواتير" (NO buttons, NO X) */}
          <Text
            style={[
              styles.title,
              { color: isDarkMode ? '#f8fafc' : '#0f172a' },
            ]}
          >
            لا توجد فواتير
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 24,
  },
  handleBar: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    marginBottom: 16,
  },
  lottieWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  lottie: {
    width: 250,
    height: 125,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
