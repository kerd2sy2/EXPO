import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ARABIC_MONTHS, ARABIC_WEEKDAYS_FULL, ARABIC_WEEKDAYS_SHORT } from './dateFilterHelpers';
import { dateFilterStyles as styles } from './dateFilterStyles';

interface DateRangeCalendarSectionProps {
  isDarkMode: boolean;
  mode: 'month' | 'range' | 'day';
  selectedYear: number;
  selectedMonthIdx: number;
  daysInSelectedMonth: number;
  isCurrentMonth: boolean;
  effectiveStart: number;
  effectiveEnd: number;
  singleDay: number;
  activeRangeField: 'start' | 'end';
  mondayWeeks: { start: number; end: number; label: string; isMonToMon: boolean }[];
  onSelectPresetRange: (s: number, e: number) => void;
  onSelectCurrentMonth: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSetActiveRangeField: (field: 'start' | 'end') => void;
  onDayPress: (day: number) => void;
}

export const DateRangeCalendarSection: React.FC<DateRangeCalendarSectionProps> = ({
  isDarkMode, mode, selectedYear, selectedMonthIdx, daysInSelectedMonth, isCurrentMonth,
  effectiveStart, effectiveEnd, singleDay, activeRangeField, mondayWeeks,
  onSelectPresetRange, onSelectCurrentMonth, onPrevMonth, onNextMonth,
  onSetActiveRangeField, onDayPress,
}) => {
  return (
    <>
      <View style={[styles.presetsBlock, isDarkMode && styles.darkSubCard]}>
        <View style={styles.presetsBlockHeader}>
          <Ionicons name="repeat" size={14} color="#0284c7" />
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
                style={[styles.monWeekChip, isActive && styles.activeMonWeekChip, isDarkMode && styles.darkMonWeekChip]}
                onPress={() => onSelectPresetRange(wk.start, wk.end)}
                activeOpacity={0.75}
              >
                <Ionicons name="flash-outline" size={12} color={isActive ? '#ffffff' : '#0284c7'} />
                <Text style={[styles.monWeekChipText, isActive && styles.activeMonWeekChipText, isDarkMode && !isActive && styles.darkText]}>
                  {wk.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.quickChipsRow}>
        <TouchableOpacity
          style={[styles.quickChip, mode === 'range' && effectiveStart === 1 && effectiveEnd === 9 && styles.activeQuickChip, isDarkMode && styles.darkQuickChip]}
          onPress={() => onSelectPresetRange(1, 9)}
        >
          <Text style={[styles.quickChipText, mode === 'range' && effectiveStart === 1 && effectiveEnd === 9 && styles.activeQuickChipText, isDarkMode && styles.darkText]}>
            من 1 إلى 9
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickChip, mode === 'range' && effectiveStart === 1 && effectiveEnd === 15 && styles.activeQuickChip, isDarkMode && styles.darkQuickChip]}
          onPress={() => onSelectPresetRange(1, 15)}
        >
          <Text style={[styles.quickChipText, mode === 'range' && effectiveStart === 1 && effectiveEnd === 15 && styles.activeQuickChipText, isDarkMode && styles.darkText]}>
            النصف 1 (1-15)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickChip, mode === 'range' && effectiveStart === 16 && effectiveEnd === daysInSelectedMonth && styles.activeQuickChip, isDarkMode && styles.darkQuickChip]}
          onPress={() => onSelectPresetRange(16, daysInSelectedMonth)}
        >
          <Text style={[styles.quickChipText, mode === 'range' && effectiveStart === 16 && effectiveEnd === daysInSelectedMonth && styles.activeQuickChipText, isDarkMode && styles.darkText]}>
            النصف 2 (16-{daysInSelectedMonth})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickChip, mode === 'month' && isCurrentMonth && styles.activeQuickChip, isDarkMode && styles.darkQuickChip]}
          onPress={onSelectCurrentMonth}
        >
          <Text style={[styles.quickChipText, mode === 'month' && isCurrentMonth && styles.activeQuickChipText, isDarkMode && styles.darkText]}>
            الشهر الحالي
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.monthNavigatorCard, isDarkMode && styles.darkSubCard]}>
        <TouchableOpacity onPress={onPrevMonth} style={styles.navArrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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

        <TouchableOpacity onPress={onNextMonth} style={styles.navArrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#e2e8f0' : '#1e293b'} />
        </TouchableOpacity>
      </View>

      {mode === 'range' && (
        <View style={styles.rangeSelectCardsRow}>
          <TouchableOpacity
            style={[styles.rangeFieldBox, activeRangeField === 'start' && styles.activeRangeFieldBox, isDarkMode && styles.darkSubCard]}
            onPress={() => onSetActiveRangeField('start')}
            activeOpacity={0.8}
          >
            <Text style={[styles.rangeFieldLabel, { color: activeRangeField === 'start' ? '#0284c7' : '#64748b' }]}>
              من يوم ({ARABIC_WEEKDAYS_SHORT[new Date(selectedYear, selectedMonthIdx, effectiveStart).getDay()]})
            </Text>
            <Text style={[styles.rangeFieldNum, isDarkMode && styles.darkText, activeRangeField === 'start' && { color: '#0284c7' }]}>
              {effectiveStart}
            </Text>
          </TouchableOpacity>

          <View style={styles.rangeArrowIconWrap}>
            <Ionicons name="arrow-back" size={18} color="#0284c7" />
          </View>

          <TouchableOpacity
            style={[styles.rangeFieldBox, activeRangeField === 'end' && styles.activeRangeFieldBox, isDarkMode && styles.darkSubCard]}
            onPress={() => onSetActiveRangeField('end')}
            activeOpacity={0.8}
          >
            <Text style={[styles.rangeFieldLabel, { color: activeRangeField === 'end' ? '#0284c7' : '#64748b' }]}>
              إلى يوم ({ARABIC_WEEKDAYS_SHORT[new Date(selectedYear, selectedMonthIdx, effectiveEnd).getDay()]})
            </Text>
            <Text style={[styles.rangeFieldNum, isDarkMode && styles.darkText, activeRangeField === 'end' && { color: '#0284c7' }]}>
              {effectiveEnd}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {mode === 'day' && (
        <View style={[styles.singleDayBanner, isDarkMode && styles.darkSubCard]}>
          <Ionicons name="today" size={20} color="#0284c7" />
          <View style={{ alignItems: 'flex-end', flex: 1 }}>
            <Text style={[styles.singleDayBannerTitle, isDarkMode && styles.darkText]}>
              اليوم المحدد: {ARABIC_WEEKDAYS_FULL[new Date(selectedYear, selectedMonthIdx, singleDay).getDay()]} {singleDay}{' '}
              {ARABIC_MONTHS[selectedMonthIdx]}
            </Text>
            <Text style={styles.singleDayBannerSub}>اضغط على أي رقم يوم في الأسفل لتغييره</Text>
          </View>
        </View>
      )}

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
            const isMonday = dt.getDay() === 1;
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
                onPress={() => onDayPress(day)}
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
    </>
  );
};
