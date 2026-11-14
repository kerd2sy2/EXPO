import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { identifierDetailsMainStyles as styles } from './identifierDetailsMainStyles';

interface DriverBreakdownItem {
  driver_id: string;
  driver_name: string;
  orders: number;
  percentage: number;
  daily_orders?: Record<string, number>;
}

interface DriverBreakdownCardProps {
  drv: DriverBreakdownItem;
  index: number;
  month?: string;
  dailyTimeline?: { date: string; orders: number }[];
  isExpanded: boolean;
  isDarkMode: boolean;
  onToggle: () => void;
}

export const DriverBreakdownCard: React.FC<DriverBreakdownCardProps> = ({
  drv,
  index,
  month,
  dailyTimeline,
  isExpanded,
  isDarkMode,
  onToggle,
}) => {
  const dailyOrders = drv.daily_orders || {};
  const allRecordedDates = Object.keys(dailyOrders);
  (dailyTimeline || []).forEach((t) => {
    if (t.orders > 0) allRecordedDates.push(t.date);
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);
  const isCurrentMonth = !month || month === currentMonthPrefix;

  let maxDayNumber = 31;
  if (isCurrentMonth) {
    maxDayNumber = parseInt(todayStr.slice(8, 10), 10);
  }
  if (allRecordedDates.length > 0) {
    const maxRecordedDay = Math.max(...allRecordedDates.map((d) => parseInt(d.slice(8, 10), 10) || 0));
    if (maxRecordedDay > maxDayNumber) maxDayNumber = maxRecordedDay;
  }

  const monthPrefix = month || currentMonthPrefix;
  const daysList = Array.from({ length: maxDayNumber }, (_, i) => ({
    day: i + 1,
    date: `${monthPrefix}-${String(i + 1).padStart(2, '0')}`,
  }));

  const activeDaysCount = Object.keys(dailyOrders).filter((d) => (dailyOrders[d] || 0) > 0).length;
  const absentDaysCount = Math.max(0, daysList.length - activeDaysCount);

  return (
    <TouchableOpacity
      style={[
        styles.driverCard,
        isDarkMode && styles.darkCard,
        isExpanded && { borderColor: '#0284c7', borderWidth: 1.5 },
      ]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.driverInfo}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flex: 1 }}>
          <Text style={[styles.driverName, isDarkMode && styles.darkText]}>
            {index + 1}. {drv.driver_name}
          </Text>
          <Ionicons
            name={isExpanded ? 'chevron-up-circle' : 'chevron-down-circle-outline'}
            size={18}
            color={isExpanded ? '#0284c7' : '#94a3b8'}
          />
        </View>
        <View style={{ alignItems: 'flex-start' }}>
          <Text style={styles.driverOrders}>{drv.orders} طلب</Text>
          <Text style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
            {activeDaysCount} يوم عمل • {absentDaysCount} غياب
          </Text>
        </View>
      </View>

      <View style={styles.driverBarWrapper}>
        <View style={styles.driverBarBg}>
          <View style={[styles.driverBarFill, { width: `${Math.min(100, Math.max(0, drv.percentage))}%` }]} />
        </View>
        <Text style={styles.driverPercent}>{drv.percentage}%</Text>
      </View>

      {!isExpanded && (
        <View
          style={{
            flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
            marginTop: 6, paddingTop: 6, borderTopWidth: 1,
            borderTopColor: isDarkMode ? '#334155' : '#f1f5f9',
          }}
        >
          <Text style={{ fontSize: 11, color: '#0284c7', fontWeight: '600' }}>
            اضغط لعرض تفاصيل الأيام المنقضية وحالات الغياب ({daysList.length} يوم) 👈
          </Text>
        </View>
      )}

      {isExpanded && (
        <View style={[styles.dailyBreakdownContainer, isDarkMode && styles.dailyBreakdownDark]}>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
              سجل الأيام حتى تاريخ اليوم (1 إلى {maxDayNumber}):
            </Text>
            <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
                <Text style={{ fontSize: 10, color: '#64748b' }}>حاضر ({activeDaysCount})</Text>
              </View>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
                <Text style={{ fontSize: 10, color: '#64748b' }}>غائب ({absentDaysCount})</Text>
              </View>
            </View>
          </View>

          <View style={styles.dailyGrid}>
            {daysList.map((dItem) => {
              const dayOrders = dailyOrders[dItem.date] || 0;
              const isAbsent = dayOrders === 0;
              return (
                <View
                  key={dItem.day}
                  style={[
                    styles.dayBox,
                    isAbsent
                      ? isDarkMode ? styles.dayBoxAbsentDark : styles.dayBoxAbsentLight
                      : isDarkMode ? styles.dayBoxActiveDark : styles.dayBoxActiveLight,
                  ]}
                >
                  <Text style={[styles.dayBoxDayNum, { color: isAbsent ? '#ef4444' : '#10b981' }]}>يوم {dItem.day}</Text>
                  <Text
                    style={[
                      styles.dayBoxOrders,
                      { color: isAbsent ? (isDarkMode ? '#fca5a5' : '#dc2626') : (isDarkMode ? '#6ee7b7' : '#059669') },
                    ]}
                  >
                    {isAbsent ? 'غائب' : `${dayOrders} طلب`}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};
