import React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScannerIntroSplashProps {
  introFadeAnim: Animated.Value;
  onAnimationFinish: () => void;
  isDark: boolean;
}

export const ScannerIntroSplash: React.FC<ScannerIntroSplashProps> = ({
  introFadeAnim,
  onAnimationFinish,
  isDark,
}) => {
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.introSplashContainer,
        {
          backgroundColor: isDark ? '#090d16' : '#f8fafc',
          opacity: introFadeAnim,
        },
      ]}
    >
      <View style={styles.introSplashContent}>
        <View style={styles.introLottieBox}>
          <LottieView
            source={require('../../../../assets/Lottie/lottie/HLmkwb6vpO.lottie')}
            autoPlay
            loop={false}
            onAnimationFinish={onAnimationFinish}
            style={styles.introLottie}
          />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  introSplashContainer: {
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  introSplashContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  introLottieBox: {
    width: Math.min(SCREEN_WIDTH * 0.85, 340),
    height: Math.min(SCREEN_WIDTH * 0.85, 340),
    justifyContent: 'center',
    alignItems: 'center',
  },
  introLottie: {
    width: '100%',
    height: '100%',
  },
});
