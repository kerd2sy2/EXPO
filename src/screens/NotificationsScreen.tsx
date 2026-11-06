import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import {
  ThemeColors,
  WorkSession,
  TabType,
} from '../types/delegate';
import {
  DelegateWithStatus,
  PendingMaintenanceRequest,
  PendingAdvanceRequest,
} from '../services/supervisor';
import { VehicleItem, isVehicleOilDue } from '../services/operations';

const READ_NOTIFS_KEY = '@eshraf_read_notifications_v1';

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

export interface NotificationsScreenProps {
  pendingSessions: WorkSession[];
  workingDelegates: DelegateWithStatus[];
  vehicles: VehicleItem[];
  pendingMaintenance: PendingMaintenanceRequest[];
  pendingAdvances: PendingAdvanceRequest[];
  onNavigateToTab: (tab: TabType, meta?: { sessionId?: string; employeeId?: string }) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onRefresh?: () => void;
  loading?: boolean;
  onReadStatusChange?: (readIds: string[]) => void;
}

type FilterCategory = 'ALL' | 'SHIFT' | 'VEHICLE' | 'ADVANCE';

// Helper for Arabic relative time formatting
const formatArabicRelativeTime = (timestampMs: number): string => {
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
};

export const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  pendingSessions,
  workingDelegates,
  vehicles,
  pendingMaintenance,
  pendingAdvances,
  onNavigateToTab,
  colors,
  isDarkMode,
  isRTL,
  onRefresh,
  loading = false,
  onReadStatusChange,
}) => {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Load read notifications from storage
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(READ_NOTIFS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const setObj = new Set<string>(parsed);
            setReadIds(setObj);
            onReadStatusChange?.(parsed);
          }
        }
      } catch (err) {
        console.log('[NotificationsScreen] Error loading read notifs:', err);
      }
    })();
  }, [onReadStatusChange]);

  const saveReadIds = async (updated: Set<string>) => {
    setReadIds(updated);
    const arr = Array.from(updated);
    try {
      await AsyncStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(arr));
      onReadStatusChange?.(arr);
    } catch {}
  };

  // Synthesize live operational notifications feed from branch streams
  const notificationsList = useMemo<NotificationItem[]>(() => {
    const items: NotificationItem[] = [];

    // 1. Shift End Notifications (from pending unreviewed sessions)
    pendingSessions.forEach((s) => {
      const parsedTime = s.end_time ? new Date(s.end_time).getTime() : Date.now();
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

    // 2. Shift Start / Active Delegates in Field (Bike Assignment)
    workingDelegates.forEach((d) => {
      const parsedTime = d.shift_start_time ? new Date(d.shift_start_time).getTime() : Date.now();
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

    // 3. Vehicles Due For Oil Change
    vehicles.forEach((v) => {
      if (isVehicleOilDue(v)) {
        const curr = Number(v.current_km || 0);
        const last = Number(v.last_oil_change_km || 0);
        const plate = v.plate_number || (v as any).motorcycle_number || String(v.id).slice(0, 8);
        const overKm = curr > last && last > 0 ? curr - last : Number(v.total_distance || curr);
        items.push({
          id: `oil_due_${v.id}`,
          category: 'VEHICLE',
          title: 'دباب يحتاج تغيير زيت',
          message: `الدباب (${plate}) قطع ${overKm} كم بعد آخر تغيير زيت ويحتاج صيانة فورية`,
          timestamp: 'عاجل',
          rawDate: Date.now() + 5000,
          iconName: 'construct-outline',
          iconColor: '#ef4444',
          iconBg: '#ef444418',
          actionLabel: 'تسجيل تغيير زيت',
          actionTab: 'oil-change',
        });
      }
    });

    // 4. Pending Bike Maintenance Requests
    pendingMaintenance.forEach((m) => {
      const parsedTime = m.created_at ? new Date(m.created_at).getTime() : Date.now();
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

    // 5. Advance & Investigation Requests
    pendingAdvances.forEach((adv) => {
      const parsedTime = adv.created_at ? new Date(adv.created_at).getTime() : Date.now();
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

    return items.sort((a, b) => b.rawDate - a.rawDate);
  }, [pendingSessions, workingDelegates, vehicles, pendingMaintenance, pendingAdvances]);

  const handleMarkAllAsRead = useCallback(async () => {
    const allIds = new Set(readIds);
    notificationsList.forEach((n) => allIds.add(n.id));
    await saveReadIds(allIds);
  }, [readIds, notificationsList]);

  const handleNotificationPress = useCallback(
    async (item: NotificationItem) => {
      if (!readIds.has(item.id)) {
        const next = new Set(readIds);
        next.add(item.id);
        await saveReadIds(next);
      }
      onNavigateToTab(item.actionTab, item.actionMeta);
    },
    [readIds, onNavigateToTab]
  );

  const unreadCount = useMemo(() => {
    return notificationsList.filter((n) => !readIds.has(n.id)).length;
  }, [notificationsList, readIds]);

  const renderItem = useCallback(
    ({ item }: { item: NotificationItem }) => {
      const isRead = readIds.has(item.id);

      return (
        <TouchableOpacity
          style={[
            styles.notificationCard,
            {
              backgroundColor: colors.card,
              borderColor: isRead ? colors.border : item.iconColor + '50',
              borderStartWidth: isRead ? 1 : 4,
              borderStartColor: isRead ? colors.border : item.iconColor,
            },
          ]}
          onPress={() => handleNotificationPress(item)}
          activeOpacity={0.8}
        >
          <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.iconName} size={20} color={item.iconColor} />
            </View>

            <View style={[styles.titleCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.titleBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  {item.title}
                </Text>
                {!isRead && <View style={[styles.unreadDot, { backgroundColor: item.iconColor }]} />}
              </View>

              {item.delegateName && (
                <Text style={[styles.delegateName, { color: colors.primary }]}>
                  {item.delegateName}
                </Text>
              )}
            </View>

            <Text style={[styles.timeAgoText, { color: colors.textSecondary }]}>
              {item.timestamp}
            </Text>
          </View>

          <Text
            style={[
              styles.cardMessage,
              { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {item.message}
          </Text>

          <View style={[styles.cardFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                  borderColor: colors.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>
                {item.actionLabel}
              </Text>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={14}
                color={colors.textSecondary}
              />
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, isDarkMode, isRTL, readIds, handleNotificationPress]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Clean Modern Top Header with Action Button */}
      <View style={[styles.topControlArea, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={[styles.markReadRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.notifTitleGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.notifPageTitle, { color: colors.textPrimary }]}>التنبيهات الميدانية</Text>
            <Text style={[styles.unreadSummaryText, { color: unreadCount > 0 ? '#ef4444' : colors.textSecondary }]}>
              {unreadCount > 0 ? `${unreadCount} تنبيهات غير مقروءة` : 'جميع التنبيهات مقروءة'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.markReadHeaderBtn,
              {
                backgroundColor: unreadCount > 0 ? colors.primary : (isDarkMode ? '#334155' : '#e2e8f0'),
                flexDirection: isRTL ? 'row-reverse' : 'row',
                opacity: unreadCount > 0 ? 1 : 0.65,
              },
            ]}
            disabled={unreadCount === 0}
            onPress={handleMarkAllAsRead}
            activeOpacity={0.8}
          >
            <Ionicons
              name="checkmark-done-circle"
              size={18}
              color={unreadCount > 0 ? '#ffffff' : colors.textSecondary}
            />
            <Text
              style={[
                styles.markReadHeaderBtnText,
                { color: unreadCount > 0 ? '#ffffff' : colors.textSecondary },
              ]}
            >
              قراءة الكل
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications List */}
      <FlatList
        data={notificationsList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.emptyStateBox}>
            <View style={[styles.emptyIconCircle, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
              <Ionicons name="notifications-off-outline" size={38} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              لا توجد تنبيهات جديدة
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              تظهر هنا تحديثات انتهاء الشفتات، استلام وتغيير الدبابات، وطلبات الصيانة فور ورودها في الميدان.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControlArea: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    marginBottom: 8,
  },
  markReadRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notifTitleGroup: {
    gap: 3,
  },
  notifPageTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  unreadSummaryText: {
    fontSize: 12,
    fontWeight: '700',
  },
  markReadHeaderBtn: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  markReadHeaderBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 4,
    gap: 12,
  },
  notificationCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeaderRow: {
    alignItems: 'flex-start',
    gap: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  titleBadgeRow: {
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  delegateName: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeAgoText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardMessage: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  cardFooterRow: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
    gap: 12,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
});
