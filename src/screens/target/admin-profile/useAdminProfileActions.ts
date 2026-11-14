import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';
import * as LocalAuthentication from 'expo-local-authentication';
import { UpdateModalState } from '../../../components/modals/AppUpdateBottomSheet';
import {
  isBiometricEnabled,
  setBiometricEnabled,
  saveLastCredentialsForBiometrics,
  getStoredToken,
  loadStoredToken,
} from '../../../services/api';
import { targetApi } from '../../../services/targetApi';

export function useAdminProfileActions(
  user: any,
  isAdmin: boolean,
  isRTL: boolean,
  onResetData?: () => void
) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [currentSubView, setCurrentSubView] = useState<'profile' | 'rules'>('profile');
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateModalState>('CHECKING');
  const [updateError, setUpdateError] = useState('');
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsOn, setBiometricsOn] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);

  const handleAvatarTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 600) {
      tapCountRef.current += 1;
      if (tapCountRef.current >= 3) {
        tapCountRef.current = 0;
        setShowDiagnosticsModal(true);
      }
    } else {
      tapCountRef.current = 1;
    }
    lastTapRef.current = now;
  };

  useEffect(() => {
    const checkBio = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (hasHardware && isEnrolled) {
          setBiometricsAvailable(true);
          setBiometricsOn(await isBiometricEnabled());
        }
      } catch (e) {
        console.log('Biometric check error in Admin Profile:', e);
      }
    };
    checkBio();
  }, []);

  const handleDeleteAllIdentifiers = () => {
    Alert.alert(
      'تأكيد مسح كافة المعرفات',
      'هل أنت متأكد من رغبتك في مسح كافة المعرفات والبيانات المسجلة بالكامل؟\n\nستتمكن بعد ذلك من رفع شيتات وبيانات جديدة تماماً من الصفر.\n\n⚠️ هذا الإجراء نهائي ولا يمكن التراجع عنه.',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'نعم، مسح الكل الآن',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingAll(true);
              await targetApi.deleteAllIdentifiers();
              Alert.alert('تم بنجاح', 'تم مسح كافة المعرفات والبيانات بنجاح. يمكنك الآن رفع الداتا الجديدة.');
              onResetData?.();
            } catch (err: any) {
              Alert.alert('خطأ', err.message || 'فشل في مسح المعرفات');
            } finally {
              setDeletingAll(false);
            }
          },
        },
      ]
    );
  };

  const handleToggleBiometrics = async (val: boolean) => {
    if (val) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: isRTL ? 'تأكيد البصمة لتفعيل الدخول السريع' : 'Confirm Biometrics to Enable',
          cancelLabel: isRTL ? 'إلغاء' : 'Cancel',
          disableDeviceFallback: false,
        });
        if (result.success) {
          const token = getStoredToken() || (await loadStoredToken());
          const identifier = user?.phone || user?.username || user?.email || (isAdmin ? '2642799148' : '500500');
          if (token) await saveLastCredentialsForBiometrics(identifier, token, user);
          await setBiometricEnabled(true);
          setBiometricsOn(true);
          Alert.alert(
            isRTL ? 'تم التفعيل' : 'Activated',
            isRTL ? 'تم تفعيل تسجيل الدخول بالبصمة بنجاح على هذا الجهاز.' : 'Biometric login has been activated on this device.'
          );
        }
      } catch (e) {
        console.log('Biometric activation error:', e);
        Alert.alert(isRTL ? 'خطأ' : 'Error', isRTL ? 'فشل التحقق من البصمة' : 'Biometric verification failed');
      }
    } else {
      await setBiometricEnabled(false);
      setBiometricsOn(false);
    }
  };

  const handleCheckForUpdates = async () => {
    if (__DEV__ || !Updates.isEnabled) {
      setUpdateState('CHECKING');
      setUpdateModalVisible(true);
      setTimeout(() => setUpdateState('UP_TO_DATE'), 1200);
      return;
    }

    try {
      setUpdateState('CHECKING');
      setUpdateModalVisible(true);
      const startTime = Date.now();
      const check = await Updates.checkForUpdateAsync().catch(() => ({ isAvailable: false } as Updates.UpdateCheckResult));
      const elapsed = Date.now() - startTime;
      if (elapsed < 900) await new Promise((resolve) => setTimeout(resolve, 900 - elapsed));

      if (check && check.isAvailable) {
        setUpdateState('DOWNLOADING');
        await Updates.fetchUpdateAsync();
        setUpdateState('READY');
      } else {
        setUpdateState('UP_TO_DATE');
      }
    } catch (err: any) {
      console.log('Update check error:', err);
      setUpdateState('ERROR');
      setUpdateError(err?.message || (isRTL ? 'تعذر الاتصال بخوادم التحديث' : 'Update server unavailable'));
    }
  };

  const handleApplyUpdate = async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      console.log('Update reload error:', e);
      setUpdateModalVisible(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (onResetData) onResetData();
    } catch {}
    setTimeout(() => setRefreshing(false), 600);
  };

  return {
    showLogoutModal,
    setShowLogoutModal,
    currentSubView,
    setCurrentSubView,
    updateModalVisible,
    setUpdateModalVisible,
    updateState,
    updateError,
    showDiagnosticsModal,
    setShowDiagnosticsModal,
    biometricsAvailable,
    biometricsOn,
    deletingAll,
    refreshing,
    handleAvatarTap,
    handleDeleteAllIdentifiers,
    handleToggleBiometrics,
    handleCheckForUpdates,
    handleApplyUpdate,
    handleRefresh,
  };
}
