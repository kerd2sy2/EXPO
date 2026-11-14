import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { DelegateWithStatus } from '../../services/supervisor';
import { VehicleItem } from '../../services/operations';
import { fleetOilStyles as styles } from './fleetOilStyles';
import { computeOilStatus } from './fleetOilHelpers';

interface FleetOilCardProps {
  vehicle: VehicleItem;
  driverByPlate: Map<string, DelegateWithStatus>;
  driverByKey: Map<string, DelegateWithStatus>;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  isDispensing: boolean;
  onOpenEdit: (vehicle: VehicleItem) => void;
  onDirectDispense: (vehicle: VehicleItem, currKm: number) => void;
}

export const FleetOilCard: React.FC<FleetOilCardProps> = ({
  vehicle: v,
  driverByPlate,
  driverByKey,
  colors,
  isDarkMode,
  isRTL,
  isDispensing,
  onOpenEdit,
  onDirectDispense,
}) => {
  const {
    assignedDriver,
    keyDisplay,
    currKm,
    lastOilKm,
    isBroken,
    remainingKm,
    isOverdue,
    brokenDaysSince,
    brokenDaysLeft,
    formattedLastDate,
  } = computeOilStatus(v, driverByPlate, driverByKey);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      delayLongPress={450}
      onLongPress={() => onOpenEdit(v)}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isOverdue ? (isDarkMode ? '#ef444450' : '#fca5a5') : colors.border,
        },
      ]}
    >
      {/* Top Header: Key Number Badge + Plate + Driver */}
      <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.keyAndPlateGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View
            style={[
              styles.keyBadge,
              {
                backgroundColor: '#f59e0b18',
                borderColor: '#f59e0b50',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="key" size={14} color="#d97706" />
            <Text style={styles.keyBadgeText}>مفتاح #{keyDisplay}</Text>
          </View>

          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.plateText, { color: colors.textPrimary }]}>
              {v.plate_number}
            </Text>
            <Text style={[styles.driverText, { color: colors.textSecondary }]}>
              المندوب: {assignedDriver?.name || 'غير مسند'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => onOpenEdit(v)}
          style={[
            styles.editIconCircle,
            { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border },
          ]}
        >
          <Ionicons name="create-outline" size={16} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Primary Status Banner */}
      <View
        style={[
          styles.oilStatusBanner,
          {
            backgroundColor: isOverdue
              ? '#ef444415'
              : isDarkMode
              ? '#0284c718'
              : '#e0f2fe',
            borderColor: isOverdue ? '#ef444440' : '#0284c740',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Ionicons
          name={isOverdue ? 'warning' : 'color-fill'}
          size={18}
          color={isOverdue ? '#ef4444' : '#0284c7'}
        />

        <View style={[styles.oilStatusTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          {isBroken ? (
            <Text
              style={[
                styles.oilStatusMainText,
                { color: isOverdue ? '#ef4444' : colors.textPrimary },
              ]}
            >
              {isOverdue
                ? `عداد عاطل - مستحق الغيار فوراً (منذ ${brokenDaysSince} أيام)`
                : `عداد عاطل - باقي ${Math.max(0, brokenDaysLeft)} أيام لتغيير الزيت (دورية كل 5 أيام)`}
            </Text>
          ) : isOverdue ? (
            <Text style={[styles.oilStatusMainText, { color: '#ef4444' }]}>
              مستحق تغيير الزيت فوراً (متجاوز {Math.abs(remainingKm).toLocaleString('en-US')} كم)
            </Text>
          ) : (
            <Text style={[styles.oilStatusMainText, { color: isDarkMode ? '#38bdf8' : '#0369a1' }]}>
              فاضل {remainingKm.toLocaleString('en-US')} كم ويتغير الزيت
            </Text>
          )}
        </View>
      </View>

      {/* Details Grid */}
      <View
        style={[
          styles.metricsRow,
          {
            backgroundColor: isDarkMode ? '#1e293b40' : '#f8fafc',
            borderColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={styles.metricCell}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>العداد الحالي</Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {isBroken ? 'معطل' : `${currKm.toLocaleString('en-US')} كم`}
          </Text>
        </View>

        <View style={[styles.cellDivider, { backgroundColor: colors.border }]} />

        <View style={styles.metricCell}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>آخر غيار زيت</Text>
          <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
            {lastOilKm > 0 ? `${lastOilKm.toLocaleString('en-US')} كم` : 'غير مسجل'}
          </Text>
        </View>

        <View style={[styles.cellDivider, { backgroundColor: colors.border }]} />

        <View style={styles.metricCell}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>تاريخ الغيار</Text>
          <Text style={[styles.metricValue, { color: colors.textSecondary, fontSize: 11 }]}>
            {formattedLastDate}
          </Text>
        </View>
      </View>

      {/* Change Oil Now Action Button */}
      <TouchableOpacity
        activeOpacity={0.82}
        disabled={isDispensing}
        style={[
          styles.dispenseBtn,
          {
            backgroundColor: isDispensing ? '#64748b' : isOverdue ? '#ef4444' : '#0284c7',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
        onPress={() => onDirectDispense(v, currKm)}
      >
        {isDispensing ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Ionicons name="construct-outline" size={17} color="#ffffff" />
            <Text style={styles.dispenseBtnText}>غير زيت الآن</Text>
          </>
        )}
      </TouchableOpacity>

      {/* Long Press Hint */}
      <View style={[styles.hintRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="hand-right-outline" size={13} color={colors.textSecondary} />
        <Text style={[styles.hintText, { color: colors.textSecondary }]}>
          اضغط مطولاً على الكرت لتعديل قراءة وتاريخ آخر غيار زيت
        </Text>
      </View>
    </TouchableOpacity>
  );
};
