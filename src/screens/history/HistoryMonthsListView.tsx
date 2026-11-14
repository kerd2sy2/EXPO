import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors, Language } from '../../types/delegate';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { MonthGroup } from './historyHelpers';
import { historyStyles as styles } from './historyStyles';

interface HistoryMonthsListViewProps {
  monthGroups: MonthGroup[];
  colors: ThemeColors;
  isRTL: boolean;
  t: any;
  lang: Language;
  onSelectMonth: (key: string, label: string) => void;
}

export const HistoryMonthsListView: React.FC<HistoryMonthsListViewProps> = ({
  monthGroups,
  colors,
  isRTL,
  t,
  lang,
  onSelectMonth,
}) => {
  return (
    <View style={styles.monthsList}>
      {monthGroups.map((group) => (
        <ModuleErrorBoundary key={group.key} moduleName={`ملخص شهر ${group.label}`} colors={colors}>
          <TouchableOpacity
            style={[
              styles.monthCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            activeOpacity={0.8}
            onPress={() => onSelectMonth(group.key, group.label)}
          >
            {/* Card Top */}
            <View
              style={[
                styles.monthCardTopRow,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View
                style={[
                  styles.monthCardHeaderLeft,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View
                  style={[
                    styles.monthIconCircle,
                    { backgroundColor: group.isCurrent ? colors.primaryLight : colors.inputBg },
                  ]}
                >
                  <Ionicons
                    name="calendar"
                    size={20}
                    color={group.isCurrent ? colors.primary : colors.textSecondary}
                  />
                </View>

                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <View
                    style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  >
                    <Text style={[styles.monthCardTitle, { color: colors.textPrimary }]}>
                      {group.label}
                    </Text>
                    {group.isCurrent && (
                      <View
                        style={[
                          styles.currentMonthBadge,
                          { backgroundColor: colors.primaryLight, borderColor: colors.border },
                        ]}
                      >
                        <Text style={[styles.currentMonthBadgeText, { color: colors.primary }]}>
                          {t.currentMonth || (lang === 'ar' ? 'الحالي' : 'Current')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.monthCardShiftsCount, { color: colors.textSecondary }]}>
                    {(t.shiftsCountLabel || '{n} shifts').replace('{n}', String(group.shiftsCount))}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.navCircle,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={18}
                  color={colors.primary}
                />
              </View>
            </View>

            {/* 3 Overview Stat Chips */}
            <View
              style={[styles.monthStatsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <View
                style={[
                  styles.monthStatChip,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.monthStatChipVal, { color: colors.primary }]}>
                  {group.totalOrders}
                </Text>
                <Text style={[styles.monthStatChipLabel, { color: colors.textSecondary }]}>
                  {t.ordersUnit || 'طلب'}
                </Text>
              </View>

              <View
                style={[
                  styles.monthStatChip,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
              >
                <Ionicons name="navigate" size={16} color="#16a34a" />
                <Text style={[styles.monthStatChipVal, { color: colors.textPrimary }]}>
                  {group.totalDistance.toFixed(0)}
                </Text>
                <Text style={[styles.monthStatChipLabel, { color: colors.textSecondary }]}>
                  {t.km || 'كم'}
                </Text>
              </View>

              <View
                style={[
                  styles.monthStatChip,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
              >
                <MaterialCommunityIcons name="gas-station" size={16} color="#d97706" />
                <Text style={[styles.monthStatChipVal, { color: colors.textPrimary }]}>
                  {group.totalFuel.toFixed(0)}
                </Text>
                <Text style={[styles.monthStatChipLabel, { color: colors.textSecondary }]}>
                  {t.sar || 'ر.س'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </ModuleErrorBoundary>
      ))}
    </View>
  );
};
