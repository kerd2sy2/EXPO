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

export const notificationService = {
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
