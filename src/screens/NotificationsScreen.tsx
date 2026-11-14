import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, WorkSession, TabType } from '../types/delegate';
import {
  DelegateWithStatus,
  PendingMaintenanceRequest,
  PendingAdvanceRequest,
} from '../services/supervisor';
import { VehicleItem } from '../services/operations';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import {
  READ_NOTIFS_KEY,
  CLEARED_NOTIFS_KEY,
  NotificationItem,
  synthesizeNotifications,
} from './notifications/notificationsHelpers';
import { notificationsStyles as styles } from './notifications/notificationsStyles';
import { NotificationCard } from './notifications/NotificationCard';
import { ClearNotificationsModal } from './notifications/ClearNotificationsModal';

export type { NotificationItem };

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

export const NotificationsScreen: React.FC<NotificationsScreenProps> = React.memo(({
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

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(READ_NOTIFS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setReadIds(new Set<string>(parsed));
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

  const saveReadIds = useCallback(
    async (updated: Set<string>) => {
      setReadIds(updated);
      const arr = Array.from(updated);
      try {
        await AsyncStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(arr));
        onReadStatusChange?.(arr);
      } catch {}
    },
    [onReadStatusChange]
  );

  const notificationsList = useMemo<NotificationItem[]>(
    () =>
      synthesizeNotifications({
        pendingSessions,
        workingDelegates,
        vehicles,
        pendingMaintenance,
        pendingAdvances,
        clearedIds,
      }),
    [pendingSessions, workingDelegates, vehicles, pendingMaintenance, pendingAdvances, clearedIds]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    const allIds = new Set(readIds);
    notificationsList.forEach((n) => allIds.add(n.id));
    await saveReadIds(allIds);
  }, [readIds, notificationsList, saveReadIds]);

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
  }, [clearedIds, notificationsList, readIds, saveReadIds]);

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
    [readIds, onNavigateToTab, saveReadIds]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ModuleErrorBoundary moduleName="سجل التنبيهات" colors={colors} onReset={onRefresh}>
        <FlatList
          data={notificationsList}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ModuleErrorBoundary moduleName={`تنبيه ${item.title}`} colors={colors}>
              <NotificationCard
                item={item}
                isRead={readIds.has(item.id)}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                onPress={handleNotificationPress}
              />
            </ModuleErrorBoundary>
          )}
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
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' },
                ]}
              >
                <Ionicons name="notifications-off-outline" size={38} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                لا توجد تنبيهات
              </Text>
            </View>
          }
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary
        moduleName="نافذة تنظيف التنبيهات"
        colors={colors}
        onReset={() => setShowClearModal(false)}
      >
        <ClearNotificationsModal
          visible={showClearModal}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onConfirmClear={handleClearAllNotifications}
          onClose={() => setShowClearModal(false)}
        />
      </ModuleErrorBoundary>
    </View>
  );
});
