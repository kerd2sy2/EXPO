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
  const baseDomain = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

  if (cleanUrl.includes('operation-videos/') || cleanUrl.includes('operation_videos/')) {
    const uuidMatch = cleanUrl.match(/[0-9a-fA-F-]{36}/);
    if (uuidMatch) {
      return `${baseDomain}/api/v1/operation-videos/${uuidMatch[0]}/stream`;
    }
    if (cleanUrl.startsWith('api/')) {
      return `${baseDomain}/${cleanUrl}`;
    }
  }

  if (cleanUrl.startsWith('api/') || cleanUrl.startsWith('uploads/')) {
    return `${baseDomain}/${cleanUrl}`;
  }
  return `${baseDomain}/uploads/${cleanUrl}`;
};

const TOKEN_KEY = 'aams_delegate_token';
const REFRESH_TOKEN_KEY = 'aams_delegate_refresh_token';
const USER_KEY = 'aams_delegate_user';

let storedToken: string | null = null;
let storedRefreshToken: string | null = null;
let currentBranchId: string | null = null;

export const setCurrentBranchId = (branchId: string | null) => {
  currentBranchId = branchId ? String(branchId).trim() : null;
};

export const getCurrentBranchId = () => currentBranchId;

function hasGlobalBranchRole(user: any): boolean {
  if (!user) return false;
  const role = String(user.role || user.job_role || '').toUpperCase();
  if (role === 'SUPER_ADMIN' || role === 'OWNER' || role === 'GENERAL_MANAGER') {
    return true;
  }
  const perms: string[] = Array.isArray(user.permissions) ? user.permissions : [];
  return (
    perms.includes('*') ||
    perms.includes('all_branches') ||
    perms.includes('branches.manage') ||
    perms.includes('branches:all') ||
    perms.includes('view_all_branches')
  );
}

/**
 * Resolves the active branch ID for request headers.
 * Single-branch users always use their assigned branch_id so stale cached
 * selected_branch_id values never cause 403 cross-branch errors.
 */
export const resolveEffectiveBranchId = (user: any): string | null => {
  if (!user) return null;
  const assigned = user.branch_id || user.branch?.id;
  if (hasGlobalBranchRole(user)) {
    const preferred = user.selected_branch_id || assigned;
    return preferred ? String(preferred).trim() : null;
  }
  return assigned ? String(assigned).trim() : null;
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
      currentBranchId = null;
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
    try {
      cb();
    } catch (e) {
      console.error('Error in sessionExpired listener:', e);
    }
  });
};

export const saveCachedUser = async (user: any): Promise<void> => {
  try {
    if (user) {
      const effectiveBranch = resolveEffectiveBranchId(user);
      currentBranchId = effectiveBranch;
      const normalizedUser =
        !hasGlobalBranchRole(user) && effectiveBranch
          ? { ...user, branch_id: effectiveBranch, selected_branch_id: effectiveBranch }
          : user;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
    } else {
      currentBranchId = null;
      await AsyncStorage.removeItem(USER_KEY);
    }
  } catch (e) {
    console.log('Error saving user to AsyncStorage:', e);
  }
};

export const getCachedUser = async (): Promise<any | null> => {
  try {
    const json = await AsyncStorage.getItem(USER_KEY);
    if (!json) return null;
    const parsed = JSON.parse(json);
    const effectiveBranch = resolveEffectiveBranchId(parsed);
    if (effectiveBranch && !currentBranchId) {
      currentBranchId = effectiveBranch;
    }
    return parsed;
  } catch {
    return null;
  }
};
