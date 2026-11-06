import { apiRequest } from './api';

export interface InventoryItem {
  id: string;
  name: string;
  type?: string;
  category?: string;
  quantity?: number;
  branch_quantity?: number;
  unit?: string;
  min_alert?: number;
  min_limit?: number;
  barcode?: string;
}

export interface VehicleItem {
  id: string;
  plate_number: string;
  type?: string;
  vehicle_type?: string;
  brand?: string;
  model?: string;
  model_year?: string;
  year?: string;
  vin?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'INACTIVE' | 'AVAILABLE' | 'IN_USE';
  current_km?: number;
  last_oil_change_km?: number;
  total_distance?: number;
  is_odometer_broken?: boolean;
  needs_oil_change?: boolean;
  remaining_oil_km?: number;
  key_number?: string;
  branch_id?: string;
  notes?: string;
  last_oil_change_date?: string;
  last_oil_change_at?: string;
  created_at?: string;
}

// Helper to normalize vehicle item whether backend returns { vehicle: {...}, needs_oil_change, remaining_oil_km } or flat Vehicle
export const normalizeVehicle = (item: any): VehicleItem => {
  if (!item) return {} as VehicleItem;
  if (item.vehicle && typeof item.vehicle === 'object') {
    return {
      ...item.vehicle,
      needs_oil_change: item.needs_oil_change ?? item.vehicle.needs_oil_change,
      remaining_oil_km: item.remaining_oil_km ?? item.vehicle.remaining_oil_km,
    };
  }
  return item as VehicleItem;
};

// Helper to determine if a vehicle requires an oil change
export const isVehicleOilDue = (v: any): boolean => {
  if (!v) return false;

  const plate = String(v.plate_number || v.motorcycle_number || '');
  const isBroken = Boolean(v.is_odometer_broken) || plate.includes('7569') || plate.includes('8043');

  if (isBroken) {
    const lastDateStr = v.last_oil_change_date || v.last_oil_change_at;
    if (lastDateStr) {
      const lastDate = new Date(lastDateStr).getTime();
      const now = Date.now();
      const diffDays = (now - lastDate) / (1000 * 60 * 60 * 24);
      return diffDays >= 4; // كل 4 أو 5 أيام يظهر؛ وإذا صُرف له زيت يختفي فوراً
    }
    return true;
  }

  if (typeof v.needs_oil_change === 'boolean') {
    return v.needs_oil_change;
  }
  const curr = Number(v.current_km || 0);
  const last = Number(v.last_oil_change_km || 0);
  const totalDist = Number(v.total_distance || 0);
  const interval = String(v.vehicle_type || v.type || '').toLowerCase() === 'car' ? 10000 : 950;
  if (last > 0 && curr >= last) {
    return curr - last >= interval;
  }
  if (totalDist > 0) {
    return totalDist >= interval;
  }
  return false;
};

export interface DispenseOilParams {
  motorcycleNumber: string;
  currentKm: number;
  oilItemId?: string;
  quantity?: number;
  notes?: string;
}

export interface CreateVehicleParams {
  plateNumber: string;
  model?: string;
  vehicleType?: string;
  vin?: string;
  initialKm?: number;
  status?: string;
}

export interface ReportAccidentParams {
  employeeId?: string;
  employeeName?: string;
  motorcycleNumber: string;
  description: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  photoUrl?: string;
}

export const operationsApi = {
  // 1. Get branch warehouse items
  getInventoryItems: async (): Promise<InventoryItem[]> => {
    try {
      const resp = await apiRequest<{ data?: InventoryItem[] } | InventoryItem[]>('/inventory/items', {
        timeoutMs: 8000,
      });
      if (Array.isArray(resp)) return resp;
      if (resp && Array.isArray((resp as any).data)) return (resp as any).data;
      return [];
    } catch (err) {
      console.warn('[operationsApi] getInventoryItems error:', err);
      return [];
    }
  },

  // 2. Dispense oil for a motorcycle and update vehicle KM
  dispenseOil: async (params: DispenseOilParams): Promise<any> => {
    const payload: Record<string, any> = {
      plate_number: params.motorcycleNumber.trim(),
      current_km: Number(params.currentKm) || 0,
      quantity: Number(params.quantity) || 1,
      notes: params.notes || 'صرف زيت معتمد من المشرف',
    };
    if (params.oilItemId) {
      payload.item_id = params.oilItemId;
    }

    return apiRequest('/inventory/dispense-oil', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 3. Get all vehicles in supervisor branch
  getVehicles: async (branchId?: string): Promise<VehicleItem[]> => {
    try {
      const q = branchId ? `&branch_id=${encodeURIComponent(branchId)}` : '';
      const resp = await apiRequest<{ data?: any[] } | any[]>(`/vehicles?limit=500${q}`, {
        timeoutMs: 10000,
      });
      const rawList = Array.isArray(resp)
        ? resp
        : resp && Array.isArray((resp as any).data)
        ? (resp as any).data
        : [];
      return rawList.map(normalizeVehicle).filter((v) => Boolean(v && v.plate_number));
    } catch (err) {
      console.warn('[operationsApi] getVehicles error:', err);
      return [];
    }
  },

  // 4. Create and register a new vehicle
  createVehicle: async (params: CreateVehicleParams): Promise<VehicleItem> => {
    const payload = {
      plate_number: params.plateNumber.trim(),
      model: params.model?.trim() || 'دباب توصيل',
      type: params.vehicleType || 'motorcycle',
      vin: params.vin?.trim() || '',
      current_km: Number(params.initialKm) || 0,
      status: params.status || 'ACTIVE',
    };

    const resp = await apiRequest<{ data?: VehicleItem } | VehicleItem>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return (resp as any)?.data || resp;
  },

  // 5. Submit accident or emergency damage report
  reportAccident: async (params: ReportAccidentParams): Promise<any> => {
    const payload = {
      employee_id: params.employeeId || '',
      motorcycle_number: params.motorcycleNumber.trim(),
      issue_description: `[حادث/عطل طارئ - درجة الخطورة: ${params.severity || 'MEDIUM'}] ${params.description}`,
      priority: params.severity === 'HIGH' ? 'URGENT' : 'HIGH',
      photo_url: params.photoUrl || '',
      status: 'PENDING',
    };

    return apiRequest('/maintenance-requests', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 6. Update vehicle status (e.g. ACTIVE <-> MAINTENANCE)
  updateVehicleStatus: async (id: string, status: 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE'): Promise<any> => {
    return apiRequest(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  // 7. Update vehicle details (last oil change KM, current KM, date, notes)
  updateVehicle: async (
    id: string,
    params: {
      last_oil_change_km?: number;
      current_km?: number;
      key_number?: string;
      last_oil_change_date?: string;
      notes?: string;
    }
  ): Promise<any> => {
    return apiRequest(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(params),
    });
  },
};
