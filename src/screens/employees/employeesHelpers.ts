import { toEnglishDigits } from '@shared/utils/plateUtils';
import { DelegateWithStatus, isDeliveryDelegate } from '../../services/supervisor';

export type RoleFilter = 'ALL' | 'WORKING' | 'NO_PLATE';

// Helper to extract numeric key value for natural sorting (1, 2, 3, ... 10, 11)
export const extractKeySortValue = (keyStr?: string | null): number => {
  if (!keyStr) return Number.MAX_SAFE_INTEGER;
  const normalized = toEnglishDigits(String(keyStr)).trim();
  if (!normalized) return Number.MAX_SAFE_INTEGER;
  const match = normalized.match(/\d+/);
  if (!match) return Number.MAX_SAFE_INTEGER - 1;
  const num = parseInt(match[0], 10);
  return Number.isNaN(num) ? Number.MAX_SAFE_INTEGER : num;
};

export const isDriverOnly = (emp: DelegateWithStatus): boolean => {
  return isDeliveryDelegate(emp);
};

export function filterAndSortEmployees({
  employees,
  remoteResults,
  searchQuery,
  roleFilter,
}: {
  employees: DelegateWithStatus[];
  remoteResults: DelegateWithStatus[];
  searchQuery: string;
  roleFilter: RoleFilter;
}): DelegateWithStatus[] {
  const q = toEnglishDigits(searchQuery.trim()).toLowerCase();

  const combinedMap = new Map<string, DelegateWithStatus>();
  employees.forEach((emp) => {
    if (emp && emp.id) combinedMap.set(String(emp.id), emp);
  });

  if (q && remoteResults.length > 0) {
    remoteResults.forEach((rem) => {
      if (rem && rem.id && !combinedMap.has(String(rem.id))) {
        combinedMap.set(String(rem.id), rem);
      }
    });
  }

  const allCandidates = Array.from(combinedMap.values());

  const filtered = allCandidates.filter((emp) => {
    if (!isDriverOnly(emp)) return false;
    if (roleFilter === 'WORKING' && !emp.is_working) return false;
    if (roleFilter === 'NO_PLATE' && emp.motorcycle_number && emp.motorcycle_number.trim() !== '') {
      return false;
    }

    if (!q) return true;

    const nameMatch = emp.name?.toLowerCase().includes(q);
    const codeMatch = toEnglishDigits(emp.employee_number || '').toLowerCase().includes(q);
    const idMatch = toEnglishDigits(emp.national_id || '').toLowerCase().includes(q);
    const phoneMatch = toEnglishDigits(emp.phone || '').toLowerCase().includes(q);
    const plateMatch = toEnglishDigits(emp.motorcycle_number || '').toLowerCase().includes(q);
    const keyMatch = toEnglishDigits(emp.key_number || '').toLowerCase().includes(q);
    const appIdMatch = toEnglishDigits(emp.application_id || '').toLowerCase().includes(q);
    const branchMatch = emp.branch_name?.toLowerCase().includes(q);

    return (
      nameMatch ||
      codeMatch ||
      idMatch ||
      phoneMatch ||
      plateMatch ||
      keyMatch ||
      appIdMatch ||
      branchMatch
    );
  });

  return filtered.sort((a, b) => {
    const keyA = extractKeySortValue(a.key_number);
    const keyB = extractKeySortValue(b.key_number);
    if (keyA !== keyB) {
      return keyA - keyB;
    }
    const rawKeyA = toEnglishDigits(a.key_number || '');
    const rawKeyB = toEnglishDigits(b.key_number || '');
    if (rawKeyA !== rawKeyB) {
      return rawKeyA.localeCompare(rawKeyB, 'ar');
    }
    return (a.name || '').localeCompare(b.name || '', 'ar');
  });
}
