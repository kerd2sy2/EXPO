import { useMemo } from 'react';
import { EmployeeProfile, WorkSession, ThemeColors } from '../types/delegate';
import { formatImageUrl } from '../services/api';
import {
  BranchStats,
  ServerDashboardStats,
  DelegateWithStatus,
  PendingMaintenanceRequest,
  PendingAdvanceRequest,
  isDeliveryDelegate,
  isEmployeeInBranch,
} from '../services/supervisor';
import { VehicleItem, isVehicleOilDue } from '../services/operations';

export function buildThemeColors(isDarkMode: boolean): ThemeColors {
  return isDarkMode
    ? {
        bg: '#000000',
        card: '#16161a',
        cardHeader: '#202026',
        textPrimary: '#ffffff',
        textSecondary: '#9ca3af',
        border: '#27272e',
        primary: '#0284c7',
        primaryLight: 'rgba(2, 132, 199, 0.16)',
        primaryText: '#38bdf8',
        accent: '#38bdf8',
        accentLight: 'rgba(56, 189, 248, 0.16)',
        inputBg: '#1c1c22',
        inputBorder: '#2e2e38',
        warningBg: 'rgba(234, 179, 8, 0.15)',
        warningBorder: 'rgba(234, 179, 8, 0.3)',
        warningText: '#fef08a',
        errorBg: 'rgba(239, 68, 68, 0.15)',
        errorText: '#fca5a5',
      }
    : {
        bg: '#f8fafc',
        card: '#ffffff',
        cardHeader: '#f1f5f9',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        primary: '#0369a1',
        primaryLight: '#f0f9ff',
        primaryText: '#0369a1',
        accent: '#0284c7',
        accentLight: '#f0f9ff',
        inputBg: '#ffffff',
        inputBorder: '#cbd5e1',
        warningBg: '#fef9c3',
        warningBorder: '#facc15',
        warningText: '#854d0e',
        errorBg: '#fee2e2',
        errorText: '#ef4444',
      };
}

interface AnalyticsInput {
  employee: EmployeeProfile | null;
  branchSessions: WorkSession[];
  historySessions: WorkSession[];
  serverDashboardStats: ServerDashboardStats | null;
  branchDelegates: DelegateWithStatus[];
  allBranchEmployees: DelegateWithStatus[];
  workingDelegates: DelegateWithStatus[];
  pendingSessions: WorkSession[];
  vehicles: VehicleItem[];
  pendingMaintenance: PendingMaintenanceRequest[];
  pendingAdvances: PendingAdvanceRequest[];
  readNotifIds: Set<string>;
  endKm: string;
  activeSession: WorkSession | null;
}

/**
 * Computes derived supervisor branch metrics, operational-day totals,
 * unread notification badges, and employee avatar URL.
 */
export function useAppAnalyticsAndDerivedState(input: AnalyticsInput) {
  const {
    employee,
    branchSessions,
    historySessions,
    serverDashboardStats,
    branchDelegates,
    allBranchEmployees,
    workingDelegates,
    pendingSessions,
    vehicles,
    pendingMaintenance,
    pendingAdvances,
    readNotifIds,
    endKm,
    activeSession,
  } = input;

  const monthlyTarget = 460;

  const sessionsSourceForAnalytics = branchSessions.length > 0 ? branchSessions : historySessions;

  const {
    todayApprovedOrdersCount,
    todayApprovedDistance,
    todayApprovedFuel,
  } = useMemo(() => {
    const now = new Date();
    const isSessionFromToday = (s: WorkSession): boolean => {
      const rawDate = s.start_time || (s as any).created_at;
      if (!rawDate) return false;
      try {
        const sDate = new Date(rawDate);
        const cutoff = 10;
        let startWindow: Date;
        let endWindow: Date;
        if (now.getHours() < cutoff) {
          const yDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          startWindow = new Date(yDate.getFullYear(), yDate.getMonth(), yDate.getDate(), 0, 0, 0, 0);
          endWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), cutoff, 0, 0, 0);
        } else {
          startWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          endWindow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, cutoff, 0, 0, 0);
        }
        return sDate >= startWindow && sDate < endWindow;
      } catch {
        return false;
      }
    };

    const todayApprovedSessions = sessionsSourceForAnalytics.filter((s) => {
      const isCompleted = s.status === 'COMPLETED' || !!s.end_time;
      if (!isCompleted || s.is_reviewed !== true) return false;
      return isSessionFromToday(s);
    });

    const computedOrders = todayApprovedSessions.reduce(
      (acc, s) => acc + (Number(s.orders_count ?? (s as any).total_orders) || 0),
      0
    );
    const computedDist = todayApprovedSessions.reduce((acc, s) => {
      const explicitDist = Number((s as any).total_km ?? s.distance ?? 0);
      if (explicitDist > 0) return acc + explicitDist;
      const startKm = Number(s.start_km ?? 0);
      const sEndKm = Number(s.end_km ?? 0);
      return sEndKm > startKm ? acc + (sEndKm - startKm) : acc;
    }, 0);
    const computedFuel = todayApprovedSessions.reduce(
      (acc, s) => acc + (Number(s.fuel_cost) || 0),
      0
    );

    return {
      todayApprovedOrdersCount:
        serverDashboardStats?.today_orders !== undefined
          ? Number(serverDashboardStats.today_orders)
          : computedOrders,
      todayApprovedDistance:
        serverDashboardStats?.today_distance !== undefined
          ? Number(serverDashboardStats.today_distance)
          : computedDist,
      todayApprovedFuel:
        serverDashboardStats?.today_fuel_cost !== undefined
          ? Number(serverDashboardStats.today_fuel_cost)
          : computedFuel,
    };
  }, [sessionsSourceForAnalytics, serverDashboardStats]);

  const branchScopedDelegates = useMemo(() => {
    const map = new Map<string, DelegateWithStatus>();
    branchDelegates.forEach((d) => {
      if (d?.id) map.set(String(d.id), d);
    });
    allBranchEmployees.forEach((d) => {
      if (d?.id && !map.has(String(d.id))) map.set(String(d.id), d);
    });
    workingDelegates.forEach((w) => {
      if (w?.id && (w.active_session_id || w.shift_start_time || w.active_session)) {
        const existing = map.get(String(w.id));
        map.set(String(w.id), { ...(existing || {}), ...w, is_working: true });
      }
    });

    const supervisorBranchId = employee?.branch_id ? String(employee.branch_id).trim() : undefined;
    const supervisorBranchName = employee?.branch_name ? String(employee.branch_name).trim() : undefined;

    return Array.from(map.values()).filter((emp) => {
      if (!isDeliveryDelegate(emp)) return false;
      if (supervisorBranchId || supervisorBranchName) {
        if (!isEmployeeInBranch(emp, supervisorBranchId, supervisorBranchName)) return false;
      }
      return true;
    });
  }, [branchDelegates, allBranchEmployees, workingDelegates, employee?.branch_id, employee?.branch_name]);

  const branchScopedWorkingDelegates = useMemo(() => {
    const supervisorBranchId = employee?.branch_id ? String(employee.branch_id).trim() : undefined;
    const supervisorBranchName = employee?.branch_name ? String(employee.branch_name).trim() : undefined;

    return workingDelegates.filter((d) => {
      if (!isDeliveryDelegate(d)) return false;
      if (!d.active_session_id && !d.shift_start_time && !d.active_session) return false;
      if (supervisorBranchId || supervisorBranchName) {
        return isEmployeeInBranch(d, supervisorBranchId, supervisorBranchName);
      }
      return true;
    });
  }, [workingDelegates, employee?.branch_id, employee?.branch_name]);

  const branchStats: BranchStats = useMemo(() => {
    const total = branchScopedDelegates.length;
    const working = Math.max(
      branchScopedWorkingDelegates.length,
      Number(serverDashboardStats?.working_employees || 0)
    );
    const effectiveTotal = Math.max(total, working);
    const notStarted = Math.max(0, effectiveTotal - working);
    const pendingShifts =
      pendingSessions.length > 0
        ? pendingSessions.length
        : sessionsSourceForAnalytics.filter(
            (s) => (s.status === 'COMPLETED' || !!s.end_time) && !s.is_reviewed
          ).length;

    return {
      workingCount: working,
      totalCount: effectiveTotal,
      notStartedCount: notStarted,
      pendingApprovalsCount: pendingShifts,
      todayOrdersCount: todayApprovedOrdersCount,
      todayEmployeesCount:
        serverDashboardStats?.today_employees !== undefined
          ? Math.max(Number(serverDashboardStats.today_employees), working)
          : working,
      finishedEmployeesCount:
        serverDashboardStats?.finished_employees !== undefined
          ? Number(serverDashboardStats.finished_employees)
          : undefined,
    };
  }, [
    branchScopedDelegates,
    branchScopedWorkingDelegates,
    pendingSessions.length,
    sessionsSourceForAnalytics,
    todayApprovedOrdersCount,
    serverDashboardStats,
  ]);

  const calculatedDistance =
    endKm && activeSession?.start_km && Number(endKm) >= Number(activeSession.start_km)
      ? Number(endKm) - Number(activeSession.start_km)
      : 0;

  const unreadNotificationsCount = useMemo(() => {
    let count = 0;
    pendingSessions.forEach((s) => {
      if (!readNotifIds.has(`shift_end_${s.id}`)) count++;
    });
    branchScopedWorkingDelegates.forEach((d) => {
      const bike = d.active_motorcycle || d.motorcycle_number || 'بدون لوحة';
      if (!readNotifIds.has(`working_shift_${d.id}_${bike}`)) count++;
    });
    vehicles.forEach((v) => {
      if (isVehicleOilDue(v) && !readNotifIds.has(`oil_due_${v.id}`)) count++;
    });
    pendingMaintenance.forEach((m) => {
      if (!readNotifIds.has(`maintenance_${m.id}`)) count++;
    });
    pendingAdvances.forEach((adv) => {
      if (!readNotifIds.has(`advance_${adv.id}`)) count++;
    });
    return count;
  }, [
    pendingSessions,
    branchScopedWorkingDelegates,
    vehicles,
    pendingMaintenance,
    pendingAdvances,
    readNotifIds,
  ]);

  const rawEmpPhoto = useMemo(() => {
    const direct =
      (employee?.personal_image && typeof employee.personal_image === 'string' && employee.personal_image.trim()) ||
      ((employee as any)?.avatar && typeof (employee as any).avatar === 'string' && (employee as any).avatar.trim()) ||
      ((employee as any)?.google_avatar && typeof (employee as any).google_avatar === 'string' && (employee as any).google_avatar.trim()) ||
      ((employee as any)?.photo && typeof (employee as any).photo === 'string' && (employee as any).photo.trim()) ||
      ((employee as any)?.employee?.personal_image && typeof (employee as any).employee.personal_image === 'string' && (employee as any).employee.personal_image.trim()) ||
      ((employee as any)?.image && typeof (employee as any).image === 'string' && (employee as any).image.trim());
    if (direct) return direct;

    const allEmps = allBranchEmployees.length > 0 ? allBranchEmployees : branchDelegates;
    if (employee && allEmps.length > 0) {
      const match = allEmps.find(
        (emp) =>
          (emp.id && emp.id === (employee as any).employee_id) ||
          (emp.id && emp.id === employee.id) ||
          (emp.phone && employee.phone && emp.phone.replace(/\D/g, '') === employee.phone.replace(/\D/g, '')) ||
          (emp.name && employee.name && emp.name.trim().toLowerCase() === employee.name.trim().toLowerCase())
      );
      if (match?.personal_image && typeof match.personal_image === 'string' && match.personal_image.trim()) {
        return match.personal_image.trim();
      }
    }
    return null;
  }, [employee, allBranchEmployees, branchDelegates]);

  return {
    monthlyTarget,
    todayApprovedOrdersCount,
    todayApprovedDistance,
    todayApprovedFuel,
    branchScopedDelegates,
    branchScopedWorkingDelegates,
    branchStats,
    calculatedDistance,
    unreadNotificationsCount,
    empPhotoUrl: formatImageUrl(rawEmpPhoto),
  };
}
