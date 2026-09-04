import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SuccessModalData, EmployeeProfile, ThemeColors, PreviewPhotoData } from '../../types/delegate';

interface SuccessShiftModalProps {
  data: SuccessModalData;
  employee: EmployeeProfile | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  backdropOpacity: Animated.Value;
  sheetTranslateY: Animated.Value;
  formatTimeStr: (iso?: string) => string;
  onClose: (callback?: () => void) => void;
  onNavigateToTab: (tab: 'home' | 'shift' | 'history' | 'profile') => void;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
}

export const SuccessShiftModal: React.FC<SuccessShiftModalProps> = ({
  data,
  colors,
  isDarkMode,
  isRTL,
  t,
  backdropOpacity,
  sheetTranslateY,
  onClose,
  onNavigateToTab,
}) => {
  const isStart = data.type === 'start';
  const targetTab: 'home' | 'history' = isStart ? 'home' : 'history';

  // Automatically transition to the target screen (home for start, history for end)
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(() => {
        onNavigateToTab(targetTab);
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [targetTab]);

  const handleDone = () => {
    onClose(() => {
      onNavigateToTab(targetTab);
    });
  };

  const titleText = isStart
    ? (t.shiftStartedSuccessTitle || 'تم بدء الشفت بنجاح')
    : 'تم إنهاء الشفت';

  const iconName = 'checkmark-circle';
  const iconColor = isStart ? '#10b981' : colors.primary;
  const iconBg = isStart
    ? (isDarkMode ? 'rgba(16, 185, 129, 0.22)' : '#ecfdf5')
    : (isDarkMode ? 'rgba(234, 88, 12, 0.22)' : '#fff7ed');

  const buttonText = isStart
    ? (t.goToHomeBtn || 'الرئيسية')
    : (t.viewHistoryBtn || 'سجل الشفتات');

  const buttonIcon = isStart ? 'home-outline' : 'list-outline';
  const buttonBg = isStart ? '#10b981' : colors.primary;

  return (
    <Animated.View style={[styles.bottomModalBackdrop, { opacity: backdropOpacity }]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={handleDone}
      />
      <Animated.View
        style={[
          styles.bottomSuccessModalCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        {/* Drag Handle Indicator */}
        <View style={[styles.bottomDragIndicator, { backgroundColor: isDarkMode ? '#334155' : '#cbd5e1' }]} />

        <View style={styles.compactContent}>
          {/* Green / Primary Checkmark Circle */}
          <View style={[styles.compactSuccessIconCircle, { backgroundColor: iconBg }]}>
            <Ionicons name={iconName} size={56} color={iconColor} />
          </View>

          {/* Title: Exactly "تم بدء الشفت بنجاح" or "تم إنهاء الشفت" (لا أكثر ولا أقل) */}
          <Text style={[styles.compactTitle, { color: colors.textPrimary }]}>
            {titleText}
          </Text>

          {/* Action Button: "الرئيسية" / "سجل الشفتات" */}
          <TouchableOpacity
            activeOpacity={0.88}
            style={[styles.primaryButton, { backgroundColor: buttonBg }]}
            onPress={handleDone}
          >
            <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name={buttonIcon} size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>
                {buttonText}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bottomModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.90)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  bottomSuccessModalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingBottom: 36,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 24,
  },
  bottomDragIndicator: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  compactContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  compactSuccessIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  compactTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContentRow: {
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
