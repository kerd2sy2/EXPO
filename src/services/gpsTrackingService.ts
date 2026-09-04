import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateMyLocationApi } from './api';

export const GPS_LOCATION_TASK_NAME = 'AAMS_GPS_LOCATION_TASK';

const STORAGE_KEYS = {
  ACTIVE_SESSION_ID: '@aams_gps_active_session_id',
  DISTANCE_PREFIX: '@aams_gps_distance_',
  LAST_COORD_PREFIX: '@aams_gps_last_coord_',
};

// In-memory active watcher subscription
let activeLocationSubscription: Location.LocationSubscription | null = null;
let currentTrackingSessionId: string | null = null;
let lastServerLocationSyncTime = 0;

/**
 * Checks current location permissions and prompts for background location permission if needed.
 */
export async function checkLocationPermissionStatus(): Promise<{
  foregroundGranted: boolean;
  backgroundGranted: boolean;
}> {
  try {
    const fg = await Location.getForegroundPermissionsAsync().catch(() => null);
    const bg = await Location.getBackgroundPermissionsAsync().catch(() => null);
    return {
      foregroundGranted: fg?.status === 'granted',
      backgroundGranted: bg?.status === 'granted',
    };
  } catch {
    return { foregroundGranted: false, backgroundGranted: false };
  }
}

/**
 * Requests background location permission directly
 */
export async function requestAllLocationPermissions(): Promise<boolean> {
  try {
    const fg = await Location.requestForegroundPermissionsAsync().catch(() => null);
    if (fg?.status !== 'granted') return false;

    const bg = await Location.requestBackgroundPermissionsAsync().catch(() => null);
    return bg?.status === 'granted';
  } catch {
    return false;
  }
}

async function maybeSyncLocationToServer(latitude: number, longitude: number, speed?: number | null, heading?: number | null) {
  const now = Date.now();
  if (now - lastServerLocationSyncTime >= 30000) {
    lastServerLocationSyncTime = now;
    try {
      await updateMyLocationApi(latitude, longitude, speed, heading);
    } catch {
      // Non-fatal if offline
    }
  }
}

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

// 1. Register background location task with robust error isolation
try {
  if (!TaskManager.isTaskDefined(GPS_LOCATION_TASK_NAME)) {
    TaskManager.defineTask(GPS_LOCATION_TASK_NAME, async ({ data, error }: any) => {
      if (error) {
        console.log('[GPS Task Error]:', error.message);
        return;
      }
      if (data) {
        const { locations } = data as { locations?: Location.LocationObject[] };
        if (locations && locations.length > 0) {
          const latestLoc = locations[locations.length - 1];
          const activeId = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
          if (activeId && latestLoc?.coords) {
            await recordNewCoordinate(
              activeId,
              latestLoc.coords.latitude,
              latestLoc.coords.longitude,
              latestLoc.coords.accuracy
            ).catch(() => {});

            await maybeSyncLocationToServer(
              latestLoc.coords.latitude,
              latestLoc.coords.longitude,
              latestLoc.coords.speed,
              latestLoc.coords.heading
            ).catch(() => {});
          }
        }
      }
    });
  }
} catch (e) {
  // Ignore task registration error
}

/**
 * Cleanly unregister any native background tasks safely
 */
async function cleanLegacyNativeTask() {
  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(GPS_LOCATION_TASK_NAME).catch(() => false);
    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(GPS_LOCATION_TASK_NAME).catch(() => {});
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
 * Starts continuous GPS tracking for the active shift session (Foreground + Background when app is minimized/screen locked).
 */
export async function startGpsTracking(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;

  try {
    // If already tracking this exact session, avoid duplicate start
    if (currentTrackingSessionId === sessionId) {
      return true;
    }

    // 1. Request Foreground Permissions first
    const { status: fgStatus } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
    if (fgStatus !== 'granted') {
      return false;
    }

    // 2. Request Background Permissions (if supported and enabled)
    try {
      await Location.requestBackgroundPermissionsAsync().catch(() => {});
    } catch {}

    // 3. Save active session ID
    currentTrackingSessionId = sessionId;
    await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, sessionId);

    // 4. Remove previous foreground watcher if active
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
        await maybeSyncLocationToServer(
          initialLoc.coords.latitude,
          initialLoc.coords.longitude,
          initialLoc.coords.speed,
          initialLoc.coords.heading
        );
      }
    } catch {}

    // 6. In-process active watcher for fast updates while app is open
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

          maybeSyncLocationToServer(
            loc.coords.latitude,
            loc.coords.longitude,
            loc.coords.speed,
            loc.coords.heading
          ).catch(() => {});
        }
      }
    );

    // 7. Start Background Location updates with Foreground Service Notification (for screen lock / background)
    try {
      const isAlreadyRunning = await Location.hasStartedLocationUpdatesAsync(GPS_LOCATION_TASK_NAME).catch(() => false);
      if (!isAlreadyRunning) {
        await Location.startLocationUpdatesAsync(GPS_LOCATION_TASK_NAME, {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000, // Every 15 seconds
          distanceInterval: 15, // Or 15 meters
          deferredUpdatesInterval: 15000,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'تتبع الشفت نشط - AAMS',
            notificationBody: 'جاري تسجيل مسار العمل وتحديث موقعك على الخريطة في الطائف.',
            notificationColor: '#059669',
          },
        }).catch((bgErr) => {
          console.log('[GPS Background Start warning - safe fallback]:', bgErr);
        });
      }
    } catch (bgErr) {
      console.log('[GPS Background Not Supported or Ignored]:', bgErr);
    }

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

    // Stop background location updates safely
    await cleanLegacyNativeTask();

    const currentSessionId = sessionId || currentTrackingSessionId || (await AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID));
    let finalDist = 0;

    if (currentSessionId) {
      finalDist = await getGpsShiftDistance(currentSessionId);
    }

    currentTrackingSessionId = null;
    await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION_ID);

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
