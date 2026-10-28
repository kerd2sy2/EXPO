import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const translateYAnim = useRef(new Animated.Value(14)).current;

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
    (lang === 'ar'
      ? 'حافظ على الدباب وغير زيت'
      : lang === 'ur'
      ? 'موٹر سائیکل کی حفاظت کریں اور تیل تبدیل کریں'
      : lang === 'bn'
      ? 'বাইকের যত্ন নিন এবং তেল পরিবর্তন করুন'
      : 'Protect your motorcycle and change the oil');

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
        {/* Full-width Lottie Animation: oil flows in from the very start of the screen without any background */}
        <View style={styles.animationWrapper}>
          <LottieView
            source={require('../../assets/Lottie/LCKboLMu6C.lottie')}
            autoPlay
            loop
            style={styles.lottieAnim}
            resizeMode="contain"
          />
        </View>

        {/* Title Text: 'حافظ على الدباب وغير زيت' - Non-bold, without box, muted/faded */}
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
    paddingVertical: 24,
    minHeight: 520,
    width: '100%',
  },
  contentWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationWrapper: {
    width: SCREEN_WIDTH,
    height: Math.min(SCREEN_WIDTH * 0.95, 380),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lottieAnim: {
    width: SCREEN_WIDTH,
    height: Math.min(SCREEN_WIDTH * 0.95, 380),
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 24,
  },
  mutedTitle: {
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
    opacity: 0.9,
  },
});
