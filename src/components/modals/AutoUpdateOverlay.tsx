import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  AppState,
  AppStateStatus,
} from 'react-native';
import * as Updates from 'expo-updates';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AutoUpdateOverlay: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string>('جاري تحميل التحديث الجديد...');
  const [progressPercent, setProgressPercent] = useState<number>(10);

  const lottieRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isCheckingRef = useRef(false);

  // Pulse animation for status pill
  useEffect(() => {
    if (isUpdating) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
      pulse.start();

      return () => pulse.stop();
    }
  }, [isUpdating]);

  const performUpdateCheck = async (force = false) => {
    if (__DEV__ || !Updates.isEnabled || isCheckingRef.current) {
      return;
    }

    try {
      isCheckingRef.current = true;
      const check = await Updates.checkForUpdateAsync().catch(() => ({ isAvailable: false } as any));

      if (check && check.isAvailable) {
        setIsUpdating(true);
        setUpdateStatus('جاري تنزيل أحدث إصدار للنظام...');
        setProgressPercent(35);

        // Fetch the update package
        await Updates.fetchUpdateAsync();
        setProgressPercent(85);
        setUpdateStatus('تم اكتمال التنزيل، جاري تطبيق التحديث...');

        await new Promise((res) => setTimeout(res, 900));
        setProgressPercent(100);
        setUpdateStatus('جاري إعادة تشغيل التطبيق تلقائياً...');

        await new Promise((res) => setTimeout(res, 500));
        await Updates.reloadAsync();
      }
    } catch (err) {
      console.log('[AutoUpdateOverlay] Update error:', err);
      setIsUpdating(false);
    } finally {
      isCheckingRef.current = false;
    }
  };

  // 1. Initial check on mount
  useEffect(() => {
    performUpdateCheck();
  }, []);

  // 2. Periodic background check & on AppState change to active
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        performUpdateCheck();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    const interval = setInterval(() => {
      performUpdateCheck();
    }, 60000); // Check every 60 seconds

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, []);

  if (!isUpdating) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlayContainer, { zIndex: 999999, elevation: 999999 }]}>
      <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
        {/* Lottie Animation */}
        <View style={styles.lottieWrap}>
          <LottieView
            ref={lottieRef}
            source={require('../../../assets/Lottie/update.json')}
            autoPlay={true}
            loop={true}
            style={styles.lottieAnimation}
          />
        </View>

        {/* Title and descriptions */}
        <Text style={styles.title}>تحديث إجباري للنظام</Text>
        <Text style={styles.subtitle}>
          يتوفر إصدار أحدث يشمل تحسينات أداء وتحديثات فورية. يرجى الانتظار ثوانٍ معدودة.
        </Text>

        {/* Progress Bar Container */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* Dynamic Status Tag */}
        <Animated.View style={[styles.statusBadge, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.pulseDot} />
          <Text style={styles.statusText}>{updateStatus}</Text>
        </Animated.View>

        <Text style={styles.noticeText}>سيتم إعادة فتح التطبيق تلقائياً بمجرد الانتهاء</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: SCREEN_WIDTH * 0.9,
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(249, 115, 22, 0.35)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  lottieWrap: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.4)',
    marginBottom: 12,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f97316',
    marginRight: 8,
  },
  statusText: {
    color: '#fdba74',
    fontSize: 13,
    fontWeight: '700',
  },
  noticeText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
});
