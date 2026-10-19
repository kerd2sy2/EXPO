import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { CustodyDayData } from '../../services/custodyService';
import { toArabicDigits } from '../../utils/formatters';

interface AhdaDatePickerModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  selectedDate: string;
  pickerYear: number;
  setPickerYear: (y: number) => void;
  pickerMonth: number;
  setPickerMonth: (m: number) => void;
  days: CustodyDayData[];
  onSelectDate: (date: string) => void;
  onClose: () => void;
}

export const AhdaDatePickerModal: React.FC<AhdaDatePickerModalProps> = ({
  visible,
  colors,
  isDarkMode,
  selectedDate,
  pickerYear,
  setPickerYear,
  pickerMonth,
  setPickerMonth,
  days,
  onSelectDate,
  onClose,
}) => {
  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getTodayStr();

  // Calendar math
  const firstDayIndex = new Date(pickerYear, pickerMonth - 1, 1).getDay();
  const totalDaysInMonth = new Date(pickerYear, pickerMonth, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const weekDayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.bottomSheetBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '88%' }]}>
          <View style={styles.sheetIndicator} />

          {/* Header: Title + Close */}
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>اختر تاريخ العهدة</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Month & Year Controller Bar */}
          <View style={[styles.calendarMonthRow, { borderColor: colors.border, backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' }]}>
            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() => {
                if (pickerMonth === 1) {
                  setPickerMonth(12);
                  setPickerYear(pickerYear - 1);
                } else {
                  setPickerMonth(pickerMonth - 1);
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-forward" size={22} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.calendarMonthTitle, { color: colors.textPrimary }]}>
                {new Date(pickerYear, pickerMonth - 1, 1).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '700', marginTop: 2 }}>
                {toArabicDigits(pickerYear)} / {toArabicDigits(String(pickerMonth).padStart(2, '0'))}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.monthNavBtn}
              onPress={() => {
                if (pickerMonth === 12) {
                  setPickerMonth(1);
                  setPickerYear(pickerYear + 1);
                } else {
                  setPickerMonth(pickerMonth + 1);
                }
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Days of Week Header (Exact 7-column flex alignment) */}
          <View style={[styles.calendarHeaderWeekRow, { borderBottomColor: colors.border }]}>
            {weekDayNames.map((w, idx) => (
              <Text key={idx} style={[styles.calendarHeaderWeekDay, { color: colors.textSecondary }]}>
                {w}
              </Text>
            ))}
          </View>

          {/* Grid of Weeks & Days (Each row has 7 items, perfectly aligned) */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
            <View style={styles.calendarWeeksContainer}>
              {weeks.map((week, wIdx) => (
                <View key={`week-${wIdx}`} style={styles.calendarWeekRow}>
                  {week.map((d, dIdx) => {
                    if (d === null) {
                      return <View key={`blank-${dIdx}`} style={styles.calendarDayCellWrapper} />;
                    }

                    const dateFormatted = `${pickerYear}-${String(pickerMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                    const isSelected = dateFormatted === selectedDate;
                    const isToday = dateFormatted === todayStr;
                    const hasCustodyData = days.some((dayItem) => dayItem.date === dateFormatted);

                    return (
                      <View key={`day-${d}`} style={styles.calendarDayCellWrapper}>
                        <TouchableOpacity
                          style={[
                            styles.calendarDayBtn,
                            { borderColor: colors.border },
                            isSelected && { backgroundColor: '#047857', borderColor: '#047857' },
                            !isSelected && isToday && {
                              borderColor: '#047857',
                              borderWidth: 1.5,
                              backgroundColor: isDarkMode ? '#2d1f18' : '#ecfdf5',
                            },
                            !isSelected && !isToday && { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc' },
                          ]}
                          onPress={() => onSelectDate(dateFormatted)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.calendarDayNum,
                              { color: isSelected ? '#ffffff' : colors.textPrimary },
                              isToday && !isSelected && { color: '#047857', fontWeight: '800' },
                            ]}
                          >
                            {toArabicDigits(d)}
                          </Text>
                          {hasCustodyData && (
                            <View
                              style={[
                                styles.calendarDayDot,
                                { backgroundColor: isSelected ? '#ffffff' : '#16a34a' },
                              ]}
                            />
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Quick Action Footer: Go to Today */}
          <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
            <TouchableOpacity
              style={styles.todayQuickBtn}
              onPress={() => {
                const parts = todayStr.split('-');
                setPickerYear(parseInt(parts[0], 10));
                setPickerMonth(parseInt(parts[1], 10));
                onSelectDate(todayStr);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.todayQuickBtnText}>
                الانتقال إلى اليوم الحالي ({toArabicDigits(todayStr)})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sheetIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
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
  calendarMonthRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  monthNavBtn: {
    padding: 6,
  },
  calendarMonthTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  calendarHeaderWeekRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
  },
  calendarHeaderWeekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarWeeksContainer: {
    paddingVertical: 4,
  },
  calendarWeekRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginVertical: 4,
  },
  calendarDayCellWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
  },
  calendarDayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendarDayNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  calendarDayDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  todayQuickBtn: {
    backgroundColor: '#047857',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayQuickBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
