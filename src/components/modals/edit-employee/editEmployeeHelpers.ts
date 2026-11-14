import { toEnglishDigits } from '@shared/utils/plateUtils';
import { VehicleItem } from '../../../services/operations';
import { IdentifierPerformance } from '../../../types/target';

export const DELIVERY_APPS = [
  { key: 'keeta', label: 'كيتا (Keeta)', color: '#0284c7', icon: 'bicycle-outline' },
  { key: 'ninja', label: 'نينجا (Ninja)', color: '#10b981', icon: 'flash-outline' },
  { key: 'hungerstation', label: 'هنقرستيشن (HungerStation)', color: '#f59e0b', icon: 'fast-food-outline' },
] as const;

export const IDENTIFIER_FILTER_PLATFORMS = [
  { key: 'ALL', label: 'الكل' },
  { key: 'keeta', label: 'كيتا (Keeta)' },
  { key: 'ninja', label: 'نينجا (Ninja)' },
  { key: 'hungerstation', label: 'هنقرستيشن' },
] as const;

export interface NormalizedIdentifier {
  id: string;
  code: string;
  driverName: string;
  appKey: 'keeta' | 'ninja' | 'hungerstation';
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
  identifierSearchText: string
): NormalizedIdentifier[] {
  const activeApp = modalAppFilter !== 'ALL' ? modalAppFilter.toLowerCase() : null;
  const q = toEnglishDigits(identifierSearchText.trim()).toLowerCase();

  const normalized: NormalizedIdentifier[] = [];

  allIdentifiers.forEach((item) => {
    const rawApp = (item.app_name || '').toLowerCase();
    let appKey: 'keeta' | 'ninja' | 'hungerstation' | null = null;
    let appNameAr = '';

    if (rawApp.includes('keeta') || rawApp.includes('كيتا')) {
      appKey = 'keeta';
      appNameAr = 'كيتا (Keeta)';
    } else if (rawApp.includes('ninja') || rawApp.includes('نينجا')) {
      appKey = 'ninja';
      appNameAr = 'نينجا (Ninja)';
    } else if (rawApp.includes('hunger') || rawApp.includes('هنقر')) {
      appKey = 'hungerstation';
      appNameAr = 'هنقرستيشن';
    }

    if (!appKey) return;

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
