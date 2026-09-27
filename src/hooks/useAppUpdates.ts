import { useState, useEffect, useCallback } from 'react';
import * as Updates from 'expo-updates';
import { UpdateModalState } from '../components/modals/AppUpdateBottomSheet';

export function useAppUpdates(isRTL: boolean = true) {
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateModalState>('CHECKING');
  const [updateError, setUpdateError] = useState<string>('');

  const handleCheckForUpdates = useCallback(async (interactive = false) => {
    if (__DEV__ || !Updates.isEnabled) {
      if (interactive) {
        setUpdateState('CHECKING');
        setUpdateModalVisible(true);
        setTimeout(() => {
          setUpdateState('UP_TO_DATE');
        }, 1200);
      }
      return;
    }

    try {
      if (interactive) {
        setUpdateState('CHECKING');
        setUpdateModalVisible(true);
      }
      const startTime = Date.now();
      const check = await Updates.checkForUpdateAsync().catch((e) => {
        console.log('[useAppUpdates] checkForUpdateAsync safe catch:', e);
        return { isAvailable: false } as Updates.UpdateCheckResult;
      });
      const elapsed = Date.now() - startTime;
      if (interactive && elapsed < 900) {
        await new Promise((resolve) => setTimeout(resolve, 900 - elapsed));
      }

      if (check && check.isAvailable) {
        if (interactive) {
          setUpdateState('DOWNLOADING');
          setUpdateModalVisible(true);
        }
        await Updates.fetchUpdateAsync();
        setUpdateState('READY');
        setUpdateModalVisible(true);
      } else if (interactive) {
        setUpdateState('UP_TO_DATE');
        setUpdateModalVisible(true);
      }
    } catch (err: any) {
      console.log('[useAppUpdates] Update check error:', err);
      if (interactive) {
        setUpdateState('ERROR');
        setUpdateError(err?.message || (isRTL ? 'تعذر الاتصال بخوادم التحديث' : 'Update server unavailable'));
        setUpdateModalVisible(true);
      }
    }
  }, [isRTL]);

  const handleApplyUpdate = useCallback(async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      console.log('[useAppUpdates] Update reload error:', e);
      setUpdateModalVisible(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleCheckForUpdates(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [handleCheckForUpdates]);

  return {
    updateModalVisible,
    setUpdateModalVisible,
    updateState,
    updateError,
    handleCheckForUpdates,
    handleApplyUpdate,
  };
}
