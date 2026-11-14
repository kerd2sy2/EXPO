import { toEnglishDigits } from '@shared/utils/plateUtils';
import { WorkSession } from '../../types/delegate';
import { DelegateWithStatus } from '../../services/supervisor';

export type ReviewStatusFilter = 'ALL' | 'PENDING' | 'REVIEWED';

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
  searchQuery: string,
  statusFilter: ReviewStatusFilter,
  employeeMap: Map<string, DelegateWithStatus>
): WorkSession[] => {
  const q = toEnglishDigits(searchQuery.trim()).toLowerCase();

  return sessions
    .filter((s) => {
      if (s.status !== 'COMPLETED' || !s.end_time) return false;
      if (statusFilter === 'PENDING' && s.is_reviewed) return false;
      if (statusFilter === 'REVIEWED' && !s.is_reviewed) return false;

      if (!q) return true;

      const empRecord = employeeMap.get(String(s.employee_id));
      const name = (s.employee_name || s.employee?.name || empRecord?.name || '').toLowerCase();
      const bike = toEnglishDigits(s.motorcycle_number || '').toLowerCase();
      const keyNum = toEnglishDigits(
        (s as any).key_number || (s.employee as any)?.key_number || empRecord?.key_number || ''
      ).toLowerCase();
      const appId = toEnglishDigits(
        (s as any).application_id || (s.employee as any)?.application_id || empRecord?.application_id || ''
      ).toLowerCase();

      return name.includes(q) || bike.includes(q) || keyNum.includes(q) || appId.includes(q);
    })
    .sort((a, b) => {
      const timeB = new Date(b.end_time || b.start_time || 0).getTime();
      const timeA = new Date(a.end_time || a.start_time || 0).getTime();
      return timeB - timeA;
    });
};

export const computeReviewSummaryStats = (sessions: WorkSession[]) => {
  let totalOrders = 0;
  let totalKm = 0;
  let pendingCount = 0;
  let reviewedCount = 0;

  sessions.forEach((s) => {
    if (s.status !== 'COMPLETED' || !s.end_time) return;
    totalOrders += Number(s.orders_count ?? 0);
    const dist =
      s.end_km && s.start_km && Number(s.end_km) >= Number(s.start_km)
        ? Number(s.end_km) - Number(s.start_km)
        : Number((s as any).total_km ?? s.distance ?? 0);
    totalKm += dist;
    if (s.is_reviewed) reviewedCount++;
    else pendingCount++;
  });

  return {
    totalFinished: pendingCount + reviewedCount,
    pendingCount,
    reviewedCount,
    totalOrders,
    totalKm,
  };
};
