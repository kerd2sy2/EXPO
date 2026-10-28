import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
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
  isDarkMode = false,
  isRTL = true,
  lang = 'ar',
  t,
  onBackToHome,
}) => {
  // Smooth entrance transition
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        bounciness: 4,
        speed: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleActionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onBackToHome();
  };

  const titleText =
    t?.oilChangeAlertTitle ||
    t?.oilChangeAlertBtn ||
    (lang === 'ar'
      ? 'غير زيت الان'
      : lang === 'ur'
      ? 'ابھی تیل تبدیل کریں'
      : lang === 'bn'
      ? 'এখনই তেল পরিবর্তন করুন'
      : 'Change oil now');

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Animated.View
        style={[
          styles.contentWrap,
          {
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }],
          },
        ]}
      >
        {/* Animation Container: Lottie is visibly BIGGER than the circular background */}
        <View style={styles.badgeWrapper}>
          {/* Circular Background (smaller than the animation) */}
          <View
            style={[
              styles.circleBackground,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(249, 115, 22, 0.12)'
                  : '#fff7ed',
                borderColor: isDarkMode
                  ? 'rgba(249, 115, 22, 0.25)'
                  : 'rgba(249, 115, 22, 0.18)',
              },
            ]}
          />

          {/* Lottie Animation: Oversized relative to circle */}
          <LottieView
            source={require('../../assets/Lottie/LCKboLMu6C.lottie')}
            autoPlay
            loop
            style={styles.lottieAnim}
            resizeMode="contain"
          />
        </View>

        {/* Title Text: Non-bold, without box, muted/faded color */}
        <TouchableOpacity
          onPress={handleActionPress}
          activeOpacity={0.7}
          style={styles.textContainer}
        >
          <Text
            style={[
              styles.mutedTitle,
              {
                color: isDarkMode ? '#94a3b8' : '#64748b',
              },
            ]}
          >
            {titleText}
          </Text>
        </TouchableOpacity>
      </Animated.View>
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
  contentWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeWrapper: {
    width: 270,
    height: 270,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  circleBackground: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1.5,
  },
  lottieAnim: {
    width: 260,
    height: 260,
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  mutedTitle: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
    opacity: 0.9,
  },
});
