import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { DriverPerformance } from '../../types/target';

interface DriverDetailsModalProps {
  visible: boolean;
  driver: DriverPerformance | null;
  month?: string;
  maxElapsedDays?: number;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const DriverDetailsModal: React.FC<DriverDetailsModalProps> = ({
  visible,
  driver,
  month,
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
    // Use maxElapsedDays from summary (which matches latest uploaded orders date)
    // or driver's max recorded day, avoiding counting today's ongoing shift as absence
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
            <View style={[styles.summaryCard, isDarkMode && styles.darkCard, { borderColor: '#f97316', borderWidth: 1.5 }]}>
              <Text style={styles.summaryCardNum}>{totalOrders}</Text>
              <Text style={styles.summaryCardLabel}>إجمالي طلبات الشهر</Text>
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
            <Feather
              name={targetDiff >= 0 ? 'check-circle' : 'alert-circle'}
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
                    ]}
                  >
                    {/* Day Number */}
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
    maxHeight: '85%',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  driverTitleBox: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 10,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  darkText: {
    color: '#f8fafc',
  },
  driverSubText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginTop: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
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
    marginTop: 2,
    fontWeight: '600',
  },
  targetBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
  },
  bannerGreenLight: {
    backgroundColor: '#ecfdf5',
  },
  bannerGreenDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  bannerRedLight: {
    backgroundColor: '#fef2f2',
  },
  bannerRedDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
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
    marginTop: 16,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
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
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  daysGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayCard: {
    width: '31%',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 4,
  },
  dayCardActiveLight: {
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
  },
  dayCardActiveDark: {
    backgroundColor: '#1e293b',
    borderColor: '#475569',
  },
  dayCardAchievedLight: {
    backgroundColor: '#ecfdf5',
    borderColor: '#6ee7b7',
  },
  dayCardAchievedDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#059669',
  },
  dayCardAbsentLight: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  dayCardAbsentDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#dc2626',
  },
  dayCardNum: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  dayCardOrders: {
    fontSize: 13,
    fontWeight: '800',
  },
  dayTargetTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  dayTargetTagText: {
    fontSize: 9,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
});
