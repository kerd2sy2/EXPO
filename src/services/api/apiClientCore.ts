import AsyncStorage from '@react-native-async-storage/async-storage';
import { logDebugError } from '../errorLogger';
import {
  API_BASE_URL,
  APP_LANGUAGE_KEY,
  BranchItem,
  getActiveBranchId,
  getStoredToken,
  loadStoredToken,
  getStoredRefreshToken,
  loadStoredRefreshToken,
  setAuthToken,
  triggerSessionExpired,
  triggerProfileRefresh,
} from './tokenAndBranchState';
import {
  isBiometricEnabled,
  getSavedCredentialsForBiometrics,
  saveLastCredentialsForBiometrics,
} from './biometricsStorage';

let refreshPromise: Promise<string | null> | null = null;

export const refreshAuthToken = async (): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      let rToken = getStoredRefreshToken();
      if (!rToken) rToken = await loadStoredRefreshToken();
      if (!rToken) {
        console.log('[Auth] No refresh token available to refresh session');
        return null;
      }

      console.log('[Auth] Attempting token refresh via /auth/refresh...');
      let response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refresh_token: rToken }),
      });

      if (response.status === 404) {
        const altUrl = API_BASE_URL.endsWith('/api/v1')
          ? `${API_BASE_URL}/refresh`
          : `${API_BASE_URL}/api/v1/refresh`;
        response = await fetch(altUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ refresh_token: rToken }),
        });
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.warn('[Auth] Token refresh failed with status', response.status, errData);
        return null;
      }

      const data = await response.json();
      if (data?.access_token) {
        const newAccess = data.access_token;
        const newRefresh = data.refresh_token || rToken;
        await setAuthToken(newAccess, newRefresh);

        const bioOn = await isBiometricEnabled();
        if (bioOn) {
          const saved = await getSavedCredentialsForBiometrics();
          if (saved) {
            await saveLastCredentialsForBiometrics(saved.nationalId, newAccess, saved.user, newRefresh);
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

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & { timeoutMs?: number; retries?: number } = {}
): Promise<T> {
  const { timeoutMs = 22000, retries = 2, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    let token = getStoredToken();
    if (!token) token = await loadStoredToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(fetchOptions.headers as Record<string, string>),
    };

    if (token) headers['Authorization'] = `Bearer ${token}`;

    const branchId = getActiveBranchId();
    if (branchId && !headers['X-Branch-ID']) headers['X-Branch-ID'] = branchId;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let response = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: fetchOptions.signal || controller.signal,
      });

      const isAuthEndpoint =
        endpoint.includes('/login') ||
        endpoint.includes('/auth/login') ||
        endpoint.includes('/refresh') ||
        endpoint.includes('/auth/refresh') ||
        endpoint.includes('/auth/verify-otp');

      if (response.status === 401 && !isAuthEndpoint) {
        const newToken = await refreshAuthToken();
        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(url, {
            ...fetchOptions,
            headers,
            signal: fetchOptions.signal || controller.signal,
          });
        } else {
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
        if (response.status === 403) triggerProfileRefresh();
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
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 800));
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

export const fetchBranches = async (): Promise<BranchItem[]> => {
  try {
    const res = await apiRequest<{ data: BranchItem[] }>('/branches');
    if (res?.data && Array.isArray(res.data) && res.data.length > 0) return res.data;
  } catch (err) {
    console.warn('Failed to fetch branches from API, using fallback branches', err);
  }
  return [
    { id: '0b52c83c-4a37-4950-8040-fcb00fa718b3', name: 'الفرع الأول' },
    { id: '33b1e65f-074c-4c51-af38-32e13c1fb9a6', name: 'الفرع الثاني' },
  ];
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
