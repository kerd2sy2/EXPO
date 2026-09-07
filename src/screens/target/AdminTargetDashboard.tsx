import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
  BackHandler,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  TargetDashboardSummary,
  IdentifierPerformance,
  DriverPerformance,
  TargetAlertItem,
} from '../../types/target';
import { ThemeColors } from '../../types/delegate';
import { targetApi } from '../../services/targetApi';
import { IdentifierDetailsModal } from './IdentifierDetailsModal';
import { DriverDetailsModal } from './DriverDetailsModal';
import { TargetSettingsModal } from './TargetSettingsModal';
import { ImportOrdersModal } from './ImportOrdersModal';
import { AdminProfileScreen } from './AdminProfileScreen';
import { TargetLogsScreen } from './TargetLogsScreen';
import { DateFilterModal, DateFilterValue, getDefaultMonthFilter } from './DateFilterModal';
import { BranchFilterModal } from './BranchFilterModal';

interface AdminTargetDashboardProps {
  user: any;
  onLogout: () => void;
  isDarkMode?: boolean;
  colors?: ThemeColors;
  isRTL?: boolean;
}

export const AdminTargetDashboard: React.FC<AdminTargetDashboardProps> = ({
  user,
  onLogout,
  isDarkMode = false,
  colors: propColors,
  isRTL = true,
}) => {
  const [currentView, setCurrentView] = useState<'home' | 'data' | 'logs' | 'profile' | 'platforms'>('home');
  const [activeTab, setActiveTab] = useState<'identifiers' | 'drivers' | 'alerts'>('identifiers');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [dateFilter, setDateFilter] = useState<DateFilterValue>(getDefaultMonthFilter);
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [rangeOrdersMap, setRangeOrdersMap] = useState<Record<string, number> | null>(null);
  const [rangeTotalOrders, setRangeTotalOrders] = useState<number | null>(null);
  const [rangeIdentOrdersMap, setRangeIdentOrdersMap] = useState<Record<string, number> | null>(null);

  // Branch Selection Filter: 'all', '1', or '2'
  const [branchFilter, setBranchFilter] = useState<'all' | '1' | '2'>('all');
  const [showBranchModal, setShowBranchModal] = useState(false);

  // Multi-tap handler on Logo: 2 taps = Branch Filter, 3 taps = Date Filter
  const logoTapRef = useRef<{ count: number; timer: any }>({ count: 0, timer: null });
  const handleLogoTap = useCallback(() => {
    if (logoTapRef.current.timer) {
      clearTimeout(logoTapRef.current.timer);
    }
    logoTapRef.current.count += 1;

    if (logoTapRef.current.count === 3) {
      // 3 taps: Date Filter
      logoTapRef.current.count = 0;
      setShowDateFilterModal(true);
    } else {
      logoTapRef.current.timer = setTimeout(() => {
        if (logoTapRef.current.count === 2) {
          // 2 taps: Branch Filter
          setShowBranchModal(true);
        }
        logoTapRef.current.count = 0;
      }, 350);
    }
  }, []);

  const [summary, setSummary] = useState<TargetDashboardSummary | null>(null);
  const [identifiers, setIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
  const [alerts, setAlerts] = useState<TargetAlertItem[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [platformTab, setPlatformTab] = useState<'ninja' | 'keeta'>('ninja');

  // Modals
  const [selectedIdentifierId, setSelectedIdentifierId] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<DriverPerformance | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Theme Colors matching Delegate App
  const colors: ThemeColors = propColors || (isDarkMode
    ? {
        bg: '#000000',
        card: '#16161a',
        cardHeader: '#202026',
        textPrimary: '#ffffff',
        textSecondary: '#9ca3af',
        border: '#27272e',
        primary: '#f97316',
        primaryLight: 'rgba(249, 115, 22, 0.16)',
        primaryText: '#ffffff',
        accent: '#3b82f6',
        accentLight: 'rgba(59, 130, 246, 0.16)',
        inputBg: '#1a1a1f',
        inputBorder: '#27272e',
        warningBg: 'rgba(245, 158, 11, 0.15)',
        warningBorder: '#f59e0b',
        warningText: '#f59e0b',
        errorBg: 'rgba(239, 68, 68, 0.15)',
        errorText: '#ef4444',
      }
    : {
        bg: '#f8fafc',
        card: '#ffffff',
        cardHeader: '#f1f5f9',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        primary: '#f97316',
        primaryLight: 'rgba(249, 115, 22, 0.12)',
        primaryText: '#ffffff',
        accent: '#2563eb',
        accentLight: 'rgba(37, 99, 235, 0.12)',
        inputBg: '#f1f5f9',
        inputBorder: '#cbd5e1',
        warningBg: '#fef3c7',
        warningBorder: '#f59e0b',
        warningText: '#b45309',
        errorBg: '#fee2e2',
        errorText: '#b91c1c',
      });

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const queryMonth = dateFilter.type === 'day' && dateFilter.date ? dateFilter.date : dateFilter.month;
      const [sumData, identsData, driversData, alertsData] = await Promise.all([
        targetApi.getDashboard(dateFilter.month, branchFilter, dateFilter.startDate, dateFilter.endDate).catch((err) => {
          console.log('Notice loading target dashboard:', err?.message || err);
          return null;
        }),
        targetApi.listIdentifiers({
          month: queryMonth,
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate,
          branch: branchFilter,
        }).catch((err) => {
          console.log('Notice loading target identifiers:', err?.message || err);
          return null;
        }),
        targetApi.listDrivers({
          month: queryMonth,
          startDate: dateFilter.startDate,
          endDate: dateFilter.endDate,
          branch: branchFilter,
        }).catch((err) => {
          console.log('Notice loading target drivers:', err?.message || err);
          return null;
        }),
        targetApi.listAlerts({ unresolved_only: false, date: dateFilter.type === 'day' ? dateFilter.date : undefined, branch: branchFilter }).catch(() => []),
      ]);

      if (sumData) {
        setSummary(sumData);
      }
      if (Array.isArray(identsData) && identsData.length > 0) {
        setIdentifiers(identsData);
      } else if (Array.isArray(identsData) && identsData.length === 0 && !sumData) {
        // Only set empty if server explicitly confirmed 0
        setIdentifiers([]);
      }

      if (Array.isArray(driversData) && driversData.length > 0) {
        setDrivers(driversData);
      }
      if (Array.isArray(alertsData)) {
        setAlerts(alertsData);
      }

      // Handle Date Range / Single Day Calculations
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
        setRangeOrdersMap(platMap);
        setRangeTotalOrders(total);
        setRangeIdentOrdersMap(identMap);
      } else if (dateFilter.type === 'range') {
        const sDay = Math.min(dateFilter.startDay || 1, dateFilter.endDay || 30);
        const eDay = Math.max(dateFilter.startDay || 1, dateFilter.endDay || 30);
        const monthPrefix = dateFilter.month || '2026-09';

        let daysToQuery: number[] = [];
        if (sumData?.daily_trend && sumData.daily_trend.length > 0) {
          daysToQuery = sumData.daily_trend
            .filter((t) => t.day >= sDay && t.day <= eDay && Number(t.orders) > 0)
            .map((t) => t.day);
        } else {
          for (let d = sDay; d <= eDay; d++) {
            daysToQuery.push(d);
          }
        }

        if (daysToQuery.length === 0) {
          setRangeOrdersMap({ ninja: 0, keeta: 0, toyou: 0 });
          setRangeTotalOrders(0);
          setRangeIdentOrdersMap({});
        } else {
          const dayResults = await Promise.all(
            daysToQuery.map((d) =>
              targetApi.listIdentifiers({
                month: `${monthPrefix}-${String(d).padStart(2, '0')}`,
                branch: branchFilter,
              }).catch(() => [])
            )
          );
          const platMap: Record<string, number> = { ninja: 0, keeta: 0, toyou: 0 };
          const identMap: Record<string, number> = {};
          let total = 0;
          dayResults.forEach((list) => {
            if (Array.isArray(list)) {
              list.forEach((item) => {
                const plat = getIdentifierPlatform(item);
                const ords = Number(item.today_orders) || 0;
                platMap[plat] = (platMap[plat] || 0) + ords;
                if (item.id) {
                  identMap[item.id] = (identMap[item.id] || 0) + ords;
                }
                total += ords;
              });
            }
          });
          setRangeOrdersMap(platMap);
          setRangeTotalOrders(total);
          setRangeIdentOrdersMap(identMap);
        }
      }

      if (!sumData && (!identsData || identsData.length === 0)) {
        setLoadError('تعذر تحديث بعض البيانات بسبب بطء الاتصال، اضغط لإعادة المحاولة');
      }
    } catch (err: any) {
      console.log('Error loading admin dashboard data:', err);
      setLoadError('تعذر الاتصال بالخادم، اضغط لإعادة المحاولة');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateFilter, branchFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  useEffect(() => {
    const backAction = () => {
      if (currentView !== 'home') {
        setCurrentView('home');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentView]);

  const handleResolveAlert = async (alertId: string) => {
    // Immediate optimistic update (instantly turns to 'تمت التسوية' and hides button)
    setAlerts((prev) =>
      Array.isArray(prev)
        ? prev.map((a) => (a.id === alertId ? { ...a, is_resolved: true } : a))
        : []
    );
    try {
      await targetApi.resolveAlert(alertId);
    } catch (e: any) {
      // Revert if failed
      setAlerts((prev) =>
        Array.isArray(prev)
          ? prev.map((a) => (a.id === alertId ? { ...a, is_resolved: false } : a))
          : []
      );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TARGET_ACHIEVED':
        return {
          bg: isDarkMode ? 'rgba(59, 130, 246, 0.18)' : '#dbeafe',
          text: isDarkMode ? '#60a5fa' : '#1d4ed8',
          label: 'حقق التارچت',
          dot: '#3b82f6',
        };
      case 'ON_TRACK':
        return {
          bg: isDarkMode ? 'rgba(34, 197, 94, 0.18)' : '#dcfce7',
          text: isDarkMode ? '#4ade80' : '#15803d',
          label: 'يسير بالمعدل',
          dot: '#22c55e',
        };
      case 'AT_RISK':
        return {
          bg: isDarkMode ? 'rgba(245, 158, 11, 0.22)' : '#fef3c7',
          text: isDarkMode ? '#fbbf24' : '#b45309',
          border: isDarkMode ? 'rgba(245, 158, 11, 0.5)' : '#fcd34d',
          label: 'على وشك المعدل',
          dot: '#f59e0b',
        };
      case 'BEHIND_TARGET':
      default:
        return {
          bg: isDarkMode ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2',
          text: isDarkMode ? '#f87171' : '#b91c1c',
          border: isDarkMode ? 'rgba(239, 68, 68, 0.4)' : '#fca5a5',
          label: 'متأخر',
          dot: '#ef4444',
        };
    }
  };

  const getIdentifierPlatform = (ident: any): string => {
    const app = (ident?.app_name || '').toLowerCase();
    if (app.includes('ninja') || app.includes('نينجا')) return 'ninja';
    if (app.includes('toyou') || app.includes('to you') || app.includes('تويو')) return 'toyou';
    if (app.includes('keeta') || app.includes('كيتا') || app.includes('كينتا')) return 'keeta';
    if (app.includes('hunger') || app.includes('هنقر')) return 'hungerstation';
    if (app.includes('jahez') || app.includes('جاهز')) return 'jahez';
    if (app.includes('mrsool') || app.includes('مرسول')) return 'mrsool';

    const str = `${ident?.name || ''} ${ident?.code || ''}`.toLowerCase();
    if (str.includes('ninja') || str.includes('نينجا') || str.includes('فردين')) {
      return 'ninja';
    }
    if (str.includes('toyou') || str.includes('to you') || str.includes('تويو')) {
      return 'toyou';
    }
    if (str.includes('hunger') || str.includes('هنقر')) {
      return 'hungerstation';
    }
    if (str.includes('jahez') || str.includes('جاهز')) {
      return 'jahez';
    }
    if (str.includes('mrsool') || str.includes('مرسول')) {
      return 'mrsool';
    }
    if (ident?.app_name && ident.app_name.trim()) {
      return ident.app_name.trim().toLowerCase();
    }
    return 'keeta';
  };

  const formatIdentifierDisplayName = (name?: string) => {
    if (!name) return '';
    return name.replace(/\s*\((كيتا|نينجا|تويو|كينتا|هنقرستيشن|جاهز|مرسول|Keeta|Ninja|Toyou)\)/gi, '').trim();
  };

  // Base list filtered by status and search (before platform partition)
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
      list = list.filter((i) => i.status === 'ON_TRACK');
    } else if (statusFilter === 'AT_RISK' || statusFilter === 'BEHIND_TARGET') {
      list = list.filter((i) => i.status === 'AT_RISK' || i.status === 'BEHIND_TARGET');
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.code?.toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'AT_RISK' || statusFilter === 'BEHIND_TARGET') {
      list = [...list].sort((a, b) => {
        if (a.status === 'AT_RISK' && b.status !== 'AT_RISK') return -1;
        if (a.status !== 'AT_RISK' && b.status === 'AT_RISK') return 1;
        return (b.month_orders || 0) - (a.month_orders || 0);
      });
    }
    return list;
  }, [identifiers, statusFilter, searchQuery, rangeIdentOrdersMap]);

  const keetaCount = useMemo(() => {
    return filteredBaseIdents.filter((i) => getIdentifierPlatform(i) === 'keeta').length;
  }, [filteredBaseIdents]);

  const ninjaCount = useMemo(() => {
    return filteredBaseIdents.filter((i) => getIdentifierPlatform(i) === 'ninja').length;
  }, [filteredBaseIdents]);

  const toyouCount = useMemo(() => {
    return filteredBaseIdents.filter((i) => getIdentifierPlatform(i) === 'toyou').length;
  }, [filteredBaseIdents]);

  // Total Orders across all platforms in the selected period
  const totalMonthOrders = useMemo(() => {
    if (rangeTotalOrders !== null) {
      return rangeTotalOrders;
    }
    if (summary?.total_month_orders && summary.total_month_orders > 0) {
      return summary.total_month_orders;
    }
    return filteredBaseIdents.reduce((sum, i) => sum + (Number(i.month_orders) || 0), 0);
  }, [summary, filteredBaseIdents, rangeTotalOrders]);

  // Per-application breakdown with counts and orders
  const appStats = useMemo(() => {
    let ninjaOrders = rangeOrdersMap ? (rangeOrdersMap['ninja'] || 0) : 0;
    let keetaOrders = rangeOrdersMap ? (rangeOrdersMap['keeta'] || 0) : 0;
    let toyouOrders = rangeOrdersMap ? (rangeOrdersMap['toyou'] || 0) : 0;
    let ninjaIdents = 0;
    let keetaIdents = 0;
    let toyouIdents = 0;

    filteredBaseIdents.forEach((item) => {
      const plat = getIdentifierPlatform(item);
      const orders = Number(item.month_orders) || 0;
      if (plat === 'ninja') {
        ninjaIdents += 1;
        if (!rangeOrdersMap) ninjaOrders += orders;
      } else if (plat === 'keeta') {
        keetaIdents += 1;
        if (!rangeOrdersMap) keetaOrders += orders;
      } else if (plat === 'toyou') {
        toyouIdents += 1;
        if (!rangeOrdersMap) toyouOrders += orders;
      }
    });

    const sumOrders = ninjaOrders + keetaOrders + toyouOrders;
    const calcTotal = rangeTotalOrders !== null ? rangeTotalOrders : (sumOrders > 0 ? sumOrders : (totalMonthOrders || 1));

    return {
      ninja: {
        name: 'نينجا',
        idents: ninjaIdents,
        orders: ninjaOrders,
        percent: calcTotal > 0 ? Math.round((ninjaOrders / calcTotal) * 100) : 0,
      },
      keeta: {
        name: 'كيتا',
        idents: keetaIdents,
        orders: keetaOrders,
        percent: calcTotal > 0 ? Math.round((keetaOrders / calcTotal) * 100) : 0,
      },
      toyou: {
        name: 'تويو',
        idents: toyouIdents,
        orders: toyouOrders,
        percent: calcTotal > 0 ? Math.round((toyouOrders / calcTotal) * 100) : 0,
      },
      totalOrders: calcTotal,
    };
  }, [filteredBaseIdents, totalMonthOrders, rangeOrdersMap, rangeTotalOrders]);

  // Platforms list with: Logo, App Name, Orders Count, and Identifiers Count ONLY
  const platformsList = useMemo(() => {
    const platMetrics = (platKey: string) => {
      const items = filteredBaseIdents.filter((i) => getIdentifierPlatform(i) === platKey);
      const total = items.length;
      let active = total;
      if (rangeTotalOrders === 0) active = 0;
      else if (rangeOrdersMap) {
        const countActive = items.filter((i) => (Number(i.month_orders) || 0) > 0).length;
        active = countActive > 0 ? countActive : total;
      }

      // Projected total orders for this platform
      const projectedOrders = items.reduce((sum, i) => sum + (Number(i.projected_monthly_orders) || Number(i.month_orders) || 0), 0);

      // Status breakdown:
      // يسير بالمعدل (ON_TRACK or TARGET_ACHIEVED)
      const onTrackCount = items.filter((i) => i.status === 'ON_TRACK' || i.status === 'TARGET_ACHIEVED').length;
      // على وشك المعدل (AT_RISK)
      const atRiskCount = items.filter((i) => i.status === 'AT_RISK').length;
      // متأخرين (BEHIND_TARGET)
      const behindCount = items.filter((i) => i.status === 'BEHIND_TARGET').length;

      return {
        totalIdents: active,
        projectedOrders,
        onTrackCount,
        atRiskCount,
        behindCount,
      };
    };

    const ninjaMetrics = platMetrics('ninja');
    const keetaMetrics = platMetrics('keeta');

    const map: Record<
      string,
      {
        key: string;
        name: string;
        orders: number;
        idents: number;
        projected: number;
        onTrack: number;
        atRisk: number;
        behind: number;
        image?: any;
        color: string;
        bgColor: string;
        borderColor: string;
        accentColor?: string;
      }
    > = {
      ninja: {
        key: 'ninja',
        name: 'نينجا',
        orders: rangeOrdersMap ? (rangeOrdersMap['ninja'] || 0) : 0,
        idents: ninjaMetrics.totalIdents,
        projected: ninjaMetrics.projectedOrders,
        onTrack: ninjaMetrics.onTrackCount,
        atRisk: ninjaMetrics.atRiskCount,
        behind: ninjaMetrics.behindCount,
        image: require('../../../assets/images/ninja.png'),
        color: colors.textPrimary,
        bgColor: '#000000',
        borderColor: '#334155',
        accentColor: colors.textPrimary,
      },
      keeta: {
        key: 'keeta',
        name: 'كيتا',
        orders: rangeOrdersMap ? (rangeOrdersMap['keeta'] || 0) : 0,
        idents: keetaMetrics.totalIdents,
        projected: keetaMetrics.projectedOrders,
        onTrack: keetaMetrics.onTrackCount,
        atRisk: keetaMetrics.atRiskCount,
        behind: keetaMetrics.behindCount,
        image: require('../../../assets/images/keeta.png'),
        color: '#d97706',
        bgColor: '#fde047',
        borderColor: '#eab308',
        accentColor: '#d97706',
      },
    };

    if (!rangeOrdersMap) {
      filteredBaseIdents.forEach((item) => {
        const platKey = getIdentifierPlatform(item);
        if (platKey === 'toyou') return; // Do not include Toyou
        const orders = Number(item.month_orders) || 0;
        if (map[platKey]) {
          map[platKey].orders += orders;
        } else {
          const rawName = (item.app_name || '').trim();
          let displayName = rawName;
          if (!displayName) {
            if (platKey === 'hungerstation') displayName = 'هنقرستيشن';
            else if (platKey === 'jahez') displayName = 'جاهز';
            else if (platKey === 'mrsool') displayName = 'مرسول';
            else displayName = platKey;
          }
          const m = platMetrics(platKey);
          map[platKey] = {
            key: platKey,
            name: displayName,
            orders: orders,
            idents: 1,
            projected: m.projectedOrders,
            onTrack: m.onTrackCount,
            atRisk: m.atRiskCount,
            behind: m.behindCount,
            color: colors.primary,
            bgColor: colors.primaryLight,
            borderColor: colors.primary,
            accentColor: colors.primary,
          };
        }
      });
    }

    return Object.values(map);
  }, [filteredBaseIdents, colors, rangeOrdersMap, rangeTotalOrders]);

  // Fast In-Memory Local Filtering (Zero network lag, zero UI freeze)
  const identsList = useMemo(() => {
    return filteredBaseIdents.filter((i) => getIdentifierPlatform(i) === platformTab);
  }, [filteredBaseIdents, platformTab]);

  const driversList = useMemo(() => {
    let list = Array.isArray(drivers) ? drivers : [];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.phone?.includes(q)
      );
    }
    return list;
  }, [drivers, searchQuery]);

  const totalDriversMonthOrders = useMemo(() => {
    return (drivers || []).reduce((sum, d) => sum + (Number(d.month_orders) || 0), 0);
  }, [drivers]);

  const totalDriversTodayOrders = useMemo(() => {
    return (drivers || []).reduce((sum, d) => sum + (Number(d.today_orders) || 0), 0);
  }, [drivers]);

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

  const unresolvedAlertsCount = useMemo(() => {
    return Array.isArray(alerts) ? alerts.filter((a) => !a.is_resolved).length : 0;
  }, [alerts]);

  // Handler for KPI Card Clicks -> Opens Data Page filtered
  const handleCardPress = (tab: 'identifiers' | 'drivers' | 'alerts', status = '') => {
    setActiveTab(tab);
    setStatusFilter(status);
    setPlatformTab('ninja');
    setSearchQuery('');
    setCurrentView('data');
  };

  const getAssignedDriverName = useCallback((alert: TargetAlertItem) => {
    if ((alert as any).driver_name) return (alert as any).driver_name;
    if ((alert as any).driver) return (alert as any).driver;
    const idName = (alert.identifier_name || '').trim().toLowerCase();
    const idId = (alert.identifier_id || '').trim();
    if (!idName && !idId) return 'غير محدد';
    const matched = drivers.find((d) =>
      Array.isArray(d.identifiers) &&
      d.identifiers.some((ident) => {
        const normalized = (ident || '').trim().toLowerCase();
        return (
          (idName && normalized === idName) ||
          (idId && normalized === idId) ||
          (idName && (normalized.includes(idName) || idName.includes(normalized)))
        );
      })
    );
    return matched?.name || 'غير محدد';
  }, [drivers]);

  // Sub-Page Title (Displayed with orange underline like Delegate screens)
  const getSubPageTitle = () => {
    if (currentView === 'profile') return 'الملف الشخصي';
    if (currentView === 'logs') return 'سجل العمليات والمتابعة';
    if (currentView === 'platforms') return 'تطبيقات التوصيل';
    if (currentView === 'data') {
      if (activeTab === 'identifiers') {
        if (statusFilter === 'TARGET_ACHIEVED') return 'المعرفين - حققوا التارچت';
        if (statusFilter === 'ON_TRACK') return 'المعرفين - يسير بالمعدل';
        if (statusFilter === 'AT_RISK' || statusFilter === 'BEHIND_TARGET') return 'المعرفين - على وشك المعدل / متأخر';
        return 'قائمة المعرفين';
      }
      if (activeTab === 'drivers') return 'طلبات المناديب';
      if (activeTab === 'alerts') return 'تنبيهات العجز والمتابعة';
      return 'صفحة البيانات';
    }
    return '';
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Dynamic Header matching Delegate App exactly */}
      <View style={[styles.appHeader, { flexDirection: 'row-reverse' }]}>
        {currentView === 'home' ? (
          /* Home Header: Company Logo + AAMS + LOGISTICS (Right-Aligned) + Profile Screen Button */
          <>
            <TouchableOpacity
              style={[styles.headerBrandContainer, { flexDirection: 'row-reverse' }]}
              onPress={handleLogoTap}
              activeOpacity={0.7}
            >
              <View style={styles.headerBrandTextCol}>
                <Text
                  style={[styles.headerBrandTitle, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  AAMS
                </Text>
                <Text
                  style={[styles.headerBrandSubtitle, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  LOGISTICS
                </Text>
              </View>
              <Image
                source={require('../../../assets/images/logo.png')}
                style={styles.headerLogoImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.headerActionBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => setCurrentView('profile')}
                activeOpacity={0.7}
              >
                <Ionicons name="person-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* Sub-Page Header: Back Button + Start-Aligned Title with Orange Underline */
          <View style={[styles.subPageHeaderRow, { flexDirection: 'row-reverse' }]}>
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={() => {
                setCurrentView('home');
                setPlatformTab('ninja');
              }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="arrow-forward"
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>

            <View style={[styles.subPageTitleContainer, { alignItems: 'flex-end' }]}>
              <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary, textAlign: 'right' }]}>
                {getSubPageTitle()}
              </Text>
              <View style={[styles.titleUnderlineBar, { backgroundColor: colors.primary }]} />
            </View>

            {currentView === 'platforms' ? (
              <TouchableOpacity
                style={[
                  styles.headerActionBtn,
                  {
                    backgroundColor: !dateFilter.isDefault ? colors.primaryLight : colors.inputBg,
                    borderColor: !dateFilter.isDefault ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setShowDateFilterModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar" size={18} color={colors.primary} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 44, height: 44 }} />
            )}
          </View>
        )}
      </View>

      {/* VIEW 1: PROFILE SCREEN (PAGE NOT MODAL) */}
      {currentView === 'profile' ? (
        <AdminProfileScreen
          user={user}
          onOpenTargetSettings={() => setShowSettingsModal(true)}
          onResetData={loadData}
          onLogout={onLogout}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      ) : currentView === 'logs' ? (
        /* VIEW 2: LOGS SCREEN */
        <TargetLogsScreen
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      ) : currentView === 'platforms' ? (
        /* VIEW 2.5: DEDICATED PLATFORMS VIEW ("صفحة المنصات") - 3 CLEAN FULL-PAGE CARDS */
        <ScrollView
          contentContainerStyle={styles.platformsCleanScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.platformsCleanList}>
            {platformsList.map((plat) => {
              const isKeeta = plat.key === 'keeta';
              const isNinja = plat.key === 'ninja';
              const isToyou = plat.key === 'toyou';

              const cardBorder = isDarkMode
                ? (isNinja ? '#374151' : isKeeta ? '#854d0e' : isToyou ? '#155e75' : colors.border)
                : (isNinja ? '#cbd5e1' : isKeeta ? '#fde047' : isToyou ? '#a5f3fc' : colors.border);

              const brandColor = isNinja ? colors.textPrimary : (isKeeta ? '#d97706' : '#0891b2');

              return (
                <View
                  key={plat.key}
                  style={[
                    styles.platformCleanCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: cardBorder,
                    },
                  ]}
                >
                  {/* Top: Logo + App Name */}
                  <View style={[styles.platformCleanHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View
                      style={[
                        styles.platformCleanLogoBox,
                        {
                          backgroundColor: plat.bgColor,
                          borderColor: plat.borderColor || colors.border,
                        },
                      ]}
                    >
                      {plat.image ? (
                        <Image
                          source={plat.image}
                          style={isKeeta ? styles.platformCleanKeetaImg : styles.platformCleanLogoImg}
                          resizeMode={isKeeta ? 'cover' : 'contain'}
                        />
                      ) : (
                        <Ionicons name="cube-outline" size={32} color={plat.color} />
                      )}
                    </View>

                    <Text style={[styles.platformCleanTitle, { color: colors.textPrimary }]}>
                      {plat.name}
                    </Text>
                  </View>

                  {/* Divider line */}
                  <View style={[styles.platformCleanDivider, { backgroundColor: isDarkMode ? '#27272e' : '#f1f5f9' }]} />

                  {/* Metrics Row 1: طلبات الشهر والمتوقع */}
                  <View style={[styles.platformCleanMetricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {/* Metric 1: عدد الطلبات المنفذة */}
                    <View
                      style={[
                        styles.platformCleanMetricTile,
                        {
                          backgroundColor: isDarkMode ? '#1a1a20' : '#f8fafc',
                          borderColor: isDarkMode ? '#27272e' : '#e2e8f0',
                        },
                      ]}
                    >
                      <View style={[styles.platformCleanMetricLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="bag-handle-outline" size={15} color={brandColor} />
                        <Text style={[styles.platformCleanMetricLabel, { color: colors.textSecondary }]}>
                          الطلبات المنفذة
                        </Text>
                      </View>
                      <Text style={[styles.platformCleanMetricValue, { color: brandColor }]}>
                        {plat.orders.toLocaleString('en-US')}
                      </Text>
                    </View>

                    {/* Metric 2: متوقع التارجت */}
                    <View
                      style={[
                        styles.platformCleanMetricTile,
                        {
                          backgroundColor: isDarkMode ? '#1a1a20' : '#f8fafc',
                          borderColor: isDarkMode ? '#27272e' : '#e2e8f0',
                        },
                      ]}
                    >
                      <View style={[styles.platformCleanMetricLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="trending-up-outline" size={15} color="#3b82f6" />
                        <Text style={[styles.platformCleanMetricLabel, { color: colors.textSecondary }]}>
                          متوقع التارچت
                        </Text>
                      </View>
                      <Text style={[styles.platformCleanMetricValue, { color: '#3b82f6' }]}>
                        {(plat.projected ?? 0).toLocaleString('en-US')}
                      </Text>
                    </View>
                  </View>

                  {/* Metrics Row 2: يسير بالمعدل والمتأخرين وإجمالي المعرفات */}
                  <View style={[styles.platformCleanMetricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 10 }]}>
                    {/* يسير بالمعدل */}
                    <View
                      style={[
                        styles.platformCleanMetricTile,
                        {
                          backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.12)' : '#ecfdf5',
                          borderColor: isDarkMode ? '#166534' : '#a7f3d0',
                        },
                      ]}
                    >
                      <View style={[styles.platformCleanMetricLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="checkmark-circle-outline" size={15} color="#16a34a" />
                        <Text style={[styles.platformCleanMetricLabel, { color: '#16a34a' }]}>
                          يسير بالمعدل
                        </Text>
                      </View>
                      <Text style={[styles.platformCleanMetricValue, { color: '#16a34a' }]}>
                        {plat.onTrack ?? 0}
                      </Text>
                    </View>

                    {/* المتأخرين */}
                    <View
                      style={[
                        styles.platformCleanMetricTile,
                        {
                          backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2',
                          borderColor: isDarkMode ? '#991b1b' : '#fecaca',
                        },
                      ]}
                    >
                      <View style={[styles.platformCleanMetricLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="alert-circle-outline" size={15} color="#dc2626" />
                        <Text style={[styles.platformCleanMetricLabel, { color: '#dc2626' }]}>
                          المتأخرين
                        </Text>
                      </View>
                      <Text style={[styles.platformCleanMetricValue, { color: '#dc2626' }]}>
                        {plat.behind ?? 0}
                      </Text>
                    </View>

                    {/* إجمالي المعرفات */}
                    <View
                      style={[
                        styles.platformCleanMetricTile,
                        {
                          backgroundColor: isDarkMode ? '#1a1a20' : '#f8fafc',
                          borderColor: isDarkMode ? '#27272e' : '#e2e8f0',
                        },
                      ]}
                    >
                      <View style={[styles.platformCleanMetricLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="people-outline" size={15} color={colors.primary} />
                        <Text style={[styles.platformCleanMetricLabel, { color: colors.textSecondary }]}>
                          المعرفات
                        </Text>
                      </View>
                      <Text style={[styles.platformCleanMetricValue, { color: colors.textPrimary }]}>
                        {plat.idents}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      ) : currentView === 'home' ? (
        /* VIEW 3: HOME DASHBOARD (KPIs & Quick Cards) */
        <ScrollView
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.tabContainer}>
            {/* Network / Load Error Banner with Instant Retry */}
            {loadError && (
              <TouchableOpacity
                style={[
                  styles.errorRetryBanner,
                  {
                    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                    borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.4)' : '#fca5a5',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={loadData}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh-circle" size={22} color="#ef4444" />
                <Text style={[styles.errorRetryBannerText, { color: isDarkMode ? '#fca5a5' : '#b91c1c', textAlign: isRTL ? 'right' : 'left' }]}>
                  {loadError}
                </Text>
                <View style={styles.errorRetryBtnWrap}>
                  <Text style={styles.errorRetryBtnText}>إعادة المحاولة</Text>
                </View>
              </TouchableOpacity>
            )}



            {/* Quick KPI Stats - Clickable Cards leading to Data Page */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                مؤشرات الأداء الرئيسية
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                اضغط على أي مؤشر لعرض تفاصيل البيانات ومطابقة الأداء
              </Text>
            </View>

            <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Card 1: إجمالي المعرفين */}
              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleCardPress('identifiers', '')}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#dbeafe' }]}>
                  <Ionicons name="people" size={22} color="#2563eb" />
                </View>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {summary?.total_identifiers ?? identsList.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>إجمالي المعرفين</Text>
                <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.statTapHintText, { color: colors.primary }]}>عرض الكل</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color={colors.primary} />
                </View>
              </TouchableOpacity>


              {/* Card 3: حققوا التارچت */}
              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleCardPress('identifiers', 'TARGET_ACHIEVED')}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#dcfce7' }]}>
                  <Ionicons name="trophy" size={22} color="#16a34a" />
                </View>
                <Text style={[styles.statNumber, { color: '#16a34a' }]}>
                  {summary?.target_achieved ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>حققوا التارچت</Text>
                <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.statTapHintText, { color: '#16a34a' }]}>عرض المحققين</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color="#16a34a" />
                </View>
              </TouchableOpacity>

              {/* Card 4: بالمعدل المطلوب */}
              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleCardPress('identifiers', 'ON_TRACK')}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.16)' : '#ccfbf1' }]}>
                  <Ionicons name="trending-up" size={22} color="#0d9488" />
                </View>
                <Text style={[styles.statNumber, { color: '#0d9488' }]}>
                  {summary?.on_track ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>بالمعدل المطلوب</Text>
                <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.statTapHintText, { color: '#0d9488' }]}>عرض السائرين</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color="#0d9488" />
                </View>
              </TouchableOpacity>

              {/* Card 5: على وشك المعدل / متأخرين */}
              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleCardPress('identifiers', 'AT_RISK')}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2' }]}>
                  <Ionicons name="warning" size={22} color="#dc2626" />
                </View>
                <Text style={[styles.statNumber, { color: '#dc2626' }]}>
                  {(summary?.at_risk ?? 0) + (summary?.behind_target ?? 0)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>على وشك المعدل / متأخرين</Text>
                <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.statTapHintText, { color: '#dc2626' }]}>عرض المتأخرين</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color="#dc2626" />
                </View>
              </TouchableOpacity>

              {/* Card 6: طلبات كافة المناديب */}
              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleCardPress('drivers')}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="people" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.primary }]}>
                  {totalDriversMonthOrders}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>طلبات كافة المناديب</Text>
                <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.statTapHintText, { color: colors.primary }]}>بيانات المناديب</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color={colors.primary} />
                </View>
              </TouchableOpacity>

              {/* Card 7: تنبيهات العجز النشطة */}
              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleCardPress('alerts')}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.16)' : '#f3e8ff' }]}>
                  <Ionicons name="notifications" size={22} color="#9333ea" />
                </View>
                <Text style={[styles.statNumber, { color: unresolvedAlertsCount > 0 ? '#dc2626' : colors.textPrimary }]}>
                  {unresolvedAlertsCount}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>تنبيهات العجز النشطة</Text>
                <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.statTapHintText, { color: '#9333ea' }]}>عرض التنبيهات</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color="#9333ea" />
                </View>
              </TouchableOpacity>
            </View>

            {/* The Operations Cards (المنصات، سجل العمليات، استيراد إكسل) */}
            <View style={styles.operationsCardsContainer}>
              {/* Card 1: تطبيقات التوصيل */}
              <TouchableOpacity
                style={[
                  styles.quickCardRow,
                  { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
                onPress={() => setCurrentView('platforms')}
                activeOpacity={0.75}
              >
                <View style={[styles.quickCardIconCircle, { backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.16)' : '#ffedd5' }]}>
                  <Ionicons name="grid-outline" size={22} color={colors.primary} />
                </View>
                <View style={[styles.quickCardTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.historyTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.quickCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                      تطبيقات التوصيل
                    </Text>
                    <View style={[styles.historyBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.historyBadgeText, { color: colors.primary }]}>{platformsList.length} تطبيقات</Text>
                    </View>
                  </View>
                  <Text style={[styles.quickCardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    استعراض تفاصيل طلبات وأداء نينجا وكيتا
                  </Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Card 2: سجل العمليات والأداء */}
              <TouchableOpacity
                style={[
                  styles.historyHeroCard,
                  { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
                onPress={() => setCurrentView('logs')}
                activeOpacity={0.75}
              >
                <View style={[styles.historyIconCircle, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#dbeafe' }]}>
                  <Ionicons name="time-outline" size={26} color="#2563eb" />
                </View>
                <View style={[styles.historyTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.historyTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.historyCardTitle, { color: colors.textPrimary }]}>
                      سجل العمليات والأداء
                    </Text>
                    <View style={[styles.historyBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.historyBadgeText, { color: colors.primary }]}>السجل التاريخي</Text>
                    </View>
                  </View>
                  <Text style={[styles.historyCardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    استعراض سجل استيراد الطلبات، تنبيهات العجز، والتسويات
                  </Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={22} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Card 2: Operations: Import Excel Card */}
              <TouchableOpacity
                style={[
                  styles.quickCardRow,
                  { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
                onPress={() => setShowImportModal(true)}
                activeOpacity={0.7}
              >
                <View style={[styles.quickCardIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Feather name="upload-cloud" size={22} color={colors.primary} />
                </View>
                <View style={[styles.quickCardTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.quickCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    استيراد ملف إكسل اليومي
                  </Text>
                  <Text style={[styles.quickCardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    رفع كشف الطلبات ومطابقة التارچت آلياً
                  </Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* VIEW 4: DATA VIEW (FULL LIST / SEARCH / FILTERS) */
        <ScrollView
          contentContainerStyle={styles.mainScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          <View style={styles.tabContainer}>
            {/* Search Box */}
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={
                  activeTab === 'identifiers'
                    ? 'بحث باسم المعرف أو الكود...'
                    : activeTab === 'drivers'
                    ? 'بحث باسم المندوب...'
                    : 'بحث في التنبيهات بالاسم أو التاريخ...'
                }
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Content Rendering */}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>جارٍ جلب البيانات ومطابقة الأداء...</Text>
              </View>
            ) : activeTab === 'identifiers' ? (
              <View>
                {/* Platform Filter Tabs (Ninja / Keeta / Toyou) */}
                <View style={[styles.platformTabsBar, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* 1. NINJA (First) */}
                  <TouchableOpacity
                    style={[
                      styles.platformTabItem,
                      platformTab === 'ninja' && [styles.platformTabItemActive, { backgroundColor: '#000000', borderColor: isDarkMode ? '#334155' : '#0f172a', borderWidth: 1 }],
                    ]}
                    onPress={() => setPlatformTab('ninja')}
                    activeOpacity={0.75}
                  >
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 5 }}>
                      <Image
                        source={require('../../../assets/images/ninja.png')}
                        style={styles.platformTabLogo}
                        resizeMode="contain"
                      />
                      <Text
                        style={[
                          styles.platformTabItemText,
                          { color: platformTab === 'ninja' ? '#ffffff' : colors.textPrimary },
                          platformTab === 'ninja' && styles.platformTabItemTextActive,
                        ]}
                      >
                        نينجا
                      </Text>
                      <View style={[
                        styles.platformCountBadge,
                        { backgroundColor: platformTab === 'ninja' ? 'rgba(255,255,255,0.28)' : isDarkMode ? '#334155' : '#e2e8f0' }
                      ]}>
                        <Text style={[
                          styles.platformCountText,
                          { color: platformTab === 'ninja' ? '#ffffff' : colors.textPrimary }
                        ]}>
                          {ninjaCount}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* 2. KEETA (Second) */}
                  <TouchableOpacity
                    style={[
                      styles.platformTabItem,
                      platformTab === 'keeta' && [styles.platformTabItemActive, { backgroundColor: '#d97706' }],
                    ]}
                    onPress={() => setPlatformTab('keeta')}
                    activeOpacity={0.75}
                  >
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 5 }}>
                      <Image
                        source={require('../../../assets/images/keeta.png')}
                        style={styles.platformTabLogo}
                        resizeMode="cover"
                      />
                      <Text
                        style={[
                          styles.platformTabItemText,
                          { color: platformTab === 'keeta' ? '#ffffff' : colors.textPrimary },
                          platformTab === 'keeta' && styles.platformTabItemTextActive,
                        ]}
                      >
                        كيتا
                      </Text>
                      <View style={[
                        styles.platformCountBadge,
                        { backgroundColor: platformTab === 'keeta' ? 'rgba(255,255,255,0.28)' : isDarkMode ? '#334155' : '#e2e8f0' }
                      ]}>
                        <Text style={[
                          styles.platformCountText,
                          { color: platformTab === 'keeta' ? '#ffffff' : colors.textPrimary }
                        ]}>
                          {keetaCount}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>

                {identsList.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="search-outline" size={44} color={colors.textSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                      {platformTab === 'keeta'
                        ? 'لا توجد معرفات لتطبيق كيتا'
                        : platformTab === 'ninja'
                        ? 'لا توجد معرفات لتطبيق نينجا'
                        : 'لا توجد معرفات مسجلة'}
                    </Text>
                    <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                      يمكنك استيراد كشف الطلبات عبر لوحة التحكم
                    </Text>
                  </View>
                ) : (
                identsList.map((ident) => {
                  const badge = getStatusBadge(ident.status);
                  const platform = getIdentifierPlatform(ident);
                  return (
                    <TouchableOpacity
                      key={ident.id}
                      style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setSelectedIdentifierId(ident.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.itemTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.identAvatarTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <View
                            style={[
                              styles.identPlatformAvatar,
                              {
                                backgroundColor:
                                  platform === 'ninja'
                                    ? '#ffffff'
                                    : platform === 'toyou'
                                    ? '#ffffff'
                                    : '#fde047',
                                borderColor:
                                  platform === 'ninja'
                                    ? (isDarkMode ? '#475569' : '#0f172a')
                                    : platform === 'toyou'
                                    ? '#06b6d4'
                                    : '#eab308',
                              },
                            ]}
                          >
                            <Image
                              source={
                                platform === 'ninja'
                                  ? require('../../../assets/images/ninja.png')
                                  : platform === 'toyou'
                                  ? require('../../../assets/images/toyou.png')
                                  : require('../../../assets/images/keeta.png')
                              }
                              style={
                                platform === 'ninja'
                                  ? styles.identNinjaAvatarImg
                                  : platform === 'toyou'
                                  ? styles.identToyouAvatarImg
                                  : styles.identKeetaAvatarImg
                              }
                              resizeMode={platform === 'keeta' ? 'cover' : 'contain'}
                            />
                          </View>

                          <View style={[styles.itemTitleGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                            <Text style={[styles.itemName, { color: colors.textPrimary }]}>
                              {formatIdentifierDisplayName(ident.name)}
                            </Text>
                            {ident.code ? (
                              <Text style={[styles.itemCode, { color: colors.textSecondary }]}>كود: {ident.code}</Text>
                            ) : null}
                          </View>
                        </View>

                        <View style={[
                          styles.statusBadge,
                          {
                            backgroundColor: badge.bg,
                            borderColor: badge.border || 'transparent',
                            borderWidth: badge.border ? 1 : 0,
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          }
                        ]}>
                          <View style={[styles.badgeDot, { backgroundColor: badge.dot }]} />
                          <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                      </View>

                      <View style={styles.itemProgressSection}>
                        <View style={[styles.itemProgressTrack, { backgroundColor: isDarkMode ? '#1f2433' : '#f1f5f9' }]}>
                          <View
                            style={[
                              styles.itemProgressFill,
                              {
                                width: `${Math.min(100, Math.max(2, ident.achievement_percent || 0))}%`,
                                backgroundColor: (ident.achievement_percent || 0) >= 100 ? '#22c55e' : colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.itemProgressPct, { color: colors.primary }]}>
                          {ident.achievement_percent || 0}%
                        </Text>
                      </View>

                      <View style={[styles.itemMetricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={styles.itemMetricCol}>
                          <Text style={[styles.itemMetricVal, { color: colors.textPrimary }]}>
                            {ident.month_orders || 0} / {ident.monthly_target || 0}
                          </Text>
                          <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>الطلبات / التارچت</Text>
                        </View>

                        <View style={styles.itemMetricCol}>
                          <Text style={[styles.itemMetricVal, { color: colors.textPrimary }]}>
                            {ident.daily_average || 0}
                          </Text>
                          <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>متوسط يومي</Text>
                        </View>

                        <View style={styles.itemMetricCol}>
                          <Text style={[styles.itemMetricVal, { color: colors.primary }]}>
                            {Math.round(ident.daily_required || 0)}
                          </Text>
                          <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>المطلوب يومياً</Text>
                        </View>

                        <View style={styles.itemMetricCol}>
                          <Text
                            style={[
                              styles.itemMetricVal,
                              { color: ident.is_qualified ? '#16a34a' : '#dc2626' },
                            ]}
                          >
                            {ident.projected_monthly_orders || 0}
                          </Text>
                          <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>التوقع الشهري</Text>
                        </View>
                      </View>

                      <View style={[styles.itemBottomRow, { borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.qualificationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Ionicons
                            name={ident.is_qualified ? 'checkmark-circle' : 'close-circle'}
                            size={15}
                            color={ident.is_qualified ? '#16a34a' : '#dc2626'}
                          />
                          <Text
                            style={[
                              styles.qualificationText,
                              { color: ident.is_qualified ? '#16a34a' : '#dc2626' },
                            ]}
                          >
                            {ident.is_qualified ? 'مؤهل للتارچت' : 'غير مؤهل'}
                          </Text>
                        </View>

                        <View style={[styles.tapDetailsGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Text style={[styles.tapDetailsText, { color: colors.primary }]}>التفاصيل والمناديب</Text>
                          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={colors.primary} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
            ) : activeTab === 'drivers' ? (
              driversList.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="people-outline" size={44} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا يوجد مناديب مسجلين</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    تأكد من مطابقة أسماء المناديب داخل ملف الإكسل
                  </Text>
                </View>
              ) : (
                <View>
                  {/* Individual Driver Cards */}
                  {driversList.map((drv) => (
                    <TouchableOpacity
                      key={drv.id}
                      style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => setSelectedDriver(drv)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.itemTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.driverAvatarRow, { flexDirection: isRTL ? 'row-reverse' : 'row', flex: 1 }]}>
                          <View style={[styles.driverAvatarCircle, { backgroundColor: colors.primaryLight }]}>
                            <Ionicons name="person" size={20} color={colors.primary} />
                          </View>
                          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1, marginHorizontal: 6 }}>
                            <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>{drv.name}</Text>
                            {drv.phone ? (
                              <Text style={[styles.itemCode, { color: colors.textSecondary }]}>{drv.phone}</Text>
                            ) : null}
                          </View>
                        </View>

                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.driverBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1, minWidth: 72 }]}>
                            <Text style={[styles.driverBadgeNum, { color: colors.primary, fontSize: 15 }]}>
                              {drv.month_orders ?? 0}
                            </Text>
                            <Text style={[styles.driverBadgeLbl, { color: colors.primary, fontWeight: '700' }]}>
                              الشهر
                            </Text>
                          </View>
                          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
                        </View>
                      </View>

                      {Array.isArray(drv.identifiers) && drv.identifiers.length > 0 && (
                        <View style={[styles.tagRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Text style={[styles.tagLabel, { color: colors.textSecondary }]}>المعرفات:</Text>
                          <Text style={[styles.tagValue, { color: colors.textPrimary }]}>{drv.identifiers.join('، ')}</Text>
                        </View>
                      )}

                      {Array.isArray(drv.apps) && drv.apps.length > 0 && (
                        <View style={[styles.tagRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Text style={[styles.tagLabel, { color: colors.textSecondary }]}>التطبيقات:</Text>
                          <Text style={[styles.tagValue, { color: colors.primary }]}>{drv.apps.join('، ')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )
            ) : (
              alertsList.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="checkmark-circle-outline" size={48} color="#16a34a" />
                  <Text style={[styles.emptyTitle, { color: '#16a34a', marginTop: 10 }]}>
                    لا توجد تنبيهات عجز مسجلة
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    كافة المعرفين يسيرون بالمعدل المطلوب أو أفضل!
                  </Text>
                </View>
              ) : (
                alertsList.map((alert, idx) => {
                  const isResolved = Boolean(alert.is_resolved);
                  return (
                    <View
                      key={alert.id || `alert-${idx}`}
                      style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      <View style={[styles.itemTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
                          <Text style={[styles.itemName, { color: colors.textPrimary }]}>
                            {formatIdentifierDisplayName(alert.identifier_name) || 'معرف'}
                          </Text>
                          <View style={[styles.alertDriverRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Ionicons name="person-outline" size={13} color={colors.primary} />
                            <Text style={[styles.alertDriverText, { color: colors.primary }]}>
                              المندوب المسؤول اليوم: {getAssignedDriverName(alert)}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isResolved
                                ? (isDarkMode ? 'rgba(34, 197, 94, 0.18)' : '#dcfce7')
                                : (isDarkMode ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2'),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: isResolved ? '#16a34a' : '#dc2626' },
                            ]}
                          >
                            {isResolved ? 'تمت التسوية' : `عجز ${alert.deficit ?? 0} طلب`}
                          </Text>
                        </View>
                      </View>

                      <View style={[styles.alertNumsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.alertNumText, { color: colors.textSecondary }]}>
                          التارچت اليومي: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{alert.target_orders ?? 0}</Text>
                        </Text>
                        <Text style={[styles.alertNumText, { color: colors.textSecondary }]}>
                          المنفذ فعلياً: <Text style={{ color: colors.primary, fontWeight: '700' }}>{alert.actual_orders ?? 0}</Text>
                        </Text>
                      </View>

                      {!isResolved && (
                        <TouchableOpacity
                          style={[styles.resolveBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                          onPress={() => handleResolveAlert(alert.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
                          <Text style={[styles.resolveBtnText, { color: colors.primary }]}>تسوية التنبيه</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )
            )}
          </View>
        </ScrollView>
      )}

      {/* Sub-Modals */}
      <IdentifierDetailsModal
        visible={!!selectedIdentifierId}
        identifierId={selectedIdentifierId}
        month={dateFilter.month}
        onClose={() => setSelectedIdentifierId(null)}
        isDarkMode={isDarkMode}
      />

      <DriverDetailsModal
        visible={!!selectedDriver}
        driver={selectedDriver}
        month={dateFilter.month}
        onClose={() => setSelectedDriver(null)}
        isDarkMode={isDarkMode}
      />

      <TargetSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSaved={loadData}
        isDarkMode={isDarkMode}
      />

      <ImportOrdersModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={loadData}
        isDarkMode={isDarkMode}
      />

      <DateFilterModal
        visible={showDateFilterModal}
        currentFilter={dateFilter}
        onApply={(newFilter) => {
          setDateFilter(newFilter);
        }}
        onClose={() => setShowDateFilterModal(false)}
        isDarkMode={isDarkMode}
      />

      <BranchFilterModal
        visible={showBranchModal}
        selectedBranch={branchFilter}
        onSelectBranch={(b) => setBranchFilter(b)}
        onClose={() => setShowBranchModal(false)}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  appHeader: {
    minHeight: 72,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBrandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerBranchPill: {
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
  },
  headerBranchPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  rowBranchBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'center',
  },
  rowBranchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  headerDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fed7aa',
    gap: 4,
    marginHorizontal: 4,
  },
  darkHeaderDateBadge: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  headerDateBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#ea580c',
    maxWidth: 130,
  },
  headerLogoImage: {
    width: 40,
    height: 40,
  },
  headerBrandTextCol: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerBrandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4.8,
    textAlign: 'left',
    includeFontPadding: false,
  },
  headerBrandSubtitle: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 3.2,
    textAlign: 'left',
    marginTop: 1,
    includeFontPadding: false,
  },
  headerActions: {
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subPageHeaderRow: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  subPageTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  subPageHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  titleUnderlineBar: {
    width: 34,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
  },
  mainScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statsGrid: {
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    width: '48%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 135,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  statTapHint: {
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  statTapHintText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyHeroCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  historyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTextCol: {
    flex: 1,
    gap: 3,
  },
  historyTitleRow: {
    alignItems: 'center',
    gap: 8,
  },
  historyCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyCardSub: {
    fontSize: 11,
  },
  quickCardRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  quickCardIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCardTextCol: {
    flex: 1,
    gap: 2,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickCardSub: {
    fontSize: 11,
  },
  segmentedTabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegmentedTab: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  segmentedTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  filterChipsRow: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  itemTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  identAvatarTitleGroup: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  identPlatformAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  identNinjaAvatarImg: {
    width: 32,
    height: 32,
  },
  identToyouAvatarImg: {
    width: 35,
    height: 35,
  },
  identKeetaAvatarImg: {
    width: 44,
    height: 44,
  },
  itemTitleGroup: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
  },
  itemCode: {
    fontSize: 11,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    flexShrink: 0,
    minWidth: 68,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    flexShrink: 0,
  },
  itemProgressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  itemProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  itemProgressPct: {
    fontSize: 11,
    fontWeight: '800',
    minWidth: 35,
    textAlign: 'right',
  },
  itemMetricsRow: {
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  itemMetricCol: {
    alignItems: 'center',
  },
  itemMetricVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  itemMetricLbl: {
    fontSize: 10,
    marginTop: 2,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  qualificationRow: {
    alignItems: 'center',
    gap: 4,
  },
  qualificationText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tapDetailsGroup: {
    alignItems: 'center',
    gap: 2,
  },
  tapDetailsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  driverAvatarRow: {
    alignItems: 'center',
    gap: 10,
  },
  driverAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  driverBadgeNum: {
    fontSize: 14,
    fontWeight: '800',
  },
  driverBadgeLbl: {
    fontSize: 9,
  },
  tagRow: {
    alignItems: 'center',
    gap: 6,
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  alertNumsRow: {
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  alertNumText: {
    fontSize: 12,
  },
  resolveBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  resolveBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  appBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  appBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  platformTabsBar: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  platformTabItem: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformTabItemActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  platformTabItemText: {
    fontSize: 12,
    fontWeight: '700',
  },
  platformTabItemTextActive: {
    fontWeight: '800',
    color: '#ffffff',
  },
  platformTabLogo: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  platformCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  errorRetryBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    gap: 10,
  },
  errorRetryBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  errorRetryBtnWrap: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  errorRetryBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  dateFilterPillBar: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  dateFilterIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateFilterTextCol: {
    flex: 1,
    gap: 2,
  },
  dateFilterTitleRow: {
    alignItems: 'center',
    gap: 8,
  },
  dateFilterTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  dateFilterActiveBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dateFilterActiveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  dateFilterSub: {
    fontSize: 11,
  },
  dateFilterChangeBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  dateFilterChangeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  appStatsCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  appStatsHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  appStatsTitleGroup: {
    flex: 1,
    gap: 2,
  },
  appStatsTitleRow: {
    alignItems: 'center',
    gap: 8,
  },
  appStatsHeaderIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appStatsTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  appStatsSubtitle: {
    fontSize: 11,
  },
  appStatsMonthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    alignItems: 'center',
  },
  appStatsMonthBadgeLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
  appStatsMonthBadgeVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  appStatsGrid: {
    gap: 8,
  },
  appStatTile: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
    gap: 6,
  },
  appStatTileTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appStatLogoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  appStatLogoImg: {
    width: 22,
    height: 22,
  },
  appStatNameBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  appStatNameText: {
    fontSize: 11,
    fontWeight: '800',
  },
  appStatMetrics: {
    marginVertical: 2,
  },
  appStatOrdersNum: {
    fontSize: 15,
    fontWeight: '900',
  },
  appStatOrdersUnit: {
    fontSize: 9,
    fontWeight: '600',
  },
  appStatBarTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
  },
  appStatBarFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  appStatBottomRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  appStatIdentsCount: {
    fontSize: 10,
    fontWeight: '700',
  },
  appStatPercentText: {
    fontSize: 10,
    fontWeight: '800',
  },
  operationsCardsContainer: {
    marginTop: 4,
    marginBottom: 8,
    gap: 4,
  },
  platformsSummaryCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  platformsCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  platformsCardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformsCardTitleGroup: {
    flex: 1,
    gap: 2,
  },
  platformsCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  platformsCardSubtitle: {
    fontSize: 11,
  },
  platformsCardActionBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
    gap: 2,
  },
  platformsCardActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  platformsChipsRow: {
    gap: 8,
  },
  platformMiniChip: {
    flex: 1,
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  miniLogoCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  miniLogoImg: {
    width: 18,
    height: 18,
  },
  miniChipName: {
    fontSize: 11,
    fontWeight: '800',
  },
  miniChipVal: {
    fontSize: 10,
    fontWeight: '700',
  },
  platformDateTextCol: {
    flex: 1,
    gap: 1,
  },
  platformDateSubTitle: {
    fontSize: 11,
    marginBottom: 1,
  },
  platformDatePillBar: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  platformDateIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  platformDateText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  platformDateChangeBadge: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  platformDateChangeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  alertDriverRow: {
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  alertDriverText: {
    fontSize: 11,
    fontWeight: '600',
  },
  platformVerticalList: {
    gap: 12,
    marginTop: 6,
  },
  platformVerticalCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  platformCardLogoCircle: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    overflow: 'hidden',
  },
  platformCardLogoImg: {
    width: 36,
    height: 36,
  },
  platformKeetaImg: {
    width: 52,
    height: 52,
  },
  platformCardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  platformCardTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 3,
  },
  platformCardSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  platformCardOrdersCol: {
    alignItems: 'center',
    minWidth: 70,
  },
  platformCardOrdersNum: {
    fontSize: 22,
    fontWeight: '900',
  },
  platformCardOrdersLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  platformsCleanScrollContent: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 28,
  },
  platformsCleanList: {
    flex: 1,
    gap: 16,
    justifyContent: 'space-between',
  },
  platformCleanCard: {
    flex: 1,
    minHeight: 165,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 18,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  platformCleanHeader: {
    alignItems: 'center',
    gap: 14,
  },
  platformCleanLogoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  platformCleanLogoImg: {
    width: 44,
    height: 44,
  },
  platformCleanKeetaImg: {
    width: 56,
    height: 56,
  },
  platformCleanTitle: {
    fontSize: 22,
    fontWeight: '900',
  },
  platformCleanDivider: {
    height: 1,
    width: '100%',
    marginVertical: 12,
  },
  platformCleanMetricsRow: {
    gap: 12,
  },
  platformCleanMetricTile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 4,
  },
  platformCleanMetricLabelRow: {
    alignItems: 'center',
    gap: 6,
  },
  platformCleanMetricLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  platformCleanMetricValue: {
    fontSize: 24,
    fontWeight: '900',
  },
});
