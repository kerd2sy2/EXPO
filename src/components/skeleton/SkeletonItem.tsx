import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle, StyleProp, StyleSheet } from 'react-native';

interface SkeletonItemProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  isDarkMode?: boolean;
  color?: string;
}

export const SkeletonItem: React.FC<SkeletonItemProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 8,
  style,
  isDarkMode = false,
  color,
}) => {
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  const defaultBgColor = color || (isDarkMode ? '#334155' : '#e2e8f0');

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor: defaultBgColor,
          opacity,
        },
        style,
      ]}
    />
  );
};
