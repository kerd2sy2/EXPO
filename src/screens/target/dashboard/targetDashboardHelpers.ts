import { ThemeColors } from '../../../types/delegate';
import {
  DriverPerformance,
  IdentifierPerformance,
  TargetAlertItem,
} from '../../../types/target';

export type DashboardViewType =
  | 'home'
  | 'data'
  | 'logs'
  | 'profile'
  | 'platforms'
  | 'rules'
  | 'driver_details';

export type DashboardDataTab = 'identifiers' | 'drivers' | 'alerts';

export interface PlatformSummaryItem {
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

export function getStatusBadge(status: string, isDarkMode: boolean) {
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
}

export function getIdentifierPlatform(ident: any): string {
  const app = (ident?.app_name || '').trim().toLowerCase();
  if (app.includes('ninja') || app.includes('نينجا')) return 'ninja';
  if (app.includes('keeta') || app.includes('كيتا') || app.includes('كينتا')) return 'keeta';
  if (app.includes('toyou') || app.includes('to you') || app.includes('تويو')) return 'toyou';
  if (app.includes('hunger') || app.includes('هنقر')) return 'hungerstation';
  if (app.includes('jahez') || app.includes('جاهز')) return 'jahez';
  if (app.includes('mrsool') || app.includes('مرسول')) return 'mrsool';

  const str = `${ident?.name || ''} ${ident?.code || ''}`.toLowerCase();
  if (str.includes('ninja') || str.includes('نينجا')) return 'ninja';
  if (str.includes('keeta') || str.includes('كيتا') || str.includes('كينتا')) return 'keeta';
  if (str.includes('toyou') || str.includes('to you') || str.includes('تويو')) return 'toyou';
  if (str.includes('hunger') || str.includes('هنقر')) return 'hungerstation';
  if (str.includes('jahez') || str.includes('جاهز')) return 'jahez';
  if (str.includes('mrsool') || str.includes('مرسول')) return 'mrsool';

  if (ident?.app_name && ident.app_name.trim()) {
    return ident.app_name.trim().toLowerCase();
  }
  return 'ninja';
}

export function formatIdentifierDisplayName(name?: string): string {
  if (!name) return '';
  return name.replace(/\s*\((كيتا|نينجا|تويو|كينتا|هنقرستيشن|جاهز|مرسول|Keeta|Ninja|Toyou)\)/gi, '').trim();
}

export function buildPlatformsList(
  identifiers: IdentifierPerformance[],
  colors: ThemeColors,
  rangeOrdersMap: Record<string, number> | null,
  rangeIdentOrdersMap: Record<string, number> | null,
  rangeTotalOrders: number | null
): PlatformSummaryItem[] {
  let baseList = Array.isArray(identifiers) ? identifiers : [];
  if (rangeIdentOrdersMap) {
    baseList = baseList.map((i) => ({
      ...i,
      month_orders: rangeIdentOrdersMap[i.id] !== undefined ? rangeIdentOrdersMap[i.id] : 0,
    }));
  }

  const platMetrics = (platKey: string) => {
    const items = baseList.filter((i) => getIdentifierPlatform(i) === platKey);
    const total = items.length;
    let active = total;
    if (rangeTotalOrders === 0) {
      active = 0;
    } else if (rangeOrdersMap) {
      const countActive = items.filter((i) => (Number(i.month_orders) || 0) > 0).length;
      active = countActive > 0 ? countActive : total;
    }

    const ordersCount = items.reduce((sum, i) => sum + (Number(i.month_orders) || 0), 0);
    const projectedOrders = items.reduce(
      (sum, i) => sum + (Number(i.projected_monthly_orders) || Number(i.month_orders) || 0),
      0
    );
    const onTrackCount = items.filter((i) => i.status === 'ON_TRACK' || i.status === 'TARGET_ACHIEVED').length;
    const atRiskCount = items.filter((i) => i.status === 'AT_RISK').length;
    const behindCount = items.filter((i) => i.status === 'BEHIND_TARGET').length;

    return { totalIdents: active, ordersCount, projectedOrders, onTrackCount, atRiskCount, behindCount };
  };

  const ninjaMetrics = platMetrics('ninja');
  const keetaMetrics = platMetrics('keeta');

  const map: Record<string, PlatformSummaryItem> = {
    ninja: {
      key: 'ninja',
      name: 'نينجا',
      orders: rangeOrdersMap ? (rangeOrdersMap.ninja || 0) : ninjaMetrics.ordersCount,
      idents: ninjaMetrics.totalIdents,
      projected: ninjaMetrics.projectedOrders,
      onTrack: ninjaMetrics.onTrackCount,
      atRisk: ninjaMetrics.atRiskCount,
      behind: ninjaMetrics.behindCount,
      image: require('../../../../assets/images/ninja.png'),
      color: colors.textPrimary,
      bgColor: '#000000',
      borderColor: '#334155',
      accentColor: colors.textPrimary,
    },
    keeta: {
      key: 'keeta',
      name: 'كيتا',
      orders: rangeOrdersMap ? (rangeOrdersMap.keeta || 0) : keetaMetrics.ordersCount,
      idents: keetaMetrics.totalIdents,
      projected: keetaMetrics.projectedOrders,
      onTrack: keetaMetrics.onTrackCount,
      atRisk: keetaMetrics.atRiskCount,
      behind: keetaMetrics.behindCount,
      image: require('../../../../assets/images/keeta.png'),
      color: '#d97706',
      bgColor: '#fde047',
      borderColor: '#eab308',
      accentColor: '#d97706',
    },
  };

  if (!rangeOrdersMap) {
    baseList.forEach((item) => {
      const platKey = getIdentifierPlatform(item);
      if (platKey === 'ninja' || platKey === 'keeta' || platKey === 'toyou') return;
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
          orders,
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
}

export function getAssignedDriverName(
  alert: TargetAlertItem,
  drivers: DriverPerformance[]
): string {
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
}

export function getSubPageTitle(
  currentView: DashboardViewType,
  activeTab: DashboardDataTab,
  statusFilter: string,
  selectedDriverName?: string
): string {
  if (currentView === 'profile') return 'الملف الشخصي';
  if (currentView === 'rules') return 'قواعد ومعايير التارچت';
  if (currentView === 'logs') return 'سجل العمليات والمتابعة';
  if (currentView === 'platforms') return 'تطبيقات التوصيل';
  if (currentView === 'driver_details') return `سجل أيام: ${selectedDriverName || 'المندوب'}`;
  if (currentView === 'data') {
    if (activeTab === 'identifiers') {
      if (statusFilter === 'TARGET_ACHIEVED') return 'المعرفين - حققوا التارچت';
      if (statusFilter === 'ON_TRACK') return 'المعرفين - بالمعدل المطلوب';
      if (statusFilter === 'AT_RISK') return 'المعرفين - على وشك';
      if (statusFilter === 'BEHIND_TARGET') return 'المعرفين - متأخرين';
      return 'قائمة المعرفين';
    }
    if (activeTab === 'drivers') return 'طلبات المناديب';
    if (activeTab === 'alerts') return 'تنبيهات العجز والمتابعة';
    return 'صفحة البيانات';
  }
  return '';
}
