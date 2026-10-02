import { useState, useCallback, useEffect } from 'react';
import { getMyViolationsApi, DelegateViolation } from '../services/api';

// Module-level in-memory cache so transitions between tabs/screens never glitch or show empty lag
let cachedViolations: DelegateViolation[] = [];
let cachedTotalAmount = 0;
let cachedDeductedAmount = 0;

export function useViolations(employeeId?: string) {
  const [violations, setViolations] = useState<DelegateViolation[]>(cachedViolations);
  const [violationsLoading, setViolationsLoading] = useState(false);
  const [totalViolationsAmount, setTotalViolationsAmount] = useState(cachedTotalAmount);
  const [deductedViolationsAmount, setDeductedViolationsAmount] = useState(cachedDeductedAmount);

  const fetchViolations = useCallback(
    async (targetId?: string) => {
      const id = targetId || employeeId;
      if (!id) return;

      setViolationsLoading(true);
      try {
        const res = await getMyViolationsApi(id);
        const data = res.data || [];
        const total = res.total_amount || 0;
        const deducted = res.deducted_amount || 0;

        cachedViolations = data;
        cachedTotalAmount = total;
        cachedDeductedAmount = deducted;

        setViolations(data);
        setTotalViolationsAmount(total);
        setDeductedViolationsAmount(deducted);
      } catch (err) {
        console.warn('[useViolations] Error fetching violations:', err);
      } finally {
        setViolationsLoading(false);
      }
    },
    [employeeId]
  );

  useEffect(() => {
    if (employeeId) {
      fetchViolations(employeeId);
    }
  }, [employeeId, fetchViolations]);

  return {
    violations,
    setViolations,
    violationsLoading,
    totalViolationsAmount,
    deductedViolationsAmount,
    fetchViolations,
  };
}
