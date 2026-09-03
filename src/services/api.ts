import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

// Hosted Backend API URL (Render)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://aams-backend-fxy7.onrender.com/api/v1';

const TOKEN_KEY = 'aams_delegate_token';
const USER_KEY = 'aams_delegate_user';

let storedToken: string | null = null;

// Initialize token from AsyncStorage
export const loadStoredToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      storedToken = token;
      return token;
    }
  } catch (e) {
    console.log('Error reading token from AsyncStorage:', e);
  }
  return null;
};

// Set / Remove Auth Token
export const setAuthToken = async (token: string | null): Promise<void> => {
  storedToken = token;
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    }
  } catch (e) {
    console.log('Error saving token to AsyncStorage:', e);
  }
};

// Synchronous getter for in-flight requests
export const getStoredToken = (): string | null => {
  return storedToken;
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
    return val !== 'false';
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
  user: any
): Promise<void> => {
  try {
    const data = { nationalId, token, user, timestamp: Date.now() };
    await AsyncStorage.setItem(LAST_SAVED_CREDENTIALS_KEY, JSON.stringify(data));
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
  } catch (e) {
    console.log('Error saving biometric credentials:', e);
  }
};

export const getSavedCredentialsForBiometrics = async (): Promise<{
  nationalId: string;
  token: string;
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
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  // Ensure token is loaded if not already in memory
  let token = getStoredToken();
  if (!token) {
    token = await loadStoredToken();
  }

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

  const text = await response.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `خطأ في الخادم (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
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
    await setAuthToken(res.access_token);
    await setDeviceTrustedForNationalId(nationalId);
    if (res.employee) {
      await saveCachedUser(res.employee);
      await saveLastCredentialsForBiometrics(nationalId, res.access_token, res.employee);
    }
  }
  return res;
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



