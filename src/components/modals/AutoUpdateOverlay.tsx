import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  AppState,
  AppStateStatus,
  StatusBar,
} from 'react-native';
import * as Updates from 'expo-updates';
import LottieView from 'lottie-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AutoUpdateOverlay: React.FC = () => {
  const [isUpdating, setIsUpdating] = useState(false);
  const lottieRef = useRef<LottieView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (isUpdating) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isUpdating]);

  const performUpdateCheck = async () => {
    if (__DEV__ || !Updates.isEnabled || isCheckingRef.current) {
      return;
    }

    try {
      isCheckingRef.current = true;
      const check = await Updates.checkForUpdateAsync().catch(() => ({ isAvailable: false } as any));

      if (check && check.isAvailable) {
        setIsUpdating(true);

        // Fetch update package
        await Updates.fetchUpdateAsync();
        await new Promise((res) => setTimeout(res, 800));
        await Updates.reloadAsync();
      }
    } catch (err) {
      console.log('[AutoUpdateOverlay] Update error:', err);
      setIsUpdating(false);
    } finally {
      isCheckingRef.current = false;
    }
  };

  useEffect(() => {
    performUpdateCheck();
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        performUpdateCheck();
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    const interval = setInterval(() => {
      performUpdateCheck();
    }, 60000);

    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, []);

  if (!isUpdating) return null;

  return (
    <View style={[StyleSheet.absoluteFill, styles.overlayContainer, { zIndex: 9999999, elevation: 9999999 }]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <Animated.View style={[styles.animationWrap, { opacity: fadeAnim }]}>
        <LottieView
          ref={lottieRef}
          source={require('../../../assets/Lottie/json/update.json')}
          autoPlay={true}
          loop={true}
          style={styles.lottieAnimation}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  animationWrap: {
    width: Math.min(SCREEN_WIDTH * 0.9, 360),
    height: Math.min(SCREEN_WIDTH * 0.9, 360),
    justifyContent: 'center',
    alignItems: 'center',
  },
  lottieAnimation: {
    width: '100%',
    height: '100%',
  },
});
