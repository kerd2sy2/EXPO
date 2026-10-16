import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { Fonts } from '../theme/spacing';
import { Colors, ThemeColor, lightTheme, darkTheme } from '../theme/colors';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
  isDark?: boolean;
};

export function ThemedText({ style, type = 'default', themeColor, isDark = false, ...rest }: ThemedTextProps) {
  const currentPalette = isDark ? darkTheme : lightTheme;
  const fallbackColor = isDark ? Colors.dark.text : Colors.light.text;

  return (
    <Text
      style={[
        { color: themeColor ? (Colors[isDark ? 'dark' : 'light'][themeColor] || fallbackColor) : currentPalette.textPrimary },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && { ...styles.link, color: currentPalette.primary },
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  link: {
    lineHeight: 24,
    fontSize: 16,
    color: '#0a7ea4',
  },
  code: {
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
});
