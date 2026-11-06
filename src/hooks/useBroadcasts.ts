import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService, BroadcastNotificationItem } from '../services/notificationService';
import { EmployeeProfile } from '../types/delegate';
import { workApi } from '../services/work';

export function useBroadcasts(employee: EmployeeProfile | null) {
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastNotificationItem | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showBroadcastHistory, setShowBroadcastHistory] = useState(false);
  const [allBroadcasts, setAllBroadcasts] = useState<BroadcastNotificationItem[]>([]);
  const [unreadBroadcastsCount, setUnreadBroadcastsCount] = useState(0);
  const [loadingBroadcastHistory, setLoadingBroadcastHistory] = useState(false);
  const lastDismissedBroadcastId = useRef<string | null>(null);

  // Helper to fetch dynamic oil change status notification for the delegate's motorcycle
  const fetchOilNotification = useCallback(async (): Promise<BroadcastNotificationItem | null> => {
    if (!employee?.id) return null;
    const bike = employee.motorcycle_number;
    if (!bike) return null;

    try {
      const oilData = await workApi.getLastKM(employee.id, bike);
      if (!oilData) return null;

      const isBroken = Boolean(oilData.is_odometer_broken) || bike.includes('7569') || bike.includes('8043');
      const needsOil = Boolean(oilData.needs_oil_change);
      const remainingDays = typeof oilData.remaining_days === 'number' ? oilData.remaining_days : 0;
      const remainingKm = typeof oilData.remaining_oil_km === 'number' ? Math.round(oilData.remaining_oil_km) : 0;

      let title = 'تنبيه موعد تغيير الزيت';
      let body = '';
      let isLastDayOrDue = false;

      if (isBroken) {
        if (needsOil || remainingDays <= 1) {
          isLastDayOrDue = true;
          title = 'اليوم موعد تغيير الزيت للدباب';
          body = `تنبيه عاجل: اليوم هو موعد تغيير زيت الدباب الخاص بك (${bike}) بعد إتمام دورة 5 أيام. يرجى مراجعة المشرف لصرف الزيت وتغييره فوراً.`;
        } else {
          title = 'تنبيه غيار زيت الدباب';
          body = `دبابك (${bike}): فاضل ${remainingDays} أيام لتغيير الزيت (دورية كل 5 أيام).`;
        }
      } else {
        if (needsOil || remainingKm <= 0) {
          isLastDayOrDue = true;
          title = 'اليوم موعد تغيير الزيت للدباب';
          body = `تنبيه عاجل: تم الوصول لحد غيار الزيت للدباب (${bike}). اليوم يجب تغيير الزيت لدى مشرف الفرع.`;
        } else {
          title = 'متابعة غيار زيت الدباب';
          body = `دبابك (${bike}): فاضل ${remainingKm.toLocaleString('en-US')} كم لتغيير الزيت.`;
        }
      }

      return {
        id: `oil_notif_${bike}_${isLastDayOrDue ? 'due' : 'upcoming'}`,
        title,
        body,
        title_ar: title,
        body_ar: body,
        target: 'DRIVER',
        created_by: 'النظام الإشرافي',
        sent_count: 1,
        has_poll: isLastDayOrDue,
        poll_question: isLastDayOrDue ? 'هل راجعت المشرف لتغيير زيت الدباب اليوم؟' : undefined,
        poll_question_ar: isLastDayOrDue ? 'هل راجعت المشرف لتغيير زيت الدباب اليوم؟' : undefined,
        agree_count: 0,
        disagree_count: 0,
        created_at: new Date().toISOString(),
        is_read: false,
      };
    } catch {
      return null;
    }
  }, [employee?.id, employee?.motorcycle_number]);

  const checkUnreadBroadcasts = useCallback(async () => {
    if (!employee?.id) return;
    try {
      const unread = await notificationService.getUnreadBroadcasts(employee.id);
      const oilNotif = await fetchOilNotification();
      
      let dismissedIds: string[] = [];
      try {
        const raw = await AsyncStorage.getItem('@aams_dismissed_broadcasts');
        if (raw) dismissedIds = JSON.parse(raw);
      } catch {}

      // If oil notification is due today / last day, show it as an interactive modal/approval
      if (oilNotif && oilNotif.has_poll && !dismissedIds.includes(oilNotif.id) && oilNotif.id !== lastDismissedBroadcastId.current) {
        setActiveBroadcast(oilNotif);
        setShowBroadcastModal(true);
      }

      const totalUnread = unread.length + (oilNotif ? 1 : 0);
      setUnreadBroadcastsCount(totalUnread);

      if (unread.length > 0 && !showBroadcastModal) {
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
  }, [employee?.id, fetchOilNotification, showBroadcastModal]);

  useEffect(() => {
    if (employee?.id) {
      notificationService.initNotifications(employee.id);
      let isMounted = true;
      let timer;
      const schedulePoll = () => {
        if (!isMounted) return;
        const nextDelay = 35000 + Math.floor(Math.random() * 20000);
        timer = setTimeout(async () => {
          if (!isMounted) return;
          await checkUnreadBroadcasts();
          schedulePoll();
        }, nextDelay);
      };
      const initialDelay = 1500 + Math.floor(Math.random() * 3000);
      timer = setTimeout(async () => {
        if (!isMounted) return;
        await checkUnreadBroadcasts();
        schedulePoll();
      }, initialDelay);
      return () => {
        isMounted = false;
        if (timer) clearTimeout(timer);
      };
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
      const oilNotif = await fetchOilNotification();
      const combined = oilNotif ? [oilNotif, ...list] : list;
      setAllBroadcasts(combined);
      const unread = combined.filter((b) => !b.is_read).length;
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
      const oilNotif = await fetchOilNotification();
      const combined = oilNotif ? [oilNotif, ...list] : list;
      setAllBroadcasts(combined);
      const unread = combined.filter((b) => !b.is_read).length;
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
