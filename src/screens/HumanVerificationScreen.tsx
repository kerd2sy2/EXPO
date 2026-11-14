import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated, PanResponder, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, Language } from '../types/delegate';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import {
  VerificationLanguage,
  verificationTranslations,
  getLocalizedAppName,
} from './human-verification/humanVerificationI18n';
import {
  HV_TRACK_WIDTH,
  HV_KNOB_SIZE,
  HV_MAX_SLIDE,
  humanVerificationStyles as styles,
} from './human-verification/humanVerificationStyles';

export type { VerificationLanguage };
export { verificationTranslations, getLocalizedAppName };

export interface HumanVerificationScreenProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  appName: string;
  isRTL?: boolean;
  lang?: Language | VerificationLanguage | string;
  onSetLang?: (lang: any) => void;
  onVerify: () => Promise<void>;
  onBack?: () => void;
}

export const HumanVerificationScreen: React.FC<HumanVerificationScreenProps> = ({
  colors,
  isDarkMode,
  appName,
  lang: propLang,
  onVerify,
}) => {
  const [currentLang, setCurrentLang] = useState<VerificationLanguage>(
    (propLang as VerificationLanguage) || 'ar'
  );
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (propLang && ['ar', 'en', 'ur', 'bn'].includes(propLang as string)) {
      setCurrentLang(propLang as VerificationLanguage);
    }
  }, [propLang]);

  useEffect(() => {
    if (!propLang) {
      (async () => {
        try {
          const stored =
            (await AsyncStorage.getItem('@aams_app_language')) ||
            (await AsyncStorage.getItem('aams_app_language'));
          if (stored && ['ar', 'en', 'ur', 'bn'].includes(stored)) {
            setCurrentLang(stored as VerificationLanguage);
          }
        } catch {}
      })();
    }
  }, [propLang]);

  const isRTL = currentLang === 'ar' || currentLang === 'ur';
  const t = verificationTranslations[currentLang] || verificationTranslations.ar;
  const localizedAppName = getLocalizedAppName(appName, currentLang);

  const isProcessingRef = useRef(false);
  const isVerifiedRef = useRef(false);
  const isMountedRef = useRef(true);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef<any>(null);

  useEffect(() => {
    isMountedRef.current = true;
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    if (lottieRef.current) {
      lottieRef.current.play?.();
    }

    return () => {
      isMountedRef.current = false;
      slideAnim.stopAnimation();
    };
  }, [fadeAnim, slideAnim]);

  const handleSlideComplete = async () => {
    if (isProcessingRef.current || isVerifiedRef.current) return;
    isProcessingRef.current = true;
    isVerifiedRef.current = true;

    setVerified(true);
    setVerifying(true);
    setErrorMessage(null);

    slideAnim.stopAnimation();
    Animated.timing(slideAnim, {
      toValue: HV_MAX_SLIDE,
      duration: 120,
      useNativeDriver: false,
    }).start();

    try {
      await Promise.race([
        onVerify(),
        new Promise((_, reject) => setTimeout(() => reject(new Error(t.timeoutError)), 20000)),
      ]);

      setTimeout(() => {
        if (isMountedRef.current && isProcessingRef.current) {
          isProcessingRef.current = false;
          isVerifiedRef.current = false;
          setVerified(false);
          setVerifying(false);
          slideAnim.stopAnimation();
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: false,
          }).start();
        }
      }, 1500);
    } catch (err: any) {
      console.error('Verification/Login error on screen:', err);
      const rawMsg = String(err?.message || '');
      let msg = t.genericError;
      if (rawMsg.includes(t.timeoutError) || rawMsg.toLowerCase().includes('timeout')) {
        msg = t.timeoutError;
      } else if (
        rawMsg.includes('صلاحية') ||
        rawMsg.includes('مخصص') ||
        rawMsg.toLowerCase().includes('permission') ||
        rawMsg.toLowerCase().includes('access')
      ) {
        msg = t.permissionError;
      } else if (rawMsg) {
        msg = rawMsg;
      }
      if (isMountedRef.current) {
        setErrorMessage(msg);
      }

      slideAnim.stopAnimation();
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 40,
        useNativeDriver: false,
      }).start(() => {
        isProcessingRef.current = false;
        isVerifiedRef.current = false;
        if (isMountedRef.current) {
          setVerified(false);
          setVerifying(false);
        }
      });
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isProcessingRef.current && !isVerifiedRef.current,
      onMoveShouldSetPanResponder: (_, gesture) =>
        !isProcessingRef.current && !isVerifiedRef.current && Math.abs(gesture.dx) > 4,
      onPanResponderGrant: () => {
        slideAnim.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        if (isProcessingRef.current || isVerifiedRef.current) return;
        const clampedX = Math.max(0, Math.min(gesture.dx, HV_MAX_SLIDE));
        slideAnim.setValue(clampedX);
      },
      onPanResponderRelease: (_, gesture) => {
        if (isProcessingRef.current || isVerifiedRef.current) return;
        if (gesture.dx >= HV_MAX_SLIDE * 0.75) {
          handleSlideComplete();
        } else {
          slideAnim.stopAnimation();
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 7,
            tension: 40,
            useNativeDriver: false,
          }).start();
        }
      },
      onPanResponderTerminationRequest: () => !isProcessingRef.current,
      onPanResponderTerminate: () => {
        if (isProcessingRef.current || isVerifiedRef.current) return;
        slideAnim.stopAnimation();
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 7,
          tension: 40,
          useNativeDriver: false,
        }).start();
      },
    })
  ).current;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <ModuleErrorBoundary moduleName="شعار التحقق" colors={colors}>
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
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="مؤشر التحقق البشري" colors={colors}>
          <View style={styles.actionSection}>
            <Text style={[styles.mainTitle, { color: colors.textPrimary }]}>{t.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t.subtitle(localizedAppName)}
            </Text>

            {errorMessage ? (
              <View
                style={[
                  styles.errorBox,
                  {
                    backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2',
                    borderColor: '#ef4444',
                  },
                ]}
              >
                <View
                  style={[styles.errorContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  <Ionicons name="alert-circle" size={17} color="#ef4444" />
                  <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                    {errorMessage}
                  </Text>
                </View>
              </View>
            ) : null}

            <View style={styles.sliderSection}>
              <View
                pointerEvents={verifying || verified ? 'none' : 'auto'}
                style={[
                  styles.track,
                  {
                    width: HV_TRACK_WIDTH,
                    backgroundColor: verified
                      ? '#10b98120'
                      : isDarkMode
                      ? '#0f172a'
                      : '#f1f5f9',
                    borderColor: verified ? '#10b981' : colors.border,
                  },
                ]}
              >
                <Animated.View
                  style={[
                    styles.trackFill,
                    {
                      width: slideAnim.interpolate({
                        inputRange: [0, HV_MAX_SLIDE],
                        outputRange: [HV_KNOB_SIZE, HV_TRACK_WIDTH],
                        extrapolate: 'clamp',
                      }),
                      backgroundColor: verified ? '#10b98125' : `${colors.primary}25`,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.trackLabel,
                    {
                      color: verified ? '#059669' : isDarkMode ? '#94a3b8' : '#64748b',
                    },
                  ]}
                  numberOfLines={1}
                >
                  {verifying ? t.verifying : verified ? t.verified : t.slideAction}
                </Text>

                <Animated.View
                  {...(verifying || verified ? {} : panResponder.panHandlers)}
                  pointerEvents={verifying || verified ? 'none' : 'auto'}
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
        </ModuleErrorBoundary>

        <View style={[styles.trustFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="lock-closed" size={13} color={colors.textSecondary} />
          <Text style={[styles.trustText, { color: colors.textSecondary }]}>
            {t.trustFooter}
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};
