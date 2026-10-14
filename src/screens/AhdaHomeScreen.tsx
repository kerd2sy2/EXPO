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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemeColors } from '../types/delegate';
import {
  custodyService,
  CustodyDayData,
  CustodyExpenseItem,
  CustodyLogItem,
} from '../services/custodyService';
import { exportCustodyDayToPdf } from '../services/custodyPdfService';
import { formatImageUrl } from '../services/api';
import { toArabicDigits, formatArabicNumber } from '../utils/formatters';
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
import { AhdaShakeExcelModal } from '../components/modals/AhdaShakeExcelModal';
import { AhdaSharedImageCategoryModal } from '../components/modals/AhdaSharedImageCategoryModal';
import { useShareIntent } from 'expo-share-intent';
import { useDeviceShake } from '../hooks/useDeviceShake';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import {
  AhdaNetCustodyCardSkeleton,
  AhdaCategoryGridSkeleton,
  AhdaDayExpensesSummaryCardSkeleton,
} from '../components/skeleton/AhdaHomeSkeleton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HOME_HEADER_HEIGHT = 64;
const CUSTODY_DAYS_CACHE_KEY = 'aams_custody_days_cache';
const getLogsCacheKey = (date: string) => `aams_custody_logs_cache_${date}`;

interface AhdaHomeScreenProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  currentUser: any;
  onLogout: () => void;
  onToggleTheme: () => void;
}

// Categories ordered according to user priority:
// بنزين -> سلفة نت -> سلفة شخصية -> رخصة قيادة -> قطع غيار -> مصاريف أخرى
const CATEGORIES = [
  { key: 'fuel', label: 'بنزين', icon: 'speedometer-outline', color: '#ea580c', bg: '#fff7ed' },
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
  const [days, setDays] = useState<CustodyDayData[]>([]);
  const [dayLogs, setDayLogs] = useState<CustodyLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showProfile, setShowProfile] = useState<boolean>(false);

  // Scroll Header Animation (Hides on scroll down, shows on scroll up - exactly like delegate app)
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isHeaderHidden = useRef(false);
  const scrollDelta = useRef(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentY = event.nativeEvent.contentOffset.y;
    const diff = currentY - lastScrollY.current;
    lastScrollY.current = currentY;

    if (currentY <= 10) {
      scrollDelta.current = 0;
      if (isHeaderHidden.current) {
        isHeaderHidden.current = false;
        Animated.spring(headerTranslateY, {
          toValue: 0,
          damping: 20,
          stiffness: 220,
          useNativeDriver: true,
        }).start();
      }
      return;
    }

    if (diff > 0) {
      if (scrollDelta.current < 0) scrollDelta.current = 0;
      scrollDelta.current += diff;
      if (scrollDelta.current >= 6 && currentY > 15 && !isHeaderHidden.current) {
        isHeaderHidden.current = true;
        Animated.timing(headerTranslateY, {
          toValue: -HOME_HEADER_HEIGHT,
          duration: 180,
          useNativeDriver: true,
        }).start();
      }
    } else if (diff < 0) {
      if (scrollDelta.current > 0) scrollDelta.current = 0;
      scrollDelta.current += diff;
      if (scrollDelta.current <= -6 && isHeaderHidden.current) {
        isHeaderHidden.current = false;
        Animated.spring(headerTranslateY, {
          toValue: 0,
          damping: 20,
          stiffness: 220,
          useNativeDriver: true,
        }).start();
      }
    }
  };

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
  const [invoiceImageUri, setInvoiceImageUri] = useState<string | null>(null);
  const [addExpenseLoading, setAddExpenseLoading] = useState<boolean>(false);

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<CustodyExpenseItem | null>(null);
  const [editCategory, setEditCategory] = useState<string>('fuel');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editRecipient, setEditRecipient] = useState<string>('');
  const [editImageUri, setEditImageUri] = useState<string | null>(null);
  const [editLoading, setEditLoading] = useState<boolean>(false);

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);
  const [showShakeExcelModal, setShowShakeExcelModal] = useState<boolean>(false);

  // Incoming Shared Image from Android Share Sheet
  const [sharedImagePending, setSharedImagePending] = useState<string | null>(null);
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent();

  useEffect(() => {
    if (hasShareIntent && shareIntent?.files && shareIntent.files.length > 0) {
      const incomingFile = shareIntent.files[0];
      const targetUri = incomingFile?.path;
      if (targetUri) {
        setSharedImagePending(targetUri);
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent, resetShareIntent]);

  // Date Navigator Modal (Calendar Month Bottom sheet)
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState<number>(new Date().getMonth() + 1);

  // Shake detection with medium threshold (neither too weak nor too strong: 1.78g)
  useDeviceShake(() => {
    // Only open if no other primary modals are open
    if (!showAddExpenseModal && !showAddCustodyModal && !editingExpense) {
      setShowShakeExcelModal(true);
    }
  }, { threshold: 1.78, timeoutMs: 1200 });

  // 1. Instant cache restoration on mount / date change (0ms screen load)
  useEffect(() => {
    let isMounted = true;
    const restoreFromCache = async () => {
      try {
        const [cachedDaysStr, cachedLogsStr] = await Promise.all([
          AsyncStorage.getItem(CUSTODY_DAYS_CACHE_KEY),
          AsyncStorage.getItem(getLogsCacheKey(selectedDate)),
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
      } catch (_) {}
    };
    restoreFromCache();
    return () => {
      isMounted = false;
    };
  }, [selectedDate]);

  // 2. Fetch all days and logs for current date (Stale-While-Revalidate)
  const loadCustodyData = useCallback(async (silent = false) => {
    if (!silent && days.length === 0) {
      setLoading(true);
    }
    try {
      const [daysData, logsData] = await Promise.all([
        custodyService.getDays(),
        custodyService.getLogs(selectedDate),
      ]);
      if (Array.isArray(daysData)) {
        setDays(daysData);
        AsyncStorage.setItem(CUSTODY_DAYS_CACHE_KEY, JSON.stringify(daysData)).catch(() => {});
      }
      const freshLogs = logsData?.data || [];
      setDayLogs(freshLogs);
      AsyncStorage.setItem(getLogsCacheKey(selectedDate), JSON.stringify(freshLogs)).catch(() => {});
    } catch (err: any) {
      console.error('Error fetching custody data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, days.length]);

  useEffect(() => {
    loadCustodyData(days.length > 0);
  }, [selectedDate]);

  // Handle hardware Back button: return to previous view/modal instead of closing the entire app
  useEffect(() => {
    const onBackPress = () => {
      if (sharedImagePending) {
        setSharedImagePending(null);
        return true;
      }
      if (showShakeExcelModal) {
        setShowShakeExcelModal(false);
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
        setShowDayExpensesPage(false);
        setSelectedCategoryFilter(null);
        return true;
      }
      if (showProfile) {
        setShowProfile(false);
        return true;
      }
      // If we are on the main Home screen with nothing open, allow default behavior (exit app)
      return false;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [
    sharedImagePending,
    showShakeExcelModal,
    previewImage,
    showDatePickerModal,
    showLogsSheet,
    editingExpense,
    showAddExpenseModal,
    showAddCustodyModal,
    showDayExpensesPage,
    showProfile,
  ]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCustodyData();
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

  // Handle Day Navigation
  const changeDateByDays = (delta: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + delta);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
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
        });
      } else {
        await custodyService.createDay({
          date: selectedDate,
          added_amount: val,
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

      await custodyService.addExpense(targetDayId, {
        category: selectedCategory,
        amount: amt,
        recipient_name: expenseRecipient.trim() || '—',
        image_url: uploadedUrl,
      });

      setExpenseAmount('');
      setExpenseRecipient('');
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
    setEditImageUri(item.image_url ? formatImageUrl(item.image_url) : null);
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

      await custodyService.updateExpense(editingExpense.id, {
        category: editCategory,
        amount: amt,
        recipient_name: editRecipient.trim() || '—',
        image_url: finalImageUrl,
      });

      setEditingExpense(null);
      setEditImageUri(null);
      await loadCustodyData();
      setAlertConfig({
        type: 'success',
        title: 'تم تعديل الفاتورة',
        message: 'تم تحديث بيانات الفاتورة وإعادة احتساب الرصيد بنجاح.',
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

  // 6. PDF Export with Full Receipts and Embedded Images
  const handleExportPdf = async () => {
    if (!currentDay) {
      Alert.alert('تنبيه', 'لا توجد بيانات عهدة مسجلة لتصديرها لهذا اليوم');
      return;
    }

    try {
      setExportingExcel(true);
      await exportCustodyDayToPdf(currentDay, {
        user: currentUser,
        dayLogs,
      });
    } catch (err: any) {
      Alert.alert('خطأ في تصدير الـ PDF', err?.message || 'فشل إنشاء ومشاركة تقرير الـ PDF');
    } finally {
      setExportingExcel(false);
    }
  };

  if (showProfile) {
    return (
      <AhdaProfileScreen
        currentUser={currentUser}
        colors={colors}
        isDarkMode={isDarkMode}
        onBack={() => setShowProfile(false)}
        onLogout={onLogout}
        onToggleTheme={onToggleTheme}
      />
    );
  }

  if (showDayExpensesPage) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AhdaDayExpensesScreen
          currentDay={currentDay}
          selectedDate={selectedDate}
          categoryFilter={selectedCategoryFilter}
          loading={loading}
          colors={colors}
          isDarkMode={isDarkMode}
          categories={CATEGORIES}
          onBack={() => {
            setShowDayExpensesPage(false);
            setSelectedCategoryFilter(null);
          }}
          onOpenAddExpense={() => {
            if (selectedCategoryFilter) {
              setSelectedCategory(selectedCategoryFilter);
            }
            setShowAddExpenseModal(true);
          }}
          onEditExpense={handleOpenEditExpense}
          onDeleteExpense={handleDeleteExpense}
          onPreviewImage={(url) => setPreviewImage(url)}
        />

        {/* ── Add Expense Modal inside Day Expenses View (Isolated & Protected) ── */}
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
            invoiceImageUri={invoiceImageUri}
            setInvoiceImageUri={setInvoiceImageUri}
            loading={addExpenseLoading}
            onPickImage={handlePickImage}
            onSave={handleSaveExpense}
            onClose={() => setShowAddExpenseModal(false)}
          />
        </ModuleErrorBoundary>

        {/* ── Edit Expense Modal inside Day Expenses View (Isolated & Protected) ── */}
        <ModuleErrorBoundary moduleName="AhdaEditExpenseModal">
          <AhdaEditExpenseModal
            visible={!!editingExpense}
            colors={colors}
            isDarkMode={isDarkMode}
            categories={CATEGORIES}
            editCategory={editCategory}
            setEditCategory={setEditCategory}
            editAmount={editAmount}
            setEditAmount={setEditAmount}
            editRecipient={editRecipient}
            setEditRecipient={setEditRecipient}
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

        {/* ── Image Viewer Modal inside Day Expenses View (Isolated & Protected) ── */}
        <ModuleErrorBoundary moduleName="AhdaImageViewerModal">
          <AhdaImageViewerModal
            visible={!!previewImage}
            imageUrl={previewImage}
            onClose={() => setPreviewImage(null)}
          />
        </ModuleErrorBoundary>

        {/* Animated Alert Modal with Lottie in Expenses Page */}
        <AhdaActionAlertModal
          config={alertConfig}
          colors={colors}
          isDarkMode={isDarkMode}
          onClose={() => setAlertConfig(null)}
        />
      </View>
    );
  }

  const custodyAddedLogs = dayLogs.filter((l) => l.action_type === 'ADD_CUSTODY');
  const custodyTotalAvailable = effectiveOpeningBalance + (currentDay?.added_amount ?? 0);
  const spentPct = custodyTotalAvailable > 0
    ? Math.min(100, Math.round(((currentDay?.total_expenses ?? 0) / custodyTotalAvailable) * 100))
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['left', 'right']}>
      {/* ── Status Bar Solid Cover (Hides header completely when it slides up under status bar) ── */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: topInset,
          backgroundColor: colors.bg,
          zIndex: 40,
        }}
        pointerEvents="none"
      />

      {/* ── 1. Collapsible Header (hides on scroll down, shows on scroll up) ── */}
      <Animated.View
        style={{
          position: 'absolute',
          top: topInset,
          left: 0,
          right: 0,
          height: HOME_HEADER_HEIGHT,
          backgroundColor: colors.bg,
          zIndex: 30,
          transform: [{ translateY: headerTranslateY }],
        }}
      >
        <AhdaHeader
          user={currentUser}
          colors={colors}
          isDarkMode={isDarkMode}
          onPressProfile={() => setShowProfile(true)}
          onPressDatePicker={() => {
            const parts = selectedDate.split('-');
            setPickerYear(parseInt(parts[0], 10) || new Date().getFullYear());
            setPickerMonth(parseInt(parts[1], 10) || (new Date().getMonth() + 1));
            setShowDatePickerModal(true);
          }}
        />
      </Animated.View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topInset + HOME_HEADER_HEIGHT + 14,
            paddingBottom: 28,
            flexGrow: 1,
            justifyContent: 'space-around',
          },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />}
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
                onPressCard={() => setShowAddCustodyModal(true)}
                onPressManageLogs={() => setShowLogsSheet(true)}
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
                  setSelectedCategoryFilter(catKey);
                  setShowDayExpensesPage(true);
                }}
                onLongPressCategory={(catKey) => {
                  setSelectedCategory(catKey);
                  setShowAddExpenseModal(true);
                }}
              />
            </ModuleErrorBoundary>

            {/* ── 4. Simple Invoices Summary Card (Isolated & Fault-Tolerant) ── */}
            <ModuleErrorBoundary moduleName="AhdaDayExpensesSummaryCard">
              <AhdaDayExpensesSummaryCard
                currentDay={currentDay}
                onPress={() => setShowDayExpensesPage(true)}
              />
            </ModuleErrorBoundary>
          </>
        )}
      </ScrollView>

      {/* ── 6. BOTTOM SHEET MODAL: Add Expense & Invoice (Isolated & Fault-Tolerant) ── */}
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
          invoiceImageUri={invoiceImageUri}
          setInvoiceImageUri={setInvoiceImageUri}
          loading={addExpenseLoading}
          onPickImage={handlePickImage}
          onSave={handleSaveExpense}
          onClose={() => setShowAddExpenseModal(false)}
        />
      </ModuleErrorBoundary>

      {/* ── 7. BOTTOM SHEET MODAL: Edit Expense (Isolated & Fault-Tolerant) ── */}
      <ModuleErrorBoundary moduleName="AhdaEditExpenseModal">
        <AhdaEditExpenseModal
          visible={!!editingExpense}
          colors={colors}
          isDarkMode={isDarkMode}
          categories={CATEGORIES}
          editCategory={editCategory}
          setEditCategory={setEditCategory}
          editAmount={editAmount}
          setEditAmount={setEditAmount}
          editRecipient={editRecipient}
          setEditRecipient={setEditRecipient}
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

      {/* ── 8. BOTTOM SHEET MODAL: Add Custody Amount (Isolated & Fault-Tolerant) ── */}
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

      {/* ── 9. BOTTOM SHEET MODAL: Manage Custody Logs (Isolated & Fault-Tolerant) ── */}
      <ModuleErrorBoundary moduleName="AhdaCustodyLogsModal">
        <AhdaCustodyLogsModal
          visible={showLogsSheet}
          colors={colors}
          logs={custodyAddedLogs}
          onDeleteLog={handleDeleteCustodyEntry}
          onClose={() => setShowLogsSheet(false)}
        />
      </ModuleErrorBoundary>

      {/* ── 10. BOTTOM SHEET MODAL: Date Picker (Isolated & Fault-Tolerant) ── */}
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
            setSelectedDate(newDate);
            setShowDatePickerModal(false);
          }}
          onClose={() => setShowDatePickerModal(false)}
        />
      </ModuleErrorBoundary>

      {/* ── 11. Fullscreen Image Viewer Modal (Isolated & Fault-Tolerant) ── */}
      <ModuleErrorBoundary moduleName="AhdaImageViewerModal">
        <AhdaImageViewerModal
          visible={!!previewImage}
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      </ModuleErrorBoundary>

      {/* ── 12. Shake to Export Excel Bottom Sheet Modal (Isolated & Fault-Tolerant) ── */}
      <ModuleErrorBoundary moduleName="AhdaShakeExcelModal">
        <AhdaShakeExcelModal
          visible={showShakeExcelModal}
          selectedDate={selectedDate}
          colors={colors}
          isDarkMode={isDarkMode}
          loading={exportingExcel}
          onExportAndShare={async () => {
            await handleExportPdf();
            setShowShakeExcelModal(false);
          }}
          onClose={() => setShowShakeExcelModal(false)}
        />
      </ModuleErrorBoundary>

      {/* ── 13. Shared Image Category Selection Modal (From Android Share Sheet) ── */}
      <ModuleErrorBoundary moduleName="AhdaSharedImageCategoryModal">
        <AhdaSharedImageCategoryModal
          visible={!!sharedImagePending}
          imageUri={sharedImagePending}
          categories={CATEGORIES}
          colors={colors}
          isDarkMode={isDarkMode}
          onSelectCategory={(catKey) => {
            setSelectedCategory(catKey);
            setInvoiceImageUri(sharedImagePending);
            setSharedImagePending(null);
            setShowAddExpenseModal(true);
          }}
          onClose={() => setSharedImagePending(null)}
        />
      </ModuleErrorBoundary>

      {/* ── 14. Animated Action Alert Modal with Lottie (Attention, Error, Success) ── */}
      <AhdaActionAlertModal
        config={alertConfig}
        colors={colors}
        isDarkMode={isDarkMode}
        onClose={() => setAlertConfig(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
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
    backgroundColor: '#fff7ed',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  todayTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
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
});

