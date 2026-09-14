import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface DateFilterValue {
  type: 'month' | 'range' | 'day';
  month: string;       // e.g. '2026-09'
  date?: string;       // e.g. '2026-09-03' (when type === 'day')
  startDate?: string;  // e.g. '2026-09-01'
  endDate?: string;    // e.g. '2026-09-09'
  startDay?: number;   // e.g. 1
  endDay?: number;     // e.g. 9
  label: string;       // e.g. 'سبتمبر 2026 (الشهر كاملاً)' or 'من الاثنين 1 إلى الاثنين 8 سبتمبر 2026'
  isDefault: boolean;  // true when current full month
}

interface DateFilterModalProps {
  visible: boolean;
  currentFilter: DateFilterValue;
  onApply: (filter: DateFilterValue) => void;
  onClose: () => void;
  isDarkMode?: boolean;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'إبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const ARABIC_WEEKDAYS_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
const ARABIC_WEEKDAYS_FULL = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export const getDefaultMonthFilter = (): DateFilterValue => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
  const totalDays = new Date(y, m + 1, 0).getDate();
  return {
    type: 'month',
    month: monthStr,
    startDate: `${monthStr}-01`,
    endDate: `${monthStr}-${String(totalDays).padStart(2, '0')}`,
    startDay: 1,
    endDay: totalDays,
    label: `${ARABIC_MONTHS[m]} ${y} (الشهر كاملاً)`,
    isDefault: true,
  };
};

export const DateFilterModal: React.FC<DateFilterModalProps> = ({
  visible,
  currentFilter,
  onApply,
  onClose,
  isDarkMode = false,
}) => {
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();
  const currentDayNum = now.getDate();

  const [mode, setMode] = useState<'month' | 'range' | 'day'>(
    currentFilter.type || 'month'
  );

  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (currentFilter.month) {
      const parts = currentFilter.month.split('-');
      return parseInt(parts[0], 10) || currentYear;
    }
    return currentYear;
  });

  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(() => {
    if (currentFilter.month) {
      const parts = currentFilter.month.split('-');
      return (parseInt(parts[1], 10) || (currentMonthIdx + 1)) - 1;
    }
    return currentMonthIdx;
  });

  const [singleDay, setSingleDay] = useState<number>(() => {
    if (currentFilter.date) {
      const parts = currentFilter.date.split('-');
      return parseInt(parts[2], 10) || currentDayNum;
    }
    if (currentFilter.startDay) return currentFilter.startDay;
    return currentDayNum;
  });

  const [startDay, setStartDay] = useState<number>(() => {
    if (currentFilter.startDay) return currentFilter.startDay;
    return 1;
  });

  const [endDay, setEndDay] = useState<number>(() => {
    if (currentFilter.endDay) return currentFilter.endDay;
    return 8;
  });

  const [activeRangeField, setActiveRangeField] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (visible) {
      setMode(currentFilter.type || 'month');
      if (currentFilter.month) {
        const parts = currentFilter.month.split('-');
        setSelectedYear(parseInt(parts[0], 10) || currentYear);
        setSelectedMonthIdx((parseInt(parts[1], 10) || (currentMonthIdx + 1)) - 1);
      }
      if (currentFilter.type === 'day' && currentFilter.date) {
        const parts = currentFilter.date.split('-');
        setSingleDay(parseInt(parts[2], 10) || currentDayNum);
      }
      if (currentFilter.startDay) {
        setStartDay(currentFilter.startDay);
      }
      if (currentFilter.endDay) {
        setEndDay(currentFilter.endDay);
      }
    }
  }, [visible, currentFilter, currentYear, currentMonthIdx, currentDayNum]);

  const daysInSelectedMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonthIdx + 1, 0).getDate();
  }, [selectedYear, selectedMonthIdx]);

  const monthString = `${selectedYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`;
  const isCurrentMonth = selectedYear === currentYear && selectedMonthIdx === currentMonthIdx;

  // Calculate Mondays and Monday-to-Monday periods
  const mondayWeeks = useMemo(() => {
    const mondays: number[] = [];
    for (let d = 1; d <= daysInSelectedMonth; d++) {
      const dt = new Date(selectedYear, selectedMonthIdx, d);
      if (dt.getDay() === 1) { // 1 = Monday
        mondays.push(d);
      }
    }

    const weeks: { start: number; end: number; label: string; isMonToMon: boolean }[] = [];

    if (mondays.length === 0) {
      weeks.push({ start: 1, end: Math.min(8, daysInSelectedMonth), label: 'الأسبوع 1 (1 - 8)', isMonToMon: false });
      weeks.push({ start: 9, end: Math.min(16, daysInSelectedMonth), label: 'الأسبوع 2 (9 - 16)', isMonToMon: false });
      return weeks;
    }

    // If first Monday is after day 1, add start period
    if (mondays[0] > 1) {
      weeks.push({
        start: 1,
        end: mondays[0],
        label: `بداية الشهر (1 إلى الاثنين ${mondays[0]})`,
        isMonToMon: false,
      });
    }

    // Add Monday to Monday segments
    for (let i = 0; i < mondays.length; i++) {
      const s = mondays[i];
      let e = i + 1 < mondays.length ? mondays[i + 1] : daysInSelectedMonth;
      const isLast = i + 1 >= mondays.length;
      weeks.push({
        start: s,
        end: e,
        label: isLast
          ? `أسبوع ${i + 1} (الاثنين ${s} - نهاية الشهر ${e})`
          : `أسبوع ${i + 1} (الاثنين ${s} - الاثنين ${e})`,
        isMonToMon: !isLast,
      });
    }

    return weeks;
  }, [selectedYear, selectedMonthIdx, daysInSelectedMonth]);

  const handlePrevMonth = () => {
    if (selectedMonthIdx === 0) {
      setSelectedYear((y) => y - 1);
      setSelectedMonthIdx(11);
    } else {
      setSelectedMonthIdx((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIdx === 11) {
      setSelectedYear((y) => y + 1);
      setSelectedMonthIdx(0);
    } else {
      setSelectedMonthIdx((m) => m + 1);
    }
  };

  const handleSelectQuickMonth = (offset: number) => {
    const target = new Date(currentYear, currentMonthIdx - offset, 1);
    setSelectedYear(target.getFullYear());
    setSelectedMonthIdx(target.getMonth());
    setMode('month');
  };

  const handleSelectPresetRange = (s: number, e: number) => {
    setStartDay(s);
    setEndDay(Math.min(e, daysInSelectedMonth));
    setMode('range');
  };

  const handleDayPress = (day: number) => {
    if (mode === 'day') {
      setSingleDay(day);
      return;
    }

    if (mode === 'month') {
      // Switching to range on day click
      setStartDay(day);
      setEndDay(Math.min(day + 7, daysInSelectedMonth));
      setMode('range');
      setActiveRangeField('end');
      return;
    }

    if (activeRangeField === 'start') {
      setStartDay(day);
      if (day > endDay) {
        setEndDay(day);
      }
      setActiveRangeField('end');
    } else {
      if (day < startDay) {
        setStartDay(day);
      } else {
        setEndDay(day);
      }
      setActiveRangeField('start');
    }
  };

  const handleResetToDefault = () => {
    onApply(getDefaultMonthFilter());
    onClose();
  };

  const handleApply = () => {
    if (mode === 'month') {
      const isDef = isCurrentMonth;
      onApply({
        type: 'month',
        month: monthString,
        startDate: `${monthString}-01`,
        endDate: `${monthString}-${String(daysInSelectedMonth).padStart(2, '0')}`,
        startDay: 1,
        endDay: daysInSelectedMonth,
        label: `${ARABIC_MONTHS[selectedMonthIdx]} ${selectedYear} (الشهر كاملاً)`,
        isDefault: isDef,
      });
    } else if (mode === 'day') {
      const dayDate = `${monthString}-${String(singleDay).padStart(2, '0')}`;
      const dt = new Date(selectedYear, selectedMonthIdx, singleDay);
      const dayName = ARABIC_WEEKDAYS_FULL[dt.getDay()];
      onApply({
        type: 'day',
        month: monthString,
        date: dayDate,
        startDate: dayDate,
        endDate: dayDate,
        startDay: singleDay,
        endDay: singleDay,
        label: `يوم ${singleDay} ${ARABIC_MONTHS[selectedMonthIdx]} ${selectedYear} (${dayName})`,
        isDefault: false,
      });
    } else {
      const s = Math.min(startDay, endDay);
      const e = Math.min(Math.max(startDay, endDay), daysInSelectedMonth);
      const startStr = `${monthString}-${String(s).padStart(2, '0')}`;
      const endStr = `${monthString}-${String(e).padStart(2, '0')}`;
      const dtStart = new Date(selectedYear, selectedMonthIdx, s);
      const dtEnd = new Date(selectedYear, selectedMonthIdx, e);
      const isMonToMon = dtStart.getDay() === 1 && dtEnd.getDay() === 1 && s !== e;

      let label = `من ${s} إلى ${e} ${ARABIC_MONTHS[selectedMonthIdx]} ${selectedYear}`;
      if (isMonToMon) {
        label = `من الاثنين ${s} إلى الاثنين ${e} ${ARABIC_MONTHS[selectedMonthIdx]} ${selectedYear}`;
      }

      onApply({
        type: 'range',
        month: monthString,
        startDate: startStr,
        endDate: endStr,
        startDay: s,
        endDay: e,
        label,
        isDefault: false,
      });
    }
    onClose();
  };

  if (!visible) return null;

  const effectiveStart = Math.min(startDay, endDay);
  const effectiveEnd = Math.max(startDay, endDay);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={[styles.bottomSheetCard, isDarkMode && styles.darkCard]}>
          {/* Drag Handle */}
          <View style={[styles.dragHandle, isDarkMode && { backgroundColor: '#475569' }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="calendar" size={20} color="#f97316" />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.title, isDarkMode && styles.darkText]}>تحديد الفترة والتاريخ</Text>
                <Text style={styles.subtitle}>
                  {mode === 'month'
                    ? 'عرض إجمالي الشهر كاملاً'
                    : mode === 'day'
                    ? `تحديد يوم: ${singleDay} ${ARABIC_MONTHS[selectedMonthIdx]}`
                    : `تحديد فترة: من يوم ${effectiveStart} إلى ${effectiveEnd}`}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Mode Switcher Tabs (3 Tabs: شهر كامل / أسبوع وفترة / يوم محدد) */}
            <View style={[styles.tabsContainer, isDarkMode && styles.darkTabsContainer]}>
              <TouchableOpacity
                style={[styles.tabBtn, mode === 'month' && styles.activeTabBtn]}
                onPress={() => setMode('month')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar-outline"
                  size={15}
                  color={mode === 'month' ? '#fff' : isDarkMode ? '#94a3b8' : '#64748b'}
                />
                <Text style={[styles.tabBtnText, mode === 'month' && styles.activeTabBtnText]}>
                  شهر كامل
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, mode === 'range' && styles.activeTabBtn]}
                onPress={() => setMode('range')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={15}
                  color={mode === 'range' ? '#fff' : isDarkMode ? '#94a3b8' : '#64748b'}
                />
                <Text style={[styles.tabBtnText, mode === 'range' && styles.activeTabBtnText]}>
                  من - إلى (فترة)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, mode === 'day' && styles.activeTabBtn]}
                onPress={() => setMode('day')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="today-outline"
                  size={15}
                  color={mode === 'day' ? '#fff' : isDarkMode ? '#94a3b8' : '#64748b'}
                />
                <Text style={[styles.tabBtnText, mode === 'day' && styles.activeTabBtnText]}>
                  يوم محدد
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Monday-to-Monday Weeks Section */}
            <View style={[styles.presetsBlock, isDarkMode && styles.darkSubCard]}>
              <View style={styles.presetsBlockHeader}>
                <Ionicons name="repeat" size={14} color="#f97316" />
                <Text style={[styles.presetsBlockTitle, isDarkMode && styles.darkText]}>
                  تحديد سريع بالأسابيع (من الاثنين إلى الاثنين):
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monWeeksRow}>
                {mondayWeeks.map((wk, idx) => {
                  const isActive = mode === 'range' && effectiveStart === wk.start && effectiveEnd === wk.end;
                  return (
                    <TouchableOpacity
                      key={`mon-wk-${idx}`}
                      style={[
                        styles.monWeekChip,
                        isActive && styles.activeMonWeekChip,
                        isDarkMode && styles.darkMonWeekChip,
                      ]}
                      onPress={() => handleSelectPresetRange(wk.start, wk.end)}
                      activeOpacity={0.75}
                    >
                      <Ionicons
                        name="flash-outline"
                        size={12}
                        color={isActive ? '#ffffff' : '#f97316'}
                      />
                      <Text
                        style={[
                          styles.monWeekChipText,
                          isActive && styles.activeMonWeekChipText,
                          isDarkMode && !isActive && styles.darkText,
                        ]}
                      >
                        {wk.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Standard Quick Presets (1-9, 1-15, 16-30, إلخ) */}
            <View style={styles.quickChipsRow}>
              <TouchableOpacity
                style={[
                  styles.quickChip,
                  mode === 'range' && effectiveStart === 1 && effectiveEnd === 9 && styles.activeQuickChip,
                  isDarkMode && styles.darkQuickChip,
                ]}
                onPress={() => handleSelectPresetRange(1, 9)}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    mode === 'range' && effectiveStart === 1 && effectiveEnd === 9 && styles.activeQuickChipText,
                    isDarkMode && styles.darkText,
                  ]}
                >
                  من 1 إلى 9
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickChip,
                  mode === 'range' && effectiveStart === 1 && effectiveEnd === 15 && styles.activeQuickChip,
                  isDarkMode && styles.darkQuickChip,
                ]}
                onPress={() => handleSelectPresetRange(1, 15)}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    mode === 'range' && effectiveStart === 1 && effectiveEnd === 15 && styles.activeQuickChipText,
                    isDarkMode && styles.darkText,
                  ]}
                >
                  النصف 1 (1-15)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickChip,
                  mode === 'range' && effectiveStart === 16 && effectiveEnd === daysInSelectedMonth && styles.activeQuickChip,
                  isDarkMode && styles.darkQuickChip,
                ]}
                onPress={() => handleSelectPresetRange(16, daysInSelectedMonth)}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    mode === 'range' && effectiveStart === 16 && effectiveEnd === daysInSelectedMonth && styles.activeQuickChipText,
                    isDarkMode && styles.darkText,
                  ]}
                >
                  النصف 2 (16-{daysInSelectedMonth})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickChip,
                  mode === 'month' && isCurrentMonth && styles.activeQuickChip,
                  isDarkMode && styles.darkQuickChip,
                ]}
                onPress={() => handleSelectQuickMonth(0)}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    mode === 'month' && isCurrentMonth && styles.activeQuickChipText,
                    isDarkMode && styles.darkText,
                  ]}
                >
                  الشهر الحالي
                </Text>
              </TouchableOpacity>
            </View>

            {/* Month & Year Navigator */}
            <View style={[styles.monthNavigatorCard, isDarkMode && styles.darkSubCard]}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-back" size={20} color={isDarkMode ? '#e2e8f0' : '#1e293b'} />
              </TouchableOpacity>

              <View style={styles.monthDisplayCol}>
                <Text style={[styles.monthNameText, isDarkMode && styles.darkText]}>
                  {ARABIC_MONTHS[selectedMonthIdx]} {selectedYear}
                </Text>
                <Text style={styles.monthRangeHint}>
                  {mode === 'month'
                    ? `1 إلى ${daysInSelectedMonth} ${ARABIC_MONTHS[selectedMonthIdx]}`
                    : mode === 'day'
                    ? `اختر يوماً من 1 إلى ${daysInSelectedMonth}`
                    : `اختر الأيام من 1 إلى ${daysInSelectedMonth}`}
                </Text>
              </View>

              <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#e2e8f0' : '#1e293b'} />
              </TouchableOpacity>
            </View>

            {/* Range Pickers: [من يوم: X] & [إلى يوم: Y] */}
            {mode === 'range' && (
              <View style={styles.rangeSelectCardsRow}>
                <TouchableOpacity
                  style={[
                    styles.rangeFieldBox,
                    activeRangeField === 'start' && styles.activeRangeFieldBox,
                    isDarkMode && styles.darkSubCard,
                  ]}
                  onPress={() => setActiveRangeField('start')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.rangeFieldLabel, { color: activeRangeField === 'start' ? '#f97316' : '#64748b' }]}>
                    من يوم ({ARABIC_WEEKDAYS_SHORT[new Date(selectedYear, selectedMonthIdx, effectiveStart).getDay()]})
                  </Text>
                  <Text style={[styles.rangeFieldNum, isDarkMode && styles.darkText, activeRangeField === 'start' && { color: '#f97316' }]}>
                    {effectiveStart}
                  </Text>
                </TouchableOpacity>

                <View style={styles.rangeArrowIconWrap}>
                  <Ionicons name="arrow-back" size={18} color="#f97316" />
                </View>

                <TouchableOpacity
                  style={[
                    styles.rangeFieldBox,
                    activeRangeField === 'end' && styles.activeRangeFieldBox,
                    isDarkMode && styles.darkSubCard,
                  ]}
                  onPress={() => setActiveRangeField('end')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.rangeFieldLabel, { color: activeRangeField === 'end' ? '#f97316' : '#64748b' }]}>
                    إلى يوم ({ARABIC_WEEKDAYS_SHORT[new Date(selectedYear, selectedMonthIdx, effectiveEnd).getDay()]})
                  </Text>
                  <Text style={[styles.rangeFieldNum, isDarkMode && styles.darkText, activeRangeField === 'end' && { color: '#f97316' }]}>
                    {effectiveEnd}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Single Day Card Selector */}
            {mode === 'day' && (
              <View style={[styles.singleDayBanner, isDarkMode && styles.darkSubCard]}>
                <Ionicons name="today" size={20} color="#f97316" />
                <View style={{ alignItems: 'flex-end', flex: 1 }}>
                  <Text style={[styles.singleDayBannerTitle, isDarkMode && styles.darkText]}>
                    اليوم المحدد: {ARABIC_WEEKDAYS_FULL[new Date(selectedYear, selectedMonthIdx, singleDay).getDay()]} {singleDay} {ARABIC_MONTHS[selectedMonthIdx]}
                  </Text>
                  <Text style={styles.singleDayBannerSub}>اضغط على أي رقم يوم في الأسفل لتغييره</Text>
                </View>
              </View>
            )}

            {/* Interactive Days Calendar Grid */}
            <View style={styles.daysContainer}>
              <Text style={[styles.daysGridTitle, isDarkMode && styles.darkText]}>
                {mode === 'day'
                  ? 'اختر اليوم المطلوب:'
                  : mode === 'range'
                  ? `اضغط لتحديد ${activeRangeField === 'start' ? 'بداية الفترة (من يوم)' : 'نهاية الفترة (إلى يوم)'}:`
                  : 'أيام الشهر:'}
              </Text>

              <View style={styles.daysGrid}>
                {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((day) => {
                  const dt = new Date(selectedYear, selectedMonthIdx, day);
                  const isMonday = dt.getDay() === 1; // الاثنين
                  const isStart = mode === 'range' && day === effectiveStart;
                  const isEnd = mode === 'range' && day === effectiveEnd;
                  const inRange = mode === 'range' && day >= effectiveStart && day <= effectiveEnd;
                  const isSingleSelected = mode === 'day' && day === singleDay;

                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.dayBox,
                        isDarkMode && styles.darkDayBox,
                        isMonday && styles.mondayDayBox,
                        inRange && styles.inRangeDayBox,
                        (isStart || isEnd || isSingleSelected) && styles.selectedDayBox,
                      ]}
                      onPress={() => handleDayPress(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayNumText,
                          isDarkMode && styles.darkText,
                          isMonday && styles.mondayDayNumText,
                          inRange && styles.inRangeDayNumText,
                          (isStart || isEnd || isSingleSelected) && styles.selectedDayNumText,
                        ]}
                      >
                        {day}
                      </Text>
                      {isMonday && (
                        <View style={[styles.mondayDot, (isStart || isEnd || isSingleSelected) && { backgroundColor: '#ffffff' }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.mondayHintText}>💡 الأيام التي تحتها نقطة تمثل يوم (الاثنين) في الشهر</Text>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.applyBtnText}>تطبيق التصفية</Text>
            </TouchableOpacity>

            {!currentFilter.isDefault && (
              <TouchableOpacity
                style={[styles.resetBtn, isDarkMode && styles.darkResetBtn]}
                onPress={handleResetToDefault}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={15} color="#f97316" />
                <Text style={styles.resetBtnText}>إعادة للشهر كاملاً</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 28,
    maxHeight: '92%',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
  },
  darkCard: {
    backgroundColor: '#0f172a',
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  headerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  scrollBody: {
    paddingVertical: 14,
    gap: 12,
  },
  tabsContainer: {
    flexDirection: 'row-reverse',
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  darkTabsContainer: {
    backgroundColor: '#1e293b',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  activeTabBtn: {
    backgroundColor: '#f97316',
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  activeTabBtnText: {
    color: '#ffffff',
  },
  presetsBlock: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 8,
  },
  presetsBlockHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  presetsBlockTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  monWeeksRow: {
    flexDirection: 'row-reverse',
    gap: 6,
    paddingVertical: 2,
  },
  monWeekChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  darkMonWeekChip: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  activeMonWeekChip: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  monWeekChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  activeMonWeekChipText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  quickChipsRow: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkQuickChip: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  activeQuickChip: {
    backgroundColor: '#fff7ed',
    borderColor: '#f97316',
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  activeQuickChipText: {
    color: '#f97316',
  },
  monthNavigatorCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  darkSubCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthDisplayCol: {
    alignItems: 'center',
    gap: 2,
  },
  monthNameText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  monthRangeHint: {
    fontSize: 11,
    color: '#64748b',
  },
  rangeSelectCardsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 4,
  },
  rangeFieldBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeRangeFieldBox: {
    borderColor: '#f97316',
    backgroundColor: '#fff7ed',
  },
  rangeFieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  rangeFieldNum: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  rangeArrowIconWrap: {
    paddingHorizontal: 4,
  },
  singleDayBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 14,
    padding: 12,
  },
  singleDayBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ea580c',
  },
  singleDayBannerSub: {
    fontSize: 11,
    color: '#9a3412',
    marginTop: 2,
  },
  daysContainer: {
    marginTop: 6,
  },
  daysGridTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 8,
    textAlign: 'right',
  },
  daysGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  dayBox: {
    width: 38,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkDayBox: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  mondayDayBox: {
    borderColor: '#f97316',
    borderWidth: 1.5,
  },
  mondayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f97316',
    marginTop: 2,
  },
  mondayHintText: {
    fontSize: 10,
    color: '#f97316',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
  inRangeDayBox: {
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  selectedDayBox: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  dayNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  mondayDayNumText: {
    color: '#ea580c',
    fontWeight: '800',
  },
  inRangeDayNumText: {
    color: '#ea580c',
    fontWeight: '800',
  },
  selectedDayNumText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingTop: 10,
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    backgroundColor: '#f97316',
    borderRadius: 12,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    elevation: 2,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  resetBtn: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  darkResetBtn: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: '#f97316',
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f97316',
  },
  darkText: {
    color: '#ffffff',
  },
});
