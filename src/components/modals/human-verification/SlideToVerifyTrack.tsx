import React from 'react';
import { View, Text, Animated, PanResponderInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../../types/delegate';
import { TRACK_WIDTH, KNOB_SIZE, MAX_SLIDE } from './humanVerificationHelpers';
import { humanVerificationStyles as styles } from './humanVerificationStyles';

interface SlideToVerifyTrackProps {
  verified: boolean;
  slideAnim: Animated.Value;
  panHandlers: PanResponderInstance['panHandlers'];
  colors: ThemeColors;
  isDarkMode: boolean;
  verifiedText: string;
  slideActionText: string;
}

/**
 * Interactive slide-to-verify track with animated fill progress and draggable knob.
 */
export const SlideToVerifyTrack: React.FC<SlideToVerifyTrackProps> = ({
  verified,
  slideAnim,
  panHandlers,
  colors,
  isDarkMode,
  verifiedText,
  slideActionText,
}) => (
  <View
    pointerEvents={verified ? 'none' : 'auto'}
    style={[
      styles.track,
      {
        backgroundColor: verified
          ? '#10b98120'
          : isDarkMode
          ? '#0f172a'
          : '#f1f5f9',
        borderColor: verified ? '#10b981' : colors.border,
      },
    ]}
  >
    {/* Track background progress fill */}
    <Animated.View
      style={[
        styles.trackFill,
        {
          width: slideAnim.interpolate({
            inputRange: [0, MAX_SLIDE],
            outputRange: [KNOB_SIZE, TRACK_WIDTH],
            extrapolate: 'clamp',
          }),
          backgroundColor: verified ? '#10b98125' : `${colors.primary}20`,
        },
      ]}
    />

    {/* Slider track label */}
    <Text
      style={[
        styles.trackText,
        {
          color: verified ? '#059669' : isDarkMode ? '#94a3b8' : '#64748b',
        },
      ]}
      numberOfLines={1}
    >
      {verified ? verifiedText : slideActionText}
    </Text>

    {/* Draggable Knob */}
    <Animated.View
      {...(verified ? {} : panHandlers)}
      pointerEvents={verified ? 'none' : 'auto'}
      style={[
        styles.knob,
        {
          transform: [{ translateX: slideAnim }],
          backgroundColor: verified ? '#10b981' : colors.primary,
          shadowColor: verified ? '#10b981' : colors.primary,
        },
      ]}
    >
      <Ionicons
        name={verified ? 'checkmark' : 'arrow-forward'}
        size={22}
        color="#ffffff"
      />
    </Animated.View>
  </View>
);
