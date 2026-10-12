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
import { ThemeColors } from '../../types/delegate';

export type AhdaAlertType = 'success' | 'error' | 'warning' | 'confirm';

export interface AhdaAlertConfig {
  type: AhdaAlertType;
  title: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
}

interface AhdaActionAlertModalProps {
  config: AhdaAlertConfig | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AhdaActionAlertModal: React.FC<AhdaActionAlertModalProps> = ({
  config,
  colors,
  isDarkMode,
  onClose,
}) => {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (config) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
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
  }, [config]);

  if (!config) return null;

  const handleClose = (callback?: () => void) => {
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
      if (callback) callback();
    });
  };

  const handlePrimary = () => {
    handleClose(() => {
      if (config.onPrimaryPress) config.onPrimaryPress();
    });
  };

  const handleSecondary = () => {
    handleClose(() => {
      if (config.onSecondaryPress) config.onSecondaryPress();
    });
  };

  let lottieSource: any = null;
  let primaryBtnColor = '#ea580c';
  let defaultPrimaryText = 'حسناً';
  let defaultSecondaryText = 'إلغاء';

  switch (config.type) {
    case 'success':
      lottieSource = require('../../../assets/Lottie/json/Alerts/Success.json');
      primaryBtnColor = '#10b981';
      defaultPrimaryText = 'حسناً';
      break;
    case 'error':
      lottieSource = require('../../../assets/Lottie/json/Alerts/Error.json');
      primaryBtnColor = '#ef4444';
      defaultPrimaryText = 'إغلاق';
      break;
    case 'warning':
      lottieSource = require('../../../assets/Lottie/json/Alerts/Attention.json');
      primaryBtnColor = '#eab308';
      defaultPrimaryText = 'فهمت';
      break;
    case 'confirm':
      lottieSource = require('../../../assets/Lottie/json/Alerts/Attention.json');
      primaryBtnColor = '#ef4444';
      defaultPrimaryText = 'تأكيد الحذف';
      break;
  }

  const primaryLabel = config.primaryButtonText || defaultPrimaryText;
  const hasSecondary = Boolean(config.secondaryButtonText || config.onSecondaryPress || config.type === 'confirm');
  const secondaryLabel = config.secondaryButtonText || defaultSecondaryText;

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={() => handleClose()}
      />
      <Animated.View
        style={[
          styles.sheetCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        {/* Top Handle Indicator */}
        <View style={styles.handleWrap}>
          <View style={[styles.handleBar, { backgroundColor: isDarkMode ? '#3f3f46' : '#cbd5e1' }]} />
        </View>

        {/* Lottie Animation Display */}
        <View style={styles.lottieContainer}>
          <LottieView
            source={lottieSource}
            autoPlay
            loop={false}
            style={{ width: 84, height: 84 }}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {config.title}
        </Text>

        {/* Message */}
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {config.message}
        </Text>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          {hasSecondary && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}
              onPress={handleSecondary}
              activeOpacity={0.75}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                {secondaryLabel}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: primaryBtnColor }]}
            onPress={handlePrimary}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 24,
  },
  handleWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  handleBar: {
    width: 38,
    height: 4,
    borderRadius: 2,
  },
  lottieContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  buttonsContainer: {
    flexDirection: 'row-reverse',
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
