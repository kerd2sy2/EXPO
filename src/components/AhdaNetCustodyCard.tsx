import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '../types/delegate';
import { CustodyDayData, CustodyLogItem } from '../services/custodyService';
import { toArabicDigits, formatArabicNumber } from '../utils/formatters';

interface AhdaNetCustodyCardProps {
  currentDay: CustodyDayData | null;
  effectiveOpeningBalance: number;
  custodyAddedLogs: CustodyLogItem[];
  colors: ThemeColors;
  isDarkMode: boolean;
  selectedDate?: string;
  onPressCard: () => void;
  onPressManageLogs: () => void;
  onSwipePrevDay?: () => void;
  onSwipeNextDay?: () => void;
  onPressDatePicker?: () => void;
  onResetToToday?: () => void;
}

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

interface DateRelativeInfo {
  label: 'اليوم' | 'أمس' | 'القادم' | null;
  type: 'today' | 'yesterday' | 'future' | 'past';
}

const getRelativeDateInfo = (dateStr?: string | null): DateRelativeInfo => {
  if (!dateStr) return { label: null, type: 'past' };

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth() + 1;
  const todayD = today.getDate();
  const todayStr = `${todayY}-${String(todayM).padStart(2, '0')}-${String(todayD).padStart(2, '0')}`;

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yestY = yesterday.getFullYear();
  const yestM = yesterday.getMonth() + 1;
  const yestD = yesterday.getDate();
  const yesterdayStr = `${yestY}-${String(yestM).padStart(2, '0')}-${String(yestD).padStart(2, '0')}`;

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomY = tomorrow.getFullYear();
  const tomM = tomorrow.getMonth() + 1;
  const tomD = tomorrow.getDate();
  const tomorrowStr = `${tomY}-${String(tomM).padStart(2, '0')}-${String(tomD).padStart(2, '0')}`;

  if (dateStr === todayStr) {
    return { label: 'اليوم', type: 'today' };
  }
  if (dateStr === yesterdayStr) {
    return { label: 'أمس', type: 'yesterday' };
  }
  if (dateStr === tomorrowStr || dateStr > todayStr) {
    return { label: 'القادم', type: 'future' };
  }
  return { label: null, type: 'past' };
};

const formatSimpleDate = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const [y, m, d] = parts;
    const dateObj = new Date(y, m - 1, d);
    const dayName = ARABIC_DAYS[dateObj.getDay()] || '';
    const monthName = ARABIC_MONTHS[m - 1] || '';
    return `${dayName}، ${toArabicDigits(d)} ${monthName} ${toArabicDigits(y)}`;
  }
  return toArabicDigits(dateStr);
};

const AhdaNetCustodyCardComponent: React.FC<AhdaNetCustodyCardProps> = ({
  currentDay,
  effectiveOpeningBalance,
  custodyAddedLogs,
  colors,
  isDarkMode,
  selectedDate,
  onPressCard,
  onPressManageLogs,
  onSwipePrevDay,
  onSwipeNextDay,
  onPressDatePicker,
  onResetToToday,
}) => {
  const activeDate = selectedDate || currentDay?.date;
  const relativeInfo = getRelativeDateInfo(activeDate);
  const custodyTotalAvailable = effectiveOpeningBalance + (currentDay?.added_amount ?? 0);
  const spentPct = custodyTotalAvailable > 0
    ? Math.min(100, Math.round(((currentDay?.total_expenses ?? 0) / custodyTotalAvailable) * 100))
    : 0;

  const panX = useRef(new Animated.Value(0)).current;
  const callbacksRef = useRef({ onSwipePrevDay, onSwipeNextDay });
  useEffect(() => {
    callbacksRef.current = { onSwipePrevDay, onSwipeNextDay };
  });

  const lastDateTapRef = useRef<number>(0);
  const dateTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (dateTapTimerRef.current) {
        clearTimeout(dateTapTimerRef.current);
      }
    };
  }, []);

  const handleDateTouch = () => {
    const now = Date.now();
    const DOUBLE_TAP_WINDOW = 280;

    if (now - lastDateTapRef.current < DOUBLE_TAP_WINDOW) {
      if (dateTapTimerRef.current) {
        clearTimeout(dateTapTimerRef.current);
        dateTapTimerRef.current = null;
      }
      lastDateTapRef.current = 0;
      onResetToToday?.();
    } else {
      lastDateTapRef.current = now;
      if (dateTapTimerRef.current) {
        clearTimeout(dateTapTimerRef.current);
      }
      dateTapTimerRef.current = setTimeout(() => {
        dateTapTimerRef.current = null;
        lastDateTapRef.current = 0;
        onPressDatePicker?.();
      }, DOUBLE_TAP_WINDOW);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 15 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderGrant: () => {
        panX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const clampedX = Math.max(-80, Math.min(80, gestureState.dx * 0.45));
        panX.setValue(clampedX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const SWIPE_THRESHOLD = 45;
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swiped right -> Next day (اليوم التالي / بعده) with subtle haptic vibration
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch (_) {}
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
            speed: 16,
          }).start();
          callbacksRef.current.onSwipeNextDay?.();
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swiped left -> Previous day (اليوم السابق / قبله) with subtle haptic vibration
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch (_) {}
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
            speed: 16,
          }).start();
          callbacksRef.current.onSwipePrevDay?.();
        } else {
          Animated.spring(panX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
            speed: 16,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(panX, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
          speed: 16,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        transform: [{ translateX: panX }],
      }}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        style={[styles.targetCardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onPressCard}
        activeOpacity={0.9}
      >
        {/* Header: Title + Net Balance */}
        <View style={styles.targetCardHeader}>
          <View style={styles.targetTitleGroup}>
            <View style={styles.walletIconCircle}>
              <Ionicons name="wallet-outline" size={18} color="#047857" />
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
              <Text style={[styles.targetCardTitle, { color: colors.textPrimary }]}>
                صافي العهدة المتبقي
              </Text>
              {!!activeDate && (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDateTouch();
                  }}
                  activeOpacity={0.7}
                  style={styles.dateRowContainer}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="calendar-outline" size={13} color="#047857" />
                  <Text style={[styles.targetCardDate, { color: colors.textSecondary }]}>
                    {formatSimpleDate(activeDate)}
                  </Text>
                  {!!relativeInfo.label && (
                    <View
                      style={[
                        styles.relativeBadge,
                        relativeInfo.type === 'today'
                          ? styles.relativeBadgeToday
                          : relativeInfo.type === 'yesterday'
                          ? styles.relativeBadgeYesterday
                          : styles.relativeBadgeFuture,
                      ]}
                    >
                      <Text
                        style={[
                          styles.relativeBadgeText,
                          relativeInfo.type === 'today'
                            ? styles.relativeTextToday
                            : relativeInfo.type === 'yesterday'
                            ? styles.relativeTextYesterday
                            : styles.relativeTextFuture,
                        ]}
                      >
                        {relativeInfo.label}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>

        <View style={{ alignItems: 'flex-start' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image
              source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={{ width: 22, height: 22, tintColor: '#047857' }}
              resizeMode="contain"
            />
            <Text style={[styles.targetNetValue, { color: '#047857' }]}>
              {formatArabicNumber(
                (currentDay?.closing_balance !== undefined && currentDay?.closing_balance !== null && currentDay.closing_balance !== 0)
                  ? currentDay.closing_balance
                  : (custodyTotalAvailable - (currentDay?.total_expenses ?? 0)),
                2
              )}
            </Text>
          </View>
          <Text style={[styles.targetNetUnit, { color: colors.textSecondary }]}>الرصيد الصافي المتاح</Text>
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
                backgroundColor: spentPct > 85 ? '#ef4444' : '#047857',
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
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.detailColValue, { color: colors.textPrimary }]}>
              {formatArabicNumber(effectiveOpeningBalance, 2)}
            </Text>
            <Image
              source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={{ width: 11, height: 11, tintColor: colors.textPrimary }}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={[styles.detailDivider, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]} />

        {/* 2. عهدة اليوم المضافة */}
        <View style={styles.detailCol}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.detailColLabel, { color: '#047857' }]}>العهدة المضافة</Text>
          </View>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.detailColValue, { color: '#047857' }]}>
              {formatArabicNumber(currentDay?.added_amount ?? 0, 2)}
            </Text>
            <Image
              source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={{ width: 11, height: 11, tintColor: '#047857' }}
              resizeMode="contain"
            />
          </View>
          {custodyAddedLogs.length > 0 && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                onPressManageLogs();
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Text style={styles.miniLogLink}>{toArabicDigits(custodyAddedLogs.length)} إضافات (إدارة/حذف)</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.detailDivider, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }]} />

        {/* 3. إجمالي المصاريف */}
        <View style={styles.detailCol}>
          <Text style={[styles.detailColLabel, { color: '#ef4444' }]}>إجمالي المصاريف</Text>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
            <Text style={[styles.detailColValue, { color: '#ef4444' }]}>
              {formatArabicNumber(currentDay?.total_expenses ?? 0, 2)}
            </Text>
            <Image
              source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={{ width: 11, height: 11, tintColor: '#ef4444' }}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
    </Animated.View>
  );
};

export const AhdaNetCustodyCard = React.memo(AhdaNetCustodyCardComponent);

const styles = StyleSheet.create({
  targetCardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
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
    backgroundColor: '#ecfdf5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  targetCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  targetCardDate: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'right',
  },
  targetCardHint: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
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
    color: '#047857',
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  dateRowContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  relativeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  relativeBadgeToday: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  relativeBadgeYesterday: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  relativeBadgeFuture: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  relativeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  relativeTextToday: {
    color: '#047857',
  },
  relativeTextYesterday: {
    color: '#b45309',
  },
  relativeTextFuture: {
    color: '#1d4ed8',
  },
});
