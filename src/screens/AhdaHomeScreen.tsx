import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
  RefreshControl,
  Platform,
  Dimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  KeyboardAvoidingView,
  Keyboard,
  BackHandler,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { ThemeColors } from '../types/delegate';
import {
  custodyService,
  CustodyDayData,
  CustodyExpenseItem,
  CustodyLogItem,
} from '../services/custodyService';
import { AhdaBranchSelectorModal } from '../components/modals/AhdaBranchSelectorModal';
import {
  exportCustodyDayToPdf,
  invalidateCustodyPdfCache,
  evictImageCache,
} from '../services/custodyPdfService';
import {
  formatImageUrl,
  fetchBranches,
  BranchItem,
  loadActiveBranch,
  setActiveBranch,
  getActiveBranchId,
  getActiveBranchName,
  fetchCurrentUserProfile,
} from '../services/api';
import { toArabicDigits, formatArabicNumber } from '../utils/formatters';
import {
  calculateNextExportNumber,
  matchesExportNumberQuery,
  saveLastUsedExportNumber,
} from '../utils/exportNumber';
import { AhdaHeader } from '../components/AhdaHeader';
import { AhdaProfileScreen } from './AhdaProfileScreen';
import { AhdaDayExpensesScreen } from './AhdaDayExpensesScreen';
import { AhdaNetCustodyCard } from '../components/AhdaNetCustodyCard';
import { AhdaCategoryGrid } from '../components/AhdaCategoryGrid';
import { AhdaDayExpensesSummaryCard } from '../components/AhdaDayExpensesSummaryCard';
import { AhdaActionAlertModal, AhdaAlertConfig } from '../components/modals/AhdaActionAlertModal';
import { AhdaAddExpenseModal } from '../components/modals/AhdaAddExpenseModal';
import { AhdaEditExpenseModal } from '../components/modals/AhdaEditExpenseModal';
import { AhdaAddCustodyModal } from '../components/modals/AhdaAddCustodyModal';
import { AhdaCustodyLogsModal } from '../components/modals/AhdaCustodyLogsModal';
import { AhdaDatePickerModal } from '../components/modals/AhdaDatePickerModal';
import { AhdaImageViewerModal } from '../components/modals/AhdaImageViewerModal';
import { AhdaReportPreviewModal } from '../components/modals/AhdaReportPreviewModal';
import { AhdaSharedImageCategoryModal } from '../components/modals/AhdaSharedImageCategoryModal';
import { AhdaSearchBottomSheet } from '../components/modals/AhdaSearchBottomSheet';
import { AhdaNoInvoicesAutoModal } from '../components/modals/AhdaNoInvoicesAutoModal';
import { useShareIntentContext } from 'expo-share-intent';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import {
  AhdaNetCustodyCardSkeleton,
  AhdaCategoryGridSkeleton,
  AhdaDayExpensesSummaryCardSkeleton,
} from '../components/skeleton/AhdaHomeSkeleton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HOME_HEADER_HEIGHT = 72;
const getDaysCacheKey = (branchId: string | null) => `aams_custody_days_cache_${branchId || 'default'}`;
const getLogsCacheKey = (branchId: string | null, date: string) =>
  `aams_custody_logs_cache_${branchId || 'default'}_${date}`;

interface AhdaHomeScreenProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  currentUser: any;
  onLogout: () => void;
  onToggleTheme: () => void;
  themePreference?: 'system' | 'light' | 'dark';
  onSelectThemePreference?: (pref: 'system' | 'light' | 'dark') => void;
  onUpdateUser?: (updated: any) => void;
}

// Categories ordered according to user priority:
// بنزين -> سلفة نت -> سلفة شخصية -> رخصة قيادة -> قطع غيار -> مصاريف أخرى
const CATEGORIES = [
  { key: 'fuel', label: 'بنزين', icon: 'speedometer-outline', color: '#047857', bg: '#ecfdf5' },
  { key: 'internet_advance', label: 'سلفة نت', icon: 'wifi-outline', color: '#0284c7', bg: '#f0f9ff' },
  { key: 'advance', label: 'سلفة شخصية', icon: 'person-add-outline', color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'license', label: 'رخصة القيادة', icon: 'card-outline', color: '#2563eb', bg: '#eff6ff' },
  { key: 'spare_parts', label: 'قطع غيار', icon: 'build-outline', color: '#d97706', bg: '#fffbeb' },
  { key: 'other', label: 'مصاريف أخرى', icon: 'receipt-outline', color: '#059669', bg: '#ecfdf5' },
];

export const AhdaHomeScreen: React.FC<AhdaHomeScreenProps> = ({
  colors,
  isDarkMode,
  currentUser,
  onLogout,
  onToggleTheme,
  themePreference,
  onSelectThemePreference,
  onUpdateUser,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? 24 : 0);

  // Format today's date YYYY-MM-DD
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayStr());
  const [dateInitialized, setDateInitialized] = useState<boolean>(true);
  const searchReturnDateRef = useRef<string | null>(null);
  const [days, setDays] = useState<CustodyDayData[]>([]);
  const [dayLogs, setDayLogs] = useState<CustodyLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);

  // Multi-branch state & permissions
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const initialBranchId = useMemo(() => {
    return (
      currentUser?.branch_id ||
      currentUser?.admin?.branch_id ||
      currentUser?.employee?.branch_id ||
      currentUser?.user?.branch_id ||
      getActiveBranchId() ||
      null
    );
  }, [currentUser]);

  const initialBranchName = useMemo(() => {
    return (
      currentUser?.branch_name ||
      getActiveBranchName() ||
      null
    );
  }, [currentUser]);

  const [activeBranch, setActiveBranchState] = useState<{ id: string | null; name: string | null }>({
    id: initialBranchId,
    name: initialBranchName,
  });
  const [showBranchModal, setShowBranchModal] = useState<boolean>(false);
  const [mustSelectBranch, setMustSelectBranch] = useState<boolean>(false);

  const canSwitchBranch = useMemo(() => {
    if (!currentUser) return false;
    const userBranchId =
      currentUser.branch_id ||
      currentUser.admin?.branch_id ||
      currentUser.employee?.branch_id ||
      currentUser.user?.branch_id;
    // Strict rule: If user is assigned to a specific branch, they belong to that branch ONLY and CANNOT switch branches
    if (userBranchId) {
      return false;
    }
    const role = (currentUser.role || '').toUpperCase();
    const permissions: string[] = Array.isArray(currentUser.permissions) ? currentUser.permissions : [];

    const hasAllBranchesPermission =
      permissions.includes('all_branches') ||
      permissions.includes('manage_branches') ||
      permissions.includes('view_all_branches') ||
      permissions.includes('branches:all') ||
      permissions.includes('custody:all_branches') ||
      permissions.includes('*');

    const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'SUPERADMIN';

    return isSuperAdmin || hasAllBranchesPermission;
  }, [currentUser]);


  // Forms / Bottom Sheets State
  const [showAddCustodyModal, setShowAddCustodyModal] = useState<boolean>(false);
  const [addCustodyAmount, setAddCustodyAmount] = useState<string>('');
  const [addCustodyLoading, setAddCustodyLoading] = useState<boolean>(false);
  const [showLogsSheet, setShowLogsSheet] = useState<boolean>(false);
  const [showDayExpensesPage, setShowDayExpensesPage] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [alertConfig, setAlertConfig] = useState<AhdaAlertConfig | null>(null);

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

  // Main Screen Search Bottom Sheet (مديولا البحث المنبثقة من الأسفل برقم الوارد)
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  // Target expense to open details modal directly on navigation from search
  const [initialExpenseForDetails, setInitialExpenseForDetails] = useState<CustodyExpenseItem | null>(null);

  const handlePressProfile = useCallback(() => {
    setShowProfile(true);
  }, []);

  const handlePressSearch = useCallback(() => {
    setShowSearchModal(true);
  }, []);

  const handlePressBranchSelector = useCallback(() => {
    setMustSelectBranch(false);
    setShowBranchModal(true);
  }, []);

  const handlePressDatePicker = useCallback(() => {
    const parts = selectedDate.split('-');
    setPickerYear(parseInt(parts[0], 10) || new Date().getFullYear());
    setPickerMonth(parseInt(parts[1], 10) || (new Date().getMonth() + 1));
    setShowDatePickerModal(true);
  }, [selectedDate]);

  // Auto-generate outgoing sequence number (1/أ, 2/أ, 3/أ...) for internet & personal advance
  useEffect(() => {
    if (showAddExpenseModal) {
      if (selectedCategory === 'internet_advance' || selectedCategory === 'advance') {
        if (!exportNumber.trim()) {
          setExportNumber(calculateNextExportNumber(days));
        }
      } else {
        setExportNumber('');
      }
    }
  }, [showAddExpenseModal, selectedCategory, days]);


  // Preview Image & Report Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [showReportPreviewModal, setShowReportPreviewModal] = useState<boolean>(false);
  const [showNoInvoicesNoticeModal, setShowNoInvoicesNoticeModal] = useState<boolean>(false);

  // Active Stored Daily Ledger Photo for selected date (prevents stale photo & cross-day leakage)
  const [activeStoredLedger, setActiveStoredLedger] = useState<string | null>(null);

  // Synchronize stored ledger photo strictly for the selected date
  useEffect(() => {
    let isMounted = true;
    custodyService.getLedgerImage(selectedDate).then((img) => {
      if (isMounted) {
        setActiveStoredLedger(img || null);
      }
    }).catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // Incoming Shared Image from Android Share Sheet
  const [sharedImagePending, setSharedImagePending] = useState<string | null>(null);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();

  useEffect(() => {
    if (hasShareIntent && shareIntent?.files && shareIntent.files.length > 0) {
      const incomingFile = shareIntent.files[0];
      const targetUri = incomingFile?.path || (shareIntent as any)?.value;
      if (targetUri) {
        // Dismiss any secondary blocking modal so the category selection sheet is fully interactive
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
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  // Date Navigator Modal (Calendar Month Bottom sheet)
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState<number>(new Date().getMonth() + 1);


  // Handler to update selected date
  const updateSelectedDate = useCallback((newDate: string) => {
    setSelectedDate(newDate);
    const parts = newDate.split('-');
    if (parts.length === 3) {
      setPickerYear(parseInt(parts[0], 10));
      setPickerMonth(parseInt(parts[1], 10));
    }
  }, []);

  // Handler to close day expenses screen and restore current day if navigated from search
  const handleCloseDayExpenses = useCallback(() => {
    setShowDayExpensesPage(false);
    setSelectedCategoryFilter(null);
    setInitialExpenseForDetails(null);
    if (searchReturnDateRef.current) {
      const returnDate = searchReturnDateRef.current;
      searchReturnDateRef.current = null;
      updateSelectedDate(returnDate);
    }
  }, [updateSelectedDate]);

  // 0b. Initialize Branches & Active Branch (Strict scoping for multi-branch vs single-branch)
  useEffect(() => {
    let isMounted = true;
    const initBranches = async () => {
      try {
        const userBranchId =
          currentUser?.branch_id ||
          currentUser?.admin?.branch_id ||
          currentUser?.employee?.branch_id ||
          currentUser?.user?.branch_id;

        const fetched = await fetchBranches();
        if (isMounted) {
          setBranches(fetched);
        }

        // 1. If user has an assigned branch (Single branch user):
        if (userBranchId) {
          const matchingBranch = fetched.find((b) => b.id === userBranchId);
          const bName = matchingBranch?.name || currentUser?.branch_name || 'الفرع الأول';
          if (activeBranch.id !== userBranchId || activeBranch.name !== bName) {
            await setActiveBranch(userBranchId, bName);
            if (isMounted) {
              setActiveBranchState({ id: userBranchId, name: bName });
              setMustSelectBranch(false);
              setShowBranchModal(false);
            }
          }
          return;
        }

        // 2. For multi-branch users without a designated branch (Super Admins):
        const stored = await loadActiveBranch();
        if (stored.id) {
          if (isMounted && activeBranch.id !== stored.id) {
            setActiveBranchState(stored);
            setMustSelectBranch(false);
          }
        } else if (canSwitchBranch) {
          // No branch stored yet: show bottom sheet modal to choose branch!
          if (isMounted) {
            setMustSelectBranch(true);
            setShowBranchModal(true);
          }
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

  // 1. Instant cache restoration on mount / date change / branch change (0ms screen load)
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
          if (Array.isArray(parsedLogs)) {
            setDayLogs(parsedLogs);
          }
        }
        const cachedLedger = await custodyService.getLedgerImage(selectedDate);
        if (isMounted) {
          setActiveStoredLedger(cachedLedger || null);
          if (cachedLedger) {
            setDays((prev) =>
              prev.map((d) => (d.date === selectedDate ? { ...d, ledger_image_url: cachedLedger } : d))
            );
          }
        }
      } catch (_) {}
    };
    restoreFromCache();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, dateInitialized, activeBranch.id]);

  // 2. Fetch all days and logs for current date (Stale-While-Revalidate)
  const loadCustodyData = useCallback(
    async (silent = false, targetBranchId?: string) => {
      if (!silent && days.length === 0) {
        setLoading(true);
      }
      const bId = targetBranchId || activeBranch.id || getActiveBranchId() || undefined;
      try {
        const [daysData, logsData] = await Promise.all([
          custodyService.getDays(bId),
          custodyService.getLogs(selectedDate),
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
                      if (aIdx !== bIdx) return aIdx - bIdx;
                      return 0;
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
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, days.length, activeBranch.id]
  );

  // Handler for selecting branch from modal
  const handleSelectBranch = useCallback(
    async (branch: BranchItem) => {
      setShowBranchModal(false);
      setMustSelectBranch(false);
      await setActiveBranch(branch.id, branch.name);
      setActiveBranchState({ id: branch.id, name: branch.name });
      setDays([]);
      setDayLogs([]);
      loadCustodyData(false, branch.id);
    },
    [loadCustodyData]
  );

  useEffect(() => {
    if (!dateInitialized) return;
    loadCustodyData(days.length > 0);
  }, [selectedDate, dateInitialized, activeBranch.id]);

  // Handle hardware Back button: return to previous view/modal instead of closing the entire app
  useEffect(() => {
    const onBackPress = () => {
      if (sharedImagePending) {
        setSharedImagePending(null);
        return true;
      }
      if (showNoInvoicesNoticeModal) {
        setShowNoInvoicesNoticeModal(false);
        return true;
      }
      if (showReportPreviewModal) {
        setShowReportPreviewModal(false);
        return true;
      }
      if (previewImage) {
        setPreviewImage(null);
        return true;
      }
      if (showDatePickerModal) {
        setShowDatePickerModal(false);
        return true;
      }
      if (showLogsSheet) {
        setShowLogsSheet(false);
        return true;
      }
      if (editingExpense) {
        setEditingExpense(null);
        return true;
      }
      if (showAddExpenseModal) {
        setShowAddExpenseModal(false);
        return true;
      }
      if (showAddCustodyModal) {
        setShowAddCustodyModal(false);
        return true;
      }
      if (showDayExpensesPage) {
        handleCloseDayExpenses();
        return true;
      }
      if (showProfile) {
        setShowProfile(false);
        return true;
      }
      if (showBranchModal && !mustSelectBranch) {
        setShowBranchModal(false);
        return true;
      }
      // If we are on the main Home screen with nothing open, allow default behavior (exit app)
      return false;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [
    sharedImagePending,
    showNoInvoicesNoticeModal,
    showReportPreviewModal,
    previewImage,
    showDatePickerModal,
    showLogsSheet,
    editingExpense,
    showAddExpenseModal,
    showAddCustodyModal,
    showDayExpensesPage,
    handleCloseDayExpenses,
    showProfile,
    showBranchModal,
    mustSelectBranch,
  ]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // 1. Fetch fresh user profile on explicit pull-to-refresh
      // (Only triggered manually by user - zero background polling, zero extra server pressure)
      const freshUser = await fetchCurrentUserProfile();
      if (freshUser) {
        if (onUpdateUser) {
          onUpdateUser(freshUser);
        }

        const userBranchId =
          freshUser.branch_id ||
          freshUser.admin?.branch_id ||
          freshUser.employee?.branch_id ||
          freshUser.user?.branch_id;

        // If user is now assigned to a single branch, enforce it immediately
        if (userBranchId) {
          const fetchedBranches = branches.length > 0 ? branches : await fetchBranches();
          const matchingBranch = fetchedBranches.find((b) => b.id === userBranchId);
          const bName = matchingBranch?.name || freshUser.branch_name || 'الفرع الأول';
          await setActiveBranch(userBranchId, bName);
          setActiveBranchState({ id: userBranchId, name: bName });
          setMustSelectBranch(false);
          setShowBranchModal(false);
          await loadCustodyData(true, userBranchId);
          return;
        }
      }

      // 2. Fetch custody data
      await loadCustodyData(true);
    } catch (err) {
      console.warn('onRefresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Find active day
  const currentDay = useMemo(() => {
    return days.find((d) => d.date === selectedDate) || null;
  }, [days, selectedDate]);

  // Fallback for opening balance (باقي أمس):
  // If opening_balance is 0 or missing, take the previous day's closing balance
  const effectiveOpeningBalance = useMemo(() => {
    if (currentDay?.opening_balance && currentDay.opening_balance > 0) {
      return currentDay.opening_balance;
    }
    const previousDays = days
      .filter((d) => d.date < selectedDate)
      .sort((a, b) => b.date.localeCompare(a.date));
    return previousDays[0]?.closing_balance ?? currentDay?.opening_balance ?? 0;
  }, [days, selectedDate, currentDay]);


  // Handle Day Navigation (Timezone-safe YYYY-MM-DD calculation)
  const changeDateByDays = (delta: number) => {
    const parts = (selectedDate || '').split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [y, m, d] = parts;
      const dateObj = new Date(y, m - 1, d);
      dateObj.setDate(dateObj.getDate() + delta);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      updateSelectedDate(`${year}-${month}-${day}`);
    } else {
      const current = new Date(selectedDate);
      current.setDate(current.getDate() + delta);
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      const day = String(current.getDate()).padStart(2, '0');
      updateSelectedDate(`${year}-${month}-${day}`);
    }
  };

  // 1. Add Custody Amount
  const handleSaveCustodyAmount = async () => {
    const val = parseFloat(addCustodyAmount);
    if (isNaN(val) || val <= 0) {
      setAlertConfig({
        type: 'warning',
        title: 'قيمة غير صالحة',
        message: 'يرجى إدخال مبلغ عهدة صحيح أكبر من الصفر.',
      });
      return;
    }

    try {
      setAddCustodyLoading(true);
      if (currentDay?.id) {
        await custodyService.addAmount({
          custody_day_id: currentDay.id,
          added_amount: val,
          branch_id: activeBranch?.id || undefined,
        });
      } else {
        await custodyService.createDay({
          date: selectedDate,
          added_amount: val,
          branch_id: activeBranch?.id || undefined,
        });
      }
      setAddCustodyAmount('');
      setShowAddCustodyModal(false);
      await loadCustodyData();
      setAlertConfig({
        type: 'success',
        title: 'تمت إضافة العهدة بنجاح',
        message: `تمت إضافة مبلغ ${formatArabicNumber(val, 2)} ريال إلى عهدة يوم ${toArabicDigits(selectedDate)} بنجاح.`,
      });
    } catch (err: any) {
      setAlertConfig({
        type: 'error',
        title: 'فشل التحديث',
        message: err?.message || 'حدث خطأ أثناء إضافة مبلغ العهدة.',
      });
    } finally {
      setAddCustodyLoading(false);
    }
  };

  // 2. Delete / Undo an added custody amount from logs
  const handleDeleteCustodyEntry = (log: CustodyLogItem) => {
    setAlertConfig({
      type: 'confirm',
      title: 'تأكيد حذف مبلغ العهدة',
      message: `هل أنت متأكد من حذف وإلغاء مبلغ العهدة (${formatArabicNumber(log.amount, 2)} ريال) المضاف لهذا اليوم؟ سيتم إنقاص الرصيد فوراً.`,
      primaryButtonText: 'نعم، حذف المبلغ',
      secondaryButtonText: 'إلغاء',
      onPrimaryPress: async () => {
        try {
          await custodyService.deleteLog(log.id);
          await loadCustodyData();
          setAlertConfig({
            type: 'success',
            title: 'تم الحذف بنجاح',
            message: 'تم حذف مبلغ العهدة وإعادة احتساب الرصيد بنجاح.',
          });
        } catch (err: any) {
          setAlertConfig({
            type: 'error',
            title: 'فشل الحذف',
            message: err?.message || 'تعذر حذف مبلغ العهدة من السيرفر.',
          });
        }
      },
    });
  };

  // 3. Pick or Capture Invoice Image
  const handlePickImage = async (useCamera: boolean = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('إذن مطلوب', 'يرجى السماح للتطبيق باستخدام الكاميرا لتصوير الفاتورة');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('إذن مطلوب', 'يرجى السماح للتطبيق بالوصول للصور');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]?.uri) {
        setInvoiceImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Error picking image:', err);
    }
  };

  // 4. Add Expense & Invoice
  const handleSaveExpense = async () => {
    const amt = parseFloat(expenseAmount);
    if (isNaN(amt) || amt <= 0) {
      setAlertConfig({
        type: 'warning',
        title: 'قيمة غير صالحة',
        message: 'يرجى إدخال مبلغ صحيح للفاتورة أكبر من الصفر.',
      });
      return;
    }

    try {
      setAddExpenseLoading(true);

      let targetDayId = currentDay?.id;
      if (!targetDayId) {
        const createdDay = await custodyService.createDay({
          date: selectedDate,
          added_amount: 0,
          branch_id: activeBranch?.id || undefined,
        });
        targetDayId = createdDay.id;
      }

      let uploadedUrl = '';
      if (invoiceImageUri) {
        try {
          uploadedUrl = await custodyService.uploadInvoiceImage(invoiceImageUri);
        } catch (uploadErr: any) {
          console.error('Invoice image upload error:', uploadErr);
          setAlertConfig({
            type: 'error',
            title: 'فشل رفع صورة الفاتورة',
            message: `تعذر رفع الصورة إلى السيرفر: ${uploadErr?.message || 'خطأ في الشبكة'}. يرجى المحاولة مرة أخرى.`,
          });
          return;
        }
      }

      const isAdvance = selectedCategory === 'internet_advance' || selectedCategory === 'advance';
      const finalExportNumber = (isAdvance || exportNumber.trim()) ? exportNumber.trim() : undefined;

      await custodyService.addExpense(targetDayId, {
        category: selectedCategory,
        amount: amt,
        recipient_name: expenseRecipient.trim() || '—',
        export_number: finalExportNumber,
        image_url: uploadedUrl,
      });

      if (finalExportNumber) {
        saveLastUsedExportNumber(finalExportNumber).catch(() => {});
      }

      setExpenseAmount('');
      setExpenseRecipient('');
      setExportNumber('');
      setInvoiceImageUri(null);
      setShowAddExpenseModal(false);
      await loadCustodyData();
      setAlertConfig({
        type: 'success',
        title: 'تم حفظ الفاتورة بنجاح',
        message: 'تم إدراج الفاتورة في جدول العهدة وخصمها من الرصيد المتاح بنجاح.',
      });
    } catch (err: any) {
      setAlertConfig({
        type: 'error',
        title: 'فشل حفظ الفاتورة',
        message: err?.message || 'حدث خطأ أثناء الاتصال بالسيرفر لحفظ الفاتورة.',
      });
    } finally {
      setAddExpenseLoading(false);
    }
  };

  // 4b. Open Edit Expense
  const handleOpenEditExpense = (item: CustodyExpenseItem) => {
    setEditingExpense(item);
    setEditCategory(item.category);
    setEditAmount(String(item.amount));
    setEditRecipient(item.recipient_name || '');
    setEditExportNumber(
      item.export_number ||
        (item.category === 'internet_advance' || item.category === 'advance'
          ? calculateNextExportNumber(days)
          : '')
    );
    setEditImageUri(item.image_url ? formatImageUrl(item.image_url) : null);
    const parentDay = days.find(
      (d) => d.id === item.custody_day_id || d.expenses?.some((e) => e.id === item.id)
    );
    const initialExpenseDate =
      parentDay?.date ||
      selectedDate ||
      (item.created_at ? item.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setEditDate(initialExpenseDate);
  };

  // 4b-2. Pick or Capture Image for Edit Expense
  const handlePickEditImage = async (useCamera: boolean = false) => {
    try {
      let result;
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('إذن مطلوب', 'يرجى السماح للتطبيق باستخدام الكاميرا لتصوير الفاتورة');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('إذن مطلوب', 'يرجى السماح للتطبيق بالوصول للصور');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets[0]?.uri) {
        setEditImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Error picking edit image:', err);
    }
  };

  // 4c. Save Edit Expense
  const handleSaveEditExpense = async () => {
    if (!editingExpense) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      setAlertConfig({
        type: 'warning',
        title: 'قيمة غير صالحة',
        message: 'يرجى إدخال مبلغ صحيح للفاتورة أكبر من الصفر.',
      });
      return;
    }

    try {
      setEditLoading(true);

      let finalImageUrl = editingExpense.image_url || '';
      if (editImageUri) {
        if (editImageUri.startsWith('file://') || editImageUri.startsWith('content://')) {
          try {
            finalImageUrl = await custodyService.uploadInvoiceImage(editImageUri);
          } catch (uploadErr: any) {
            console.error('Edit invoice image upload error:', uploadErr);
            setAlertConfig({
              type: 'error',
              title: 'فشل رفع صورة الفاتورة',
              message: `تعذر رفع الصورة: ${uploadErr?.message || 'خطأ في الاتصال'}.`,
            });
            return;
          }
        }
      } else {
        // User removed the image
        finalImageUrl = '';
      }

      const isAdvance = editCategory === 'internet_advance' || editCategory === 'advance';
      const finalExportNumber = (isAdvance || editExportNumber.trim()) ? editExportNumber.trim() : '';
      const finalDate = editDate.trim() || selectedDate;

      await custodyService.updateExpense(editingExpense.id, {
        category: editCategory,
        amount: amt,
        recipient_name: editRecipient.trim() || '—',
        export_number: finalExportNumber,
        image_url: finalImageUrl,
        date: finalDate,
      });

      if (finalExportNumber) {
        saveLastUsedExportNumber(finalExportNumber).catch(() => {});
      }

      setEditingExpense(null);
      setEditExportNumber('');
      setEditImageUri(null);
      setEditDate('');

      if (finalDate && finalDate !== selectedDate) {
        updateSelectedDate(finalDate);
      }
      await loadCustodyData();
      setAlertConfig({
        type: 'success',
        title: 'تم تعديل الفاتورة',
        message: 'تم تحديث بيانات وتاريخ الفاتورة وإعادة احتساب الرصيد بنجاح.',
      });
    } catch (err: any) {
      setAlertConfig({
        type: 'error',
        title: 'فشل التعديل',
        message: err?.message || 'حدث خطأ أثناء تعديل بيانات الفاتورة.',
      });
    } finally {
      setEditLoading(false);
    }
  };

  // 5. Delete Expense (Animated Confirm Modal)
  const handleDeleteExpense = (item: CustodyExpenseItem) => {
    setAlertConfig({
      type: 'confirm',
      title: 'هل تريد الحذف نهائياً؟',
      message: `هل أنت متأكد من رغبتك في حذف فاتورة "${item.recipient_name || item.category}" بمبلغ ${formatArabicNumber(item.amount, 2)} ريال نهائياً؟ سيتم استرجاع المبلغ لحساب العهدة فوراً ولا يمكن التراجع.`,
      primaryButtonText: 'نعم، حذف نهائياً',
      secondaryButtonText: 'إلغاء',
      onPrimaryPress: async () => {
        try {
          await custodyService.deleteExpense(item.id);
          await loadCustodyData();
          setAlertConfig({
            type: 'success',
            title: 'تم الحذف بنجاح',
            message: 'تم حذف الفاتورة واستعادة المبلغ إلى رصيد العهدة.',
          });
        } catch (err: any) {
          setAlertConfig({
            type: 'error',
            title: 'فشل الحذف',
            message: err?.message || 'تعذر حذف الفاتورة من السيرفر.',
          });
        }
      },
    });
  };

  // 5b. Handle Reordering of Expenses in Ledger
  const handleReorderExpenses = useCallback((reorderedExpenses: CustodyExpenseItem[]) => {
    setDays((prevDays) =>
      prevDays.map((d) => (d.date === selectedDate ? { ...d, expenses: reorderedExpenses } : d))
    );
    // Also update cached days in AsyncStorage
    const bId = activeBranch.id || getActiveBranchId() || null;
    AsyncStorage.getItem(getDaysCacheKey(bId)).then((cachedStr) => {
      if (cachedStr) {
        try {
          const parsed: CustodyDayData[] = JSON.parse(cachedStr);
          const updated = parsed.map((d) => (d.date === selectedDate ? { ...d, expenses: reorderedExpenses } : d));
          AsyncStorage.setItem(getDaysCacheKey(bId), JSON.stringify(updated)).catch(() => {});
        } catch (_) {}
      }
    }).catch(() => {});
  }, [selectedDate, activeBranch.id]);

  // 6. PDF Export with Full Receipts and Embedded Images (Preview or Share)
  const handleExportPdf = async (mode: 'preview' | 'share' = 'share') => {
    if (!currentDay) {
      Alert.alert('تنبيه', 'لا توجد بيانات عهدة مسجلة لتصديرها لهذا اليوم');
      return;
    }

    try {
      setExportingExcel(true);
      // Retrieve stored ledger image (prioritize latest locally attached ledger for this exact date)
      const storedLedger = (await custodyService.getLedgerImage(selectedDate)) || activeStoredLedger;
      const activeLedgerUrl = storedLedger || currentDay.ledger_image_url || undefined;

      // Invalidate PDF cache and evict image cache for this date so newly updated ledger and receipts are always rendered fresh
      await invalidateCustodyPdfCache(selectedDate);
      if (activeLedgerUrl) {
        evictImageCache(activeLedgerUrl);
      }

      const dayWithLedger: CustodyDayData = {
        ...currentDay,
        ledger_image_url: activeLedgerUrl,
      };

      await exportCustodyDayToPdf(dayWithLedger, {
        user: currentUser,
        dayLogs,
        mode,
        ledgerImageUrl: activeLedgerUrl,
        forceRegenerate: true,
      });
    } catch (err: any) {
      Alert.alert('خطأ في تصدير الـ PDF', err?.message || 'فشل إنشاء ومعاينة تقرير الـ PDF');
    } finally {
      setExportingExcel(false);
    }
  };

  // 7. Save Daily Ledger (Notebook) Photo (بدون مبلغ أو بيانات)
  const handleSaveLedgerImage = async (imageUri: string) => {
    try {
      // Normalize image EXIF orientation so image is straight and upright
      let cleanUri = imageUri;
      try {
        const manip = await manipulateAsync(imageUri, [], {
          compress: 0.88,
          format: SaveFormat.JPEG,
        });
        if (manip.uri) cleanUri = manip.uri;
      } catch (manipErr) {
        console.warn('Failed to pre-normalize ledger image:', manipErr);
      }

      const targetDate = selectedDate;
      const uploadedUrl = await custodyService.setLedgerImage(targetDate, cleanUri);

      // Invalidate PDF cache and evict image cache for target date so new photo is rendered in PDF immediately
      await invalidateCustodyPdfCache(targetDate);
      evictImageCache(uploadedUrl);
      evictImageCache(cleanUri);
      evictImageCache(imageUri);

      // Immediately keep active stored ledger in sync
      setActiveStoredLedger(uploadedUrl);

      // Update state for current day
      setDays((prevDays) => {
        const exists = prevDays.some((d) => d.date === targetDate);
        if (exists) {
          return prevDays.map((d) => (d.date === targetDate ? { ...d, ledger_image_url: uploadedUrl } : d));
        } else {
          const newDay: CustodyDayData = {
            id: `temp_${Date.now()}`,
            date: targetDate,
            opening_balance: effectiveOpeningBalance,
            added_amount: 0,
            custody_value: effectiveOpeningBalance,
            total_expenses: 0,
            closing_balance: effectiveOpeningBalance,
            expenses: [],
            ledger_image_url: uploadedUrl,
            totals: {
              fuel: 0,
              internet_advance: 0,
              advance: 0,
              license: 0,
              spare_parts: 0,
              other: 0,
            },
            created_at: new Date().toISOString(),
          };
          return [newDay, ...prevDays];
        }
      });

      // Update cached days in AsyncStorage
      const bId = activeBranch.id || getActiveBranchId() || null;
      AsyncStorage.getItem(getDaysCacheKey(bId)).then((cachedStr) => {
        if (cachedStr) {
          try {
            const parsed: CustodyDayData[] = JSON.parse(cachedStr);
            const exists = parsed.some((d) => d.date === targetDate);
            const fallbackDay: CustodyDayData = {
              id: `temp_${Date.now()}`,
              date: targetDate,
              opening_balance: effectiveOpeningBalance,
              added_amount: 0,
              custody_value: effectiveOpeningBalance,
              total_expenses: 0,
              closing_balance: effectiveOpeningBalance,
              expenses: [],
              ledger_image_url: uploadedUrl,
              totals: {
                fuel: 0,
                internet_advance: 0,
                advance: 0,
                license: 0,
                spare_parts: 0,
                other: 0,
              },
              created_at: new Date().toISOString(),
            };
            const updated = exists
              ? parsed.map((d) => (d.date === targetDate ? { ...d, ledger_image_url: uploadedUrl } : d))
              : [fallbackDay, ...parsed];
            AsyncStorage.setItem(getDaysCacheKey(bId), JSON.stringify(updated)).catch(() => {});
          } catch (_) {}
        }
      }).catch(() => {});

      setAlertConfig({
        type: 'success',
        title: 'تم بنجاح',
        message: 'تم حفظ وإرفاق صورة الدفتر اليومي للعهدة بنجاح',
      });
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل حفظ صورة الدفتر اليومي');
    }
  };

  const custodyAddedLogs = dayLogs.filter((l) => l.action_type === 'ADD_CUSTODY');
  const custodyTotalAvailable = effectiveOpeningBalance + (currentDay?.added_amount ?? 0);
  const spentPct = custodyTotalAvailable > 0
    ? Math.min(100, Math.round(((currentDay?.total_expenses ?? 0) / custodyTotalAvailable) * 100))
    : 0;

  return (
    <SafeAreaView
      edges={showProfile || showDayExpensesPage ? ['left', 'right'] : ['top', 'bottom', 'left', 'right']}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {showProfile ? (
        <View style={{ flex: 1, marginTop: topInset }}>
          <ModuleErrorBoundary moduleName="AhdaProfileScreen" onReset={() => setShowProfile(false)}>
            <AhdaProfileScreen
              currentUser={currentUser}
              colors={colors}
              isDarkMode={isDarkMode}
              onBack={() => setShowProfile(false)}
              onLogout={onLogout}
              onToggleTheme={onToggleTheme}
              themePreference={themePreference}
              onSelectThemePreference={onSelectThemePreference}
              onUpdateUser={onUpdateUser}
            />
          </ModuleErrorBoundary>
        </View>
      ) : showDayExpensesPage ? (
        <View style={{ flex: 1, marginTop: topInset }}>
          <ModuleErrorBoundary moduleName="AhdaDayExpensesScreen" onReset={handleCloseDayExpenses}>
            <AhdaDayExpensesScreen
              currentDay={currentDay}
              selectedDate={selectedDate}
              categoryFilter={selectedCategoryFilter}
              loading={loading}
              colors={colors}
              isDarkMode={isDarkMode}
              categories={CATEGORIES}
              onBack={handleCloseDayExpenses}
              onOpenAddExpense={() => {
                if (selectedCategoryFilter) {
                  setSelectedCategory(selectedCategoryFilter);
                }
                setShowAddExpenseModal(true);
              }}
              onEditExpense={handleOpenEditExpense}
              onDeleteExpense={handleDeleteExpense}
              onPreviewImage={(url) => setPreviewImage(url)}
              onReorderExpenses={handleReorderExpenses}
              initialExpenseDetails={initialExpenseForDetails}
              onClearInitialExpenseDetails={() => setInitialExpenseForDetails(null)}
            />
          </ModuleErrorBoundary>
        </View>
      ) : (
        <>
          {/* ── 1. Clean Fixed Header (Natively padded by SafeAreaView, zero lag, never overlaps) ── */}
          <View style={styles.fixedHeaderWrap}>
            <AhdaHeader
              user={currentUser}
              colors={colors}
              isDarkMode={isDarkMode}
              activeBranchName={activeBranch.name}
              canSwitchBranch={canSwitchBranch}
              onPressProfile={handlePressProfile}
              onPressSearch={handlePressSearch}
              onPressBranchSelector={handlePressBranchSelector}
              onPressDatePicker={handlePressDatePicker}
            />
          </View>

          {/* ── Main Home Cards (Balanced Viewport, Pull-To-Refresh Supported) ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={true}
            alwaysBounceVertical={true}
            overScrollMode="always"
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: 8,
                paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16,
                flexGrow: 1,
                justifyContent: 'space-evenly',
              },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#047857']}
                tintColor="#047857"
                progressBackgroundColor={colors.card}
              />
            }
          >
            {loading ? (
              <>
                <AhdaNetCustodyCardSkeleton colors={colors} isDarkMode={isDarkMode} />
                <AhdaCategoryGridSkeleton colors={colors} isDarkMode={isDarkMode} />
                <AhdaDayExpensesSummaryCardSkeleton colors={colors} isDarkMode={isDarkMode} />
              </>
            ) : (
              <>
                {/* ── 2. Primary Custody Target Card (Delegate App Style - Isolated) ── */}
                <ModuleErrorBoundary moduleName="AhdaNetCustodyCard">
                  <AhdaNetCustodyCard
                    currentDay={currentDay}
                    effectiveOpeningBalance={effectiveOpeningBalance}
                    custodyAddedLogs={custodyAddedLogs}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    selectedDate={selectedDate}
                    onPressCard={() => setShowAddCustodyModal(true)}
                    onPressManageLogs={() => setShowLogsSheet(true)}
                    onSwipePrevDay={() => changeDateByDays(-1)}
                    onSwipeNextDay={() => changeDateByDays(1)}
                  />
                </ModuleErrorBoundary>

                {/* ── 3. Category Breakdown Grid (Isolated & Fault-Tolerant) ── */}
                <ModuleErrorBoundary moduleName="AhdaCategoryGrid">
                  <AhdaCategoryGrid
                    categories={CATEGORIES}
                    currentDay={currentDay}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    onSelectCategory={(catKey) => {
                      setSelectedCategory(catKey);
                      setShowAddExpenseModal(true);
                    }}
                    onLongPressCategory={(catKey) => {
                      setInitialExpenseForDetails(null);
                      setSelectedCategoryFilter(catKey);
                      setShowDayExpensesPage(true);
                    }}
                  />
                </ModuleErrorBoundary>

                {/* ── 4. Simple Invoices Summary Card with Embedded PDF Button ── */}
                <ModuleErrorBoundary moduleName="AhdaDayExpensesSummaryCard">
                  <AhdaDayExpensesSummaryCard
                    currentDay={currentDay}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    loadingPdf={exportingExcel}
                    onPress={() => {
                      setInitialExpenseForDetails(null);
                      setSelectedCategoryFilter(null);
                      setShowDayExpensesPage(true);
                    }}
                    onPressPdf={async () => {
                      const expensesCount = currentDay?.expenses?.length || 0;
                      if (expensesCount === 0) {
                        setShowNoInvoicesNoticeModal(true);
                      } else {
                        await handleExportPdf('share');
                      }
                    }}
                    onLongPressPdf={() => {
                      const expensesCount = currentDay?.expenses?.length || 0;
                      if (expensesCount === 0) {
                        setShowNoInvoicesNoticeModal(true);
                      } else {
                        setShowReportPreviewModal(true);
                      }
                    }}
                  />
                </ModuleErrorBoundary>
              </>
            )}
          </ScrollView>
        </>
      )}

      {/* ── 6. BOTTOM SHEET MODAL: Add Expense & Invoice (Conditionally Mounted) ── */}
      {showAddExpenseModal && (
        <ModuleErrorBoundary moduleName="AhdaAddExpenseModal">
          <AhdaAddExpenseModal
            visible={showAddExpenseModal}
            colors={colors}
            isDarkMode={isDarkMode}
            categories={CATEGORIES}
            selectedCategory={selectedCategory}
            expenseAmount={expenseAmount}
            setExpenseAmount={setExpenseAmount}
            expenseRecipient={expenseRecipient}
            setExpenseRecipient={setExpenseRecipient}
            exportNumber={exportNumber}
            setExportNumber={setExportNumber}
            invoiceImageUri={invoiceImageUri}
            setInvoiceImageUri={setInvoiceImageUri}
            loading={addExpenseLoading}
            onPickImage={handlePickImage}
            onSave={handleSaveExpense}
            onClose={() => setShowAddExpenseModal(false)}
          />
        </ModuleErrorBoundary>
      )}

      {/* ── 7. BOTTOM SHEET MODAL: Edit Expense (Conditionally Mounted) ── */}
      {!!editingExpense && (
        <ModuleErrorBoundary moduleName="AhdaEditExpenseModal">
          <AhdaEditExpenseModal
            visible={!!editingExpense}
            colors={colors}
            isDarkMode={isDarkMode}
            categories={CATEGORIES}
            editCategory={editCategory}
            setEditCategory={(newCat) => {
              setEditCategory(newCat);
              if ((newCat === 'internet_advance' || newCat === 'advance') && !editExportNumber.trim()) {
                setEditExportNumber(calculateNextExportNumber(days));
              }
            }}
            editAmount={editAmount}
            setEditAmount={setEditAmount}
            editRecipient={editRecipient}
            setEditRecipient={setEditRecipient}
            editDate={editDate}
            setEditDate={setEditDate}
            days={days}
            editExportNumber={editExportNumber}
            setEditExportNumber={setEditExportNumber}
            editImageUri={editImageUri}
            setEditImageUri={setEditImageUri}
            onPickImage={handlePickEditImage}
            loading={editLoading}
            onSave={handleSaveEditExpense}
            onDelete={() => {
              const item = editingExpense;
              if (item) {
                setEditingExpense(null);
                handleDeleteExpense(item);
              }
            }}
            onClose={() => setEditingExpense(null)}
          />
        </ModuleErrorBoundary>
      )}

      {/* ── 8. BOTTOM SHEET MODAL: Add Custody Amount (Conditionally Mounted) ── */}
      {showAddCustodyModal && (
        <ModuleErrorBoundary moduleName="AhdaAddCustodyModal">
          <AhdaAddCustodyModal
            visible={showAddCustodyModal}
            colors={colors}
            selectedDate={selectedDate}
            custodyTotalAvailable={custodyTotalAvailable}
            addCustodyAmount={addCustodyAmount}
            setAddCustodyAmount={setAddCustodyAmount}
            loading={addCustodyLoading}
            onSave={handleSaveCustodyAmount}
            onClose={() => setShowAddCustodyModal(false)}
          />
        </ModuleErrorBoundary>
      )}

      {/* ── 9. BOTTOM SHEET MODAL: Manage Custody Logs (Conditionally Mounted) ── */}
      {showLogsSheet && (
        <ModuleErrorBoundary moduleName="AhdaCustodyLogsModal">
          <AhdaCustodyLogsModal
            visible={showLogsSheet}
            colors={colors}
            logs={custodyAddedLogs}
            onDeleteLog={handleDeleteCustodyEntry}
            onClose={() => setShowLogsSheet(false)}
          />
        </ModuleErrorBoundary>
      )}

      {/* ── 10. BOTTOM SHEET MODAL: Date Picker (Conditionally Mounted) ── */}
      {showDatePickerModal && (
        <ModuleErrorBoundary moduleName="AhdaDatePickerModal">
          <AhdaDatePickerModal
            visible={showDatePickerModal}
            colors={colors}
            isDarkMode={isDarkMode}
            selectedDate={selectedDate}
            pickerYear={pickerYear}
            setPickerYear={setPickerYear}
            pickerMonth={pickerMonth}
            setPickerMonth={setPickerMonth}
            days={days}
            onSelectDate={(newDate) => {
              updateSelectedDate(newDate);
              setShowDatePickerModal(false);
            }}
            onClose={() => setShowDatePickerModal(false)}
          />
        </ModuleErrorBoundary>
      )}

      {/* ── 11. Fullscreen Image Viewer Modal (Conditionally Mounted) ── */}
      {!!previewImage && (
        <ModuleErrorBoundary moduleName="AhdaImageViewerModal">
          <AhdaImageViewerModal
            visible={!!previewImage}
            imageUrl={previewImage}
            onClose={() => setPreviewImage(null)}
          />
        </ModuleErrorBoundary>
      )}



      {/* ── 12a. Auto-dismissing Empty Invoices Warning Modal (Lottie EbQYDZdEzt) ── */}
      {showNoInvoicesNoticeModal && (
        <AhdaNoInvoicesAutoModal
          visible={showNoInvoicesNoticeModal}
          colors={colors}
          isDarkMode={isDarkMode}
          onClose={() => setShowNoInvoicesNoticeModal(false)}
        />
      )}

      {/* ── 12b. Fullscreen In-App Report Preview Modal (Conditionally Mounted) ── */}
      {showReportPreviewModal && (
        <ModuleErrorBoundary moduleName="AhdaReportPreviewModal">
          <AhdaReportPreviewModal
            visible={showReportPreviewModal}
            currentDay={
              currentDay
                ? { ...currentDay, ledger_image_url: activeStoredLedger || currentDay.ledger_image_url }
                : null
            }
            selectedDate={selectedDate}
            currentUser={currentUser}
            dayLogs={dayLogs}
            effectiveOpeningBalance={effectiveOpeningBalance}
            colors={colors}
            isDarkMode={isDarkMode}
            loading={exportingExcel}
            onClose={() => setShowReportPreviewModal(false)}
            onExportAndShare={async () => {
              await handleExportPdf('share');
            }}
            onPreviewImage={(url) => setPreviewImage(url)}
            onUpdateLedgerImage={handleSaveLedgerImage}
          />
        </ModuleErrorBoundary>
      )}

      {/* ── 13. Shared Image Category Selection Modal (Conditionally Mounted) ── */}
      {!!sharedImagePending && (
        <ModuleErrorBoundary moduleName="AhdaSharedImageCategoryModal">
          <AhdaSharedImageCategoryModal
            visible={!!sharedImagePending}
            imageUri={sharedImagePending}
            categories={CATEGORIES}
            colors={colors}
            isDarkMode={isDarkMode}
            onSelectLedger={() => {
              const uri = sharedImagePending;
              setSharedImagePending(null);
              if (uri) {
                handleSaveLedgerImage(uri);
              }
            }}
            onSelectCategory={(catKey) => {
              setSelectedCategory(catKey);
              setInvoiceImageUri(sharedImagePending);
              setSharedImagePending(null);
              setShowAddExpenseModal(true);
            }}
            onClose={() => setSharedImagePending(null)}
          />
        </ModuleErrorBoundary>
      )}

      {/* ── 14. Animated Action Alert Modal with Lottie (Conditionally Mounted) ── */}
      {!!alertConfig && (
        <AhdaActionAlertModal
          config={alertConfig}
          colors={colors}
          isDarkMode={isDarkMode}
          onClose={() => setAlertConfig(null)}
        />
      )}

      {/* ── 15. Multi-Branch Selector Modal (Conditionally Mounted) ── */}
      {canSwitchBranch && showBranchModal && (
        <AhdaBranchSelectorModal
          visible={showBranchModal}
          colors={colors}
          isDarkMode={isDarkMode}
          branches={branches}
          selectedBranchId={activeBranch?.id || null}
          mustSelect={mustSelectBranch}
          onSelectBranch={handleSelectBranch}
          onClose={() => {
            if (!mustSelectBranch) {
              setShowBranchModal(false);
            }
          }}
        />
      )}

      {/* ── 16. Search Bottom Sheet Modal (Conditionally Mounted) ── */}
      {showSearchModal && (
        <AhdaSearchBottomSheet
          visible={showSearchModal}
          colors={colors}
          isDarkMode={isDarkMode}
          days={days}
          categories={CATEGORIES}
          onClose={() => setShowSearchModal(false)}
          onSelectExpense={(exp, day) => {
            if (day.date !== selectedDate) {
              searchReturnDateRef.current = selectedDate;
              updateSelectedDate(day.date);
            }
            setSelectedCategoryFilter(exp.category);
            setInitialExpenseForDetails(exp);
            setShowDayExpensesPage(true);
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeaderWrap: {
    width: '100%',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  keyboardModalWrapper: {
    flex: 1,
  },
  dateHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  dateNavArrowBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  datePillBtn: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  datePillText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  todayTag: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  todayTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#047857',
  },
  centerLoading: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  searchBoxCard: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  searchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    paddingVertical: 0,
  },
  searchResultsWrap: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultsHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#cbd5e1',
  },
  searchResultsTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  searchEmptyBox: {
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
  },
  searchEmptyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchResultCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchCatBadge: {
    width: 22,
    height: 22,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchExportBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  searchExportBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  searchDatePill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  searchDateText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

