import { apiRequest, API_BASE_URL, getStoredToken, loadStoredToken } from './api';
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
  reviewVideoUrl?: string;
}

export interface OperationVideo {
  id: string;
  branch_id?: string;
  employee_id?: string;
  employee_name: string;
  order_number: string;
  session_id?: string;
  video_url: string;
  thumbnail_url?: string;
  duration_sec: number;
  file_size: number;
  notes: string;
  recorded_at: string;
  expires_at: string;
  days_left: number;
  is_deleted: boolean;
  created_at: string;
}

export interface UploadOperationVideoParams {
  videoUri: string;
  employeeId?: string;
  employeeName?: string;
  orderNumber?: string;
  sessionId?: string;
  branchId?: string;
  notes?: string;
  durationSec?: number;
}

export interface PendingAdvanceRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  type: string; // 'advance' | 'internet_advance' | 'supervisor_report' | 'investigation'
  amount?: number;
  status: string;
  reason?: string;
  report_text?: string;
  notes?: string;
  deduction_month?: string;
  supervisor_name?: string;
  created_at: string;
}

export interface CreateEmployeeReportParams {
  employeeId: string;
  employeeName?: string;
  nationalId?: string;
  type: 'supervisor_report' | 'advance' | 'internet_advance';
  reportText: string;
  amount?: number;
  deductionMonth?: string;
  notes?: string;
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
      review_video_url: params.reviewVideoUrl,
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
      const filterFinished = (s: any) => {
        const hasEnded = !!(s.end_time || s.end_km != null || (s.status && s.status !== 'ACTIVE' && s.status !== 'OPEN'));
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

  // 10. Get pending investigations, advances, and supervisor reports
  getPendingInvestigations: async (): Promise<PendingAdvanceRequest[]> => {
    try {
      const resp = await apiRequest<PendingAdvanceRequest[]>('/investigations', {
        timeoutMs: 8000,
      });
      if (Array.isArray(resp)) {
        return resp.filter(
          (inv) =>
            inv.status === 'pending' ||
            inv.status === 'PENDING' ||
            !inv.status
        );
      }
      return [];
    } catch (err) {
      console.warn('[supervisorApi] getPendingInvestigations error:', err);
      return [];
    }
  },

  // 11. Approve investigation/advance/report
  approveInvestigation: async (id: string): Promise<any> => {
    return apiRequest(`/investigations/${id}/approve`, {
      method: 'POST',
    });
  },

  // 12. Reject investigation/advance/report
  rejectInvestigation: async (id: string, reason?: string): Promise<any> => {
    return apiRequest(`/investigations/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'rejected', notes: reason }),
    });
  },

  // 13. Create supervisor report or employee advance request
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

  // 14. Update investigation/advance/report
  updateInvestigation: async (id: string, data: Partial<CreateEmployeeReportParams> & { status?: string }): Promise<any> => {
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

  // 15. Delete investigation/advance/report
  deleteInvestigation: async (id: string): Promise<any> => {
    return apiRequest(`/investigations/${id}`, {
      method: 'DELETE',
    });
  },

  // 16. Get all investigations
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

  // 17. Upload silent operation video (retained for 60 days on AAMS server)
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

  // 18. Get operation videos archive (with filters by date, employee, or order number)
  getOperationVideos: async (filter?: { date?: string; employeeName?: string; orderNumber?: string }): Promise<OperationVideo[]> => {
    try {
      const params = new URLSearchParams();
      if (filter?.date) params.append('date', filter.date);
      if (filter?.employeeName) params.append('employee_name', filter.employeeName);
      if (filter?.orderNumber) params.append('order_number', filter.orderNumber);
      params.append('limit', '100');

      const url = `/operation-videos?${params.toString()}`;
      const resp = await apiRequest<{ data: OperationVideo[]; total: number }>(url, {
        timeoutMs: 12000,
      });

      return resp?.data || [];
    } catch (err) {
      console.warn('[supervisorApi] getOperationVideos error:', err);
      return [];
    }
  },

  // 19. Update operation video order number or notes
  updateOperationVideo: async (id: string, updates: { orderNumber?: string; notes?: string }): Promise<any> => {
    return apiRequest(`/operation-videos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        order_number: updates.orderNumber,
        notes: updates.notes,
      }),
    });
  },

  // 20. Delete operation video manually if authorized
  deleteOperationVideo: async (id: string): Promise<any> => {
    return apiRequest(`/operation-videos/${id}`, {
      method: 'DELETE',
    });
  },
};



