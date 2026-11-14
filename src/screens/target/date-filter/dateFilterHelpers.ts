export interface DateFilterValue {
  type: 'month' | 'range' | 'day';
  month: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  startDay?: number;
  endDay?: number;
  label: string;
  isDefault: boolean;
}

export const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export const ARABIC_WEEKDAYS_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
export const ARABIC_WEEKDAYS_FULL = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const getDefaultMonthFilter = (): DateFilterValue => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
  const totalDays = new Date(y, m + 1, 0).getDate();
  return {
    type: 'month',
    month: monthStr,
    startDate: `${monthStr}-01`,
    endDate: `${monthStr}-${String(totalDays).padStart(2, '0')}`,
    startDay: 1,
    endDay: totalDays,
    label: `${ARABIC_MONTHS[m]} ${y} (الشهر كاملاً)`,
    isDefault: true,
  };
};

export function calculateMondayWeeks(
  selectedYear: number,
  selectedMonthIdx: number,
  daysInSelectedMonth: number
) {
  const mondays: number[] = [];
  for (let d = 1; d <= daysInSelectedMonth; d++) {
    const dt = new Date(selectedYear, selectedMonthIdx, d);
    if (dt.getDay() === 1) mondays.push(d);
  }

  const weeks: { start: number; end: number; label: string; isMonToMon: boolean }[] = [];
  if (mondays.length === 0) {
    weeks.push({ start: 1, end: Math.min(8, daysInSelectedMonth), label: 'الأسبوع 1 (1 - 8)', isMonToMon: false });
    weeks.push({ start: 9, end: Math.min(16, daysInSelectedMonth), label: 'الأسبوع 2 (9 - 16)', isMonToMon: false });
    return weeks;
  }

  if (mondays[0] > 1) {
    weeks.push({
      start: 1,
      end: mondays[0],
      label: `بداية الشهر (1 إلى الاثنين ${mondays[0]})`,
      isMonToMon: false,
    });
  }

  for (let i = 0; i < mondays.length; i++) {
    const s = mondays[i];
    const e = i + 1 < mondays.length ? mondays[i + 1] : daysInSelectedMonth;
    const isLast = i + 1 >= mondays.length;
    weeks.push({
      start: s,
      end: e,
      label: isLast
        ? `أسبوع ${i + 1} (الاثنين ${s} - نهاية الشهر ${e})`
        : `أسبوع ${i + 1} (الاثنين ${s} - الاثنين ${e})`,
      isMonToMon: !isLast,
    });
  }

  return weeks;
}
