import { apiRequest } from './api';

export interface InventoryItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  unit?: string;
  min_limit?: number;
  barcode?: string;
}

export interface VehicleItem {
  id: string;
  plate_number: string;
  type?: string;
  model?: string;
  year?: string;
  vin?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'OUT_OF_SERVICE' | 'INACTIVE';
  current_km?: number;
  branch_id?: string;
  created_at?: string;
}

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
    const payload = {
      plate_number: params.motorcycleNumber.trim(),
      current_km: Number(params.currentKm) || 0,
      item_id: params.oilItemId || '',
      quantity: Number(params.quantity) || 1,
      notes: params.notes || 'صرف زيت معتمد من المشرف',
    };

    return apiRequest('/inventory/dispense-oil', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // 3. Get all vehicles in supervisor branch
  getVehicles: async (): Promise<VehicleItem[]> => {
    try {
      const resp = await apiRequest<{ data?: VehicleItem[] } | VehicleItem[]>('/vehicles', {
        timeoutMs: 8000,
      });
      if (Array.isArray(resp)) return resp;
      if (resp && Array.isArray((resp as any).data)) return (resp as any).data;
      return [];
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
};
