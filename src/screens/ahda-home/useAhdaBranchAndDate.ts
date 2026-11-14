import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import {
  fetchBranches,
  BranchItem,
  loadActiveBranch,
  setActiveBranch,
  getActiveBranchId,
  getActiveBranchName,
} from '../../services/api';
import {
  STORAGE_SELECTED_DATE_KEY,
  getTodayStr,
  stepDateStr,
  extractUserBranchId,
  resolveBranchFallbackName,
} from './ahdaHomeHelpers';

export function useAhdaBranchAndDate(currentUser: any) {
  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [dateInitialized, setDateInitialized] = useState<boolean>(false);
  const searchReturnDateRef = useRef<string | null>(null);

  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState<number>(new Date().getMonth() + 1);

  const [branches, setBranches] = useState<BranchItem[]>([]);

  const initialBranchId = useMemo(() => {
    return extractUserBranchId(currentUser) || getActiveBranchId() || null;
  }, [currentUser]);

  const initialBranchName = useMemo(() => {
    return (
      resolveBranchFallbackName(initialBranchId, currentUser?.branch_name) ||
      getActiveBranchName() ||
      null
    );
  }, [currentUser, initialBranchId]);

  const [activeBranch, setActiveBranchState] = useState<{ id: string | null; name: string | null }>({
    id: initialBranchId,
    name: initialBranchName,
  });
  const [showBranchModal, setShowBranchModal] = useState<boolean>(false);
  const [mustSelectBranch, setMustSelectBranch] = useState<boolean>(false);
  const branchesInitializedRef = useRef<boolean>(false);

  const canSwitchBranch = useMemo(() => {
    if (!currentUser) return false;
    const userBranchId = extractUserBranchId(currentUser);
    if (userBranchId) {
      if (Array.isArray(currentUser.branch_ids) && currentUser.branch_ids.length > 1) return true;
      if (Array.isArray(currentUser.branches) && currentUser.branches.length > 1) return true;
      return false;
    }
    return true;
  }, [currentUser]);

  // 1. Restore last selected date from storage on startup
  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem(STORAGE_SELECTED_DATE_KEY)
      .then((savedDate) => {
        if (!isMounted) return;
        if (savedDate && /^\d{4}-\d{2}-\d{2}$/.test(savedDate)) {
          setSelectedDate(savedDate);
          const parts = savedDate.split('-');
          if (parts.length === 3) {
            setPickerYear(parseInt(parts[0], 10));
            setPickerMonth(parseInt(parts[1], 10));
          }
        }
        setDateInitialized(true);
      })
      .catch(() => {
        if (isMounted) setDateInitialized(true);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const updateSelectedDate = useCallback((newDate: string) => {
    setSelectedDate(newDate);
    AsyncStorage.setItem(STORAGE_SELECTED_DATE_KEY, newDate).catch(() => {});
    const parts = newDate.split('-');
    if (parts.length === 3) {
      setPickerYear(parseInt(parts[0], 10));
      setPickerMonth(parseInt(parts[1], 10));
    }
  }, []);

  const handlePressDatePicker = useCallback(() => {
    const parts = selectedDate.split('-');
    setPickerYear(parseInt(parts[0], 10) || new Date().getFullYear());
    setPickerMonth(parseInt(parts[1], 10) || new Date().getMonth() + 1);
    setShowDatePickerModal(true);
  }, [selectedDate]);

  const handleResetToToday = useCallback(() => {
    updateSelectedDate(getTodayStr());
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  }, [updateSelectedDate]);

  const changeDateByDays = useCallback(
    (delta: number) => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (_) {}
      updateSelectedDate(stepDateStr(selectedDate, delta));
    },
    [selectedDate, updateSelectedDate]
  );

  const handlePressBranchSelector = useCallback(() => {
    if (!canSwitchBranch) return;
    setMustSelectBranch(false);
    setShowBranchModal(true);
  }, [canSwitchBranch]);

  // 2. Initialize Branches & Active Branch
  useEffect(() => {
    let isMounted = true;
    const initBranches = async () => {
      try {
        const userBranchId = extractUserBranchId(currentUser);
        const fetched = await fetchBranches();
        if (isMounted) {
          if (!canSwitchBranch && userBranchId) {
            const userOnly = fetched.filter((b) => b.id.toLowerCase() === userBranchId.toLowerCase());
            setBranches(
              userOnly.length > 0
                ? userOnly
                : [
                    {
                      id: userBranchId,
                      name:
                        resolveBranchFallbackName(userBranchId, currentUser?.branch_name) ||
                        'الفرع الأول',
                    },
                  ]
            );
          } else {
            setBranches(fetched);
          }
        }

        if (branchesInitializedRef.current) return;

        const stored = await loadActiveBranch();

        if (canSwitchBranch) {
          let chosenId = stored.id;
          let chosenName = stored.name;
          if (!chosenId) {
            chosenId = userBranchId || (fetched.length > 0 ? fetched[0].id : null);
          }
          if (chosenId) {
            const matchingBranch = fetched.find((b) => b.id.toLowerCase() === chosenId!.toLowerCase());
            chosenName =
              matchingBranch?.name ||
              resolveBranchFallbackName(chosenId, currentUser?.branch_name) ||
              'الفرع الأول';
            await setActiveBranch(chosenId, chosenName);
            if (isMounted) {
              setActiveBranchState({ id: chosenId, name: chosenName });
              setMustSelectBranch(false);
              branchesInitializedRef.current = true;
            }
          } else if (isMounted) {
            setMustSelectBranch(true);
            setShowBranchModal(true);
            branchesInitializedRef.current = true;
          }
          return;
        }

        if (userBranchId) {
          const matchingBranch = fetched.find((b) => b.id.toLowerCase() === userBranchId.toLowerCase());
          const bName =
            matchingBranch?.name ||
            resolveBranchFallbackName(userBranchId, currentUser?.branch_name) ||
            'الفرع الأول';
          await setActiveBranch(userBranchId, bName);
          if (isMounted) {
            setActiveBranchState({ id: userBranchId, name: bName });
            setMustSelectBranch(false);
            setShowBranchModal(false);
            branchesInitializedRef.current = true;
          }
          return;
        }

        if (stored.id && isMounted && activeBranch.id !== stored.id) {
          setActiveBranchState(stored);
          setMustSelectBranch(false);
          branchesInitializedRef.current = true;
        }
      } catch (err) {
        console.error('Error initializing branches:', err);
      }
    };

    initBranches();
    return () => {
      isMounted = false;
    };
  }, [currentUser, canSwitchBranch]);

  return {
    selectedDate,
    dateInitialized,
    searchReturnDateRef,
    updateSelectedDate,
    showDatePickerModal,
    setShowDatePickerModal,
    pickerYear,
    setPickerYear,
    pickerMonth,
    setPickerMonth,
    handlePressDatePicker,
    handleResetToToday,
    changeDateByDays,
    branches,
    activeBranch,
    setActiveBranchState,
    canSwitchBranch,
    showBranchModal,
    setShowBranchModal,
    mustSelectBranch,
    setMustSelectBranch,
    handlePressBranchSelector,
  };
}
