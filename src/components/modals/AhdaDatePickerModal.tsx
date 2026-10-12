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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.bottomSheetBackdrop}>
        <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border, maxHeight: '85%' }]}>
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
              <Ionicons name="chevron-forward" size={20} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.calendarMonthTitle, { color: colors.textPrimary }]}>
                {new Date(pickerYear, pickerMonth - 1, 1).toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' })}
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }}>
                {pickerYear} / {String(pickerMonth).padStart(2, '0')}
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
              <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Days of Week Header */}
          <View style={styles.calendarWeekRow}>
            {['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map((w, idx) => (
              <Text key={idx} style={[styles.calendarWeekDay, { color: colors.textSecondary }]}>
                {w}
              </Text>
            ))}
          </View>

          {/* 30 / 31 Days Grid */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
            <View style={styles.calendarDaysGrid}>
              {(() => {
                const firstDayIndex = new Date(pickerYear, pickerMonth - 1, 1).getDay();
                const totalDaysInMonth = new Date(pickerYear, pickerMonth, 0).getDate();
                const blanks = Array.from({ length: firstDayIndex });
                const dayNumbers = Array.from({ length: totalDaysInMonth }, (_, i) => i + 1);

                return (
                  <>
                    {blanks.map((_, i) => (
                      <View key={`b-${i}`} style={styles.calendarDayCellEmpty} />
                    ))}
                    {dayNumbers.map((d) => {
                      const dateFormatted = `${pickerYear}-${String(pickerMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      const isSelected = dateFormatted === selectedDate;
                      const isToday = dateFormatted === todayStr;
                      const hasCustodyData = days.some((dayItem) => dayItem.date === dateFormatted);

                      return (
                        <TouchableOpacity
                          key={`d-${d}`}
                          style={[
                            styles.calendarDayCell,
                            { borderColor: colors.border },
                            isSelected && { backgroundColor: '#ea580c', borderColor: '#ea580c' },
                            !isSelected && isToday && { borderColor: '#ea580c', borderWidth: 1.5 },
                            !isSelected && { backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' },
                          ]}
                          onPress={() => onSelectDate(dateFormatted)}
                          activeOpacity={0.7}
                        >
                          <Text
                            style={[
                              styles.calendarDayNum,
                              { color: isSelected ? '#ffffff' : colors.textPrimary },
                              isToday && !isSelected && { color: '#ea580c', fontWeight: '800' },
                            ]}
                          >
                            {d}
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
                      );
                    })}
                  </>
                );
              })()}
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
            >
              <Text style={styles.todayQuickBtnText}>الانتقال إلى اليوم الحالي ({todayStr})</Text>
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
    paddingHorizontal: 20,
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
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  monthNavBtn: {
    padding: 6,
  },
  calendarMonthTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  calendarWeekRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  calendarWeekDay: {
    width: '13%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  calendarDaysGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 4,
  },
  calendarDayCellEmpty: {
    width: '13%',
    aspectRatio: 1,
  },
  calendarDayCell: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarDayNum: {
    fontSize: 13,
    fontWeight: '700',
  },
  calendarDayDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  todayQuickBtn: {
    backgroundColor: '#ea580c',
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
