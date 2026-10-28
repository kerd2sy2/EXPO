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
  isDarkMode = false,
  isRTL = true,
  lang = 'ar',
  t,
  onBackToHome,
}) => {
  const handleDonePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onBackToHome();
  };

  const titleText =
    t?.oilChangeAlertTitle ||
    (lang === 'ar'
      ? 'حافظ على الدباب وغير الزيت'
      : lang === 'ur'
      ? 'موٹر سائیکل کی حفاظت کریں اور تیل تبدیل کریں'
      : lang === 'bn'
      ? 'বাইকের যত্ন নিন এবং তেল পরিবর্তন করুন'
      : 'Protect your motorcycle and change the oil');

  const buttonText =
    t?.oilChangeAlertBtn ||
    (lang === 'ar'
      ? 'تم'
      : lang === 'ur'
      ? 'مکمل'
      : lang === 'bn'
      ? 'সম্পন্ন'
      : 'Done');

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Prominent Lottie Animation with subtle ambient glow */}
      <View style={styles.animationWrapper}>
        <View
          style={[
            styles.glowBackdrop,
            {
              backgroundColor: isDarkMode
                ? 'rgba(249, 115, 22, 0.12)'
                : 'rgba(249, 115, 22, 0.08)',
            },
          ]}
        />
        <LottieView
          source={require('../../assets/Lottie/LCKboLMu6C.lottie')}
          autoPlay
          loop
          style={styles.lottieAnim}
          resizeMode="contain"
        />
      </View>

      {/* Main Single Title */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.title,
          {
            color: isDarkMode ? '#f8fafc' : '#0f172a',
          },
        ]}
      >
        {titleText}
      </Text>

      {/* Action Button: "تم" */}
      <TouchableOpacity
        style={[styles.doneButton, { backgroundColor: colors.primary || '#f97316' }]}
        onPress={handleDonePress}
        activeOpacity={0.85}
      >
        <Ionicons
          name="checkmark-circle-outline"
          size={22}
          color="#ffffff"
          style={{ marginHorizontal: 6 }}
        />
        <Text style={styles.doneButtonText}>{buttonText}</Text>
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
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  glowBackdrop: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  lottieAnim: {
    width: 260,
    height: 260,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
    letterSpacing: -0.3,
  },
  doneButton: {
    width: '100%',
    maxWidth: 320,
    height: 54,
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
  doneButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
