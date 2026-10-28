import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { ThemeColors } from '../../../types/delegate';

interface ShiftCardSkeletonProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

export const ShiftCardSkeleton: React.FC<ShiftCardSkeletonProps> = ({
  colors,
  isDarkMode,
  isRTL,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.45,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const boneBg = isDarkMode ? '#272730' : '#e2e8f0';
  const accentBoneBg = isDarkMode ? 'rgba(249, 115, 22, 0.22)' : '#ffedd5';

  return (
    <View
      style={[
        styles.cardRow,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
      ]}
    >
      <Animated.View
        style={[
          styles.iconCircle,
          {
            backgroundColor: accentBoneBg,
            opacity: pulseAnim,
          },
        ]}
      />
      <View
        style={[
          styles.textCol,
          { alignItems: isRTL ? 'flex-end' : 'flex-start' },
        ]}
      >
        <Animated.View
          style={[
            styles.titleBone,
            {
              backgroundColor: boneBg,
              opacity: pulseAnim,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.subBone,
            {
              backgroundColor: boneBg,
              opacity: pulseAnim,
            },
          ]}
        />
      </View>
      <Animated.View
        style={[
          styles.chevronBone,
          {
            backgroundColor: boneBg,
            opacity: pulseAnim,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  cardRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    minHeight: 74,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  textCol: {
    flex: 1,
    gap: 8,
  },
  titleBone: {
    width: '55%',
    height: 15,
    borderRadius: 7,
  },
  subBone: {
    width: '78%',
    height: 12,
    borderRadius: 6,
  },
  chevronBone: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});

