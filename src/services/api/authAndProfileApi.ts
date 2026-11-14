import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import {
  setAuthToken,
  saveCachedUser,
  getCachedUser,
} from './tokenAndBranchState';
import {
  isBiometricEnabled,
  saveLastCredentialsForBiometrics,
} from './biometricsStorage';
import { apiRequest } from './apiClientCore';

export const fetchCurrentUserProfile = async (): Promise<any | null> => {
  try {
    const res = await apiRequest<any>(`/me?_t=${Date.now()}`, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
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

      let parsedPerms: string[] = [];
      const rawPerms = res.permissions || user.permissions;
      if (Array.isArray(rawPerms)) {
        parsedPerms = rawPerms;
      } else if (typeof rawPerms === 'string' && rawPerms.trim() !== '') {
        try {
          const parsed = JSON.parse(rawPerms);
          parsedPerms = Array.isArray(parsed) ? parsed : [rawPerms];
        } catch {
          parsedPerms = rawPerms.split(',').map((s: string) => s.trim()).filter(Boolean);
        }
      }

      const effectiveRole =
        res.role || user.role || res.job_role || user.job_role || res.role_name || user.role_name || 'DRIVER';

      const targetUser = {
        ...(typeof user === 'object' ? user : {}),
        id: res.id || user.id,
        name: res.name || user.name,
        email: res.email || user.email,
        username: res.username || user.username,
        role: effectiveRole,
        job_role: effectiveRole,
        permissions: parsedPerms,
        app_permissions: res.app_permissions || user.app_permissions || null,
        permissions_configured:
          res.permissions_configured !== undefined ? res.permissions_configured : user.permissions_configured,
        branch_id: res.branch_id !== undefined ? res.branch_id : user.branch_id,
        branch_name: res.branch_name !== undefined ? res.branch_name : user.branch_name,
        personal_image: avatarVal,
        avatar: avatarVal,
      };

      const existing = await getCachedUser();
      const mergedUser = {
        ...(existing || {}),
        ...targetUser,
        permissions: parsedPerms,
        app_permissions: res.app_permissions || user.app_permissions || null,
        permissions_configured:
          res.permissions_configured !== undefined ? res.permissions_configured : user.permissions_configured,
      };
      await saveCachedUser(mergedUser);
      return mergedUser;
    }
    return null;
  } catch (err) {
    console.warn('[fetchCurrentUserProfile] failed to fetch profile:', err);
    return null;
  }
};

export const updateMyAvatar = async (avatarUrl: string): Promise<boolean> => {
  try {
    const cleanAvatar = avatarUrl ? avatarUrl.trim() : '';
    try {
      await apiRequest('/auth/me/avatar', { method: 'POST', body: JSON.stringify({ avatar: cleanAvatar }) });
    } catch {
      try {
        await apiRequest('/me/avatar', { method: 'POST', body: JSON.stringify({ avatar: cleanAvatar }) });
      } catch {
        try {
          await apiRequest('/me/avatar', { method: 'PUT', body: JSON.stringify({ avatar: cleanAvatar }) });
        } catch {}
      }
    }

    const current = await getCachedUser();
    const empId = current?.id || current?.employee_id || current?.employee?.id;
    if (empId) {
      try {
        await apiRequest(`/employees/${empId}`, { method: 'PUT', body: JSON.stringify({ personal_image: cleanAvatar }) });
      } catch {}
    }

    const adminId = current?.admin?.id || current?.id;
    if (adminId && (current?.role === 'ADMIN' || current?.role === 'SUPER_ADMIN' || current?.role === 'SUPERVISOR')) {
      try {
        await apiRequest(`/users/${adminId}`, { method: 'PUT', body: JSON.stringify({ avatar: cleanAvatar }) });
      } catch {}
    }

    await saveCachedUser({
      ...(current || {}),
      avatar: cleanAvatar || null,
      personal_image: cleanAvatar || null,
      google_avatar: cleanAvatar || null,
    });
    fetchCurrentUserProfile().catch(() => {});
    return true;
  } catch (err) {
    console.warn('[updateMyAvatar] error updating avatar:', err);
    return false;
  }
};

const DEVICE_UUID_KEY = 'aams_device_uuid';
const TRUSTED_DEVICE_PREFIX = 'aams_trusted_device_';

export const getDeviceDisplayName = (): string => {
  const model = Device.modelName;
  const brand = Device.brand ? Device.brand.charAt(0).toUpperCase() + Device.brand.slice(1) : '';
  const manufacturer = Device.manufacturer ? Device.manufacturer.charAt(0).toUpperCase() + Device.manufacturer.slice(1) : '';
  const devName = Device.deviceName;
  if (model) {
    return brand && !model.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${model}` : model;
  }
  if (devName && !devName.toLowerCase().includes('phone') && !devName.toLowerCase().includes('android')) return devName;
  if (manufacturer && brand && manufacturer.toLowerCase() !== brand.toLowerCase()) return `${manufacturer} ${brand}`;
  if (brand || manufacturer) return `${brand || manufacturer} Device`;
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
  try { await AsyncStorage.setItem(`${TRUSTED_DEVICE_PREFIX}${nationalId}`, 'true'); } catch {}
};

export const isDeviceTrustedForNationalId = async (nationalId: string): Promise<boolean> => {
  try { return (await AsyncStorage.getItem(`${TRUSTED_DEVICE_PREFIX}${nationalId}`)) === 'true'; } catch { return false; }
};

export const requestOtpApi = async (
  nationalId: string,
  deviceInfo?: string
): Promise<{ success: boolean; message: string; national_id: string; employee_name: string; expires_at: string }> => {
  const deviceUuid = await getOrCreateDeviceUUID();
  const info = deviceInfo || `${getDeviceDisplayName()} (${getDeviceOsDisplay()})`;
  return apiRequest('/auth/request-otp', {
    method: 'POST',
    body: JSON.stringify({ national_id: nationalId, device_info: info, device_uuid: deviceUuid }),
  });
};

export const verifyOtpApi = async (nationalId: string, otpCode: string): Promise<any> => {
  const deviceUuid = await getOrCreateDeviceUUID();
  const res = await apiRequest('/auth/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ national_id: nationalId, otp_code: otpCode, device_uuid: deviceUuid }),
  });
  const token = res?.access_token || res?.token;
  if (token) {
    await setAuthToken(token, res?.refresh_token || token);
    await setDeviceTrustedForNationalId(nationalId);
    const emp = res?.employee || (res?.id ? res : null);
    if (emp) {
      await saveCachedUser(emp);
      if (await isBiometricEnabled()) {
        await saveLastCredentialsForBiometrics(nationalId, token, emp, res?.refresh_token || token);
      }
    }
  }
  return res;
};

export const changeMyPasswordApi = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> =>
  apiRequest('/employees/me/change-password', {
    method: 'POST',
    body: JSON.stringify({ old_password: oldPassword.trim(), new_password: newPassword.trim() }),
  });

export const setMyPhoneApi = async (phone: string): Promise<{ success: boolean; message: string; phone: string; employee: any }> =>
  apiRequest('/employees/me/phone', {
    method: 'POST',
    body: JSON.stringify({ phone: phone.trim() }),
  });

export const updateMyLocationApi = async (
  latitude: number,
  longitude: number,
  speed?: number | null,
  heading?: number | null,
  isVPN?: boolean,
  isMockLocation?: boolean
): Promise<{ success: boolean; message: string }> =>
  apiRequest('/employees/me/location', {
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
          return { uuid: d.uuid, name: displayName, os: d.os || '', trustedAt: d.trusted_at, isCurrent: d.uuid === currentUuid };
        });
        if (!serverList.some((d) => d.uuid === currentUuid) && (await isDeviceTrustedForNationalId(nationalId))) {
          serverList.unshift({
            uuid: currentUuid,
            name: getDeviceDisplayName(),
            os: getDeviceOsDisplay(),
            trustedAt: new Date().toISOString(),
            isCurrent: true,
          });
        }
        return serverList;
      }
    } catch {}

    const isTrusted = await isDeviceTrustedForNationalId(nationalId);
    const rawList = await AsyncStorage.getItem(`aams_device_list_${nationalId}`);
    const list: TrustedDeviceItem[] = rawList ? JSON.parse(rawList) : [];
    if (isTrusted) {
      const realName = getDeviceDisplayName();
      const realOs = getDeviceOsDisplay();
      const existingIdx = list.findIndex((d) => d.uuid === currentUuid);
      if (existingIdx === -1) {
        list.unshift({ uuid: currentUuid, name: realName, os: realOs, trustedAt: new Date().toISOString(), isCurrent: true });
      } else {
        list[existingIdx].name = realName;
        list[existingIdx].os = realOs;
      }
      await AsyncStorage.setItem(`aams_device_list_${nationalId}`, JSON.stringify(list));
    }
    return list.map((d) => ({ ...d, isCurrent: d.uuid === currentUuid }));
  } catch {
    return [];
  }
};

export const revokeTrustedDevice = async (nationalId: string, uuid: string): Promise<void> => {
  try {
    const currentUuid = await getOrCreateDeviceUUID();
    if (uuid === currentUuid) await AsyncStorage.removeItem(`${TRUSTED_DEVICE_PREFIX}${nationalId}`);
    try { await apiRequest(`/devices/${uuid}`, { method: 'DELETE' }); } catch {}
    const rawList = await AsyncStorage.getItem(`aams_device_list_${nationalId}`);
    if (rawList) {
      const filtered = (JSON.parse(rawList) as TrustedDeviceItem[]).filter((d) => d.uuid !== uuid);
      await AsyncStorage.setItem(`aams_device_list_${nationalId}`, JSON.stringify(filtered));
    }
  } catch {}
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
    const res = await apiRequest(`/violations${query}`, { method: 'GET' });
    return {
      data: res?.data || [],
      total: res?.total || 0,
      total_amount: res?.total_amount || 0,
      deducted_amount: res?.deducted_amount || 0,
      total_count: res?.total_count || 0,
    };
  } catch (err) {
    console.warn('[getMyViolationsApi] Error fetching violations:', err);
    return { data: [], total: 0, total_amount: 0, deducted_amount: 0, total_count: 0 };
  }
};
