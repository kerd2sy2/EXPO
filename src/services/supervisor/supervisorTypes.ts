import { EmployeeProfile, WorkSession } from '@shared/types';

export interface BranchStats {
  workingCount: number;
  totalCount: number;
  notStartedCount: number;
  pendingApprovalsCount: number;
  todayOrdersCount: number;
  todayEmployeesCount?: number;
  finishedEmployeesCount?: number;
}

export interface ServerDashboardStats {
  total_employees: number;
  active_employees: number;
  today_employees: number;
  working_employees: number;
  finished_employees: number;
  total_motorcycles: number;
  active_motorcycles: number;
  today_orders: number;
  today_distance: number;
  today_fuel_cost: number;
  avg_working_hours: number;
}

export interface DelegateWithStatus extends EmployeeProfile {
  is_working?: boolean;
  active_session?: WorkSession | null;
  active_session_id?: string;
  last_location_at?: string;
  latitude?: number;
  longitude?: number;
  is_vpn?: boolean;
  photo_url?: string;
  out_of_zone?: boolean;
  active_motorcycle?: string;
  shift_start_time?: string;
  start_km?: number;
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
  startTime?: string;
  endTime?: string;
  applicationId?: string;
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
  type: string;
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
  current_km?: number;
}

export const isDeliveryDelegate = (emp: any): boolean => {
  if (!emp) return false;
  if (emp.is_admin) return false;

  const rawRole = String(
    emp.job_role ||
      emp.role_name ||
      emp.role ||
      emp.role_obj?.name ||
      ''
  )
    .trim()
    .toUpperCase();

  if (
    rawRole.includes('SUPERVISOR') ||
    rawRole.includes('ADMIN') ||
    rawRole.includes('MANAGEMENT') ||
    rawRole.includes('ACCOUNTANT') ||
    rawRole.includes('CLEANER') ||
    rawRole.includes('مشرف') ||
    rawRole.includes('إدار') ||
    rawRole.includes('مدير') ||
    rawRole.includes('محاسب') ||
    rawRole.includes('عامل') ||
    rawRole.includes('نظافة')
  ) {
    return false;
  }

  return true;
};

export const isEmployeeInBranch = (
  emp: any,
  targetBranchId?: string | null,
  targetBranchName?: string | null
): boolean => {
  if (!emp) return false;
  const cleanTargetId = targetBranchId ? String(targetBranchId).trim().toLowerCase() : '';
  const cleanTargetName = targetBranchName ? String(targetBranchName).trim().toLowerCase() : '';

  if (!cleanTargetId && !cleanTargetName) return true;

  const empBranchId = String(emp.branch_id || emp.branch?.id || '').trim().toLowerCase();
  const empBranchName = String(emp.branch_name || emp.branch?.name || '').trim().toLowerCase();

  if (cleanTargetId && empBranchId) {
    return empBranchId === cleanTargetId;
  }

  if (cleanTargetName && empBranchName) {
    return empBranchName === cleanTargetName;
  }

  if (cleanTargetId && empBranchId && empBranchId !== cleanTargetId) {
    return false;
  }

  return true;
};
