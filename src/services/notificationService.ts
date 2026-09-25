import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { apiRequest } from './api';

export interface BroadcastNotificationItem {
  id: string;
  title: string;
  body: string;
  image_url?: string;
  target: string;
  branch_id?: string;
  branch_name?: string;
  created_by: string;
  sent_count: number;
  has_poll: boolean;
  poll_question?: string;
  agree_count: number;
  disagree_count: number;
  created_at: string;
  is_read: boolean;
  user_vote?: 'AGREE' | 'DISAGREE';
}

// Configure notification presentation behavior in the phone
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.log('[NotificationService] setNotificationHandler notice:', e);
}

// Track IDs already displayed in the system notification shade to prevent duplicates
const shownInTrayIds = new Set<string>();

export const notificationService = {
  /**
   * Initializes notification channel and requests system permissions for status bar notifications
   */
  initNotifications: async (employeeId?: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('aams_broadcasts', {
          name: 'إشعارات وتعاميم الإدارة',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#f97316',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('[NotificationService] Permission not granted for notifications');
        return null;
      }

      // Get Expo Push Token if on a physical device
      let pushToken = '';
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: '352e8773-7aaa-4a12-b906-01fe05420113',
        });
        pushToken = tokenData.data;
      } catch (tokenErr) {
        console.log('[NotificationService] Push token notice:', tokenErr);
      }

      // Register push token with backend
      if (pushToken && employeeId) {
        await apiRequest(`/employees/me/push-token?employee_id=${employeeId}`, {
          method: 'POST',
          body: JSON.stringify({
            push_token: pushToken,
            device_uuid: Device.modelName || 'mobile',
          }),
          timeoutMs: 6000,
        }).catch(() => {});
      }

      return pushToken || null;
    } catch (e) {
      console.log('[NotificationService] initNotifications notice:', e);
      return null;
    }
  },

  /**
   * Fires a native system tray notification in the Android status bar / notification shade
   */
  showSystemTrayNotification: async (item: BroadcastNotificationItem): Promise<void> => {
    try {
      if (shownInTrayIds.has(item.id)) return;
      shownInTrayIds.add(item.id);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `📢 ${item.title}`,
          body: item.has_poll ? `${item.body}\n(استبيان: موافق / معترض)` : item.body,
          data: { broadcastId: item.id },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          channelId: 'aams_broadcasts',
        },
      });
    } catch (e) {
      console.log('[NotificationService] showSystemTrayNotification notice:', e);
    }
  },

  getUnreadBroadcasts: async (employeeId: string): Promise<BroadcastNotificationItem[]> => {
    if (!employeeId) return [];
    try {
      const res = await apiRequest<{ data: BroadcastNotificationItem[]; unread_count: number }>(
        `/notifications/employee/unread?employee_id=${employeeId}`,
        { timeoutMs: 7000 }
      );
      const items = res?.data || [];

      // Fire in system notification bar for any incoming unread broadcast!
      for (const item of items) {
        notificationService.showSystemTrayNotification(item);
      }

      return items;
    } catch (e) {
      return [];
    }
  },

  getAllBroadcasts: async (employeeId: string): Promise<BroadcastNotificationItem[]> => {
    if (!employeeId) return [];
    try {
      const res = await apiRequest<{ data: BroadcastNotificationItem[] }>(
        `/notifications/employee/broadcasts?employee_id=${employeeId}`,
        { timeoutMs: 7000 }
      );
      return res?.data || [];
    } catch (e) {
      return [];
    }
  },

  markAsRead: async (broadcastId: string, employeeId: string): Promise<boolean> => {
    try {
      await apiRequest(`/notifications/employee/read/${broadcastId}?employee_id=${employeeId}`, {
        method: 'POST',
        timeoutMs: 6000,
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  submitVote: async (
    broadcastId: string,
    employeeId: string,
    response: 'AGREE' | 'DISAGREE',
    reason?: string
  ): Promise<boolean> => {
    try {
      await apiRequest(`/notifications/employee/vote/${broadcastId}?employee_id=${employeeId}`, {
        method: 'POST',
        body: JSON.stringify({ response, reason: reason || '' }),
        timeoutMs: 8000,
      });
      return true;
    } catch (e) {
      return false;
    }
  },
};
