import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const GPS_LOCATION_TASK_NAME = 'AAMS_GPS_LOCATION_TASK';

const STORAGE_KEYS = {
  ACTIVE_SESSION_ID: '@aams_gps_active_session_id',
  DISTANCE_PREFIX: '@aams_gps_distance_',
  LAST_COORD_PREFIX: '@aams_gps_last_coord_',
};

// In-memory active watcher subscription
let activeLocationSubscription: Location.LocationSubscription | null = null;
let currentTrackingSessionId: string | null = null;

/**
 * Calculates distance between two GPS coordinates using the Haversine formula (in kilometers).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;
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

// Fallback no-op task definition to safely absorb any legacy native triggers without crashing
try {
  if (!TaskManager.isTaskDefined(GPS_LOCATION_TASK_NAME)) {
    TaskManager.defineTask(GPS_LOCATION_TASK_NAME, async () => {
      // Legacy task absorption - intentionally no-op to prevent native crash
    });
  }
} catch (e) {
  // Ignore task registration error
}

/**
 * Cleanly unregister any legacy native background tasks to stop crash loops
 */
async function cleanLegacyNativeTask() {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(GPS_LOCATION_TASK_NAME).catch(() => false);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(GPS_LOCATION_TASK_NAME).catch(() => {});
    }
    if (TaskManager.isTaskDefined(GPS_LOCATION_TASK_NAME)) {
      await TaskManager.unregisterTaskAsync(GPS_LOCATION_TASK_NAME).catch(() => {});
    }
  } catch (err) {
    // Silently ignore cleanup errors
  }
}

/**
 * Process new GPS coordinate reading safely
 */
async function recordNewCoordinate(sessionId: string, latitude: number, longitude: number, accuracy?: number | null) {
  if (!sessionId) return;
  // Ignore coarse/inaccurate GPS readings (> 45 meters)
  if (accuracy && accuracy > 45) return;

  try {
    const distKey = `${STORAGE_KEYS.DISTANCE_PREFIX}${sessionId}`;
    const coordKey = `${STORAGE_KEYS.LAST_COORD_PREFIX}${sessionId}`;

    let currentTotal = parseFloat((await AsyncStorage.getItem(distKey)) || '0') || 0;
    const lastCoordStr = await AsyncStorage.getItem(coordKey);
    let lastCoord: { lat: number; lon: number } | null = lastCoordStr
      ? JSON.parse(lastCoordStr)
      : null;

    if (lastCoord && typeof lastCoord.lat === 'number' && typeof lastCoord.lon === 'number') {
      const deltaKm = calculateHaversineDistance(
        lastCoord.lat,
        lastCoord.lon,
        latitude,
        longitude
      );

      // Only accumulate if moved at least 15 meters and not an unrealistic teleport (> 3 km in a few seconds)
      if (deltaKm >= 0.015 && deltaKm < 3.0) {
        currentTotal += deltaKm;
        await AsyncStorage.setItem(distKey, currentTotal.toFixed(3));
        await AsyncStorage.setItem(coordKey, JSON.stringify({ lat: latitude, lon: longitude }));
      }
    } else {
      await AsyncStorage.setItem(coordKey, JSON.stringify({ lat: latitude, lon: longitude }));
    }
  } catch (e) {
    // Non-fatal
  }
}

/**
 * Starts safe, crash-proof GPS tracking for the active shift session.
 */
export async function startGpsTracking(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;

  try {
    // If already tracking this exact session, avoid restarting listener
    if (activeLocationSubscription && currentTrackingSessionId === sessionId) {
      return true;
    }

    // 1. Unregister any legacy crash-inducing Android foreground tasks
    await cleanLegacyNativeTask();

    // 2. Request Foreground Permissions only (safe, never triggers Samsung deep sleep warning)
    const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
    if (status !== 'granted') {
      return false;
    }

    // 3. Save active session ID
    currentTrackingSessionId = sessionId;
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, sessionId);

    // 4. Remove previous listener if active
    if (activeLocationSubscription) {
      try {
        activeLocationSubscription.remove();
      } catch {}
      activeLocationSubscription = null;
    }

    // 5. Initial position check with quick timeout
    try {
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000));
      const initialLoc = await Promise.race([locationPromise, timeoutPromise]);
      if (initialLoc && 'coords' in initialLoc && initialLoc.coords) {
        await recordNewCoordinate(
          sessionId,
          initialLoc.coords.latitude,
          initialLoc.coords.longitude,
          initialLoc.coords.accuracy
        );
      }
    } catch {}

    // 6. Safe in-process location watcher (no foreground service, zero native crash risk)
    activeLocationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 4000,
        distanceInterval: 15,
      },
      (loc) => {
        if (loc?.coords) {
          recordNewCoordinate(
            sessionId,
            loc.coords.latitude,
            loc.coords.longitude,
            loc.coords.accuracy
          ).catch(() => {});
        }
      }
    );

    return true;
  } catch (err) {
    console.log('[GPS startTracking safe warning]:', err);
    return false;
  }
}

/**
 * Stops GPS tracking and cleans active tracking session.
 */
export async function stopGpsTracking(sessionId?: string): Promise<number> {
  try {
    if (activeLocationSubscription) {
      try {
        activeLocationSubscription.remove();
      } catch {}
      activeLocationSubscription = null;
    }

    const currentSessionId = sessionId || currentTrackingSessionId || (await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID));
    let finalDist = 0;

    if (currentSessionId) {
      finalDist = await getGpsShiftDistance(currentSessionId);
    }

    currentTrackingSessionId = null;
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
    await cleanLegacyNativeTask();

    return finalDist;
  } catch (err) {
    console.log('[GPS stopTracking safe warning]:', err);
    return 0;
  }
}

/**
 * Gets the total accumulated GPS distance (in km) recorded for a given session.
 */
export async function getGpsShiftDistance(sessionId: string): Promise<number> {
  try {
    if (!sessionId) return 0;
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
    if (!sessionId) return;
    await AsyncStorage.removeItem(`${STORAGE_KEYS.DISTANCE_PREFIX}${sessionId}`);
    await AsyncStorage.removeItem(`${STORAGE_KEYS.LAST_COORD_PREFIX}${sessionId}`);
  } catch (e) {}
}
