import AsyncStorage from '@react-native-async-storage/async-storage';

// Base API URL
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
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:')
  ) {
    return trimmed;
  }
  const cleanUrl = trimmed.replace(/^\/+/, '');
  const baseDomain = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

  // Operational proof videos: always route through secure authenticated stream endpoint
  if (cleanUrl.includes('operation-videos/') || cleanUrl.includes('operation_videos/')) {
    const uuidMatch = cleanUrl.match(/[0-9a-fA-F-]{36}/);
    if (uuidMatch) {
      return `${baseDomain}/api/v1/operation-videos/${uuidMatch[0]}/stream`;
    }
    if (cleanUrl.startsWith('api/')) {
      return `${baseDomain}/${cleanUrl}`;
    }
  }

  // Any other direct API route
  if (cleanUrl.startsWith('api/')) {
    return `${baseDomain}/${cleanUrl}`;
  }

  if (cleanUrl.startsWith('uploads/')) {
    return `${baseDomain}/${cleanUrl}`;
  }
  return `${baseDomain}/uploads/${cleanUrl}`;
};

// SecureStorage Helper
let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
} catch {
  // Graceful fallback to AsyncStorage
}

export const secureStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
        await SecureStore.setItemAsync(key, value);
        return;
      }
    } catch {
      // Fallback
    }
    await AsyncStorage.setItem(key, value);
  },

  getItem: async (key: string): Promise<string | null> => {
    try {
      if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
        const val = await SecureStore.getItemAsync(key);
        if (val !== null) return val;
      }
    } catch {
      // Fallback
    }
    return AsyncStorage.getItem(key);
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
        await SecureStore.deleteItemAsync(key);
      }
    } catch {
      // Fallback
    }
    await AsyncStorage.removeItem(key);
  },
};

// Global in-memory tokens cache
let storedToken: string | null = null;
let storedRefreshToken: string | null = null;

const DEFAULT_TOKEN_KEY = 'aams_token';
const DEFAULT_REFRESH_KEY = 'aams_refresh_token';

export const loadStoredToken = async (tokenKey = DEFAULT_TOKEN_KEY): Promise<string | null> => {
  try {
    const token = await secureStorage.getItem(tokenKey);
    if (token) {
      storedToken = token;
    }
    return storedToken;
  } catch (e) {
    console.log('Error reading token from storage:', e);
  }
  return null;
};

export const getStoredToken = (): string | null => storedToken;

export const setAuthToken = async (
  token: string | null,
  refreshToken?: string | null,
  tokenKey = DEFAULT_TOKEN_KEY,
  refreshKey = DEFAULT_REFRESH_KEY
): Promise<void> => {
  storedToken = token;
  if (refreshToken !== undefined) {
    storedRefreshToken = refreshToken;
  }
  try {
    if (token) {
      await secureStorage.setItem(tokenKey, token);
      if (refreshToken) {
        await secureStorage.setItem(refreshKey, refreshToken);
      }
    } else {
      storedRefreshToken = null;
      await Promise.all([
        secureStorage.removeItem(tokenKey),
        secureStorage.removeItem(refreshKey),
      ]);
    }
  } catch (e) {
    console.log('Error saving token to secure storage:', e);
  }
};

/**
 * Standard fetch wrapper that adds Authorization Bearer headers and handles JSON responses
 */
export const requestJson = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> => {
  try {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const token = getStoredToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const status = response.status;
    let data = null;
    try {
      data = await response.json();
    } catch {
      // response might not be JSON
    }

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `Request failed with status ${status}`;
      return { data: null, error: errorMsg, status };
    }

    return { data, error: null, status };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Network error', status: 0 };
  }
};
