import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { logDebugError } from './errorLogger';

// Hosted Backend API URL (Cloudflare Enterprise Custom Domain)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://api.kerd2sy.com/api/v1';

/**
 * Formats any image URL (relative /uploads/ path or absolute URL) to a fully qualified URL for mobile rendering
 */
export const formatImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:') || trimmed.startsWith('file:')) {
    return trimmed;
  }
  const cleanUrl = trimmed.replace(/^\/+/, '');
  const baseDomain = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
  if (cleanUrl.startsWith('uploads/')) {
    return `${baseDomain}/${cleanUrl}`;
  }
  return `${baseDomain}/uploads/${cleanUrl}`;
};

const TOKEN_KEY = 'aams_delegate_token';
const REFRESH_TOKEN_KEY = 'aams_delegate_refresh_token';
const USER_KEY = 'aams_delegate_user';

let storedToken: string | null = null;
let storedRefreshToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

// Initialize token & refresh token from AsyncStorage
export const loadStoredToken = async (): Promise<string | null> => {
  try {
    const [token, rToken] = await Promise.all([
      AsyncStorage.getItem(TOKEN_KEY),
      AsyncStorage.getItem(REFRESH_TOKEN_KEY),
    ]);
    if (token) {
      storedToken = token;
    }
    if (rToken) {
      storedRefreshToken = rToken;
    }
    return storedToken;
  } catch (e) {
    console.log('Error reading token from AsyncStorage:', e);
  }
  return null;
};

export const loadStoredRefreshToken = async (): Promise<string | null> => {
  try {
    const rToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    if (rToken) {
      storedRefreshToken = rToken;
      return rToken;
    }
  } catch (e) {
    console.log('Error reading refresh token from AsyncStorage:', e);
  }
  return null;
};

// Set / Remove Auth Token & Refresh Token
export const setAuthToken = async (
  token: string | null,
  refreshToken?: string | null
): Promise<void> => {
  storedToken = token;
  if (refreshToken !== undefined) {
    storedRefreshToken = refreshToken;
  }
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    } else {
      storedRefreshToken = null;
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
    }
  } catch (e) {
    console.log('Error saving token to AsyncStorage:', e);
  }
};

// Synchronous getters for in-flight requests
export const getStoredToken = (): string | null => {
  return storedToken;
};

export const getStoredRefreshToken = (): string | null => {
  return storedRefreshToken;
};

type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export const onSessionExpired = (listener: SessionExpiredListener) => {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
};

let lastExpiredTrigger = 0;
export const triggerSessionExpired = () => {
  const now = Date.now();
  if (now - lastExpiredTrigger < 4000) return; // debounce 4s
  lastExpiredTrigger = now;
  sessionExpiredListeners.forEach((cb) => {
    try {
      cb();
    } catch (e) {
      console.error('Error in sessionExpired listener:', e);
    }
  });
};

/**
 * Centrally refresh the auth token using the stored refresh_token.
 * Uses a promise lock to ensure concurrent requests share the same refresh call.
 */
export const refreshAuthToken = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      let rToken = storedRefreshToken;
      if (!rToken) {
        rToken = await loadStoredRefreshToken();
      }

      if (!rToken) {
        console.log('[Auth] No refresh token available to refresh session');
        return null;
      }

      console.log('[Auth] Attempting token refresh via /auth/refresh...');
      let response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({ refresh_token: rToken }),
      });

      // Fallback: if /auth/refresh returned 404, try /refresh
      if (response.status === 404) {
        console.log('[Auth] /auth/refresh returned 404, trying /refresh fallback...');
        const altUrl = API_BASE_URL.endsWith('/api/v1')
          ? `${API_BASE_URL}/refresh`
          : `${API_BASE_URL}/api/v1/refresh`;
        response = await fetch(altUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ refresh_token: rToken }),
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.warn('[Auth] Token refresh failed with status', response.status, errData);
        // Only trigger session expired if definitively rejected by server (401/403) and not a transient issue
        if (response.status === 401 || response.status === 403) {
          console.log('[Auth] Refresh token expired or rejected by server.');
        }
        return null;
      }

      const data = await response.json();
      if (data?.access_token) {
        const newAccess = data.access_token;
        const newRefresh = data.refresh_token || rToken;
        await setAuthToken(newAccess, newRefresh);

        // Update biometrics if enabled
        const bioOn = await isBiometricEnabled();
        if (bioOn) {
          const saved = await getSavedCredentialsForBiometrics();
          if (saved) {
            await saveLastCredentialsForBiometrics(
              saved.nationalId,
              newAccess,
              saved.user,
              newRefresh
            );
          }
        }
        console.log('[Auth] Token refreshed successfully!');
        return newAccess;
      }
      return null;
    } catch (e: any) {
      console.error('[Auth] Exception during refreshAuthToken:', e);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Persist / Retrieve Cached User Profile
export const saveCachedUser = async (user: any): Promise<void> => {
  try {
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }
  } catch (e) {
    console.log('Error saving user to AsyncStorage:', e);
  }
};

export const getCachedUser = async (): Promise<any | null> => {
  try {
    const json = await AsyncStorage.getItem(USER_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
};

const LAST_SAVED_CREDENTIALS_KEY = 'aams_last_saved_credentials';
const BIOMETRIC_ENABLED_KEY = 'aams_biometric_enabled';

export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const val = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
};

export const setBiometricEnabled = async (enabled: boolean): Promise<void> => {
  try {
    if (enabled) {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    } else {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
      await clearSavedBiometrics();
    }
  } catch (e) {
    console.log('Error setting biometric status:', e);
  }
};

export const saveLastCredentialsForBiometrics = async (
  nationalId: string,
  token: string,
  user: any,
  refreshToken?: string
): Promise<void> => {
  try {
    const rToken = refreshToken || storedRefreshToken;
    const data = {
      nationalId,
      token,
      refreshToken: rToken,
      user,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(LAST_SAVED_CREDENTIALS_KEY, JSON.stringify(data));
  } catch (e) {
    console.log('Error saving biometric credentials:', e);
  }
};

export const getSavedCredentialsForBiometrics = async (): Promise<{
  nationalId: string;
  token: string;
  refreshToken?: string;
  user: any;
} | null> => {
  try {
    const enabled = await isBiometricEnabled();
    if (!enabled) return null;
    const raw = await AsyncStorage.getItem(LAST_SAVED_CREDENTIALS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearSavedBiometrics = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(LAST_SAVED_CREDENTIALS_KEY);
  } catch {}
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number; retries?: number } = {}
): Promise<T> {
  const { timeoutMs = 30000, retries = 1, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Ensure token is loaded if not already in memory
    let token = getStoredToken();
    if (!token) {
      token = await loadStoredToken();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      let response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: fetchOptions.signal || controller.signal,
      });

      // Intercept 401 Unauthorized and attempt token refresh
      const isAuthEndpoint =
        endpoint.includes('/login') ||
        endpoint.includes('/auth/login') ||
        endpoint.includes('/refresh') ||
        endpoint.includes('/auth/refresh') ||
        endpoint.includes('/auth/verify-otp');

      if (response.status === 401 && !isAuthEndpoint) {
        console.log(`[apiRequest] 401 on ${endpoint}, attempting automatic token refresh...`);
        const newToken = await refreshAuthToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(url, {
            ...fetchOptions,
            headers,
            signal: fetchOptions.signal || controller.signal,
          });
        } else {
          // Refresh failed
          triggerSessionExpired();
        }
      }

      const text = await response.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { message: text };
      }

      if (!response.ok) {
        const errorMsg = data?.error || data?.message || `خطأ في الخادم (${response.status})`;
        // Log to diagnostics if severe
        if (response.status >= 500 || response.status === 401) {
          logDebugError('API_NETWORK', `[API ${response.status}] ${endpoint}: ${errorMsg}`, undefined, {
            url,
            status: response.status,
            endpoint,
          }).catch(() => {});
        }
        throw new Error(errorMsg);
      }

      return data;
    } catch (err: any) {
      lastError = err;
      const errMsg = (err?.message || '').toLowerCase();
      const isNetworkOrAbort =
        err?.name === 'AbortError' ||
        errMsg.includes('canceled') ||
        errMsg.includes('cancelled') ||
        errMsg.includes('abort') ||
        errMsg.includes('timeout') ||
        errMsg.includes('fetch failed') ||
        errMsg.includes('network request failed');

      if (attempt < retries && isNetworkOrAbort) {
        // Brief pause before retry
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }

      if (isNetworkOrAbort) {
        logDebugError('API_NETWORK', `انقطاع اتصال أثناء استدعاء ${endpoint}`, err?.stack, {
          url,
          endpoint,
          attempt,
        }).catch(() => {});
        throw new Error('تعذر الاتصال بالخادم، يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError;
}

// ------------------------------------------------------------------
// Trusted Device & OTP Verification API
// ------------------------------------------------------------------
const DEVICE_UUID_KEY = 'aams_device_uuid';
const TRUSTED_DEVICE_PREFIX = 'aams_trusted_device_';

export const getDeviceDisplayName = (): string => {
  const model = Device.modelName;
  const brand = Device.brand ? Device.brand.charAt(0).toUpperCase() + Device.brand.slice(1) : '';
  const manufacturer = Device.manufacturer ? Device.manufacturer.charAt(0).toUpperCase() + Device.manufacturer.slice(1) : '';
  const devName = Device.deviceName;

  if (model) {
    if (brand && !model.toLowerCase().includes(brand.toLowerCase())) {
      return `${brand} ${model}`;
    }
    return model;
  }
  if (devName && !devName.toLowerCase().includes('phone') && !devName.toLowerCase().includes('android')) {
    return devName;
  }
  if (manufacturer && brand && manufacturer.toLowerCase() !== brand.toLowerCase()) {
    return `${manufacturer} ${brand}`;
  }
  if (brand || manufacturer) {
    return `${brand || manufacturer} Device`;
  }
  return Platform.OS === 'ios' ? 'Apple iPhone' : 'Android Device';
};

export const getDeviceOsDisplay = (): string => {
  const os = Device.osName || (Platform.OS === 'ios' ? 'iOS' : 'Android');
  const ver = Device.osVersion || Platform.Version || '';
  return `${os} ${ver}`.trim();
};

export const getOrCreateDeviceUUID = async (): Promise<string> => {
  try {
    let uuid = await AsyncStorage.getItem(DEVICE_UUID_KEY);
    if (!uuid) {
      uuid = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      await AsyncStorage.setItem(DEVICE_UUID_KEY, uuid);
    }
    return uuid;
  } catch {
    return 'dev_' + Date.now();
  }
};

export const setDeviceTrustedForNationalId = async (nationalId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(`${TRUSTED_DEVICE_PREFIX}${nationalId}`, 'true');
  } catch (e) {
    console.log('Error setting trusted device:', e);
  }
};

export const isDeviceTrustedForNationalId = async (nationalId: string): Promise<boolean> => {
  try {
    const val = await AsyncStorage.getItem(`${TRUSTED_DEVICE_PREFIX}${nationalId}`);
    return val === 'true';
  } catch {
    return false;
  }
};

export const requestOtpApi = async (
  nationalId: string,
  deviceInfo?: string
): Promise<{ success: boolean; message: string; national_id: string; employee_name: string; expires_at: string }> => {
  const deviceUuid = await getOrCreateDeviceUUID();
  const info = deviceInfo || `${getDeviceDisplayName()} (${getDeviceOsDisplay()})`;
  return apiRequest('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({
      national_id: nationalId,
      device_info: info,
      device_uuid: deviceUuid,
    }),
  });
};

export const verifyOtpApi = async (nationalId: string, otpCode: string): Promise<any> => {
  const deviceUuid = await getOrCreateDeviceUUID();
  const res = await apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({
      national_id: nationalId,
      otp_code: otpCode,
      device_uuid: deviceUuid,
    }),
  });
  if (res?.access_token) {
    await setAuthToken(res.access_token, res.refresh_token);
    await setDeviceTrustedForNationalId(nationalId);
    if (res.employee) {
      await saveCachedUser(res.employee);
      const bioOn = await isBiometricEnabled();
      if (bioOn) {
        await saveLastCredentialsForBiometrics(nationalId, res.access_token, res.employee, res.refresh_token);
      }
    }
  }
  return res;
};

export const changeMyPasswordApi = async (
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> => {
  return apiRequest('/employees/me/change-password', {
    method: 'POST',
    body: JSON.stringify({
      old_password: oldPassword.trim(),
      new_password: newPassword.trim(),
    }),
  });
};

export const setMyPhoneApi = async (
  phone: string
): Promise<{ success: boolean; message: string; phone: string; employee: any }> => {
  return apiRequest('/employees/me/phone', {
    method: 'POST',
    body: JSON.stringify({
      phone: phone.trim(),
    }),
  });
};

export const updateMyLocationApi = async (
  latitude: number,
  longitude: number,
  speed?: number | null,
  heading?: number | null,
  isVPN?: boolean,
  isMockLocation?: boolean
): Promise<{ success: boolean; message: string }> => {
  return apiRequest('/employees/me/location', {
    method: 'POST',
    body: JSON.stringify({
      latitude,
      longitude,
      speed: speed ?? undefined,
      heading: heading ?? undefined,
      is_vpn: isVPN ?? false,
      is_mock_location: isMockLocation ?? false,
    }),
  });
};

export interface TrustedDeviceItem {
  uuid: string;
  name: string;
  os: string;
  trustedAt: string;
  isCurrent: boolean;
}

export const getTrustedDevicesList = async (nationalId: string): Promise<TrustedDeviceItem[]> => {
  try {
    const isTrusted = await isDeviceTrustedForNationalId(nationalId);
    const uuid = await getOrCreateDeviceUUID();
    let rawList = await AsyncStorage.getItem(`aams_device_list_${nationalId}`);
    let list: TrustedDeviceItem[] = rawList ? JSON.parse(rawList) : [];

    const realName = getDeviceDisplayName();
    const realOs = getDeviceOsDisplay();

    if (isTrusted) {
      const existingIdx = list.findIndex((d) => d.uuid === uuid);
      if (existingIdx === -1) {
        const currentItem: TrustedDeviceItem = {
          uuid,
          name: realName,
          os: realOs,
          trustedAt: new Date().toISOString(),
          isCurrent: true,
        };
        list.unshift(currentItem);
        await AsyncStorage.setItem(`aams_device_list_${nationalId}`, JSON.stringify(list));
      } else {
        list[existingIdx].name = realName;
        list[existingIdx].os = realOs;
        await AsyncStorage.setItem(`aams_device_list_${nationalId}`, JSON.stringify(list));
      }
    }

    return list.map((d) => ({
      ...d,
      isCurrent: d.uuid === uuid,
    }));
  } catch {
    return [];
  }
};

export const revokeTrustedDevice = async (nationalId: string, uuid: string): Promise<void> => {
  try {
    const currentUuid = await getOrCreateDeviceUUID();
    if (uuid === currentUuid) {
      await AsyncStorage.removeItem(`${TRUSTED_DEVICE_PREFIX}${nationalId}`);
    }
    let rawList = await AsyncStorage.getItem(`aams_device_list_${nationalId}`);
    if (rawList) {
      let list: TrustedDeviceItem[] = JSON.parse(rawList);
      list = list.filter((d) => d.uuid !== uuid);
      await AsyncStorage.setItem(`aams_device_list_${nationalId}`, JSON.stringify(list));
    }
  } catch (e) {
    console.log('Error revoking device:', e);
  }
};

const APP_LANGUAGE_KEY = '@aams_app_language';

export const getStoredLanguage = async (): Promise<'ar' | 'en' | 'bn' | null> => {
  try {
    const l = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
    if (l === 'ar' || l === 'en' || l === 'bn') {
      return l;
    }
    return null;
  } catch {
    return null;
  }
};

export const saveStoredLanguage = async (l: 'ar' | 'en' | 'bn'): Promise<void> => {
  try {
    await AsyncStorage.setItem(APP_LANGUAGE_KEY, l);
    const storedUser = await AsyncStorage.getItem('aams_delegate_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed?.id) {
          apiRequest(`/employees/me/push-token?employee_id=${parsed.id}`, {
            method: 'POST',
            body: JSON.stringify({ language: l }),
            timeoutMs: 4000,
          }).catch(() => {});
        }
      } catch {}
    }
  } catch (e) {
    console.log('Error saving language:', e);
  }
};




