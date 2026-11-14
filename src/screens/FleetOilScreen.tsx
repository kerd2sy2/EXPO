import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeColors, TabType } from '../types/delegate';
import { DelegateWithStatus } from '../services/supervisor';
import { VehicleItem, operationsApi } from '../services/operations';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { fleetOilStyles as styles } from './fleet-oil/fleetOilStyles';
import {
  buildDriverMaps,
  sortMotorcyclesByKey,
  filterMotorcycles,
} from './fleet-oil/fleetOilHelpers';
import { FleetOilCard } from './fleet-oil/FleetOilCard';
import { FleetOilEditModal } from './fleet-oil/FleetOilEditModal';

export interface FleetOilScreenProps {
  vehicles: VehicleItem[];
  delegates: DelegateWithStatus[];
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
  loading?: boolean;
  onRefresh?: () => void;
  adminName?: string;
  onNavigateToTab?: (tab: TabType) => void;
  onVehicleDispensed?: (vehicleId: string, currentKm: number) => void;
}

export const FleetOilScreen: React.FC<FleetOilScreenProps> = ({
  vehicles,
  delegates,
  colors,
  isDarkMode = false,
  isRTL = true,
  loading = false,
  onRefresh,
  adminName = 'المشرف',
  onVehicleDispensed,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [dispensingVehicleId] = useState<string | null>(null);

  // Direct dispense handler with 0ms optimistic UI update
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

      // 1. Instant Optimistic State Update (0ms)
      onVehicleDispensed?.(vehicle.id, kmToSave);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {}

      showBottomAlert({
        type: 'success',
        title: 'تم الصرف بنجاح',
        message: `تم صرف جركن زيت وتسجيل غيار الزيت للدباب (${plate}) فوراً.`,
      });

      // 2. Background Dispatch with Offline Queue Resilience
      operationsApi
        .dispenseOil({
          motorcycleNumber: plate,
          currentKm: kmToSave,
          quantity: 1,
          notes: `صرف زيت مباشر بواسطة ${adminName}`,
        })
        .then(() => {
          onRefresh?.();
        })
        .catch((err: any) => {
          console.warn('[FleetOilScreen handleDirectDispense] background notice:', err);
        });
    },
    [adminName, onRefresh, onVehicleDispensed]
  );

  const { driverByPlate, driverByKey } = useMemo(() => buildDriverMaps(delegates), [delegates]);

  const motorcyclesList = useMemo(() => sortMotorcyclesByKey(vehicles), [vehicles]);

  const displayedVehicles = useMemo(
    () => filterMotorcycles(motorcyclesList, searchQuery, driverByPlate, driverByKey),
    [motorcyclesList, searchQuery, driverByPlate, driverByKey]
  );

  const handleOpenEditModal = useCallback((vehicle: VehicleItem) => {
    setSelectedVehicle(vehicle);
    setShowEditModal(true);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Search Input Bar */}
      <ModuleErrorBoundary moduleName="شريط بحث غيار الزيت" colors={colors}>
        <View
          style={[
            styles.searchArea,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                borderColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={[
                styles.searchInput,
                { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
              ]}
              placeholder="بحث برقم الدباب أو رقم المفتاح..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ModuleErrorBoundary>

      {/* Motorcycles List */}
      <ModuleErrorBoundary moduleName="قائمة الدبابات وغيار الزيت" colors={colors} onReset={onRefresh}>
        <FlatList
          data={displayedVehicles}
          keyExtractor={(item, index) => item.id || String(index)}
          renderItem={({ item }) => (
            <ModuleErrorBoundary moduleName={`كرت دباب ${item.plate_number || ''}`} colors={colors}>
              <FleetOilCard
                vehicle={item}
                driverByPlate={driverByPlate}
                driverByKey={driverByKey}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                isDispensing={dispensingVehicleId === item.id}
                onOpenEdit={handleOpenEditModal}
                onDirectDispense={handleDirectDispense}
              />
            </ModuleErrorBoundary>
          )}
          contentContainerStyle={[
            styles.listContent,
            displayedVehicles.length === 0 && styles.listContentEmpty,
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
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' },
                ]}
              >
                <Ionicons name="bicycle-outline" size={44} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {searchQuery ? 'لا توجد نتائج مطابقة' : 'لا توجد دبابات مسجلة'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery
                  ? 'تأكد من كتابة رقم اللوحة أو المفتاح بشكل صحيح'
                  : 'لم يتم العثور على دبابات في هذا الفرع'}
              </Text>
            </View>
          }
        />
      </ModuleErrorBoundary>

      {/* Edit Last Oil Change Modal */}
      <ModuleErrorBoundary
        moduleName="نافذة تعديل غيار الزيت"
        colors={colors}
        onReset={() => setShowEditModal(false)}
      >
        <FleetOilEditModal
          visible={showEditModal}
          vehicle={selectedVehicle}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onClose={() => setShowEditModal(false)}
          onSaved={onRefresh}
        />
      </ModuleErrorBoundary>
    </View>
  );
};
