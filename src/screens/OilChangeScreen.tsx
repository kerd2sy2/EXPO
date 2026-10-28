import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { ThemeColors, Language } from '../types/delegate';

export interface OilChangeScreenProps {
  motorcycleNumber?: string;
  distanceSinceOil?: number;
  remainingOilKm?: number;
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
  lang?: Language;
  t?: any;
  onRecheck?: () => Promise<boolean | void>;
  onScanAnother?: () => void;
  onBackToHome: () => void;
}

export const OilChangeScreen: React.FC<OilChangeScreenProps> = ({
  colors,
  lang = 'ar',
  t,
  onBackToHome,
}) => {
  const handleBackToHomePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onBackToHome();
  };

  const buttonText =
    t?.oilChangeAlertBtn ||
    (lang === 'ar'
      ? 'الرجوع إلى الرئيسية'
      : lang === 'ur'
      ? 'مین اسکرین پر واپس جائیں'
      : lang === 'bn'
      ? 'হোমে ফিরে যান'
      : 'Return to Home');

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Pure Lottie Animation directly on page background (no backdrop) */}
      <View style={styles.animationWrapper}>
        <LottieView
          source={require('../../assets/Lottie/LCKboLMu6C.lottie')}
          autoPlay
          loop
          style={styles.lottieAnim}
          resizeMode="contain"
        />
      </View>

      {/* Action Button: "الرجوع إلى الرئيسية" */}
      <TouchableOpacity
        style={[styles.homeButton, { backgroundColor: colors.primary || '#f97316' }]}
        onPress={handleBackToHomePress}
        activeOpacity={0.85}
      >
        <Ionicons
          name="home-outline"
          size={20}
          color="#ffffff"
          style={{ marginHorizontal: 8 }}
        />
        <Text style={styles.homeButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    minHeight: 520,
    width: '100%',
  },
  animationWrapper: {
    width: 270,
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  lottieAnim: {
    width: 270,
    height: 270,
  },
  homeButton: {
    width: '100%',
    maxWidth: 320,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  homeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
