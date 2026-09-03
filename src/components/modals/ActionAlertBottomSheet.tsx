import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

export type AlertModalType =
  | 'camera_permission'
  | 'location_permission'
  | 'warning'
  | 'error'
  | 'confirm'
  | 'info';

export interface AlertModalConfig {
  type: AlertModalType;
  title: string;
  message: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  iconName?: string;
}

interface ActionAlertBottomSheetProps {
  config: AlertModalConfig | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const ActionAlertBottomSheet: React.FC<ActionAlertBottomSheetProps> = ({
  config,
  colors,
  isDarkMode,
  isRTL,
  onClose,
}) => {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (config) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
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
          duration: 220,
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
    if (config.type === 'camera_permission' || config.type === 'location_permission') {
      if (config.onPrimaryPress) {
        config.onPrimaryPress();
      } else {
        Linking.openSettings().catch(() => {});
      }
      handleClose();
    } else {
      handleClose(() => {
        if (config.onPrimaryPress) config.onPrimaryPress();
      });
    }
  };

  const handleSecondary = () => {
    handleClose(() => {
      if (config.onSecondaryPress) config.onSecondaryPress();
    });
  };

  // Icon, color and default buttons configuration based on modal type
  let iconComponent = <Ionicons name="alert-circle" size={32} color={colors.primary} />;
  let iconBg = colors.primaryLight;
  let primaryBtnColor = colors.primary;
  let defaultPrimaryText = isRTL ? 'حسناً' : 'OK';
  let defaultSecondaryText = isRTL ? 'إلغاء' : 'Cancel';

  switch (config.type) {
    case 'camera_permission':
      iconComponent = <Ionicons name="camera" size={32} color="#f97316" />;
      iconBg = isDarkMode ? 'rgba(249, 115, 22, 0.18)' : '#fff7ed';
      primaryBtnColor = '#f97316';
      defaultPrimaryText = isRTL ? 'فتح إعدادات الهاتف' : 'Open Settings';
      break;
    case 'location_permission':
      iconComponent = <Ionicons name="navigate" size={32} color="#10b981" />;
      iconBg = isDarkMode ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5';
      primaryBtnColor = '#10b981';
      defaultPrimaryText = isRTL ? 'سماح بالوصول للموقع' : 'Allow Location';
      break;
    case 'warning':
      iconComponent = <Ionicons name="warning" size={32} color="#eab308" />;
      iconBg = isDarkMode ? 'rgba(234, 179, 8, 0.18)' : '#fef9c3';
      primaryBtnColor = '#eab308';
      defaultPrimaryText = isRTL ? 'فهمت' : 'Got it';
      break;
    case 'error':
      iconComponent = <Ionicons name="close-circle" size={32} color="#ef4444" />;
      iconBg = isDarkMode ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2';
      primaryBtnColor = '#ef4444';
      defaultPrimaryText = isRTL ? 'إغلاق' : 'Close';
      break;
    case 'confirm':
      iconComponent = <Ionicons name="help-circle" size={32} color="#f97316" />;
      iconBg = isDarkMode ? 'rgba(249, 115, 22, 0.18)' : '#fff7ed';
      primaryBtnColor = '#ef4444';
      defaultPrimaryText = isRTL ? 'تأكيد' : 'Confirm';
      break;
  }

  const primaryLabel = config.primaryButtonText || defaultPrimaryText;
  const hasSecondary = Boolean(config.secondaryButtonText || config.onSecondaryPress || config.type.includes('permission') || config.type === 'confirm');
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

        {/* Icon Circle with Glow */}
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          {iconComponent}
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.textPrimary, textAlign: 'center' }]}>
          {config.title}
        </Text>

        {/* Message */}
        <Text style={[styles.message, { color: colors.textSecondary, textAlign: 'center' }]}>
          {config.message}
        </Text>

        {/* Action Buttons */}
        <View style={[styles.buttonsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {hasSecondary && (
            <TouchableOpacity
              style={[styles.secondaryBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              onPress={handleSecondary}
              activeOpacity={0.75}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>
                {secondaryLabel}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: primaryBtnColor, flex: hasSecondary ? 1.5 : 1 }]}
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
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  handleWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
    marginBottom: 22,
    paddingHorizontal: 12,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
  },
  primaryBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 14,
    fontWeight: '700',
  },
});
