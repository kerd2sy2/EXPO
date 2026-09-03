import { apiRequest, setAuthToken, saveCachedUser, getCachedUser, saveLastCredentialsForBiometrics } from './api';

export interface EmployeeProfile {
  id: string;
  name: string;
  national_id: string;
  motorcycle_number: string;
  key_number: string;
  employee_number: string;
  job_role: string;
  personal_image?: string;
  national_id_image?: string;
  driving_license_image?: string;
  passport_image?: string;
  vehicle_registration_image?: string;
  application_id?: string;
  application_type?: string;
  shift?: string;
  branch_id?: string;
  branch_name?: string;
  phone?: string;
}

export interface WorkSession {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee?: EmployeeProfile;
  start_time: string;
  end_time: string | null;
  start_km: number;
  start_km_image?: string;
  end_km: number;
  end_km_image?: string;
  distance: number;
  orders_count: number;
  fuel_cost: number;
  motorcycle_number: string;
  notes?: string;
  is_reviewed?: boolean;
  review_notes?: string;
  is_edited_by_supervisor?: boolean;
  edited_by_name?: string;
  original_orders_count?: number;
  original_end_km?: number;
  original_start_km?: number;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface LoginResult {
  access_token: string;
  refresh_token: string;
  is_employee: boolean;
  employee?: EmployeeProfile;
  admin?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export const workApi = {
  // Delegate Login
  login: async (login: string, password?: string): Promise<LoginResult> => {
    const cleanPass = (password || '').trim();
    if (!cleanPass) {
      throw new Error('يرجى إدخال كلمة المرور');
    }

    const data = await apiRequest<LoginResult>('/login', {
      method: 'POST',
      body: JSON.stringify({
        login: login.trim(),
        password: cleanPass,
      }),
    });

    if (data.access_token) {
      await setAuthToken(data.access_token);
      if (data.employee) {
        await saveCachedUser(data.employee);
        await saveLastCredentialsForBiometrics(login.trim(), data.access_token, data.employee);
      }
    }
    return data;
  },

  // Get current user / delegate profile
  getMe: async (): Promise<EmployeeProfile | null> => {
    try {
      const cached = await getCachedUser();
      const meResp = await apiRequest('/me');
      if (meResp && meResp.id) {
        let fullEmployee: any = cached ? { ...cached } : {};
        try {
          const empDetail = await apiRequest<EmployeeProfile>(`/employees/${meResp.id}`);
          if (empDetail && empDetail.id) {
            fullEmployee = { ...fullEmployee, ...empDetail };
          }
        } catch {
          fullEmployee = { ...fullEmployee, ...meResp };
        }

        if (cached) {
          fullEmployee = {
            ...cached,
            ...fullEmployee,
            motorcycle_number: fullEmployee.motorcycle_number || cached.motorcycle_number,
            key_number: fullEmployee.key_number || cached.key_number,
            national_id: fullEmployee.national_id || cached.national_id,
            personal_image: fullEmployee.personal_image || cached.personal_image,
            national_id_image: fullEmployee.national_id_image || cached.national_id_image,
            driving_license_image: fullEmployee.driving_license_image || cached.driving_license_image,
            passport_image: fullEmployee.passport_image || cached.passport_image,
            vehicle_registration_image: fullEmployee.vehicle_registration_image || cached.vehicle_registration_image,
            employee_number: fullEmployee.employee_number || cached.employee_number,
            phone: fullEmployee.phone || cached.phone,
            branch_name: fullEmployee.branch_name || cached.branch_name,
          };
        }

        await saveCachedUser(fullEmployee);
        return fullEmployee as EmployeeProfile;
      }
      return cached;
    } catch (e) {
      return await getCachedUser();
    }
  },

  // Check active shift for employee
  getActiveSession: async (employeeId: string): Promise<WorkSession | null> => {
    try {
      const data = await apiRequest<WorkSession>(`/work/active?employee_id=${employeeId}`);
      if (data && data.id && data.status === 'ACTIVE') {
        return data;
      }
      return null;
    } catch {
      // Fallback if not found or 404
      return null;
    }
  },

  // Start shift
  startShift: async (params: {
    employee_id: string;
    start_km: number;
    start_km_image?: string;
    motorcycle_number: string;
    notes?: string;
  }): Promise<WorkSession> => {
    return apiRequest<WorkSession>('/work/start', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // End shift
  endShift: async (params: {
    employee_id: string;
    end_km: number;
    end_km_image?: string;
    orders_count: number;
    fuel_cost: number;
    notes?: string;
  }): Promise<WorkSession> => {
    return apiRequest<WorkSession>('/work/end', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  // Get last ending odometer (last_km)
  getLastKM: async (employeeId: string, motorcycleNumber?: string): Promise<{ last_end_km: number; last_start_km: number } | null> => {
    try {
      const url = motorcycleNumber
        ? `/work/last-km?employee_id=${employeeId}&motorcycle_number=${encodeURIComponent(motorcycleNumber)}`
        : `/work/last-km?employee_id=${employeeId}`;
      const data = await apiRequest<{ last_end_km: number; last_start_km: number }>(url);
      return data;
    } catch {
      return null;
    }
  },

  // Get delegate shift history
  getMySessions: async (employeeId: string, limit = 50): Promise<WorkSession[]> => {
    try {
      const data: any = await apiRequest(`/reports?employee_id=${employeeId}&limit=${limit}`);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    } catch {
      return [];
    }
  },
};
