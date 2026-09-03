import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

export type UpdateModalState = 'CHECKING' | 'DOWNLOADING' | 'READY' | 'UP_TO_DATE' | 'ERROR';

interface AppUpdateBottomSheetProps {
  visible: boolean;
  state: UpdateModalState;
  errorMessage?: string;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onApplyUpdate: () => void;
  onCheckAgain: () => void;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AppUpdateBottomSheet: React.FC<AppUpdateBottomSheetProps> = ({
  visible,
  state,
  errorMessage,
  colors,
  isDarkMode,
  isRTL,
  onApplyUpdate,
  onCheckAgain,
  onClose,
}) => {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          bounciness: 4,
          speed: 13,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  // Pulse animation when update is ready
  useEffect(() => {
    if (state === 'READY') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [state]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.6],
            }),
          },
        ]}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        {/* Drag Handle Indicator */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: isDarkMode ? '#475569' : '#cbd5e1' }]} />
        </View>

        {/* Dynamic Icon Box */}
        <View style={styles.iconCenterWrap}>
          {state === 'READY' && (
            <Animated.View
              style={[
                styles.iconBox,
                {
                  backgroundColor: 'rgba(34, 197, 94, 0.15)',
                  borderColor: '#22c55e',
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <Ionicons name="rocket-outline" size={38} color="#16a34a" />
            </Animated.View>
          )}

          {(state === 'CHECKING' || state === 'DOWNLOADING') && (
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: colors.primaryLight,
                  borderColor: colors.primary,
                },
              ]}
            >
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {state === 'UP_TO_DATE' && (
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: 'rgba(59, 130, 246, 0.15)',
                  borderColor: '#3b82f6',
                },
              ]}
            >
              <Ionicons name="checkmark-done-circle-outline" size={40} color="#2563eb" />
            </View>
          )}

          {state === 'ERROR' && (
            <View
              style={[
                styles.iconBox,
                {
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderColor: '#ef4444',
                },
              ]}
            >
              <Ionicons name="alert-circle-outline" size={38} color="#dc2626" />
            </View>
          )}
        </View>

        {/* Texts */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {state === 'READY' && (isRTL ? 'تحديث جديد متوفر للتطبيق 🚀' : 'New Update Available 🚀')}
            {state === 'DOWNLOADING' && (isRTL ? 'جاري تنزيل التحديث الهوائي...' : 'Downloading Update...')}
            {state === 'CHECKING' && (isRTL ? 'جاري التحقق من التحديثات...' : 'Checking for Updates...')}
            {state === 'UP_TO_DATE' && (isRTL ? 'تطبيقك محدث بالكامل ✅' : 'Your App is Up-to-Date ✅')}
            {state === 'ERROR' && (isRTL ? 'تعذر جلب التحديث' : 'Update Check Failed')}
          </Text>

          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {state === 'READY' &&
              (isRTL
                ? 'تم تنزيل أحدث نسخة من النظام بنجاح.\nتشمل تحسينات البصمة وعرض الطلبات وصورة الموظف وسجل الشفتات.'
                : 'The latest update has been downloaded.\nIncludes biometric login fixes, photo display, and shifts history.')}
            {state === 'DOWNLOADING' &&
              (isRTL
                ? 'يرجى الانتظار ثوانٍ معدودة، جاري جلب أحدث الحزم البرمجية مباشرة إلى جهازك...'
                : 'Please wait a few seconds while the latest update is fetched...')}
            {state === 'CHECKING' &&
              (isRTL
                ? 'جاري الاتصال بخوادم Expo للتأكد من توفر إصدار أحدث...'
                : 'Connecting to Expo servers to check for updates...')}
            {state === 'UP_TO_DATE' &&
              (isRTL
                ? 'أنت تعمل حالياً بأحدث إصدار رسمي من التطبيق (الإصدار 1.0.0 - Production).'
                : 'You are currently running the latest official version of the app (v1.0.0).')}
            {state === 'ERROR' &&
              (errorMessage ||
                (isRTL
                  ? 'تأكد من اتصالك بالإنترنت ثم حاول مرة أخرى.'
                  : 'Please check your internet connection and try again.'))}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {state === 'READY' && (
            <>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: '#16a34a' }]}
                onPress={onApplyUpdate}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh-circle-outline" size={22} color="#ffffff" />
                <Text style={styles.primaryBtnText}>
                  {isRTL ? 'إعادة تشغيل وتطبيق التحديث الآن' : 'Restart & Apply Update Now'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                  {isRTL ? 'تطبيق التحديث لاحقاً' : 'Apply Later'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {state === 'UP_TO_DATE' && (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>{isRTL ? 'حسناً، فهمت' : 'Got it'}</Text>
            </TouchableOpacity>
          )}

          {state === 'ERROR' && (
            <>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={onCheckAgain}
                activeOpacity={0.85}
              >
                <Ionicons name="refresh" size={18} color="#ffffff" />
                <Text style={styles.primaryBtnText}>{isRTL ? 'إعادة المحاولة' : 'Retry'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                  {isRTL ? 'إغلاق' : 'Close'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          {(state === 'CHECKING' || state === 'DOWNLOADING') && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                {isRTL ? 'إخفاء ومتابعة في الخلفية' : 'Hide in Background'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 32,
    elevation: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  iconCenterWrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  actionsContainer: {
    gap: 10,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
