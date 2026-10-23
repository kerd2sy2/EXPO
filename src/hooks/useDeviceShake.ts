import { useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

interface UseDeviceShakeOptions {
  threshold?: number; // Minimum dynamic acceleration above 1g gravity (default: 1.4g)
  minShakes?: number; // Minimum number of direction reversals/shakes required (default: 3)
  windowMs?: number; // Sliding window duration to accumulate shakes (default: 650ms)
  timeoutMs?: number; // Cooldown interval between triggered shake events (default: 1500ms)
  enabled?: boolean;
}

/**
 * Custom hook to detect deliberate device shakes while completely filtering out
 * normal handling, vibrations, or setting the phone down on a table.
 *
 * A true shake is characterized by multiple rapid direction reversals (oscillations)
 * with dynamic acceleration exceeding the threshold within a short time window.
 * Putting a phone on a desk generates only a single impact peak, which will never trigger.
 */
export function useDeviceShake(
  onShake: () => void,
  options: UseDeviceShakeOptions = {}
) {
  const {
    threshold = 1.4,
    minShakes = 3,
    windowMs = 650,
    timeoutMs = 1500,
    enabled = true,
  } = options;

  const lastShakeTriggerTime = useRef<number>(0);
  const shakeHistory = useRef<number[]>([]);
  const lastAccel = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    if (!enabled) return;

    // 50ms interval provides accurate capture of rapid back-and-forth shake oscillations
    Accelerometer.setUpdateInterval(50);

    const subscription = Accelerometer.addListener((data) => {
      const { x, y, z } = data;
      const now = Date.now();

      // If in cooldown period after a triggered shake, ignore
      if (now - lastShakeTriggerTime.current < timeoutMs) {
        return;
      }

      // Calculate net dynamic acceleration magnitude (Earth's 1g gravity removed)
      const totalMagnitude = Math.sqrt(x * x + y * y + z * z);
      const netAcceleration = Math.abs(totalMagnitude - 1.0);

      // Detect change in direction across axes compared to last sample
      const deltaX = Math.abs(x - lastAccel.current.x);
      const deltaY = Math.abs(y - lastAccel.current.y);
      const deltaZ = Math.abs(z - lastAccel.current.z);
      const totalDelta = deltaX + deltaY + deltaZ;

      lastAccel.current = { x, y, z };

      // A qualifying shake impulse requires both significant dynamic acceleration
      // AND substantial directional displacement
      if (netAcceleration >= threshold && totalDelta >= 1.2) {
        // Prune events outside the sliding window
        shakeHistory.current = shakeHistory.current.filter((t) => now - t <= windowMs);
        shakeHistory.current.push(now);

        // Only fire if the required number of oscillations (e.g. 3) occur within the window
        if (shakeHistory.current.length >= minShakes) {
          shakeHistory.current = [];
          lastShakeTriggerTime.current = now;

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
  }, [enabled, onShake, threshold, minShakes, windowMs, timeoutMs]);
}
