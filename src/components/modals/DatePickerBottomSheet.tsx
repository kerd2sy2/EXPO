import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

interface DatePickerBottomSheetProps {
  visible: boolean;
  selectedDate: string; // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const WEEKDAYS = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export const DatePickerBottomSheet: React.FC<DatePickerBottomSheetProps> = ({
  visible,
  selectedDate,
  onSelectDate,
  onClose,
  colors,
  isDarkMode,
  isRTL,
}) => {
  // Parse initial view year and month from selectedDate or today
  const initialDate = useMemo(() => {
    if (selectedDate && /^\d{4}-\d{2}-\d{2}$/.test(selectedDate)) {
      const [y, m, d] = selectedDate.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  }, [selectedDate]);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-indexed

  // Today in YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Yesterday in YYYY-MM-DD
  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Day before yesterday in YYYY-MM-DD
  const twoDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  // Days in current view month
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: ({ dayNum: number; dateStr: string } | null)[] = [];

    // Empty padding cells before first day
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Days of the month
    for (let i = 1; i <= totalDays; i++) {
      const mStr = String(viewMonth + 1).padStart(2, '0');
      const dStr = String(i).padStart(2, '0');
      days.push({
        dayNum: i,
        dateStr: `${viewYear}-${mStr}-${dStr}`,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelect = (dateStr: string) => {
    onSelectDate(dateStr);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Drag Handle */}
              <View style={[styles.handle, { backgroundColor: isDarkMode ? '#3f3f46' : '#cbd5e1' }]} />

              {/* Header */}
              <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>اختيار تاريخ المراجعة</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    اختر يوماً معيناً لعرض جميع طلبات المناديب فيه
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
                  onPress={onClose}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Quick Shortcuts */}
              <View style={[styles.shortcutsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[
                    styles.shortcutChip,
                    {
                      backgroundColor: selectedDate === todayStr ? colors.primary : colors.bg,
                      borderColor: selectedDate === todayStr ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(todayStr)}
                >
                  <Text
                    style={[
                      styles.shortcutText,
                      { color: selectedDate === todayStr ? '#ffffff' : colors.textPrimary },
                    ]}
                  >
                    🌟 اليوم
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.shortcutChip,
                    {
                      backgroundColor: selectedDate === yesterdayStr ? colors.primary : colors.bg,
                      borderColor: selectedDate === yesterdayStr ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(yesterdayStr)}
                >
                  <Text
                    style={[
                      styles.shortcutText,
                      { color: selectedDate === yesterdayStr ? '#ffffff' : colors.textPrimary },
                    ]}
                  >
                    ⏱️ أمس
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.shortcutChip,
                    {
                      backgroundColor: selectedDate === twoDaysAgoStr ? colors.primary : colors.bg,
                      borderColor: selectedDate === twoDaysAgoStr ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => handleSelect(twoDaysAgoStr)}
                >
                  <Text
                    style={[
                      styles.shortcutText,
                      { color: selectedDate === twoDaysAgoStr ? '#ffffff' : colors.textPrimary },
                    ]}
                  >
                    📅 قبل يومين
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Month Navigation Row */}
              <View style={[styles.monthNavRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity style={styles.navArrowBtn} onPress={isRTL ? handleNextMonth : handlePrevMonth}>
                  <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={22} color={colors.textPrimary} />
                </TouchableOpacity>

                <Text style={[styles.monthTitleText, { color: colors.textPrimary }]}>
                  {ARABIC_MONTHS[viewMonth]} {viewYear}
                </Text>

                <TouchableOpacity style={styles.navArrowBtn} onPress={isRTL ? handlePrevMonth : handleNextMonth}>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Weekday Labels Header */}
              <View style={[styles.weekdaysRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {WEEKDAYS.map((w, idx) => (
                  <View key={idx} style={styles.weekdayCell}>
                    <Text style={[styles.weekdayText, { color: colors.textSecondary }]}>{w}</Text>
                  </View>
                ))}
              </View>

              {/* Days Grid */}
              <View style={[styles.daysGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {calendarDays.map((item, idx) => {
                  if (!item) {
                    return <View key={idx} style={styles.emptyDayCell} />;
                  }
                  const isSelected = selectedDate === item.dateStr;
                  const isToday = todayStr === item.dateStr;

                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.dayCell,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : isToday
                            ? (isDarkMode ? '#3b82f625' : '#eff6ff')
                            : 'transparent',
                          borderColor: isToday ? colors.primary : 'transparent',
                          borderWidth: isToday && !isSelected ? 1 : 0,
                        },
                      ]}
                      onPress={() => handleSelect(item.dateStr)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayNumberText,
                          {
                            color: isSelected
                              ? '#ffffff'
                              : isToday
                              ? colors.primary
                              : colors.textPrimary,
                            fontWeight: isSelected || isToday ? '900' : '500',
                          },
                        ]}
                      >
                        {item.dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutsRow: {
    gap: 8,
    marginBottom: 16,
  },
  shortcutChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '700',
  },
  monthNavRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  navArrowBtn: {
    padding: 6,
    borderRadius: 8,
  },
  monthTitleText: {
    fontSize: 15,
    fontWeight: '800',
  },
  weekdaysRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  weekdayCell: {
    width: '14.28%',
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '700',
  },
  daysGrid: {
    flexWrap: 'wrap',
    paddingHorizontal: 4,
  },
  emptyDayCell: {
    width: '14.28%',
    height: 40,
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  dayNumberText: {
    fontSize: 13,
  },
});
