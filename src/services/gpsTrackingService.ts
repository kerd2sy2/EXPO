import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const GPS_LOCATION_TASK_NAME = 'AAMS_GPS_LOCATION_TASK';

const STORAGE_KEYS = {
  ACTIVE_SESSION_ID: '@aams_gps_active_session_id',
  DISTANCE_PREFIX: '@aams_gps_distance_',
  LAST_COORD_PREFIX: '@aams_gps_last_coord_',
};

/**
 * Calculates distance between two GPS coordinates using the Haversine formula (in kilometers).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Background Location Task Definition
TaskManager.defineTask(GPS_LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[GPS Task Error]:', error.message);
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (!locations || locations.length === 0) return;

    try {
      const sessionId = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
      if (!sessionId) return;

      const distKey = `${STORAGE_KEYS.DISTANCE_PREFIX}${sessionId}`;
      const coordKey = `${STORAGE_KEYS.LAST_COORD_PREFIX}${sessionId}`;

      let currentTotal = parseFloat((await AsyncStorage.getItem(distKey)) || '0') || 0;
      const lastCoordStr = await AsyncStorage.getItem(coordKey);
      let lastCoord: { lat: number; lon: number } | null = lastCoordStr
        ? JSON.parse(lastCoordStr)
        : null;

      for (const loc of locations) {
        const { latitude, longitude, accuracy } = loc.coords;

        // Filter out highly inaccurate GPS noise (e.g. accuracy worse than 40 meters)
        if (accuracy && accuracy > 40) continue;

        if (lastCoord) {
          const deltaKm = calculateHaversineDistance(
            lastCoord.lat,
            lastCoord.lon,
            latitude,
            longitude
          );

          // Only accumulate if moved at least 15 meters (0.015 km) and not an unrealistic teleport (> 2 km in seconds)
          if (deltaKm >= 0.015 && deltaKm < 3.0) {
            currentTotal += deltaKm;
            lastCoord = { lat: latitude, lon: longitude };
          }
        } else {
          lastCoord = { lat: latitude, lon: longitude };
        }
      }

      await AsyncStorage.setItem(distKey, currentTotal.toFixed(3));
      if (lastCoord) {
        await AsyncStorage.setItem(coordKey, JSON.stringify(lastCoord));
      }
    } catch (e) {
      console.warn('[GPS Task Storage Error]:', e);
    }
  }
});

/**
 * Starts automatic GPS tracking in foreground and background for the active shift session.
 */
export async function startGpsTracking(sessionId: string): Promise<boolean> {
  try {
    // 1. Request Foreground Permissions
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
    if (fgStatus !== 'granted') {
      console.log('[GPS]: Foreground location permission not granted');
      return false;
    }

    // 2. Request Background Permissions (Allow all the time)
    try {
      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
      if (bgStatus !== 'granted') {
        console.log('[GPS]: Background location permission optional / foreground active');
      }
    } catch (bgErr) {
      console.log('[GPS]: Background permission request skipped:', bgErr);
    }

    // 3. Save active session ID
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, sessionId);

    // 4. Initialize starting position
    const currentLoc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    if (currentLoc?.coords) {
      await AsyncStorage.setItem(
        `${STORAGE_KEYS.LAST_COORD_PREFIX}${sessionId}`,
        JSON.stringify({
          lat: currentLoc.coords.latitude,
          lon: currentLoc.coords.longitude,
        })
      );
    }

    // 5. Start Background Updates if supported
    const isTaskDefined = TaskManager.isTaskDefined(GPS_LOCATION_TASK_NAME);
    if (isTaskDefined) {
      const hasStarted = await Location.hasStartedLocationUpdatesAsync(GPS_LOCATION_TASK_NAME);
      if (!hasStarted) {
        await Location.startLocationUpdatesAsync(GPS_LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 4000,
          distanceInterval: 15,
          deferredUpdatesInterval: 4000,
          showsBackgroundLocationIndicator: true,
          pausesUpdatesAutomatically: false,
          foregroundService: {
            notificationTitle: 'تطبيق مناديب AAMS (الشفت نشط)',
            notificationBody: 'جاري تسجيل الكيلومترات المقطوعة وتتبع المسار تلقائياً...',
            notificationColor: '#f97316',
          },
        });
      }
    }

    return true;
  } catch (err) {
    console.warn('[GPS startTracking error]:', err);
    return false;
  }
}

/**
 * Stops GPS background tracking and cleans active tracking session.
 */
export async function stopGpsTracking(sessionId?: string): Promise<number> {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(GPS_LOCATION_TASK_NAME);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(GPS_LOCATION_TASK_NAME);
    }

    const currentSessionId = sessionId || (await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID));
    let finalDist = 0;

    if (currentSessionId) {
      finalDist = await getGpsShiftDistance(currentSessionId);
    }

    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
    return finalDist;
  } catch (err) {
    console.warn('[GPS stopTracking error]:', err);
    return 0;
  }
}

/**
 * Gets the total accumulated GPS distance (in km) recorded for a given session.
 */
export async function getGpsShiftDistance(sessionId: string): Promise<number> {
  try {
    const distKey = `${STORAGE_KEYS.DISTANCE_PREFIX}${sessionId}`;
    const stored = await AsyncStorage.getItem(distKey);
    const parsed = parseFloat(stored || '0');
    return isNaN(parsed) ? 0 : Math.round(parsed * 10) / 10;
  } catch (e) {
    return 0;
  }
}

/**
 * Cleans up stored GPS data for a session after completion.
 */
export async function clearGpsShiftData(sessionId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${STORAGE_KEYS.DISTANCE_PREFIX}${sessionId}`);
    await AsyncStorage.removeItem(`${STORAGE_KEYS.LAST_COORD_PREFIX}${sessionId}`);
  } catch (e) {}
}
