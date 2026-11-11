import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../types/delegate';
import { DelegateWithStatus } from '../services/supervisor';
import { VehicleItem, isVehicleOilDue, operationsApi } from '../services/operations';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import * as Haptics from 'expo-haptics';

export interface OilChangeScreenProps {
  vehicles: VehicleItem[];
  delegates: DelegateWithStatus[];
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
  loading?: boolean;
  onRefresh?: () => void;
  adminName?: string;
  onNavigateToTab?: (tab: any) => void;
  onVehicleDispensed?: (vehicleId: string, currentKm: number) => void;
}

export const OilChangeScreen: React.FC<OilChangeScreenProps> = ({
  vehicles,
  delegates,
  colors,
  isDarkMode = false,
  isRTL = true,
  loading = false,
  onRefresh,
  adminName = 'المشرف',
  onNavigateToTab,
  onVehicleDispensed,
}) => {
  const [dispensingVehicleId, setDispensingVehicleId] = useState<string | null>(null);
  // Optimistic tracking: Vehicle IDs dispensed in this session disappear immediately (0ms)
  const [dispensedVehicleIds, setDispensedVehicleIds] = useState<Set<string>>(new Set());

  // Map drivers by plate and key
  const { driverByPlate, driverByKey } = useMemo(() => {
    const byPlate = new Map<string, DelegateWithStatus>();
    const byKey = new Map<string, DelegateWithStatus>();

    delegates.forEach((d) => {
      const p = (d.active_motorcycle || d.motorcycle_number || '').trim().toLowerCase();
      const k = (d.key_number || '').trim().toLowerCase();
      if (p && !byPlate.has(p)) byPlate.set(p, d);
      if (k && !byKey.has(k)) byKey.set(k, d);
    });

    return { driverByPlate: byPlate, driverByKey: byKey };
  }, [delegates]);

  // Filter ONLY vehicles that require oil change AND haven't been dispensed in this session
  const oilDueVehicles = useMemo(() => {
    return vehicles
      .filter((v) => !dispensedVehicleIds.has(v.id))
      .filter((v) => isVehicleOilDue(v));
  }, [vehicles, dispensedVehicleIds]);

  // Direct oil dispense handler - 0ms instant optimistic update
  const handleDirectDispense = useCallback(
    async (vehicle: VehicleItem, currKm: number) => {
      const plate = vehicle.plate_number || (vehicle as any).motorcycle_number || '';
      if (!plate) {
        showBottomAlert({
          type: 'warning',
          title: 'تنبيه',
          message: 'رقم اللوحة غير متوفر للدباب.',
        });
        return;
      }

      const kmToSave = currKm || Number(vehicle.current_km) || 0;

      // 1. INSTANT OPTIMISTIC DISAPPEARANCE (0ms)
      setDispensedVehicleIds((prev) => new Set(prev).add(vehicle.id));
      onVehicleDispensed?.(vehicle.id, kmToSave);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}

      showBottomAlert({
        type: 'success',
        title: 'تم صرف الزيت بنجاح',
        message: `تم صرف جركن زيت وتسجيل غيار الزيت للدباب (${plate}) فوراً.`,
      });

      // 2. BACKGROUND SERVER SYNC & OFFLINE QUEUE
      operationsApi
        .dispenseOil({
          motorcycleNumber: plate,
          currentKm: kmToSave,
          quantity: 1,
          notes: `صرف زيت مباشر من قائمة مستحقي الزيت بواسطة ${adminName}`,
        })
        .then(() => {
          // Silent background sync without freezing UI
          onRefresh?.();
        })
        .catch((err: any) => {
          console.warn('[handleDirectDispense] background notice:', err);
        });
    },
    [adminName, onRefresh, onVehicleDispensed]
  );

  const renderVehicleCard = ({ item: v }: { item: VehicleItem }) => {
    const plateClean = (v.plate_number || '').trim().toLowerCase();
    const keyClean = (v.key_number || '').trim().toLowerCase();
    const assignedDriver =
      (plateClean && driverByPlate.get(plateClean)) ||
      (keyClean && driverByKey.get(keyClean));
    const keyDisplay = v.key_number || assignedDriver?.key_number || '';
    const currKm = Number(v.current_km || 0);
    const lastOilKm = Number(v.last_oil_change_km || 0);
    const isBroken = Boolean(v.is_odometer_broken) || String(v.plate_number).includes('7569') || String(v.plate_number).includes('8043');

    const drivenSinceOil =
      lastOilKm > 0 && currKm >= lastOilKm
        ? currKm - lastOilKm
        : Number(v.total_distance || 0);

    const isDispensing = dispensingVehicleId === v.id;

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: isDarkMode ? '#ef444440' : '#fca5a5',
          },
        ]}
      >
        {/* Top Header Row */}
        <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.plateGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.bikeIconBox, { backgroundColor: '#ef444415' }]}>
              <Ionicons name="bicycle" size={22} color="#ef4444" />
            </View>

            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={[styles.plateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.plateText, { color: colors.textPrimary }]}>
                  {v.plate_number}
                </Text>

                {!!keyDisplay && (
                  <View
                    style={[
                      styles.keyPill,
                      {
                        backgroundColor: '#f59e0b18',
                        borderColor: '#f59e0b40',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Ionicons name="key" size={12} color="#d97706" />
                    <Text style={styles.keyPillText}>مفتاح {keyDisplay}</Text>
                  </View>
                )}
              </View>

              <Text style={[styles.driverNameText, { color: colors.textSecondary }]}>
                المندوب: {assignedDriver?.name || 'غير معين'}
              </Text>
            </View>
          </View>

          <View style={[styles.warningBadge, { backgroundColor: '#ef444418' }]}>
            <Ionicons name="alert-circle" size={13} color="#ef4444" />
            <Text style={styles.warningBadgeText}>
              {isBroken ? 'تغيير دوري' : 'يحتاج تغيير'}
            </Text>
          </View>
        </View>

        {/* Metrics Strip */}
        <View
          style={[
            styles.metricsStrip,
            {
              backgroundColor: isDarkMode ? '#1e293b50' : '#f8fafc',
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>العداد الحالي</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {isBroken ? 'معطل' : `${currKm.toLocaleString('en-US')} كم`}
            </Text>
          </View>

          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>آخر غيار زيت</Text>
            <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
              {lastOilKm > 0 ? `${lastOilKm.toLocaleString('en-US')} كم` : 'مسجل'}
            </Text>
          </View>

          <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />

          <View style={styles.metricItem}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
              {isBroken ? 'الدورية' : 'المسافة المقطوعة'}
            </Text>
            <Text style={[styles.metricValue, { color: '#ef4444' }]}>
              {isBroken ? 'كل 5 أيام' : `${drivenSinceOil.toLocaleString('en-US')} كم`}
            </Text>
          </View>
        </View>

        {/* Direct Dispense Button */}
        <TouchableOpacity
          activeOpacity={0.82}
          disabled={isDispensing}
          style={[
            styles.dispenseBtn,
            {
              backgroundColor: isDispensing ? '#64748b' : '#0284c7',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={() => handleDirectDispense(v, currKm)}
        >
          {isDispensing ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="construct-outline" size={18} color="#ffffff" />
              <Text style={styles.dispenseBtnText}>صرف وتغيير الزيت فوراً</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Main List */}
      <FlatList
        data={oilDueVehicles}
        keyExtractor={(item, index) => item.id || String(index)}
        renderItem={renderVehicleCard}
        contentContainerStyle={[
          styles.listContent,
          oilDueVehicles.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: '#10b98118' }]}>
              <Ionicons name="checkmark-done-circle" size={48} color="#10b981" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              لا توجد دبابات تحتاج تغيير زيت
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              جميع دبابات الفرع بحالة زيت ممتازة ومطابقة للمسافات المحددة.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerStrip: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  headerTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerInfoGroup: {
    gap: 2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  countBadgeText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '900',
  },
  searchBox: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 36,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 120,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plateGroup: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  bikeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateRow: {
    alignItems: 'center',
    gap: 8,
  },
  plateText: {
    fontSize: 16,
    fontWeight: '900',
  },
  keyPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  keyPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706',
  },
  driverNameText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  warningBadgeText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '800',
  },
  metricsStrip: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  metricDivider: {
    width: 1,
    height: 24,
  },
  dispenseBtn: {
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dispenseBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
});
