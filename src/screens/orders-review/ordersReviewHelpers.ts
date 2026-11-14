import { WorkSession } from '../../types/delegate';
import { isInCurrentOperationalDay, toRiyadhDateKey } from '../../utils/dateUtils';

export type ReviewStatusFilter = 'TODAY' | 'ALL';

export const formatReviewTimeOnly = (iso?: string): string => {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
};

export const formatReviewDateTimeFull = (iso?: string): string => {
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

export const calcReviewShiftHours = (startIso?: string, endIso?: string): string => {
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

export const filterCompletedReviewSessions = (
  sessions: WorkSession[],
  statusFilter: ReviewStatusFilter,
  selectedDate: string | null,
  selectedEmployeeId: string | null
): WorkSession[] => {
  return sessions
    .filter((s) => {
      if (s.status !== 'COMPLETED' || !s.end_time) return false;

      const matchesSelectedDate = (targetDate: string) =>
        toRiyadhDateKey(s.start_time) === targetDate || toRiyadhDateKey(s.end_time) === targetDate;

      if (selectedEmployeeId) {
        if (String(s.employee_id || '') !== String(selectedEmployeeId)) {
          return false;
        }
        // Selected employee shows ALL orders across all dates unless a specific day filter is set
        if (selectedDate) {
          return matchesSelectedDate(selectedDate);
        }
        return true;
      }

      if (selectedDate) {
        return matchesSelectedDate(selectedDate);
      }

      if (statusFilter === 'TODAY') {
        return isInCurrentOperationalDay(s.start_time, s.end_time);
      }

      return true;
    })
    .sort((a, b) => {
      const timeB = new Date(b.end_time || b.start_time || 0).getTime();
      const timeA = new Date(a.end_time || a.start_time || 0).getTime();
      return timeB - timeA;
    });
};

export const computeReviewSummaryStats = (sessions: WorkSession[]) => {
  let todaySessionsCount = 0;
  let todayOrdersCount = 0;
  let allSessionsCount = 0;
  let allOrdersCount = 0;

  sessions.forEach((s) => {
    if (s.status !== 'COMPLETED' || !s.end_time) return;
    const orders = Number(s.orders_count ?? 0);
    allSessionsCount++;
    allOrdersCount += orders;

    if (isInCurrentOperationalDay(s.start_time, s.end_time)) {
      todaySessionsCount++;
      todayOrdersCount += orders;
    }
  });

  return {
    todaySessionsCount,
    todayOrdersCount,
    allSessionsCount,
    allOrdersCount,
  };
};
