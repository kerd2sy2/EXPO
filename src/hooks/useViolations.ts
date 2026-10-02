import { useState, useCallback } from 'react';
import { getMyViolationsApi, DelegateViolation } from '../services/api';

export function useViolations(employeeId?: string) {
  const [violations, setViolations] = useState<DelegateViolation[]>([]);
  const [violationsLoading, setViolationsLoading] = useState(false);
  const [totalViolationsAmount, setTotalViolationsAmount] = useState(0);
  const [deductedViolationsAmount, setDeductedViolationsAmount] = useState(0);

  const fetchViolations = useCallback(
    async (targetId?: string) => {
      const id = targetId || employeeId;
      if (!id) return;

      setViolationsLoading(true);
      try {
        const res = await getMyViolationsApi(id);
        setViolations(res.data || []);
        setTotalViolationsAmount(res.total_amount || 0);
        setDeductedViolationsAmount(res.deducted_amount || 0);
      } catch (err) {
        console.warn('[useViolations] Error fetching violations:', err);
      } finally {
        setViolationsLoading(false);
      }
    },
    [employeeId]
  );

  return {
    violations,
    setViolations,
    violationsLoading,
    totalViolationsAmount,
    deductedViolationsAmount,
    fetchViolations,
  };
}
