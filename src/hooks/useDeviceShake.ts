import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

interface UseDeviceShakeOptions {
  threshold?: number; // Acceleration threshold (default: 1.78g)
  timeoutMs?: number; // Throttle interval between shakes (default: 1200ms)
  enabled?: boolean;
}

/**
 * Custom hook to detect when the user shakes the device.
 * Triggers onShake callback when acceleration exceeds threshold.
 */
export function useDeviceShake(
  onShake: () => void,
  options: UseDeviceShakeOptions = {}
) {
  const { threshold = 1.78, timeoutMs = 1200, enabled = true } = options;
  const lastShakeTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    // Set update interval to 100ms for smooth, responsive detection without battery drain
    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener((data) => {
      const { x, y, z } = data;
      // Calculate total acceleration magnitude minus gravity (1g)
      const totalAcceleration = Math.sqrt(x * x + y * y + z * z);

      if (totalAcceleration > threshold) {
        const now = Date.now();
        if (now - lastShakeTime.current > timeoutMs) {
          lastShakeTime.current = now;
          // Trigger slight haptic feedback on shake detection
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } catch (_) {}

          onShake();
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [enabled, onShake, threshold, timeoutMs]);
}
