import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DriverPerformance } from '../../types/target';
import { DateFilterValue } from './DateFilterModal';

interface DriverDetailsModalProps {
  visible: boolean;
  driver: DriverPerformance | null;
  month?: string;
  dateFilter?: DateFilterValue;
  maxElapsedDays?: number;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const DriverDetailsModal: React.FC<DriverDetailsModalProps> = ({
  visible,
  driver,
  month,
  dateFilter,
  maxElapsedDays,
  onClose,
  isDarkMode = false,
}) => {
  if (!visible || !driver) return null;

  const dailyOrders = driver.daily_orders || {};
  const dailyTarget = (driver.daily_target && driver.daily_target !== 15) ? driver.daily_target : 18;

  // Calculate elapsed days up to max recorded day or closed shift day
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);
  const isCurrentMonth = !month || month === currentMonthPrefix;

  const allRecordedDates = Object.keys(dailyOrders);
  let maxDriverDay = 0;
  if (allRecordedDates.length > 0) {
    maxDriverDay = Math.max(
      ...allRecordedDates.map((d) => parseInt(d.slice(8, 10), 10) || 0)
    );
  }

  let maxDayNumber = 31;
  if (isCurrentMonth) {
    const todayDay = parseInt(todayStr.slice(8, 10), 10);
    if (typeof maxElapsedDays === 'number' && maxElapsedDays > 0) {
      maxDayNumber = Math.max(maxElapsedDays, maxDriverDay);
    } else if (maxDriverDay > 0) {
      maxDayNumber = maxDriverDay;
    } else {
      maxDayNumber = Math.max(1, todayDay - 1);
    }
  }

  const monthPrefix = month || currentMonthPrefix;
  const daysList = Array.from({ length: maxDayNumber }, (_, i) => ({
    day: i + 1,
    date: `${monthPrefix}-${String(i + 1).padStart(2, '0')}`,
  }));

  const activeDaysCount = Object.keys(dailyOrders).filter(
    (d) => (dailyOrders[d] || 0) > 0
  ).length;
  const absentDaysCount = Math.max(0, daysList.length - activeDaysCount);

  // Total orders & Target achievement calculations
  const totalOrders = driver.month_orders || 0;
  const totalRequiredTargetSoFar = daysList.length * dailyTarget;
  const targetDiff = totalOrders - totalRequiredTargetSoFar;

  // Filtered period orders calculation
  let periodOrders: number | null = null;
  let isFilteredPeriod = false;
  if (dateFilter && !dateFilter.isDefault) {
    isFilteredPeriod = true;
    if (dateFilter.type === 'day' && dateFilter.date) {
      periodOrders = Number(dailyOrders[dateFilter.date]) || 0;
    } else if (dateFilter.type === 'range') {
      const s = Math.min(dateFilter.startDay || 1, dateFilter.endDay || 30);
      const e = Math.max(dateFilter.startDay || 1, dateFilter.endDay || 30);
      const startStr = dateFilter.startDate || `${monthPrefix}-${String(s).padStart(2, '0')}`;
      const endStr = dateFilter.endDate || `${monthPrefix}-${String(e).padStart(2, '0')}`;
      let sum = 0;
      Object.entries(dailyOrders).forEach(([dateStr, count]) => {
        if (dateStr >= startStr && dateStr <= endStr) {
          sum += Number(count) || 0;
        }
      });
      periodOrders = sum;
    }
  }

  const isDayInPeriod = (dayNum: number, dateStr: string) => {
    if (!dateFilter || dateFilter.isDefault) return false;
    if (dateFilter.type === 'day') {
      return dateFilter.date === dateStr;
    }
    if (dateFilter.type === 'range') {
      const s = Math.min(dateFilter.startDay || 1, dateFilter.endDay || 30);
      const e = Math.max(dateFilter.startDay || 1, dateFilter.endDay || 30);
      return dayNum >= s && dayNum <= e;
    }
    return false;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.sheetContainer, isDarkMode && styles.darkSheetContainer]}>
          {/* Header Drag Handle */}
          <View style={styles.handleBar} />

          {/* Sheet Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={isDarkMode ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>

            <View style={styles.driverTitleBox}>
              <Text style={[styles.driverName, isDarkMode && styles.darkText]} numberOfLines={1}>
                {driver.name}
              </Text>
              <Text style={styles.driverSubText}>
                {driver.branch ? `فرع ${driver.branch} • ` : ''}تارچت اليوم: {dailyTarget} طلب
              </Text>
            </View>

            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={22} color="#f97316" />
            </View>
          </View>

          {/* Quick Summary Cards */}
          <View style={styles.summaryRow}>
            {isFilteredPeriod && periodOrders !== null ? (
              <View style={[styles.summaryCard, isDarkMode && styles.darkCard, { borderColor: '#f97316', borderWidth: 2, backgroundColor: '#fff7ed' }]}>
                <Text style={[styles.summaryCardNum, { color: '#ea580c', fontSize: 20 }]}>{periodOrders}</Text>
                <Text style={[styles.summaryCardLabel, { color: '#c2410c', fontWeight: '800' }]}>
                  {dateFilter?.type === 'day' ? 'طلبات اليوم المختار' : 'طلبات الفترة المحددة'}
                </Text>
              </View>
            ) : null}

            <View style={[styles.summaryCard, isDarkMode && styles.darkCard, { borderColor: '#f97316', borderWidth: isFilteredPeriod ? 1 : 1.5 }]}>
              <Text style={styles.summaryCardNum}>{totalOrders}</Text>
              <Text style={styles.summaryCardLabel}>إجمالي الشهر</Text>
            </View>

            <View style={[styles.summaryCard, isDarkMode && styles.darkCard]}>
              <Text style={[styles.summaryCardNum, { color: '#10b981' }]}>{activeDaysCount}</Text>
              <Text style={styles.summaryCardLabel}>أيام الحضور</Text>
            </View>

            <View style={[styles.summaryCard, isDarkMode && styles.darkCard]}>
              <Text style={[styles.summaryCardNum, { color: '#ef4444' }]}>{absentDaysCount}</Text>
              <Text style={styles.summaryCardLabel}>أيام الغياب</Text>
            </View>
          </View>

          {/* Target Status Banner */}
          <View
            style={[
              styles.targetBanner,
              targetDiff >= 0
                ? isDarkMode ? styles.bannerGreenDark : styles.bannerGreenLight
                : isDarkMode ? styles.bannerRedDark : styles.bannerRedLight,
            ]}
          >
            <Ionicons
              name={targetDiff >= 0 ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={targetDiff >= 0 ? '#10b981' : '#ef4444'}
            />
            <Text
              style={[
                styles.targetBannerText,
                { color: targetDiff >= 0 ? (isDarkMode ? '#6ee7b7' : '#047857') : (isDarkMode ? '#fca5a5' : '#b91c1c') },
              ]}
            >
              {targetDiff >= 0
                ? `محقق التارچت ومتقدم بـ +${targetDiff} طلب عن المطلوب حتى اليوم`
                : `متأخر عن التارچت التراكمي بعجز ${Math.abs(targetDiff)} طلب`}
            </Text>
          </View>

          {/* Scrollable Days List */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              تفاصيل الأيام والتارچت اليومي (1 إلى {maxDayNumber}):
            </Text>
            <Text style={styles.targetBadge}>التارچت: {dailyTarget}/يوم</Text>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.daysGrid}>
              {daysList.map((dItem) => {
                const dayOrders = dailyOrders[dItem.date] || 0;
                const isAbsent = dayOrders === 0;
                const achieved = dayOrders >= dailyTarget;
                const inPeriod = isDayInPeriod(dItem.day, dItem.date);

                return (
                  <View
                    key={dItem.day}
                    style={[
                      styles.dayCard,
                      isAbsent
                        ? (isDarkMode ? styles.dayCardAbsentDark : styles.dayCardAbsentLight)
                        : achieved
                        ? (isDarkMode ? styles.dayCardAchievedDark : styles.dayCardAchievedLight)
                        : (isDarkMode ? styles.dayCardActiveDark : styles.dayCardActiveLight),
                      inPeriod && styles.dayCardInPeriodHighlight,
                    ]}
                  >
                    {/* Day Number */}
                    <View style={styles.dayHeaderRow}>
                      <Text
                        style={[
                          styles.dayCardNum,
                          {
                            color: isAbsent
                              ? '#ef4444'
                              : achieved
                              ? '#10b981'
                              : '#f59e0b',
                          },
                        ]}
                      >
                        يوم {dItem.day}
                      </Text>
                      {inPeriod && (
                        <View style={styles.periodBadgeDot}>
                          <Text style={styles.periodBadgeDotText}>فترة</Text>
                        </View>
                      )}
                    </View>

                    {/* Actual Orders */}
                    <Text
                      style={[
                        styles.dayCardOrders,
                        {
                          color: isAbsent
                            ? (isDarkMode ? '#fca5a5' : '#dc2626')
                            : isDarkMode
                            ? '#f8fafc'
                            : '#0f172a',
                        },
                      ]}
                    >
                      {isAbsent ? 'غائب' : `${dayOrders} طلب`}
                    </Text>

                    {/* Target Comparison Badge */}
                    {!isAbsent && (
                      <View
                        style={[
                          styles.dayTargetTag,
                          {
                            backgroundColor: achieved
                              ? isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7'
                              : isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayTargetTagText,
                            { color: achieved ? '#15803d' : '#b45309' },
                          ]}
                        >
                          {achieved ? `حقق (+${dayOrders - dailyTarget})` : `عجز (-${dailyTarget - dayOrders})`}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Linked Identifiers if any */}
            {Array.isArray(driver.identifiers) && driver.identifiers.length > 0 && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>المعرفات المرتبطة:</Text>
                <Text style={[styles.metaValue, isDarkMode && styles.darkText]}>
                  {driver.identifiers.join('، ')}
                </Text>
              </View>
            )}

            {/* Linked Apps if any */}
            {Array.isArray(driver.apps) && driver.apps.length > 0 && (
              <View style={[styles.metaRow, { marginBottom: 20 }]}>
                <Text style={styles.metaLabel}>التطبيقات:</Text>
                <Text style={[styles.metaValue, { color: '#f97316' }]}>
                  {driver.apps.join('، ')}
                </Text>
              </View>
            )}
          </ScrollView>
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
  backdropTouch: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    minHeight: '55%',
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  darkSheetContainer: {
    backgroundColor: '#0f172a',
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  driverTitleBox: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 10,
  },
  driverName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  driverSubText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  driverAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#fff7ed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  summaryCardNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#f97316',
  },
  summaryCardLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 3,
    textAlign: 'center',
  },
  targetBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
  },
  bannerGreenLight: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  bannerGreenDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  bannerRedLight: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  bannerRedDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  targetBannerText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  targetBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f97316',
    backgroundColor: '#fff7ed',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scrollArea: {
    maxHeight: 280,
  },
  scrollContent: {
    paddingBottom: 10,
  },
  daysGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
    marginBottom: 14,
  },
  dayCard: {
    width: '31%',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  dayCardInPeriodHighlight: {
    borderColor: '#f97316',
    borderWidth: 2,
    backgroundColor: '#fff7ed',
  },
  dayHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 2,
  },
  periodBadgeDot: {
    backgroundColor: '#f97316',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  periodBadgeDotText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '800',
  },
  dayCardAchievedLight: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  dayCardAchievedDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  dayCardActiveLight: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  dayCardActiveDark: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  dayCardAbsentLight: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  dayCardAbsentDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dayCardNum: {
    fontSize: 12,
    fontWeight: '800',
  },
  dayCardOrders: {
    fontSize: 13,
    fontWeight: '900',
    marginVertical: 2,
  },
  dayTargetTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  dayTargetTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    textAlign: 'right',
  },
  darkText: {
    color: '#ffffff',
  },
});
