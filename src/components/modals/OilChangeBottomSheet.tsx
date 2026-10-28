import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '../../types/delegate';

export interface OilChangeBottomSheetProps {
  visible: boolean;
  motorcycleNumber?: string;
  colors?: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const OilChangeBottomSheet: React.FC<OilChangeBottomSheetProps> = ({
  visible,
  motorcycleNumber,
  colors,
  isDarkMode = false,
  isRTL = true,
  onClose,
  title,
  message,
  buttonText,
}) => {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const lottieRef = useRef<LottieView>(null);

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { });
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          bounciness: 5,
          speed: 12,
          useNativeDriver: true,
        }),
      ]).start(() => {
        lottieRef.current?.play();
      });
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const displayTitle = title || '';
  const displayMessage = message || '';
  const displayBtnText = buttonText || (isRTL ? 'الرجوع إلى الرئيسية' : 'Return to Home');

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleDismiss}
      />
      <Animated.View
        style={[
          styles.sheetCard,
          {
            backgroundColor: isDarkMode ? '#121826' : '#ffffff',
            borderColor: isDarkMode ? 'rgba(249, 115, 22, 0.3)' : 'rgba(249, 115, 22, 0.2)',
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        {/* Drag handle bar */}
        <View style={styles.handleWrap}>
          <View style={[styles.handleBar, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]} />
        </View>

        {/* Close Button */}
        <TouchableOpacity
          style={[
            styles.closeIconBtn,
            { [isRTL ? 'left' : 'right']: 16, backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' },
          ]}
          onPress={handleDismiss}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
        </TouchableOpacity>

        {/* Lottie Animation (no background) */}
        <View style={styles.lottieContainer}>
          <LottieView
            ref={lottieRef}
            source={require('../../../assets/Lottie/LCKboLMu6C.lottie')}
            autoPlay
            loop
            style={styles.lottieAnim}
            resizeMode="contain"
          />
        </View>

        {/* Title (only if provided) */}
        {Boolean(displayTitle) && (
          <Text style={[styles.title, { color: isDarkMode ? '#f8fafc' : '#0f172a', textAlign: 'center' }]}>
            {displayTitle}
          </Text>
        )}

        {/* Subtitle (only if provided) */}
        {Boolean(displayMessage) && (
          <Text style={[styles.subtitle, { color: isDarkMode ? '#94a3b8' : '#64748b', textAlign: 'center' }]}>
            {displayMessage}
          </Text>
        )}

        {/* Primary Action Button: "الرجوع إلى الرئيسية" */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors?.primary || '#f97316' }]}
          onPress={handleDismiss}
          activeOpacity={0.85}
        >
          <Ionicons name="home-outline" size={20} color="#ffffff" style={{ marginHorizontal: 8 }} />
          <Text style={styles.primaryBtnText}>{displayBtnText}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
    alignItems: 'center',
  },
  handleWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  closeIconBtn: {
    position: 'absolute',
    top: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lottieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  lottieGlowCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  lottieAnim: {
    width: 100,
    height: 100,
  },
  bikeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
    gap: 6,
  },
  bikeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    width: '100%',
    marginBottom: 10,
    gap: 8,
  },
  alertIcon: {
    marginTop: 1,
  },
  message: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    flexShrink: 1,
  },
  subHint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  primaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
