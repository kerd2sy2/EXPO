import React from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { PlateResultData } from '../types/plateScanner.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ScannerHUDProps {
  pulseAnim: Animated.Value;
  laserAnim: Animated.Value;
  detectedResult: PlateResultData | null;
  isBusy: boolean;
}

export const ScannerHUD: React.FC<ScannerHUDProps> = ({
  pulseAnim,
  laserAnim,
  detectedResult,
  isBusy,
}) => {
  const translateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 195],
  });

  return (
    <View style={styles.centerTargetContainer}>
      <Animated.View
        style={[
          styles.targetFrame,
          { transform: [{ scale: pulseAnim }] },
          detectedResult && styles.targetFrameSuccess,
          isBusy && styles.targetFrameBusy,
        ]}
      >
        {/* 4 Glowing Corner Brackets */}
        <View style={[styles.cornerBracket, styles.bracketTL]} />
        <View style={[styles.cornerBracket, styles.bracketTR]} />
        <View style={[styles.cornerBracket, styles.bracketBL]} />
        <View style={[styles.cornerBracket, styles.bracketBR]} />

        {/* Guidance Text Centered Inside Target Frame (Clean, no icon) */}
        <View style={styles.frameInnerGuidance} pointerEvents="none">
          <Text style={styles.frameGuidanceText}>
            {detectedResult
              ? 'تم التعرف على اللوحة بنجاح!'
              : isBusy
              ? 'جاري فحص وقراءة اللوحة...'
              : 'وجّه اللوحة داخل الإطار والتقط'}
          </Text>
        </View>

        {/* Laser Sweep Beam */}
        {!detectedResult && (
          <Animated.View
            style={[
              styles.laserBeam,
              { transform: [{ translateY }] },
            ]}
          />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  centerTargetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  targetFrame: {
    width: SCREEN_WIDTH * 0.86,
    height: (SCREEN_WIDTH * 0.86) * 0.65,
    maxHeight: 235,
    backgroundColor: 'transparent',
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#f97316',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  targetFrameSuccess: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  targetFrameBusy: {
    borderColor: '#ea580c',
  },
  cornerBracket: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderColor: '#f97316',
  },
  bracketTL: {
    top: -2,
    left: -2,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderTopLeftRadius: 20,
  },
  bracketTR: {
    top: -2,
    right: -2,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderTopRightRadius: 20,
  },
  bracketBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderBottomLeftRadius: 20,
  },
  bracketBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderBottomRightRadius: 20,
  },
  frameInnerGuidance: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  frameGuidanceText: {
    color: 'rgba(255, 255, 255, 0.88)',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    letterSpacing: 0.3,
  },
  laserBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: '#f97316',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
    elevation: 8,
  },
});
