import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';

interface UseShakeDetectionOptions {
  enabled?: boolean;
  cooldownMs?: number;
  onShake: () => void;
}

/**
 * Intelligent Hand-Shake Detector for Delivery Drivers.
 *
 * SPECIFICALLY DESIGNED TO PREVENT FALSE TRIGGERS FROM:
 *  - Road bumps & speed bumps (مطبات)
 *  - Potholes & rough asphalt
 *  - Motorcycle mount wobble & engine vibration
 *
 * ONLY TRIGGERS ON:
 *  - Intentional physical hand shaking (4+ rapid alternating direction reversals
 *    in X or Y within a 1.2s window, requiring deliberate user shaking).
 */
export function useShakeDetection({
  enabled = true,
  cooldownMs = 8000,
  onShake,
}: UseShakeDetectionOptions) {
  const lastTriggerTimeRef = useRef<number>(0);
  const lastSampleRef = useRef<{ x: number; y: number; z: number; time: number }>({
    x: 0,
    y: 0,
    z: 0,
    time: 0,
  });
  const lastDirectionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const shakeHistoryRef = useRef<number[]>([]);

  const onShakeRef = useRef(onShake);
  onShakeRef.current = onShake;

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    let subscription: { remove: () => void } | null = null;

    const setupListener = async () => {
      try {
        const available = await Accelerometer.isAvailableAsync();
        if (!available) return;

        // Sample at 50ms interval for responsive gesture tracking
        Accelerometer.setUpdateInterval(50);

        subscription = Accelerometer.addListener(({ x, y, z }) => {
          const now = Date.now();

          // Don't trigger if within cooldown period
          if (now - lastTriggerTimeRef.current < cooldownMs) {
            lastSampleRef.current = { x, y, z, time: now };
            return;
          }

          const prev = lastSampleRef.current;
          const dt = now - prev.time;
          lastSampleRef.current = { x, y, z, time: now };

          if (dt <= 0) return;

          // Measure acceleration delta on lateral axes (X: horizontal shake, Y: vertical shake)
          const deltaX = x - prev.x;
          const deltaY = y - prev.y;

          // Swing threshold (requires deliberate hand movement > 2.0G delta)
          const SWING_THRESHOLD = 2.0;
          let detectedReversal = false;

          // 1. Check X-axis reversal (Left <-> Right)
          if (Math.abs(deltaX) > SWING_THRESHOLD) {
            const currentDirX = deltaX > 0 ? 1 : -1;
            if (lastDirectionRef.current.x !== 0 && currentDirX !== lastDirectionRef.current.x) {
              detectedReversal = true;
            }
            lastDirectionRef.current.x = currentDirX;
          }

          // 2. Check Y-axis reversal (Up <-> Down)
          if (Math.abs(deltaY) > SWING_THRESHOLD) {
            const currentDirY = deltaY > 0 ? 1 : -1;
            if (lastDirectionRef.current.y !== 0 && currentDirY !== lastDirectionRef.current.y) {
              detectedReversal = true;
            }
            lastDirectionRef.current.y = currentDirY;
          }

          if (detectedReversal) {
            const history = shakeHistoryRef.current;
            const lastReversalTime = history.length > 0 ? history[history.length - 1] : 0;
            const timeSinceLastReversal = now - lastReversalTime;

            // Reject high-frequency mount chatter (< 110ms)
            if (timeSinceLastReversal >= 110) {
              history.push(now);

              // Sliding window of 1200ms
              const validWindow = 1200;
              const filtered = history.filter((t) => now - t <= validWindow);
              shakeHistoryRef.current = filtered;

              // Must reach at least 4 alternating swings (2 full back-and-forth shake cycles)
              if (filtered.length >= 4) {
                lastTriggerTimeRef.current = now;
                shakeHistoryRef.current = [];
                lastDirectionRef.current = { x: 0, y: 0 };

                try {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                } catch {}

                onShakeRef.current();
              }
            }
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
  }, [enabled, cooldownMs]);
}

