import { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { workApi } from '../services/work';
import { getCachedUser } from '../services/api';
import { notificationService, BroadcastNotificationItem } from '../services/notificationService';
import { EmployeeProfile, WorkSession, TabType } from '../types/delegate';

interface UsePushNotificationsProps {
  employee: EmployeeProfile | null;
  setCurrentTab: (tab: TabType) => void;
  mainScrollRef: React.RefObject<ScrollView | null>;
  setHistorySessions: React.Dispatch<React.SetStateAction<WorkSession[]>>;
  setSelectedHistorySession: (session: WorkSession | null) => void;
  setLoadingHistory: (loading: boolean) => void;
  setActiveBroadcast: (broadcast: BroadcastNotificationItem | null) => void;
  setShowBroadcastModal: (show: boolean) => void;
}

export function usePushNotifications({
  employee,
  setCurrentTab,
  mainScrollRef,
  setHistorySessions,
  setSelectedHistorySession,
  setLoadingHistory,
  setActiveBroadcast,
  setShowBroadcastModal,
}: UsePushNotificationsProps) {
  const handledNotifIdentifierRef = useRef<string | null>(null);

  useEffect(() => {
    const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
      try {
        const notifId =
          response?.notification?.request?.identifier ||
          (response?.notification?.request?.content?.data as any)?.sessionId ||
          (response?.notification?.request?.content?.data as any)?.broadcastId ||
          'default_notif';

        if (handledNotifIdentifierRef.current === notifId) {
          return;
        }
        handledNotifIdentifierRef.current = notifId;

        const data = (response?.notification?.request?.content?.data || {}) as any;
        const title = response?.notification?.request?.content?.title || '';
        const body = response?.notification?.request?.content?.body || '';

        // 1. Shift Approval Notification
        const isShiftApproval =
          data?.type === 'SESSION_APPROVED' ||
          data?.type === 'SHIFT_APPROVED' ||
          data?.type === 'WORK_REVIEWED' ||
          data?.sessionId ||
          data?.session_id ||
          title.includes('المصادقة') ||
          title.includes('Approved') ||
          title.includes('অনুমোদিত') ||
          body.includes('المشرف على طلباتك');

        if (isShiftApproval) {
          setCurrentTab('history');
          mainScrollRef.current?.scrollTo({ y: 0, animated: false });

          const sid = data?.sessionId || data?.session_id || '';
          let empId = employee?.id;
          if (!empId) {
            const cached = await getCachedUser();
            empId = cached?.id;
          }

          // Apply cached history sessions immediately
          try {
            const rawCached = await AsyncStorage.getItem('@aams_cached_history_sessions');
            if (rawCached) {
              const list: WorkSession[] = JSON.parse(rawCached);
              if (Array.isArray(list) && list.length > 0) {
                setHistorySessions(list);
                setLoadingHistory(false);
                const match = sid ? list.find((s) => s.id === sid) : null;
                const target = match || list.find((s) => s.is_reviewed) || list[0];
                if (target) {
                  setSelectedHistorySession(target);
                }
              }
            }
          } catch {}

          // Fetch fresh sessions in background
          if (empId) {
            try {
              const fresh = await workApi.getMySessions(empId);
              if (Array.isArray(fresh) && fresh.length > 0) {
                setHistorySessions(fresh as WorkSession[]);
                AsyncStorage.setItem('@aams_cached_history_sessions', JSON.stringify(fresh)).catch(() => {});
                setLoadingHistory(false);
                const match = sid ? fresh.find((s) => s.id === sid) : null;
                const target = match || fresh.find((s) => s.is_reviewed) || fresh[0];
                if (target) {
                  setSelectedHistorySession(target);
                }
                return;
              }
            } catch (e) {
              console.log('[usePushNotifications] Error fetching fresh sessions:', e);
            }
          }
          return;
        }

        // 2. Broadcast / Poll Notification
        const bId = data?.broadcastId || data?.broadcast_id;
        if (bId) {
          let empId = employee?.id;
          if (!empId) {
            const cached = await getCachedUser();
            empId = cached?.id;
          }
          if (empId) {
            notificationService.getAllBroadcasts(empId).then((list) => {
              const found = list.find((b) => b.id === bId);
              if (found) {
                setActiveBroadcast(found);
                setShowBroadcastModal(true);
              }
            });
          }
        }
      } catch (err) {
        console.log('[usePushNotifications] Error handling notification response:', err);
      }
    };

    // Cold start response check
    Notifications.getLastNotificationResponseAsync()
      .then((res) => {
        if (res) handleNotificationResponse(res);
      })
      .catch((e) => {
        console.log('[usePushNotifications] Safe catch on getLastNotificationResponseAsync:', e);
      });

    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    return () => subscription.remove();
  }, [employee?.id]);
}
