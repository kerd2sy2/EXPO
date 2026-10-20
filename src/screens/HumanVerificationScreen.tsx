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
  onBack: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_WIDTH = Math.min(SCREEN_WIDTH - 64, 320);
const KNOB_SIZE = 52;
const MAX_SLIDE = TRACK_WIDTH - KNOB_SIZE - 8;

export const HumanVerificationScreen: React.FC<HumanVerificationScreenProps> = ({
  colors,
  isDarkMode,
  appName,
  isRTL = true,
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
      duration: 300,
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
      // Execute the actual login request while staying on this screen!
      await onVerify();
    } catch (err: any) {
      console.error('Verification/Login error on screen:', err);
      const msg = err?.message || 'فشل تسجيل الدخول، يرجى المحاولة مرة أخرى';
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
        if (gesture.dx >= MAX_SLIDE * 0.78) {
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

      {/* Header with Back button */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
          onPress={onBack}
          disabled={verifying}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isRTL ? 'arrow-forward' : 'arrow-back'}
            size={20}
            color={colors.textPrimary}
          />
          <Text style={[styles.backText, { color: colors.textPrimary }]}>رجوع</Text>
        </TouchableOpacity>

        <View style={[styles.headerBadge, { backgroundColor: `${colors.primary}18` }]}>
          <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
          <Text style={[styles.headerBadgeText, { color: colors.primary }]}>
            التحقق الأمني
          </Text>
        </View>
      </View>

      {/* Main Content Area */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeAnim }]}>
        {/* Lottie Animation Display */}
        <View style={[styles.lottieCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.lottieGlow, { backgroundColor: `${colors.primary}15` }]}>
            <LottieView
              ref={lottieRef}
              source={require('../../assets/Lottie/lottie/41qLNI7XMt.lottie')}
              autoPlay
              loop
              style={styles.lottieAnimation}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Titles & Descriptions */}
        <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>
          تأكيد تسجيل الدخول
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          يرجى إكمال السحب أدناه لتأكيد هويتك كإنسان وتسجيل الدخول إلى {appName}
        </Text>

        {/* Error Banner if login fails */}
        {errorMessage ? (
          <View style={[styles.errorBox, { backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2', borderColor: '#ef4444' }]}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
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

            {/* Slider track label */}
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
                ? 'تم التحقق بنجاح ✓'
                : 'اسحب المؤشر لليمين لتسجيل الدخول 👉'}
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

        {/* Security Trust Note */}
        <View style={styles.trustFooter}>
          <Ionicons name="lock-closed" size={14} color={colors.textSecondary} />
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
  headerRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  headerBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  lottieCard: {
    borderRadius: 32,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  lottieGlow: {
    width: 150,
    height: 150,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieAnimation: {
    width: 140,
    height: 140,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
    marginBottom: 24,
  },
  errorBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: 320,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  sliderSection: {
    marginVertical: 12,
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
    gap: 6,
    marginTop: 28,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
