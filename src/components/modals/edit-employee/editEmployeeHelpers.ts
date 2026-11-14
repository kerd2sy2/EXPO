import { toEnglishDigits } from '@shared/utils/plateUtils';
import { VehicleItem } from '../../../services/operations';
import { DelegateWithStatus } from '../../../services/supervisor';
import { IdentifierPerformance } from '../../../types/target';

export type DeliveryPlatformKey = 'keeta' | 'ninja' | 'hungerstation';

export const DELIVERY_APPS = [
  { key: 'keeta', label: 'كيتا (Keeta)', color: '#0284c7', icon: 'bicycle-outline' },
  { key: 'ninja', label: 'نينجا (Ninja)', color: '#10b981', icon: 'flash-outline' },
  { key: 'hungerstation', label: 'هنجر / هنقرستيشن (HungerStation)', color: '#f59e0b', icon: 'fast-food-outline' },
] as const;

export const IDENTIFIER_FILTER_PLATFORMS = [
  { key: 'ALL', label: 'الكل' },
  { key: 'keeta', label: 'كيتا (Keeta)' },
  { key: 'ninja', label: 'نينجا (Ninja)' },
  { key: 'hungerstation', label: 'هنجر (HungerStation)' },
] as const;

export function normalizePlatformKey(raw?: string): DeliveryPlatformKey | 'unassigned' {
  const v = (raw || '').trim().toLowerCase();
  if (!v) return 'unassigned';
  if (v.includes('keeta') || v.includes('كيتا') || v.includes('كينتا')) return 'keeta';
  if (v.includes('ninja') || v.includes('نينجا')) return 'ninja';
  if (v.includes('hunger') || v.includes('هنجر') || v.includes('هنقر')) return 'hungerstation';
  return 'unassigned';
}

export function getPlatformLabelAr(key: DeliveryPlatformKey | 'unassigned'): string {
  if (key === 'keeta') return 'كيتا (Keeta)';
  if (key === 'ninja') return 'نينجا (Ninja)';
  if (key === 'hungerstation') return 'هنجر (HungerStation)';
  return 'غير محدد';
}

export function getPlatformColor(key: DeliveryPlatformKey | 'unassigned'): string {
  if (key === 'keeta') return '#0284c7';
  if (key === 'ninja') return '#10b981';
  if (key === 'hungerstation') return '#f59e0b';
  return '#64748b';
}

export function toBackendAppName(key: string): string {
  const norm = normalizePlatformKey(key);
  if (norm === 'keeta') return 'KEETA';
  if (norm === 'ninja') return 'NINJA';
  if (norm === 'hungerstation') return 'HUNGER';
  return '';
}

export interface NormalizedIdentifier {
  id: string;
  code: string;
  driverName: string;
  appKey: DeliveryPlatformKey;
  appNameAr: string;
  branch?: string;
}

/** Filters fleet vehicles by plate number or key number, normalizing Arabic digits. */
export function filterVehiclesByQuery(vehicles: VehicleItem[], plateSearchText: string): VehicleItem[] {
  if (!plateSearchText.trim()) return vehicles;
  const q = toEnglishDigits(plateSearchText.trim()).toLowerCase();
  return vehicles.filter((v) => {
    const p = toEnglishDigits(v.plate_number || '').toLowerCase();
    const k = toEnglishDigits(v.key_number || '').toLowerCase();
    return p.includes(q) || k.includes(q);
  });
}

/** Normalizes, deduplicates, and filters Keeta/Ninja/HungerStation platform identifiers. */
export function normalizeAndFilterIdentifiers(
  allIdentifiers: IdentifierPerformance[],
  modalAppFilter: string,
  identifierSearchText: string,
  employees: DelegateWithStatus[] = []
): NormalizedIdentifier[] {
  const normFilter = modalAppFilter !== 'ALL' ? normalizePlatformKey(modalAppFilter) : null;
  const activeApp = normFilter && normFilter !== 'unassigned' ? normFilter : null;
  const q = toEnglishDigits(identifierSearchText.trim()).toLowerCase();

  const normalized: NormalizedIdentifier[] = [];

  allIdentifiers.forEach((item) => {
    let resolvedKey = normalizePlatformKey(item.app_name);
    if (resolvedKey === 'unassigned') {
      resolvedKey = normalizePlatformKey(`${item.name || ''} ${item.code || ''}`);
    }
    if (resolvedKey === 'unassigned') return;

    const appKey: DeliveryPlatformKey = resolvedKey;
    const appNameAr =
      appKey === 'keeta' ? 'كيتا (Keeta)' : appKey === 'ninja' ? 'نينجا (Ninja)' : 'هنجر (HungerStation)';

    const rawName = (item.name || '').trim();
    const rawCode = (item.code || '').trim();
    const rawDriver = (item.driver_name || '').trim();

    const isNameNumeric = /^\d+$/.test(toEnglishDigits(rawName));
    const isCodeNumeric = /^\d+$/.test(toEnglishDigits(rawCode));

    let code = '';
    let driverName = '';

    if (isCodeNumeric) {
      code = toEnglishDigits(rawCode);
      driverName = rawDriver || (!isNameNumeric ? rawName : '');
    } else if (isNameNumeric) {
      code = toEnglishDigits(rawName);
      driverName = rawDriver || rawCode;
    } else {
      driverName = rawName || rawDriver;
      code = rawCode;
    }

    if (driverName.startsWith('كابتن ') && /^\d+$/.test(driverName.replace('كابتن ', '').trim())) {
      driverName = '';
    }

    normalized.push({
      id: item.id,
      code,
      driverName,
      appKey,
      appNameAr,
      branch: item.branch,
    });
  });

  // Also include employee-linked application IDs (e.g. manually created HungerStation IDs)
  employees.forEach((emp) => {
    const appId = toEnglishDigits((emp.application_id || '').trim());
    const empApp = normalizePlatformKey(emp.application_type);
    if (!appId || empApp === 'unassigned') return;
    normalized.push({
      id: `emp_${emp.id}_${appId}`,
      code: appId,
      driverName: emp.name || '',
      appKey: empApp,
      appNameAr: getPlatformLabelAr(empApp),
      branch: emp.branch_name,
    });
  });

  const codedDriversSet = new Set<string>();
  const seenCodes = new Set<string>();
  const deduped: NormalizedIdentifier[] = [];

  normalized.filter((x) => x.code !== '').forEach((it) => {
    const codeKey = `${it.appKey}_${it.code}`;
    if (!seenCodes.has(codeKey)) {
      seenCodes.add(codeKey);
      if (it.driverName) {
        codedDriversSet.add(`${it.appKey}_${it.driverName.toLowerCase()}`);
      }
      deduped.push(it);
    }
  });

  normalized.filter((x) => !x.code).forEach((it) => {
    const nameKey = `${it.appKey}_${it.driverName.toLowerCase()}`;
    if (!codedDriversSet.has(nameKey) && !seenCodes.has(nameKey)) {
      seenCodes.add(nameKey);
      deduped.push(it);
    }
  });

  return deduped.filter((it) => {
    if (activeApp && it.appKey !== activeApp) {
      return false;
    }

    if (q) {
      const codeMatch = it.code.toLowerCase().includes(q);
      const nameMatch = it.driverName.toLowerCase().includes(q);
      const appMatch = it.appNameAr.toLowerCase().includes(q) || it.appKey.includes(q);
      if (!codeMatch && !nameMatch && !appMatch) return false;
    }

    return true;
  });
}
