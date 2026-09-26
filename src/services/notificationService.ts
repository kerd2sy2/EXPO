import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { apiRequest } from './api';

export interface BroadcastNotificationItem {
  id: string;
  title: string;
  body: string;
  title_ar?: string;
  title_en?: string;
  title_bn?: string;
  body_ar?: string;
  body_en?: string;
  body_bn?: string;
  image_url?: string;
  target: string;
  branch_id?: string;
  branch_name?: string;
  created_by: string;
  sent_count: number;
  has_poll: boolean;
  poll_question?: string;
  poll_question_ar?: string;
  poll_question_en?: string;
  poll_question_bn?: string;
  agree_count: number;
  disagree_count: number;
  created_at: string;
  is_read: boolean;
  user_vote?: 'AGREE' | 'DISAGREE';
}

/**
 * Returns localized title, body, and poll_question based on the employee's chosen app language
 */
export function getLocalizedBroadcast(item: BroadcastNotificationItem, lang: string = 'ar') {
  let title = item.title;
  let body = item.body;
  let poll_question = item.poll_question;

  if (lang === 'en') {
    title = item.title_en?.trim() || item.title_ar?.trim() || item.title;
    body = item.body_en?.trim() || item.body_ar?.trim() || item.body;
    poll_question = item.poll_question_en?.trim() || item.poll_question_ar?.trim() || item.poll_question;
  } else if (lang === 'bn') {
    title = item.title_bn?.trim() || item.title_ar?.trim() || item.title;
    body = item.body_bn?.trim() || item.body_ar?.trim() || item.body;
    poll_question = item.poll_question_bn?.trim() || item.poll_question_ar?.trim() || item.poll_question;
  } else {
    // Arabic (default)
    title = item.title_ar?.trim() || item.title;
    body = item.body_ar?.trim() || item.body;
    poll_question = item.poll_question_ar?.trim() || item.poll_question;
  }

  return { title, body, poll_question };
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
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#f97316',
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
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

      // Prefer Native FCM device token on Android for native BigPicture banner & lockscreen display
      let pushToken = '';
      if (Platform.OS === 'android') {
        try {
          const deviceData = await Notifications.getDevicePushTokenAsync();
          if (deviceData?.data) {
            pushToken = typeof deviceData.data === 'string' ? deviceData.data : (deviceData.data as any).token || '';
          }
        } catch (devErr) {
          console.log('[NotificationService] Android native FCM device token notice:', devErr);
        }
      }

      // Fallback to Expo Push Token if native device token is not available
      if (!pushToken) {
        try {
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId: '352e8773-7aaa-4a12-b906-01fe05420113',
          });
          if (tokenData?.data) {
            pushToken = tokenData.data;
          }
        } catch (tokenErr) {
          console.log('[NotificationService] Expo Push token notice:', tokenErr);
        }
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

      const content: Notifications.NotificationContentInput = {
        title: item.title,
        body: item.has_poll ? `${item.body}\n(استبيان: موافق / معترض)` : item.body,
        data: { broadcastId: item.id, image_url: item.image_url },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };

      if (item.image_url) {
        let fullImgUrl = item.image_url.trim();
        if (!fullImgUrl.startsWith('http://') && !fullImgUrl.startsWith('https://')) {
          const clean = fullImgUrl.replace(/^\/+/, '');
          fullImgUrl = `https://api.kerd2sy.com/${clean}`;
        }
        (content as any).attachments = [{ url: fullImgUrl }];
      }

      await Notifications.scheduleNotificationAsync({
        content,
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
      return res?.data || [];
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
