import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColors, Language } from '../types/delegate';

export type VerificationLanguage = 'ar' | 'en' | 'ur' | 'bn';

export interface HumanVerificationScreenProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  appName: string;
  isRTL?: boolean;
  lang?: Language | VerificationLanguage;
  onSetLang?: (lang: Language | VerificationLanguage) => void;
  onVerify: () => Promise<void>;
  onBack?: () => void;
}

export const verificationTranslations: Record<
  VerificationLanguage,
  {
    title: string;
    subtitle: (appName: string) => string;
    slideAction: string;
    verifying: string;
    verified: string;
    trustFooter: string;
    editCredentials: string;
    timeoutError: string;
    genericError: string;
    permissionError: string;
    back: string;
    selectLanguage: string;
    cancel: string;
  }
> = {
  ar: {
    title: 'التأكد أنك إنسان',
    subtitle: (appName: string) => `اسحب المؤشر أدناه لإثبات هويتك والمتابعة إلى ${appName}`,
    slideAction: 'اسحب المؤشر للمتابعة',
    verifying: 'جاري التحقق وتسجيل الدخول...',
    verified: 'تم التحقق بنجاح',
    trustFooter: 'نظام حماية أمني مشفر ومحمي ضد برامج التخمين الآلية',
    editCredentials: 'تعديل البيانات',
    timeoutError: 'انتهت مهلة الاتصال بالخادم، يرجى المحاولة مجدداً',
    genericError: 'فشل تسجيل الدخول، يرجى التأكد من صحة البيانات',
    permissionError: 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة',
    back: 'رجوع',
    selectLanguage: 'اختر اللغة',
    cancel: 'إلغاء',
  },
  en: {
    title: 'Human Verification',
    subtitle: (appName: string) => `Slide the slider below to verify you are human and proceed to ${appName}`,
    slideAction: 'Slide to verify',
    verifying: 'Verifying and signing in...',
    verified: 'Verified successfully',
    trustFooter: 'Encrypted security system protected against automated bots',
    editCredentials: 'Edit Credentials',
    timeoutError: 'Server connection timed out, please try again',
    genericError: 'Sign in failed, please check your credentials',
    permissionError: 'You do not have access permission for this app, please contact administration',
    back: 'Back',
    selectLanguage: 'Select Language',
    cancel: 'Cancel',
  },
  ur: {
    title: 'انسانی تصدیق',
    subtitle: (appName: string) => `اپنی شناخت کی تصدیق اور ${appName} پر جاری رکھنے کے لیے سلائیڈر کو سلائیڈ کریں`,
    slideAction: 'جاری رکھنے کے لیے سلائیڈ کریں',
    verifying: 'تصدیق اور لاگ ان ہو رہا ہے...',
    verified: 'کامیابی سے تصدیق ہو گئی',
    trustFooter: 'خودکار بوٹس کے خلاف محفوظ اور انکرپٹڈ سیکیورٹی سسٹم',
    editCredentials: 'معلومات تبدیل کریں',
    timeoutError: 'سرور کنکشن کا وقت ختم ہو گیا، براہ کرم دوبارہ کوشش کریں',
    genericError: 'لاگ ان ناکام رہا، براہ کرم معلومات کی درستگی چیک کریں',
    permissionError: 'آپ کے پاس اس ایپ تک رسائی کی اجازت نہیں ہے، براہ کرم انتظامیہ سے رابطہ کریں',
    back: 'واپس',
    selectLanguage: 'زبان منتخب کریں',
    cancel: 'منسوخ کریں',
  },
  bn: {
    title: 'মানুষ যাচাইকরণ',
    subtitle: (appName: string) => `আপনি মানুষ তা নিশ্চিত করতে এবং ${appName}-এ প্রবেশ করতে নিচের স্লাইডারটি টানুন`,
    slideAction: 'এগিয়ে যেতে স্লাইড করুন',
    verifying: 'যাচাই এবং সাইন ইন করা হচ্ছে...',
    verified: 'সফলভাবে যাচাই করা হয়েছে',
    trustFooter: 'স্বয়ংক্রিয় বট থেকে সুরক্ষিত এনক্রিপ্ট করা নিরাপত্তা ব্যবস্থা',
    editCredentials: 'তথ্য পরিবর্তন করুন',
    timeoutError: 'সার্ভার সংযোগের সময় শেষ, অনুগ্রহ করে আবার চেষ্টা করুন',
    genericError: 'সাইন ইন ব্যর্থ হয়েছে, অনুগ্রহ করে তথ্য সঠিক কিনা পরীক্ষা করুন',
    permissionError: 'আপনার এই অ্যাপে প্রবেশের অনুমতি নেই, অনুগ্রহ করে প্রশাসনের সাথে যোগাযোগ করুন',
    back: 'ফিরে যান',
    selectLanguage: 'ভাষা নির্বাচন করুন',
    cancel: 'বাতিল',
  },
};

export const getLocalizedAppName = (rawName: string, lang: VerificationLanguage): string => {
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

const LANGUAGES_LIST: { code: VerificationLanguage; name: string; nativeName: string; flag: string }[] = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', flag: '🇵🇰' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇧🇩' },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TRACK_WIDTH = Math.min(SCREEN_WIDTH - 48, 330);
const KNOB_SIZE = 50;
const MAX_SLIDE = TRACK_WIDTH - KNOB_SIZE - 8;

export const HumanVerificationScreen: React.FC<HumanVerificationScreenProps> = ({
  colors,
  isDarkMode,
  appName,
  isRTL: propIsRTL,
  lang: propLang,
  onSetLang,
  onVerify,
  onBack,
}) => {
  const [currentLang, setCurrentLang] = useState<VerificationLanguage>(
    (propLang as VerificationLanguage) || (propIsRTL ? 'ar' : 'ar')
  );
  const [showLangModal, setShowLangModal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync propLang if it changes externally
  useEffect(() => {
    if (propLang && ['ar', 'en', 'ur', 'bn'].includes(propLang)) {
      setCurrentLang(propLang as VerificationLanguage);
    }
  }, [propLang]);

  // Load language from storage if not explicitly provided as prop
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
        } catch (_) {}
      })();
    }
  }, [propLang]);

  const isRTL = currentLang === 'ar' || currentLang === 'ur';
  const t = verificationTranslations[currentLang] || verificationTranslations.ar;
  const localizedAppName = getLocalizedAppName(appName, currentLang);
  const currentLangItem = useMemo(
    () => LANGUAGES_LIST.find((l) => l.code === currentLang) || LANGUAGES_LIST[0],
    [currentLang]
  );

  const handleSelectLanguage = async (newLang: VerificationLanguage) => {
    setCurrentLang(newLang);
    setShowLangModal(false);
    onSetLang?.(newLang as any);
    try {
      await AsyncStorage.setItem('@aams_app_language', newLang);
      await AsyncStorage.setItem('aams_app_language', newLang);
    } catch (_) {}
  };

  // Mutable refs to prevent stale closures and block multi-triggers / freeze
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
  }, []);

  const handleSlideComplete = async () => {
    if (isProcessingRef.current || isVerifiedRef.current) return;
    isProcessingRef.current = true;
    isVerifiedRef.current = true;

    setVerified(true);
    setVerifying(true);
    setErrorMessage(null);

    // Stop any in-flight animations and lock slider at the end
    slideAnim.stopAnimation();
    Animated.timing(slideAnim, {
      toValue: MAX_SLIDE,
      duration: 120,
      useNativeDriver: false,
    }).start();

    try {
      // Execute the actual login request with a 20s timeout safeguard
      await Promise.race([
        onVerify(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(t.timeoutError)), 20000)
        ),
      ]);

      // Defensive fallback: If onVerify resolved without error but screen did not transition within 1.5s,
      // reset slider so UI never remains permanently frozen
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
      // Reset slider smoothly and unlock only after animation completes
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
        if (gesture.dx >= MAX_SLIDE * 0.75) {
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
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Top Header Bar: Back & Language Switcher */}
      <View style={[styles.topNavRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[
              styles.navBtn,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={16}
              color={colors.textPrimary}
            />
            <Text style={[styles.navBtnText, { color: colors.textPrimary }]}>
              {t.back}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}

        {/* Language Switcher Pill */}
        <TouchableOpacity
          onPress={() => setShowLangModal(true)}
          style={[
            styles.langPill,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="globe-outline" size={15} color={colors.primary} />
          <Text style={[styles.langPillText, { color: colors.textPrimary }]}>
            {currentLangItem?.flag} {currentLangItem?.nativeName}
          </Text>
          <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Upper Section: Lottie Animation */}
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
            {t.title}
          </Text>

          {/* Subtitle */}
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t.subtitle(localizedAppName)}
          </Text>

          {/* Error Banner with back button to edit credentials if failed */}
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
              <View style={[styles.errorContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="alert-circle" size={17} color="#ef4444" />
                <Text style={[styles.errorText, { textAlign: isRTL ? 'right' : 'left' }]}>
                  {errorMessage}
                </Text>
              </View>
              {onBack ? (
                <TouchableOpacity
                  onPress={onBack}
                  style={[styles.errorBackBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.errorBackBtnText, { color: colors.primary }]}>
                    {t.editCredentials}
                  </Text>
                  <Ionicons
                    name={isRTL ? 'arrow-forward' : 'arrow-back'}
                    size={13}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Slider Verification Track */}
          <View style={styles.sliderSection}>
            <View
              pointerEvents={verifying || verified ? 'none' : 'auto'}
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
                {verifying ? t.verifying : verified ? t.verified : t.slideAction}
              </Text>

              {/* Draggable Knob */}
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

        {/* Security Trust Note at the very bottom */}
        <View style={[styles.trustFooter, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="lock-closed" size={13} color={colors.textSecondary} />
          <Text style={[styles.trustText, { color: colors.textSecondary }]}>
            {t.trustFooter}
          </Text>
        </View>
      </Animated.View>

      {/* Language Selection Bottom Sheet Modal */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowLangModal(false)}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {t.selectLanguage}
              </Text>
              <TouchableOpacity
                onPress={() => setShowLangModal(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.langList}>
              {LANGUAGES_LIST.map((langItem) => {
                const isSelected = currentLang === langItem.code;
                return (
                  <TouchableOpacity
                    key={langItem.code}
                    onPress={() => handleSelectLanguage(langItem.code)}
                    style={[
                      styles.langOptionBtn,
                      {
                        backgroundColor: isSelected
                          ? `${colors.primary}15`
                          : isDarkMode
                          ? '#0f172a'
                          : '#f8fafc',
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.langOptionLeft}>
                      <Text style={styles.langFlag}>{langItem.flag}</Text>
                      <View>
                        <Text
                          style={[
                            styles.langNativeText,
                            {
                              color: isSelected ? colors.primary : colors.textPrimary,
                              fontWeight: isSelected ? '700' : '600',
                            },
                          ]}
                        >
                          {langItem.nativeName}
                        </Text>
                        <Text style={[styles.langSubText, { color: colors.textSecondary }]}>
                          {langItem.name}
                        </Text>
                      </View>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={() => setShowLangModal(false)}
              style={[
                styles.modalCancelBtn,
                { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' },
              ]}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: colors.textPrimary }]}>
                {t.cancel}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topNavRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  langPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  langPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  animationSection: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullLottie: {
    width: '100%',
    height: '100%',
    maxHeight: 340,
  },
  actionSection: {
    width: '100%',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    fontWeight: '500',
  },
  errorBox: {
    width: '100%',
    maxWidth: TRACK_WIDTH,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorContentRow: {
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  errorBackBtn: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#fca5a550',
  },
  errorBackBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sliderSection: {
    alignItems: 'center',
    width: '100%',
  },
  track: {
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 29,
  },
  trackLabel: {
    fontSize: 13,
    fontWeight: '700',
    zIndex: 1,
  },
  knob: {
    position: 'absolute',
    left: 4,
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: KNOB_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 2,
  },
  trustFooter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 12,
  },
  trustText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  langList: {
    gap: 10,
    marginBottom: 16,
  },
  langOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  langOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langFlag: {
    fontSize: 24,
  },
  langNativeText: {
    fontSize: 15,
  },
  langSubText: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCancelBtn: {
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
