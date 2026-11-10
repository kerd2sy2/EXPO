import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, Language } from '../../types/delegate';

export type VerificationLanguage = 'ar' | 'en' | 'ur' | 'bn';

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

const modalTranslations: Record<
  VerificationLanguage,
  {
    badge: string;
    title: string;
    subtitle: (appName: string) => string;
    slideAction: string;
    verified: string;
    footerNote: string;
  }
> = {
  ar: {
    badge: 'حماية أمنية ذكية',
    title: 'تأكيد أمان تسجيل الدخول',
    subtitle: (appName: string) => `يرجى سحب المؤشر لتأكيد هويتك وحماية ${appName} من الوصول المؤتمت`,
    slideAction: 'اسحب المؤشر لليمين للتحقق 👉',
    verified: 'تم التحقق بنجاح ✓',
    footerNote: 'اتصال مشفر ومحمي بواسطة جدار الحماية',
  },
  en: {
    badge: 'Smart Security Shield',
    title: 'Confirm Login Security',
    subtitle: (appName: string) => `Please slide to confirm your identity and protect ${appName} from bots`,
    slideAction: 'Slide to verify 👉',
    verified: 'Verified successfully ✓',
    footerNote: 'Encrypted connection protected by firewall',
  },
  ur: {
    badge: 'سمارٹ سیکیورٹی شیلڈ',
    title: 'لاگ ان سیکیورٹی کی تصدیق',
    subtitle: (appName: string) => `براہ کرم اپنی شناخت کی تصدیق اور ${appName} کو خودکار بوٹس سے بچانے کیلئے سلائیڈ کریں`,
    slideAction: 'تصدیق کے لیے سلائیڈ کریں 👉',
    verified: 'کامیابی سے تصدیق ہو گئی ✓',
    footerNote: 'فائر وال کے ذریعے محفوظ اور انکرپٹڈ کنکشن',
  },
  bn: {
    badge: 'স্মার্ট নিরাপত্তা সুরক্ষা',
    title: 'লগইন নিরাপত্তা নিশ্চিত করুন',
    subtitle: (appName: string) => `আপনার পরিচয় নিশ্চিত করতে এবং ${appName}-কে বট থেকে রক্ষা করতে স্লাইড করুন`,
    slideAction: 'যাচাই করতে স্লাইড করুন 👉',
    verified: 'সফলভাবে যাচাই করা হয়েছে ✓',
    footerNote: 'ফায়ারওয়াল দ্বারা সুরক্ষিত এনক্রিপ্ট করা সংযোগ',
  },
};

const getLocalizedAppName = (rawName: string, lang: VerificationLanguage): string => {
  const normalized = (rawName || '').trim().toLowerCase();
  if (normalized.includes('إشراف') || normalized.includes('اشراف') || normalized.includes('supervis')) {
    switch (lang) {
      case 'en': return 'Supervision';
      case 'ur': return 'نگرانی';
      case 'bn': return 'তত্ত্বাবধান';
      default: return 'الإشراف';
    }
  }
  if (normalized.includes('مناديب') || normalized.includes('مندوب') || normalized.includes('delegat')) {
    switch (lang) {
      case 'en': return 'Delegates';
      case 'ur': return 'ڈیلیگیٹس';
      case 'bn': return 'প্রতিনিধিরা';
      default: return 'المناديب';
    }
  }
  if (normalized.includes('عهدة') || normalized.includes('عهده') || normalized.includes('custody') || normalized.includes('ahda')) {
    switch (lang) {
      case 'en': return 'Custody';
      case 'ur': return 'تحویل';
      case 'bn': return 'হেফাজত';
      default: return 'العهدة';
    }
  }
  if (normalized.includes('إدارة') || normalized.includes('ادارة') || normalized.includes('manag') || normalized.includes('admin')) {
    switch (lang) {
      case 'en': return 'Management';
      case 'ur': return 'انتظامیہ';
      case 'bn': return 'প্রশাসন';
      default: return 'الإدارة';
    }
  }
  return rawName;
};

const TRACK_WIDTH = 270;
const KNOB_SIZE = 48;
const MAX_SLIDE = TRACK_WIDTH - KNOB_SIZE - 8;

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

  // Sync propLang if passed
  useEffect(() => {
    if (propLang && ['ar', 'en', 'ur', 'bn'].includes(propLang as string)) {
      setCurrentLang(propLang as VerificationLanguage);
    }
  }, [propLang]);

  // Load language from storage if not explicitly provided as prop
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

  // Reset state on open
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

  // Mutable refs to prevent stale closures and block multi-triggers / freeze
  const isProcessingRef = useRef(false);
  const isVerifiedRef = useRef(false);
  const isMountedRef = useRef(true);

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
      onMoveShouldSetPanResponder: (_, gesture) => {
        return !isProcessingRef.current && !isVerifiedRef.current && Math.abs(gesture.dx) > 4;
      },
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
          {/* Close button */}
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
          <View
            pointerEvents={verified ? 'none' : 'auto'}
            style={[
              styles.track,
              {
                backgroundColor: verified
                  ? '#10b98120'
                  : isDarkMode
                  ? '#0f172a'
                  : '#f1f5f9',
                borderColor: verified ? '#10b981' : colors.border,
              },
            ]}
          >
            {/* Track background progress fill */}
            <Animated.View
              style={[
                styles.trackFill,
                {
                  width: slideAnim.interpolate({
                    inputRange: [0, MAX_SLIDE],
                    outputRange: [KNOB_SIZE, TRACK_WIDTH],
                    extrapolate: 'clamp',
                  }),
                  backgroundColor: verified ? '#10b98125' : `${colors.primary}20`,
                },
              ]}
            />

            {/* Slider track label */}
            <Text
              style={[
                styles.trackText,
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
              {verified ? t.verified : t.slideAction}
            </Text>

            {/* Draggable Knob */}
            <Animated.View
              {...(verified ? {} : panResponder.panHandlers)}
              pointerEvents={verified ? 'none' : 'auto'}
              style={[
                styles.knob,
                {
                  transform: [{ translateX: slideAnim }],
                  backgroundColor: verified ? '#10b981' : colors.primary,
                  shadowColor: verified ? '#10b981' : colors.primary,
                },
              ]}
            >
              <Ionicons
                name={verified ? 'checkmark' : 'arrow-forward'}
                size={22}
                color="#ffffff"
              />
            </Animated.View>
          </View>

          {/* Security note */}
          <View style={[styles.footerNote, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="lock-closed-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t.footerNote}
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1.5,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 10,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lottieWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    overflow: 'hidden',
  },
  lottieAnim: {
    width: 100,
    height: 100,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  track: {
    width: TRACK_WIDTH,
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
  trackText: {
    position: 'absolute',
    left: KNOB_SIZE + 10,
    right: 12,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 5,
  },
  footerNote: {
    alignItems: 'center',
    gap: 5,
    marginTop: 18,
  },
  footerText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
});
