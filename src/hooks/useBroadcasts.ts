import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService, BroadcastNotificationItem } from '../services/notificationService';
import { EmployeeProfile, Language } from '../types/delegate';
import { workApi } from '../services/work';

export function useBroadcasts(
  employee: EmployeeProfile | null,
  lang: Language = 'ar',
  onOpenOilModal?: (bike: string) => void
) {
  const [activeBroadcast, setActiveBroadcast] = useState<BroadcastNotificationItem | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showBroadcastHistory, setShowBroadcastHistory] = useState(false);
  const [allBroadcasts, setAllBroadcasts] = useState<BroadcastNotificationItem[]>([]);
  const [unreadBroadcastsCount, setUnreadBroadcastsCount] = useState(0);
  const [loadingBroadcastHistory, setLoadingBroadcastHistory] = useState(false);
  const lastDismissedBroadcastId = useRef<string | null>(null);
  const oilAlertShownRef = useRef<boolean>(false);

  // Helper to fetch dynamic oil change status notification for the delegate's motorcycle
  const fetchOilNotification = useCallback(async (): Promise<{ notif: BroadcastNotificationItem; isDue: boolean } | null> => {
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

      let isLastDayOrDue = false;

      let titleAr = 'تنبيه غيار زيت الدباب';
      let bodyAr = '';
      let titleEn = 'Motorcycle Oil Reminder';
      let bodyEn = '';
      let titleUr = 'موٹر سائیکل کے تیل کی یاد دہانی';
      let bodyUr = '';
      let titleBn = 'মোটরসাইকেলের তেল অনুস্মারক';
      let bodyBn = '';

      if (isBroken) {
        if (needsOil || remainingDays <= 1) {
          isLastDayOrDue = true;
          titleAr = 'يجب تغيير زيت الآن';
          bodyAr = `يجب التوجه إلى المشرف لتغيير زيت الآن (الدباب: ${bike})`;
          titleEn = 'Oil Change Required Now';
          bodyEn = `Please go to the supervisor to change the oil now (Bike: ${bike})`;
          titleUr = 'ابھی تیل تبدیل کرنا ضروری ہے';
          bodyUr = `تیل تبدیل کرنے کے لیے ابھی سپروائزر کے پاس جائیں (موٹر سائیکل: ${bike})`;
          titleBn = 'এখন তেল পরিবর্তন করা প্রয়োজন';
          bodyBn = `এখন তেল পরিবর্তন করতে সুপারভাইজারের কাছে যান (বাইক: ${bike})`;
        } else {
          titleAr = 'متابعة غيار زيت الدباب';
          bodyAr = `دبابك (${bike}): فاضل ${remainingDays} أيام لتغيير الزيت (دورية كل 5 أيام).`;
          titleEn = 'Motorcycle Oil Tracking';
          bodyEn = `Bike (${bike}): ${remainingDays} days remaining for oil change.`;
          titleUr = 'تیل کی تبدیلی کی معلومات';
          bodyUr = `موٹر سائیکل (${bike}): تیل تبدیل کرنے میں ${remainingDays} دن باقی ہیں۔`;
          titleBn = 'তেল পরিবর্তনের তথ্য';
          bodyBn = `বাইক (${bike}): তেল পরিবর্তনের জন্য ${remainingDays} দিন বাকি।`;
        }
      } else {
        if (needsOil || remainingKm <= 0) {
          isLastDayOrDue = true;
          titleAr = 'يجب تغيير زيت الآن';
          bodyAr = `يجب التوجه إلى المشرف لتغيير زيت الآن (الدباب: ${bike})`;
          titleEn = 'Oil Change Required Now';
          bodyEn = `Please go to the supervisor to change the oil now (Bike: ${bike})`;
          titleUr = 'ابھی تیل تبدیل کرنا ضروری ہے';
          bodyUr = `تیل تبدیل کرنے کے لیے ابھی سپروائزر کے پاس جائیں (موٹر سائیکل: ${bike})`;
          titleBn = 'এখন তেল পরিবর্তন করা প্রয়োজন';
          bodyBn = `এখন তেল পরিবর্তন করতে সুপারভাইজারের কাছে যান (বাইক: ${bike})`;
        } else {
          titleAr = 'متابعة غيار زيت الدباب';
          bodyAr = `دبابك (${bike}): فاضل ${remainingKm.toLocaleString('en-US')} كم لتغيير الزيت.`;
          titleEn = 'Motorcycle Oil Tracking';
          bodyEn = `Bike (${bike}): ${remainingKm.toLocaleString('en-US')} KM remaining for oil change.`;
          titleUr = 'تیل کی تبدیلی کی معلومات';
          bodyUr = `موٹر سائیکل (${bike}): تیل تبدیل کرنے کے لیے ${remainingKm.toLocaleString('en-US')} کلومیٹر باقی ہیں۔`;
          titleBn = 'তেল পরিবর্তনের তথ্য';
          bodyBn = `বাইক (${bike}): তেল পরিবর্তনের জন্য ${remainingKm.toLocaleString('en-US')} কিমি বাকি।`;
        }
      }

      const activeTitle =
        lang === 'en' ? titleEn : lang === 'ur' ? titleUr : lang === 'bn' ? titleBn : titleAr;
      const activeBody =
        lang === 'en' ? bodyEn : lang === 'ur' ? bodyUr : lang === 'bn' ? bodyBn : bodyAr;

      const notifItem: BroadcastNotificationItem = {
        id: `oil_notif_${bike}_${isLastDayOrDue ? 'due' : 'upcoming'}`,
        title: activeTitle,
        body: activeBody,
        title_ar: titleAr,
        body_ar: bodyAr,
        title_en: titleEn,
        body_en: bodyEn,
        title_bn: titleBn,
        body_bn: bodyBn,
        target: 'DRIVER',
        created_by: 'النظام الإشرافي',
        sent_count: 1,
        has_poll: false, // Oil change is NOT a survey/poll
        agree_count: 0,
        disagree_count: 0,
        created_at: new Date().toISOString(),
        is_read: false,
      };

      return { notif: notifItem, isDue: isLastDayOrDue };
    } catch {
      return null;
    }
  }, [employee?.id, employee?.motorcycle_number, lang]);

  const checkUnreadBroadcasts = useCallback(async () => {
    if (!employee?.id) return;
    try {
      const unread = await notificationService.getUnreadBroadcasts(employee.id);
      const oilResult = await fetchOilNotification();
      const oilNotif = oilResult?.notif;
      const isDue = Boolean(oilResult?.isDue);
      
      let dismissedIds: string[] = [];
      try {
        const raw = await AsyncStorage.getItem('@aams_dismissed_broadcasts');
        if (raw) dismissedIds = JSON.parse(raw);
      } catch {}

      // If oil is due, show dedicated Oil Change Bottom Sheet in the user's language (NEVER as a survey poll!)
      if (oilNotif && isDue && !dismissedIds.includes(oilNotif.id) && !oilAlertShownRef.current) {
        oilAlertShownRef.current = true;
        const bike = employee.motorcycle_number || '';
        onOpenOilModal?.(bike);
        // Also show system tray push notification for the courier
        notificationService.showSystemTrayNotification(oilNotif);
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
  }, [employee?.id, employee?.motorcycle_number, fetchOilNotification, onOpenOilModal, showBroadcastModal]);

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
      const oilResult = await fetchOilNotification();
      const combined = oilResult?.notif ? [oilResult.notif, ...list] : list;
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
      const oilResult = await fetchOilNotification();
      const combined = oilResult?.notif ? [oilResult.notif, ...list] : list;
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
