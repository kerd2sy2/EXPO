import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Updates from 'expo-updates';

export interface DebugErrorLog {
  id: string;
  timestamp: string;
  source: 'UNHANDLED_EXCEPTION' | 'REACT_ERROR_BOUNDARY' | 'PROMISE_REJECTION' | 'GPS_TRACKING' | 'API_NETWORK' | 'OTA_UPDATES' | 'MANUAL';
  message: string;
  stack?: string;
  details?: Record<string, any>;
}

const ERROR_LOGS_STORAGE_KEY = '@aams_debug_error_logs_v1';
const MAX_LOGS = 60;

// In-memory cache for fast access
let inMemoryLogs: DebugErrorLog[] = [];
let isInitialized = false;

/**
 * Initialize the global error interception system
 */
export function initGlobalErrorLogger() {
  if (isInitialized) return;
  isInitialized = true;

  // 1. Load existing persisted logs
  loadLogsFromStorage().catch(() => {});

  // 2. Intercept global unhandled JS errors (React Native ErrorUtils)
  try {
    const g = globalThis as any;
    const globalHandler = g.ErrorUtils?.getGlobalHandler?.();
    g.ErrorUtils?.setGlobalHandler?.(async (error: any, isFatal?: boolean) => {
      try {
        await logDebugError(
          'UNHANDLED_EXCEPTION',
          error?.message || String(error),
          error?.stack,
          { isFatal: Boolean(isFatal) }
        );
      } catch {}

      // Call original handler to maintain standard crash behaviors if fatal
      if (globalHandler) {
        globalHandler(error, isFatal);
      }
    });
  } catch (e) {
    console.log('[ErrorLogger]: ErrorUtils setup notice:', e);
  }

  // 3. Intercept unhandled promise rejections if available
  try {
    const tracking = require('promise/setimmediate/rejection-tracking');
    if (tracking?.enable) {
      tracking.enable({
        allRejections: true,
        onUnhandled: (id: string, rejection: any) => {
          logDebugError(
            'PROMISE_REJECTION',
            rejection?.message || String(rejection),
            rejection?.stack,
            { promiseId: id }
          ).catch(() => {});
        },
      });
    }
  } catch {}
}

async function loadLogsFromStorage(): Promise<DebugErrorLog[]> {
  try {
    const raw = await AsyncStorage.getItem(ERROR_LOGS_STORAGE_KEY);
    if (raw) {
      inMemoryLogs = JSON.parse(raw);
    }
  } catch {
    inMemoryLogs = [];
  }
  return inMemoryLogs;
}

/**
 * Log an error into the persistent diagnostics store
 */
export async function logDebugError(
  source: DebugErrorLog['source'],
  message: string,
  stack?: string,
  details?: Record<string, any>
): Promise<void> {
  const newLog: DebugErrorLog = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    source,
    message: String(message || 'Unknown Error'),
    stack: stack ? String(stack) : undefined,
    details,
  };

  inMemoryLogs = [newLog, ...inMemoryLogs].slice(0, MAX_LOGS);

  try {
    await AsyncStorage.setItem(ERROR_LOGS_STORAGE_KEY, JSON.stringify(inMemoryLogs));
  } catch (e) {
    // Non-fatal
  }
}

/**
 * Retrieve all recorded error logs
 */
export async function getErrorLogs(): Promise<DebugErrorLog[]> {
  if (inMemoryLogs.length > 0) {
    return inMemoryLogs;
  }
  return await loadLogsFromStorage();
}

/**
 * Clear all recorded error logs
 */
export async function clearErrorLogs(): Promise<void> {
  inMemoryLogs = [];
  try {
    await AsyncStorage.removeItem(ERROR_LOGS_STORAGE_KEY);
  } catch {}
}

/**
 * Collect system and runtime diagnostics
 */
export async function getSystemDiagnostics(): Promise<Record<string, any>> {
  return {
    appVersion: '1.0.0',
    platform: Platform.OS,
    platformVersion: Platform.Version,
    brand: Device.brand || 'Unknown',
    modelName: Device.modelName || 'Unknown',
    deviceYearClass: Device.deviceYearClass || null,
    totalMemoryMB: Device.totalMemory ? Math.round(Device.totalMemory / (1024 * 1024)) : null,
    runtimeVersion: Updates.runtimeVersion || 'appVersion',
    updateId: Updates.updateId || 'embedded',
    channel: Updates.channel || 'default',
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    createdAt: new Date().toISOString(),
  };
}
