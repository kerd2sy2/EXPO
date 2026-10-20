import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { apiRequest, API_BASE_URL, getStoredToken, loadStoredToken } from './api';

export interface CustodyExpenseItem {
  id: string;
  custody_day_id: string;
  category: 'fuel' | 'internet_advance' | 'advance' | 'license' | 'spare_parts' | 'other' | string;
  amount: number;
  recipient_name: string;
  export_number?: string;
  image_url?: string;
  created_at: string;
}

export interface CustodyTotals {
  fuel: number;
  internet_advance: number;
  advance: number;
  license: number;
  spare_parts: number;
  other: number;
}

export interface CustodyDayData {
  id: string;
  branch_id?: string | null;
  branch_name?: string;
  date: string;
  opening_balance: number;
  added_amount: number;
  custody_value: number;
  total_expenses: number;
  closing_balance: number;
  ledger_image_url?: string;
  totals: CustodyTotals;
  expenses: CustodyExpenseItem[];
  created_at: string;
}

export interface AddExpensePayload {
  category: string;
  amount: number;
  recipient_name: string;
  export_number?: string;
  image_url?: string;
}

export interface CustodyLogItem {
  id: string;
  branch_id?: string;
  custody_day_id: string;
  date: string;
  action_type: string;
  category?: string;
  amount: number;
  description: string;
  recipient_name?: string;
  export_number?: string;
  image_url?: string;
  admin_name?: string;
  created_at: string;
}

export const custodyService = {
  // 1. Get all custody days or filter by branch
  getDays: async (branchId?: string): Promise<CustodyDayData[]> => {
    const t = Date.now();
    const query = branchId ? `?branch_id=${branchId}&_t=${t}` : `?_t=${t}`;
    const res = await apiRequest(`/custody${query}`, { method: 'GET' });
    return Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  },

  // 2. Open or create day
  createDay: async (payload: { date: string; added_amount?: number; branch_id?: string }): Promise<CustodyDayData> => {
    const res = await apiRequest('/custody', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  // 3. Add more custody amount to a day
  addAmount: async (payload: { custody_day_id: string; added_amount: number; branch_id?: string }): Promise<CustodyDayData> => {
    const res = await apiRequest('/custody/add-amount', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  // 4. Add expense
  addExpense: async (dayId: string, payload: AddExpensePayload): Promise<CustodyDayData> => {
    const res = await apiRequest(`/custody/${dayId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  // 4b. Update expense (recipient, amount, category, etc.)
  updateExpense: async (expenseId: string, payload: Partial<AddExpensePayload>): Promise<CustodyDayData> => {
    const res = await apiRequest(`/custody/expenses/${expenseId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res?.data || res;
  },

  // 5. Delete expense
  deleteExpense: async (expenseId: string): Promise<CustodyDayData> => {
    const res = await apiRequest(`/custody/expenses/${expenseId}`, {
      method: 'DELETE',
    });
    return res?.data || res;
  },

  // 6. Get logs
  getLogs: async (date?: string): Promise<{ data: CustodyLogItem[]; total: number }> => {
    const t = Date.now();
    const query = date ? `?date=${date}&limit=50&_t=${t}` : `?limit=50&_t=${t}`;
    const res = await apiRequest(`/custody/logs${query}`, { method: 'GET' });
    return {
      data: res?.data || [],
      total: res?.total || 0,
    };
  },

  // 6b. Delete a custody log (e.g. undo added custody amount)
  deleteLog: async (logId: string): Promise<any> => {
    const res = await apiRequest(`/custody/logs/${logId}`, {
      method: 'DELETE',
    });
    return res;
  },

  // 7. Upload invoice image (Using FileSystem.uploadAsync on native to prevent Android FormData errors)
  uploadInvoiceImage: async (uri: string): Promise<string> => {
    let token = getStoredToken();
    if (!token) {
      token = await loadStoredToken();
    }
    const cleanUrl = `${API_BASE_URL}/upload`;

    // 1. Native Android & iOS upload via expo-file-system
    if (Platform.OS !== 'web' && typeof FileSystem.uploadAsync === 'function') {
      try {
        const uploadResult = await FileSystem.uploadAsync(cleanUrl, uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'image',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (uploadResult.status >= 200 && uploadResult.status < 300) {
          const json = JSON.parse(uploadResult.body);
          return json?.url || json?.file_url || json?.data?.url || json?.data?.file_url || '';
        } else {
          console.warn(`FileSystem upload failed (${uploadResult.status}):`, uploadResult.body);
          throw new Error(`Upload failed (${uploadResult.status}): ${uploadResult.body}`);
        }
      } catch (nativeErr: any) {
        console.error('FileSystem.uploadAsync error:', nativeErr);
        throw nativeErr;
      }
    }

    // 2. Web fallback
    const formData = new FormData();
    const filename = uri.split('/').pop() || `invoice_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

    const filePayload = {
      uri,
      name: filename,
      type,
    } as any;

    formData.append('image', filePayload);
    formData.append('file', filePayload);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(cleanUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Upload failed (${response.status}): ${err || response.statusText}`);
    }

    const json = await response.json();
    return json?.url || json?.file_url || json?.data?.url || json?.data?.file_url || '';
  },

  // 8. Regular Phone / Password Login
  login: async (loginKey: string, password: string): Promise<any> => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: loginKey, phone: loginKey, password, app: 'ohda' }),
    });
    return res;
  },

  // 9. Google Login
  googleLogin: async (email: string, googleId?: string): Promise<any> => {
    const res = await apiRequest('/auth/google/login', {
      method: 'POST',
      body: JSON.stringify({ email, google_id: googleId }),
    });
    return res;
  },

  // 9. Save Daily Ledger (Notebook) Photo
  setLedgerImage: async (date: string, imageUri: string): Promise<string> => {
    let uploadedUrl = imageUri;
    try {
      uploadedUrl = await custodyService.uploadInvoiceImage(imageUri);
    } catch (err) {
      console.warn('Failed to upload ledger image, fallback to URI:', err);
    }

    try {
      await AsyncStorage.setItem(`aams_custody_ledger_image_${date}`, uploadedUrl);
    } catch (_) {}

    try {
      await apiRequest('/custody/ledger-image', {
        method: 'POST',
        body: JSON.stringify({
          date,
          image_url: uploadedUrl,
        }),
      });
    } catch (err) {
      console.warn('Failed to sync ledger image with backend:', err);
    }

    return uploadedUrl;
  },

  getLedgerImage: async (date: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(`aams_custody_ledger_image_${date}`);
    } catch (_) {
      return null;
    }
  },
};

/**
 * Checks if a user has permission to access the Custody (العهدة) portal.
 * Validates role, permissions list, and test accounts.
 */
export const hasCustodyPermission = (user: any): boolean => {
  if (!user) return false;

  // Google Reviewer test account / demo accounts pass naturally
  if (
    user.national_id === '1234596' ||
    user.employee_number === 'EMP-1234596' ||
    user.phone === '0500000000' ||
    user.phone === '500000000' ||
    user.email === 'kerd2sy@gmail.com' ||
    user.email === 'demo.driver@kerd2sy.com'
  ) {
    return true;
  }

  const role = String(user.role || '').toUpperCase();
  if (role === 'SUPER_ADMIN' || role === 'SUPERADMIN' || user.is_super_admin) {
    return true;
  }

  // Check permissions array or string
  let perms: string[] = [];
  if (Array.isArray(user.permissions)) {
    perms = user.permissions;
  } else if (typeof user.permissions === 'string') {
    try {
      perms = JSON.parse(user.permissions);
    } catch {
      perms = [user.permissions];
    }
  }

  // Strictly require apps.ohda, app.ohda, or wildcard *
  const allowedPermissions = [
    '*',
    'apps.ohda',
    'app.ohda',
  ];

  for (const perm of allowedPermissions) {
    if (perms.includes(perm)) {
      return true;
    }
  }

  return false;
};
