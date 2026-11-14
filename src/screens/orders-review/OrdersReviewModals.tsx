import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { DelegateWithStatus } from '../../services/supervisor';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { getTodayRiyadhDateKey } from '../../utils/dateUtils';
import { extractKeySortValue } from '../EmployeesScreen';

const ARABIC_MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];
const WEEKDAYS_AR = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

interface OrdersDatePickerModalProps {
  visible: boolean;
  selectedDate: string | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onSelectDate: (dateKey: string | null) => void;
  onClose: () => void;
}

export const OrdersDatePickerModal: React.FC<OrdersDatePickerModalProps> = ({
  visible,
  selectedDate,
  colors,
  isDarkMode,
  isRTL,
  onSelectDate,
  onClose,
}) => {
  const todayKey = useMemo(() => getTodayRiyadhDateKey(), []);
  const [viewYear, setViewYear] = useState<number>(() => Number(todayKey.slice(0, 4)) || 2026);
  const [viewMonth, setViewMonth] = useState<number>(() => (Number(todayKey.slice(5, 7)) || 1) - 1);

  useEffect(() => {
    if (visible) {
      const base = selectedDate || todayKey;
      const y = Number(base.slice(0, 4));
      const m = Number(base.slice(5, 7));
      if (y && m) {
        setViewYear(y);
        setViewMonth(m - 1);
      }
    }
  }, [visible, selectedDate, todayKey]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(viewYear, viewMonth, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0)).getUTCDate();
    const cells: Array<{ day: number | null; keyStr: string }> = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push({ day: null, keyStr: `empty_start_${i}` });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(viewMonth + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      cells.push({ day: d, keyStr: `${viewYear}-${mm}-${dd}` });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: null, keyStr: `empty_end_${cells.length}` });
    }
    return cells;
  }, [viewYear, viewMonth]);

  const shiftMonth = (delta: number) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[styles.dialogCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>اختر اليوم بالتقويم</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.monthNav,
              { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.monthArrow}>
              <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>
              {ARABIC_MONTHS[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.monthArrow}>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.weekRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {WEEKDAYS_AR.map((wd) => (
              <Text key={wd} style={[styles.weekDayText, { color: colors.textSecondary }]}>
                {wd}
              </Text>
            ))}
          </View>

          <View style={[styles.daysGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            {calendarCells.map((cell) => {
              if (!cell.day) {
                return <View key={cell.keyStr} style={styles.dayCell} />;
              }
              const isSelected = selectedDate === cell.keyStr;
              const isToday = todayKey === cell.keyStr;
              return (
                <TouchableOpacity
                  key={cell.keyStr}
                  style={[
                    styles.dayCell,
                    styles.dayBtn,
                    isToday && { borderWidth: 1, borderColor: colors.primary },
                    isSelected && { backgroundColor: colors.primary },
                  ]}
                  onPress={() => {
                    onSelectDate(cell.keyStr);
                    onClose();
                  }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      { color: isSelected ? '#fff' : isToday ? colors.primary : colors.textPrimary },
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.footerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: colors.primary + '18' }]}
              onPress={() => {
                onSelectDate(todayKey);
                onClose();
              }}
            >
              <Text style={[styles.footerBtnText, { color: colors.primary }]}>اليوم الحالي</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.footerBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
              onPress={() => {
                onSelectDate(null);
                onClose();
              }}
            >
              <Text style={[styles.footerBtnText, { color: colors.textSecondary }]}>إلغاء فلتر اليوم</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

interface OrdersEmployeeSearchModalProps {
  visible: boolean;
  employees: DelegateWithStatus[];
  selectedEmployeeId: string | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onSelectEmployee: (emp: DelegateWithStatus | null) => void;
  onClose: () => void;
}

export const OrdersEmployeeSearchModal: React.FC<OrdersEmployeeSearchModalProps> = ({
  visible,
  employees,
  selectedEmployeeId,
  colors,
  isDarkMode,
  isRTL,
  onSelectEmployee,
  onClose,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  const filteredEmployees = useMemo(() => {
    const q = toEnglishDigits(query.trim()).toLowerCase();
    return [...employees]
      .filter((e) => {
        if (!q) return true;
        return (
          (e.name || '').toLowerCase().includes(q) ||
          toEnglishDigits(e.key_number || '').toLowerCase().includes(q) ||
          toEnglishDigits(e.motorcycle_number || '').toLowerCase().includes(q) ||
          toEnglishDigits(e.application_id || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const kA = extractKeySortValue(a.key_number);
        const kB = extractKeySortValue(b.key_number);
        if (kA !== kB) return kA - kB;
        return (a.name || '').localeCompare(b.name || '', 'ar');
      });
  }, [employees, query]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={[styles.sheetCard, { backgroundColor: colors.card }]}
        >
          <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>بحث واختيار موظف</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                borderColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder="ابحث بالاسم، رقم المفتاح، اللوحة، أو المعرف..."
              placeholderTextColor={colors.textSecondary}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {selectedEmployeeId && (
            <TouchableOpacity
              style={[styles.clearEmpBtn, { backgroundColor: '#ef444415', borderColor: '#ef444440' }]}
              onPress={() => {
                onSelectEmployee(null);
                onClose();
              }}
            >
              <Ionicons name="close-circle-outline" size={17} color="#ef4444" />
              <Text style={styles.clearEmpText}>إلغاء فلتر الموظف (عرض جميع الموظفين)</Text>
            </TouchableOpacity>
          )}

          <FlatList
            data={filteredEmployees}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
            renderItem={({ item: emp }) => {
              const isSelected = String(emp.id) === String(selectedEmployeeId);
              return (
                <TouchableOpacity
                  style={[
                    styles.empRow,
                    {
                      backgroundColor: isSelected
                        ? colors.primary + '15'
                        : isDarkMode
                        ? '#1e293b'
                        : '#f8fafc',
                      borderColor: isSelected ? colors.primary : colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  onPress={() => {
                    onSelectEmployee(emp);
                    onClose();
                  }}
                >
                  <View style={[styles.keyPill, { backgroundColor: '#f59e0b18' }]}>
                    <Text style={styles.keyPillText}>{emp.key_number || '--'}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.empName, { color: colors.textPrimary }]} numberOfLines={1}>
                      {emp.name}
                    </Text>
                    <Text style={[styles.empMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                      {emp.motorcycle_number ? `دباب ${emp.motorcycle_number}` : 'بدون دباب'}
                      {emp.application_id ? ` • يوزر #${emp.application_id}` : ''}
                    </Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                لا يوجد موظف مطابق للبحث
              </Text>
            }
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 18,
  },
  dialogCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  headerRow: { justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '800' },
  monthNav: {
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthArrow: { padding: 4 },
  monthLabel: { fontSize: 14, fontWeight: '800' },
  weekRow: { justifyContent: 'space-between' },
  weekDayText: { width: '14.2%', textAlign: 'center', fontSize: 12, fontWeight: '700' },
  daysGrid: { flexWrap: 'wrap' },
  dayCell: { width: '14.28%', height: 38, alignItems: 'center', justifyContent: 'center', marginVertical: 2 },
  dayBtn: { borderRadius: 10 },
  dayText: { fontSize: 13, fontWeight: '700' },
  footerActions: { gap: 8, marginTop: 4 },
  footerBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  footerBtnText: { fontSize: 12, fontWeight: '800' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetCard: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
    maxHeight: '82%',
    gap: 10,
  },
  searchBar: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: '600', paddingVertical: 0 },
  clearEmpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearEmpText: { color: '#ef4444', fontSize: 12, fontWeight: '800' },
  empRow: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    gap: 10,
  },
  keyPill: {
    minWidth: 38,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'center',
  },
  keyPillText: { color: '#d97706', fontSize: 12, fontWeight: '900' },
  empName: { fontSize: 13, fontWeight: '800' },
  empMeta: { fontSize: 11, fontWeight: '600', marginTop: 1 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 13, fontWeight: '700' },
});
