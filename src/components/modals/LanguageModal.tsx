import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Language, ThemeColors } from '../../types/delegate';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LanguageModalProps {
  visible: boolean;
  currentLang: Language;
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
  t: any;
  onSelectLang: (lang: Language) => void;
  onClose: () => void;
}

const cancelLabels: Record<Language, string> = {
  ar: 'إلغاء',
  en: 'Cancel',
  bn: 'বাতিল',
};

export const LanguageModal: React.FC<LanguageModalProps> = ({
  visible,
  currentLang,
  colors,
  isDarkMode = false,
  isRTL = currentLang === 'ar',
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
    t?.cancelBtn || cancelLabels[currentLang] || (currentLang === 'ar' ? 'إلغاء' : 'Cancel');

  const languages = [
    {
      code: 'ar' as Language,
      badge: 'AR',
      name: 'العربية',
      subName: 'Arabic',
    },
    {
      code: 'en' as Language,
      badge: 'EN',
      name: 'English',
      subName: 'الإنجليزية',
    },
    {
      code: 'bn' as Language,
      badge: 'BN',
      name: 'বাংলা',
      subName: 'Bengali',
    },
  ];

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
                {
                  backgroundColor: colors.primaryLight,
                },
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
              <Text
                style={[styles.headerSubtitle, { color: colors.textSecondary }]}
              >
                {currentLang === 'ar'
                  ? 'حدد لغة العرض المفضلة لواجهة التطبيق'
                  : currentLang === 'bn'
                  ? 'অ্যাপের জন্য আপনার পছন্দের ভাষা নির্বাচন করুন'
                  : 'Choose your preferred display language'}
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

          {/* Language Options List */}
          <View style={styles.optionsList}>
            {languages.map((langItem) => {
              const isSelected = currentLang === langItem.code;
              return (
                <TouchableOpacity
                  key={langItem.code}
                  style={[
                    styles.langOptionCard,
                    {
                      backgroundColor: isSelected
                        ? colors.primaryLight
                        : isDarkMode
                        ? 'rgba(255, 255, 255, 0.03)'
                        : '#f8fafc',
                      borderColor: isSelected
                        ? colors.primary
                        : colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  onPress={() => handleSelect(langItem.code)}
                  activeOpacity={0.75}
                >
                  {/* Code Badge */}
                  <View
                    style={[
                      styles.flagBadgeBox,
                      {
                        backgroundColor: isSelected
                          ? isDarkMode
                            ? 'rgba(255, 255, 255, 0.1)'
                            : '#ffffff'
                          : isDarkMode
                          ? 'rgba(255, 255, 255, 0.06)'
                          : '#ffffff',
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.langBadgeText,
                        {
                          color: isSelected ? colors.primary : colors.textPrimary,
                        },
                      ]}
                    >
                      {langItem.badge}
                    </Text>
                  </View>

                  {/* Language Title & Subtitle */}
                  <View
                    style={[
                      styles.langInfoCol,
                      { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                    ]}
                  >
                    <Text
                      style={[
                        styles.langMainName,
                        {
                          color: isSelected ? colors.primary : colors.textPrimary,
                          fontWeight: isSelected ? '800' : '700',
                        },
                      ]}
                    >
                      {langItem.name}
                    </Text>
                    <Text
                      style={[
                        styles.langSubName,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {langItem.subName}
                    </Text>
                  </View>

                  {/* Selection Indicator */}
                  <View style={styles.checkIconBox}>
                    {isSelected ? (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={colors.primary}
                      />
                    ) : (
                      <View
                        style={[
                          styles.uncheckedCircle,
                          { borderColor: colors.border },
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Cancel Button - Language Specific */}
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

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  sheetWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
    justifyContent: 'flex-end',
  },
  sheetContent: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 20,
  },
  dragBarContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.12)',
    marginBottom: 16,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsList: {
    gap: 10,
    marginBottom: 16,
  },
  langOptionCard: {
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  flagBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  flagEmoji: {
    fontSize: 16,
  },
  langBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  langInfoCol: {
    flex: 1,
    gap: 2,
  },
  langMainName: {
    fontSize: 15,
  },
  langSubName: {
    fontSize: 12,
  },
  checkIconBox: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  cancelBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
