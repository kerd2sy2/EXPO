import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, Language } from '../../types/delegate';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import {
  VerificationLanguage,
  modalTranslations,
  getLocalizedAppName,
  MAX_SLIDE,
} from './human-verification/humanVerificationHelpers';
import { humanVerificationStyles as styles } from './human-verification/humanVerificationStyles';
import { SlideToVerifyTrack } from './human-verification/SlideToVerifyTrack';

export type { VerificationLanguage };

export interface HumanVerificationModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL?: boolean;
  lang?: Language | VerificationLanguage | string;
  appName?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Interactive human verification modal using slide-to-verify gesture.
 */
export const HumanVerificationModal: React.FC<HumanVerificationModalProps> = ({
  visible,
  colors,
  isDarkMode,
  isRTL: propIsRTL,
  lang: propLang,
  appName = 'العهدة',
  onSuccess,
  onCancel,
}) => {
  const [currentLang, setCurrentLang] = useState<VerificationLanguage>(
    (propLang as VerificationLanguage) || (propIsRTL ? 'ar' : 'ar')
  );
  const [verified, setVerified] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef<any>(null);

  // Mutable refs to prevent stale closures and block multi-triggers / freeze
  const isProcessingRef = useRef(false);
  const isVerifiedRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (propLang && ['ar', 'en', 'ur', 'bn'].includes(propLang as string)) {
      setCurrentLang(propLang as VerificationLanguage);
    }
  }, [propLang]);

  useEffect(() => {
    if (!propLang && visible) {
      (async () => {
        try {
          const stored =
            (await AsyncStorage.getItem('@aams_app_language')) ||
            (await AsyncStorage.getItem('aams_app_language'));
          if (stored && ['ar', 'en', 'ur', 'bn'].includes(stored)) {
            setCurrentLang(stored as VerificationLanguage);
          }
        } catch (_) {}
      })();
    }
  }, [propLang, visible]);

  const isRTL = currentLang === 'ar' || currentLang === 'ur';
  const t = modalTranslations[currentLang] || modalTranslations.ar;
  const localizedAppName = getLocalizedAppName(appName, currentLang);

  useEffect(() => {
    isMountedRef.current = true;
    if (visible) {
      isProcessingRef.current = false;
      isVerifiedRef.current = false;
      setVerified(false);
      slideAnim.stopAnimation();
      slideAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      if (lottieRef.current) {
        lottieRef.current.play?.();
      }
    } else {
      slideAnim.stopAnimation();
      slideAnim.setValue(0);
      isProcessingRef.current = false;
      isVerifiedRef.current = false;
      setVerified(false);
    }
    return () => {
      isMountedRef.current = false;
      slideAnim.stopAnimation();
    };
  }, [visible]);

  const handleSuccess = () => {
    if (isProcessingRef.current || isVerifiedRef.current) return;
    isProcessingRef.current = true;
    isVerifiedRef.current = true;

    setVerified(true);
    slideAnim.stopAnimation();
    Animated.timing(slideAnim, {
      toValue: MAX_SLIDE,
      duration: 120,
      useNativeDriver: false,
    }).start(() => {
      setTimeout(() => {
        if (isMountedRef.current) {
          onSuccess();
        }
      }, 350);
    });
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
        const clampedX = Math.max(0, Math.min(gesture.dx, MAX_SLIDE));
        slideAnim.setValue(clampedX);
      },
      onPanResponderRelease: (_, gesture) => {
        if (isProcessingRef.current || isVerifiedRef.current) return;
        if (gesture.dx >= MAX_SLIDE * 0.8) {
          handleSuccess();
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

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button kept outside error boundary so user can always cancel */}
          <TouchableOpacity
            style={[
              styles.closeBtn,
              {
                backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
                left: isRTL ? 14 : undefined,
                right: isRTL ? undefined : 14,
              },
            ]}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <ModuleErrorBoundary moduleName="HumanVerificationBody" colors={colors}>
            {/* Lottie Animation */}
            <View style={[styles.lottieWrapper, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}>
              <LottieView
                ref={lottieRef}
                source={require('../../../assets/Lottie/lottie/41qLNI7XMt.lottie')}
                autoPlay
                loop
                style={styles.lottieAnim}
                resizeMode="contain"
              />
            </View>

            {/* Security Badge & Title */}
            <View style={styles.titleContainer}>
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: `${colors.primary}18`,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>
                  {t.badge}
                </Text>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {t.title}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {t.subtitle(localizedAppName)}
              </Text>
            </View>

            {/* Slide to Verify Track */}
            <SlideToVerifyTrack
              verified={verified}
              slideAnim={slideAnim}
              panHandlers={panResponder.panHandlers}
              colors={colors}
              isDarkMode={isDarkMode}
              verifiedText={t.verified}
              slideActionText={t.slideAction}
            />

            {/* Security note */}
            <View style={[styles.footerNote, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="lock-closed-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                {t.footerNote}
              </Text>
            </View>
          </ModuleErrorBoundary>
        </Animated.View>
      </View>
    </Modal>
  );
};
