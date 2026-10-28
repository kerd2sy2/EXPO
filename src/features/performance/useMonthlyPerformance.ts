import { useMemo } from 'react';
import { WorkSession } from '../../types/delegate';

export function useMonthlyPerformance(
  historySessions: WorkSession[],
  activeSession: WorkSession | null,
  endKm: string
) {
  return useMemo(() => {
    const monthlyTarget = 460;

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const safeSessions = Array.isArray(historySessions) ? historySessions : [];

      const currentMonthApprovedSessions = safeSessions.filter((s) => {
        if (!s || s.status === 'ACTIVE') return false;
        if (s.is_reviewed !== true) return false;
        if (!s.start_time) return true;
        try {
          const sDate = new Date(s.start_time);
          return sDate.getFullYear() === currentYear && sDate.getMonth() === currentMonth;
        } catch {
          return true;
        }
      });

      const currentMonthPendingSessions = safeSessions.filter((s) => {
        if (!s || s.status === 'ACTIVE') return false;
        if (s.is_reviewed === true) return false;
        if (!s.start_time) return true;
        try {
          const sDate = new Date(s.start_time);
          return sDate.getFullYear() === currentYear && sDate.getMonth() === currentMonth;
        } catch {
          return true;
        }
      });

      const totalApprovedOrdersCount = currentMonthApprovedSessions.reduce(
        (acc, s) => acc + (Number(s.orders_count) || 0),
        0
      );

      const totalPendingOrdersCount = currentMonthPendingSessions.reduce(
        (acc, s) => acc + (Number(s.orders_count) || 0),
        0
      );

      const isTargetAchieved = totalApprovedOrdersCount >= monthlyTarget;
      const currentRatePerOrder = isTargetAchieved ? 6 : 5;
      const expectedSalary = totalApprovedOrdersCount * currentRatePerOrder;
      const targetProgressPct = Math.min(
        100,
        Math.round((totalApprovedOrdersCount / monthlyTarget) * 100)
      );
      const remainingOrdersToTarget = Math.max(0, monthlyTarget - totalApprovedOrdersCount);

      const calculatedDistance =
        endKm && activeSession?.start_km && Number(endKm) >= Number(activeSession.start_km)
          ? Number(endKm) - Number(activeSession.start_km)
          : 0;

      return {
        monthlyTarget,
        totalApprovedOrdersCount,
        totalPendingOrdersCount,
        isTargetAchieved,
        expectedSalary,
        targetProgressPct,
        remainingOrdersToTarget,
        calculatedDistance,
      };
    } catch {
      return {
        monthlyTarget,
        totalApprovedOrdersCount: 0,
        totalPendingOrdersCount: 0,
        isTargetAchieved: false,
        expectedSalary: 0,
        targetProgressPct: 0,
        remainingOrdersToTarget: monthlyTarget,
        calculatedDistance: 0,
      };
    }
  }, [historySessions, activeSession?.start_km, endKm]);
}

