import React from 'react';
import { View, type ViewProps } from 'react-native';
import { Colors, ThemeColor, lightTheme, darkTheme } from '../theme/colors';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
  isDark?: boolean;
};

export function ThemedView({ style, lightColor, darkColor, type, isDark = false, ...otherProps }: ThemedViewProps) {
  const currentPalette = isDark ? darkTheme : lightTheme;
  const backgroundColor = isDark
    ? (darkColor || (type ? Colors.dark[type] : currentPalette.bg))
    : (lightColor || (type ? Colors.light[type] : currentPalette.bg));

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
