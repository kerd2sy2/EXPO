import { DelegateWithStatus } from '../../services/supervisor';
import { VehicleItem } from '../../services/operations';
import { toEnglishDigits } from '@shared/utils/plateUtils';

export interface OilStatusInfo {
  assignedDriver?: DelegateWithStatus;
  keyDisplay: string;
  currKm: number;
  lastOilKm: number;
  isBroken: boolean;
  remainingKm: number;
  isOverdue: boolean;
  brokenDaysSince: number;
  brokenDaysLeft: number;
  formattedLastDate: string;
}

export function buildDriverMaps(delegates: DelegateWithStatus[]) {
  const byPlate = new Map<string, DelegateWithStatus>();
  const byKey = new Map<string, DelegateWithStatus>();

  delegates.forEach((d) => {
    const p = (d.active_motorcycle || d.motorcycle_number || '').trim().toLowerCase();
    const k = (d.key_number || '').trim().toLowerCase();
    if (p && !byPlate.has(p)) byPlate.set(p, d);
    if (k && !byKey.has(k)) byKey.set(k, d);
  });

  return { driverByPlate: byPlate, driverByKey: byKey };
}

export function sortMotorcyclesByKey(vehicles: VehicleItem[]): VehicleItem[] {
  const filtered = vehicles.filter((v) => {
    const t = String(v.vehicle_type || (v as any).type || '').toLowerCase();
    return t === '' || t.includes('motorcycle') || t.includes('دباب');
  });

  return filtered.sort((a, b) => {
    const keyA = parseInt(a.key_number || '999999', 10);
    const keyB = parseInt(b.key_number || '999999', 10);
    if (!Number.isNaN(keyA) && !Number.isNaN(keyB)) {
      return keyA - keyB;
    }
    return String(a.key_number || '').localeCompare(String(b.key_number || ''));
  });
}

export function filterMotorcycles(
  motorcyclesList: VehicleItem[],
  searchQuery: string,
  driverByPlate: Map<string, DelegateWithStatus>,
  driverByKey: Map<string, DelegateWithStatus>
): VehicleItem[] {
  const q = toEnglishDigits(searchQuery.trim()).toLowerCase();
  if (!q) return motorcyclesList;

  return motorcyclesList.filter((v) => {
    const plate = toEnglishDigits(v.plate_number || '').toLowerCase();
    const key = toEnglishDigits(v.key_number || '').toLowerCase();
    const assigned =
      (plate && driverByPlate.get(plate)) ||
      (key && driverByKey.get(key));
    const driverName = (assigned?.name || '').toLowerCase();

    return plate.includes(q) || key.includes(q) || driverName.includes(q);
  });
}

export function computeOilStatus(
  v: VehicleItem,
  driverByPlate: Map<string, DelegateWithStatus>,
  driverByKey: Map<string, DelegateWithStatus>
): OilStatusInfo {
  const plateClean = (v.plate_number || '').trim().toLowerCase();
  const keyClean = (v.key_number || '').trim().toLowerCase();
  const assignedDriver =
    (plateClean && driverByPlate.get(plateClean)) ||
    (keyClean && driverByKey.get(keyClean));
  const keyDisplay = v.key_number || assignedDriver?.key_number || 'بدون';

  const currKm = Number(v.current_km || 0);
  const lastOilKm = Number(v.last_oil_change_km || 0);
  const isBroken =
    Boolean(v.is_odometer_broken) ||
    String(v.plate_number).includes('7569') ||
    String(v.plate_number).includes('8043');
  const interval = 950; // standard motorcycle oil interval

  let remainingKm = 0;
  let isOverdue = false;
  let brokenDaysSince = 0;
  let brokenDaysLeft = 0;

  if (isBroken) {
    const lastDate = (v as any).last_oil_change_date || (v as any).last_oil_change_at;
    if (lastDate) {
      const diffMs = Date.now() - new Date(lastDate).getTime();
      brokenDaysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      brokenDaysLeft = 5 - brokenDaysSince;
      isOverdue = brokenDaysSince >= 5;
    } else {
      isOverdue = true;
    }
  } else {
    const driven =
      lastOilKm > 0 && currKm >= lastOilKm ? currKm - lastOilKm : Number(v.total_distance || 0);
    remainingKm = interval - driven;
    isOverdue = remainingKm <= 0;
  }

  const lastDateStr = (v as any).last_oil_change_date || (v as any).last_oil_change_at;
  const formattedLastDate = lastDateStr
    ? new Date(lastDateStr).toLocaleDateString('ar-SA')
    : 'غير مسجل';

  return {
    assignedDriver,
    keyDisplay,
    currKm,
    lastOilKm,
    isBroken,
    remainingKm,
    isOverdue,
    brokenDaysSince,
    brokenDaysLeft,
    formattedLastDate,
  };
}
