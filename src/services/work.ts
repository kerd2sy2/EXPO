import { apiRequest, setAuthToken } from './api';

export interface EmployeeProfile {
  id: string;
  name: string;
  national_id: string;
  motorcycle_number: string;
  key_number: string;
  employee_number: string;
  job_role: string;
  personal_image?: string;
  application_id?: string;
  application_type?: string;
  shift?: string;
  branch_id?: string;
  branch_name?: string;
}

export interface WorkSession {
  id: string;
  employee_id: string;
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
    // If no password provided and login is email/ID, default password is last 6 digits of ID
    let finalPassword = password;
    if (!finalPassword) {
      const cleanId = login.includes('@') ? login.split('@')[0] : login;
      finalPassword = cleanId.length >= 6 ? cleanId.slice(-6) : cleanId;
    }

    const data = await apiRequest<LoginResult>('/login', {
      method: 'POST',
      body: JSON.stringify({
        login: login.trim(),
        password: finalPassword.trim(),
      }),
    });

    if (data.access_token) {
      setAuthToken(data.access_token);
    }
    return data;
  },

  // Get current user / delegate profile
  getMe: async (): Promise<any> => {
    return apiRequest('/me');
  },

  // Check active shift for employee
  getActiveSession: async (employeeId: string): Promise<WorkSession | null> => {
    try {
      const data = await apiRequest<{ data: WorkSession[] }>(`/reports?employee_id=${employeeId}&limit=1`);
      const list = data?.data || [];
      if (list.length > 0 && list[0].status === 'ACTIVE') {
        return list[0];
      }
      return null;
    } catch {
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
};
