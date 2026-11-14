import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EmployeeProfile, WorkSession } from '../types/delegate';
import {
  getStoredToken,
  resolveEffectiveBranchId,
  setCurrentBranchId,
} from '../services/api';
import {
  supervisorApi,
  ServerDashboardStats,
  DelegateWithStatus,
  PendingMaintenanceRequest,
  PendingAdvanceRequest,
} from '../services/supervisor';
import {
  operationsApi,
  InventoryItem,
  VehicleItem,
} from '../services/operations';

const CACHED_VEHICLES_KEY = '@aams_cached_vehicles';
const CACHED_INVENTORY_KEY = '@aams_cached_inventory';
const CACHED_PENDING_SESSIONS_KEY = '@aams_cached_pending_sessions';
const CACHED_PENDING_MAINTENANCE_KEY = '@aams_cached_pending_maintenance';
const CACHED_PENDING_ADVANCES_KEY = '@aams_cached_pending_advances';
const CACHED_BRANCH_DELEGATES_KEY = '@aams_cached_branch_delegates';

interface PendingSupervisorFetch {
  isSilent: boolean;
  branchId?: string;
}

/**
 * Manages supervisor branch data, fleet operations cache, live pending-request polling,
 * and cross-session cache/ref cleanup so stale branch headers or in-flight guards
 * never leave screens empty after login.
 */
export function useSupervisorDataSync(employee: EmployeeProfile | null) {
  const [branchDelegates, setBranchDelegates] = useState<DelegateWithStatus[]>([]);
  const [allBranchEmployees, setAllBranchEmployees] = useState<DelegateWithStatus[]>([]);
  const [workingDelegates, setWorkingDelegates] = useState<DelegateWithStatus[]>([]);
  const [pendingMaintenance, setPendingMaintenance] = useState<PendingMaintenanceRequest[]>([]);
  const [pendingSessions, setPendingSessions] = useState<WorkSession[]>([]);
  const [branchSessions, setBranchSessions] = useState<WorkSession[]>([]);
  const [serverDashboardStats, setServerDashboardStats] = useState<ServerDashboardStats | null>(null);
  const [pendingAdvances, setPendingAdvances] = useState<PendingAdvanceRequest[]>([]);

  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [loadingOperationsData, setLoadingOperationsData] = useState(false);

  const [loadingSupervisorData, setLoadingSupervisorData] = useState(true);
  const [isInitialSupervisorLoading, setIsInitialSupervisorLoading] = useState(true);
  const [loadingApprovalsOnly, setLoadingApprovalsOnly] = useState(false);

  const lastOperationsFetchRef = useRef<number>(0);
  const lastFetchedOpsBranchRef = useRef<string | undefined>(undefined);
  const lastSupervisorFetchRef = useRef<number>(0);
  const lastFetchedBranchRef = useRef<string | undefined>(undefined);
  const isSupervisorFetchingRef = useRef<boolean>(false);
  const hasLoadedSupervisorInitialRef = useRef<boolean>(false);
  const pendingSupervisorRequestRef = useRef<PendingSupervisorFetch | null>(null);

  // Restore cached operational & pending lists on mount for 0ms cold-start
  useEffect(() => {
    Promise.allSettled([
      AsyncStorage.getItem(CACHED_VEHICLES_KEY),
      AsyncStorage.getItem(CACHED_INVENTORY_KEY),
      AsyncStorage.getItem(CACHED_PENDING_SESSIONS_KEY),
      AsyncStorage.getItem(CACHED_PENDING_MAINTENANCE_KEY),
      AsyncStorage.getItem(CACHED_PENDING_ADVANCES_KEY),
      AsyncStorage.getItem(CACHED_BRANCH_DELEGATES_KEY),
    ]).then((results) => {
      const val = (idx: number) =>
        results[idx]?.status === 'fulfilled' ? (results[idx] as PromiseFulfilledResult<string | null>).value : null;

      const safeParseArray = <T,>(raw: string | null): T[] | null => {
        if (!raw) return null;
        try {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
        } catch {
          return null;
        }
      };

      const vehs = safeParseArray<VehicleItem>(val(0));
      if (vehs) setVehicles((prev) => (prev.length === 0 ? vehs : prev));

      const inv = safeParseArray<InventoryItem>(val(1));
      if (inv) setInventoryItems((prev) => (prev.length === 0 ? inv : prev));

      const sessions = safeParseArray<WorkSession>(val(2));
      if (sessions) setPendingSessions((prev) => (prev.length === 0 ? sessions : prev));

      const maint = safeParseArray<PendingMaintenanceRequest>(val(3));
      if (maint) setPendingMaintenance((prev) => (prev.length === 0 ? maint : prev));

      const advs = safeParseArray<PendingAdvanceRequest>(val(4));
      if (advs) setPendingAdvances((prev) => (prev.length === 0 ? advs : prev));

      const dels = safeParseArray<DelegateWithStatus>(val(5));
      if (dels) {
        setBranchDelegates((prev) => (prev.length === 0 ? dels : prev));
        setAllBranchEmployees((prev) => (prev.length === 0 ? dels : prev));
      }
    });
  }, []);

  const resolveBranchId = useCallback(
    (explicitBranchId?: string): string | undefined => {
      if (typeof explicitBranchId === 'string' && explicitBranchId.trim()) {
        return explicitBranchId.trim();
      }
      return resolveEffectiveBranchId(employee) || undefined;
    },
    [employee]
  );

  // Instant optimistic update when oil is dispensed
  const handleVehicleDispensedOptimistic = useCallback((vehicleId: string, currentKm: number) => {
    setVehicles((prev) => {
      const nowIso = new Date().toISOString();
      const updated = prev.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              last_oil_change_km: currentKm,
              last_oil_change_date: nowIso,
              last_oil_change_at: nowIso,
              oil_change_required: false,
            }
          : v
      );
      AsyncStorage.setItem(CACHED_VEHICLES_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const fetchOperationsData = useCallback(
    async (isSilentArg: any = false, forceArg: any = false, explicitBranchId?: string) => {
      if (!employee?.id && !getStoredToken() && !explicitBranchId) return;

      const isSilent = typeof isSilentArg === 'boolean' ? isSilentArg : false;
      const force = typeof forceArg === 'boolean' ? forceArg : false;
      const branchId = resolveBranchId(explicitBranchId);
      const branchChanged = branchId !== lastFetchedOpsBranchRef.current;
      const now = Date.now();

      if (!force && !branchChanged && now - lastOperationsFetchRef.current < 4000) {
        return;
      }
      lastOperationsFetchRef.current = now;
      lastFetchedOpsBranchRef.current = branchId;

      if (branchId) {
        setCurrentBranchId(branchId);
      }

      try {
        if (!isSilent) {
          setLoadingOperationsData(true);
        }
        const [invRes, vehRes] = await Promise.allSettled([
          operationsApi.getInventoryItems(),
          operationsApi.getVehicles(branchId),
        ]);

        if (invRes.status === 'fulfilled' && Array.isArray(invRes.value)) {
          setInventoryItems(invRes.value);
          AsyncStorage.setItem(CACHED_INVENTORY_KEY, JSON.stringify(invRes.value)).catch(() => {});
        }
        if (vehRes.status === 'fulfilled' && Array.isArray(vehRes.value)) {
          setVehicles(vehRes.value);
          AsyncStorage.setItem(CACHED_VEHICLES_KEY, JSON.stringify(vehRes.value)).catch(() => {});
        }
      } catch (e) {
        console.warn('[Eshraf] Error fetching operations data:', e);
      } finally {
        if (!isSilent) {
          setLoadingOperationsData(false);
        }
      }
    },
    [employee?.id, resolveBranchId]
  );

  // Ultra-lightweight sync for live delegate requests without failing other endpoints if one rejects
  const syncPendingRequests = useCallback(
    async (_isSilent: any = true, explicitBranchId?: string) => {
      if (!employee?.id && !getStoredToken() && !explicitBranchId) return;

      const branchId = resolveBranchId(explicitBranchId);
      if (branchId) {
        setCurrentBranchId(branchId);
      }

      try {
        await Promise.allSettled([
          supervisorApi.getPendingSessions().then((sessions) => {
            if (Array.isArray(sessions)) {
              setPendingSessions(sessions);
              AsyncStorage.setItem(CACHED_PENDING_SESSIONS_KEY, JSON.stringify(sessions)).catch(() => {});
            }
          }),
          supervisorApi.getPendingInvestigations().then((invs) => {
            if (Array.isArray(invs)) {
              setPendingAdvances(invs);
              AsyncStorage.setItem(CACHED_PENDING_ADVANCES_KEY, JSON.stringify(invs)).catch(() => {});
            }
          }),
          supervisorApi.getPendingMaintenance().then((maint) => {
            if (Array.isArray(maint)) {
              setPendingMaintenance(maint);
              AsyncStorage.setItem(CACHED_PENDING_MAINTENANCE_KEY, JSON.stringify(maint)).catch(() => {});
            }
          }),
          supervisorApi.getWorkingDelegates(branchId).then((working) => {
            if (Array.isArray(working)) {
              setWorkingDelegates(working);
            }
          }),
          supervisorApi.getDashboardStats(branchId).then((ds) => {
            if (ds) setServerDashboardStats(ds);
          }),
        ]);
      } catch (e) {
        console.warn('[Eshraf] Error syncing pending requests:', e);
      }
    },
    [employee?.id, resolveBranchId]
  );

  const refreshApprovalsOnly = useCallback(async () => {
    try {
      setLoadingApprovalsOnly(true);
      await syncPendingRequests(false);
    } catch (e) {
      console.warn('[Eshraf] Error refreshing approvals only:', e);
    } finally {
      setLoadingApprovalsOnly(false);
    }
  }, [syncPendingRequests]);

  const fetchSupervisorData = useCallback(
    async (isSilentArg: any = false, forceArg: any = false, explicitBranchId?: string) => {
      if (!employee?.id && !getStoredToken() && !explicitBranchId) {
        setLoadingSupervisorData(false);
        setIsInitialSupervisorLoading(false);
        return;
      }

      const isSilent = typeof isSilentArg === 'boolean' ? isSilentArg : false;
      const force = typeof forceArg === 'boolean' ? forceArg : false;
      const branchId = resolveBranchId(explicitBranchId);
      const branchChanged = branchId !== lastFetchedBranchRef.current;
      const now = Date.now();

      if (
        !force &&
        !branchChanged &&
        now - lastSupervisorFetchRef.current < 4000 &&
        hasLoadedSupervisorInitialRef.current
      ) {
        if (!isSilent) {
          setLoadingSupervisorData(false);
        }
        setIsInitialSupervisorLoading(false);
        return;
      }

      if (isSupervisorFetchingRef.current) {
        if (force || branchChanged) {
          pendingSupervisorRequestRef.current = { isSilent, branchId };
        }
        return;
      }

      isSupervisorFetchingRef.current = true;
      lastSupervisorFetchRef.current = now;
      lastFetchedBranchRef.current = branchId;

      if (branchId) {
        setCurrentBranchId(branchId);
      }

      try {
        if (!isSilent) {
          setLoadingSupervisorData(true);
        }

        // Tier 1: Urgent live delegate requests
        await syncPendingRequests(isSilent, branchId);

        if (!isSilent) {
          setLoadingSupervisorData(false);
        }
        setIsInitialSupervisorLoading(false);

        // Tier 2: Secondary heavy roster & branch sessions in background
        Promise.allSettled([
          supervisorApi.getBranchSessions(100).then((sessions) => {
            if (Array.isArray(sessions)) setBranchSessions(sessions);
          }),
          supervisorApi.getAllBranchDelegates(branchId).then((emps) => {
            if (Array.isArray(emps)) {
              setBranchDelegates(emps);
              setAllBranchEmployees(emps);
              AsyncStorage.setItem(CACHED_BRANCH_DELEGATES_KEY, JSON.stringify(emps)).catch(() => {});
            }
          }),
          operationsApi.getVehicles(branchId).then((vehs) => {
            if (Array.isArray(vehs)) {
              setVehicles(vehs);
              AsyncStorage.setItem(CACHED_VEHICLES_KEY, JSON.stringify(vehs)).catch(() => {});
            }
          }),
        ]);
      } catch (e) {
        console.warn('[Eshraf] Error fetching supervisor data:', e);
      } finally {
        isSupervisorFetchingRef.current = false;
        if (!isSilent) {
          setLoadingSupervisorData(false);
        }
        setIsInitialSupervisorLoading(false);

        const queued = pendingSupervisorRequestRef.current;
        if (queued) {
          pendingSupervisorRequestRef.current = null;
          fetchSupervisorData(queued.isSilent, true, queued.branchId);
        }
      }
    },
    [employee?.id, resolveBranchId, syncPendingRequests]
  );

  const handleOverrideSuccess = useCallback(
    async (employeeId?: string, wasStart?: boolean) => {
      if (employeeId) {
        const empIdStr = String(employeeId);
        if (wasStart) {
          setWorkingDelegates((prev) => {
            if (prev.some((w) => String(w.id) === empIdStr)) return prev;
            const found = branchDelegates.find((d) => String(d.id) === empIdStr);
            return found ? [...prev, { ...found, is_working: true }] : prev;
          });
          setBranchDelegates((prev) =>
            prev.map((d) => (String(d.id) === empIdStr ? { ...d, is_working: true } : d))
          );
          setAllBranchEmployees((prev) =>
            prev.map((d) => (String(d.id) === empIdStr ? { ...d, is_working: true } : d))
          );
        } else {
          setWorkingDelegates((prev) => prev.filter((w) => String(w.id) !== empIdStr));
          setBranchSessions((prev) =>
            prev.map((s) =>
              String(s.employee_id) === empIdStr
                ? { ...s, status: 'COMPLETED', end_time: s.end_time || new Date().toISOString() }
                : s
            )
          );
          setBranchDelegates((prev) =>
            prev.map((d) => (String(d.id) === empIdStr ? { ...d, is_working: false } : d))
          );
          setAllBranchEmployees((prev) =>
            prev.map((d) => (String(d.id) === empIdStr ? { ...d, is_working: false } : d))
          );
        }
      }
      fetchSupervisorData(true, true);
    },
    [branchDelegates, fetchSupervisorData]
  );

  const resetSupervisorState = useCallback(async () => {
    lastOperationsFetchRef.current = 0;
    lastFetchedOpsBranchRef.current = undefined;
    lastSupervisorFetchRef.current = 0;
    lastFetchedBranchRef.current = undefined;
    isSupervisorFetchingRef.current = false;
    hasLoadedSupervisorInitialRef.current = false;
    pendingSupervisorRequestRef.current = null;
    setCurrentBranchId(null);

    setBranchDelegates([]);
    setAllBranchEmployees([]);
    setWorkingDelegates([]);
    setPendingMaintenance([]);
    setPendingSessions([]);
    setBranchSessions([]);
    setServerDashboardStats(null);
    setPendingAdvances([]);
    setInventoryItems([]);
    setVehicles([]);
    setLoadingOperationsData(false);
    setLoadingApprovalsOnly(false);
    setLoadingSupervisorData(true);
    setIsInitialSupervisorLoading(true);

    try {
      await AsyncStorage.multiRemove([
        CACHED_VEHICLES_KEY,
        CACHED_INVENTORY_KEY,
        CACHED_PENDING_SESSIONS_KEY,
        CACHED_PENDING_MAINTENANCE_KEY,
        CACHED_PENDING_ADVANCES_KEY,
        CACHED_BRANCH_DELEGATES_KEY,
      ]);
    } catch {}
  }, []);

  return {
    branchDelegates,
    allBranchEmployees,
    workingDelegates,
    pendingMaintenance,
    setPendingMaintenance,
    pendingSessions,
    setPendingSessions,
    branchSessions,
    serverDashboardStats,
    pendingAdvances,
    setPendingAdvances,
    inventoryItems,
    vehicles,
    loadingOperationsData,
    loadingSupervisorData,
    isInitialSupervisorLoading,
    loadingApprovalsOnly,
    hasLoadedSupervisorInitialRef,
    handleVehicleDispensedOptimistic,
    fetchOperationsData,
    syncPendingRequests,
    refreshApprovalsOnly,
    fetchSupervisorData,
    handleOverrideSuccess,
    resetSupervisorState,
  };
}
