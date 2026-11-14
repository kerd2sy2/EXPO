import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WorkSession, ThemeColors, Language } from '../../types/delegate';
import { formatBikePlateForDisplay } from '../../utils/plateUtils';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { MonthGroup } from './historyHelpers';
import { historyStyles as styles } from './historyStyles';

interface HistoryMonthShiftsViewProps {
  monthGroup: MonthGroup;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  lang: Language;
  formatDateStr: (iso?: string) => string;
  formatTimeStr: (iso?: string) => string;
  onSelectSession: (session: WorkSession) => void;
}

export const HistoryMonthShiftsView: React.FC<HistoryMonthShiftsViewProps> = ({
  monthGroup,
  colors,
  isDarkMode,
  isRTL,
  t,
  lang,
  formatDateStr,
  formatTimeStr,
  onSelectSession,
}) => {
  return (
    <View style={styles.monthPageContainer}>
      {monthGroup.sessions.length === 0 ? (
        <View
          style={[
            styles.emptyStateCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.inputBg }]}>
            <Ionicons name="calendar-clear-outline" size={32} color={colors.textSecondary} />
          </View>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
            {t.noHistoryInMonth ||
              (isRTL ? 'لا توجد شفتات مسجلة في هذا الشهر' : 'No shifts recorded in this month')}
          </Text>
        </View>
      ) : (
        <View style={styles.shiftsList}>
          {monthGroup.sessions.map((session) => {
            const isApproved = Boolean(session.is_reviewed);
            const distance =
              session.distance ||
              (session.end_km && session.start_km ? session.end_km - session.start_km : 0);

            return (
              <ModuleErrorBoundary
                key={session.id}
                moduleName="بطاقة شفت"
                colors={colors}
              >
                <TouchableOpacity
                  style={[
                    styles.shiftItemCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => onSelectSession(session)}
                >
                  {/* Shift Header Row: Date & Status Badge */}
                  <View
                    style={[
                      styles.shiftItemTopRow,
                      { flexDirection: isRTL ? 'row-reverse' : 'row' },
                    ]}
                  >
                    <View
                      style={[
                        styles.shiftItemDateLeft,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                    >
                      <View
                        style={[
                          styles.shiftItemIconCircle,
                          { backgroundColor: colors.primaryLight },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="calendar-clock"
                          size={18}
                          color={colors.primary}
                        />
                      </View>
                      <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text style={[styles.shiftItemDateTitle, { color: colors.textPrimary }]}>
                          {formatDateStr(session.start_time)}
                        </Text>
                        <Text
                          style={[styles.shiftItemTimeSubtitle, { color: colors.textSecondary }]}
                        >
                          {formatTimeStr(session.start_time)}
                          {session.end_time ? `  ←  ${formatTimeStr(session.end_time)}` : ''}
                          {session.motorcycle_number
                            ? ` • ${t.plateLabel || (isRTL ? 'لوحة' : 'Plate')}: ${formatBikePlateForDisplay(session.motorcycle_number, lang)}`
                            : ''}
                        </Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View
                      style={[
                        styles.statusPillBadge,
                        {
                          backgroundColor: isApproved
                            ? isDarkMode
                              ? 'rgba(34, 197, 94, 0.16)'
                              : '#dcfce7'
                            : isDarkMode
                            ? 'rgba(245, 158, 11, 0.16)'
                            : '#fef3c7',
                          borderColor: isApproved
                            ? isDarkMode
                              ? 'rgba(34, 197, 94, 0.3)'
                              : '#bbf7d0'
                            : isDarkMode
                            ? 'rgba(245, 158, 11, 0.3)'
                            : '#fde68a',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <Ionicons
                        name={isApproved ? 'checkmark-circle' : 'time-outline'}
                        size={12}
                        color={isApproved ? '#16a34a' : '#d97706'}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          { color: isApproved ? '#15803d' : '#b45309' },
                        ]}
                      >
                        {isApproved
                          ? t.reviewedBadge || 'مصادق عليه'
                          : t.pendingBadge || 'بانتظار المشرف'}
                      </Text>
                    </View>
                  </View>

                  {/* Shift Metrics Bar */}
                  <View
                    style={[
                      styles.shiftMetricsBar,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={styles.metricColumn}>
                      <View
                        style={[
                          styles.metricLabelRow,
                          { flexDirection: isRTL ? 'row-reverse' : 'row' },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="package-variant-closed"
                          size={14}
                          color={colors.primary}
                        />
                        <Text style={[styles.metricColumnLabel, { color: colors.textSecondary }]}>
                          {isApproved
                            ? t.approvedOrders || 'المعتمدة'
                            : t.ordersUnit || 'الطلبات'}
                        </Text>
                      </View>
                      <Text style={[styles.metricColumnValue, { color: colors.primary }]}>
                        {session.orders_count || 0}
                      </Text>
                    </View>

                    <View style={[styles.metricColDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.metricColumn}>
                      <View
                        style={[
                          styles.metricLabelRow,
                          { flexDirection: isRTL ? 'row-reverse' : 'row' },
                        ]}
                      >
                        <Ionicons name="navigate-outline" size={14} color="#16a34a" />
                        <Text style={[styles.metricColumnLabel, { color: colors.textSecondary }]}>
                          {t.km || 'المسافة'}
                        </Text>
                      </View>
                      <Text style={[styles.metricColumnValue, { color: colors.textPrimary }]}>
                        {distance} {t.km || 'كم'}
                      </Text>
                    </View>

                    <View style={[styles.metricColDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.metricColumn}>
                      <View
                        style={[
                          styles.metricLabelRow,
                          { flexDirection: isRTL ? 'row-reverse' : 'row' },
                        ]}
                      >
                        <MaterialCommunityIcons name="gas-station" size={14} color="#d97706" />
                        <Text style={[styles.metricColumnLabel, { color: colors.textSecondary }]}>
                          {t.sar || 'البنزين'}
                        </Text>
                      </View>
                      <Text style={[styles.metricColumnValue, { color: colors.textPrimary }]}>
                        {session.fuel_cost || 0} {t.sar || 'ر.س'}
                      </Text>
                    </View>
                  </View>

                  {/* Supervisor Edit Notice Badge */}
                  {session.is_edited_by_supervisor && (
                    <View
                      style={[
                        styles.supervisorEditBadge,
                        {
                          backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : '#fef3c7',
                          borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.25)' : '#fde68a',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <MaterialCommunityIcons name="shield-check" size={14} color="#d97706" />
                      <Text
                        style={[
                          styles.supervisorEditText,
                          { color: isDarkMode ? '#fbbf24' : '#92400e' },
                        ]}
                      >
                        {(
                          t.supervisorModifiedNotice ||
                          'قام المشرف ({name}) بتعديل واعتماد البيانات'
                        ).replace(
                          '{name}',
                          session.edited_by_name ||
                            (lang === 'ar'
                              ? 'المشرف'
                              : lang === 'bn'
                              ? 'সুপারভাইজার'
                              : lang === 'ur'
                              ? 'نگران'
                              : 'Supervisor')
                        )}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </ModuleErrorBoundary>
            );
          })}
        </View>
      )}
    </View>
  );
};
