import { DriverPerformance } from '../../../types/target';
import { DateFilterValue } from '../DateFilterModal';

export const ARABIC_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const NINJA_LOGO = require('../../../../assets/images/ninja.png');
const KEETA_LOGO = require('../../../../assets/images/keeta.png');
const TOYOU_LOGO = require('../../../../assets/images/toyou.png');

export function calculateDriverMetrics(
  driver: DriverPerformance | null,
  month?: string,
  dateFilter?: DateFilterValue,
  maxElapsedDays?: number
) {
  const dailyOrders = driver?.daily_orders || {};
  const dailyIdentifiers = driver?.daily_identifiers || {};
  const dailyTarget = driver?.daily_target && driver.daily_target !== 15 ? driver.daily_target : 18;

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);
  const isCurrentMonth = !month || month === currentMonthPrefix;
  const monthPrefix = month || currentMonthPrefix;

  const allRecordedDates = Object.keys(dailyOrders);
  let maxDriverDay = 0;
  if (allRecordedDates.length > 0) {
    maxDriverDay = Math.max(...allRecordedDates.map((d) => parseInt(d.slice(8, 10), 10) || 0));
  }

  let maxDayNumber = 31;
  if (isCurrentMonth) {
    const todayDay = parseInt(todayStr.slice(8, 10), 10);
    if (typeof maxElapsedDays === 'number' && maxElapsedDays > 0) {
      maxDayNumber = Math.max(maxElapsedDays, maxDriverDay);
    } else if (maxDriverDay > 0) {
      maxDayNumber = maxDriverDay;
    } else {
      maxDayNumber = Math.max(1, todayDay - 1);
    }
  }

  const daysList = Array.from({ length: maxDayNumber }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
    const dObj = new Date(dateStr);
    const weekday = isNaN(dObj.getTime()) ? '' : ARABIC_WEEKDAYS[dObj.getDay()];
    return { day: dayNum, date: dateStr, weekday };
  });

  const activeDaysCount = Object.keys(dailyOrders).filter((d) => (dailyOrders[d] || 0) > 0).length;
  const absentDaysCount = Math.max(0, daysList.length - activeDaysCount);
  const totalOrders = driver?.month_orders || 0;
  const totalRequiredTargetSoFar = daysList.length * dailyTarget;
  const targetDiff = totalOrders - totalRequiredTargetSoFar;
  const dailyAvg = activeDaysCount > 0 ? (totalOrders / activeDaysCount).toFixed(1) : '0';

  let periodOrders: number | null = null;
  let isFilteredPeriod = false;
  if (dateFilter && !dateFilter.isDefault) {
    isFilteredPeriod = true;
    if (dateFilter.type === 'day' && dateFilter.date) {
      periodOrders = Number(dailyOrders[dateFilter.date]) || 0;
    } else if (dateFilter.type === 'range') {
      const s = Math.min(dateFilter.startDay || 1, dateFilter.endDay || 30);
      const e = Math.max(dateFilter.startDay || 1, dateFilter.endDay || 30);
      const startStr = dateFilter.startDate || `${monthPrefix}-${String(s).padStart(2, '0')}`;
      const endStr = dateFilter.endDate || `${monthPrefix}-${String(e).padStart(2, '0')}`;
      let sum = 0;
      Object.entries(dailyOrders).forEach(([dateStr, count]) => {
        if (dateStr >= startStr && dateStr <= endStr) sum += Number(count) || 0;
      });
      periodOrders = sum;
    }
  }

  const isDayInPeriod = (dayNum: number, dateStr: string) => {
    if (!dateFilter || dateFilter.isDefault) return false;
    if (dateFilter.type === 'day') return dateFilter.date === dateStr;
    if (dateFilter.type === 'range') {
      const s = Math.min(dateFilter.startDay || 1, dateFilter.endDay || 30);
      const e = Math.max(dateFilter.startDay || 1, dateFilter.endDay || 30);
      return dayNum >= s && dayNum <= e;
    }
    return false;
  };

  return {
    dailyOrders,
    dailyIdentifiers,
    dailyTarget,
    maxDayNumber,
    daysList,
    activeDaysCount,
    absentDaysCount,
    totalOrders,
    totalRequiredTargetSoFar,
    targetDiff,
    dailyAvg,
    periodOrders,
    isFilteredPeriod,
    isDayInPeriod,
  };
}

export function getDriverAppMeta(text: string, isDarkMode: boolean, colors: any) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('نينجا') || lower.includes('ninja')) {
    return {
      logo: NINJA_LOGO, appName: 'نينجا',
      bg: isDarkMode ? '#1e1035' : '#faf5ff', border: isDarkMode ? '#a855f7' : '#d8b4fe',
      text: isDarkMode ? '#d8b4fe' : '#6b21a8', tagBg: '#000000', tagText: '#ffffff',
      avatarBg: '#000000', resizeMode: 'contain' as const,
    };
  }
  if (lower.includes('كيتا') || lower.includes('keeta')) {
    return {
      logo: KEETA_LOGO, appName: 'كيتا',
      bg: isDarkMode ? '#2d1a04' : '#fffbeb', border: isDarkMode ? '#d97706' : '#fde68a',
      text: isDarkMode ? '#fbbf24' : '#92400e', tagBg: '#d97706', tagText: '#ffffff',
      avatarBg: '#fef08a', resizeMode: 'cover' as const,
    };
  }
  if (lower.includes('تويو') || lower.includes('toyou')) {
    return {
      logo: TOYOU_LOGO, appName: 'تويو',
      bg: isDarkMode ? '#0c1e33' : '#f0fdfa', border: isDarkMode ? '#0284c7' : '#bae6fd',
      text: isDarkMode ? '#38bdf8' : '#0369a1', tagBg: '#0284c7', tagText: '#ffffff',
      avatarBg: '#ffffff', resizeMode: 'contain' as const,
    };
  }
  return {
    logo: null, appName: '',
    bg: isDarkMode ? '#1e293b' : '#f1f5f9', border: colors.border,
    text: colors.textPrimary, tagBg: colors.primary, tagText: '#ffffff',
    avatarBg: colors.card, resizeMode: 'contain' as const,
  };
}
