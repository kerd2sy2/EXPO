import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

interface UseShakeDetectionOptions {
  enabled?: boolean;
  threshold?: number;
  cooldownMs?: number;
  onShake: () => void;
}

/**
 * Custom hook that listens to the phone's accelerometer and detects sudden shakes or impact movements.
 */
export function useShakeDetection({
  enabled = true,
  threshold = 2.7,
  cooldownMs = 6000,
  onShake,
}: UseShakeDetectionOptions) {
  const lastShakeTimeRef = useRef<number>(0);
  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    let subscription: { remove: () => void } | null = null;

    const setupListener = async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!available) {
          return;
        }

        Accelerometer.setUpdateInterval(100);

        subscription = Accelerometer.addListener(({ x, y, z }) => {
          // Total G-force magnitude
          const totalForce = Math.sqrt(x * x + y * y + z * z);
          const now = Date.now();

          // Standard gravity is ~1.0g. A strong shake or drop impact registers > 2.6g
          if (totalForce > threshold && now - lastShakeTimeRef.current > cooldownMs) {
            lastShakeTimeRef.current = now;
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } catch {}
            onShakeRef.current();
          }
        });
      } catch (err) {
        console.warn('[useShakeDetection] Error initializing accelerometer:', err);
      }
    };

    setupListener();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [enabled, threshold, cooldownMs]);
}
