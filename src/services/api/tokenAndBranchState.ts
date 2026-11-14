import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '../secureStorage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://api.kerd2sy.com/api/v1';

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
export const APP_LANGUAGE_KEY = '@aams_app_language';

let storedToken: string | null = null;
let storedRefreshToken: string | null = null;
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

export const loadStoredToken = async (): Promise<string | null> => {
  try {
    const [token, rToken] = await Promise.all([
      secureStorage.getItem(TOKEN_KEY),
      secureStorage.getItem(REFRESH_TOKEN_KEY),
    ]);
    if (token) storedToken = token;
    if (rToken) storedRefreshToken = rToken;
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
        AsyncStorage.removeItem('@aams_cached_avatar'),
      ]);
    }
  } catch (e) {
    console.log('Error saving token to secure storage:', e);
  }
};

export const getStoredToken = (): string | null => storedToken;
export const getStoredRefreshToken = (): string | null => storedRefreshToken;

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
  if (now - lastExpiredTrigger < 4000) return;
  lastExpiredTrigger = now;
  sessionExpiredListeners.forEach((cb) => {
    try { cb(); } catch (e) { console.error('Error in sessionExpired listener:', e); }
  });
};

type PermissionDeniedListener = (message?: string) => void;
const permissionDeniedListeners = new Set<PermissionDeniedListener>();

export const onPermissionDenied = (listener: PermissionDeniedListener) => {
  permissionDeniedListeners.add(listener);
  return () => {
    permissionDeniedListeners.delete(listener);
  };
};

let lastPermissionDeniedTrigger = 0;
export const triggerPermissionDenied = (message?: string) => {
  const now = Date.now();
  if (now - lastPermissionDeniedTrigger < 4000) return;
  lastPermissionDeniedTrigger = now;
  permissionDeniedListeners.forEach((cb) => {
    try { cb(message); } catch (e) { console.error('Error in permissionDenied listener:', e); }
  });
};

type ProfileRefreshListener = () => void;
const profileRefreshListeners = new Set<ProfileRefreshListener>();

export const onProfileRefreshNeeded = (listener: ProfileRefreshListener) => {
  profileRefreshListeners.add(listener);
  return () => {
    profileRefreshListeners.delete(listener);
  };
};

let lastProfileRefreshTrigger = 0;
export const triggerProfileRefresh = () => {
  const now = Date.now();
  if (now - lastProfileRefreshTrigger < 1500) return;
  lastProfileRefreshTrigger = now;
  profileRefreshListeners.forEach((cb) => {
    try { cb(); } catch (e) { console.error('Error in profileRefresh listener:', e); }
  });
};

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

export const getStoredLanguage = async (): Promise<'ar' | 'en' | 'bn' | 'ur' | null> => {
  try {
    const l = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
    if (l === 'ar' || l === 'en' || l === 'bn' || l === 'ur') return l;
    return null;
  } catch {
    return null;
  }
};
