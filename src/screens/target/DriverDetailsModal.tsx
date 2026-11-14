import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DriverPerformance } from '../../types/target';
import { DateFilterValue } from './DateFilterModal';
import { calculateDriverMetrics } from './driver-details/driverDetailsHelpers';
import { driverDetailsModalStyles as styles } from './driver-details/driverDetailsModalStyles';

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

  const m = calculateDriverMetrics(driver, month, dateFilter, maxElapsedDays);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheetContainer, isDarkMode && styles.darkSheetContainer]}>
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={isDarkMode ? '#cbd5e1' : '#475569'} />
            </TouchableOpacity>

            <View style={styles.driverTitleBox}>
              <Text style={[styles.driverName, isDarkMode && styles.darkText]} numberOfLines={1}>
                {driver.name}
              </Text>
              <Text style={styles.driverSubText}>
                {driver.branch ? `فرع ${driver.branch} • ` : ''}تارچت اليوم: {m.dailyTarget} طلب
              </Text>
            </View>

            <View style={styles.driverAvatar}>
              <Ionicons name="person" size={22} color="#0284c7" />
            </View>
          </View>

          <View style={styles.summaryRow}>
            {m.isFilteredPeriod && m.periodOrders !== null ? (
              <View style={[styles.summaryCard, isDarkMode && styles.darkCard, { borderColor: '#0284c7', borderWidth: 2, backgroundColor: '#f0f9ff' }]}>
                <Text style={[styles.summaryCardNum, { color: '#0369a1', fontSize: 20 }]}>{m.periodOrders}</Text>
                <Text style={[styles.summaryCardLabel, { color: '#c2410c', fontWeight: '800' }]}>
                  {dateFilter?.type === 'day' ? 'طلبات اليوم المختار' : 'طلبات الفترة المحددة'}
                </Text>
              </View>
            ) : null}

            <View style={[styles.summaryCard, isDarkMode && styles.darkCard, { borderColor: '#0284c7', borderWidth: m.isFilteredPeriod ? 1 : 1.5 }]}>
              <Text style={styles.summaryCardNum}>{m.totalOrders}</Text>
              <Text style={styles.summaryCardLabel}>إجمالي الشهر</Text>
            </View>

            <View style={[styles.summaryCard, isDarkMode && styles.darkCard]}>
              <Text style={[styles.summaryCardNum, { color: '#10b981' }]}>{m.activeDaysCount}</Text>
              <Text style={styles.summaryCardLabel}>أيام الحضور</Text>
            </View>

            <View style={[styles.summaryCard, isDarkMode && styles.darkCard]}>
              <Text style={[styles.summaryCardNum, { color: '#ef4444' }]}>{m.absentDaysCount}</Text>
              <Text style={styles.summaryCardLabel}>أيام الغياب</Text>
            </View>
          </View>

          <View
            style={[
              styles.targetBanner,
              m.targetDiff >= 0
                ? isDarkMode ? styles.bannerGreenDark : styles.bannerGreenLight
                : isDarkMode ? styles.bannerRedDark : styles.bannerRedLight,
            ]}
          >
            <Ionicons name={m.targetDiff >= 0 ? 'checkmark-circle' : 'alert-circle'} size={18} color={m.targetDiff >= 0 ? '#10b981' : '#ef4444'} />
            <Text style={[styles.targetBannerText, { color: m.targetDiff >= 0 ? (isDarkMode ? '#6ee7b7' : '#047857') : (isDarkMode ? '#fca5a5' : '#b91c1c') }]}>
              {m.targetDiff >= 0
                ? `محقق التارچت ومتقدم بـ +${m.targetDiff} طلب عن المطلوب حتى اليوم`
                : `متأخر عن التارچت التراكمي بعجز ${Math.abs(m.targetDiff)} طلب`}
            </Text>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
              تفاصيل الأيام والتارچت اليومي (1 إلى {m.maxDayNumber}):
            </Text>
            <Text style={styles.targetBadge}>التارچت: {m.dailyTarget}/يوم</Text>
          </View>

          <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.daysGrid}>
              {m.daysList.map((dItem) => {
                const dayOrders = m.dailyOrders[dItem.date] || 0;
                const isAbsent = dayOrders === 0;
                const achieved = dayOrders >= m.dailyTarget;
                const inPeriod = m.isDayInPeriod(dItem.day, dItem.date);

                return (
                  <View
                    key={dItem.day}
                    style={[
                      styles.dayCard,
                      isAbsent
                        ? isDarkMode ? styles.dayCardAbsentDark : styles.dayCardAbsentLight
                        : achieved
                        ? isDarkMode ? styles.dayCardAchievedDark : styles.dayCardAchievedLight
                        : isDarkMode ? styles.dayCardActiveDark : styles.dayCardActiveLight,
                      inPeriod && styles.dayCardInPeriodHighlight,
                    ]}
                  >
                    <View style={styles.dayHeaderRow}>
                      <Text style={[styles.dayCardNum, { color: isAbsent ? '#ef4444' : achieved ? '#10b981' : '#f59e0b' }]}>
                        يوم {dItem.day}
                      </Text>
                      {inPeriod && (
                        <View style={styles.periodBadgeDot}>
                          <Text style={styles.periodBadgeDotText}>فترة</Text>
                        </View>
                      )}
                    </View>

                    <Text style={[styles.dayCardOrders, { color: isAbsent ? (isDarkMode ? '#fca5a5' : '#dc2626') : isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                      {isAbsent ? 'غائب' : `${dayOrders} طلب`}
                    </Text>

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
                        <Text style={[styles.dayTargetTagText, { color: achieved ? '#15803d' : '#b45309' }]}>
                          {achieved ? `حقق (+${dayOrders - m.dailyTarget})` : `عجز (-${m.dailyTarget - dayOrders})`}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {Array.isArray(driver.identifiers) && driver.identifiers.length > 0 && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>المعرفات المرتبطة:</Text>
                <Text style={[styles.metaValue, isDarkMode && styles.darkText]}>{driver.identifiers.join('، ')}</Text>
              </View>
            )}

            {Array.isArray(driver.apps) && driver.apps.length > 0 && (
              <View style={[styles.metaRow, { marginBottom: 20 }]}>
                <Text style={styles.metaLabel}>التطبيقات:</Text>
                <Text style={[styles.metaValue, { color: '#0284c7' }]}>{driver.apps.join('، ')}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
