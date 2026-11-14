import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ARABIC_MONTHS,
  ARABIC_WEEKDAYS_FULL,
  DateFilterValue,
  calculateMondayWeeks,
  getDefaultMonthFilter,
} from './date-filter/dateFilterHelpers';
import { dateFilterStyles as styles } from './date-filter/dateFilterStyles';
import { DateRangeCalendarSection } from './date-filter/DateRangeCalendarSection';

export { DateFilterValue, getDefaultMonthFilter };

interface DateFilterModalProps {
  visible: boolean;
  currentFilter: DateFilterValue;
  onApply: (filter: DateFilterValue) => void;
  onClose: () => void;
  isDarkMode?: boolean;
}

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

  const [mode, setMode] = useState<'month' | 'range' | 'day'>(currentFilter.type || 'month');
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (currentFilter.month) return parseInt(currentFilter.month.split('-')[0], 10) || currentYear;
    return currentYear;
  });
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(() => {
    if (currentFilter.month) return (parseInt(currentFilter.month.split('-')[1], 10) || currentMonthIdx + 1) - 1;
    return currentMonthIdx;
  });
  const [singleDay, setSingleDay] = useState<number>(() => {
    if (currentFilter.date) return parseInt(currentFilter.date.split('-')[2], 10) || currentDayNum;
    return currentFilter.startDay || currentDayNum;
  });
  const [startDay, setStartDay] = useState<number>(currentFilter.startDay || 1);
  const [endDay, setEndDay] = useState<number>(currentFilter.endDay || 8);
  const [activeRangeField, setActiveRangeField] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (visible) {
      setMode(currentFilter.type || 'month');
      if (currentFilter.month) {
        const parts = currentFilter.month.split('-');
        setSelectedYear(parseInt(parts[0], 10) || currentYear);
        setSelectedMonthIdx((parseInt(parts[1], 10) || currentMonthIdx + 1) - 1);
      }
      if (currentFilter.type === 'day' && currentFilter.date) {
        setSingleDay(parseInt(currentFilter.date.split('-')[2], 10) || currentDayNum);
      }
      if (currentFilter.startDay) setStartDay(currentFilter.startDay);
      if (currentFilter.endDay) setEndDay(currentFilter.endDay);
    }
  }, [visible, currentFilter, currentYear, currentMonthIdx, currentDayNum]);

  const daysInSelectedMonth = useMemo(
    () => new Date(selectedYear, selectedMonthIdx + 1, 0).getDate(),
    [selectedYear, selectedMonthIdx]
  );

  const monthString = `${selectedYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`;
  const isCurrentMonth = selectedYear === currentYear && selectedMonthIdx === currentMonthIdx;

  const mondayWeeks = useMemo(
    () => calculateMondayWeeks(selectedYear, selectedMonthIdx, daysInSelectedMonth),
    [selectedYear, selectedMonthIdx, daysInSelectedMonth]
  );

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

  const handleDayPress = (day: number) => {
    if (mode === 'day') {
      setSingleDay(day);
      return;
    }
    if (mode === 'month') {
      setStartDay(day);
      setEndDay(Math.min(day + 7, daysInSelectedMonth));
      setMode('range');
      setActiveRangeField('end');
      return;
    }
    if (activeRangeField === 'start') {
      setStartDay(day);
      if (day > endDay) setEndDay(day);
      setActiveRangeField('end');
    } else {
      if (day < startDay) setStartDay(day);
      else setEndDay(day);
      setActiveRangeField('start');
    }
  };

  const handleApply = () => {
    if (mode === 'month') {
      onApply({
        type: 'month',
        month: monthString,
        startDate: `${monthString}-01`,
        endDate: `${monthString}-${String(daysInSelectedMonth).padStart(2, '0')}`,
        startDay: 1,
        endDay: daysInSelectedMonth,
        label: `${ARABIC_MONTHS[selectedMonthIdx]} ${selectedYear} (الشهر كاملاً)`,
        isDefault: isCurrentMonth,
      });
    } else if (mode === 'day') {
      const dayDate = `${monthString}-${String(singleDay).padStart(2, '0')}`;
      const dayName = ARABIC_WEEKDAYS_FULL[new Date(selectedYear, selectedMonthIdx, singleDay).getDay()];
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
      const dtStart = new Date(selectedYear, selectedMonthIdx, s);
      const dtEnd = new Date(selectedYear, selectedMonthIdx, e);
      const isMonToMon = dtStart.getDay() === 1 && dtEnd.getDay() === 1 && s !== e;
      const label = isMonToMon
        ? `من الاثنين ${s} إلى الاثنين ${e} ${ARABIC_MONTHS[selectedMonthIdx]} ${selectedYear}`
        : `من ${s} إلى ${e} ${ARABIC_MONTHS[selectedMonthIdx]} ${selectedYear}`;
      onApply({
        type: 'range',
        month: monthString,
        startDate: `${monthString}-${String(s).padStart(2, '0')}`,
        endDate: `${monthString}-${String(e).padStart(2, '0')}`,
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
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.bottomSheetCard, isDarkMode && styles.darkCard]}>
          <View style={[styles.dragHandle, isDarkMode && { backgroundColor: '#475569' }]} />

          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="calendar" size={20} color="#0284c7" />
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
            <View style={[styles.tabsContainer, isDarkMode && styles.darkTabsContainer]}>
              {(['month', 'range', 'day'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, mode === t && styles.activeTabBtn]}
                  onPress={() => setMode(t)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={t === 'month' ? 'calendar-outline' : t === 'range' ? 'swap-horizontal-outline' : 'today-outline'}
                    size={15}
                    color={mode === t ? '#fff' : isDarkMode ? '#94a3b8' : '#64748b'}
                  />
                  <Text style={[styles.tabBtnText, mode === t && styles.activeTabBtnText]}>
                    {t === 'month' ? 'شهر كامل' : t === 'range' ? 'من - إلى (فترة)' : 'يوم محدد'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <DateRangeCalendarSection
              isDarkMode={isDarkMode}
              mode={mode}
              selectedYear={selectedYear}
              selectedMonthIdx={selectedMonthIdx}
              daysInSelectedMonth={daysInSelectedMonth}
              isCurrentMonth={isCurrentMonth}
              effectiveStart={effectiveStart}
              effectiveEnd={effectiveEnd}
              singleDay={singleDay}
              activeRangeField={activeRangeField}
              mondayWeeks={mondayWeeks}
              onSelectPresetRange={(s, e) => {
                setStartDay(s);
                setEndDay(Math.min(e, daysInSelectedMonth));
                setMode('range');
              }}
              onSelectCurrentMonth={() => {
                const target = new Date(currentYear, currentMonthIdx, 1);
                setSelectedYear(target.getFullYear());
                setSelectedMonthIdx(target.getMonth());
                setMode('month');
              }}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
              onSetActiveRangeField={setActiveRangeField}
              onDayPress={handleDayPress}
            />
          </ScrollView>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply} activeOpacity={0.85}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.applyBtnText}>تطبيق التصفية</Text>
            </TouchableOpacity>

            {!currentFilter.isDefault && (
              <TouchableOpacity
                style={[styles.resetBtn, isDarkMode && styles.darkResetBtn]}
                onPress={() => {
                  onApply(getDefaultMonthFilter());
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={15} color="#0284c7" />
                <Text style={styles.resetBtnText}>إعادة للشهر كاملاً</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
