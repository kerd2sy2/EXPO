import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  Modal,
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
const CLEARED_NOTIFS_KEY = '@eshraf_cleared_notifications_v1';

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
  onRegisterHeaderActions?: (actions: { markAll: () => void; openClearModal: () => void }) => void;
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
  onRegisterHeaderActions,
}) => {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [clearedIds, setClearedIds] = useState<Set<string>>(new Set());
  const [showClearModal, setShowClearModal] = useState(false);

  // Load read notifications and cleared notifications from storage
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

      try {
        const clearedStored = await AsyncStorage.getItem(CLEARED_NOTIFS_KEY);
        if (clearedStored) {
          const parsedCleared = JSON.parse(clearedStored);
          if (Array.isArray(parsedCleared)) {
            setClearedIds(new Set<string>(parsedCleared));
          }
        }
      } catch (err) {
        console.log('[NotificationsScreen] Error loading cleared notifs:', err);
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

    // 2. Shift Start / Active Delegates in Field (Bike Assignment)
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

    // 3. Vehicles Due For Oil Change
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

    // 4. Pending Bike Maintenance Requests
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

    // 5. Advance & Investigation Requests
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

    // Filter out cleared notifications and sort newest first
    return items
      .filter((n) => !clearedIds.has(n.id))
      .sort((a, b) => b.rawDate - a.rawDate);
  }, [pendingSessions, workingDelegates, vehicles, pendingMaintenance, pendingAdvances, clearedIds]);

  const handleMarkAllAsRead = useCallback(async () => {
    const allIds = new Set(readIds);
    notificationsList.forEach((n) => allIds.add(n.id));
    await saveReadIds(allIds);
  }, [readIds, notificationsList]);

  const handleClearAllNotifications = useCallback(async () => {
    const updatedCleared = new Set(clearedIds);
    notificationsList.forEach((n) => updatedCleared.add(n.id));
    setClearedIds(updatedCleared);
    setShowClearModal(false);
    try {
      await AsyncStorage.setItem(CLEARED_NOTIFS_KEY, JSON.stringify(Array.from(updatedCleared)));
    } catch {}
    const allRead = new Set(readIds);
    notificationsList.forEach((n) => allRead.add(n.id));
    await saveReadIds(allRead);
  }, [clearedIds, notificationsList, readIds]);

  // Register header actions for single tap (mark read) and long press (clean/delete)
  useEffect(() => {
    if (onRegisterHeaderActions) {
      onRegisterHeaderActions({
        markAll: handleMarkAllAsRead,
        openClearModal: () => setShowClearModal(true),
      });
    }
  }, [onRegisterHeaderActions, handleMarkAllAsRead]);

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
      {/* Notifications List */}
      <FlatList
        data={notificationsList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          notificationsList.length === 0 && styles.listContentEmpty,
        ]}
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
              لا توجد تنبيهات
            </Text>
          </View>
        }
      />

      {/* Clear/Clean All Notifications Bottom Sheet Modal */}
      <Modal
        visible={showClearModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClearModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowClearModal(false)}
        >
          <View
            style={[
              styles.clearSheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.clearSheetHandle} />
            <View style={[styles.clearSheetIconCircle, { backgroundColor: '#ef444418' }]}>
              <Ionicons name="trash-outline" size={28} color="#ef4444" />
            </View>
            <Text style={[styles.clearSheetTitle, { color: colors.textPrimary }]}>
              حذف وتنظيف صفحة الإشعارات
            </Text>
            <Text style={[styles.clearSheetDesc, { color: colors.textSecondary }]}>
              هل تريد بالتأكيد تفريغ وحذف جميع التنبيهات المعروضة في صفحة الإشعارات؟
            </Text>

            <View style={[styles.clearSheetBtnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.clearSheetConfirmBtn, { backgroundColor: '#ef4444' }]}
                onPress={handleClearAllNotifications}
                activeOpacity={0.8}
              >
                <Ionicons name="trash" size={18} color="#ffffff" />
                <Text style={styles.clearSheetConfirmText}>تنظيف الكل</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.clearSheetCancelBtn, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9', borderColor: colors.border }]}
                onPress={() => setShowClearModal(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.clearSheetCancelText, { color: colors.textPrimary }]}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingTop: 8,
    gap: 12,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  clearSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  clearSheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#94a3b860',
    marginBottom: 8,
  },
  clearSheetIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  clearSheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  clearSheetDesc: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  clearSheetBtnRow: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  clearSheetConfirmBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  clearSheetConfirmText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  clearSheetCancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSheetCancelText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
