import { API_BASE_URL, getStoredToken } from './api';
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

const getHeaders = (isMultipart = false) => {
  const token = getStoredToken();
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

export const targetApi = {
  // 1. Dashboard Summary
  getDashboard: async (month?: string): Promise<TargetDashboardSummary> => {
    const url = month
      ? `${API_BASE_URL}/target/dashboard?month=${encodeURIComponent(month)}`
      : `${API_BASE_URL}/target/dashboard`;
    const res = await fetch(url, { headers: getHeaders() });
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
  }): Promise<IdentifierPerformance[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.status) q.append('status', params.status);
    if (params?.month) q.append('month', params.month);

    const res = await fetch(`${API_BASE_URL}/target/identifiers?${q.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في جلب قائمة المعرفين');
    }
    return res.json();
  },

  // 3. Identifier Details
  getIdentifierDetails: async (id: string, month?: string): Promise<IdentifierDetails> => {
    const url = month
      ? `${API_BASE_URL}/target/identifiers/${id}?month=${encodeURIComponent(month)}`
      : `${API_BASE_URL}/target/identifiers/${id}`;
    const res = await fetch(url, { headers: getHeaders() });
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
    const res = await fetch(`${API_BASE_URL}/target/identifiers`, {
      method: 'POST',
      headers: getHeaders(),
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
    const res = await fetch(`${API_BASE_URL}/target/identifiers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
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
    const res = await fetch(`${API_BASE_URL}/target/identifiers/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
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
  }): Promise<DriverPerformance[]> => {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.month) q.append('month', params.month);

    const res = await fetch(`${API_BASE_URL}/target/drivers?${q.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في جلب بيانات المندوبين');
    }
    return res.json();
  },

  // 8. Alerts List
  listAlerts: async (params?: {
    date?: string;
    unresolved_only?: boolean;
  }): Promise<TargetAlertItem[]> => {
    const q = new URLSearchParams();
    if (params?.date) q.append('date', params.date);
    if (params?.unresolved_only) q.append('unresolved_only', 'true');

    const res = await fetch(`${API_BASE_URL}/target/alerts?${q.toString()}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في جلب التنبيهات');
    }
    return res.json();
  },

  // 9. Resolve Alert
  resolveAlert: async (id: string): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/target/alerts/${id}/resolve`, {
      method: 'PATCH',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في تسوية التنبيه');
    }
    return res.json();
  },

  // 10. Excel Import Preview
  previewExcel: async (
    file: { uri: string; name: string; type?: string; mimeType?: string },
    customDate?: string
  ): Promise<ExcelImportPreview> => {
    const formData = new FormData();
    // @ts-ignore: React Native FormData file shape
    formData.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    if (customDate) {
      formData.append('date', customDate);
    }

    const res = await fetch(`${API_BASE_URL}/admin/target/import/preview`, {
      method: 'POST',
      headers: getHeaders(true),
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في فحص ومعاينة ملف الإكسل');
    }
    return res.json();
  },

  // 11. Confirm Excel Import
  confirmExcel: async (data: {
    file_name: string;
    order_date: string;
    deduplication_action: 'IGNORE_DUPLICATES' | 'REPLACE_DUPLICATES' | 'CANCEL';
    rows: any[];
  }): Promise<ConfirmImportResponse> => {
    const res = await fetch(`${API_BASE_URL}/admin/target/import/confirm`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في حفظ بيانات الإكسل في قاعدة البيانات');
    }
    return res.json();
  },

  // 12. Settings
  getTargetSettings: async (): Promise<TargetSettings> => {
    const res = await fetch(`${API_BASE_URL}/target/settings`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في قراءة إعدادات التارچت');
    }
    return res.json();
  },

  updateTargetSettings: async (settings: TargetSettings): Promise<any> => {
    const res = await fetch(`${API_BASE_URL}/target/settings`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(settings),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'فشل في تحديث إعدادات التارچت');
    }
    return res.json();
  },
};
