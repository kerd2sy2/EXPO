import {
  apiRequest,
  setAuthToken,
  saveCachedUser,
  getCachedUser,
  isBiometricEnabled,
  saveLastCredentialsForBiometrics,
  getStoredToken,
  loadStoredToken,
} from './api';

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
  start_plate_image?: string;
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

const WORK_CACHE_TTL_MS = 5000;
let meCache: EmployeeProfile | null = null;
let meCacheTime = 0;
let meInFlightPromise: Promise<EmployeeProfile | null> | null = null;

interface LastKmResult {
  last_end_km: number;
  last_start_km: number;
  is_odometer_broken?: boolean;
  registration_image?: string;
  needs_oil_change?: boolean;
  remaining_oil_km?: number;
  distance_since_oil?: number;
  remaining_days?: number;
  oil_status_message?: string;
}

const lastKmCache = new Map<string, { data: LastKmResult | null; time: number }>();
const lastKmInFlight = new Map<string, Promise<LastKmResult | null>>();

export const clearWorkCaches = () => {
  meCache = null;
  meCacheTime = 0;
  lastKmCache.clear();
};

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
        app: 'manadeeb',
      }),
    });

    if (data.access_token) {
      clearWorkCaches();
      await setAuthToken(data.access_token, data.refresh_token);
      const isActualAdmin =
        Boolean(data.admin?.role && (data.admin.role === 'ADMIN' || data.admin.role === 'SUPER_ADMIN' || data.admin.role === 'SUPERVISOR'));

      const bioOn = await isBiometricEnabled();
      if (!isActualAdmin && data.employee && data.employee.id) {
        await saveCachedUser(data.employee);
        if (bioOn) {
          await saveLastCredentialsForBiometrics(login.trim(), data.access_token, data.employee, data.refresh_token);
        }
      }
    }
    return data;
  },

  // Get current user / delegate profile
  getMe: async (forceRefresh = false): Promise<EmployeeProfile | null> => {
    if (!forceRefresh && meCache && Date.now() - meCacheTime < WORK_CACHE_TTL_MS) {
      return meCache;
    }
    if (!forceRefresh && meInFlightPromise) {
      return meInFlightPromise;
    }

    const currentPromise = (async (): Promise<EmployeeProfile | null> => {
      try {
        const cached = await getCachedUser();
        if (cached && (cached.is_admin || cached.role === 'ADMIN' || cached.role === 'SUPERVISOR' || cached.role === 'SUPER_ADMIN')) {
          return null;
        }
        const token = getStoredToken() || (await loadStoredToken());
        if (!token) {
          return null;
        }
        const meResp = await apiRequest(`/me?_t=${Date.now()}`, {
          timeoutMs: 8000,
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });
        if (meResp && meResp.id) {
          let fullEmployee: EmployeeProfile;
          if (meResp.national_id_image || meResp.driving_license_image) {
            fullEmployee = {
              ...(cached || {}),
              ...meResp,
              vehicle_registration_image: meResp.vehicle_registration_image || '',
              motorcycle_number: meResp.motorcycle_number || '',
            } as EmployeeProfile;
          } else {
            try {
              const empDetail = await apiRequest<EmployeeProfile>(`/employees/${meResp.id}`, { timeoutMs: 8000 });
              if (empDetail && empDetail.id) {
                fullEmployee = {
                  ...(cached || {}),
                  ...empDetail,
                  vehicle_registration_image: empDetail.vehicle_registration_image || '',
                  motorcycle_number: empDetail.motorcycle_number || '',
                } as EmployeeProfile;
              } else {
                fullEmployee = {
                  ...(cached || {}),
                  ...meResp,
                  vehicle_registration_image: meResp.vehicle_registration_image || '',
                  motorcycle_number: meResp.motorcycle_number || '',
                } as EmployeeProfile;
              }
            } catch {
              fullEmployee = {
                ...(cached || {}),
                ...meResp,
                vehicle_registration_image: meResp.vehicle_registration_image || '',
                motorcycle_number: meResp.motorcycle_number || '',
              } as EmployeeProfile;
            }
          }

          // If employee has a vehicle assigned but vehicle_registration_image is empty, auto-fetch from vehicle
          if (!fullEmployee.vehicle_registration_image && fullEmployee.motorcycle_number) {
            try {
              const vKm = await workApi.getLastKM(fullEmployee.id, fullEmployee.motorcycle_number);
              if (vKm?.registration_image) {
                fullEmployee.vehicle_registration_image = vKm.registration_image;
              }
            } catch {
              // non-blocking
            }
          }

          meCache = fullEmployee;
          meCacheTime = Date.now();
          await saveCachedUser(fullEmployee);
          return fullEmployee;
        }
        return cached;
      } catch (e) {
        return await getCachedUser();
      }
    })().finally(() => {
      if (meInFlightPromise === currentPromise) {
        meInFlightPromise = null;
      }
    });

    meInFlightPromise = currentPromise;
    return currentPromise;
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
    start_plate_image?: string;
    motorcycle_number: string;
    notes?: string;
  }): Promise<WorkSession> => {
    const session = await apiRequest<WorkSession>('/work/start', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    meCacheTime = 0;
    lastKmCache.clear();
    return session;
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
    const session = await apiRequest<WorkSession>('/work/end', {
      method: 'POST',
      body: JSON.stringify(params),
    });
    meCacheTime = 0;
    lastKmCache.clear();
    return session;
  },

  // Get last ending odometer (last_km)
  getLastKM: async (
    employeeId: string,
    motorcycleNumber?: string
  ): Promise<LastKmResult | null> => {
    const cacheKey = `${employeeId}:${motorcycleNumber || ''}`;
    const cachedEntry = lastKmCache.get(cacheKey);
    if (cachedEntry && Date.now() - cachedEntry.time < WORK_CACHE_TTL_MS) {
      return cachedEntry.data;
    }
    const existingPromise = lastKmInFlight.get(cacheKey);
    if (existingPromise) {
      return existingPromise;
    }

    const reqPromise = (async (): Promise<LastKmResult | null> => {
      try {
        const url = motorcycleNumber
          ? `/work/last-km?employee_id=${employeeId}&motorcycle_number=${encodeURIComponent(motorcycleNumber)}`
          : `/work/last-km?employee_id=${employeeId}`;
        const data = await apiRequest<LastKmResult>(url);
        lastKmCache.set(cacheKey, { data, time: Date.now() });
        return data;
      } catch {
        return null;
      }
    })().finally(() => {
      if (lastKmInFlight.get(cacheKey) === reqPromise) {
        lastKmInFlight.delete(cacheKey);
      }
    });

    lastKmInFlight.set(cacheKey, reqPromise);
    return reqPromise;
  },

  // Check oil change requirement for employee or specific motorcycle
  checkOilChange: async (
    employeeId?: string,
    motorcycleNumber?: string
  ): Promise<{
    needs_oil_change: boolean;
    total_distance?: number;
    distance_since_oil?: number;
    oil_change_interval?: number;
    vehicle_type?: string;
    is_odometer_broken?: boolean;
    remaining_days?: number;
    remaining_distance?: number;
    oil_status_message?: string;
  } | null> => {
    try {
      const params = new URLSearchParams();
      if (employeeId) params.append('employee_id', employeeId);
      if (motorcycleNumber) params.append('motorcycle_number', motorcycleNumber);
      const data = await apiRequest<{
        needs_oil_change: boolean;
        total_distance?: number;
        distance_since_oil?: number;
        oil_change_interval?: number;
        vehicle_type?: string;
      }>(`/work/check-oil?${params.toString()}`);
      return data;
    } catch {
      return null;
    }
  },

  // Smart Plate Scanner OCR
  scanPlate: async (imageBase64: string): Promise<{ digits: string; letters: string; full_plate: string; confidence?: number } | null> => {
    try {
      const data = await apiRequest<{ digits: string; letters: string; full_plate: string; confidence?: number }>('/work/scan-plate', {
        method: 'POST',
        body: JSON.stringify({ image: imageBase64 }),
        timeoutMs: 12000,
      });
      return data;
    } catch (err) {
      console.log('scanPlate api error:', err);
      return null;
    }
  },

  // Get delegate shift history (full month sessions)
  getMySessions: async (employeeId: string, limit = 300): Promise<WorkSession[]> => {
    try {
      const data: any = await apiRequest(`/reports?employee_id=${employeeId}&limit=${limit}`);
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.data)) return data.data;
      return [];
    } catch (err) {
      console.log('Error fetching shift history (getMySessions):', err);
      return [];
    }
  },
};
