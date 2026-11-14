import { WorkSession, Language } from '../../types/delegate';

export const MONTH_NAMES: Record<string, string[]> = {
  ar: [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  bn: [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
  ],
  ur: [
    'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
    'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر',
  ],
};

export function getCurrentMonthInfo(lang: Language = 'ar') {
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthList = MONTH_NAMES[lang] || MONTH_NAMES.ar;
  const label = `${monthList[now.getMonth()]} ${now.getFullYear()}`;
  return { key: currentKey, label };
}

export interface MonthGroup {
  key: string; // YYYY-MM
  label: string;
  year: number;
  month: number;
  isCurrent: boolean;
  sessions: WorkSession[];
  totalOrders: number;
  approvedOrders: number;
  pendingOrders: number;
  totalDistance: number;
  totalFuel: number;
  shiftsCount: number;
}

export function buildMonthGroups(
  historySessions: WorkSession[],
  lang: Language = 'ar'
): MonthGroup[] {
  const map = new Map<string, MonthGroup>();
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthList = MONTH_NAMES[lang || 'ar'] || MONTH_NAMES.ar;

  // Ensure current month always exists in the list
  map.set(currentKey, {
    key: currentKey,
    label: `${monthList[now.getMonth()]} ${now.getFullYear()}`,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    isCurrent: true,
    sessions: [],
    totalOrders: 0,
    approvedOrders: 0,
    pendingOrders: 0,
    totalDistance: 0,
    totalFuel: 0,
    shiftsCount: 0,
  });

  // Populate and aggregate data from sessions
  historySessions.forEach((s) => {
    if (s.status === 'ACTIVE' || !s.start_time) return;
    try {
      const d = new Date(s.start_time);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(k)) {
        map.set(k, {
          key: k,
          label: `${monthList[d.getMonth()]} ${d.getFullYear()}`,
          year: d.getFullYear(),
          month: d.getMonth() + 1,
          isCurrent: k === currentKey,
          sessions: [],
          totalOrders: 0,
          approvedOrders: 0,
          pendingOrders: 0,
          totalDistance: 0,
          totalFuel: 0,
          shiftsCount: 0,
        });
      }

      const group = map.get(k)!;
      group.sessions.push(s);
      group.shiftsCount += 1;

      const orders = Number(s.orders_count) || 0;
      group.totalOrders += orders;
      if (s.is_reviewed) {
        group.approvedOrders += orders;
        group.totalFuel += Number(s.fuel_cost) || 0;
      } else {
        group.pendingOrders += orders;
      }

      const dist =
        Number(s.distance) ||
        (s.end_km && s.start_km && Number(s.end_km) >= Number(s.start_km)
          ? Number(s.end_km) - Number(s.start_km)
          : 0);
      group.totalDistance += dist;
    } catch {}
  });

  // Sort descending by month key (latest month first)
  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
}
