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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ThemeColors } from '../types/delegate';
import {
  custodyService,
  CustodyDayData,
  CustodyExpenseItem,
  CustodyLogItem,
} from '../services/custodyService';
import { exportCustodyDayToExcel } from '../services/custodyExcelService';
import { formatImageUrl } from '../services/api';
import { AhdaHeader } from '../components/AhdaHeader';
import { AhdaProfileScreen } from './AhdaProfileScreen';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HOME_HEADER_HEIGHT = 64;

interface AhdaHomeScreenProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  currentUser: any;
  onLogout: () => void;
  onToggleTheme: () => void;
}

// Categories ordered according to user priority:
// وقود / بنزين -> سلفة نت -> سلفة شخصية -> رخصة قيادة -> قطع غيار -> مصاريف أخرى
const CATEGORIES = [
  { key: 'fuel', label: 'بنزين / وقود', icon: 'speedometer-outline', color: '#ea580c', bg: '#fff7ed' },
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
  const [editLoading, setEditLoading] = useState<boolean>(false);

  // Preview Image Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  // Date Navigator Modal (Bottom sheet)
  const [showDatePickerModal, setShowDatePickerModal] = useState<boolean>(false);
  const [customDateInput, setCustomDateInput] = useState<string>(getTodayStr());

  // Fetch all days and logs for current date
  const loadCustodyData = useCallback(async () => {
    try {
      const [daysData, logsData] = await Promise.all([
        custodyService.getDays(),
        custodyService.getLogs(selectedDate),
      ]);
      setDays(daysData || []);
      setDayLogs(logsData?.data || []);
    } catch (err: any) {
      console.error('Error fetching custody data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadCustodyData();
  }, [loadCustodyData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCustodyData();
  };

  // Find active day
  const currentDay = useMemo(() => {
    return days.find((d) => d.date === selectedDate) || null;
  }, [days, selectedDate]);

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
      Alert.alert('خطأ', 'يرجى إدخال مبلغ عهدة صحيح أكبر من الصفر');
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
      Alert.alert('تمت الإضافة', `تمت إضافة ${val} ريال إلى عهدة يوم ${selectedDate} بنجاح`);
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل تحديث العهدة');
    } finally {
      setAddCustodyLoading(false);
    }
  };

  // 2. Delete / Undo an added custody amount from logs
  const handleDeleteCustodyEntry = (log: CustodyLogItem) => {
    Alert.alert(
      'تأكيد حذف مبلغ العهدة',
      `هل أنت متأكد من حذف وإلغاء مبلغ العهدة (${log.amount} ريال) المضاف لهذا اليوم؟ سيتم إنقاص العهدة فوراً.`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف المبلغ',
          style: 'destructive',
          onPress: async () => {
            try {
              await custodyService.deleteLog(log.id);
              await loadCustodyData();
              Alert.alert('تم الحذف', 'تم حذف مبلغ العهدة وإعادة احتساب الرصيد بنجاح');
            } catch (err: any) {
              Alert.alert('خطأ', err?.message || 'فشل حذف مبلغ العهدة');
            }
          },
        },
      ]
    );
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
      Alert.alert('خطأ', 'يرجى إدخال مبلغ صحيح للفاتورة');
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
        } catch (uploadErr) {
          console.warn('Invoice image upload error:', uploadErr);
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
      Alert.alert('تم الحفظ', 'تم حفظ الفاتورة بنجاح وإدراجها في شيت العهدة');
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل حفظ الفاتورة');
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
  };

  // 4c. Save Edit Expense
  const handleSaveEditExpense = async () => {
    if (!editingExpense) return;
    const amt = parseFloat(editAmount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('خطأ', 'يرجى إدخال مبلغ صحيح للفاتورة');
      return;
    }

    try {
      setEditLoading(true);
      await custodyService.updateExpense(editingExpense.id, {
        category: editCategory,
        amount: amt,
        recipient_name: editRecipient.trim() || '—',
      });

      setEditingExpense(null);
      await loadCustodyData();
      Alert.alert('تم التعديل', 'تم تعديل الفاتورة وتحديث شيت العهدة بنجاح');
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل تعديل الفاتورة');
    } finally {
      setEditLoading(false);
    }
  };

  // 5. Delete Expense
  const handleDeleteExpense = (item: CustodyExpenseItem) => {
    Alert.alert(
      'تأكيد حذف الفاتورة',
      `هل أنت متأكد من حذف فاتورة "${item.recipient_name || item.category}" بمبلغ ${item.amount} ريال؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await custodyService.deleteExpense(item.id);
              await loadCustodyData();
              Alert.alert('تم الحذف', 'تم حذف الفاتورة بنجاح');
            } catch (err: any) {
              Alert.alert('خطأ', err?.message || 'فشل حذف الفاتورة');
            }
          },
        },
      ]
    );
  };

  // 6. Excel Export
  const handleExportExcel = async () => {
    if (!currentDay) {
      Alert.alert('تنبيه', 'لا توجد بيانات عهدة مسجلة لتصديرها لهذا اليوم');
      return;
    }

    try {
      setExportingExcel(true);
      await exportCustodyDayToExcel(currentDay);
    } catch (err: any) {
      Alert.alert('خطأ في التصدير', err?.message || 'فشل تصدير ملف الإكسل');
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

  const custodyAddedLogs = dayLogs.filter((l) => l.action_type === 'ADD_CUSTODY');
  const custodyTotalAvailable = (currentDay?.opening_balance ?? 0) + (currentDay?.added_amount ?? 0);
  const spentPct = custodyTotalAvailable > 0
    ? Math.min(100, Math.round(((currentDay?.total_expenses ?? 0) / custodyTotalAvailable) * 100))
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['left', 'right']}>
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
            setCustomDateInput(selectedDate);
            setShowDatePickerModal(true);
          }}
          onPressExportExcel={handleExportExcel}
          exportingExcel={exportingExcel}
        />
      </Animated.View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + HOME_HEADER_HEIGHT + 10 }]}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ea580c']} />}
      >
        {/* Date Navigator Header Row */}
        <View style={styles.dateHeaderRow}>
          <TouchableOpacity
            style={[styles.dateNavArrowBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: colors.border }]}
            onPress={() => changeDateByDays(-1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.datePillBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: colors.border }]}
            onPress={() => {
              setCustomDateInput(selectedDate);
              setShowDatePickerModal(true);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={16} color="#ea580c" />
            <Text style={[styles.datePillText, { color: colors.textPrimary }]}>{selectedDate}</Text>
            {selectedDate === getTodayStr() && (
              <View style={styles.todayTag}>
                <Text style={styles.todayTagText}>اليوم</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dateNavArrowBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff', borderColor: colors.border }]}
            onPress={() => changeDateByDays(1)}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>جاري تحميل حسابات العهدة...</Text>
          </View>
        ) : (
          <>
            {/* ── 2. Primary Custody Target Card (Delegate App Style) ── */}
            <TouchableOpacity
              style={[styles.targetCardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowAddCustodyModal(true)}
              activeOpacity={0.9}
            >
              {/* Header: Title + Net Balance */}
              <View style={styles.targetCardHeader}>
                <View style={styles.targetTitleGroup}>
                  <View style={styles.walletIconCircle}>
                    <Ionicons name="wallet-outline" size={18} color="#ea580c" />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.targetCardTitle, { color: colors.textPrimary }]}>
                      صافي العهدة المتبقي
                    </Text>
                    <Text style={styles.targetCardHint}>اضغط هنا لإضافة عهدة جديدة +</Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={[styles.targetNetValue, { color: '#ea580c' }]}>
                    {(currentDay?.closing_balance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Text>
                  <Text style={[styles.targetNetUnit, { color: colors.textSecondary }]}>ريال سعودي</Text>
                </View>
              </View>

              {/* Progress bar showing spent vs available */}
              <View style={styles.targetProgressContainer}>
                <View style={[styles.progressBarTrack, { backgroundColor: isDarkMode ? '#1f2433' : '#f1f5f9' }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.max(3, spentPct)}%`,
                        backgroundColor: spentPct > 85 ? '#ef4444' : '#ea580c',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Footer 3-Stats Details: باقي أمس • المضاف للعهدة • إجمالي المصاريف */}
              <View style={[styles.targetDetailsRow, { borderTopColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
                {/* 1. باقي أمس (افتتاحي) */}
                <View style={styles.detailCol}>
                  <Text style={[styles.detailColLabel, { color: colors.textSecondary }]}>باقي أمس</Text>
                  <Text style={[styles.detailColValue, { color: colors.textPrimary }]}>
                    {(currentDay?.opening_balance ?? 0).toLocaleString()} <Text style={styles.detailColUnit}>ر.س</Text>
                  </Text>
                </View>

                <View style={[styles.detailDivider, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]} />

                {/* 2. عهدة اليوم المضافة */}
                <View style={styles.detailCol}>
                  <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.detailColLabel, { color: '#ea580c' }]}>العهدة المضافة</Text>
                    <Ionicons name="add-circle" size={12} color="#ea580c" />
                  </View>
                  <Text style={[styles.detailColValue, { color: '#ea580c' }]}>
                    +{(currentDay?.added_amount ?? 0).toLocaleString()} <Text style={styles.detailColUnit}>ر.س</Text>
                  </Text>
                  {custodyAddedLogs.length > 0 && (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowLogsSheet(true);
                      }}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={styles.miniLogLink}>{custodyAddedLogs.length} إضافات (إدارة/حذف)</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={[styles.detailDivider, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]} />

                {/* 3. إجمالي المصاريف */}
                <View style={styles.detailCol}>
                  <Text style={[styles.detailColLabel, { color: '#ef4444' }]}>إجمالي المصاريف</Text>
                  <Text style={[styles.detailColValue, { color: '#ef4444' }]}>
                    {(currentDay?.total_expenses ?? 0).toLocaleString()} <Text style={styles.detailColUnit}>ر.س</Text>
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* ── 3. Single Action Button: Add Invoice (Refined & Clean) ── */}
            <TouchableOpacity
              style={styles.addInvoiceHeroBtn}
              activeOpacity={0.88}
              onPress={() => setShowAddExpenseModal(true)}
            >
              <View style={styles.addInvoiceIconCircle}>
                <Ionicons name="add" size={20} color="#ffffff" />
              </View>
              <Text style={styles.addInvoiceHeroBtnText}>إضافة فاتورة / سند صرف جديد</Text>
              <Ionicons name="receipt-outline" size={20} color="#ffffff" style={{ opacity: 0.8 }} />
            </TouchableOpacity>

            {/* ── 4. Category Breakdown Grid ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="pie-chart-outline" size={17} color="#ea580c" />
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>تفصيل المصاريف حسب الأقسام</Text>
              </View>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => {
                  let val = 0;
                  if (cat.key === 'fuel') val = currentDay?.totals?.fuel || 0;
                  else if (cat.key === 'internet_advance') val = currentDay?.totals?.internet_advance || 0;
                  else if (cat.key === 'advance') val = currentDay?.totals?.advance || 0;
                  else if (cat.key === 'license') val = currentDay?.totals?.license || 0;
                  else if (cat.key === 'spare_parts') val = currentDay?.totals?.spare_parts || 0;
                  else if (cat.key === 'other') val = currentDay?.totals?.other || 0;

                  return (
                    <View key={cat.key} style={[styles.categoryCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
                      <View style={styles.categoryCardTop}>
                        <View style={[styles.categoryIconCircle, { backgroundColor: cat.bg }]}>
                          <Ionicons name={cat.icon as any} size={15} color={cat.color} />
                        </View>
                        <Text style={[styles.categoryCardName, { color: colors.textPrimary }]}>{cat.label}</Text>
                      </View>
                      <Text style={[styles.categoryCardValue, { color: cat.color }]}>
                        {val.toLocaleString()} <Text style={styles.categoryCardUnit}>ر.س</Text>
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── 5. Invoices List (Clean Cards like Delegate App) ── */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeaderRow}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="receipt-outline" size={18} color="#ea580c" />
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    فواتير ومصاريف اليوم ({currentDay?.expenses?.length || 0})
                  </Text>
                </View>
              </View>

              {(!currentDay?.expenses || currentDay.expenses.length === 0) ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} style={{ opacity: 0.3 }} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    لا توجد فواتير أو مصاريف مسجلة لهذا اليوم حتى الآن
                  </Text>
                  <TouchableOpacity
                    style={styles.emptyAddBtn}
                    onPress={() => setShowAddExpenseModal(true)}
                  >
                    <Text style={styles.emptyAddBtnText}>+ إضافة أول فاتورة الآن</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.invoicesList}>
                  {currentDay.expenses.map((item, idx) => {
                    const catObj = CATEGORIES.find((c) => c.key === item.category) || CATEGORIES[5];
                    const fullImg = formatImageUrl(item.image_url);

                    return (
                      <View
                        key={item.id || idx}
                        style={[
                          styles.invoiceCard,
                          {
                            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        {/* Top: Icon + Category + Time + Action Buttons */}
                        <View style={styles.invoiceCardTop}>
                          <View style={styles.invoiceLeftInfo}>
                            <View style={[styles.catBadge, { backgroundColor: catObj.bg }]}>
                              <Ionicons name={catObj.icon as any} size={18} color={catObj.color} />
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={[styles.invoiceCategory, { color: colors.textPrimary }]}>
                                {catObj.label}
                              </Text>
                              <Text style={[styles.invoiceTime, { color: colors.textSecondary }]}>
                                {item.created_at ? new Date(item.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                              </Text>
                            </View>
                          </View>

                          {/* Actions: Edit & Delete */}
                          <View style={styles.invoiceActionsRow}>
                            <TouchableOpacity
                              onPress={() => handleOpenEditExpense(item)}
                              style={[styles.invoiceIconBtn, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Feather name="edit-2" size={14} color="#ea580c" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => handleDeleteExpense(item)}
                              style={[styles.invoiceIconBtn, { backgroundColor: '#fef2f2' }]}
                              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                              <Ionicons name="trash-outline" size={15} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Middle: Recipient & Note */}
                        <View style={styles.invoiceCardMiddle}>
                          <View style={styles.invoiceRecipientRow}>
                            <Ionicons name="person-outline" size={13} color="#ea580c" />
                            <Text style={[styles.invoiceRecipientText, { color: colors.textPrimary }]} numberOfLines={2}>
                              المستلم: {item.recipient_name || '—'}
                            </Text>
                          </View>
                        </View>

                        {/* Bottom: Invoice Image (if exists) + Amount Badge */}
                        <View style={styles.invoiceCardBottom}>
                          {fullImg ? (
                            <TouchableOpacity
                              onPress={() => setPreviewImage(fullImg)}
                              style={styles.imagePreviewBtn}
                              activeOpacity={0.8}
                            >
                              <Image source={{ uri: fullImg }} style={styles.invoiceImgThumb} />
                              <View style={styles.imageBadge}>
                                <Ionicons name="image" size={11} color="#ffffff" />
                                <Text style={styles.imageBadgeText}>عرض الفاتورة</Text>
                              </View>
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.noImgBadge}>
                              <Ionicons name="receipt-outline" size={12} color={colors.textSecondary} />
                              <Text style={[styles.noImgText, { color: colors.textSecondary }]}>بدون مرفق</Text>
                            </View>
                          )}

                          <View style={styles.amountPill}>
                            <Text style={styles.amountPillVal}>
                              {item.amount.toLocaleString()}
                            </Text>
                            <Text style={styles.amountPillUnit}> ر.س</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── 6. BOTTOM SHEET MODAL: Add Expense & Invoice (Input floats above keyboard) ── */}
      <Modal visible={showAddExpenseModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardModalWrapper}
        >
          <View style={styles.bottomSheetBackdrop}>
            <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sheetIndicator} />
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>إضافة فاتورة / سند صرف</Text>
                <TouchableOpacity onPress={() => setShowAddExpenseModal(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: SCREEN_HEIGHT * 0.72 }}
              >
                {/* 1. Category Picker Tabs */}
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>اختر نوع المصروف / القسم</Text>
                <View style={styles.categoriesRadioList}>
                  {CATEGORIES.map((c) => {
                    const isSelected = selectedCategory === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        style={[
                          styles.catRadioItem,
                          {
                            backgroundColor: isSelected ? '#ea580c' : isDarkMode ? '#1e293b' : '#f8fafc',
                            borderColor: isSelected ? '#ea580c' : colors.border,
                          },
                        ]}
                        onPress={() => setSelectedCategory(c.key)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={c.icon as any}
                          size={15}
                          color={isSelected ? '#ffffff' : c.color}
                          style={{ marginLeft: 6 }}
                        />
                        <Text
                          style={[
                            styles.catRadioText,
                            { color: isSelected ? '#ffffff' : colors.textPrimary, fontWeight: isSelected ? '800' : '600' },
                          ]}
                        >
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 2. Amount Input (Floating above keyboard) */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المبلغ المصروف (ريال) *</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    value={expenseAmount}
                    onChangeText={setExpenseAmount}
                  />
                </View>

                {/* 3. Recipient / Details */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المستلم / البيان التفصيلي</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                    placeholder="مثال: وقود دباب #412 أو سلفة فلان"
                    placeholderTextColor="#94a3b8"
                    value={expenseRecipient}
                    onChangeText={setExpenseRecipient}
                  />
                </View>

                {/* 4. Invoice Image Upload */}
                <Text style={[styles.sheetLabel, { color: colors.textPrimary, marginTop: 4 }]}>صورة الفاتورة المعتمدة</Text>
                {invoiceImageUri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: invoiceImageUri }} style={styles.previewImage} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setInvoiceImageUri(null)}
                    >
                      <Ionicons name="trash" size={14} color="#ffffff" />
                      <Text style={styles.removeImageText}>حذف الصورة</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePickRow}>
                    <TouchableOpacity
                      style={[styles.pickBtn, { backgroundColor: isDarkMode ? '#334155' : '#fff7ed', borderColor: '#fed7aa' }]}
                      onPress={() => handlePickImage(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="camera-outline" size={20} color="#ea580c" />
                      <Text style={styles.pickBtnText}>تصوير بالكاميرا</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.pickBtn, { backgroundColor: isDarkMode ? '#334155' : '#f0f9ff', borderColor: '#bae6fd' }]}
                      onPress={() => handlePickImage(false)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="images-outline" size={20} color="#0284c7" />
                      <Text style={[styles.pickBtnText, { color: '#0284c7' }]}>من المعرض</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Actions */}
                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setShowAddExpenseModal(false)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: '#ea580c' }]}
                    disabled={addExpenseLoading}
                    onPress={handleSaveExpense}
                  >
                    {addExpenseLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.saveBtnText}>تأكيد وحفظ الفاتورة</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 7. BOTTOM SHEET MODAL: Edit Expense (Modify Amount & Recipient) ── */}
      <Modal visible={!!editingExpense} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardModalWrapper}
        >
          <View style={styles.bottomSheetBackdrop}>
            <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sheetIndicator} />
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تعديل بيانات الفاتورة</Text>
                <TouchableOpacity onPress={() => setEditingExpense(null)}>
                  <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: SCREEN_HEIGHT * 0.72 }}
              >
                {/* Category Radio Tabs */}
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>نوع المصروف</Text>
                <View style={styles.categoriesRadioList}>
                  {CATEGORIES.map((c) => {
                    const isSelected = editCategory === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        style={[
                          styles.catRadioItem,
                          {
                            backgroundColor: isSelected ? '#ea580c' : isDarkMode ? '#1e293b' : '#f8fafc',
                            borderColor: isSelected ? '#ea580c' : colors.border,
                          },
                        ]}
                        onPress={() => setEditCategory(c.key)}
                        activeOpacity={0.8}
                      >
                        <Ionicons
                          name={c.icon as any}
                          size={14}
                          color={isSelected ? '#ffffff' : c.color}
                          style={{ marginLeft: 6 }}
                        />
                        <Text
                          style={[
                            styles.catRadioText,
                            { color: isSelected ? '#ffffff' : colors.textPrimary, fontWeight: isSelected ? '800' : '600' },
                          ]}
                        >
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Amount */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المبلغ المصروف (ريال) *</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                    value={editAmount}
                    onChangeText={setEditAmount}
                  />
                </View>

                {/* Recipient */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المستلم / البيان التفصيلي</Text>
                  <TextInput
                    style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                    placeholder="اسم المستلم أو البيان"
                    placeholderTextColor="#94a3b8"
                    value={editRecipient}
                    onChangeText={setEditRecipient}
                  />
                </View>

                {/* Actions */}
                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: colors.border }]}
                    onPress={() => setEditingExpense(null)}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: '#ea580c' }]}
                    disabled={editLoading}
                    onPress={handleSaveEditExpense}
                  >
                    {editLoading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.saveBtnText}>حفظ التعديلات</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 8. BOTTOM SHEET MODAL: Add Custody Amount ── */}
      <Modal visible={showAddCustodyModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardModalWrapper}
        >
          <View style={styles.bottomSheetBackdrop}>
            <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sheetIndicator} />
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>إضافة مبالغ للعهدة</Text>
                <TouchableOpacity onPress={() => setShowAddCustodyModal(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.sheetDesc, { color: colors.textSecondary }]}>
                التاريخ: {selectedDate} • الرصيد المتاح الحالي: {(custodyTotalAvailable).toLocaleString()} ر.س
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المبلغ المراد إضافته للعهدة (ريال) *</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  placeholder="مثال: 500"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={addCustodyAmount}
                  onChangeText={setAddCustodyAmount}
                  autoFocus
                />
              </View>

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowAddCustodyModal(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: '#ea580c' }]}
                  disabled={addCustodyLoading}
                  onPress={handleSaveCustodyAmount}
                >
                  {addCustodyLoading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.saveBtnText}>تأكيد الإضافة للعهدة</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 9. BOTTOM SHEET MODAL: Manage / Delete Added Custody Amounts ── */}
      <Modal visible={showLogsSheet} transparent animationType="slide">
        <View style={styles.bottomSheetBackdrop}>
          <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetIndicator} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>مبالغ العهدة المضافة لليوم</Text>
              <TouchableOpacity onPress={() => setShowLogsSheet(false)}>
                <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.sheetDesc, { color: colors.textSecondary }]}>
              إذا قمت بإضافة عهدة بالخطأ، يمكنك الضغط على أيقونة الحذف لإلغائها فوراً من الحسابات:
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}>
              {custodyAddedLogs.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary, marginVertical: 20 }]}>
                  لا توجد حركات إضافة مسجلة لهذا اليوم
                </Text>
              ) : (
                custodyAddedLogs.map((log) => (
                  <View key={log.id} style={[styles.logRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.logLeft}>
                      <TouchableOpacity
                        onPress={() => handleDeleteCustodyEntry(log)}
                        style={styles.logDeleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                      <View style={{ alignItems: 'flex-start' }}>
                        <Text style={[styles.logAmount, { color: '#ea580c' }]}>+{log.amount.toLocaleString()} ر.س</Text>
                        <Text style={[styles.logTime, { color: colors.textSecondary }]}>
                          {log.created_at ? new Date(log.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                      </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', flex: 1 }}>
                      <Text style={[styles.logDesc, { color: colors.textPrimary }]}>{log.description}</Text>
                      <Text style={[styles.logAdmin, { color: colors.textSecondary }]}>بواسطة: {log.admin_name || 'المسؤول'}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── 10. BOTTOM SHEET MODAL: Date Picker (Opens from Bottom) ── */}
      <Modal visible={showDatePickerModal} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardModalWrapper}
        >
          <View style={styles.bottomSheetBackdrop}>
            <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sheetIndicator} />
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>اختر التاريخ المراد عرضه</Text>
                <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                  <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.sheetDesc, { color: colors.textSecondary }]}>
                اكتب التاريخ بصيغة: YYYY-MM-DD
              </Text>

              <TextInput
                style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary, textAlign: 'center', fontSize: 16 }]}
                value={customDateInput}
                onChangeText={setCustomDateInput}
                placeholder="2026-10-12"
                placeholderTextColor="#94a3b8"
                autoFocus
              />

              {/* Quick Preset Buttons */}
              <View style={styles.presetDatesRow}>
                <TouchableOpacity
                  style={[styles.presetDateBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => setCustomDateInput(getTodayStr())}
                >
                  <Text style={[styles.presetDateText, { color: colors.textPrimary }]}>اليوم</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.presetDateBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 1);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    setCustomDateInput(`${y}-${m}-${day}`);
                  }}
                >
                  <Text style={[styles.presetDateText, { color: colors.textPrimary }]}>أمس</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  onPress={() => setShowDatePickerModal(false)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: '#ea580c' }]}
                  onPress={() => {
                    const trimmed = customDateInput.trim();
                    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                      setSelectedDate(trimmed);
                      setShowDatePickerModal(false);
                    } else {
                      Alert.alert('تنسيق غير صحيح', 'يرجى كتابة التاريخ بصيغة YYYY-MM-DD (مثال: 2026-10-12)');
                    }
                  }}
                >
                  <Text style={styles.saveBtnText}>عرض هذا اليوم</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── 11. Fullscreen Image Viewer Modal ── */}
      <Modal visible={!!previewImage} transparent animationType="fade">
        <View style={styles.imageViewerBackdrop}>
          <TouchableOpacity
            style={styles.closeViewerBtn}
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close-circle" size={32} color="#ffffff" />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
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

  // ── Target Card (Delegate App Style) ──
  targetCardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  targetCardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetTitleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  walletIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  targetCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  targetCardHint: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ea580c',
    marginTop: 1,
  },
  targetNetValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  targetNetUnit: {
    fontSize: 10,
    fontWeight: '600',
  },
  targetProgressContainer: {
    marginBottom: 14,
  },
  progressBarTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetDetailsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  detailCol: {
    flex: 1,
    alignItems: 'center',
  },
  detailColLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  detailColValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  detailColUnit: {
    fontSize: 9,
    fontWeight: '600',
  },
  detailDivider: {
    width: 1,
    height: 24,
  },
  miniLogLink: {
    fontSize: 9,
    fontWeight: '700',
    color: '#ea580c',
    textDecorationLine: 'underline',
    marginTop: 2,
  },

  // ── Hero Add Invoice Button ──
  addInvoiceHeroBtn: {
    height: 50,
    backgroundColor: '#ea580c',
    borderRadius: 16,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  addInvoiceIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addInvoiceHeroBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },

  // ── General Cards ──
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  categoryGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '48.5%',
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: 'flex-end',
  },
  categoryCardTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  categoryIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardName: {
    fontSize: 11,
    fontWeight: '700',
  },
  categoryCardValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  categoryCardUnit: {
    fontSize: 10,
    fontWeight: '600',
  },

  // ── Invoices List & Cards ──
  invoicesList: {
    gap: 12,
  },
  invoiceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  invoiceCardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceLeftInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  catBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceCategory: {
    fontSize: 13,
    fontWeight: '800',
  },
  invoiceTime: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  invoiceActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  invoiceIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceCardMiddle: {
    marginBottom: 10,
  },
  invoiceRecipientRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  invoiceRecipientText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  invoiceCardBottom: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  imagePreviewBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  invoiceImgThumb: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  imageBadge: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  imageBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  noImgBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  noImgText: {
    fontSize: 10,
    fontWeight: '500',
  },
  amountPill: {
    flexDirection: 'row-reverse',
    alignItems: 'baseline',
  },
  amountPillVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ea580c',
  },
  amountPillUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
  },

  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyAddBtn: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 4,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },

  // ── Bottom Sheet Modals (All slide up smoothly) ──
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '92%',
  },
  sheetIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sheetDesc: {
    fontSize: 12,
    marginBottom: 14,
    textAlign: 'right',
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'right',
  },
  categoriesRadioList: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  catRadioItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  catRadioText: {
    fontSize: 11,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputBox: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  previewContainer: {
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeImageText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  imagePickRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 14,
  },
  pickBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row-reverse',
    gap: 6,
  },
  pickBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ea580c',
  },
  sheetActions: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },

  presetDatesRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 10,
  },
  presetDateBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  presetDateText: {
    fontSize: 12,
    fontWeight: '700',
  },

  logRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 12,
  },
  logLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  logDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  logTime: {
    fontSize: 10,
  },
  logDesc: {
    fontSize: 12,
    fontWeight: '700',
  },
  logAdmin: {
    fontSize: 10,
    marginTop: 2,
  },

  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeViewerBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  fullscreenImage: {
    width: '100%',
    height: '80%',
  },
});
