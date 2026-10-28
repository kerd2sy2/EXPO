import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
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
  isDarkMode = false,
  isRTL = true,
  lang = 'ar',
  t,
  onBackToHome,
}) => {
  // Smooth entrance transition animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(20)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(translateYAnim, {
        toValue: 0,
        bounciness: 5,
        speed: 12,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        bounciness: 4,
        speed: 12,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleActionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onBackToHome();
  };

  const buttonText =
    t?.oilChangeAlertBtn ||
    t?.oilChangeAlertTitle ||
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
            transform: [{ translateY: translateYAnim }, { scale: scaleAnim }],
          },
        ]}
      >
        {/* Circular Background for Animation */}
        <View
          style={[
            styles.circleContainer,
            {
              backgroundColor: isDarkMode
                ? 'rgba(249, 115, 22, 0.12)'
                : '#fff7ed',
              borderColor: isDarkMode
                ? 'rgba(249, 115, 22, 0.3)'
                : 'rgba(249, 115, 22, 0.25)',
            },
          ]}
        >
          <LottieView
            source={require('../../assets/Lottie/LCKboLMu6C.lottie')}
            autoPlay
            loop
            style={styles.lottieAnim}
            resizeMode="contain"
          />
        </View>

        {/* Action Button directly under the animation: "غير زيت الان" */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary || '#f97316' }]}
          onPress={handleActionPress}
          activeOpacity={0.85}
        >
          <Text style={styles.actionButtonText}>{buttonText}</Text>
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
  circleContainer: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: Platform.OS === 'ios' ? 0.16 : 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  lottieAnim: {
    width: 200,
    height: 200,
  },
  actionButton: {
    width: '100%',
    maxWidth: 280,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
