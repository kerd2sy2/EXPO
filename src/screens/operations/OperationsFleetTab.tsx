import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents, toEnglishDigits } from '@shared/utils/plateUtils';
import { operationsStyles as styles } from './operationsStyles';
import { EnrichedVehicleItem } from './operationsHelpers';

interface OperationsFleetTabProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  mode: 'all' | 'oil' | 'add-vehicle' | 'accidents';
  newPlate: string;
  newModel: string;
  newKm: string;
  submitting: boolean;
  totalCount: number;
  activeCount: number;
  maintenanceCount: number;
  fleetSearchQuery: string;
  filteredVehicles: EnrichedVehicleItem[];
  updatingVehicleId: string | null;
  onChangeNewPlate: (val: string) => void;
  onChangeNewModel: (val: string) => void;
  onChangeNewKm: (val: string) => void;
  onCreateVehicle: () => void;
  onChangeFleetSearch: (val: string) => void;
  onToggleVehicleStatus: (v: EnrichedVehicleItem) => void;
  onQuickDispense: (v: EnrichedVehicleItem) => void;
}

export const OperationsFleetTab: React.FC<OperationsFleetTabProps> = ({
  colors,
  isDarkMode,
  isRTL,
  mode,
  newPlate,
  newModel,
  newKm,
  submitting,
  totalCount,
  activeCount,
  maintenanceCount,
  fleetSearchQuery,
  filteredVehicles,
  updatingVehicleId,
  onChangeNewPlate,
  onChangeNewModel,
  onChangeNewKm,
  onCreateVehicle,
  onChangeFleetSearch,
  onToggleVehicleStatus,
  onQuickDispense,
}) => (
  <View style={styles.tabContent}>
    {mode === 'add-vehicle' && (
      <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 14 }]}>
        <View style={[styles.kpiHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.iconCircle, { backgroundColor: '#10B98115' }]}>
            <Ionicons name="add-circle" size={24} color="#10B981" />
          </View>
          <View style={[styles.kpiTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.kpiTitle, { color: colors.textPrimary }]}>إضافة وتوثيق دباب جديد بالأسطول</Text>
            <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
              سجل بيانات الدباب الجديد ليتم ربطه تلقائياً بالفرع
            </Text>
          </View>
        </View>

        <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>رقم اللوحة *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
          placeholder="مثال: 8022 ب ع"
          placeholderTextColor={colors.textSecondary}
          value={newPlate}
          onChangeText={onChangeNewPlate}
        />

        {newPlate.trim().length > 0 && (() => {
          const parsed = parsePlateComponents(newPlate);
          return (
            <View style={{ alignItems: 'center', marginVertical: 4 }}>
              <SaudiPlateView
                digits={parsed.digits}
                letters={parsed.letters}
                editable={false}
                scale={0.5}
                isDarkMode={isDarkMode}
              />
            </View>
          );
        })()}

        <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>الموديل والنوع</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
          value={newModel}
          onChangeText={onChangeNewModel}
        />

        <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>قراءة العداد الابتدائية (كم)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: 'center' }]}
          keyboardType="numeric"
          value={newKm}
          onChangeText={(v) => onChangeNewKm(toEnglishDigits(v))}
        />

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 10 }]}
          onPress={onCreateVehicle}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>تسجيل وحفظ الدباب بالأسطول</Text>}
        </TouchableOpacity>
      </View>
    )}

    {/* Fleet Summary Card */}
    <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.fleetStatsRow}>
        <View style={styles.fleetStatCol}>
          <Text style={[styles.fleetStatNum, { color: colors.textPrimary }]}>{totalCount}</Text>
          <Text style={[styles.fleetStatLbl, { color: colors.textSecondary }]}>إجمالي الدبابات</Text>
        </View>
        <View style={styles.fleetStatCol}>
          <Text style={[styles.fleetStatNum, { color: '#10B981' }]}>{activeCount}</Text>
          <Text style={[styles.fleetStatLbl, { color: colors.textSecondary }]}>جاهز بالخدمة</Text>
        </View>
        <View style={styles.fleetStatCol}>
          <Text style={[styles.fleetStatNum, { color: '#F59E0B' }]}>{maintenanceCount}</Text>
          <Text style={[styles.fleetStatLbl, { color: colors.textSecondary }]}>في الصيانة</Text>
        </View>
      </View>
    </View>

    {/* Fleet Search Bar */}
    <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Ionicons name="search" size={18} color={colors.textSecondary} />
      <TextInput
        style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
        placeholder="ابحث برقم اللوحة، رقم المفتاح، أو اسم المندوب..."
        placeholderTextColor={colors.textSecondary}
        value={fleetSearchQuery}
        onChangeText={onChangeFleetSearch}
      />
      {fleetSearchQuery.length > 0 && (
        <TouchableOpacity onPress={() => onChangeFleetSearch('')}>
          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>

    {/* Vehicle List */}
    {filteredVehicles.map((v) => {
      const plate = parsePlateComponents(v.plate_number || '');
      const isActive = v.status === 'ACTIVE';
      const isUpdating = updatingVehicleId === v.id;

      return (
        <View key={v.id} style={[styles.fleetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.fleetCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 4 }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}>
                  {v.plate_number}
                </Text>
                {!!v.key_number && (
                  <View style={styles.keyMiniBadge}>
                    <Text style={styles.keyMiniBadgeText}>مفتاح {v.key_number}</Text>
                  </View>
                )}
              </View>
              {!!v.courierName && (
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  المندوب: {v.courierName}
                </Text>
              )}
              <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '700' }}>
                العداد: {v.current_km || 0} كم
              </Text>
            </View>

            <SaudiPlateView
              digits={plate.digits}
              letters={plate.letters}
              editable={false}
              scale={0.44}
              isDarkMode={isDarkMode}
            />
          </View>

          <View style={[styles.fleetActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[
                styles.fleetActionBtn,
                {
                  backgroundColor: isActive ? '#F59E0B15' : '#10B98115',
                  borderColor: isActive ? '#F59E0B' : '#10B981',
                },
              ]}
              onPress={() => onToggleVehicleStatus(v)}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={isActive ? '#F59E0B' : '#10B981'} />
              ) : (
                <>
                  <Ionicons
                    name={isActive ? 'build-outline' : 'checkmark-circle-outline'}
                    size={16}
                    color={isActive ? '#F59E0B' : '#10B981'}
                  />
                  <Text style={[styles.fleetActionBtnText, { color: isActive ? '#F59E0B' : '#10B981' }]}>
                    {isActive ? 'إحالة للصيانة' : 'تنشيط للخدمة'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.fleetActionBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
              onPress={() => onQuickDispense(v)}
            >
              <Ionicons name="water-outline" size={16} color={colors.primary} />
              <Text style={[styles.fleetActionBtnText, { color: colors.primary }]}>صرف زيت</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    })}
  </View>
);
