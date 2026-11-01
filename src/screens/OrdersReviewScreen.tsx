import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, WorkSession } from '../types/delegate';
import { supervisorApi } from '../services/supervisor';
import { DatePickerBottomSheet } from '../components/modals/DatePickerBottomSheet';
import { formatImageUrl } from '../services/api';

interface OrdersReviewScreenProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onPreviewPhoto?: (photo: { url: string; title: string }) => void;
  // External control for opening date picker from header
  isDatePickerOpen?: boolean;
  onCloseDatePicker?: () => void;
  onOpenDatePicker?: () => void;
}

export const OrdersReviewScreen: React.FC<OrdersReviewScreenProps> = ({
  colors,
  isDarkMode,
  isRTL,
  onPreviewPhoto,
  isDatePickerOpen = false,
  onCloseDatePicker,
  onOpenDatePicker,
}) => {
  // Today's date string YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [internalDatePickerOpen, setInternalDatePickerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'day' | 'employee_all'>('day'); // 'day' = single day, 'employee_all' = all history for searched employee
  const [sortBy, setSortBy] = useState<'orders_desc' | 'time_desc'>('orders_desc');

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<WorkSession[]>([]);

  const showDatePicker = isDatePickerOpen || internalDatePickerOpen;
  const closeDatePicker = () => {
    setInternalDatePickerOpen(false);
    onCloseDatePicker?.();
  };
  const openDatePicker = () => {
    if (onOpenDatePicker) {
      onOpenDatePicker();
    } else {
      setInternalDatePickerOpen(true);
    }
  };

  // Fetch orders data
  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (viewMode === 'day') {
        const data = await supervisorApi.getOrdersReview({
          date: selectedDate,
          limit: 500,
        });
        setSessions(data || []);
      } else {
        // Fetch recent history (up to 500 sessions) to search employee across all dates
        const data = await supervisorApi.getOrdersReview({
          limit: 500,
        });
        setSessions(data || []);
      }
    } catch (err) {
      console.warn('[OrdersReview] fetch error:', err);
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Navigate date by 1 day
  const handleShiftDate = (direction: 'next' | 'prev') => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const curr = new Date(y, m - 1, d);
    if (direction === 'next') {
      curr.setDate(curr.getDate() + 1);
    } else {
      curr.setDate(curr.getDate() - 1);
    }
    const newY = curr.getFullYear();
    const newM = String(curr.getMonth() + 1).padStart(2, '0');
    const newD = String(curr.getDate()).padStart(2, '0');
    setSelectedDate(`${newY}-${newM}-${newD}`);
  };

  // Filter & Sort Sessions
  const processedSessions = useMemo(() => {
    let list = [...sessions];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => {
        const name = (s.employee_name || s.employee?.name || '').toLowerCase();
        const code = (s.employee?.employee_number || s.employee?.key_number || (s as any).key_number || '').toLowerCase();
        const bike = (s.motorcycle_number || s.employee?.motorcycle_number || '').toLowerCase();
        const natId = (s.employee?.national_id || (s as any).national_id || '').toLowerCase();
        return name.includes(q) || code.includes(q) || bike.includes(q) || natId.includes(q);
      });
    }

    // Sort descending
    list.sort((a, b) => {
      if (sortBy === 'orders_desc') {
        const ordA = a.orders_count || 0;
        const ordB = b.orders_count || 0;
        if (ordB !== ordA) return ordB - ordA; // Descending orders
        // Tie-breaker: newest time
        const timeA = new Date(a.start_time || 0).getTime();
        const timeB = new Date(b.start_time || 0).getTime();
        return timeB - timeA;
      } else {
        // time_desc
        const timeA = new Date(a.start_time || 0).getTime();
        const timeB = new Date(b.start_time || 0).getTime();
        return timeB - timeA; // Descending time
      }
    });

    return list;
  }, [sessions, searchQuery, sortBy]);

  // Summary Metrics
  const summary = useMemo(() => {
    let totalOrders = 0;
    let totalDistance = 0;
    let totalFuel = 0;
    const uniqueEmployees = new Set<string>();

    processedSessions.forEach((s) => {
      totalOrders += s.orders_count || 0;
      totalDistance += (s.end_km != null && s.start_km != null && s.end_km >= s.start_km)
        ? (s.end_km - s.start_km)
        : (s.distance || 0);
      totalFuel += s.fuel_cost || 0;
      if (s.employee_id) uniqueEmployees.add(s.employee_id);
    });

    return {
      totalOrders,
      totalDistance,
      totalFuel,
      delegatesCount: uniqueEmployees.size,
      shiftsCount: processedSessions.length,
    };
  }, [processedSessions]);

  // Clean time formatter
  const formatTimeStr = (isoString?: string | null): string => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '—';
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const isPM = hours >= 12;
      hours = hours % 12 || 12;
      const padMin = minutes < 10 ? `0${minutes}` : `${minutes}`;
      const period = isPM ? 'م' : 'ص';
      return `${hours}:${padMin} ${period}`;
    } catch {
      return '—';
    }
  };

  // Format date display
  const formatDateDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const today = new Date();
      if (
        dateObj.getFullYear() === today.getFullYear() &&
        dateObj.getMonth() === today.getMonth() &&
        dateObj.getDate() === today.getDate()
      ) {
        return `اليوم (${dateStr})`;
      }
      return dateObj.toLocaleDateString('ar-SA', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ── 1. DATE BANNER & CALENDAR SELECTOR ── */}
      <View
        style={[
          styles.dateBannerCard,
          { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {/* Prev Day button */}
        <TouchableOpacity
          style={[styles.dateNavBtn, { backgroundColor: colors.bg }]}
          onPress={() => handleShiftDate(isRTL ? 'next' : 'prev')}
          activeOpacity={0.7}
        >
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Center: Tap to open DatePickerBottomSheet */}
        <TouchableOpacity
          style={[styles.dateCenterBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={openDatePicker}
          activeOpacity={0.75}
        >
          <View style={[styles.calendarIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
          </View>
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.dateLabelText, { color: colors.textSecondary }]}>تاريخ المراجعة</Text>
            <Text style={[styles.dateValueText, { color: colors.textPrimary }]}>
              {formatDateDisplay(selectedDate)}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} style={{ marginHorizontal: 4 }} />
        </TouchableOpacity>

        {/* Next Day button */}
        <TouchableOpacity
          style={[styles.dateNavBtn, { backgroundColor: colors.bg }]}
          onPress={() => handleShiftDate(isRTL ? 'prev' : 'next')}
          activeOpacity={0.7}
        >
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* ── 2. SEARCH BAR ── */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
          placeholder="ابحث باسم المندوب، رقم الدباب، الكود، أو الهوية..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── 3. FILTER & SORT CONTROLS ── */}
      <View style={[styles.filterControlsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Mode Toggle: Day vs All History */}
        <View style={[styles.modeToggleGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[
              styles.modeToggleBtn,
              viewMode === 'day' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setViewMode('day')}
          >
            <Text
              style={[
                styles.modeToggleText,
                { color: viewMode === 'day' ? '#ffffff' : colors.textSecondary },
              ]}
            >
              📅 طلبات اليوم
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeToggleBtn,
              viewMode === 'employee_all' && { backgroundColor: colors.primary },
            ]}
            onPress={() => setViewMode('employee_all')}
          >
            <Text
              style={[
                styles.modeToggleText,
                { color: viewMode === 'employee_all' ? '#ffffff' : colors.textSecondary },
              ]}
            >
              👤 بحث بالموظف
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sort descending button */}
        <TouchableOpacity
          style={[
            styles.sortBtn,
            { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
          onPress={() => setSortBy((prev) => (prev === 'orders_desc' ? 'time_desc' : 'orders_desc'))}
        >
          <Ionicons name="swap-vertical" size={16} color={colors.primary} />
          <Text style={[styles.sortBtnText, { color: colors.textPrimary }]}>
            {sortBy === 'orders_desc' ? 'الأعلى طلبات' : 'الأحدث وقتاً'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── 4. SUMMARY METRICS BAR ── */}
      <View
        style={[
          styles.summaryBar,
          { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryItemVal, { color: '#2563eb' }]}>
            {summary.totalOrders}
          </Text>
          <Text style={[styles.summaryItemLbl, { color: colors.textSecondary }]}>إجمالي الطلبات</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryItemVal, { color: '#10b981' }]}>
            {summary.delegatesCount}
          </Text>
          <Text style={[styles.summaryItemLbl, { color: colors.textSecondary }]}>المناديب</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryItemVal, { color: '#059669' }]}>
            {summary.totalDistance.toFixed(0)} كم
          </Text>
          <Text style={[styles.summaryItemLbl, { color: colors.textSecondary }]}>المسافة</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryItemVal, { color: '#d97706' }]}>
            {summary.totalFuel.toFixed(0)} ر.س
          </Text>
          <Text style={[styles.summaryItemLbl, { color: colors.textSecondary }]}>الوقود</Text>
        </View>
      </View>

      {/* ── 5. ORDERS SESSIONS LIST ── */}
      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>جاري تحميل طلبات المناديب...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOrders(true)}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          {processedSessions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="receipt-outline" size={44} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {searchQuery ? 'لا توجد طلبات مطابقة للبحث' : 'لا توجد طلبات مسجلة في هذا اليوم'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {searchQuery
                  ? 'جرب البحث باسم موظف آخر أو رقم دباب مختلف'
                  : 'يمكنك اختيار يوم آخر من التقويم بالأعلى أو البحث باسم الموظف'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setSelectedDate(getTodayString());
                  setSearchQuery('');
                  setViewMode('day');
                }}
              >
                <Ionicons name="today-outline" size={18} color="#ffffff" />
                <Text style={styles.emptyActionBtnText}>عرض طلبات اليوم</Text>
              </TouchableOpacity>
            </View>
          ) : (
            processedSessions.map((session, index) => {
              const delegateName = session.employee_name || session.employee?.name || 'مندوب توصيل';
              const bikeNumber = session.motorcycle_number || session.employee?.motorcycle_number || '—';
              const code = session.employee?.employee_number || session.employee?.key_number || (session as any).key_number || '';
              const distance = (session.end_km != null && session.start_km != null && session.end_km >= session.start_km)
                ? (session.end_km - session.start_km)
                : (session.distance || 0);

              const isReviewed = session.is_reviewed;
              const isCompleted = session.status === 'COMPLETED' || !!session.end_time;

              const startImgUrl = formatImageUrl(session.start_km_image);
              const endImgUrl = formatImageUrl(session.end_km_image);

              return (
                <View
                  key={session.id || index}
                  style={[
                    styles.orderCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  {/* Card Header: Delegate info + Orders badge */}
                  <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={[styles.delegateName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {delegateName}
                      </Text>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <Text style={[styles.bikeBadgeText, { color: colors.primary }]}>
                          دباب: {bikeNumber}
                        </Text>
                        {code ? (
                          <Text style={[styles.codeBadgeText, { color: colors.textSecondary }]}>
                            • كود: {code}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {/* Big Prominent Orders Badge */}
                    <View style={styles.ordersBadgeContainer}>
                      <View style={[styles.ordersPill, { backgroundColor: isDarkMode ? '#2563eb25' : '#eff6ff', borderColor: '#2563eb40' }]}>
                        <Text style={styles.ordersPillCount}>{session.orders_count || 0}</Text>
                        <Text style={styles.ordersPillLabel}>طلب</Text>
                      </View>
                    </View>
                  </View>

                  {/* Status & Date row */}
                  <View style={[styles.cardSubHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View
                      style={[
                        styles.statusTag,
                        {
                          backgroundColor: isReviewed
                            ? '#10b98115'
                            : isCompleted
                            ? '#f59e0b15'
                            : '#3b82f615',
                          borderColor: isReviewed
                            ? '#10b98135'
                            : isCompleted
                            ? '#f59e0b35'
                            : '#3b82f635',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: isReviewed
                              ? '#10b981'
                              : isCompleted
                              ? '#f59e0b'
                              : '#3b82f6',
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusTagText,
                          {
                            color: isReviewed
                              ? '#059669'
                              : isCompleted
                              ? '#d97706'
                              : '#2563eb',
                          },
                        ]}
                      >
                        {isReviewed
                          ? 'معتمد ✓'
                          : isCompleted
                          ? 'بانتظار الاعتماد'
                          : 'وردية نشطة'}
                      </Text>
                    </View>

                    <Text style={[styles.cardDateText, { color: colors.textSecondary }]}>
                      {session.start_time
                        ? new Date(session.start_time).toLocaleDateString('ar-SA')
                        : selectedDate}
                    </Text>
                  </View>

                  {/* Metrics Row: المسافة | الوقود | ساعة البداية | ساعة النهاية */}
                  <View
                    style={[
                      styles.cardMetricsBar,
                      { backgroundColor: colors.bg, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <View style={styles.cardMetricCol}>
                      <Text style={[styles.cardMetricVal, { color: '#059669' }]}>
                        {distance.toFixed(1)} كم
                      </Text>
                      <Text style={[styles.cardMetricLbl, { color: colors.textSecondary }]}>المسافة</Text>
                    </View>
                    <View style={[styles.cardMetricDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.cardMetricCol}>
                      <Text style={[styles.cardMetricVal, { color: '#d97706' }]}>
                        {session.fuel_cost || 0} ر.س
                      </Text>
                      <Text style={[styles.cardMetricLbl, { color: colors.textSecondary }]}>الوقود</Text>
                    </View>
                    <View style={[styles.cardMetricDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.cardMetricCol}>
                      <Text style={[styles.cardMetricVal, { color: '#2563eb' }]}>
                        {formatTimeStr(session.start_time)}
                      </Text>
                      <Text style={[styles.cardMetricLbl, { color: colors.textSecondary }]}>البداية</Text>
                    </View>
                    <View style={[styles.cardMetricDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.cardMetricCol}>
                      <Text style={[styles.cardMetricVal, { color: '#10b981' }]}>
                        {formatTimeStr(session.end_time)}
                      </Text>
                      <Text style={[styles.cardMetricLbl, { color: colors.textSecondary }]}>النهاية</Text>
                    </View>
                  </View>

                  {/* Odometers Row (with tap to preview photo) */}
                  {(startImgUrl || endImgUrl || session.start_km != null) && (
                    <View style={[styles.odometerFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {/* Start Odometer */}
                      <TouchableOpacity
                        style={[styles.odometerChip, { backgroundColor: colors.bg, borderColor: colors.border }]}
                        activeOpacity={startImgUrl ? 0.75 : 1}
                        onPress={() => {
                          if (startImgUrl) {
                            onPreviewPhoto?.({
                              url: startImgUrl,
                              title: `عداد البداية (${session.start_km ?? 0} كم) - ${delegateName}`,
                            });
                          }
                        }}
                      >
                        <Ionicons name="speedometer-outline" size={14} color="#2563eb" />
                        <Text style={[styles.odometerChipText, { color: colors.textPrimary }]}>
                          عداد البدء: {session.start_km ?? 0} كم
                        </Text>
                        {startImgUrl ? (
                          <Ionicons name="image-outline" size={13} color="#2563eb" />
                        ) : null}
                      </TouchableOpacity>

                      {/* End Odometer */}
                      <TouchableOpacity
                        style={[styles.odometerChip, { backgroundColor: colors.bg, borderColor: colors.border }]}
                        activeOpacity={endImgUrl ? 0.75 : 1}
                        onPress={() => {
                          if (endImgUrl) {
                            onPreviewPhoto?.({
                              url: endImgUrl,
                              title: `عداد النهاية (${session.end_km ?? 0} كم) - ${delegateName}`,
                            });
                          }
                        }}
                      >
                        <Ionicons name="flag-outline" size={14} color="#059669" />
                        <Text style={[styles.odometerChipText, { color: colors.textPrimary }]}>
                          عداد النهاية: {session.end_km ?? 0} كم
                        </Text>
                        {endImgUrl ? (
                          <Ionicons name="image-outline" size={13} color="#059669" />
                        ) : null}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ── 6. BOTTOM SHEET DATE PICKER ── */}
      <DatePickerBottomSheet
        visible={showDatePicker}
        selectedDate={selectedDate}
        onSelectDate={(newDate) => {
          setSelectedDate(newDate);
          setViewMode('day'); // Switching date switches to day view
        }}
        onClose={closeDatePicker}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateBannerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateCenterBtn: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
  },
  calendarIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateLabelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  dateValueText: {
    fontSize: 14,
    fontWeight: '900',
  },
  searchContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 2,
  },
  filterControlsRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  modeToggleGroup: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    padding: 2,
    gap: 2,
  },
  modeToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modeToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryBar: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryItemVal: {
    fontSize: 14,
    fontWeight: '900',
  },
  summaryItemLbl: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 10,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 260,
    lineHeight: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  orderCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  cardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  delegateName: {
    fontSize: 15,
    fontWeight: '900',
  },
  bikeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  ordersBadgeContainer: {
    alignItems: 'center',
  },
  ordersPill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  ordersPillCount: {
    color: '#2563eb',
    fontSize: 18,
    fontWeight: '900',
  },
  ordersPillLabel: {
    color: '#2563eb',
    fontSize: 11,
    fontWeight: '700',
  },
  cardSubHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 2,
  },
  statusTag: {
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardDateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardMetricsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  cardMetricCol: {
    flex: 1,
    alignItems: 'center',
  },
  cardMetricVal: {
    fontSize: 12,
    fontWeight: '900',
  },
  cardMetricLbl: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 1,
  },
  cardMetricDivider: {
    width: 1,
    height: 20,
  },
  odometerFooterRow: {
    gap: 8,
    marginTop: 2,
  },
  odometerChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  odometerChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
