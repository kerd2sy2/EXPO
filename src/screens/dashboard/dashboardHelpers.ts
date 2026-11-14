import { WorkSession } from '../../types/delegate';
import { BranchStats, DelegateWithStatus } from '../../services/supervisor';
import { VehicleItem, isVehicleOilDue } from '../../services/operations';

export interface DashboardAnalytics {
  totalDrivers: number;
  activeCount: number;
  todayCount: number;
  finishedCount: number;
  idleCount: number;
  attendanceRate: number;
  assignedBikes: number;
  missingPlates: number;
  missingKeys: number;
  completedPendingCount: number;
  pendingOrdersSum: number;
  pendingKmSum: number;
  pendingFuelSum: number;
  oilDueCount: number;
  oilDueVehicles: VehicleItem[];
  driverByPlate: Map<string, DelegateWithStatus>;
  driverByKey: Map<string, DelegateWithStatus>;
  appDistribution: [string, number][];
}

export const getFirstTwoNames = (fullName?: string): string => {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return parts.join(' ');
  return `${parts[0]} ${parts[1]}`;
};

export const computeDashboardAnalytics = (
  allDelegates: DelegateWithStatus[],
  workingDelegates: DelegateWithStatus[],
  stats: BranchStats,
  pendingSessions: WorkSession[],
  vehicles: VehicleItem[]
): DashboardAnalytics => {
  const driversOnly = allDelegates.filter((d) => {
    const role = (d.job_role || (d as any).role_name || 'DRIVER').toUpperCase();
    return !role.includes('SUPERVISOR') && !role.includes('ADMIN');
  });

  const totalDrivers = driversOnly.length || stats.totalCount || 0;
  const actualWorkingDelegatesCount = workingDelegates.filter((d) => {
    const role = (d.job_role || (d as any).role_name || 'DRIVER').toUpperCase();
    return !role.includes('SUPERVISOR') && !role.includes('ADMIN');
  }).length;
  const activeCount = Math.max(actualWorkingDelegatesCount, stats.workingCount ?? 0);
  const todayCount =
    stats.todayEmployeesCount !== undefined && stats.todayEmployeesCount > 0
      ? Math.max(stats.todayEmployeesCount, activeCount)
      : activeCount;
  const finishedCount =
    stats.finishedEmployeesCount !== undefined
      ? stats.finishedEmployeesCount
      : Math.max(0, todayCount - activeCount);
  const idleCount = Math.max(0, totalDrivers - activeCount);
  const attendanceRate = totalDrivers > 0 ? Math.round((todayCount / totalDrivers) * 100) : 0;

  let assignedBikes = 0;
  let missingPlates = 0;
  let missingKeys = 0;
  const appCounts: Record<string, number> = {};
  const driverByPlate = new Map<string, DelegateWithStatus>();
  const driverByKey = new Map<string, DelegateWithStatus>();

  driversOnly.forEach((d) => {
    if (d.motorcycle_number && d.motorcycle_number.trim()) {
      assignedBikes++;
      driverByPlate.set(d.motorcycle_number.trim().toLowerCase(), d);
    } else {
      missingPlates++;
    }

    if (d.key_number && d.key_number.trim()) {
      driverByKey.set(d.key_number.trim().toLowerCase(), d);
    } else {
      missingKeys++;
    }

    const appName = (d.application_type || 'غير محدد').trim().toUpperCase();
    appCounts[appName] = (appCounts[appName] || 0) + 1;
  });

  const completedPending = pendingSessions.filter(
    (s) => s.status === 'COMPLETED' && Boolean(s.end_time)
  );
  let pendingOrdersSum = 0;
  let pendingKmSum = 0;
  let pendingFuelSum = 0;

  completedPending.forEach((s) => {
    pendingOrdersSum += Number(s.orders_count ?? 0);
    pendingFuelSum += Number(s.fuel_cost ?? 0);
    const dist =
      s.end_km !== undefined &&
      s.start_km !== undefined &&
      Number(s.end_km) >= Number(s.start_km) &&
      Number(s.end_km) > 0
        ? Number(s.end_km) - Number(s.start_km)
        : Number((s as any).total_km ?? s.distance ?? 0);
    pendingKmSum += dist;
  });

  const oilDueVehicles = vehicles.filter((v) => isVehicleOilDue(v));
  const oilDueCount = oilDueVehicles.length;

  const appDistribution = Object.entries(appCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return {
    totalDrivers,
    activeCount,
    todayCount,
    finishedCount,
    idleCount,
    attendanceRate,
    assignedBikes,
    missingPlates,
    missingKeys,
    completedPendingCount: completedPending.length,
    pendingOrdersSum,
    pendingKmSum,
    pendingFuelSum,
    oilDueCount,
    oilDueVehicles,
    driverByPlate,
    driverByKey,
    appDistribution,
  };
};
