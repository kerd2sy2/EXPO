import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

const LOCALIZED_QUESTIONS: Record<string, (plate: string) => string> = {
  ar: (plate: string) => `هل أنت تستخدم دبابك رقم ${plate}؟`,
  en: (plate: string) => `Are you using your motorcycle number ${plate}?`,
  ur: (plate: string) => `کیا آپ اپنی موٹرسائیکل نمبر ${plate} استعمال کر رہے ہیں؟`,
  bn: (plate: string) => `আপনি কি আপনার বাইক নম্বর ${plate} ব্যবহার করছেন?`,
};

export interface AssignedBikeBottomSheetProps {
  visible: boolean;
  assignedPlate: string;
  sheetAnim: Animated.Value;
  onConfirm: () => void;
  onClose: () => void;
  isDark?: boolean;
  isBusy?: boolean;
  lang?: string;
  t?: any;
  isRTL?: boolean;
}

export const AssignedBikeBottomSheet: React.FC<AssignedBikeBottomSheetProps> = ({
  visible,
  assignedPlate,
  sheetAnim,
  onConfirm,
  onClose,
  isDark = true,
  isBusy = false,
  lang = 'ar',
  t,
  isRTL,
}) => {
  if (!visible) return null;

  const currentLang = (lang && LOCALIZED_QUESTIONS[lang]) ? lang : 'ar';
  const transFn = LOCALIZED_QUESTIONS[currentLang];

  // السؤال بالعربي ومترجم تحته إذا كانت لغة المندوب غير العربية
  const arabicQuestion = `هل أنت تستخدم دبابك رقم ${assignedPlate}؟`;
  const translatedQuestion = currentLang !== 'ar' ? transFn(assignedPlate) : '';

  // الخيارات (أزرار القرار) دائماً بالعربي بناءً على طلب الإدارة
  const yesText = 'نعم، استخدام هذا الدباب';
  const noText = 'لا، مسح دباب آخر بالماسح';

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableWithoutFeedback onPress={onClose} disabled={isBusy}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.72)',
              opacity: sheetAnim,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            transform: [
              {
                translateY: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [500, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Top Handle Pill */}
        <View style={[styles.sheetPill, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]} />

        {/* Lottie Motorcycle Animation */}
        <View style={styles.lottieContainer}>
          <LottieView
            source={require('../../../../assets/Lottie/lottie/m8NEtAYYYJ.lottie')}
            autoPlay
            loop
            style={styles.lottieAnim}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={[styles.sheetTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
          تأكيد استخدام الدباب
        </Text>

        {/* Main Question (Arabic) */}
        <Text style={[styles.sheetQuestion, { color: isDark ? '#f8fafc' : '#1e293b' }]}>
          {arabicQuestion}
        </Text>

        {/* Secondary Subtitle Translation if courier has another language */}
        {translatedQuestion !== '' && (
          <Text style={[styles.sheetSubQuestion, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {translatedQuestion}
          </Text>
        )}

        {/* Plate Highlight Badge */}
        <View style={styles.plateHighlightBadge}>
          <Ionicons name="bicycle" size={24} color="#f97316" style={{ marginHorizontal: 8 }} />
          <Text style={styles.plateHighlightText}>{assignedPlate}</Text>
        </View>

        {/* Action Buttons (الخيارات بالعربي دائماً) */}
        <View style={styles.actionsRow}>
          {/* YES Button: Confirms using assigned motorcycle */}
          <TouchableOpacity
            style={[styles.confirmBtn, isBusy && { opacity: 0.7 }]}
            onPress={onConfirm}
            activeOpacity={0.85}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#ffffff" style={{ marginHorizontal: 6 }} />
                <Text style={styles.confirmBtnText}>{yesText}</Text>
              </>
            )}
          </TouchableOpacity>

          {/* NO Button: Closes modal and lets courier scan other bike with camera */}
          <TouchableOpacity
            style={[
              styles.cancelBtn,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9' },
            ]}
            onPress={onClose}
            activeOpacity={0.7}
            disabled={isBusy}
          >
            <Ionicons name="scan-outline" size={19} color={isDark ? '#cbd5e1' : '#475569'} style={{ marginHorizontal: 6 }} />
            <Text style={[styles.cancelBtnText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
              {noText}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderTopWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 25,
  },
  sheetPill: {
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  lottieContainer: {
    width: 125,
    height: 125,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  lottieAnim: {
    width: 125,
    height: 125,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    opacity: 0.85,
  },
  sheetQuestion: {
    fontSize: 17.5,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 8,
    lineHeight: 25,
  },
  sheetSubQuestion: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  plateHighlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderWidth: 1.5,
    borderColor: '#f97316',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 16,
    marginTop: 4,
  },
  plateHighlightText: {
    color: '#f97316',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  actionsRow: {
    width: '100%',
    gap: 10,
  },
  confirmBtn: {
    backgroundColor: '#f97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '800',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
});
