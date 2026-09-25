// GPS Tracking completely disabled per user request
// All location services and background tasks have been fully deactivated to prevent crashes.

export const GPS_LOCATION_TASK_NAME = 'AAMS_GPS_LOCATION_TASK';

/**
 * No-op check returning granted so no popups or permission blocks occur.
 */
export async function checkLocationPermissionStatus(): Promise<{
  foregroundGranted: boolean;
  backgroundGranted: boolean;
}> {
  return { foregroundGranted: true, backgroundGranted: true };
}

/**
 * No-op request returning true.
 */
export async function requestAllLocationPermissions(): Promise<boolean> {
  return true;
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

/**
 * Starts continuous GPS tracking - completely disabled, safe no-op.
 */
export async function startGpsTracking(_sessionId?: string): Promise<boolean> {
  return true;
}

/**
 * Stops GPS tracking - completely disabled, safe no-op.
 */
export async function stopGpsTracking(_sessionId?: string): Promise<number> {
  return 0;
}

/**
 * Gets the total accumulated GPS distance - disabled, returns 0.
 */
export async function getGpsShiftDistance(_sessionId?: string): Promise<number> {
  return 0;
}

/**
 * Cleans up stored GPS data - safe no-op.
 */
export async function clearGpsShiftData(_sessionId?: string): Promise<void> {
  // No-op
}
