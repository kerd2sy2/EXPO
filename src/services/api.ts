import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { logDebugError } from './errorLogger';
import { secureStorage } from './secureStorage';
import { offlineQueue } from './offlineQueue';

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
  if (cleanUrl.startsWith('api/v1/uploads/')) {
    const baseDomain = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    return `${baseDomain}/${cleanUrl}`;
  }
  if (cleanUrl.startsWith('uploads/')) {
    return `${API_BASE_URL}/${cleanUrl}`;
  }
  return `${API_BASE_URL}/uploads/${cleanUrl}`;
};

const TOKEN_KEY = 'aams_delegate_token';
const REFRESH_TOKEN_KEY = 'aams_delegate_refresh_token';
const USER_KEY = 'aams_delegate_user';
const ACTIVE_BRANCH_ID_KEY = 'aams_active_branch_id';
const ACTIVE_BRANCH_NAME_KEY = 'aams_active_branch_name';

let storedToken: string | null = null;
let storedRefreshToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let activeBranchId: string | null = null;
let activeBranchName: string | null = null;

export interface BranchItem {
  id: string;
  name: string;
  code?: string;
  is_active?: boolean;
}

export const getActiveBranchId = (): string | null => activeBranchId;
export const getActiveBranchName = (): string | null => activeBranchName;

export const loadActiveBranch = async (): Promise<{ id: string | null; name: string | null }> => {
  try {
    const [id, name] = await Promise.all([
      AsyncStorage.getItem(ACTIVE_BRANCH_ID_KEY),
      AsyncStorage.getItem(ACTIVE_BRANCH_NAME_KEY),
    ]);
    if (id) activeBranchId = id;
    if (name) activeBranchName = name;
    return { id: activeBranchId, name: activeBranchName };
  } catch (e) {
    console.log('Error reading active branch from storage:', e);
  }
  return { id: null, name: null };
};

export const setActiveBranch = async (
  id: string | null,
  name?: string | null
): Promise<void> => {
  activeBranchId = id;
  if (name !== undefined) {
    activeBranchName = name;
  }
  try {
    if (id) {
      const tasks = [AsyncStorage.setItem(ACTIVE_BRANCH_ID_KEY, id)];
      if (name) {
        tasks.push(AsyncStorage.setItem(ACTIVE_BRANCH_NAME_KEY, name));
      }
      await Promise.all(tasks);
    } else {
      activeBranchName = null;
      await Promise.all([
        AsyncStorage.removeItem(ACTIVE_BRANCH_ID_KEY),
        AsyncStorage.removeItem(ACTIVE_BRANCH_NAME_KEY),
      ]);
    }
  } catch (e) {
    console.log('Error saving active branch to storage:', e);
  }
};

export const fetchBranches = async (): Promise<BranchItem[]> => {
  try {
    const res = await apiRequest<{ data: BranchItem[] }>('/branches');
    if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
      return res.data;
    }
  } catch (err) {
    console.warn('Failed to fetch branches from API, using fallback branches', err);
  }
  return [
    { id: '0b52c83c-4a37-4950-8040-fcb00fa718b3', name: 'الفرع الأول' },
    { id: '33b1e65f-074c-4c51-af38-32e13c1fb9a6', name: 'الفرع الثاني' },
  ];
};

// Initialize token & refresh token from secureStorage
export const loadStoredToken = async (): Promise<string | null> => {
  try {
    const [token, rToken] = await Promise.all([
      secureStorage.getItem(TOKEN_KEY),
      secureStorage.getItem(REFRESH_TOKEN_KEY),
    ]);
    if (token) {
      storedToken = token;
    }
    if (rToken) {
      storedRefreshToken = rToken;
    }
    return storedToken;
  } catch (e) {
    console.log('Error reading token from storage:', e);
  }
  return null;
};

export const loadStoredRefreshToken = async (): Promise<string | null> => {
  try {
    const rToken = await secureStorage.getItem(REFRESH_TOKEN_KEY);
    if (rToken) {
      storedRefreshToken = rToken;
      return rToken;
    }
  } catch (e) {
    console.log('Error reading refresh token from storage:', e);
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
      await secureStorage.setItem(TOKEN_KEY, token);
      if (refreshToken) {
        await secureStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
    } else {
      storedRefreshToken = null;
      await Promise.all([
        secureStorage.removeItem(TOKEN_KEY),
        secureStorage.removeItem(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
    }
  } catch (e) {
    console.log('Error saving token to secure storage:', e);
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

/**
 * Fetch the latest user profile directly from the backend (/me),
 * updates local cached user session in AsyncStorage, and returns the updated user object.
 * This guarantees any branch/permission changes made by admins on the server
 * are immediately reflected without requiring logout/login and without server overload.
 */
export const fetchCurrentUserProfile = async (): Promise<any | null> => {
  try {
    const res = await apiRequest<any>('/me');
    if (res) {
      const user = res.user || res;
      const avatarVal =
        res.personal_image ||
        user.personal_image ||
        res.avatar ||
        user.avatar ||
        res.google_avatar ||
        user.google_avatar ||
        null;

      const targetUser = {
        ...(typeof user === 'object' ? user : {}),
        id: res.id || user.id,
        name: res.name || user.name,
        email: res.email || user.email,
        username: res.username || user.username,
        role: res.role || user.role,
        permissions: res.permissions || user.permissions,
        branch_id: res.branch_id !== undefined ? res.branch_id : user.branch_id,
        branch_name: res.branch_name !== undefined ? res.branch_name : user.branch_name,
        personal_image: avatarVal,
        avatar: avatarVal,
      };

      const existing = await getCachedUser();
      const mergedUser = { ...(existing || {}), ...targetUser };
      await saveCachedUser(mergedUser);
      return mergedUser;
    }
    return null;
  } catch (err) {
    console.warn('[fetchCurrentUserProfile] failed to fetch profile:', err);
    return null;
  }
};

/**
 * Updates the user's avatar permanently on the backend database (employees.personal_image / admins.google_avatar)
 * and syncs local storage.
 */
export const updateMyAvatar = async (avatarUrl: string): Promise<boolean> => {
  try {
    const cleanAvatar = avatarUrl ? avatarUrl.trim() : '';

    // 1. Try dedicated /auth/me/avatar and /me/avatar endpoints
    let synced = false;
    try {
      await apiRequest('/auth/me/avatar', {
        method: 'POST',
        body: JSON.stringify({ avatar: cleanAvatar }),
      });
      synced = true;
    } catch (_) {
      try {
        await apiRequest('/me/avatar', {
          method: 'POST',
          body: JSON.stringify({ avatar: cleanAvatar }),
        });
        synced = true;
      } catch (_) {
        try {
          await apiRequest('/me/avatar', {
            method: 'PUT',
            body: JSON.stringify({ avatar: cleanAvatar }),
          });
          synced = true;
        } catch (_) {}
      }
    }

    // 2. Fallback to /employees/:id if user has employee ID
    const current = await getCachedUser();
    const empId = current?.id || current?.employee_id || current?.employee?.id;
    if (empId) {
      try {
        await apiRequest(`/employees/${empId}`, {
          method: 'PUT',
          body: JSON.stringify({ personal_image: cleanAvatar }),
        });
        synced = true;
      } catch (_) {}
    }

    // 3. Fallback to /users/:id if admin
    const adminId = current?.admin?.id || current?.id;
    if (adminId && (current?.role === 'ADMIN' || current?.role === 'SUPER_ADMIN' || current?.role === 'SUPERVISOR')) {
      try {
        await apiRequest(`/users/${adminId}`, {
          method: 'PUT',
          body: JSON.stringify({ avatar: cleanAvatar }),
        });
        synced = true;
      } catch (_) {}
    }

    // 4. Update local cached user and storage
    const updated = {
      ...(current || {}),
      avatar: cleanAvatar || null,
      personal_image: cleanAvatar || null,
      google_avatar: cleanAvatar || null,
    };
    await saveCachedUser(updated);
    if (cleanAvatar) {
      await AsyncStorage.setItem('@aams_cached_avatar', cleanAvatar);
    } else {
      await AsyncStorage.removeItem('@aams_cached_avatar');
    }

    // 5. Background re-fetch fresh profile from server
    fetchCurrentUserProfile().catch(() => {});

    return true;
  } catch (err) {
    console.warn('[updateMyAvatar] error updating avatar:', err);
    return false;
  }
};

const LAST_SAVED_CREDENTIALS_KEY = 'aams_last_saved_credentials';
const BIOMETRIC_ENABLED_KEY = 'aams_biometric_enabled';
const BIO_TOKEN_KEY = 'aams_bio_token';
const BIO_REFRESH_TOKEN_KEY = 'aams_bio_refresh_token';
const BIO_NATIONAL_ID_KEY = 'aams_bio_national_id';
const BIO_USER_KEY = 'aams_bio_user';

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
    // Store sensitive authentication tokens in hardware-backed secure storage
    const secureTasks: Promise<void>[] = [
      secureStorage.setItem(BIO_TOKEN_KEY, token),
      secureStorage.setItem(BIO_NATIONAL_ID_KEY, nationalId),
    ];
    if (rToken) {
      secureTasks.push(secureStorage.setItem(BIO_REFRESH_TOKEN_KEY, rToken));
    } else {
      secureTasks.push(secureStorage.removeItem(BIO_REFRESH_TOKEN_KEY));
    }
    await Promise.all(secureTasks);

    // Store non-sensitive profile payload in AsyncStorage to respect SecureStore 2048-byte limit
    if (user) {
      await AsyncStorage.setItem(BIO_USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(BIO_USER_KEY);
    }

    // Clean up any old unencrypted legacy record
    await AsyncStorage.removeItem(LAST_SAVED_CREDENTIALS_KEY);
  } catch (e) {
    console.log('Error saving biometric credentials securely:', e);
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

    // Read securely stored credentials
    const [token, nationalId, rToken] = await Promise.all([
      secureStorage.getItem(BIO_TOKEN_KEY),
      secureStorage.getItem(BIO_NATIONAL_ID_KEY),
      secureStorage.getItem(BIO_REFRESH_TOKEN_KEY),
    ]);

    if (token && nationalId) {
      let user: any = null;
      try {
        const rawUser = await AsyncStorage.getItem(BIO_USER_KEY);
        user = rawUser ? JSON.parse(rawUser) : await getCachedUser();
      } catch {
        user = await getCachedUser();
      }

      return {
        nationalId,
        token,
        refreshToken: rToken || undefined,
        user,
      };
    }

    // Seamless migration from legacy unencrypted AsyncStorage if present
    const legacyRaw = await AsyncStorage.getItem(LAST_SAVED_CREDENTIALS_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed?.token && parsed?.nationalId) {
        // Automatically migrate to secureStorage
        await saveLastCredentialsForBiometrics(
          parsed.nationalId,
          parsed.token,
          parsed.user,
          parsed.refreshToken
        );
        return {
          nationalId: parsed.nationalId,
          token: parsed.token,
          refreshToken: parsed.refreshToken,
          user: parsed.user,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
};

export const clearSavedBiometrics = async (): Promise<void> => {
  try {
    await Promise.all([
      secureStorage.removeItem(BIO_TOKEN_KEY),
      secureStorage.removeItem(BIO_REFRESH_TOKEN_KEY),
      secureStorage.removeItem(BIO_NATIONAL_ID_KEY),
      AsyncStorage.removeItem(BIO_USER_KEY),
      AsyncStorage.removeItem(LAST_SAVED_CREDENTIALS_KEY),
    ]);
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

    const branchId = getActiveBranchId();
    if (branchId && !headers['X-Branch-ID']) {
      headers['X-Branch-ID'] = branchId;
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
  const token = res?.access_token || res?.token;
  if (token) {
    await setAuthToken(token, res?.refresh_token || token);
    await setDeviceTrustedForNationalId(nationalId);
    const emp = res?.employee || (res?.id ? res : null);
    if (emp) {
      await saveCachedUser(emp);
      const bioOn = await isBiometricEnabled();
      if (bioOn) {
        await saveLastCredentialsForBiometrics(nationalId, token, emp, res?.refresh_token || token);
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
    const currentUuid = await getOrCreateDeviceUUID();

    // 1. Fetch from server (synced across all devices)
    try {
      const res = await apiRequest<{ data: any[] }>('/devices/my-devices', { timeoutMs: 5000 });
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        const serverList = res.data.map((d, index) => {
          let displayName = d.name;
          if (!displayName || displayName === 'تطبيق الجوال - توثيق المندوب') {
            displayName = d.uuid === currentUuid ? getDeviceDisplayName() : `جهاز موثق (${index + 1})`;
          } else if (d.uuid === currentUuid) {
            displayName = getDeviceDisplayName();
          }
          return {
            uuid: d.uuid,
            name: displayName,
            os: d.os || '',
            trustedAt: d.trusted_at,
            isCurrent: d.uuid === currentUuid,
          };
        });

        // Ensure current device is included if trusted locally
        const hasCurrent = serverList.some((d) => d.uuid === currentUuid);
        if (!hasCurrent) {
          const isTrusted = await isDeviceTrustedForNationalId(nationalId);
          if (isTrusted) {
            serverList.unshift({
              uuid: currentUuid,
              name: getDeviceDisplayName(),
              os: getDeviceOsDisplay(),
              trustedAt: new Date().toISOString(),
              isCurrent: true,
            });
          }
        }
        return serverList;
      }
    } catch (err) {
      console.log('Notice fetching server devices:', err);
      // Fallback to local storage if offline or not logged in yet
    }

    // 2. Local fallback
    const isTrusted = await isDeviceTrustedForNationalId(nationalId);
    let rawList = await AsyncStorage.getItem(`aams_device_list_${nationalId}`);
    let list: TrustedDeviceItem[] = rawList ? JSON.parse(rawList) : [];

    const realName = getDeviceDisplayName();
    const realOs = getDeviceOsDisplay();

    if (isTrusted) {
      const existingIdx = list.findIndex((d) => d.uuid === currentUuid);
      if (existingIdx === -1) {
        const currentItem: TrustedDeviceItem = {
          uuid: currentUuid,
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
      isCurrent: d.uuid === currentUuid,
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

    // Revoke on server
    try {
      await apiRequest(`/devices/${uuid}`, { method: 'DELETE' });
    } catch (apiErr) {
      console.log('Notice revoking device on server:', apiErr);
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

export const getStoredLanguage = async (): Promise<'ar' | 'en' | 'bn' | 'ur' | null> => {
  try {
    const l = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
    if (l === 'ar' || l === 'en' || l === 'bn' || l === 'ur') {
      return l;
    }
    return null;
  } catch {
    return null;
  }
};

export const saveStoredLanguage = async (l: 'ar' | 'en' | 'bn' | 'ur'): Promise<void> => {
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

export interface DelegateViolation {
  id: string;
  violation_number: string;
  employee_id?: string;
  vehicle_plate?: string;
  amount: number;
  paid_amount?: number;
  reason: string;
  violation_date: string;
  city?: string;
  status: 'RECORDED' | 'PARTIAL' | 'DEDUCTED' | 'DISPUTED' | 'PAID' | string;
  notes?: string;
  created_at?: string;
}

export interface ViolationsApiResponse {
  data: DelegateViolation[];
  total: number;
  total_amount: number;
  deducted_amount: number;
  total_count: number;
  page?: number;
  limit?: number;
}

export const getMyViolationsApi = async (employeeId?: string): Promise<ViolationsApiResponse> => {
  try {
    const query = employeeId ? `?employee_id=${employeeId}&limit=100` : `?limit=100`;
    const res = await apiRequest(`/violations${query}`, {
      method: 'GET',
    });
    return {
      data: res?.data || [],
      total: res?.total || 0,
      total_amount: res?.total_amount || 0,
      deducted_amount: res?.deducted_amount || 0,
      total_count: res?.total_count || 0,
    };
  } catch (err) {
    console.warn('[getMyViolationsApi] Error fetching violations:', err);
    return {
      data: [],
      total: 0,
      total_amount: 0,
      deducted_amount: 0,
      total_count: 0,
    };
  }
};
