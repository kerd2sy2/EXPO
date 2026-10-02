import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WorkSession, PreviewPhotoData, ThemeColors, Language } from '../types/delegate';
import { ShiftDetailsModal } from '../components/modals/ShiftDetailsModal';
import { formatBikePlateForDisplay } from '../utils/plateUtils';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MONTH_NAMES: Record<string, string[]> = {
  ar: [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
  ],
  en: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  bn: [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
  ],
  ur: [
    'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
    'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر',
  ],
};

interface MonthGroup {
  key: string; // YYYY-MM
  label: string;
  year: number;
  month: number;
  isCurrent: boolean;
  sessions: WorkSession[];
  totalOrders: number;
  approvedOrders: number;
  pendingOrders: number;
  totalDistance: number;
  totalFuel: number;
  shiftsCount: number;
}

interface HistoryScreenProps {
  historySessions: WorkSession[];
  loading?: boolean;
  selectedSession?: WorkSession | null;
  onSelectSession?: (session: WorkSession | null) => void;
  selectedMonthKey?: string | null;
  onSelectMonthKey?: (key: string | null, label: string | null) => void;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  formatDateStr: (iso?: string) => string;
  formatTimeStr: (iso?: string) => string;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  lang?: Language;
  monthlyTarget?: number;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  historySessions,
  loading = false,
  selectedSession,
  onSelectSession,
  selectedMonthKey: controlledMonthKey,
  onSelectMonthKey: controlledSetMonthKey,
  onPreviewPhoto,
  formatDateStr,
  formatTimeStr,
  colors,
  isDarkMode,
  isRTL,
  t,
  lang = 'ar',
}) => {
  const [internalSelectedSession, setInternalSelectedSession] = useState<WorkSession | null>(null);
  const activeSelected = selectedSession !== undefined ? selectedSession : internalSelectedSession;
  const setActiveSelected = onSelectSession || setInternalSelectedSession;

  // Selected Month Page (null = viewing all months list, string = viewing shifts of that month)
  const [internalMonthKey, setInternalMonthKey] = useState<string | null>(null);
  const selectedMonthKey = controlledMonthKey !== undefined ? controlledMonthKey : internalMonthKey;

  const setMonthKey = (key: string | null, label: string | null) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (controlledSetMonthKey) {
      controlledSetMonthKey(key, label);
    } else {
      setInternalMonthKey(key);
    }
  };

  // Group all completed sessions by calendar month (YYYY-MM)
  const monthGroups = useMemo<MonthGroup[]>(() => {
    const map = new Map<string, MonthGroup>();
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthList = MONTH_NAMES[lang || 'ar'] || MONTH_NAMES.ar;

    // Ensure current month always exists in the list
    map.set(currentKey, {
      key: currentKey,
      label: `${monthList[now.getMonth()]} ${now.getFullYear()}`,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      isCurrent: true,
      sessions: [],
      totalOrders: 0,
      approvedOrders: 0,
      pendingOrders: 0,
      totalDistance: 0,
      totalFuel: 0,
      shiftsCount: 0,
    });

    // Populate and aggregate data from sessions
    historySessions.forEach((s) => {
      if (s.status === 'ACTIVE' || !s.start_time) return;
      try {
        const d = new Date(s.start_time);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!map.has(k)) {
          map.set(k, {
            key: k,
            label: `${monthList[d.getMonth()]} ${d.getFullYear()}`,
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            isCurrent: k === currentKey,
            sessions: [],
            totalOrders: 0,
            approvedOrders: 0,
            pendingOrders: 0,
            totalDistance: 0,
            totalFuel: 0,
            shiftsCount: 0,
          });
        }

        const group = map.get(k)!;
        group.sessions.push(s);
        group.shiftsCount += 1;

        const orders = Number(s.orders_count) || 0;
        group.totalOrders += orders;
        if (s.is_reviewed) {
          group.approvedOrders += orders;
        } else {
          group.pendingOrders += orders;
        }

        const dist =
          Number(s.distance) ||
          (s.end_km && s.start_km && Number(s.end_km) >= Number(s.start_km)
            ? Number(s.end_km) - Number(s.start_km)
            : 0);
        group.totalDistance += dist;
        group.totalFuel += Number(s.fuel_cost) || 0;
      } catch {}
    });

    // Sort descending by month key (latest month first)
    return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [historySessions, lang]);

  const activeMonthGroup = useMemo(() => {
    if (!selectedMonthKey) return null;
    return monthGroups.find((g) => g.key === selectedMonthKey) || null;
  }, [monthGroups, selectedMonthKey]);

  return (
    <View style={styles.tabContainer}>
      {/* ========================================================================= */}
      {/* VIEW A: DEDICATED MONTH PAGE (Direct List of shifts for selected month)   */}
      {/* ========================================================================= */}
      {activeMonthGroup ? (
        <View style={styles.monthPageContainer}>

          {/* Direct List of Shifts for this Month */}
          {activeMonthGroup.sessions.length === 0 ? (
            <View
              style={[
                styles.emptyStateCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: colors.inputBg },
                ]}
              >
                <Ionicons
                  name="calendar-clear-outline"
                  size={32}
                  color={colors.textSecondary}
                />
              </View>
              <Text
                style={[styles.emptyStateText, { color: colors.textSecondary }]}
              >
                {t.noHistoryInMonth || (isRTL ? 'لا توجد شفتات مسجلة في هذا الشهر' : 'No shifts recorded in this month')}
              </Text>
            </View>
          ) : (
            <View style={styles.shiftsList}>
              {activeMonthGroup.sessions.map((session) => {
                const isApproved = Boolean(session.is_reviewed);
                const distance =
                  session.distance ||
                  (session.end_km && session.start_km
                    ? session.end_km - session.start_km
                    : 0);

                return (
                  <TouchableOpacity
                    key={session.id}
                    style={[
                      styles.shiftItemCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                    activeOpacity={0.8}
                    onPress={() => setActiveSelected(session)}
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
                          <Text
                            style={[
                              styles.shiftItemDateTitle,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {formatDateStr(session.start_time)}
                          </Text>
                          <Text
                            style={[
                              styles.shiftItemTimeSubtitle,
                              { color: colors.textSecondary },
                            ]}
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
                              ? (isDarkMode
                                  ? 'rgba(34, 197, 94, 0.16)'
                                  : '#dcfce7')
                              : (isDarkMode
                                  ? 'rgba(245, 158, 11, 0.16)'
                                  : '#fef3c7'),
                            borderColor: isApproved
                              ? (isDarkMode
                                  ? 'rgba(34, 197, 94, 0.3)'
                                  : '#bbf7d0')
                              : (isDarkMode
                                  ? 'rgba(245, 158, 11, 0.3)'
                                  : '#fde68a'),
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            isApproved ? 'checkmark-circle' : 'time-outline'
                          }
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
                            ? (t.reviewedBadge || 'مصادق عليه')
                            : (t.pendingBadge || 'بانتظار المشرف')}
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
                      {/* Orders */}
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
                          <Text
                            style={[
                              styles.metricColumnLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {isApproved ? (t.approvedOrders || 'المعتمدة') : (t.ordersUnit || 'الطلبات')}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.metricColumnValue,
                            { color: colors.primary },
                          ]}
                        >
                          {session.orders_count || 0}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.metricColDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />

                      {/* Distance */}
                      <View style={styles.metricColumn}>
                        <View
                          style={[
                            styles.metricLabelRow,
                            { flexDirection: isRTL ? 'row-reverse' : 'row' },
                          ]}
                        >
                          <Ionicons
                            name="navigate-outline"
                            size={14}
                            color="#16a34a"
                          />
                          <Text
                            style={[
                              styles.metricColumnLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {t.km || 'المسافة'}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.metricColumnValue,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {distance} {t.km || 'كم'}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.metricColDivider,
                          { backgroundColor: colors.border },
                        ]}
                      />

                      {/* Fuel */}
                      <View style={styles.metricColumn}>
                        <View
                          style={[
                            styles.metricLabelRow,
                            { flexDirection: isRTL ? 'row-reverse' : 'row' },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name="gas-station"
                            size={14}
                            color="#d97706"
                          />
                          <Text
                            style={[
                              styles.metricColumnLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {t.sar || 'البنزين'}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.metricColumnValue,
                            { color: colors.textPrimary },
                          ]}
                        >
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
                            backgroundColor: isDarkMode
                              ? 'rgba(245, 158, 11, 0.12)'
                              : '#fef3c7',
                            borderColor: isDarkMode
                              ? 'rgba(245, 158, 11, 0.25)'
                              : '#fde68a',
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name="shield-check"
                          size={14}
                          color="#d97706"
                        />
                        <Text
                          style={[
                            styles.supervisorEditText,
                            { color: isDarkMode ? '#fbbf24' : '#92400e' },
                          ]}
                        >
                          {(t.supervisorModifiedNotice || 'قام المشرف ({name}) بتعديل واعتماد البيانات').replace(
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
                );
              })}
            </View>
          )}
        </View>
      ) : (
        /* ========================================================================= */
        /* VIEW B: LIST OF MONTH CARDS (MAIN SCREEN)                                 */
        /* ========================================================================= */
        <View style={styles.monthsList}>
          {monthGroups.map((group) => (
            <TouchableOpacity
              key={group.key}
              style={[
                styles.monthCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setMonthKey(group.key, group.label)}
            >
              {/* Card Top: Month Icon + Title + Current Badge + Nav Circle */}
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
                      {
                        backgroundColor: group.isCurrent
                          ? colors.primaryLight
                          : colors.inputBg,
                      },
                    ]}
                  >
                    <Ionicons
                      name="calendar"
                      size={20}
                      color={
                        group.isCurrent ? colors.primary : colors.textSecondary
                      }
                    />
                  </View>

                  <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <View
                      style={[
                        styles.titleRow,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.monthCardTitle,
                          { color: colors.textPrimary },
                        ]}
                      >
                        {group.label}
                      </Text>
                      {group.isCurrent && (
                        <View
                          style={[
                            styles.currentMonthBadge,
                            {
                              backgroundColor: colors.primaryLight,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.currentMonthBadgeText,
                              { color: colors.primary },
                            ]}
                          >
                            {t.currentMonth || (lang === 'ar' ? 'الحالي' : 'Current')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.monthCardShiftsCount,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {(t.shiftsCountLabel || '{n} shifts').replace('{n}', String(group.shiftsCount))}
                    </Text>
                  </View>
                </View>

                {/* Nav Arrow Circle */}
                <View
                  style={[
                    styles.navCircle,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
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
                style={[
                  styles.monthStatsRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                {/* Orders */}
                <View
                  style={[
                    styles.monthStatChip,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="package-variant-closed"
                    size={16}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.monthStatChipVal,
                      { color: colors.primary },
                    ]}
                  >
                    {group.totalOrders}
                  </Text>
                  <Text
                    style={[
                      styles.monthStatChipLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.ordersUnit || 'طلب'}
                  </Text>
                </View>

                {/* Distance */}
                <View
                  style={[
                    styles.monthStatChip,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons name="navigate" size={16} color="#16a34a" />
                  <Text
                    style={[
                      styles.monthStatChipVal,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {group.totalDistance.toFixed(0)}
                  </Text>
                  <Text
                    style={[
                      styles.monthStatChipLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.km || 'كم'}
                  </Text>
                </View>

                {/* Fuel */}
                <View
                  style={[
                    styles.monthStatChip,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="gas-station"
                    size={16}
                    color="#d97706"
                  />
                  <Text
                    style={[
                      styles.monthStatChipVal,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {group.totalFuel.toFixed(0)}
                  </Text>
                  <Text
                    style={[
                      styles.monthStatChipLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.sar || 'ر.س'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ========================================================================= */}
      {/* SHIFT DETAILS BOTTOM-SHEET MODAL                                          */}
      {/* ========================================================================= */}
      <ShiftDetailsModal
        visible={Boolean(activeSelected)}
        session={activeSelected}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        t={t}
        lang={lang}
        onClose={() => setActiveSelected(null)}
        onPreviewPhoto={onPreviewPhoto}
        formatDateStr={formatDateStr}
        formatTimeStr={formatTimeStr}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    padding: 16,
    gap: 14,
  },
  // Month Cards List
  monthsList: {
    gap: 12,
  },
  monthCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  monthCardTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthCardHeaderLeft: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  monthIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: {
    alignItems: 'center',
    gap: 8,
  },
  monthCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  currentMonthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  currentMonthBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  monthCardShiftsCount: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  navCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthStatsRow: {
    gap: 8,
  },
  monthStatChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  monthStatChipVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  monthStatChipLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Dedicated Month Page
  monthPageContainer: {
    gap: 14,
  },
  monthPageTopBar: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  monthPageTitleGroup: {
    flex: 1,
  },
  monthPageTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  monthPageSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Shifts List
  shiftsList: {
    gap: 10,
  },
  shiftItemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  shiftItemTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shiftItemDateLeft: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  shiftItemIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shiftItemDateTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  shiftItemTimeSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  statusPillBadge: {
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  shiftMetricsBar: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricColumn: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  metricLabelRow: {
    alignItems: 'center',
    gap: 4,
  },
  metricColumnLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricColumnValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  metricColDivider: {
    width: 1,
    height: 24,
  },
  supervisorEditBadge: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  supervisorEditText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Empty State
  emptyStateCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
