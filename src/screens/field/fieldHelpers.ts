import { toEnglishDigits } from '@shared/utils/plateUtils';
import { DelegateWithStatus } from '../../services/supervisor';
import { extractKeySortValue } from '../EmployeesScreen';

export type FieldFilter = 'working' | 'not_working' | 'all';

export function calcLiveElapsed(startIso?: string): string {
  if (!startIso) return '';
  try {
    const diffMs = Date.now() - new Date(startIso).getTime();
    if (diffMs <= 0) return 'بدأ للتو';
    const mins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs === 0) return `منذ ${remMins} د`;
    return `منذ ${hrs} س و ${remMins} د`;
  } catch {
    return '';
  }
}

export function filterAndSortFieldDelegates(
  delegates: DelegateWithStatus[],
  filter: FieldFilter,
  searchQuery: string,
  isDelegateActuallyWorking: (d: DelegateWithStatus) => boolean
): DelegateWithStatus[] {
  const q = toEnglishDigits(searchQuery.trim()).toLowerCase();

  return delegates
    .filter((d) => {
      const isWorking = isDelegateActuallyWorking(d);
      if (filter === 'working' && !isWorking) return false;
      if (filter === 'not_working' && isWorking) return false;
      if (!q) return true;

      const nameMatch = (d.name || '').toLowerCase().includes(q);
      const keyMatch = toEnglishDigits(d.key_number || '').toLowerCase().includes(q);
      const bikeMatch = toEnglishDigits(d.active_motorcycle || d.motorcycle_number || '')
        .toLowerCase()
        .includes(q);
      const appIdMatch = toEnglishDigits(d.application_id || '').toLowerCase().includes(q);

      return nameMatch || keyMatch || bikeMatch || appIdMatch;
    })
    .sort((a, b) => {
      const keyA = extractKeySortValue(a.key_number);
      const keyB = extractKeySortValue(b.key_number);
      if (keyA !== keyB) return keyA - keyB;
      return (a.name || '').localeCompare(b.name || '', 'ar');
    });
}
