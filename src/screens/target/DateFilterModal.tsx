import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface DateFilterValue {
  type: 'month' | 'day';
  month: string;       // e.g. '2026-09'
  date?: string;       // e.g. '2026-09-03' (when type === 'day')
  label: string;       // e.g. 'سبتمبر 2026 (1 - 30)' or '3 سبتمبر 2026'
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
    label: `${ARABIC_MONTHS[m]} ${y} (1 - ${totalDays})`,
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

  const [mode, setMode] = useState<'month' | 'day'>(currentFilter.type);
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
  const [selectedDayNum, setSelectedDayNum] = useState<number>(() => {
    if (currentFilter.type === 'day' && currentFilter.date) {
      const parts = currentFilter.date.split('-');
      return parseInt(parts[2], 10) || now.getDate();
    }
    return now.getDate();
  });

  useEffect(() => {
    if (visible) {
      setMode(currentFilter.type);
      if (currentFilter.month) {
        const parts = currentFilter.month.split('-');
        setSelectedYear(parseInt(parts[0], 10) || currentYear);
        setSelectedMonthIdx((parseInt(parts[1], 10) || (currentMonthIdx + 1)) - 1);
      }
      if (currentFilter.type === 'day' && currentFilter.date) {
        const parts = currentFilter.date.split('-');
        setSelectedDayNum(parseInt(parts[2], 10) || now.getDate());
      }
    }
  }, [visible, currentFilter, currentYear, currentMonthIdx, now]);

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

  const handleSelectQuickDay = (dayOffset: number) => {
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
    setSelectedYear(target.getFullYear());
    setSelectedMonthIdx(target.getMonth());
    setSelectedDayNum(target.getDate());
    setMode('day');
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
        label: `${ARABIC_MONTHS[selectedMonthIdx]} ${selectedYear} (1 - ${daysInSelectedMonth})`,
        isDefault: isDef,
      });
    } else {
      const validDay = Math.min(selectedDayNum, daysInSelectedMonth);
      const dayStr = String(validDay).padStart(2, '0');
      const dateStr = `${monthString}-${dayStr}`;
      onApply({
        type: 'day',
        month: monthString,
        date: dateStr,
        label: `${validDay} ${ARABIC_MONTHS[selectedMonthIdx]} ${selectedYear}`,
        isDefault: false,
      });
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        
        <View style={[styles.bottomSheetCard, isDarkMode && styles.darkCard]}>
          {/* Drag Handle */}
          <View style={[styles.dragHandle, isDarkMode && { backgroundColor: '#475569' }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="calendar" size={18} color="#f97316" />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.title, isDarkMode && styles.darkText]}>تحديد الفترة والتاريخ</Text>
                <Text style={styles.subtitle}>
                  {mode === 'month' ? 'عرض إجمالي الشهر كاملاً' : 'عرض بيانات يوم محدد'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Mode Switcher Tabs */}
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
                  الشهر كاملاً
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

            {/* Quick Shortcuts */}
            <View style={styles.quickChipsRow}>
              <TouchableOpacity
                style={[
                  styles.quickChip,
                  isCurrentMonth && mode === 'month' && styles.activeQuickChip,
                  isDarkMode && styles.darkQuickChip,
                ]}
                onPress={() => handleSelectQuickMonth(0)}
              >
                <Text style={[styles.quickChipText, isCurrentMonth && mode === 'month' && styles.activeQuickChipText, isDarkMode && styles.darkText]}>
                  الشهر الحالي
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickChip, isDarkMode && styles.darkQuickChip]}
                onPress={() => handleSelectQuickMonth(1)}
              >
                <Text style={[styles.quickChipText, isDarkMode && styles.darkText]}>
                  الشهر السابق
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickChip, isDarkMode && styles.darkQuickChip]}
                onPress={() => handleSelectQuickDay(0)}
              >
                <Text style={[styles.quickChipText, isDarkMode && styles.darkText]}>
                  اليوم
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickChip, isDarkMode && styles.darkQuickChip]}
                onPress={() => handleSelectQuickDay(1)}
              >
                <Text style={[styles.quickChipText, isDarkMode && styles.darkText]}>
                  أمس
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
                  {mode === 'month' ? `1 إلى ${daysInSelectedMonth} ${ARABIC_MONTHS[selectedMonthIdx]}` : `شهر ${selectedMonthIdx + 1} / ${selectedYear}`}
                </Text>
              </View>

              <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#e2e8f0' : '#1e293b'} />
              </TouchableOpacity>
            </View>

            {/* Days Grid if in Day Mode */}
            {mode === 'day' && (
              <View style={styles.daysContainer}>
                <View style={styles.daysGrid}>
                  {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map(day => {
                    const isSelected = selectedDayNum === day;
                    const isToday = isCurrentMonth && now.getDate() === day;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.dayBox,
                          isDarkMode && styles.darkDayBox,
                          isSelected && styles.selectedDayBox,
                          isToday && !isSelected && styles.todayDayBox,
                        ]}
                        onPress={() => setSelectedDayNum(day)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.dayNumText,
                            isDarkMode && styles.darkText,
                            isSelected && styles.selectedDayNumText,
                            isToday && !isSelected && styles.todayDayNumText,
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
                <Text style={styles.resetBtnText}>الشهر الحالي</Text>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '85%',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
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
    width: 36,
    height: 36,
    borderRadius: 10,
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
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  darkTabsContainer: {
    backgroundColor: '#1e293b',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
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
  quickChipsRow: {
    flexDirection: 'row-reverse',
    gap: 6,
  },
  quickChip: {
    flex: 1,
    paddingVertical: 7,
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
  daysContainer: {
    marginTop: 4,
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
  selectedDayBox: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  todayDayBox: {
    borderColor: '#f97316',
    borderWidth: 1.5,
  },
  dayNumText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  selectedDayNumText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  todayDayNumText: {
    color: '#f97316',
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingTop: 8,
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    backgroundColor: '#f97316',
    borderRadius: 12,
    height: 44,
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
