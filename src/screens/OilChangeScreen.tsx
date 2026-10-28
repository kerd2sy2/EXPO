import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
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
      {/* Centered Lottie Animation with no background */}
      <View style={styles.centerSection}>
        <LottieView
          source={require('../../assets/Lottie/LCKboLMu6C.lottie')}
          autoPlay
          loop
          style={styles.lottieAnim}
          resizeMode="contain"
        />
      </View>

      {/* Button at the very bottom, without home icon */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          style={[styles.homeButton, { backgroundColor: colors.primary || '#f97316' }]}
          onPress={handleBackToHomePress}
          activeOpacity={0.85}
        >
          <Text style={styles.homeButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    width: '100%',
    minHeight: 560,
  },
  centerSection: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  lottieAnim: {
    width: 270,
    height: 270,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 16,
  },
  homeButton: {
    width: '100%',
    maxWidth: 340,
    height: 54,
    borderRadius: 16,
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
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
});
