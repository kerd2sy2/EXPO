import React from 'react';
import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DriverPerformance } from '../../../types/target';
import { getDriverAppMeta } from './driverDetailsHelpers';
import { driverDetailsScreenStyles as styles } from './driverDetailsScreenStyles';

interface DriverDayRowCardProps {
  driver: DriverPerformance;
  dItem: { day: number; date: string; weekday: string };
  dayOrders: number;
  dailyTarget: number;
  inPeriod: boolean;
  dailyIdentifiers: Record<string, any>;
  colors: any;
  isDarkMode: boolean;
  isRTL: boolean;
}

export const DriverDayRowCard: React.FC<DriverDayRowCardProps> = ({
  driver,
  dItem,
  dayOrders,
  dailyTarget,
  inPeriod,
  dailyIdentifiers,
  colors,
  isDarkMode,
  isRTL,
}) => {
  const isAbsent = dayOrders === 0;
  const isAchieved = dayOrders >= dailyTarget;
  const rawDailyIdents: any = dailyIdentifiers[dItem.date];
  let identsForDay: string[] = [];

  if (Array.isArray(rawDailyIdents)) {
    identsForDay = rawDailyIdents.filter((id: any) => Boolean(id && String(id).trim()));
  } else if (typeof rawDailyIdents === 'string' && String(rawDailyIdents).trim().length > 0) {
    identsForDay = [String(rawDailyIdents).trim()];
  }

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
      style={[
        styles.dayRowCard,
        {
          backgroundColor: colors.card,
          borderColor: inPeriod ? colors.primary : isAbsent ? colors.border : isAchieved ? colors.success : colors.warning,
          borderWidth: inPeriod ? 2 : 1,
          flexDirection: isRTL ? 'row-reverse' : 'row',
        },
        isAbsent && { opacity: isDarkMode ? 0.6 : 0.75 },
      ]}
    >
      <View style={[styles.dayDateBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        <View style={[styles.dayNumRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.dayNumText, { color: isAbsent ? colors.textSecondary : isAchieved ? colors.success : colors.warning }]}>
            يوم {dItem.day}
          </Text>
          {dItem.weekday ? <Text style={[styles.weekdayText, { color: colors.textSecondary }]}>• {dItem.weekday}</Text> : null}
          {inPeriod && (
            <View style={[styles.inPeriodBadge, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.inPeriodBadgeText, { color: colors.primary }]}>الفترة</Text>
            </View>
          )}
        </View>
        <Text style={[styles.fullDateSubText, { color: colors.textSecondary }]}>{dItem.date}</Text>
      </View>

      <View style={[styles.dayIdentCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
        {!isAbsent ? (
          shiftsForDay.length > 0 ? (
            <View style={[styles.identsWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {shiftsForDay.map((shift, sIdx) => {
                const meta = getDriverAppMeta(shift.app_name || shift.label, isDarkMode, colors);
                const cleanName = (shift.identifier_name || shift.label || '').trim();
                return (
                  <View key={sIdx} style={[styles.cleanIdentChip, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {meta.logo ? (
                      <View style={[styles.cleanLogoBox, { backgroundColor: meta.avatarBg }]}>
                        <Image source={meta.logo} style={styles.cleanLogoImg} resizeMode={meta.resizeMode} />
                      </View>
                    ) : (
                      <Ionicons name="person" size={15} color={colors.primary} />
                    )}
                    <Text style={[styles.cleanIdentNameText, { color: colors.textPrimary }]}>{cleanName}</Text>
                    {shiftsForDay.length > 1 && shift.orders_count > 0 && (
                      <Text style={[styles.shiftOrdersCountText, { color: colors.textSecondary }]}>({shift.orders_count})</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ) : identsForDay.length > 0 ? (
            <View style={[styles.identsWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {identsForDay.map((identLabel, iIdx) => {
                const meta = getDriverAppMeta(identLabel, isDarkMode, colors);
                let displayName = identLabel;
                let extractedApp = '';
                const match = identLabel.match(/^(.*?)\s*\((.*?)\)$/);
                if (match) {
                  displayName = match[1].trim();
                  extractedApp = match[2].trim();
                }
                const appMeta = extractedApp ? getDriverAppMeta(extractedApp, isDarkMode, colors) : meta;
                return (
                  <View key={iIdx} style={[styles.cleanIdentChip, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {appMeta.logo ? (
                      <View style={[styles.cleanLogoBox, { backgroundColor: appMeta.avatarBg }]}>
                        <Image source={appMeta.logo} style={styles.cleanLogoImg} resizeMode={appMeta.resizeMode} />
                      </View>
                    ) : (
                      <Ionicons name="person" size={15} color={colors.primary} />
                    )}
                    <Text style={[styles.cleanIdentNameText, { color: colors.textPrimary }]}>{displayName}</Text>
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

      <View style={[styles.ordersStatusCol, { alignItems: isRTL ? 'flex-start' : 'flex-end' }]}>
        <Text style={[styles.dayOrdersCount, { color: isAbsent ? colors.textSecondary : isAchieved ? colors.success : colors.textPrimary }]}>
          {isAbsent ? '0' : dayOrders}{' '}
          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary }}>طلب</Text>
        </Text>

        {!isAbsent && (
          <View style={[styles.targetDiffChip, { backgroundColor: isAchieved ? colors.successLight : colors.warningLight }]}>
            <Text style={[styles.targetDiffChipText, { color: isAchieved ? colors.success : colors.warning }]}>
              {isAchieved ? `+${dayOrders - dailyTarget} فائض` : `-${dailyTarget - dayOrders} عجز`}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
