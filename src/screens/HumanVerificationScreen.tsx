import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { ThemeColors } from '../types/delegate';

export interface HumanVerificationScreenProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  appName: string;
  isRTL?: boolean;
  onVerify: () => Promise<void>;
  onBack?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TRACK_WIDTH = Math.min(SCREEN_WIDTH - 48, 330);
const KNOB_SIZE = 50;
const MAX_SLIDE = TRACK_WIDTH - KNOB_SIZE - 8;
const ANIMATION_HEIGHT = Math.round(SCREEN_HEIGHT * 0.56);

export const HumanVerificationScreen: React.FC<HumanVerificationScreenProps> = ({
  colors,
  isDarkMode,
  appName,
  onVerify,
  onBack,
}) => {
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef<any>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    if (lottieRef.current) {
      lottieRef.current.play?.();
    }
  }, []);

  const handleSlideComplete = async () => {
    if (verifying || verified) return;

    setVerified(true);
    setVerifying(true);
    setErrorMessage(null);

    // Lock slider at the end
    Animated.timing(slideAnim, {
      toValue: MAX_SLIDE,
      duration: 120,
      useNativeDriver: false,
    }).start();

    try {
      // Execute the actual login request while staying on this screen
      await onVerify();
    } catch (err: any) {
      console.error('Verification/Login error on screen:', err);
      const msg = err?.message || 'فشل تسجيل الدخول، يرجى التأكد من صحة البيانات';
      setErrorMessage(msg);
      setVerified(false);
      setVerifying(false);
      // Reset slider so user can retry
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: false,
      }).start();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !verifying && !verified,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return !verifying && !verified && Math.abs(gesture.dx) > 5;
      },
      onPanResponderMove: (_, gesture) => {
        if (verifying || verified) return;
        const clampedX = Math.max(0, Math.min(gesture.dx, MAX_SLIDE));
        slideAnim.setValue(clampedX);
      },
      onPanResponderRelease: (_, gesture) => {
        if (verifying || verified) return;
        if (gesture.dx >= MAX_SLIDE * 0.75) {
          handleSlideComplete();
        } else {
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 6,
            tension: 40,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Upper 2/3 Section: Large Lottie Animation floating directly on background without card */}
        <View style={styles.animationSection}>
          <LottieView
            ref={lottieRef}
            source={require('../../assets/Lottie/lottie/41qLNI7XMt.lottie')}
            autoPlay
            loop
            style={styles.fullLottie}
            resizeMode="contain"
          />
        </View>

        {/* Action & Verification Section */}
        <View style={styles.actionSection}>
          {/* Main Title */}
          <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>
            تأكيد تسجيل الدخول
          </Text>

          {/* Subtitle without any emojis */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            اسحب المؤشر أدناه لتأكيد الهوية والمتابعة إلى {appName}
          </Text>

          {/* Error Banner with back button to edit credentials if failed */}
          {errorMessage ? (
            <View style={[styles.errorBox, { backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2', borderColor: '#ef4444' }]}>
              <View style={styles.errorContentRow}>
                <Ionicons name="alert-circle" size={17} color="#ef4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
              {onBack ? (
                <TouchableOpacity onPress={onBack} style={styles.errorBackBtn} activeOpacity={0.7}>
                  <Text style={[styles.errorBackBtnText, { color: colors.primary }]}>تعديل البيانات</Text>
                  <Ionicons name="arrow-back" size={13} color={colors.primary} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Slider Verification Track */}
          <View style={styles.sliderSection}>
            <View
              style={[
                styles.track,
                {
                  width: TRACK_WIDTH,
                  backgroundColor: verified
                    ? '#10b98120'
                    : isDarkMode
                    ? '#0f172a'
                    : '#f1f5f9',
                  borderColor: verified ? '#10b981' : colors.border,
                },
              ]}
            >
              {/* Progress fill */}
              <Animated.View
                style={[
                  styles.trackFill,
                  {
                    width: slideAnim.interpolate({
                      inputRange: [0, MAX_SLIDE],
                      outputRange: [KNOB_SIZE, TRACK_WIDTH],
                      extrapolate: 'clamp',
                    }),
                    backgroundColor: verified ? '#10b98125' : `${colors.primary}25`,
                  },
                ]}
              />

              {/* Slider track label without emojis */}
              <Text
                style={[
                  styles.trackLabel,
                  {
                    color: verified
                      ? '#059669'
                      : isDarkMode
                      ? '#94a3b8'
                      : '#64748b',
                  },
                ]}
                numberOfLines={1}
              >
                {verifying
                  ? 'جاري التحقق وتسجيل الدخول...'
                  : verified
                  ? 'تم التحقق بنجاح'
                  : 'اسحب المؤشر لتسجيل الدخول'}
              </Text>

              {/* Draggable Knob */}
              <Animated.View
                {...panResponder.panHandlers}
                style={[
                  styles.knob,
                  {
                    transform: [{ translateX: slideAnim }],
                    backgroundColor: verified ? '#10b981' : colors.primary,
                    shadowColor: verified ? '#10b981' : colors.primary,
                  },
                ]}
              >
                {verifying ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Ionicons
                    name={verified ? 'checkmark' : 'arrow-forward'}
                    size={24}
                    color="#ffffff"
                  />
                )}
              </Animated.View>
            </View>
          </View>
        </View>

        {/* Security Trust Note at the very bottom */}
        <View style={styles.trustFooter}>
          <Ionicons name="lock-closed" size={13} color={colors.textSecondary} />
          <Text style={[styles.trustText, { color: colors.textSecondary }]}>
            نظام حماية أمني مشفر ومحمي ضد برامج التخمين الآلية
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  animationSection: {
    width: '100%',
    height: ANIMATION_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
  },
  fullLottie: {
    width: '94%',
    height: '94%',
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 'auto',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 20,
  },
  errorBox: {
    width: TRACK_WIDTH,
    flexDirection: 'column',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 14,
    gap: 6,
  },
  errorContentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  errorBackBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingTop: 4,
  },
  errorBackBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sliderSection: {
    marginTop: 4,
    marginBottom: 10,
  },
  track: {
    height: KNOB_SIZE + 8,
    borderRadius: (KNOB_SIZE + 8) / 2,
    borderWidth: 1.5,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: (KNOB_SIZE + 8) / 2,
  },
  trackLabel: {
    position: 'absolute',
    left: KNOB_SIZE + 10,
    right: 14,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 5,
  },
  trustFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 20,
    paddingTop: 8,
    width: '100%',
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
