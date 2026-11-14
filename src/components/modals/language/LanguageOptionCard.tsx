import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, Language } from '../../../types/delegate';
import { LanguageOptionItem } from './languageModalHelpers';
import { languageModalStyles as styles } from './languageModalStyles';

interface LanguageOptionCardProps {
  langItem: LanguageOptionItem;
  isSelected: boolean;
  isDarkMode: boolean;
  isRTL: boolean;
  colors: ThemeColors;
  onSelect: (code: Language) => void;
}

/**
 * Renders a selectable language row in the language picker bottom sheet.
 */
export const LanguageOptionCard: React.FC<LanguageOptionCardProps> = ({
  langItem,
  isSelected,
  isDarkMode,
  isRTL,
  colors,
  onSelect,
}) => (
  <TouchableOpacity
    style={[
      styles.langOptionCard,
      {
        backgroundColor: isSelected
          ? colors.primaryLight
          : isDarkMode
          ? 'rgba(255, 255, 255, 0.03)'
          : '#f8fafc',
        borderColor: isSelected ? colors.primary : colors.border,
        flexDirection: isRTL ? 'row-reverse' : 'row',
      },
    ]}
    onPress={() => onSelect(langItem.code)}
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
          borderColor: isSelected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.langBadgeText,
          { color: isSelected ? colors.primary : colors.textPrimary },
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
      <Text style={[styles.langSubName, { color: colors.textSecondary }]}>
        {langItem.subName}
      </Text>
    </View>

    {/* Selection Indicator */}
    <View style={styles.checkIconBox}>
      {isSelected ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      ) : (
        <View style={[styles.uncheckedCircle, { borderColor: colors.border }]} />
      )}
    </View>
  </TouchableOpacity>
);
