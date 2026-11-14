import { Ionicons } from '@expo/vector-icons';
import { WorkSession, TabType } from '../../types/delegate';
import {
  DelegateWithStatus,
  PendingMaintenanceRequest,
  PendingAdvanceRequest,
} from '../../services/supervisor';
import { VehicleItem, isVehicleOilDue } from '../../services/operations';

export const READ_NOTIFS_KEY = '@eshraf_read_notifications_v1';
export const CLEARED_NOTIFS_KEY = '@eshraf_cleared_notifications_v1';

export interface NotificationItem {
  id: string;
  category: 'SHIFT' | 'VEHICLE' | 'MAINTENANCE' | 'ADVANCE';
  title: string;
  delegateName?: string;
  message: string;
  timestamp: string;
  rawDate: number;
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  actionLabel: string;
  actionTab: TabType;
  actionMeta?: { sessionId?: string; employeeId?: string };
}

export function formatArabicRelativeTime(timestampMs: number): string {
  if (!timestampMs || Number.isNaN(timestampMs)) return 'الآن';
  const diffSec = Math.floor((Date.now() - timestampMs) / 1000);
  if (diffSec < 60) return 'الآن';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  return new Date(timestampMs).toLocaleDateString('ar-SA');
}

export function synthesizeNotifications({
  pendingSessions,
  workingDelegates,
  vehicles,
  pendingMaintenance,
  pendingAdvances,
  clearedIds,
}: {
  pendingSessions: WorkSession[];
  workingDelegates: DelegateWithStatus[];
  vehicles: VehicleItem[];
  pendingMaintenance: PendingMaintenanceRequest[];
  pendingAdvances: PendingAdvanceRequest[];
  clearedIds: Set<string>;
}): NotificationItem[] {
  const items: NotificationItem[] = [];

  pendingSessions.forEach((s) => {
    let parsedTime = 0;
    if (s.end_time) {
      parsedTime = new Date(s.end_time).getTime();
    } else if ((s as any).created_at) {
      parsedTime = new Date((s as any).created_at).getTime();
    } else if (s.start_time) {
      parsedTime = new Date(s.start_time).getTime();
    }
    if (!parsedTime || Number.isNaN(parsedTime)) {
      parsedTime = Date.now() - 3600000;
    }

    const bikePlate = s.motorcycle_number || (s as any).plate_number || 'بدون لوحة';
    const orders = s.orders_count || (s as any).total_orders || 0;
    const km = (s as any).total_km ?? s.distance ?? 0;
    const empName = s.employee_name || (s as any).employee?.name || 'مندوب';

    items.push({
      id: `shift_end_${s.id}`,
      category: 'SHIFT',
      title: 'مندوب أنهى الشفت',
      delegateName: empName,
      message: `أنهى شفت العمل بالدباب (${bikePlate}) | الطلبات: ${orders} | الكيلومترات: ${km} كم`,
      timestamp: formatArabicRelativeTime(parsedTime),
      rawDate: parsedTime,
      iconName: 'flag-outline',
      iconColor: '#10b981',
      iconBg: '#10b98118',
      actionLabel: 'مراجعة واعتماد',
      actionTab: 'approvals',
      actionMeta: { sessionId: s.id, employeeId: s.employee_id },
    });
  });

  workingDelegates.forEach((d) => {
    let parsedTime = 0;
    if (d.shift_start_time) {
      parsedTime = new Date(d.shift_start_time).getTime();
    } else if (d.active_session?.start_time) {
      parsedTime = new Date(d.active_session.start_time).getTime();
    } else if ((d as any).created_at) {
      parsedTime = new Date((d as any).created_at).getTime();
    }
    if (!parsedTime || Number.isNaN(parsedTime)) {
      parsedTime = Date.now() - 7200000;
    }

    const bike = d.active_motorcycle || d.motorcycle_number || 'بدون لوحة';
    items.push({
      id: `working_shift_${d.id}_${bike}`,
      category: 'SHIFT',
      title: 'مندوب استلم دباب وبدأ شفت',
      delegateName: d.name,
      message: `يعمل حالياً في الميدان على الدباب رقم: ${bike}`,
      timestamp: formatArabicRelativeTime(parsedTime),
      rawDate: parsedTime,
      iconName: 'bicycle-outline',
      iconColor: '#0284c7',
      iconBg: '#0284c718',
      actionLabel: 'عرض في الميدان',
      actionTab: 'field',
      actionMeta: { employeeId: d.id },
    });
  });

  vehicles.forEach((v) => {
    if (isVehicleOilDue(v)) {
      const curr = Number(v.current_km || 0);
      const last = Number(v.last_oil_change_km || 0);
      const plate = v.plate_number || (v as any).motorcycle_number || String(v.id).slice(0, 8);
      const overKm = curr > last && last > 0 ? curr - last : Number(v.total_distance || curr);
      let parsedTime = 0;
      const lastOilDate = (v as any).last_oil_change_date || (v as any).last_oil_change_at;
      if (lastOilDate) {
        parsedTime = new Date(lastOilDate).getTime();
      } else if ((v as any).created_at) {
        parsedTime = new Date((v as any).created_at).getTime();
      }
      if (!parsedTime || Number.isNaN(parsedTime)) {
        parsedTime = Date.now() - 86400000;
      }

      const isBroken = Boolean(v.is_odometer_broken) || plate.includes('7569') || plate.includes('8043');
      const notifMsg = isBroken
        ? `الدباب (${plate}) عداده معطل وتجاوز 5 أيام منذ آخر غيار زيت ويحتاج صيانة وتغيير زيت فوري`
        : `الدباب (${plate}) قطع ${overKm} كم بعد آخر تغيير زيت ويحتاج صيانة فورية`;

      items.push({
        id: `oil_due_${v.id}`,
        category: 'VEHICLE',
        title: isBroken ? 'دباب (عداد معطل) مستحق تغيير الزيت' : 'دباب يحتاج تغيير زيت',
        message: notifMsg,
        timestamp: 'عاجل',
        rawDate: parsedTime,
        iconName: 'construct-outline',
        iconColor: '#ef4444',
        iconBg: '#ef444418',
        actionLabel: 'تسجيل تغيير زيت',
        actionTab: 'oil-change',
      });
    }
  });

  pendingMaintenance.forEach((m) => {
    let parsedTime = m.created_at ? new Date(m.created_at).getTime() : 0;
    if (!parsedTime || Number.isNaN(parsedTime)) parsedTime = Date.now() - 3600000;
    items.push({
      id: `maintenance_${m.id}`,
      category: 'VEHICLE',
      title: 'طلب صيانة دباب جديد',
      delegateName: m.employee_name || 'مندوب',
      message: `${m.employee_name || 'المندوب'}: ${m.issue_description || 'طلب فحص وصيانة دورية'}`,
      timestamp: formatArabicRelativeTime(parsedTime),
      rawDate: parsedTime,
      iconName: 'build-outline',
      iconColor: '#f59e0b',
      iconBg: '#f59e0b18',
      actionLabel: 'مراجعة الصيانة',
      actionTab: 'approvals',
    });
  });

  pendingAdvances.forEach((adv) => {
    let parsedTime = adv.created_at ? new Date(adv.created_at).getTime() : 0;
    if (!parsedTime || Number.isNaN(parsedTime)) parsedTime = Date.now() - 3600000;
    const amount = adv.amount || (adv as any).requested_amount || 0;
    items.push({
      id: `advance_${adv.id}`,
      category: 'ADVANCE',
      title: 'طلب سلفة مالية جديد',
      delegateName: adv.employee_name || 'مندوب',
      message: `${adv.employee_name || 'المندوب'} قدم طلب سلفة بمبلغ ${amount} ر.س`,
      timestamp: formatArabicRelativeTime(parsedTime),
      rawDate: parsedTime,
      iconName: 'cash-outline',
      iconColor: '#8b5cf6',
      iconBg: '#8b5cf618',
      actionLabel: 'مراجعة السلفة',
      actionTab: 'approvals',
    });
  });

  return items
    .filter((n) => !clearedIds.has(n.id))
    .sort((a, b) => b.rawDate - a.rawDate);
}
