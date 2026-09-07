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
  label: string;       // e.g. 'سبتمبر 2026 (الشهر كاملاً)' or 'من 1 إلى 9 سبتمبر 2026'
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

export const getDefaultMonthFilter = (): DateFilterValue => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
  const totalDays = new Date(y, m + 1, 0).getDate();
  return {
    type: 'month',
    month: monthStr,
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

  const [mode, setMode] = useState<'month' | 'range'>(
    currentFilter.type === 'range' ? 'range' : 'month'
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

  const [startDay, setStartDay] = useState<number>(() => {
    if (currentFilter.startDay) return currentFilter.startDay;
    return 1;
  });

  const [endDay, setEndDay] = useState<number>(() => {
    if (currentFilter.endDay) return currentFilter.endDay;
    return 9; // Default to 9 matching 1-9.xlsx
  });

  const [activeRangeField, setActiveRangeField] = useState<'start' | 'end'>('start');

  useEffect(() => {
    if (visible) {
      setMode(currentFilter.type === 'range' ? 'range' : 'month');
      if (currentFilter.month) {
        const parts = currentFilter.month.split('-');
        setSelectedYear(parseInt(parts[0], 10) || currentYear);
        setSelectedMonthIdx((parseInt(parts[1], 10) || (currentMonthIdx + 1)) - 1);
      }
      if (currentFilter.startDay) {
        setStartDay(currentFilter.startDay);
      }
      if (currentFilter.endDay) {
        setEndDay(currentFilter.endDay);
      }
    }
  }, [visible, currentFilter, currentYear, currentMonthIdx]);

  const daysInSelectedMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonthIdx + 1, 0).getDate();
  }, [selectedYear, selectedMonthIdx]);

  const monthString = `${selectedYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`;
  const isCurrentMonth = selectedYear === currentYear && selectedMonthIdx === currentMonthIdx;

  const handlePrevMonth = () => {
    if (selectedMonthIdx === 0) {
      setSelectedYear(y => y - 1);
      setSelectedMonthIdx(11);
    } else {
      setSelectedMonthIdx(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIdx === 11) {
      setSelectedYear(y => y + 1);
      setSelectedMonthIdx(0);
    } else {
      setSelectedMonthIdx(m => m + 1);
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
    } else {
      const s = Math.min(startDay, endDay);
      const e = Math.min(Math.max(startDay, endDay), daysInSelectedMonth);
      const startStr = `${monthString}-${String(s).padStart(2, '0')}`;
      const endStr = `${monthString}-${String(e).padStart(2, '0')}`;
      onApply({
        type: 'range',
        month: monthString,
        startDate: startStr,
        endDate: endStr,
        startDay: s,
        endDay: e,
        label: `من ${s} إلى ${e} ${ARABIC_MONTHS[selectedMonthIdx]} ${selectedYear}`,
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
                  {mode === 'month' ? 'عرض إجمالي الشهر كاملاً' : `تحديد فترة: من يوم ${effectiveStart} إلى ${effectiveEnd}`}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Mode Switcher Tabs (شهر كامل / من إلى) */}
            <View style={[styles.tabsContainer, isDarkMode && styles.darkTabsContainer]}>
              <TouchableOpacity
                style={[styles.tabBtn, mode === 'month' && styles.activeTabBtn]}
                onPress={() => setMode('month')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
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
                  size={16}
                  color={mode === 'range' ? '#fff' : isDarkMode ? '#94a3b8' : '#64748b'}
                />
                <Text style={[styles.tabBtnText, mode === 'range' && styles.activeTabBtnText]}>
                  من - إلى (فترة محددة)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={styles.quickChipsRow}>
              <TouchableOpacity
                style={[
                  styles.quickChip,
                  mode === 'range' && effectiveStart === 1 && effectiveEnd === 2 && styles.activeQuickChip,
                  isDarkMode && styles.darkQuickChip,
                ]}
                onPress={() => handleSelectPresetRange(1, 2)}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    mode === 'range' && effectiveStart === 1 && effectiveEnd === 2 && styles.activeQuickChipText,
                    isDarkMode && styles.darkText,
                  ]}
                >
                  من 1 إلى 2
                </Text>
              </TouchableOpacity>

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
                  النصف الأول (1-15)
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
                    من يوم
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
                    إلى يوم
                  </Text>
                  <Text style={[styles.rangeFieldNum, isDarkMode && styles.darkText, activeRangeField === 'end' && { color: '#f97316' }]}>
                    {effectiveEnd}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Days Grid for Range Selection */}
            {mode === 'range' && (
              <View style={styles.daysContainer}>
                <Text style={[styles.daysGridTitle, isDarkMode && styles.darkText]}>
                  اضغط على اليوم لتحديده كـ {activeRangeField === 'start' ? 'بداية الفترة (من يوم)' : 'نهاية الفترة (إلى يوم)'}:
                </Text>
                <View style={styles.daysGrid}>
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(day => {
                    const isStart = day === effectiveStart;
                    const isEnd = day === effectiveEnd;
                    const inRange = day >= effectiveStart && day <= effectiveEnd;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayBox,
                          isDarkMode && styles.darkDayBox,
                          inRange && styles.inRangeDayBox,
                          (isStart || isEnd) && styles.selectedDayBox,
                        ]}
                        onPress={() => handleDayPress(day)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayNumText,
                            isDarkMode && styles.darkText,
                            inRange && styles.inRangeDayNumText,
                            (isStart || isEnd) && styles.selectedDayNumText,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Actions */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.applyBtnText}>تطبيق الفلتر</Text>
            </TouchableOpacity>

            {!currentFilter.isDefault && (
              <TouchableOpacity
                style={[styles.resetBtn, isDarkMode && styles.darkResetBtn]}
                onPress={handleResetToDefault}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={15} color="#f97316" />
                <Text style={styles.resetBtnText}>الشهر كاملاً</Text>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 38 : 28,
    maxHeight: '90%',
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
    gap: 6,
  },
  activeTabBtn: {
    backgroundColor: '#f97316',
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  activeTabBtnText: {
    color: '#ffffff',
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
    height: 38,
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
