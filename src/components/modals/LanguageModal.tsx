import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Language, ThemeColors } from '../../types/delegate';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import {
  CANCEL_LABELS,
  LANGUAGE_OPTIONS,
  getLanguageModalSubtitle,
} from './language/languageModalHelpers';
import { languageModalStyles as styles } from './language/languageModalStyles';
import { LanguageOptionCard } from './language/LanguageOptionCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface LanguageModalProps {
  visible: boolean;
  currentLang: Language;
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
  t: any;
  onSelectLang: (lang: Language) => void;
  onClose: () => void;
}

/**
 * Animated bottom-sheet modal allowing the user to switch the display language.
 */
export const LanguageModal: React.FC<LanguageModalProps> = ({
  visible,
  currentLang,
  colors,
  isDarkMode = false,
  isRTL = currentLang === 'ar' || currentLang === 'ur',
  t,
  onSelectLang,
  onClose,
}) => {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          bounciness: 3,
          speed: 14,
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
  }, [visible]);

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

  const handleSelect = (lang: Language) => {
    handleClose(() => {
      onSelectLang(lang);
    });
  };

  if (!visible) return null;

  const cancelText =
    t?.cancelBtn || CANCEL_LABELS[currentLang] || (currentLang === 'ar' ? 'إلغاء' : 'Cancel');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.65],
            }),
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => handleClose()}
        />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheetWrapper,
          {
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        <View
          style={[
            styles.sheetContent,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Drag Handle Bar */}
          <View style={styles.dragBarContainer}>
            <View
              style={[
                styles.dragBar,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(0, 0, 0, 0.15)',
                },
              ]}
            />
          </View>

          {/* Header */}
          <View
            style={[
              styles.headerRow,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <View
              style={[
                styles.headerIconBox,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <Ionicons name="globe-outline" size={22} color={colors.primary} />
            </View>

            <View
              style={[
                styles.headerTextCol,
                { alignItems: isRTL ? 'flex-end' : 'flex-start' },
              ]}
            >
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                {t.selectLang || (isRTL ? 'اختر لغة التطبيق' : 'Select App Language')}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {getLanguageModalSubtitle(currentLang)}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.closeButton,
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(255, 255, 255, 0.08)'
                    : '#f1f5f9',
                },
              ]}
              onPress={() => handleClose()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Language Options List isolated in ModuleErrorBoundary */}
          <ModuleErrorBoundary moduleName="LanguageOptionsList" colors={colors}>
            <View style={styles.optionsList}>
              {LANGUAGE_OPTIONS.map((langItem) => (
                <LanguageOptionCard
                  key={langItem.code}
                  langItem={langItem}
                  isSelected={currentLang === langItem.code}
                  isDarkMode={isDarkMode}
                  isRTL={isRTL}
                  colors={colors}
                  onSelect={handleSelect}
                />
              ))}
            </View>
          </ModuleErrorBoundary>

          {/* Cancel Button */}
          <TouchableOpacity
            style={[
              styles.cancelBtn,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(255, 255, 255, 0.05)'
                  : '#f1f5f9',
                borderColor: colors.border,
              },
            ]}
            onPress={() => handleClose()}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
              {cancelText}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};
