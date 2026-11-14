import { useRef, useEffect, useCallback } from 'react';
import { Animated, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { TabType } from '../types/delegate';

export const HOME_HEADER_HEIGHT = 72;

export function useCollapsibleHomeHeader(currentTab: TabType) {
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isHeaderHidden = useRef(false);
  const scrollDelta = useRef(0);

  useEffect(() => {
    headerTranslateY.setValue(0);
    isHeaderHidden.current = false;
    lastScrollY.current = 0;
    scrollDelta.current = 0;
  }, [currentTab, headerTranslateY]);

  const handleHomeScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (currentTab !== 'home') return;

      const currentY = event.nativeEvent.contentOffset.y;
      const diff = currentY - lastScrollY.current;
      lastScrollY.current = currentY;

      if (currentY <= 10) {
        scrollDelta.current = 0;
        if (isHeaderHidden.current) {
          isHeaderHidden.current = false;
          Animated.spring(headerTranslateY, {
            toValue: 0,
            damping: 20,
            stiffness: 220,
            useNativeDriver: true,
          }).start();
        }
        return;
      }

      if (diff > 0) {
        if (scrollDelta.current < 0) scrollDelta.current = 0;
        scrollDelta.current += diff;
        if (scrollDelta.current >= 6 && currentY > 15 && !isHeaderHidden.current) {
          isHeaderHidden.current = true;
          Animated.timing(headerTranslateY, {
            toValue: -HOME_HEADER_HEIGHT,
            duration: 180,
            useNativeDriver: true,
          }).start();
        }
      } else if (diff < 0) {
        if (scrollDelta.current > 0) scrollDelta.current = 0;
        scrollDelta.current += diff;
        if (scrollDelta.current <= -6 && isHeaderHidden.current) {
          isHeaderHidden.current = false;
          Animated.spring(headerTranslateY, {
            toValue: 0,
            damping: 20,
            stiffness: 220,
            useNativeDriver: true,
          }).start();
        }
      }
    },
    [currentTab, headerTranslateY]
  );

  return {
    headerTranslateY,
    handleHomeScroll,
  };
}
