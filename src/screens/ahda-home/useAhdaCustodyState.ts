import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { useShareIntentContext } from 'expo-share-intent';
import {
  custodyService,
  CustodyDayData,
  CustodyExpenseItem,
  CustodyLogItem,
  hasAddCustodyPermission,
  hasAddExpensePermission,
  hasDeleteCustodyPermission,
} from '../../services/custodyService';
import {
  fetchBranches,
  BranchItem,
  setActiveBranch,
  getActiveBranchId,
  fetchCurrentUserProfile,
} from '../../services/api';
import { syncCustodyWidget } from '../../widgets/CustodyWidgetSync';
import { calculateNextExportNumber } from '../../utils/exportNumber';
import { AhdaAlertConfig } from '../../components/modals/AhdaActionAlertModal';
import {
  getDaysCacheKey,
  getLogsCacheKey,
  extractUserBranchId,
  resolveBranchFallbackName,
} from './ahdaHomeHelpers';

interface UseAhdaCustodyStateParams {
  currentUser: any;
  onUpdateUser?: (updated: any) => void;
  initialAction?: string;
  branchAndDate: {
    selectedDate: string;
    dateInitialized: boolean;
    searchReturnDateRef: React.MutableRefObject<string | null>;
    updateSelectedDate: (d: string) => void;
    showDatePickerModal: boolean;
    setShowDatePickerModal: (v: boolean) => void;
    branches: BranchItem[];
    activeBranch: { id: string | null; name: string | null };
    setActiveBranchState: (b: { id: string | null; name: string | null }) => void;
    canSwitchBranch: boolean;
    showBranchModal: boolean;
    setShowBranchModal: (v: boolean) => void;
    mustSelectBranch: boolean;
    setMustSelectBranch: (v: boolean) => void;
  };
}

export function useAhdaCustodyState({
  currentUser,
  onUpdateUser,
  initialAction,
  branchAndDate,
}: UseAhdaCustodyStateParams) {
  const {
    selectedDate,
    dateInitialized,
    searchReturnDateRef,
    updateSelectedDate,
    showDatePickerModal,
    setShowDatePickerModal,
    branches,
    activeBranch,
    setActiveBranchState,
    canSwitchBranch,
    showBranchModal,
    setShowBranchModal,
    mustSelectBranch,
    setMustSelectBranch,
  } = branchAndDate;

  const [days, setDays] = useState<CustodyDayData[]>([]);
  const [dayLogs, setDayLogs] = useState<CustodyLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);

  const canAddCustody = useMemo(() => hasAddCustodyPermission(currentUser), [currentUser]);
  const canAddExpense = useMemo(() => hasAddExpensePermission(currentUser), [currentUser]);
  const canDeleteCustody = useMemo(() => hasDeleteCustodyPermission(currentUser), [currentUser]);

  // Forms / Bottom Sheets State
  const [showAddCustodyModal, setShowAddCustodyModal] = useState<boolean>(false);
  const [addCustodyAmount, setAddCustodyAmount] = useState<string>('');
  const [addCustodyLoading, setAddCustodyLoading] = useState<boolean>(false);
  const [showLogsSheet, setShowLogsSheet] = useState<boolean>(false);
  const [showDayExpensesPage, setShowDayExpensesPage] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<AhdaAlertConfig | null>(null);
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState<boolean>(false);

  // Add Expense State
  const [showAddExpenseModal, setShowAddExpenseModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('fuel');
  const [expenseAmount, setExpenseAmount] = useState<string>('');
  const [expenseRecipient, setExpenseRecipient] = useState<string>('');
  const [exportNumber, setExportNumber] = useState<string>('');
  const [invoiceImageUri, setInvoiceImageUri] = useState<string | null>(null);
  const [addExpenseLoading, setAddExpenseLoading] = useState<boolean>(false);

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<CustodyExpenseItem | null>(null);
  const [editCategory, setEditCategory] = useState<string>('fuel');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editRecipient, setEditRecipient] = useState<string>('');
  const [editExportNumber, setEditExportNumber] = useState<string>('');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editLoading, setEditLoading] = useState<boolean>(false);

  // Search & Preview State
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [initialExpenseForDetails, setInitialExpenseForDetails] = useState<CustodyExpenseItem | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [showReportPreviewModal, setShowReportPreviewModal] = useState<boolean>(false);
  const [showNoInvoicesNoticeModal, setShowNoInvoicesNoticeModal] = useState<boolean>(false);
  const [activeStoredLedger, setActiveStoredLedger] = useState<string | null>(null);
  const [sharedImagePending, setSharedImagePending] = useState<string | null>(null);

  const lastCustodyFetchRef = useRef<number>(0);
  const isCustodyFetchingRef = useRef<boolean>(false);
  const pendingForceFetchRef = useRef<boolean>(false);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  // Quick Category deep link listener
  useEffect(() => {
    if (initialAction === 'add_expense') setShowQuickCategoryModal(true);
    const handleUrl = (url: string | null) => {
      if (url && (url.includes('add_expense') || url.includes('action=add_expense'))) {
        setShowQuickCategoryModal(true);
      }
    };
    Linking.getInitialURL().then(handleUrl).catch(() => {});
    const sub = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => sub.remove();
  }, [initialAction]);

  // Auto-generate outgoing sequence number for internet & personal advance
  useEffect(() => {
    if (showAddExpenseModal) {
      if (selectedCategory === 'internet_advance' || selectedCategory === 'advance') {
        if (!exportNumber.trim()) setExportNumber(calculateNextExportNumber(days));
      } else {
        setExportNumber('');
      }
    }
  }, [showAddExpenseModal, selectedCategory, days]);

  // Synchronize stored ledger photo for selected date
  useEffect(() => {
    let isMounted = true;
    custodyService.getLedgerImage(selectedDate).then((img) => {
      if (isMounted) setActiveStoredLedger(img || null);
    }).catch(() => {});
    return () => { isMounted = false; };
  }, [selectedDate]);

  // Incoming Shared Image from Android Share Sheet
  useEffect(() => {
    if (hasShareIntent && shareIntent?.files && shareIntent.files.length > 0) {
      const targetUri = shareIntent.files[0]?.path || (shareIntent as any)?.value;
      if (targetUri) {
        setShowDatePickerModal(false);
        setShowLogsSheet(false);
        setShowAddCustodyModal(false);
        setShowReportPreviewModal(false);
        setEditingExpense(null);
        setPreviewImage(null);
        setSharedImagePending(targetUri);
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent, resetShareIntent, setShowDatePickerModal]);

  const handleCloseDayExpenses = useCallback(() => {
    setShowDayExpensesPage(false);
    setSelectedCategoryFilter(null);
    setInitialExpenseForDetails(null);
    if (searchReturnDateRef.current) {
      const returnDate = searchReturnDateRef.current;
      searchReturnDateRef.current = null;
      updateSelectedDate(returnDate);
    }
  }, [searchReturnDateRef, updateSelectedDate]);

  // 0ms cache restoration
  useEffect(() => {
    if (!dateInitialized) return;
    let isMounted = true;
    const restoreFromCache = async () => {
      const bId = activeBranch.id || getActiveBranchId();
      try {
        const [cachedDaysStr, cachedLogsStr] = await Promise.all([
          AsyncStorage.getItem(getDaysCacheKey(bId)),
          AsyncStorage.getItem(getLogsCacheKey(bId, selectedDate)),
        ]);
        if (!isMounted) return;
        if (cachedDaysStr) {
          const parsed = JSON.parse(cachedDaysStr);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setDays(parsed);
            setLoading(false);
          }
        }
        if (cachedLogsStr) {
          const parsedLogs = JSON.parse(cachedLogsStr);
          if (Array.isArray(parsedLogs)) setDayLogs(parsedLogs);
        }
        const cachedLedger = await custodyService.getLedgerImage(selectedDate);
        if (isMounted) {
          setActiveStoredLedger(cachedLedger || null);
          if (cachedLedger) {
            setDays((prev) => prev.map((d) => (d.date === selectedDate ? { ...d, ledger_image_url: cachedLedger } : d)));
          }
        }
      } catch (_) {}
    };
    restoreFromCache();
    return () => { isMounted = false; };
  }, [selectedDate, dateInitialized, activeBranch.id]);

  // Fetch all days and logs (with forced bypass for post-mutation consistency)
  const loadCustodyData = useCallback(
    async (silent = false, targetBranchId?: string, force = false) => {
      const now = Date.now();
      if (!force && now - lastCustodyFetchRef.current < 15000 && days.length > 0) {
        if (!silent) setLoading(false);
        setRefreshing(false);
        return;
      }
      if (isCustodyFetchingRef.current) {
        if (force) pendingForceFetchRef.current = true;
        return;
      }
      isCustodyFetchingRef.current = true;
      lastCustodyFetchRef.current = now;
      if (!silent && days.length === 0) setLoading(true);

      const bId = targetBranchId || activeBranch.id || getActiveBranchId() || undefined;
      try {
        const [daysData, logsData] = await Promise.all([
          custodyService.getDays(bId),
          custodyService.getLogs(selectedDate, bId),
        ]);
        let finalDaysData = daysData;
        if (Array.isArray(daysData)) {
          try {
            const savedOrderStr = await AsyncStorage.getItem(`@custody_expenses_order_${selectedDate}`);
            if (savedOrderStr) {
              const ids: string[] = JSON.parse(savedOrderStr);
              if (Array.isArray(ids) && ids.length > 0) {
                const map = new Map(ids.map((id, idx) => [id, idx]));
                finalDaysData = daysData.map((d) => {
                  if (d.date === selectedDate && Array.isArray(d.expenses)) {
                    const sortedExpenses = [...d.expenses].sort((a, b) => {
                      const aIdx = map.has(a.id) ? map.get(a.id)! : 9999;
                      const bIdx = map.has(b.id) ? map.get(b.id)! : 9999;
                      return aIdx - bIdx;
                    });
                    return { ...d, expenses: sortedExpenses };
                  }
                  return d;
                });
              }
            }
          } catch (_) {}
          const currentLedgerImg = (await custodyService.getLedgerImage(selectedDate)) || activeStoredLedger;
          if (currentLedgerImg) {
            finalDaysData = finalDaysData.map((d) =>
              d.date === selectedDate ? { ...d, ledger_image_url: currentLedgerImg } : d
            );
            setActiveStoredLedger(currentLedgerImg);
          }
          setDays(finalDaysData);
          AsyncStorage.setItem(getDaysCacheKey(bId || null), JSON.stringify(finalDaysData)).catch(() => {});
        }
        const freshLogs = logsData?.data || [];
        setDayLogs(freshLogs);
        AsyncStorage.setItem(getLogsCacheKey(bId || null, selectedDate), JSON.stringify(freshLogs)).catch(() => {});
      } catch (err: any) {
        console.error('Error fetching custody data:', err);
      } finally {
        isCustodyFetchingRef.current = false;
        setLoading(false);
        setRefreshing(false);
        if (pendingForceFetchRef.current) {
          pendingForceFetchRef.current = false;
          void loadCustodyData(true, targetBranchId, true);
        }
      }
    },
    [selectedDate, days.length, activeBranch.id, activeStoredLedger]
  );

  useEffect(() => {
    if (!dateInitialized) return;
    loadCustodyData(days.length > 0);
  }, [selectedDate, dateInitialized, activeBranch.id]);

  // Non-blocking background user profile sync + 0ms instant modal triggers
  const syncUserProfileBackground = useCallback(() => {
    fetchCurrentUserProfile()
      .then((fresh) => {
        if (fresh && onUpdateUser) onUpdateUser(fresh);
      })
      .catch(() => {});
  }, [onUpdateUser]);

  const handleOpenAddCustodyFast = useCallback(() => {
    syncUserProfileBackground();
    if (!canAddCustody) {
      setAlertConfig({
        type: 'warning',
        title: 'غير مصرح',
        message: 'ليس لديك صلاحية لإضافة أو تعديل مبلغ العهدة.',
      });
      return;
    }
    setShowAddCustodyModal(true);
  }, [canAddCustody, syncUserProfileBackground]);

  const handleOpenAddExpenseFast = useCallback(
    (categoryKey?: string | null) => {
      syncUserProfileBackground();
      if (!canAddExpense) {
        setAlertConfig({
          type: 'warning',
          title: 'غير مصرح',
          message: 'ليس لديك صلاحية لتسجيل المصروفات (الصرف).',
        });
        return;
      }
      if (categoryKey) setSelectedCategory(categoryKey);
      setShowAddExpenseModal(true);
    },
    [canAddExpense, syncUserProfileBackground]
  );

  const handleSelectBranch = useCallback(
    async (branch: BranchItem) => {
      setShowBranchModal(false);
      setMustSelectBranch(false);
      await setActiveBranch(branch.id, branch.name);
      setActiveBranchState({ id: branch.id, name: branch.name });
      setDays([]);
      setDayLogs([]);
      try {
        const cachedDaysStr = await AsyncStorage.getItem(getDaysCacheKey(branch.id));
        if (cachedDaysStr) {
          const parsed = JSON.parse(cachedDaysStr);
          if (Array.isArray(parsed) && parsed.length > 0) setDays(parsed);
        }
      } catch (_) {}
      loadCustodyData(false, branch.id, true);
    },
    [loadCustodyData, setShowBranchModal, setMustSelectBranch, setActiveBranchState]
  );

  // Hardware back button navigation
  useEffect(() => {
    const onBackPress = () => {
      if (sharedImagePending) { setSharedImagePending(null); return true; }
      if (showNoInvoicesNoticeModal) { setShowNoInvoicesNoticeModal(false); return true; }
      if (showReportPreviewModal) { setShowReportPreviewModal(false); return true; }
      if (previewImage) { setPreviewImage(null); return true; }
      if (showDatePickerModal) { setShowDatePickerModal(false); return true; }
      if (showLogsSheet) { setShowLogsSheet(false); return true; }
      if (editingExpense) { setEditingExpense(null); return true; }
      if (showAddExpenseModal) { setShowAddExpenseModal(false); return true; }
      if (showAddCustodyModal) { setShowAddCustodyModal(false); return true; }
      if (showDayExpensesPage) { handleCloseDayExpenses(); return true; }
      if (showProfile) { setShowProfile(false); return true; }
      if (showBranchModal && !mustSelectBranch) { setShowBranchModal(false); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [
    sharedImagePending, showNoInvoicesNoticeModal, showReportPreviewModal, previewImage,
    showDatePickerModal, showLogsSheet, editingExpense, showAddExpenseModal,
    showAddCustodyModal, showDayExpensesPage, handleCloseDayExpenses, showProfile,
    showBranchModal, mustSelectBranch, setShowDatePickerModal, setShowBranchModal,
  ]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const freshUser = await fetchCurrentUserProfile();
      if (freshUser) {
        if (onUpdateUser) onUpdateUser(freshUser);
        const userBranchId = extractUserBranchId(freshUser);
        if (userBranchId) {
          const fetchedBranches = branches.length > 0 ? branches : await fetchBranches();
          const matchingBranch = fetchedBranches.find((b) => b.id === userBranchId);
          const bName =
            matchingBranch?.name ||
            resolveBranchFallbackName(userBranchId, freshUser.branch_name) ||
            'الفرع الأول';
          await setActiveBranch(userBranchId, bName);
          setActiveBranchState({ id: userBranchId, name: bName });
          setMustSelectBranch(false);
          setShowBranchModal(false);
          await loadCustodyData(true, userBranchId, true);
          return;
        }
      }
      await loadCustodyData(true, undefined, true);
    } catch (err) {
      console.warn('onRefresh error:', err);
    } finally {
      setRefreshing(false);
    }
  }, [onUpdateUser, branches, loadCustodyData, setActiveBranchState, setMustSelectBranch, setShowBranchModal]);

  const currentDay = useMemo(() => days.find((d) => d.date === selectedDate) || null, [days, selectedDate]);

  const effectiveOpeningBalance = useMemo(() => {
    if (currentDay?.opening_balance && currentDay.opening_balance > 0) return currentDay.opening_balance;
    const previousDays = days.filter((d) => d.date < selectedDate).sort((a, b) => b.date.localeCompare(a.date));
    return previousDays[0]?.closing_balance ?? currentDay?.opening_balance ?? 0;
  }, [days, selectedDate, currentDay]);

  const custodyAddedLogs = useMemo(() => dayLogs.filter((l) => l.action_type === 'ADD_CUSTODY'), [dayLogs]);
  const custodyTotalAvailable = effectiveOpeningBalance + (currentDay?.added_amount ?? 0);

  // Sync widget
  useEffect(() => {
    if (!dateInitialized) return;
    const parts = selectedDate.split('-');
    const dateLabel = parts.length === 3 ? `${parseInt(parts[2], 10)}/${parseInt(parts[1], 10)}` : selectedDate;
    const userBranchId = extractUserBranchId(currentUser);
    const currentBranchObj = { id: activeBranch.id || userBranchId || 'default', name: activeBranch.name || 'الفرع الأول' };
    syncCustodyWidget({
      currentDay,
      effectiveOpeningBalance,
      activeBranch: currentBranchObj,
      allBranches: canSwitchBranch && branches.length > 1 ? branches : [currentBranchObj],
      allDays: days,
      dateLabel,
    });
  }, [currentDay, effectiveOpeningBalance, activeBranch, branches, canSwitchBranch, days, selectedDate, dateInitialized, currentUser]);

  return {
    days, setDays, dayLogs, loading, refreshing, showProfile, setShowProfile,
    canAddCustody, canAddExpense, canDeleteCustody,
    showAddCustodyModal, setShowAddCustodyModal, addCustodyAmount, setAddCustodyAmount,
    addCustodyLoading, setAddCustodyLoading, showLogsSheet, setShowLogsSheet,
    showDayExpensesPage, setShowDayExpensesPage, selectedCategoryFilter, setSelectedCategoryFilter,
    alertConfig, setAlertConfig, showQuickCategoryModal, setShowQuickCategoryModal,
    showAddExpenseModal, setShowAddExpenseModal, selectedCategory, setSelectedCategory,
    expenseAmount, setExpenseAmount, expenseRecipient, setExpenseRecipient,
    exportNumber, setExportNumber, invoiceImageUri, setInvoiceImageUri,
    addExpenseLoading, setAddExpenseLoading, editingExpense, setEditingExpense,
    editCategory, setEditCategory, editAmount, setEditAmount, editRecipient, setEditRecipient,
    editExportNumber, setEditExportNumber, editImageUri, setEditImageUri, editDate, setEditDate,
    editLoading, setEditLoading, showSearchModal, setShowSearchModal,
    initialExpenseForDetails, setInitialExpenseForDetails, previewImage, setPreviewImage,
    exportingExcel, setExportingExcel, showReportPreviewModal, setShowReportPreviewModal,
    showNoInvoicesNoticeModal, setShowNoInvoicesNoticeModal,
    activeStoredLedger, setActiveStoredLedger, sharedImagePending, setSharedImagePending,
    loadCustodyData, syncUserProfileBackground, handleOpenAddCustodyFast, handleOpenAddExpenseFast,
    handleSelectBranch, handleCloseDayExpenses, onRefresh,
    currentDay, effectiveOpeningBalance, custodyAddedLogs, custodyTotalAvailable,
  };
}
