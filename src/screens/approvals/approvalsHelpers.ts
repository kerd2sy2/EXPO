import { toEnglishDigits } from '@shared/utils/plateUtils';
import { DelegateWithStatus } from '../../services/supervisor';
import { IdentifierPerformance } from '../../types/target';

export interface IdentifierDropdownItem {
  id: string;
  code: string;
  driverName: string;
  appKey: string;
  appNameAr: string;
}

export const formatTimeOnly = (iso?: string): string => {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
};

export const formatDateTimeFull = (iso?: string): string => {
  if (!iso) return '---';
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timePart = d.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} • ${timePart}`;
  } catch {
    return iso;
  }
};

export const calcShiftHours = (startIso?: string, endIso?: string): string => {
  if (!startIso || !endIso) return '0 س';
  try {
    const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
    if (diffMs <= 0) return '0 س';
    const totalMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs === 0) return `${mins} د`;
    return mins > 0 ? `${hrs} س ${mins} د` : `${hrs} ساعة`;
  } catch {
    return '0 س';
  }
};

export const toDateStr = (iso?: string): string => {
  if (!iso) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

export const toTimeStr = (iso?: string): string => {
  if (!iso) return '00:00';
  try {
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  } catch {
    return '00:00';
  }
};

export const combineDateTimeIso = (dateStr: string, timeStr: string): string => {
  try {
    const cleanDate = (dateStr || '').trim() || new Date().toISOString().split('T')[0];
    let cleanTime = (timeStr || '').trim() || '00:00';
    if (!cleanTime.includes(':')) cleanTime = `${cleanTime}:00`;
    const [h, m] = cleanTime.split(':');
    const [year, month, day] = cleanDate.split('-').map(Number);
    const d = new Date(year, month - 1, day, Number(h) || 0, Number(m) || 0, 0);
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
};

const resolvePlatformMeta = (rawAppName: string, fallbackName: string) => {
  const rawApp = rawAppName.toLowerCase();
  if (rawApp.includes('keeta') || rawApp.includes('كيتا')) {
    return { appKey: 'keeta', appNameAr: 'كيتا (Keeta)' };
  }
  if (rawApp.includes('ninja') || rawApp.includes('نينجا')) {
    return { appKey: 'ninja', appNameAr: 'نينجا (Ninja)' };
  }
  if (rawApp.includes('hunger') || rawApp.includes('هنقر')) {
    return { appKey: 'hungerstation', appNameAr: 'هنقرستيشن' };
  }
  return { appKey: 'other', appNameAr: fallbackName };
};

export const buildFilteredIdentifiers = (
  allIdentifiers: IdentifierPerformance[],
  employees: DelegateWithStatus[],
  identifierAppFilter: string,
  identifierSearchText: string
): IdentifierDropdownItem[] => {
  const activeApp = identifierAppFilter !== 'ALL' ? identifierAppFilter.toLowerCase() : null;
  const q = toEnglishDigits(identifierSearchText.trim()).toLowerCase();

  const itemsMap = new Map<string, IdentifierDropdownItem>();

  allIdentifiers.forEach((item) => {
    const { appKey, appNameAr } = resolvePlatformMeta(
      item.app_name || '',
      item.app_name || 'منصة توصيل'
    );
    const codeVal = (item.code || item.name || '').trim();
    const driverVal = (item.driver_name || '').trim();
    const uniqueKey = codeVal ? `${appKey}_${codeVal}` : `${appKey}_${item.id}`;

    if (codeVal || driverVal) {
      itemsMap.set(uniqueKey, {
        id: item.id || uniqueKey,
        code: codeVal,
        driverName: driverVal,
        appKey,
        appNameAr,
      });
    }
  });

  employees.forEach((emp) => {
    if (emp.application_id && emp.application_id.trim()) {
      const { appKey, appNameAr } = resolvePlatformMeta(
        emp.application_type || 'keeta',
        emp.application_type || 'منصة'
      );
      const codeVal = emp.application_id.trim();
      const uniqueKey = `${appKey}_${codeVal}`;
      if (!itemsMap.has(uniqueKey)) {
        itemsMap.set(uniqueKey, {
          id: uniqueKey,
          code: codeVal,
          driverName: emp.name || '',
          appKey,
          appNameAr,
        });
      }
    }
  });

  return Array.from(itemsMap.values()).filter((item) => {
    if (activeApp && item.appKey !== activeApp) return false;
    if (!q) return true;
    const c = toEnglishDigits(item.code).toLowerCase();
    const d = toEnglishDigits(item.driverName).toLowerCase();
    return c.includes(q) || d.includes(q);
  });
};
