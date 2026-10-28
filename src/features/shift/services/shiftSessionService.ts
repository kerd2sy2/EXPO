import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../../../services/api';
import { WorkSession } from '../../../types/delegate';

const ACTIVE_SESSION_CACHE_KEY = '@aams_cached_active_session';

export type ActiveSessionSyncResult =
  | { status: 'ACTIVE'; session: WorkSession; seq: number }
  | { status: 'INACTIVE'; session: null; seq: number }
  | { status: 'NETWORK_ERROR'; session: null; seq: number };

// Monotonic sequence counter & timestamp to prevent stale background responses
// from overwriting freshly started or ended shifts (Zero Race Condition Guarantee)
let sessionMutationSeq = 0;
let lastShiftStartConfirmedAt = 0;

export const shiftSessionService = {
  /**
   * Returns current mutation sequence ID to detect stale async responses
   */
  getCurrentSeq(): number {
    return sessionMutationSeq;
  },

  /**
   * Normalizes any raw session payload from API or cache into a guaranteed ACTIVE WorkSession
   */
  normalizeActiveSession(raw: any, fallbackEmployeeId?: string): WorkSession | null {
    if (!raw || typeof raw !== 'object') return null;
    const payload = raw.data && typeof raw.data === 'object' && raw.data.id ? raw.data : raw;

    if (!payload.id) return null;

    const statusUpper = String(payload.status || 'ACTIVE').toUpperCase();
    if (statusUpper !== 'ACTIVE') return null;

    const nowIso = new Date().toISOString();
    let validStartTime = nowIso;
    if (payload.start_time) {
      const parsedTime = new Date(payload.start_time).getTime();
      if (!isNaN(parsedTime) && parsedTime > 0) {
        validStartTime = payload.start_time;
      }
    }

    return {
      ...payload,
      id: String(payload.id),
      employee_id: String(payload.employee_id || fallbackEmployeeId || ''),
      start_time: validStartTime,
      start_km: Number(payload.start_km) || 0,
      end_km: Number(payload.end_km) || 0,
      distance: Number(payload.distance) || 0,
      orders_count: Number(payload.orders_count) || 0,
      fuel_cost: Number(payload.fuel_cost) || 0,
      motorcycle_number: String(payload.motorcycle_number || ''),
      status: 'ACTIVE',
    } as WorkSession;
  },

  /**
   * Reads the cached active session from device storage without ever deleting it on mount
   */
  async getCachedActiveSession(employeeId?: string): Promise<WorkSession | null> {
    try {
      const raw = await AsyncStorage.getItem(ACTIVE_SESSION_CACHE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      const normalized = this.normalizeActiveSession(parsed, employeeId);
      if (!normalized) return null;

      if (employeeId && normalized.employee_id && normalized.employee_id !== employeeId) {
        return null;
      }

      return normalized;
    } catch {
      return null;
    }
  },

  /**
   * Explicitly saves an active session to local storage
   */
  async saveCachedActiveSession(session: WorkSession): Promise<void> {
    try {
      const normalized = this.normalizeActiveSession(session, session.employee_id);
      if (normalized) {
        await AsyncStorage.setItem(ACTIVE_SESSION_CACHE_KEY, JSON.stringify(normalized));
      }
    } catch {
      // Ignore storage write errors
    }
  },

  /**
   * Explicitly removes the cached active session ONLY when shift is confirmed ended or inactive
   */
  async clearCachedActiveSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(ACTIVE_SESSION_CACHE_KEY);
    } catch {
      // Ignore storage delete errors
    }
  },

  /**
   * Called immediately when courier starts a shift so state and cache are locked in synchronously
   */
  async confirmShiftStarted(rawSession: any, employeeId: string, fallbackBike?: string, fallbackStartKm?: number): Promise<WorkSession> {
    sessionMutationSeq += 1;
    lastShiftStartConfirmedAt = Date.now();

    const normalized =
      this.normalizeActiveSession(rawSession, employeeId) ||
      ({
        id: String(rawSession?.id || `local_${Date.now()}`),
        employee_id: employeeId,
        start_time: rawSession?.start_time || new Date().toISOString(),
        end_time: null,
        start_km: Number(rawSession?.start_km ?? fallbackStartKm ?? 0),
        end_km: 0,
        distance: 0,
        orders_count: 0,
        fuel_cost: 0,
        motorcycle_number: String(rawSession?.motorcycle_number || fallbackBike || ''),
        status: 'ACTIVE',
      } as WorkSession);

    await this.saveCachedActiveSession(normalized);
    return normalized;
  },

  /**
   * Called immediately when courier ends a shift or logs out
   */
  async confirmShiftEnded(): Promise<void> {
    sessionMutationSeq += 1;
    lastShiftStartConfirmedAt = 0;
    await this.clearCachedActiveSession();
  },

  /**
   * Queries backend for the active session while distinguishing between:
   * 1. ACTIVE: Active shift exists on server
   * 2. INACTIVE: Server explicitly confirmed 404 / no active shift
   * 3. NETWORK_ERROR: Offline / timeout / 5xx — NEVER wipes local active session!
   */
  async syncWithServer(employeeId: string): Promise<ActiveSessionSyncResult> {
    const requestSeq = sessionMutationSeq;

    try {
      const data = await apiRequest<WorkSession>(`/work/active?employee_id=${employeeId}`, {
        timeoutMs: 10000,
        retries: 1,
      });

      const normalized = this.normalizeActiveSession(data, employeeId);
      if (normalized) {
        if (requestSeq === sessionMutationSeq) {
          await this.saveCachedActiveSession(normalized);
        }
        return { status: 'ACTIVE', session: normalized, seq: requestSeq };
      }

      // Server returned 200 OK but without an active session
      if (requestSeq === sessionMutationSeq && Date.now() - lastShiftStartConfirmedAt > 5000) {
        await this.clearCachedActiveSession();
      }
      return { status: 'INACTIVE', session: null, seq: requestSeq };
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      const isExplicitlyNoActiveShift =
        msg.includes('لا يوجد شفت نشط') ||
        msg.includes('لا يوجد شفت') ||
        msg.includes('no active session') ||
        msg.includes('404');

      if (isExplicitlyNoActiveShift) {
        // Protect against a race condition right after starting a shift
        if (Date.now() - lastShiftStartConfirmedAt <= 5000) {
          const cached = await this.getCachedActiveSession(employeeId);
          if (cached) {
            return { status: 'ACTIVE', session: cached, seq: requestSeq };
          }
        }

        if (requestSeq === sessionMutationSeq) {
          await this.clearCachedActiveSession();
        }
        return { status: 'INACTIVE', session: null, seq: requestSeq };
      }

      // Transient network error, offline state, or server timeout: preserve cached session!
      return { status: 'NETWORK_ERROR', session: null, seq: requestSeq };
    }
  },
};

