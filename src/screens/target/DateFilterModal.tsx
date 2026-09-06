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
  const m = now.getMonth(); // 0-indexed
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
  };

  const handleSelectQuickDay = (dayOffset: number) => {
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOffset);
    setSelectedYear(target.getFullYear());
    setSelectedMonthIdx(target.getMonth());
    setSelectedDayNum(target.getDate());
    setMode('day');
  };

  const handleResetToDefault = () => {
    const def = getDefaultMonthFilter();
    onApply(def);
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
        <View style={[styles.card, isDarkMode && styles.darkCard]}>
          {/* Drag Handle */}
          <View style={[styles.dragHandle, isDarkMode && { backgroundColor: '#475569' }]} />

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={isDarkMode ? '#fff' : '#1e293b'} />
            </TouchableOpacity>
            <View style={styles.titleCol}>
              <Text style={[styles.title, isDarkMode && styles.darkText]}>تحديد فترة العرض والتاريخ</Text>
              <Text style={styles.subtitle}>
                الافتراضي: الشهر الحالي كاملاً (1 إلى {daysInSelectedMonth}) ويتجدد تلقائياً
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Mode Switcher Tabs */}
            <View style={[styles.tabsContainer, isDarkMode && styles.darkTabsContainer]}>
              <TouchableOpacity
                style={[styles.tabBtn, mode === 'month' && styles.activeTabBtn]}
                onPress={() => setMode('month')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={mode === 'month' ? '#fff' : isDarkMode ? '#94a3b8' : '#64748b'}
                />
                <Text style={[styles.tabBtnText, mode === 'month' && styles.activeTabBtnText]}>
                  الشهر كاملاً (1 إلى {daysInSelectedMonth})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, mode === 'day' && styles.activeTabBtn]}
                onPress={() => setMode('day')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="today-outline"
                  size={16}
                  color={mode === 'day' ? '#fff' : isDarkMode ? '#94a3b8' : '#64748b'}
                />
                <Text style={[styles.tabBtnText, mode === 'day' && styles.activeTabBtnText]}>
                  يوم محدد (تاريخ معين)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Month & Year Navigator */}
            <View style={[styles.monthNavigatorCard, isDarkMode && styles.darkSubCard]}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.navArrowBtn}>
                <Ionicons name="chevron-back" size={20} color={isDarkMode ? '#e2e8f0' : '#1e293b'} />
              </TouchableOpacity>

              <View style={styles.monthDisplayCol}>
                <View style={styles.monthNameRow}>
                  <Text style={[styles.monthNameText, isDarkMode && styles.darkText]}>
                    {ARABIC_MONTHS[selectedMonthIdx]} {selectedYear}
                  </Text>
                  {isCurrentMonth ? (
                    <View style={styles.currentMonthBadge}>
                      <Text style={styles.currentMonthBadgeText}>الشهر الحالي (افتراضي)</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.monthRangeHint}>
                  {mode === 'month' ? `من 1 إلى ${daysInSelectedMonth} ${ARABIC_MONTHS[selectedMonthIdx]}` : 'اختر اليوم بالأسفل'}
                </Text>
              </View>

              <TouchableOpacity onPress={handleNextMonth} style={styles.navArrowBtn}>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#e2e8f0' : '#1e293b'} />
              </TouchableOpacity>
            </View>

            {/* Quick Month Chips */}
            <View style={styles.quickChipsSection}>
              <Text style={[styles.sectionLabel, isDarkMode && styles.darkTextSecondary]}>اختيارات سريعة للأشهر:</Text>
              <View style={styles.quickChipsRow}>
                <TouchableOpacity
                  style={[
                    styles.quickChip,
                    isCurrentMonth && mode === 'month' && styles.activeQuickChip,
                    isDarkMode && styles.darkQuickChip,
                  ]}
                  onPress={() => {
                    handleSelectQuickMonth(0);
                    setMode('month');
                  }}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      isCurrentMonth && mode === 'month' && styles.activeQuickChipText,
                      isDarkMode && styles.darkText,
                    ]}
                  >
                    ⭐ الشهر الحالي ({ARABIC_MONTHS[currentMonthIdx]})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickChip, isDarkMode && styles.darkQuickChip]}
                  onPress={() => {
                    handleSelectQuickMonth(1);
                    setMode('month');
                  }}
                >
                  <Text style={[styles.quickChipText, isDarkMode && styles.darkText]}>
                    الشهر السابق
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickChip, isDarkMode && styles.darkQuickChip]}
                  onPress={() => {
                    handleSelectQuickMonth(2);
                    setMode('month');
                  }}
                >
                  <Text style={[styles.quickChipText, isDarkMode && styles.darkText]}>
                    الشهر الأسبق
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* If in Day Mode: Day Selector Grid & Quick Day Chips */}
            {mode === 'day' ? (
              <View style={styles.daySelectorSection}>
                <View style={styles.quickChipsRow}>
                  <TouchableOpacity
                    style={[styles.quickChip, isDarkMode && styles.darkQuickChip]}
                    onPress={() => handleSelectQuickDay(0)}
                  >
                    <Text style={[styles.quickChipText, isDarkMode && styles.darkText]}>📅 اليوم</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickChip, isDarkMode && styles.darkQuickChip]}
                    onPress={() => handleSelectQuickDay(1)}
                  >
                    <Text style={[styles.quickChipText, isDarkMode && styles.darkText]}>أمس</Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.sectionLabel, { marginTop: 12 }, isDarkMode && styles.darkTextSecondary]}>
                  اختر يوماً من شهر {ARABIC_MONTHS[selectedMonthIdx]}:
                </Text>

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

                <View style={[styles.selectedDayPreview, isDarkMode && styles.darkSubCard]}>
                  <Ionicons name="checkmark-circle" size={18} color="#f97316" />
                  <Text style={[styles.selectedDayPreviewText, isDarkMode && styles.darkText]}>
                    التاريخ المختار:{' '}
                    <Text style={{ fontWeight: '800', color: '#f97316' }}>
                      {selectedDayNum} {ARABIC_MONTHS[selectedMonthIdx]} {selectedYear} ({monthString}-{String(selectedDayNum).padStart(2, '0')})
                    </Text>
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Note about auto rollover */}
            <View style={[styles.infoCallout, isDarkMode && styles.darkInfoCallout]}>
              <Ionicons name="information-circle-outline" size={18} color="#0284c7" />
              <Text style={[styles.infoCalloutText, isDarkMode && { color: '#7dd3fc' }]}>
                عند اختيار "الشهر كاملاً"، سيتم تلقائياً تصفية جميع الطلبات والتارجت من اليوم الأول (1) إلى نهاية الشهر ({daysInSelectedMonth}). ومع بداية أي شهر جديد ينتقل التطبيق إليه تلقائياً دون الحاجة لتغييره يدوياً.
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Actions */}
          <View style={[styles.actionsRow, isDarkMode && styles.darkActionsRow]}>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.applyBtnText}>تطبيق التصفية</Text>
            </TouchableOpacity>

            {!currentFilter.isDefault ? (
              <TouchableOpacity
                style={[styles.resetBtn, isDarkMode && styles.darkResetBtn]}
                onPress={handleResetToDefault}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={16} color="#f97316" />
                <Text style={styles.resetBtnText}>الافتراضي (الشهر الحالي)</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: '88%',
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
    borderBottomColor: '#f1f5f9',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  titleCol: {
    alignItems: 'flex-end',
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  darkText: {
    color: '#f8fafc',
  },
  darkTextSecondary: {
    color: '#94a3b8',
  },
  scrollBody: {
    paddingTop: 14,
    paddingBottom: 16,
    gap: 14,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  activeTabBtn: {
    backgroundColor: '#f97316',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  activeTabBtnText: {
    color: '#ffffff',
  },
  monthNavigatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkSubCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  navArrowBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  monthDisplayCol: {
    alignItems: 'center',
    gap: 3,
  },
  monthNameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  monthNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  currentMonthBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentMonthBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  monthRangeHint: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  quickChipsSection: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
  },
  quickChipsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  activeQuickChipText: {
    color: '#ea580c',
    fontWeight: '800',
  },
  daySelectorSection: {
    gap: 8,
  },
  daysGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
  },
  dayBox: {
    width: '12.5%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkDayBox: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  selectedDayBox: {
    backgroundColor: '#f97316',
    borderColor: '#ea580c',
  },
  todayDayBox: {
    borderColor: '#3b82f6',
    borderWidth: 1.5,
  },
  dayNumText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  selectedDayNumText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  todayDayNumText: {
    color: '#2563eb',
    fontWeight: '800',
  },
  selectedDayPreview: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff7ed',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fed7aa',
    marginTop: 6,
  },
  selectedDayPreviewText: {
    fontSize: 12,
    color: '#9a3412',
    fontWeight: '600',
  },
  infoCallout: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  darkInfoCallout: {
    backgroundColor: '#0c4a6e22',
    borderColor: '#0284c7',
  },
  infoCalloutText: {
    fontSize: 11,
    color: '#0369a1',
    lineHeight: 16,
    flex: 1,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  darkActionsRow: {
    borderTopColor: '#1e293b',
  },
  applyBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f97316',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  resetBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fed7aa',
    gap: 6,
  },
  darkResetBtn: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
  },
  resetBtnText: {
    color: '#ea580c',
    fontSize: 12,
    fontWeight: '700',
  },
});
