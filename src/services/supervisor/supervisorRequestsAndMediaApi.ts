import {
  apiRequest,
  API_BASE_URL,
  getCurrentBranchId,
  getStoredToken,
  loadStoredToken,
} from '../api';
import { WorkSession } from '@shared/types';
import {
  CreateEmployeeReportParams,
  OperationVideo,
  PendingAdvanceRequest,
  PendingMaintenanceRequest,
  UploadOperationVideoParams,
} from './supervisorTypes';

export const supervisorRequestsAndMediaApi = {
  getPendingMaintenance: async (): Promise<PendingMaintenanceRequest[]> => {
    try {
      const resp = await apiRequest<PendingMaintenanceRequest[]>('/maintenance-requests', {
        timeoutMs: 8000,
      });
      return Array.isArray(resp) ? resp.filter((m) => m.status === 'PENDING' || m.status === 'pending') : [];
    } catch {
      return [];
    }
  },

  updateMaintenanceStatus: async (id: string, status: 'APPROVED' | 'REJECTED', notes?: string): Promise<any> => {
    return apiRequest(`/maintenance-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  getPendingSessions: async (): Promise<WorkSession[]> => {
    try {
      const resp: any = await apiRequest('/reports?is_reviewed=false&status=COMPLETED&limit=150', {
        timeoutMs: 10000,
      });
      const filterFinished = (s: any) => {
        const hasEnded = !s.is_reviewed && s.status !== 'ACTIVE' && s.status !== 'OPEN' && !!s.end_time;
        return !s.is_reviewed && hasEnded;
      };
      if (Array.isArray(resp)) {
        return resp.filter(filterFinished);
      }
      if (resp && Array.isArray(resp.data)) {
        return resp.data.filter(filterFinished);
      }
      return [];
    } catch (err) {
      console.warn('[supervisorApi] getPendingSessions error:', err);
      return [];
    }
  },

  getPendingInvestigations: async (): Promise<PendingAdvanceRequest[]> => {
    try {
      const resp = await apiRequest<PendingAdvanceRequest[]>('/investigations', {
        timeoutMs: 8000,
      });
      if (Array.isArray(resp)) {
        return resp.filter(
          (inv) => inv.status === 'pending' || inv.status === 'PENDING' || !inv.status
        );
      }
      return [];
    } catch (err) {
      console.warn('[supervisorApi] getPendingInvestigations error:', err);
      return [];
    }
  },

  approveInvestigation: async (id: string): Promise<any> => {
    return apiRequest(`/investigations/${id}/approve`, { method: 'POST' });
  },

  rejectInvestigation: async (id: string, reason?: string): Promise<any> => {
    return apiRequest(`/investigations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'rejected', notes: reason }),
    });
  },

  createEmployeeReportOrAdvance: async (params: CreateEmployeeReportParams): Promise<any> => {
    const payload = {
      employee_id: params.employeeId,
      employee_name: params.employeeName || '',
      national_id: params.nationalId || '',
      type: params.type,
      report_text: params.reportText,
      amount: params.amount,
      deduction_month: params.deductionMonth,
      notes: params.notes || params.reportText,
    };

    return apiRequest('/investigations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateInvestigation: async (
    id: string,
    data: Partial<CreateEmployeeReportParams> & { status?: string }
  ): Promise<any> => {
    return apiRequest(`/investigations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        employee_id: data.employeeId,
        employee_name: data.employeeName,
        national_id: data.nationalId,
        type: data.type,
        report_text: data.reportText,
        amount: data.amount,
        deduction_month: data.deductionMonth,
        notes: data.notes || data.reportText,
        status: data.status,
      }),
    });
  },

  deleteInvestigation: async (id: string): Promise<any> => {
    return apiRequest(`/investigations/${id}`, { method: 'DELETE' });
  },

  getAllInvestigations: async (): Promise<PendingAdvanceRequest[]> => {
    try {
      const resp = await apiRequest<PendingAdvanceRequest[]>('/investigations', {
        timeoutMs: 8000,
      });
      return Array.isArray(resp) ? resp : [];
    } catch (err) {
      console.warn('[supervisorApi] getAllInvestigations error:', err);
      return [];
    }
  },

  uploadOperationVideo: async (params: UploadOperationVideoParams): Promise<OperationVideo> => {
    const token = getStoredToken() || (await loadStoredToken());
    const formData = new FormData();

    const filename = params.videoUri.split('/').pop() || `operation_video_${Date.now()}.mp4`;
    // @ts-ignore: React Native FormData file shape
    formData.append('video', {
      uri: params.videoUri,
      name: filename,
      type: 'video/mp4',
    });

    if (params.employeeId) formData.append('employee_id', params.employeeId);
    if (params.employeeName) formData.append('employee_name', params.employeeName);
    if (params.orderNumber) formData.append('order_number', params.orderNumber);
    if (params.sessionId) formData.append('session_id', params.sessionId);
    if (params.branchId) formData.append('branch_id', params.branchId);
    if (params.notes) formData.append('notes', params.notes);
    if (params.durationSec) formData.append('duration_sec', String(params.durationSec));

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/operation-videos/upload`);
      xhr.timeout = 60000;
      xhr.setRequestHeader('Accept', 'application/json');
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      const activeBranchId = getCurrentBranchId();
      if (activeBranchId) {
        xhr.setRequestHeader('X-Branch-ID', activeBranchId);
      }

      xhr.onload = () => {
        let resData: any;
        try {
          resData = JSON.parse(xhr.responseText);
        } catch {
          resData = { error: xhr.responseText };
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(resData.data || resData);
        } else {
          reject(new Error(resData?.error || resData?.message || `فشل في رفع الفيديو (رمز: ${xhr.status})`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('فشل الاتصال بالخادم أثناء رفع الفيديو. يرجى التحقق من الشبكة.'));
      };

      xhr.ontimeout = () => {
        reject(new Error('انتهت مهلة رفع الفيديو (60 ثانية). يرجى المحاولة مجدداً.'));
      };

      xhr.send(formData);
    });
  },

  getOperationVideos: async (filter?: {
    date?: string;
    employeeName?: string;
    orderNumber?: string;
  }): Promise<OperationVideo[]> => {
    try {
      const params = new URLSearchParams();
      if (filter?.date) params.append('date', filter.date);
      if (filter?.employeeName) params.append('employee_name', filter.employeeName);
      if (filter?.orderNumber) params.append('order_number', filter.orderNumber);
      params.append('limit', '100');

      const resp = await apiRequest<{ data: OperationVideo[]; total: number }>(
        `/operation-videos?${params.toString()}`,
        { timeoutMs: 12000 }
      );
      return resp?.data || [];
    } catch (err) {
      console.warn('[supervisorApi] getOperationVideos error:', err);
      return [];
    }
  },

  updateOperationVideo: async (id: string, updates: { orderNumber?: string; notes?: string }): Promise<any> => {
    return apiRequest(`/operation-videos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        order_number: updates.orderNumber,
        notes: updates.notes,
      }),
    });
  },

  deleteOperationVideo: async (id: string): Promise<any> => {
    return apiRequest(`/operation-videos/${id}`, { method: 'DELETE' });
  },
};
