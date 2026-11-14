import { useState, useEffect, useCallback, useMemo } from 'react';
import { BackHandler } from 'react-native';
import {
  TargetDashboardSummary,
  IdentifierPerformance,
  DriverPerformance,
  TargetAlertItem,
} from '../../../types/target';
import { ThemeColors } from '../../../types/delegate';
import { targetApi } from '../../../services/targetApi';
import { refreshAuthToken } from '../../../services/api';
import { DateFilterValue, getDefaultMonthFilter } from '../DateFilterModal';
import { sortDriversByMasterOrder } from '../driverOrderHelper';
import {
  DashboardDataTab,
  DashboardViewType,
  buildPlatformsList,
  getAssignedDriverName,
  getIdentifierPlatform,
} from './targetDashboardHelpers';

export function useTargetDashboardData(
  roleLabel: 'admin' | 'supervisor',
  colors: ThemeColors
) {
  const [currentView, setCurrentView] = useState<DashboardViewType>('home');
  const [activeTab, setActiveTab] = useState<DashboardDataTab>('identifiers');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultMonthFilter);
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [rangeOrdersMap, setRangeOrdersMap] = useState<Record<string, number> | null>(null);
  const [rangeTotalOrders, setRangeTotalOrders] = useState<number | null>(null);
  const [rangeIdentOrdersMap, setRangeIdentOrdersMap] = useState<Record<string, number> | null>(null);

  const [branchFilter, setBranchFilter] = useState<'all' | '1' | '2'>('all');
  const [showBranchModal, setShowBranchModal] = useState(false);

  const [summary, setSummary] = useState<TargetDashboardSummary | null>(null);
  const [identifiers, setIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
  const [alerts, setAlerts] = useState<TargetAlertItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformTab, setPlatformTab] = useState<'ninja' | 'keeta'>('ninja');

  const [selectedIdentifierId, setSelectedIdentifierId] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverPerformance | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const handleLogoTap = useCallback(() => {
    setShowDateFilterModal(true);
  }, []);

  const loadData = useCallback(async () => {
    const tag = roleLabel === 'supervisor' ? 'supervisor target' : 'target';
    try {
      setLoading(true);
      setLoadError(null);
      let lastApiErr = '';
      const queryMonth =
        dateFilter.type === 'day' && dateFilter.date ? dateFilter.date : dateFilter.month;

      const [sumData, identsData, driversData, alertsData] = await Promise.all([
        targetApi.getDashboard(dateFilter.month, branchFilter, dateFilter.startDate, dateFilter.endDate).catch((err) => {
          lastApiErr = err?.message || '';
          console.log(`Notice loading ${tag} dashboard:`, err?.message || err);
          return null;
        }),
        targetApi.listIdentifiers({
          month: queryMonth,
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate,
          branch: branchFilter,
        }).catch((err) => {
          if (!lastApiErr) lastApiErr = err?.message || '';
          console.log(`Notice loading ${tag} identifiers:`, err?.message || err);
          return null;
        }),
        targetApi.listDrivers({
          month: dateFilter.month,
          branch: branchFilter,
        }).catch((err) => {
          console.log(`Notice loading ${tag} drivers:`, err?.message || err);
          return null;
        }),
        targetApi.listAlerts({
          unresolved_only: false,
          date: dateFilter.type === 'day' ? dateFilter.date : undefined,
          branch: branchFilter,
        }).catch(() => []),
      ]);

      if (sumData) setSummary(sumData);
      if (Array.isArray(identsData) && identsData.length > 0) {
        setIdentifiers(identsData);
      } else if (Array.isArray(identsData) && identsData.length === 0 && !sumData) {
        setIdentifiers([]);
      }
      if (Array.isArray(driversData) && driversData.length > 0) setDrivers(driversData);
      if (Array.isArray(alertsData)) setAlerts(alertsData);

      if (dateFilter.type === 'month') {
        setRangeOrdersMap(null);
        setRangeTotalOrders(null);
        setRangeIdentOrdersMap(null);
      } else if (dateFilter.type === 'day') {
        const platMap: Record<string, number> = { ninja: 0, keeta: 0, toyou: 0 };
        const identMap: Record<string, number> = {};
        let total = 0;
        (identsData || []).forEach((item) => {
          const plat = getIdentifierPlatform(item);
          const ords = Number(item.today_orders) || 0;
          platMap[plat] = (platMap[plat] || 0) + ords;
          if (item.id) identMap[item.id] = ords;
          total += ords;
        });

        if (total === 0 && Array.isArray(driversData) && dateFilter.date) {
          driversData.forEach((drv) => {
            if (drv.daily_orders && drv.daily_orders[dateFilter.date!]) {
              total += Number(drv.daily_orders[dateFilter.date!]) || 0;
            }
          });
        }
        setRangeOrdersMap(platMap);
        setRangeTotalOrders(total);
        setRangeIdentOrdersMap(identMap);
      } else if (dateFilter.type === 'range') {
        const sDay = Math.min(dateFilter.startDay || 1, dateFilter.endDay || 30);
        const eDay = Math.max(dateFilter.startDay || 1, dateFilter.endDay || 30);
        const monthPrefix = dateFilter.month || '2026-09';
        const startStr = dateFilter.startDate || `${monthPrefix}-${String(sDay).padStart(2, '0')}`;
        const endStr = dateFilter.endDate || `${monthPrefix}-${String(eDay).padStart(2, '0')}`;

        let daysToQuery: number[] = [];
        if (sumData?.daily_trend && sumData.daily_trend.length > 0) {
          daysToQuery = sumData.daily_trend
            .filter((t) => t.day >= sDay && t.day <= eDay && Number(t.orders) > 0)
            .map((t) => t.day);
        } else {
          for (let d = sDay; d <= eDay; d++) daysToQuery.push(d);
        }

        if (daysToQuery.length === 0) {
          setRangeOrdersMap({ ninja: 0, keeta: 0, toyou: 0 });
          setRangeTotalOrders(0);
          setRangeIdentOrdersMap({});
        } else {
          const dayResults = await Promise.all(
            daysToQuery.map((d) =>
              targetApi
                .listIdentifiers({
                  month: `${monthPrefix}-${String(d).padStart(2, '0')}`,
                  branch: branchFilter,
                })
                .catch(() => [])
            )
          );
          const platMap: Record<string, number> = { ninja: 0, keeta: 0, toyou: 0 };
          const identMap: Record<string, number> = {};
          let total = 0;
          dayResults.forEach((list) => {
            if (!Array.isArray(list)) return;
            list.forEach((item) => {
              const plat = getIdentifierPlatform(item);
              const ords = Number(item.today_orders) || 0;
              platMap[plat] = (platMap[plat] || 0) + ords;
              if (item.id) identMap[item.id] = (identMap[item.id] || 0) + ords;
              total += ords;
            });
          });

          if (total === 0 && Array.isArray(driversData) && driversData.length > 0) {
            driversData.forEach((drv) => {
              if (!drv.daily_orders) return;
              Object.entries(drv.daily_orders).forEach(([dateStr, cnt]) => {
                if (dateStr >= startStr && dateStr <= endStr) total += Number(cnt) || 0;
              });
            });
          }
          setRangeOrdersMap(platMap);
          setRangeTotalOrders(total);
          setRangeIdentOrdersMap(identMap);
        }
      }

      if (!sumData && (!identsData || identsData.length === 0)) {
        if (
          lastApiErr &&
          (lastApiErr.includes('جلسة') || lastApiErr.includes('منتهية') || lastApiErr.includes('401') || lastApiErr.includes('مصرح'))
        ) {
          setLoadError('انتهت صلاحية جلسة الدخول، اضغط لإعادة المحاولة والتجديد التلقائي');
        } else if (lastApiErr && !lastApiErr.includes('شبكة')) {
          setLoadError(`${lastApiErr}، اضغط لإعادة المحاولة`);
        } else {
          setLoadError('تعذر تحديث بعض البيانات بسبب بطء الاتصال، اضغط لإعادة المحاولة');
        }
      }
    } catch (err: any) {
      console.log(`Error loading ${roleLabel} dashboard data:`, err);
      setLoadError(err?.message || 'تعذر الاتصال بالخادم، اضغط لإعادة المحاولة');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFilter, branchFilter, roleLabel]);

  const handleRetry = useCallback(async () => {
    if (retrying) return;
    setRetrying(true);
    try {
      await refreshAuthToken().catch(() => null);
      await loadData();
    } finally {
      setRetrying(false);
    }
  }, [loadData, retrying]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  useEffect(() => {
    const backAction = () => {
      if (currentView === 'driver_details') {
        setCurrentView('data');
        setActiveTab('drivers');
        return true;
      }
      if (currentView === 'rules') {
        setCurrentView('profile');
        return true;
      }
      if (currentView !== 'home') {
        setCurrentView('home');
        setPlatformTab('ninja');
        setStatusFilter('');
        setSearchQuery('');
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentView]);

  const handleResolveAlert = useCallback(async (alertId: string) => {
    setAlerts((prev) =>
      Array.isArray(prev) ? prev.map((a) => (a.id === alertId ? { ...a, is_resolved: true } : a)) : []
    );
    try {
      await targetApi.resolveAlert(alertId);
    } catch {
      setAlerts((prev) =>
        Array.isArray(prev) ? prev.map((a) => (a.id === alertId ? { ...a, is_resolved: false } : a)) : []
      );
    }
  }, []);

  const handleResolveAllAlerts = useCallback(async () => {
    setAlerts((prev) => (Array.isArray(prev) ? prev.map((a) => ({ ...a, is_resolved: true })) : []));
    try {
      await targetApi.resolveAllAlerts(branchFilter);
    } catch {
      loadData();
    }
  }, [branchFilter, loadData]);

  const filteredBaseIdents = useMemo(() => {
    let list = Array.isArray(identifiers) ? identifiers : [];
    if (rangeIdentOrdersMap) {
      list = list.map((i) => ({
        ...i,
        month_orders: rangeIdentOrdersMap[i.id] !== undefined ? rangeIdentOrdersMap[i.id] : 0,
      }));
    }
    if (statusFilter === 'TARGET_ACHIEVED') {
      list = list.filter((i) => i.status === 'TARGET_ACHIEVED');
    } else if (statusFilter === 'ON_TRACK') {
      list = list.filter((i) => i.status === 'ON_TRACK' || i.status === 'TARGET_ACHIEVED');
    } else if (statusFilter === 'BEHIND_TARGET') {
      list = list.filter((i) => i.status === 'BEHIND_TARGET');
    } else if (statusFilter === 'AT_RISK') {
      list = list.filter((i) => i.status === 'AT_RISK');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((i) => i.name?.toLowerCase().includes(q) || i.code?.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => (b.month_orders || 0) - (a.month_orders || 0));
  }, [identifiers, statusFilter, searchQuery, rangeIdentOrdersMap]);

  const keetaCount = useMemo(
    () => filteredBaseIdents.filter((i) => getIdentifierPlatform(i) === 'keeta').length,
    [filteredBaseIdents]
  );

  const ninjaCount = useMemo(
    () => filteredBaseIdents.filter((i) => getIdentifierPlatform(i) === 'ninja').length,
    [filteredBaseIdents]
  );

  const platformsList = useMemo(
    () => buildPlatformsList(identifiers, colors, rangeOrdersMap, rangeIdentOrdersMap, rangeTotalOrders),
    [identifiers, colors, rangeOrdersMap, rangeIdentOrdersMap, rangeTotalOrders]
  );

  const identsList = useMemo(
    () => filteredBaseIdents.filter((i) => getIdentifierPlatform(i) === platformTab),
    [filteredBaseIdents, platformTab]
  );

  const getDriverPeriodOrders = useCallback(
    (drv: DriverPerformance): number => {
      if (!drv) return 0;
      if (dateFilter.type === 'month') return Number(drv.month_orders) || 0;
      if (dateFilter.type === 'day' && dateFilter.date) {
        return drv.daily_orders && drv.daily_orders[dateFilter.date] !== undefined
          ? Number(drv.daily_orders[dateFilter.date]) || 0
          : 0;
      }
      if (dateFilter.type === 'range') {
        const s = Math.min(dateFilter.startDay || 1, dateFilter.endDay || 30);
        const e = Math.max(dateFilter.startDay || 1, dateFilter.endDay || 30);
        const mPrefix = dateFilter.month || '2026-09';
        const startStr = dateFilter.startDate || `${mPrefix}-${String(s).padStart(2, '0')}`;
        const endStr = dateFilter.endDate || `${mPrefix}-${String(e).padStart(2, '0')}`;
        let sum = 0;
        if (drv.daily_orders && Object.keys(drv.daily_orders).length > 0) {
          Object.entries(drv.daily_orders).forEach(([dateStr, count]) => {
            if (dateStr >= startStr && dateStr <= endStr) sum += Number(count) || 0;
          });
        }
        return sum;
      }
      return Number(drv.month_orders) || 0;
    },
    [dateFilter]
  );

  const driversList = useMemo(() => {
    let list = Array.isArray(drivers) ? drivers : [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((d) => d.name?.toLowerCase().includes(q) || d.phone?.includes(q));
    }
    return sortDriversByMasterOrder(list);
  }, [drivers, searchQuery]);

  const totalDriversPeriodOrders = useMemo(
    () => (drivers || []).reduce((sum, d) => sum + getDriverPeriodOrders(d), 0),
    [drivers, getDriverPeriodOrders]
  );

  const alertsList = useMemo(() => {
    let list = Array.isArray(alerts) ? alerts : [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.identifier_name?.toLowerCase().includes(q) ||
          a.alert_date?.includes(q) ||
          String(a.deficit).includes(q)
      );
    }
    return list;
  }, [alerts, searchQuery]);

  const unresolvedAlertsCount = useMemo(
    () => (Array.isArray(alerts) ? alerts.filter((a) => !a.is_resolved).length : 0),
    [alerts]
  );

  const handleCardPress = useCallback((tab: DashboardDataTab, status = '') => {
    setActiveTab(tab);
    setStatusFilter(status);
    setPlatformTab('ninja');
    setSearchQuery('');
    setCurrentView('data');
  }, []);

  const getDriverForAlert = useCallback(
    (alert: TargetAlertItem) => getAssignedDriverName(alert, drivers),
    [drivers]
  );

  return {
    currentView, setCurrentView, activeTab, setActiveTab, loading, refreshing,
    dateFilter, setDateFilter, showDateFilterModal, setShowDateFilterModal,
    branchFilter, setBranchFilter, showBranchModal, setShowBranchModal,
    summary, identifiers, drivers,
    searchQuery, setSearchQuery, statusFilter, setStatusFilter,
    platformTab, setPlatformTab,
    selectedIdentifierId, setSelectedIdentifierId,
    selectedDriver, setSelectedDriver,
    showSettingsModal, setShowSettingsModal,
    showImportModal, setShowImportModal,
    loadError, retrying, handleLogoTap, loadData, handleRetry, onRefresh,
    handleResolveAlert, handleResolveAllAlerts,
    keetaCount, ninjaCount, platformsList, identsList,
    getDriverPeriodOrders, driversList, totalDriversPeriodOrders,
    alertsList, unresolvedAlertsCount, handleCardPress, getDriverForAlert,
  };
}
