import { apiRequest } from '../api';
import { WorkSession } from '@shared/types';
import {
  DelegateWithStatus,
  ReviewSessionParams,
  ServerDashboardStats,
  SupervisorEndShiftParams,
  SupervisorStartShiftParams,
  isDeliveryDelegate,
  isEmployeeInBranch,
} from './supervisorTypes';

export const supervisorDelegatesApi = {
  getAllEmployees: async (branchId?: string): Promise<DelegateWithStatus[]> => {
    try {
      const q = branchId ? `&branch_id=${encodeURIComponent(branchId)}` : '';
      const resp = await apiRequest<{ data?: DelegateWithStatus[] } | DelegateWithStatus[]>(
        `/employees?limit=500${q}`,
        { timeoutMs: 10000 }
      );
      let list: DelegateWithStatus[] = [];
      if (Array.isArray(resp)) {
        list = resp;
      } else if (resp && Array.isArray((resp as any).data)) {
        list = (resp as any).data;
      }
      if (branchId) {
        list = list.filter((e) => isEmployeeInBranch(e, branchId));
      }
      return list;
    } catch (err) {
      console.warn('[supervisorApi] getAllEmployees error:', err);
      return [];
    }
  },

  updateEmployee: async (id: string, data: Partial<any>): Promise<{ message?: string; data?: any }> => {
    return await apiRequest<{ message?: string; data?: any }>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      timeoutMs: 15000,
    });
  },

  resetEmployeePassword: async (id: string, newPassword: string): Promise<any> => {
    return await apiRequest(`/employees/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ new_password: newPassword }),
      timeoutMs: 10000,
    });
  },

  getAllBranchDelegates: async (branchId?: string): Promise<DelegateWithStatus[]> => {
    try {
      const q = branchId ? `&branch_id=${encodeURIComponent(branchId)}` : '';
      const resp = await apiRequest<{ data?: DelegateWithStatus[] } | DelegateWithStatus[]>(
        `/employees?limit=500${q}`,
        { timeoutMs: 10000 }
      );
      let list: DelegateWithStatus[] = [];
      if (Array.isArray(resp)) {
        list = resp;
      } else if (resp && Array.isArray(resp.data)) {
        list = resp.data;
      }
      return list.filter((e) => {
        if (!isDeliveryDelegate(e)) return false;
        if (branchId && !isEmployeeInBranch(e, branchId)) return false;
        return true;
      });
    } catch (err) {
      console.warn('[supervisorApi] getAllBranchDelegates error:', err);
      return [];
    }
  },

  searchDelegates: async (query: string): Promise<DelegateWithStatus[]> => {
    try {
      if (!query || query.trim().length === 0) return [];
      const resp = await apiRequest<{ data?: DelegateWithStatus[] } | DelegateWithStatus[]>(
        `/employees/search?q=${encodeURIComponent(query.trim())}&all_branches=true`,
        { timeoutMs: 10000 }
      );
      let list: DelegateWithStatus[] = [];
      if (Array.isArray(resp)) {
        list = resp;
      } else if (resp && Array.isArray((resp as any).data)) {
        list = (resp as any).data;
      }
      return list.filter(isDeliveryDelegate);
    } catch (err) {
      console.warn('[supervisorApi] searchDelegates error:', err);
      return [];
    }
  },

  getWorkingDelegates: async (branchId?: string): Promise<DelegateWithStatus[]> => {
    try {
      const q = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
      const resp = await apiRequest<DelegateWithStatus[]>(`/employees/working${q}`, {
        timeoutMs: 10000,
      });
      const list = Array.isArray(resp) ? resp : [];
      return list.filter((e) => {
        if (!isDeliveryDelegate(e)) return false;
        if (branchId && !isEmployeeInBranch(e, branchId)) return false;
        return Boolean(
          e.active_session_id ||
            e.shift_start_time ||
            (e.active_session && (e.active_session.status === 'ACTIVE' || !e.active_session.end_time))
        );
      });
    } catch (err) {
      console.warn('[supervisorApi] getWorkingDelegates error:', err);
      return [];
    }
  },

  getDelegateLocations: async (): Promise<any[]> => {
    try {
      const resp = await apiRequest<{ data?: any[] } | any[]>('/employees/locations', {
        timeoutMs: 10000,
      });
      if (resp && Array.isArray((resp as any).data)) {
        return (resp as any).data;
      }
      return Array.isArray(resp) ? resp : [];
    } catch (err) {
      console.warn('[supervisorApi] getDelegateLocations error:', err);
      return [];
    }
  },

  startShiftOverride: async (params: SupervisorStartShiftParams): Promise<WorkSession> => {
    const payload = {
      employee_id: params.employeeId || '',
      start_km: Number(params.startKm) || 0,
      start_km_image: params.startKmImage || '',
      start_plate_image: params.startPlateImage || '',
      motorcycle_number: params.motorcycleNumber || '',
      vehicle_type: params.vehicleType || 'motorcycle',
      override_reason: params.overrideReason || 'تجاوز إداري بطلب المشرف',
      notes: params.notes || '',
    };

    const resp = await apiRequest<{ message: string; data: WorkSession }>('/work/supervisor/start-shift', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return resp?.data || (resp as any);
  },

  endShiftOverride: async (params: SupervisorEndShiftParams): Promise<WorkSession> => {
    const payload = {
      employee_id: params.employeeId || '',
      end_km: Number(params.endKm) || 0,
      end_km_image: params.endKmImage || '',
      orders_count: Number(params.ordersCount) || 0,
      fuel_cost: Number(params.fuelCost) || 0,
      override_reason: params.overrideReason || 'إنهاء واعتماد يدوي بواسطة المشرف',
      review_notes: params.reviewNotes || '',
      notes: params.notes || '',
    };

    const resp = await apiRequest<{ message: string; data: WorkSession }>('/work/supervisor/end-shift', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return resp?.data || (resp as any);
  },

  reviewSession: async (params: ReviewSessionParams): Promise<WorkSession> => {
    const payload = {
      is_reviewed: params.isReviewed,
      review_notes: params.reviewNotes || 'معتمد بواسطة المشرف',
      orders_count: params.ordersCount,
      end_km: params.endKm,
      start_km: params.startKm,
      fuel_cost: params.fuelCost,
      review_video_url: params.reviewVideoUrl,
      start_time: params.startTime,
      end_time: params.endTime,
      application_id: params.applicationId,
    };

    return apiRequest<WorkSession>(`/work/sessions/${params.sessionId}/review`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  getOrdersReview: async (params: {
    date?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<WorkSession[]> => {
    try {
      let url = `/reports?limit=${params.limit || 500}`;
      if (params.date) {
        url += `&start_date=${params.date}&end_date=${params.date}`;
      } else {
        if (params.startDate) url += `&start_date=${params.startDate}`;
        if (params.endDate) url += `&end_date=${params.endDate}`;
      }
      if (params.employeeId) {
        url += `&employee_id=${params.employeeId}`;
      }
      const resp: any = await apiRequest(url, { timeoutMs: 12000 });
      if (Array.isArray(resp)) return resp;
      if (resp && Array.isArray(resp.data)) return resp.data;
      return [];
    } catch (err) {
      console.warn('[supervisorApi] getOrdersReview error:', err);
      return [];
    }
  },

  getBranchSessions: async (limit: number = 300, _page: number = 1): Promise<WorkSession[]> => {
    return supervisorDelegatesApi.getOrdersReview({ limit });
  },

  getDashboardStats: async (branchId?: string): Promise<ServerDashboardStats | null> => {
    try {
      const q = branchId ? `?branch_id=${encodeURIComponent(branchId)}` : '';
      const resp = await apiRequest<ServerDashboardStats>(`/dashboard${q}`, {
        timeoutMs: 10000,
      });
      return resp || null;
    } catch (err) {
      console.warn('[supervisorApi] getDashboardStats error:', err);
      return null;
    }
  },
};
