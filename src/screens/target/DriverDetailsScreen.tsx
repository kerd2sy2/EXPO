import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DriverPerformance } from '../../types/target';
import { DateFilterValue } from './DateFilterModal';

interface DriverDetailsScreenProps {
  driver: DriverPerformance | null;
  month?: string;
  dateFilter?: DateFilterValue;
  maxElapsedDays?: number;
  onBack: () => void;
  isDarkMode?: boolean;
  colors?: any;
  isRTL?: boolean;
}

const ARABIC_WEEKDAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// Real brand logos
const NINJA_LOGO = require('../../../assets/images/ninja.png');
const KEETA_LOGO = require('../../../assets/images/keeta.png');
const TOYOU_LOGO = require('../../../assets/images/toyou.png');

export const DriverDetailsScreen: React.FC<DriverDetailsScreenProps> = ({
  driver,
  month,
  dateFilter,
  maxElapsedDays,
  onBack,
  isDarkMode = false,
  colors: propColors,
  isRTL = true,
}) => {
  const defaultColors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    card: isDarkMode ? '#1e293b' : '#ffffff',
    cardAlt: isDarkMode ? '#161f30' : '#f1f5f9',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    borderLight: isDarkMode ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.8)',
    textPrimary: isDarkMode ? '#f8fafc' : '#0f172a',
    textSecondary: isDarkMode ? '#94a3b8' : '#64748b',
    primary: '#f97316',
    primaryLight: isDarkMode ? 'rgba(249, 115, 22, 0.16)' : '#fff7ed',
    success: '#10b981',
    successLight: isDarkMode ? 'rgba(16, 185, 129, 0.16)' : '#dcfce7',
    danger: '#ef4444',
    dangerLight: isDarkMode ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2',
    warning: '#f59e0b',
    warningLight: isDarkMode ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7',
    accent: '#3b82f6',
    accentLight: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#eff6ff',
  };

  const colors = propColors || defaultColors;

  if (!driver) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.bg }]}>
        <Ionicons name="person-outline" size={60} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لم يتم تحديد مندوب</Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.primary }]}
          onPress={onBack}
        >
          <Text style={styles.backButtonText}>العودة لقائمة المناديب</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const dailyOrders = driver.daily_orders || {};
  const dailyIdentifiers = driver.daily_identifiers || {};
  const dailyTarget = (driver.daily_target && driver.daily_target !== 15) ? driver.daily_target : 18;

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);
  const isCurrentMonth = !month || month === currentMonthPrefix;
  const monthPrefix = month || currentMonthPrefix;

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

  const daysList = useMemo(() => {
    return Array.from({ length: maxDayNumber }, (_, i) => {
      const dayNum = i + 1;
      const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
      const dObj = new Date(dateStr);
      const weekdayName = isNaN(dObj.getTime()) ? '' : ARABIC_WEEKDAYS[dObj.getDay()];
      return {
        day: dayNum,
        date: dateStr,
        weekday: weekdayName,
      };
    });
  }, [maxDayNumber, monthPrefix]);

  const activeDaysCount = Object.keys(dailyOrders).filter(
    (d) => (dailyOrders[d] || 0) > 0
  ).length;
  const absentDaysCount = Math.max(0, daysList.length - activeDaysCount);

  const totalOrders = driver.month_orders || 0;
  const totalRequiredTargetSoFar = daysList.length * dailyTarget;
  const targetDiff = totalOrders - totalRequiredTargetSoFar;
  const dailyAvg = activeDaysCount > 0 ? (totalOrders / activeDaysCount).toFixed(1) : '0';

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

  const getAppMeta = (text: string) => {
    const lower = (text || '').toLowerCase();
    if (lower.includes('نينجا') || lower.includes('ninja')) {
      return {
        logo: NINJA_LOGO,
        appName: 'نينجا',
        bg: isDarkMode ? '#1e1035' : '#faf5ff',
        border: isDarkMode ? '#a855f7' : '#d8b4fe',
        text: isDarkMode ? '#d8b4fe' : '#6b21a8',
        tagBg: '#000000',
        tagText: '#ffffff',
        avatarBg: '#000000',
        resizeMode: 'contain' as const,
      };
    }
    if (lower.includes('كيتا') || lower.includes('keeta')) {
      return {
        logo: KEETA_LOGO,
        appName: 'كيتا',
        bg: isDarkMode ? '#2d1a04' : '#fffbeb',
        border: isDarkMode ? '#d97706' : '#fde68a',
        text: isDarkMode ? '#fbbf24' : '#92400e',
        tagBg: '#d97706',
        tagText: '#ffffff',
        avatarBg: '#fef08a',
        resizeMode: 'cover' as const,
      };
    }
    if (lower.includes('تويو') || lower.includes('toyou')) {
      return {
        logo: TOYOU_LOGO,
        appName: 'تويو',
        bg: isDarkMode ? '#0c1e33' : '#f0fdfa',
        border: isDarkMode ? '#0284c7' : '#bae6fd',
        text: isDarkMode ? '#38bdf8' : '#0369a1',
        tagBg: '#0284c7',
        tagText: '#ffffff',
        avatarBg: '#ffffff',
        resizeMode: 'contain' as const,
      };
    }
    return {
      logo: null,
      appName: '',
      bg: isDarkMode ? '#1e293b' : '#f1f5f9',
      border: colors.border,
      text: colors.textPrimary,
      tagBg: colors.primary,
      tagText: '#ffffff',
      avatarBg: colors.card,
      resizeMode: 'contain' as const,
    };
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Target Performance Banner */}
      <View
        style={[
          styles.targetStatusBanner,
          {
            backgroundColor: targetDiff >= 0 ? colors.successLight : colors.dangerLight,
            borderColor: targetDiff >= 0 ? colors.success : colors.danger,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Ionicons
          name={targetDiff >= 0 ? 'checkmark-circle' : 'alert-circle'}
          size={26}
          color={targetDiff >= 0 ? colors.success : colors.danger}
        />
        <View style={[styles.bannerTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text
            style={[
              styles.bannerTitle,
              { color: targetDiff >= 0 ? colors.success : colors.danger, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {targetDiff >= 0
              ? `محقق التارچت ومتقدم بـ +${targetDiff} طلب عن المطلوب`
              : `متأخر عن التارچت التراكمي بعجز ${Math.abs(targetDiff)} طلب`}
          </Text>
          <Text style={[styles.bannerSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            المطلوب حتى يوم {maxDayNumber}: {totalRequiredTargetSoFar} طلب • تم إنجاز: {totalOrders} طلب
          </Text>
        </View>
      </View>

      {/* 3. KPI Stats Grid */}
      <View style={[styles.kpiGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {isFilteredPeriod && periodOrders !== null && (
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 2 }]}>
            <Text style={[styles.kpiValue, { color: colors.primary, fontSize: 22 }]}>{periodOrders}</Text>
            <Text style={[styles.kpiLabel, { color: colors.primary, fontWeight: '800' }]}>
              {dateFilter?.type === 'day' ? 'طلبات اليوم المختار' : 'طلبات الفترة المحددة'}
            </Text>
          </View>
        )}

        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{totalOrders}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>إجمالي الشهر</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.kpiValue, { color: colors.success }]}>{activeDaysCount}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>أيام الحضور</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.kpiValue, { color: colors.danger }]}>{absentDaysCount}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>أيام الغياب</Text>
        </View>

        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.kpiValue, { color: colors.accent }]}>{dailyAvg}</Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>متوسط الحضور</Text>
        </View>
      </View>

      {/* 4. Daily Breakdown Section Header */}
      <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            سجل الأيام والمعرفات اليومية
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            عرض كافة المعرفات والتطبيقات المسجلة لكل يوم من 1 إلى {maxDayNumber}
          </Text>
        </View>
        <View style={[styles.targetInfoBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.targetInfoBadgeText, { color: colors.primary }]}>
            التارچت: {dailyTarget}/يوم
          </Text>
        </View>
      </View>

      {/* 5. Daily Breakdown List */}
      <View style={styles.daysListContainer}>
        {daysList.map((dItem) => {
          const dayOrders = Number(dailyOrders[dItem.date]) || 0;
          const isAbsent = dayOrders === 0;
          const isAchieved = dayOrders >= dailyTarget;
          const inPeriod = isDayInPeriod(dItem.day, dItem.date);

          const rawDailyIdents: any = dailyIdentifiers[dItem.date];
          let identsForDay: string[] = [];
          if (Array.isArray(rawDailyIdents)) {
            identsForDay = rawDailyIdents.filter((id: any) => Boolean(id && String(id).trim()));
          } else if (typeof rawDailyIdents === 'string' && String(rawDailyIdents).trim().length > 0) {
            identsForDay = [String(rawDailyIdents).trim()];
          }

          // Fallback if day active but no specific identifier tagged
          if (identsForDay.length === 0 && !isAbsent) {
            if (Array.isArray(driver.identifiers) && driver.identifiers.length > 0) {
              identsForDay = driver.identifiers.map((id, idx) => {
                const app = Array.isArray(driver.apps) && driver.apps[idx] ? ` (${driver.apps[idx]})` : '';
                return `${id}${app}`;
              });
            } else if (Array.isArray(driver.apps) && driver.apps.length > 0) {
              identsForDay = driver.apps;
            }
          }

          const shiftsForDay = (driver.daily_shifts && driver.daily_shifts[dItem.date]) || [];

          return (
            <View
              key={dItem.day}
              style={[
                styles.dayRowCard,
                {
                  backgroundColor: colors.card,
                  borderColor: inPeriod ? colors.primary : (isAbsent ? colors.border : (isAchieved ? colors.success : colors.warning)),
                  borderWidth: inPeriod ? 2 : 1,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
                isAbsent && { opacity: isDarkMode ? 0.6 : 0.75 },
              ]}
            >
              {/* Day & Date Box */}
              <View style={[styles.dayDateBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.dayNumRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text
                    style={[
                      styles.dayNumText,
                      {
                        color: isAbsent
                          ? colors.textSecondary
                          : isAchieved
                          ? colors.success
                          : colors.warning,
                      },
                    ]}
                  >
                    يوم {dItem.day}
                  </Text>
                  {dItem.weekday ? (
                    <Text style={[styles.weekdayText, { color: colors.textSecondary }]}>
                      • {dItem.weekday}
                    </Text>
                  ) : null}
                  {inPeriod && (
                    <View style={[styles.inPeriodBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.inPeriodBadgeText, { color: colors.primary }]}>الفترة</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.fullDateSubText, { color: colors.textSecondary }]}>
                  {dItem.date}
                </Text>
              </View>

              {/* Identifier Info for this specific Day: Clean Image + Name (No heavy boxes, No extra app text) */}
              <View style={[styles.dayIdentCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                {!isAbsent ? (
                  shiftsForDay.length > 0 ? (
                    <View style={[styles.identsWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {shiftsForDay.map((shift, sIdx) => {
                        const meta = getAppMeta(shift.app_name || shift.label);
                        const cleanName = (shift.identifier_name || shift.label || '').trim();
                        return (
                          <View
                            key={sIdx}
                            style={[
                              styles.cleanIdentChip,
                              {
                                flexDirection: isRTL ? 'row-reverse' : 'row',
                              },
                            ]}
                          >
                            {meta.logo ? (
                              <View style={[styles.cleanLogoBox, { backgroundColor: meta.avatarBg }]}>
                                <Image
                                  source={meta.logo}
                                  style={styles.cleanLogoImg}
                                  resizeMode={meta.resizeMode}
                                />
                              </View>
                            ) : (
                              <Ionicons name="person" size={15} color={colors.primary} />
                            )}
                            <Text style={[styles.cleanIdentNameText, { color: colors.textPrimary }]}>
                              {cleanName}
                            </Text>
                            {shiftsForDay.length > 1 && shift.orders_count > 0 && (
                              <Text style={[styles.shiftOrdersCountText, { color: colors.textSecondary }]}>
                                ({shift.orders_count})
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ) : identsForDay.length > 0 ? (
                    <View style={[styles.identsWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {identsForDay.map((identLabel, iIdx) => {
                        const meta = getAppMeta(identLabel);
                        let displayName = identLabel;
                        let extractedApp = '';
                        const match = identLabel.match(/^(.*?)\s*\((.*?)\)$/);
                        if (match) {
                          displayName = match[1].trim();
                          extractedApp = match[2].trim();
                        }
                        const appMeta = extractedApp ? getAppMeta(extractedApp) : meta;

                        return (
                          <View
                            key={iIdx}
                            style={[
                              styles.cleanIdentChip,
                              {
                                flexDirection: isRTL ? 'row-reverse' : 'row',
                              },
                            ]}
                          >
                            {appMeta.logo ? (
                              <View style={[styles.cleanLogoBox, { backgroundColor: appMeta.avatarBg }]}>
                                <Image
                                  source={appMeta.logo}
                                  style={styles.cleanLogoImg}
                                  resizeMode={appMeta.resizeMode}
                                />
                              </View>
                            ) : (
                              <Ionicons name="person" size={15} color={colors.primary} />
                            )}
                            <Text style={[styles.cleanIdentNameText, { color: colors.textPrimary }]}>
                              {displayName}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={[styles.cleanIdentChip, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="person-outline" size={15} color={colors.textSecondary} />
                      <Text style={[styles.cleanIdentNameText, { color: colors.textSecondary }]}>
                        {driver.identifiers && driver.identifiers.length > 0 ? driver.identifiers[0] : 'معرف يومي'}
                      </Text>
                    </View>
                  )
                ) : (
                  <View style={[styles.absentBadgePill, { backgroundColor: colors.dangerLight }]}>
                    <Ionicons name="moon-outline" size={12} color={colors.danger} />
                    <Text style={[styles.absentBadgeText, { color: colors.danger }]}>غياب (لم يعمل)</Text>
                  </View>
                )}
              </View>

              {/* Orders Count & Target Status */}
              <View style={[styles.ordersStatusCol, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
                <Text
                  style={[
                    styles.dayOrdersCount,
                    {
                      color: isAbsent
                        ? colors.textSecondary
                        : isAchieved
                        ? colors.success
                        : colors.textPrimary,
                    },
                  ]}
                >
                  {isAbsent ? '0' : dayOrders}{' '}
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>طلب</Text>
                </Text>

                {!isAbsent && (
                  <View
                    style={[
                      styles.targetDiffChip,
                      {
                        backgroundColor: isAchieved ? colors.successLight : colors.warningLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.targetDiffChipText,
                        { color: isAchieved ? colors.success : colors.warning },
                      ]}
                    >
                      {isAchieved
                        ? `+${dayOrders - dailyTarget} فائض`
                        : `-${dailyTarget - dayOrders} عجز`}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  heroTopRow: {
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfoCol: {
    flex: 1,
    gap: 5,
  },
  driverNameText: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  heroMetaRow: {
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 11,
  },
  tagsContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  tagRow: {
    alignItems: 'center',
    gap: 8,
  },
  tagLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  tagValuesWrap: {
    flex: 1,
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  appBrandPill: {
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
    gap: 6,
  },
  appLogoMiniBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  appLogoMiniImg: {
    width: 16,
    height: 16,
  },
  appBrandPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  identPillHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  identPillHeroText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  targetStatusBanner: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  bannerTextCol: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  bannerSub: {
    fontSize: 11,
    fontWeight: '500',
  },
  kpiGrid: {
    gap: 8,
    marginBottom: 18,
  },
  kpiCard: {
    flex: 1,
    minWidth: '22%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  targetInfoBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  targetInfoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  daysListContainer: {
    gap: 8,
  },
  dayRowCard: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayDateBox: {
    flex: 1.2,
    gap: 2,
  },
  dayNumRow: {
    alignItems: 'center',
    gap: 4,
  },
  dayNumText: {
    fontSize: 14,
    fontWeight: '900',
  },
  weekdayText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fullDateSubText: {
    fontSize: 10,
    fontWeight: '500',
  },
  inPeriodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  inPeriodBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  dayIdentCol: {
    flex: 2,
  },
  identsWrap: {
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  cleanIdentChip: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  cleanLogoBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  cleanLogoImg: {
    width: 18,
    height: 18,
  },
  cleanIdentNameText: {
    fontSize: 13,
    fontWeight: '800',
  },
  shiftBrandBadge: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    gap: 6,
  },
  shiftLogoBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  shiftLogoImg: {
    width: 17,
    height: 17,
  },
  shiftIdentName: {
    fontSize: 12,
    fontWeight: '800',
  },
  shiftAppTag: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  shiftAppTagText: {
    fontSize: 9.5,
    fontWeight: '900',
  },
  shiftOrdersCountText: {
    fontSize: 11,
    fontWeight: '800',
  },
  absentBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  absentBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  ordersStatusCol: {
    flex: 1,
    gap: 3,
  },
  dayOrdersCount: {
    fontSize: 16.5,
    fontWeight: '900',
  },
  targetDiffChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  targetDiffChipText: {
    fontSize: 10,
    fontWeight: '800',
  },
});
