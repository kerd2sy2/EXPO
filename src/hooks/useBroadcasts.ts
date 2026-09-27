import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService, BroadcastNotificationItem } from '../services/notificationService';
import { EmployeeProfile } from '../types/delegate';

export function useBroadcasts(employee: EmployeeProfile | null) {
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastNotificationItem | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showBroadcastHistory, setShowBroadcastHistory] = useState(false);
  const [allBroadcasts, setAllBroadcasts] = useState<BroadcastNotificationItem[]>([]);
  const [unreadBroadcastsCount, setUnreadBroadcastsCount] = useState(0);
  const [loadingBroadcastHistory, setLoadingBroadcastHistory] = useState(false);
  const lastDismissedBroadcastId = useRef<string | null>(null);

  const checkUnreadBroadcasts = useCallback(async () => {
    if (!employee?.id) return;
    try {
      const unread = await notificationService.getUnreadBroadcasts(employee.id);
      setUnreadBroadcastsCount(unread.length);
      if (unread.length > 0) {
        let dismissedIds: string[] = [];
        try {
          const raw = await AsyncStorage.getItem('@aams_dismissed_broadcasts');
          if (raw) dismissedIds = JSON.parse(raw);
        } catch {}

        const pendingPoll = unread.find(
          (b) =>
            b.has_poll &&
            !b.user_vote &&
            b.id !== lastDismissedBroadcastId.current &&
            !dismissedIds.includes(b.id)
        );
        if (pendingPoll) {
          setActiveBroadcast(pendingPoll);
          setShowBroadcastModal(true);
        }
      }
    } catch (e) {
      console.log('[useBroadcasts] Error checking broadcasts:', e);
    }
  }, [employee?.id]);

  useEffect(() => {
    if (employee?.id) {
      notificationService.initNotifications(employee.id);
      checkUnreadBroadcasts();
      const interval = setInterval(checkUnreadBroadcasts, 35000);
      return () => clearInterval(interval);
    }
  }, [employee?.id, checkUnreadBroadcasts]);

  const handleVoteBroadcast = async (broadcastId: string, response: 'AGREE' | 'DISAGREE') => {
    if (!employee?.id) return;
    const ok = await notificationService.submitVote(broadcastId, employee.id, response);
    if (ok) {
      lastDismissedBroadcastId.current = broadcastId;
      try {
        const raw = await AsyncStorage.getItem('@aams_dismissed_broadcasts');
        const list: string[] = raw ? JSON.parse(raw) : [];
        if (!list.includes(broadcastId)) {
          list.push(broadcastId);
          await AsyncStorage.setItem('@aams_dismissed_broadcasts', JSON.stringify(list));
        }
      } catch {}
      setShowBroadcastModal(false);
      setActiveBroadcast(null);
      setUnreadBroadcastsCount((prev) => Math.max(0, prev - 1));
      Alert.alert(
        'تم تسجيل صوتك بنجاح',
        `شكراً لمشاركتك برأيك (${response === 'AGREE' ? 'موافق' : 'معترض'})`
      );
    } else {
      Alert.alert('تنبيه', 'تعذر تسجيل التصويت، يرجى التحقق من الاتصال بالإنترنت');
    }
  };

  const handleCloseBroadcast = async () => {
    if (activeBroadcast && employee?.id) {
      lastDismissedBroadcastId.current = activeBroadcast.id;
      try {
        const raw = await AsyncStorage.getItem('@aams_dismissed_broadcasts');
        const list: string[] = raw ? JSON.parse(raw) : [];
        if (!list.includes(activeBroadcast.id)) {
          list.push(activeBroadcast.id);
          await AsyncStorage.setItem('@aams_dismissed_broadcasts', JSON.stringify(list));
        }
      } catch {}
      await notificationService.markAsRead(activeBroadcast.id, employee.id);
      setUnreadBroadcastsCount((prev) => Math.max(0, prev - 1));
    }
    setShowBroadcastModal(false);
    setActiveBroadcast(null);
  };

  const handleOpenNotificationsHistory = async () => {
    if (!employee?.id) return;
    setShowBroadcastHistory(true);
    setLoadingBroadcastHistory(true);
    try {
      const list = await notificationService.getAllBroadcasts(employee.id);
      setAllBroadcasts(list);
      const unread = list.filter((b) => !b.is_read).length;
      setUnreadBroadcastsCount(unread);
    } catch (e) {
      console.log('[useBroadcasts] Error opening history:', e);
    } finally {
      setLoadingBroadcastHistory(false);
    }
  };

  const handleRefreshNotificationsHistory = async () => {
    if (!employee?.id) return;
    try {
      const list = await notificationService.getAllBroadcasts(employee.id);
      setAllBroadcasts(list);
      const unread = list.filter((b) => !b.is_read).length;
      setUnreadBroadcastsCount(unread);
    } catch (e) {
      console.log('[useBroadcasts] Error refreshing history:', e);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!employee?.id) return;
    try {
      await notificationService.markAllAsRead(employee.id);
      setAllBroadcasts((prev) => prev.map((b) => ({ ...b, is_read: true })));
      setUnreadBroadcastsCount(0);
    } catch (e) {
      console.log('[useBroadcasts] Error marking all as read:', e);
    }
  };

  return {
    activeBroadcast,
    setActiveBroadcast,
    showBroadcastModal,
    setShowBroadcastModal,
    showBroadcastHistory,
    setShowBroadcastHistory,
    allBroadcasts,
    unreadBroadcastsCount,
    loadingBroadcastHistory,
    checkUnreadBroadcasts,
    handleVoteBroadcast,
    handleCloseBroadcast,
    handleOpenNotificationsHistory,
    handleRefreshNotificationsHistory,
    handleMarkAllAsRead,
  };
}
