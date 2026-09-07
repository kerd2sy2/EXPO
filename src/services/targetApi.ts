import { Platform } from 'react-native';
import { API_BASE_URL, getStoredToken, loadStoredToken } from './api';
import {
  TargetDashboardSummary,
  IdentifierPerformance,
  IdentifierDetails,
  DriverPerformance,
  TargetAlertItem,
  ExcelImportPreview,
  ConfirmImportResponse,
  TargetSettings,
} from '../types/target';

const getHeaders = async (isMultipart = false): Promise<Record<string, string>> => {
  let token = getStoredToken();
  if (!token) {
    token = await loadStoredToken();
  }
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

async function targetFetch(
  url: string,
  options: RequestInit = {},
  timeoutMs = 35000,
  retries = 1
): Promise<Response> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let token = getStoredToken();
    if (!token) {
      token = await loadStoredToken();
    }

    const existingHeaders = (options.headers || {}) as Record<string, string>;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...existingHeaders,
    };

    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        headers,
        signal: options.signal || controller.signal,
      });
      return res;
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
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }

      if (isNetworkOrAbort) {
        throw new Error('تعذر الاتصال بخادم التارچت، يرجى التحقق من اتصال الإنترنت والمحاولة مجدداً.');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

export const targetApi = {
  // 1. Dashboard Summary
  getDashboard: async (month?: string, branch?: string, startDate?: string, endDate?: string): Promise<TargetDashboardSummary> => {
    const q = new URLSearchParams();
    if (month) q.append('month', month);
    if (startDate) q.append('start_date', startDate);
    if (endDate) q.append('end_date', endDate);
    if (branch && branch !== 'all') q.append('branch', branch);
    const queryString = q.toString();
    const url = queryString ? `${API_BASE_URL}/target/dashboard?${queryString}` : `${API_BASE_URL}/target/dashboard`;
    const res = await targetFetch(url, { headers: await getHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في جلب بيانات لوحة التحكم');
    }
    return res.json();
  },

  // 2. Identifiers List
  listIdentifiers: async (params?: {
    search?: string;
    status?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
    branch?: string;
  }): Promise<IdentifierPerformance[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.month) q.append('month', params.month);
    if (params?.startDate) q.append('start_date', params.startDate);
    if (params?.endDate) q.append('end_date', params.endDate);
    if (params?.branch && params.branch !== 'all') q.append('branch', params.branch);

    const res = await targetFetch(`${API_BASE_URL}/target/identifiers?${q.toString()}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في جلب قائمة المعرفين');
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },

  // 3. Identifier Details
  getIdentifierDetails: async (id: string, month?: string): Promise<IdentifierDetails> => {
    const url = month
      ? `${API_BASE_URL}/target/identifiers/${id}?month=${encodeURIComponent(month)}`
      : `${API_BASE_URL}/target/identifiers/${id}`;
    const res = await targetFetch(url, { headers: await getHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في جلب تفاصيل المعرف');
    }
    return res.json();
  },

  // 4. Create Identifier (Admin only)
  createIdentifier: async (data: {
    name: string;
    code?: string;
    monthly_target?: number;
    daily_target?: number;
  }): Promise<any> => {
    const res = await targetFetch(`${API_BASE_URL}/target/identifiers`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في إضافة المعرف');
    }
    return res.json();
  },

  // 5. Update Identifier (Admin only)
  updateIdentifier: async (
    id: string,
    data: {
      name?: string;
      code?: string;
      monthly_target?: number;
      daily_target?: number;
      is_active?: boolean;
    }
  ): Promise<any> => {
    const res = await targetFetch(`${API_BASE_URL}/target/identifiers/${id}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في تحديث المعرف');
    }
    return res.json();
  },

  // 6. Delete Identifier (Admin only)
  deleteIdentifier: async (id: string): Promise<any> => {
    const res = await targetFetch(`${API_BASE_URL}/target/identifiers/${id}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في حذف المعرف');
    }
    return res.json();
  },

  // 7. Drivers List
  listDrivers: async (params?: {
    search?: string;
    month?: string;
    startDate?: string;
    endDate?: string;
    branch?: string;
  }): Promise<DriverPerformance[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.month) q.append('month', params.month);
    if (params?.startDate) q.append('start_date', params.startDate);
    if (params?.endDate) q.append('end_date', params.endDate);
    if (params?.branch && params.branch !== 'all') q.append('branch', params.branch);

    const res = await targetFetch(`${API_BASE_URL}/target/drivers?${q.toString()}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في جلب بيانات المندوبين');
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },

  // 8. Alerts List
  listAlerts: async (params?: {
    date?: string;
    unresolved_only?: boolean;
    branch?: string;
  }): Promise<TargetAlertItem[]> => {
    const q = new URLSearchParams();
    if (params?.date) q.append('date', params.date);
    if (params?.unresolved_only) q.append('unresolved_only', 'true');
    if (params?.branch && params.branch !== 'all') q.append('branch', params.branch);

    const res = await targetFetch(`${API_BASE_URL}/target/alerts?${q.toString()}`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في جلب التنبيهات');
    }
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  },

  // 9. Resolve Alert
  resolveAlert: async (id: string): Promise<any> => {
    const res = await targetFetch(`${API_BASE_URL}/target/alerts/${id}/resolve`, {
      method: 'PATCH',
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في تسوية التنبيه');
    }
    return res.json();
  },

  // 10. Excel Import Preview
  previewExcel: async (
    file: { uri: string; name: string; type?: string; mimeType?: string; file?: any },
    customDate?: string
  ): Promise<ExcelImportPreview> => {
    let token = getStoredToken();
    if (!token) {
      token = await loadStoredToken();
    }

    const formData = new FormData();

    if (Platform.OS === 'web') {
      if (file.file && typeof file.file === 'object') {
        formData.append('file', file.file, file.name);
      } else if (file.uri && file.uri.startsWith('blob:')) {
        try {
          const blobRes = await fetch(file.uri);
          const blob = await blobRes.blob();
          formData.append('file', blob, file.name);
        } catch {
          // @ts-ignore
          formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.mimeType || file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
        }
      } else {
        // @ts-ignore
        formData.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
      }
    } else {
      // Mobile (Android / iOS):
      // React Native FormData expects { uri, name, type }.
      // This is converted by React Native's native network layer (OkHttp / RCTNetworking).
      // @ts-ignore: React Native FormData file shape
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
    }

    if (customDate) {
      formData.append('date', customDate);
    }

    // Using XMLHttpRequest directly bypasses expo/fetch (WinterCG fetch),
    // which in Expo SDK 52+ rejects React Native file objects with "Unsupported FormDataPart implementation".
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/admin/target/import/preview`);
      xhr.timeout = 45000;
      xhr.setRequestHeader('Accept', 'application/json');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.onload = () => {
        let resData: any;
        try {
          resData = JSON.parse(xhr.responseText);
        } catch {
          resData = { error: xhr.responseText };
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(resData);
        } else {
          reject(new Error(resData?.error || resData?.message || `فشل في فحص ومعاينة ملف الإكسل (رمز: ${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('فشل الاتصال بالخادم أثناء رفع الملف. يرجى التحقق من اتصال الإنترنت.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('انتهت مهلة فحص ومعاينة ملف الإكسل (45 ثانية). يرجى المحاولة مرة أخرى.'));
      };

      xhr.send(formData);
    });
  },

  // 11. Confirm Excel Import
  confirmExcel: async (data: {
    file_name: string;
    order_date: string;
    deduplication_action: 'IGNORE_DUPLICATES' | 'REPLACE_DUPLICATES' | 'CANCEL';
    rows: any[];
  }): Promise<ConfirmImportResponse> => {
    const res = await targetFetch(`${API_BASE_URL}/admin/target/import/confirm`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(data),
    }, 20000);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في حفظ بيانات الإكسل في قاعدة البيانات');
    }
    return res.json();
  },

  // 12. Settings
  getTargetSettings: async (): Promise<TargetSettings> => {
    const res = await targetFetch(`${API_BASE_URL}/target/settings`, {
      headers: await getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في قراءة إعدادات التارچت');
    }
    return res.json();
  },

  updateTargetSettings: async (settings: TargetSettings): Promise<any> => {
    const res = await targetFetch(`${API_BASE_URL}/target/settings`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في تحديث إعدادات التارچت');
    }
    return res.json();
  },
};
