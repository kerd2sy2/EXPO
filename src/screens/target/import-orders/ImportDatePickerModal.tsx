import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  ARABIC_MONTHS,
  formatArabicDisplayDate,
  getTodayFormatted,
  getTwoDaysAgoFormatted,
  getYesterdayFormatted,
} from './importOrdersDateHelpers';
import { importOrdersMainStyles as mainStyles } from './importOrdersMainStyles';
import { importOrdersPickerStyles as styles } from './importOrdersPickerStyles';

interface ImportDatePickerModalProps {
  visible: boolean;
  isDarkMode: boolean;
  customDate: string;
  pickerYear: number;
  pickerMonthIdx: number;
  pickerDay: number;
  daysInPickerMonth: number;
  onClose: () => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectDay: (day: number) => void;
  onQuickSelectDate: (dateStr: string) => void;
  onApplyPickedDate: () => void;
}

export const ImportDatePickerModal: React.FC<ImportDatePickerModalProps> = ({
  visible,
  isDarkMode,
  customDate,
  pickerYear,
  pickerMonthIdx,
  pickerDay,
  daysInPickerMonth,
  onClose,
  onPrevMonth,
  onNextMonth,
  onSelectDay,
  onQuickSelectDate,
  onApplyPickedDate,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.pickerModalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.pickerModalCard, isDarkMode && mainStyles.darkCard]}>
          <View style={[styles.pickerDragHandle, isDarkMode && { backgroundColor: '#475569' }]} />
          <View style={styles.pickerModalHeader}>
            <TouchableOpacity onPress={onClose} style={styles.pickerCloseBtn}>
              <Ionicons name="close" size={22} color={isDarkMode ? '#fff' : '#1e293b'} />
            </TouchableOpacity>
            <View style={styles.pickerTitleCol}>
              <Text style={[styles.pickerModalTitle, isDarkMode && mainStyles.darkText]}>
                تحديد تاريخ تقرير الإكسل
              </Text>
              <Text style={styles.pickerModalSub}>
                الافتراضي هو تقرير يوم أمس ({formatArabicDisplayDate(getYesterdayFormatted())})
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pickerModalScroll}>
            <Text style={[styles.pickerSectionLabel, isDarkMode && mainStyles.darkTextSecondary]}>
              اختيارات سريعة:
            </Text>
            <View style={styles.quickDateRow}>
              <TouchableOpacity
                style={[
                  styles.quickDateBtn,
                  customDate === getYesterdayFormatted() && styles.activeQuickDateBtn,
                  isDarkMode && styles.darkQuickDateBtn,
                ]}
                onPress={() => onQuickSelectDate(getYesterdayFormatted())}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.quickDateBtnTitle,
                    customDate === getYesterdayFormatted() && styles.activeQuickDateText,
                    isDarkMode && mainStyles.darkText,
                  ]}
                >
                  ⭐ أمس (الافتراضي)
                </Text>
                <Text style={styles.quickDateBtnSub}>{formatArabicDisplayDate(getYesterdayFormatted())}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickDateBtn,
                  customDate === getTodayFormatted() && styles.activeQuickDateBtn,
                  isDarkMode && styles.darkQuickDateBtn,
                ]}
                onPress={() => onQuickSelectDate(getTodayFormatted())}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.quickDateBtnTitle,
                    customDate === getTodayFormatted() && styles.activeQuickDateText,
                    isDarkMode && mainStyles.darkText,
                  ]}
                >
                  📅 اليوم
                </Text>
                <Text style={styles.quickDateBtnSub}>{formatArabicDisplayDate(getTodayFormatted())}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickDateBtn,
                  customDate === getTwoDaysAgoFormatted() && styles.activeQuickDateBtn,
                  isDarkMode && styles.darkQuickDateBtn,
                ]}
                onPress={() => onQuickSelectDate(getTwoDaysAgoFormatted())}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.quickDateBtnTitle,
                    customDate === getTwoDaysAgoFormatted() && styles.activeQuickDateText,
                    isDarkMode && mainStyles.darkText,
                  ]}
                >
                  أول أمس
                </Text>
                <Text style={styles.quickDateBtnSub}>{formatArabicDisplayDate(getTwoDaysAgoFormatted())}</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.pickerMonthNav, isDarkMode && styles.darkSubCard]}>
              <TouchableOpacity onPress={onPrevMonth} style={styles.pickerNavArrow}>
                <Ionicons name="chevron-back" size={20} color={isDarkMode ? '#e2e8f0' : '#1e293b'} />
              </TouchableOpacity>
              <Text style={[styles.pickerMonthNavText, isDarkMode && mainStyles.darkText]}>
                {ARABIC_MONTHS[pickerMonthIdx]} {pickerYear}
              </Text>
              <TouchableOpacity onPress={onNextMonth} style={styles.pickerNavArrow}>
                <Ionicons name="chevron-forward" size={20} color={isDarkMode ? '#e2e8f0' : '#1e293b'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.pickerSectionLabel, isDarkMode && mainStyles.darkTextSecondary]}>
              اختر يوماً من التقويم:
            </Text>
            <View style={styles.pickerDaysGrid}>
              {Array.from({ length: daysInPickerMonth }, (_, i) => i + 1).map((day) => {
                const isSelected = pickerDay === day;
                const yesterdayObj = new Date();
                yesterdayObj.setDate(yesterdayObj.getDate() - 1);
                const isYesterday =
                  yesterdayObj.getFullYear() === pickerYear &&
                  yesterdayObj.getMonth() === pickerMonthIdx &&
                  yesterdayObj.getDate() === day;

                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.pickerDayBox,
                      isDarkMode && styles.darkDayBox,
                      isSelected && styles.pickerSelectedDayBox,
                      isYesterday && !isSelected && styles.pickerYesterdayDayBox,
                    ]}
                    onPress={() => onSelectDay(day)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pickerDayText,
                        isDarkMode && mainStyles.darkText,
                        isSelected && styles.pickerSelectedDayText,
                        isYesterday && !isSelected && styles.pickerYesterdayDayText,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.pickedPreviewBox, isDarkMode && styles.darkSubCard]}>
              <Ionicons name="checkmark-circle" size={18} color="#0284c7" />
              <Text style={[styles.pickedPreviewText, isDarkMode && mainStyles.darkText]}>
                التاريخ المختار:{' '}
                <Text style={{ fontWeight: '800', color: '#0284c7' }}>
                  {pickerDay} {ARABIC_MONTHS[pickerMonthIdx]} {pickerYear} ({pickerYear}-
                  {String(pickerMonthIdx + 1).padStart(2, '0')}-{String(pickerDay).padStart(2, '0')})
                </Text>
              </Text>
            </View>

            <TouchableOpacity style={styles.pickerApplyBtn} onPress={onApplyPickedDate} activeOpacity={0.8}>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.pickerApplyBtnText}>تأكيد هذا التاريخ وفحص الملف</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
