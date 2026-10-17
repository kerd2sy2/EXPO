import { apiRequest } from './api';
import { EmployeeProfile, WorkSession } from '@shared/types';

export interface BranchStats {
  workingCount: number;
  totalCount: number;
  notStartedCount: number;
  pendingApprovalsCount: number;
  todayOrdersCount: number;
}

export interface DelegateWithStatus extends EmployeeProfile {
  is_working?: boolean;
  active_session?: WorkSession | null;
  last_location_at?: string;
  latitude?: number;
  longitude?: number;
  is_vpn?: boolean;
  photo_url?: string;
  out_of_zone?: boolean;
}

export interface SupervisorStartShiftParams {
  employeeId?: string;
  startKm: number;
  startKmImage?: string;
  startPlateImage?: string;
  motorcycleNumber?: string;
  vehicleType?: string;
  overrideReason: string;
  notes?: string;
}

export interface SupervisorEndShiftParams {
  employeeId?: string;
  endKm: number;
  endKmImage?: string;
  ordersCount: number;
  fuelCost: number;
  overrideReason: string;
  reviewNotes?: string;
  notes?: string;
}

export interface ReviewSessionParams {
  sessionId: string;
  isReviewed: boolean;
  reviewNotes?: string;
  ordersCount?: number;
  endKm?: number;
  startKm?: number;
  fuelCost?: number;
}

export interface PendingAdvanceRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  type: string; // 'advance' | 'internet_advance'
  amount: number;
  status: string;
  reason?: string;
  created_at: string;
}

export interface PendingMaintenanceRequest {
  id: string;
  employee_id?: string;
  employee_name?: string;
  motorcycle_number: string;
  issue_description: string;
  status: string;
  created_at: string;
}

export const supervisorApi = {
  // 1. Get all employees in supervisor branch (drivers only, full branch roster)
  getAllBranchDelegates: async (): Promise<DelegateWithStatus[]> => {
    try {
      const resp = await apiRequest<{ data?: DelegateWithStatus[] } | DelegateWithStatus[]>('/employees?limit=500&job_role=DRIVER', {
        timeoutMs: 10000,
      });
      let list: DelegateWithStatus[] = [];
      if (Array.isArray(resp)) {
        list = resp;
      } else if (resp && Array.isArray(resp.data)) {
        list = resp.data;
      }
      // Ensure only drivers (delegates), not supervisors or administrators
      return list.filter((e) => {
        const role = (e.job_role || (e as any).role_name || '').toUpperCase();
        return role === 'DRIVER' || (!role.includes('SUPERVISOR') && !role.includes('ADMIN'));
      });
    } catch (err) {
      console.warn('[supervisorApi] getAllBranchDelegates error:', err);
      return [];
    }
  },

  // 1b. Search delegates across all branches ("التركاية": يظهر عند البحث فقط)
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
      return list.filter((e) => {
        const role = (e.job_role || (e as any).role_name || '').toUpperCase();
        return role === 'DRIVER' || (!role.includes('SUPERVISOR') && !role.includes('ADMIN'));
      });
    } catch (err) {
      console.warn('[supervisorApi] searchDelegates error:', err);
      return [];
    }
  },

  // 2. Get currently working employees in supervisor branch
  getWorkingDelegates: async (): Promise<DelegateWithStatus[]> => {
    try {
      const resp = await apiRequest<DelegateWithStatus[]>('/employees/working', {
        timeoutMs: 10000,
      });
      return Array.isArray(resp) ? resp : [];
    } catch (err) {
      console.warn('[supervisorApi] getWorkingDelegates error:', err);
      return [];
    }
  },

  // 3. Get delegate live locations and zone status
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

  // 4. Start Supervisor Shift Override (e.g. Broken phone or manual shift start)
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

  // 5. End Supervisor Shift Override (e.g. Broken phone or manual shift end & review)
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

  // 6. Review & Approve an existing completed work session
  reviewSession: async (params: ReviewSessionParams): Promise<WorkSession> => {
    const payload = {
      is_reviewed: params.isReviewed,
      review_notes: params.reviewNotes || 'معتمد بواسطة المشرف',
      orders_count: params.ordersCount,
      end_km: params.endKm,
      start_km: params.startKm,
      fuel_cost: params.fuelCost,
    };

    const resp = await apiRequest<WorkSession>(`/work/sessions/${params.sessionId}/review`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });

    return resp;
  },

  // 7. Get pending maintenance requests in supervisor branch
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

  // 8. Approve/Reject Maintenance Request
  updateMaintenanceStatus: async (id: string, status: 'APPROVED' | 'REJECTED', notes?: string): Promise<any> => {
    return apiRequest(`/maintenance-requests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  // 9. Get unreviewed / pending sessions in branch for supervisor confirmation
  getPendingSessions: async (): Promise<WorkSession[]> => {
    try {
      const resp: any = await apiRequest('/reports?is_reviewed=false&limit=150', {
        timeoutMs: 10000,
      });
      if (Array.isArray(resp)) {
        return resp.filter((s: any) => !s.is_reviewed);
      }
      if (resp && Array.isArray(resp.data)) {
        return resp.data.filter((s: any) => !s.is_reviewed);
      }
      return [];
    } catch (err) {
      console.warn('[supervisorApi] getPendingSessions error:', err);
      return [];
    }
  },
};
