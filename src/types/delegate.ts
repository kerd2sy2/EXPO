export interface EmployeeProfile {
  id: string;
  name: string;
  national_id: string;
  motorcycle_number?: string;
  key_number?: string;
  employee_number?: string;
  job_role?: string;
  branch_id?: string;
  branch_name?: string;
  personal_image?: string;
  national_id_image?: string;
  driving_license_image?: string;
  passport_image?: string;
  vehicle_registration_image?: string;
  phone?: string;
}

export interface WorkSession {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee?: EmployeeProfile;
  start_time: string;
  end_time?: string | null;
  start_km: number;
  start_km_image?: string;
  end_km: number;
  end_km_image?: string;
  distance: number;
  orders_count: number;
  fuel_cost: number;
  motorcycle_number?: string;
  vehicle_type?: string;
  notes?: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  is_reviewed?: boolean;
  review_notes?: string;
  is_edited_by_supervisor?: boolean;
  edited_by_name?: string;
  original_orders_count?: number;
  original_end_km?: number;
  original_start_km?: number;
}

export interface SuccessModalData {
  type: 'start' | 'end';
  motorcycleNumber?: string;
  startKm?: number;
  endKm?: number;
  distance?: number;
  ordersCount?: number;
  fuelCost?: number;
  startTime?: string;
  endTime?: string;
  imageUri?: string | null;
  notes?: string;
}

export interface PreviewPhotoData {
  url: string;
  title: string;
}

export type TabType = 'home' | 'shift' | 'history' | 'profile';
export type Language = 'ar' | 'en' | 'bn';

export interface ThemeColors {
  bg: string;
  card: string;
  cardHeader: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  primary: string;
  primaryLight: string;
  primaryText: string;
  accent: string;
  accentLight: string;
  inputBg: string;
  inputBorder: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  errorBg: string;
  errorText: string;
}
