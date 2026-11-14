import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../../types/delegate';
import { toArabicDigits } from '../../../utils/formatters';
import { CustodyDayData } from '../../../services/custodyService';
import { ahdaEditExpenseStyles as styles } from './ahdaEditExpenseStyles';

interface EditExpenseDateSectionProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  editDate: string;
  setEditDate: (date: string) => void;
  days?: CustodyDayData[];
}

const getTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getYesterdayStr = () => {
  const now = new Date();
  now.setDate(now.getDate() - 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dt = new Date(y, m, d);
    try {
      return dt.toLocaleDateString('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }
  return dateStr;
};

const WEEK_DAY_NAMES = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

export const EditExpenseDateSection: React.FC<EditExpenseDateSectionProps> = ({
  colors,
  isDarkMode,
  editDate,
  setEditDate,
  days = [],
}) => {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [pickerYear, setPickerYear] = useState<number>(() => {
    const parts = editDate ? editDate.split('-') : [];
    return parts.length === 3 ? parseInt(parts[0], 10) : new Date().getFullYear();
  });
  const [pickerMonth, setPickerMonth] = useState<number>(() => {
    const parts = editDate ? editDate.split('-') : [];
    return parts.length === 3 ? parseInt(parts[1], 10) : new Date().getMonth() + 1;
  });

  useEffect(() => {
    if (editDate) {
      const parts = editDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          setPickerYear(y);
          setPickerMonth(m);
        }
      }
    }
  }, [editDate]);

  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();

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

  return (
    <View style={styles.inputGroup}>
      <View style={styles.dateHeaderRow}>
        <Text style={[styles.sheetLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
          تاريخ الفاتورة (التقويم) *
        </Text>
        <TouchableOpacity
          style={[
            styles.calendarToggleBadge,
            {
              backgroundColor: calendarOpen
                ? '#047857'
                : isDarkMode
                ? '#064e3b'
                : '#ecfdf5',
              borderColor: '#059669',
            },
          ]}
          onPress={() => setCalendarOpen(!calendarOpen)}
          activeOpacity={0.8}
        >
          <Ionicons
            name={calendarOpen ? 'chevron-up' : 'calendar'}
            size={12}
            color={calendarOpen ? '#ffffff' : '#047857'}
          />
          <Text
            style={[
              styles.calendarToggleBadgeText,
              { color: calendarOpen ? '#ffffff' : '#047857' },
            ]}
          >
            {calendarOpen ? 'إغلاق التقويم' : 'تغيير التاريخ'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.dateBar,
          {
            backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
            borderColor: calendarOpen ? '#047857' : colors.border,
          },
        ]}
        onPress={() => setCalendarOpen(!calendarOpen)}
        activeOpacity={0.8}
      >
        <View style={styles.dateBarRight}>
          <View
            style={[
              styles.calendarIconBox,
              { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5' },
            ]}
          >
            <Ionicons name="calendar-outline" size={18} color="#047857" />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.dateBarMainText, { color: colors.textPrimary }]}>
              {formatDisplayDate(editDate) || editDate}
            </Text>
            <Text style={[styles.dateBarSubText, { color: colors.textSecondary }]}>
              {toArabicDigits(editDate)}
            </Text>
          </View>
        </View>
        <Ionicons
          name={calendarOpen ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      <View style={styles.quickDateRow}>
        <TouchableOpacity
          style={[
            styles.quickDateChip,
            editDate === todayStr && styles.quickDateChipActive,
            {
              backgroundColor:
                editDate === todayStr
                  ? isDarkMode
                    ? '#064e3b'
                    : '#ecfdf5'
                  : isDarkMode
                  ? '#1e293b'
                  : '#f8fafc',
              borderColor: editDate === todayStr ? '#047857' : colors.border,
            },
          ]}
          onPress={() => {
            setEditDate(todayStr);
            const parts = todayStr.split('-');
            setPickerYear(parseInt(parts[0], 10));
            setPickerMonth(parseInt(parts[1], 10));
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.quickDateChipText,
              {
                color: editDate === todayStr ? '#047857' : colors.textSecondary,
                fontWeight: editDate === todayStr ? '800' : '600',
              },
            ]}
          >
            اليوم
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.quickDateChip,
            editDate === yesterdayStr && styles.quickDateChipActive,
            {
              backgroundColor:
                editDate === yesterdayStr
                  ? isDarkMode
                    ? '#064e3b'
                    : '#ecfdf5'
                  : isDarkMode
                  ? '#1e293b'
                  : '#f8fafc',
              borderColor: editDate === yesterdayStr ? '#047857' : colors.border,
            },
          ]}
          onPress={() => {
            setEditDate(yesterdayStr);
            const parts = yesterdayStr.split('-');
            setPickerYear(parseInt(parts[0], 10));
            setPickerMonth(parseInt(parts[1], 10));
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.quickDateChipText,
              {
                color: editDate === yesterdayStr ? '#047857' : colors.textSecondary,
                fontWeight: editDate === yesterdayStr ? '800' : '600',
              },
            ]}
          >
            أمس
          </Text>
        </TouchableOpacity>
      </View>

      {calendarOpen && (
        <View
          style={[
            styles.inlineCalendarContainer,
            {
              backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
              borderColor: isDarkMode ? '#334155' : '#cbd5e1',
            },
          ]}
        >
          <View
            style={[
              styles.calendarMonthRow,
              {
                borderColor: colors.border,
                backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
              },
            ]}
          >
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={[styles.calendarMonthTitle, { color: colors.textPrimary }]}>
                {new Date(pickerYear, pickerMonth - 1, 1).toLocaleDateString('ar-SA', {
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text
                style={{
                  fontSize: 10,
                  color: colors.textSecondary,
                  fontWeight: '700',
                  marginTop: 1,
                }}
              >
                {toArabicDigits(pickerYear)} /{' '}
                {toArabicDigits(String(pickerMonth).padStart(2, '0'))}
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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.calendarHeaderWeekRow, { borderBottomColor: colors.border }]}>
            {WEEK_DAY_NAMES.map((w, idx) => (
              <Text key={idx} style={[styles.calendarHeaderWeekDay, { color: colors.textSecondary }]}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.calendarWeeksContainer}>
            {weeks.map((week, wIdx) => (
              <View key={`week-${wIdx}`} style={styles.calendarWeekRow}>
                {week.map((d, dIdx) => {
                  if (d === null) {
                    return <View key={`blank-${dIdx}`} style={styles.calendarDayCellWrapper} />;
                  }

                  const dateFormatted = `${pickerYear}-${String(pickerMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const isSelected = dateFormatted === editDate;
                  const isToday = dateFormatted === todayStr;
                  const hasCustodyData = days?.some((dayItem) => dayItem.date === dateFormatted);

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
                            backgroundColor: isDarkMode ? '#064e3b33' : '#ecfdf5',
                          },
                          !isSelected && !isToday && {
                            backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                          },
                        ]}
                        onPress={() => setEditDate(dateFormatted)}
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

          <TouchableOpacity
            style={[styles.todayQuickBtn, { borderTopColor: colors.border }]}
            onPress={() => {
              const parts = todayStr.split('-');
              setPickerYear(parseInt(parts[0], 10));
              setPickerMonth(parseInt(parts[1], 10));
              setEditDate(todayStr);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="today-outline" size={13} color="#047857" style={{ marginLeft: 4 }} />
            <Text style={styles.todayQuickBtnText}>
              الانتقال إلى اليوم الحالي ({toArabicDigits(todayStr)})
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
