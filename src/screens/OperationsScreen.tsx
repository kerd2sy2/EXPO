import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { ThemeColors } from '@shared/theme';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import {
  InventoryItem,
  VehicleItem,
  operationsApi,
  DispenseOilParams,
  CreateVehicleParams,
  ReportAccidentParams,
} from '../services/operations';
import { DelegateWithStatus } from '../services/supervisor';
import { workApi } from '../services/work';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { operationsStyles as styles } from './operations/operationsStyles';
import {
  OperationsTab,
  EnrichedVehicleItem,
  buildSearchableBikes,
  filterBikesByQuery,
  filterFleetVehicles,
  computeOilSummary,
} from './operations/operationsHelpers';
import { OperationsOilTab } from './operations/OperationsOilTab';
import { OperationsFleetTab } from './operations/OperationsFleetTab';
import { OperationsAccidentsTab } from './operations/OperationsAccidentsTab';
import { DispenseOilModal } from './operations/DispenseOilModal';

export interface OperationsScreenProps {
  inventoryItems: InventoryItem[];
  vehicles: VehicleItem[];
  employees?: DelegateWithStatus[];
  loading: boolean;
  onRefresh: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  mode?: 'all' | 'oil' | 'add-vehicle' | 'accidents';
}

export const OperationsScreen: React.FC<OperationsScreenProps> = React.memo(({
  inventoryItems,
  vehicles,
  employees = [],
  loading,
  onRefresh,
  colors,
  isDarkMode,
  isRTL,
  mode = 'all',
}) => {
  const [activeTab, setActiveTab] = useState<OperationsTab>(
    mode === 'add-vehicle' ? 'fleet' : mode === 'accidents' ? 'accidents' : 'oil'
  );
  const [submitting, setSubmitting] = useState(false);

  // Dispense Oil State
  const [dispenseModalVisible, setDispenseModalVisible] = useState(false);
  const [dispensePlate, setDispensePlate] = useState('');
  const [dispenseKm, setDispenseKm] = useState('');
  const [dispenseQty, setDispenseQty] = useState('1');
  const [dispenseNotes, setDispenseNotes] = useState('');
  const [showDispenseDropdown, setShowDispenseDropdown] = useState(false);

  const allSearchableBikes = useMemo(
    () => buildSearchableBikes(vehicles, employees),
    [vehicles, employees]
  );

  const matchingDispenseVehicles = useMemo(
    () => filterBikesByQuery(allSearchableBikes, dispensePlate),
    [dispensePlate, allSearchableBikes]
  );

  // Add Vehicle State
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('دباب توصيل سوزوكي');
  const [newKm, setNewKm] = useState('0');

  // Accident Report State
  const [accidentDelName, setAccidentDelName] = useState('');
  const [accidentPlate, setAccidentPlate] = useState('');
  const [accidentDesc, setAccidentDesc] = useState('');
  const [accidentSeverity, setAccidentSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [showAccidentDropdown, setShowAccidentDropdown] = useState(false);

  const matchingAccidentVehicles = useMemo(
    () => filterBikesByQuery(allSearchableBikes, accidentPlate),
    [accidentPlate, allSearchableBikes]
  );

  const handleSelectBikeForOil = async (bike: EnrichedVehicleItem) => {
    setDispensePlate(bike.plate_number);
    setShowDispenseDropdown(false);
    if (bike.current_km && bike.current_km > 0) {
      setDispenseKm(String(bike.current_km));
    } else {
      try {
        const res = await workApi.getLastKM('', bike.plate_number);
        if (res && res.last_end_km > 0) {
          setDispenseKm(String(res.last_end_km));
        }
      } catch {}
    }
  };

  // Fleet Search & Filter State
  const [fleetSearchQuery, setFleetSearchQuery] = useState('');
  const [fleetStatusFilter] = useState<'ALL' | 'ACTIVE' | 'MAINTENANCE'>('ALL');
  const [updatingVehicleId, setUpdatingVehicleId] = useState<string | null>(null);

  const filteredVehicles = useMemo(
    () => filterFleetVehicles(allSearchableBikes, fleetStatusFilter, fleetSearchQuery),
    [allSearchableBikes, fleetStatusFilter, fleetSearchQuery]
  );

  const handleToggleVehicleStatus = async (v: VehicleItem) => {
    if (String(v.id).startsWith('emp-bike-')) {
      showBottomAlert({
        type: 'warning',
        title: 'تنبيه',
        message: 'هذا الدباب مسجل في ملف الموظف فقط، يمكنك إضافته رسمياً للأسطول أولاً.',
      });
      return;
    }
    const nextStatus = v.status === 'ACTIVE' ? 'MAINTENANCE' : 'ACTIVE';
    try {
      setUpdatingVehicleId(v.id);
      await operationsApi.updateVehicleStatus(v.id, nextStatus);
      onRefresh();
      showBottomAlert({
        type: 'success',
        title: 'تم تحديث الحالة',
        message:
          nextStatus === 'ACTIVE'
            ? 'تم تنشيط الدباب وجعله جاهزاً بالخدمة.'
            : 'تمت إحالة الدباب إلى مركز الصيانة.',
      });
    } catch (err: any) {
      showBottomAlert({
        type: 'error',
        title: 'خطأ',
        message: err?.message || 'فشل تحديث حالة الدباب.',
      });
    } finally {
      setUpdatingVehicleId(null);
    }
  };

  const handleQuickDispense = (v: EnrichedVehicleItem) => {
    setDispensePlate(v.plate_number);
    setDispenseKm(String(v.current_km || ''));
    setDispenseNotes('صرف زيت دوري معتمد');
    setDispenseModalVisible(true);
  };

  const { oilItem, totalOilQty, isOilLow } = useMemo(
    () => computeOilSummary(inventoryItems),
    [inventoryItems]
  );

  const handleDispenseOil = async () => {
    if (!dispensePlate.trim()) {
      showBottomAlert({
        type: 'warning',
        title: 'بيانات مطلوبة',
        message: 'يرجى كتابة رقمين من اللوحة واختيار الدباب من القائمة المنسدلة.',
      });
      return;
    }
    const kmVal = Number(toEnglishDigits(dispenseKm));
    if (isNaN(kmVal) || kmVal <= 0) {
      showBottomAlert({
        type: 'warning',
        title: 'قراءة العداد مطلوبة',
        message: 'يرجى إدخال قراءة عداد الدباب الحالية (كم) بشكل صحيح.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const params: DispenseOilParams = {
        motorcycleNumber: dispensePlate.trim(),
        currentKm: kmVal,
        oilItemId: oilItem?.id,
        quantity: Number(toEnglishDigits(dispenseQty)) || 1,
        notes: dispenseNotes.trim(),
      };
      await operationsApi.dispenseOil(params);
      const savedPlate = dispensePlate.trim();
      setDispenseModalVisible(false);
      setDispensePlate('');
      setDispenseKm('');
      setDispenseNotes('');
      setShowDispenseDropdown(false);
      onRefresh();
      setTimeout(() => {
        showBottomAlert({
          type: 'success',
          title: 'تم صرف الزيت بنجاح',
          message: `تم تسجيل غيار الزيت وتحديث عداد الدباب (${savedPlate}) عند ${kmVal} كم.`,
        });
      }, 150);
    } catch (err: any) {
      showBottomAlert({
        type: 'error',
        title: 'فشل صرف الزيت',
        message: err?.message || 'تعذر إتمام عملية صرف الزيت، يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVehicle = async () => {
    if (!newPlate.trim()) {
      showBottomAlert({
        type: 'warning',
        title: 'تنبيه',
        message: 'يرجى إدخال رقم لوحة الدباب الجديد.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const params: CreateVehicleParams = {
        plateNumber: newPlate.trim(),
        model: newModel.trim(),
        vin: '',
        initialKm: Number(toEnglishDigits(newKm)) || 0,
      };
      await operationsApi.createVehicle(params);
      const savedPlate = newPlate.trim();
      setNewPlate('');
      setNewKm('0');
      onRefresh();
      setTimeout(() => {
        showBottomAlert({
          type: 'success',
          title: 'تمت الإضافة بنجاح',
          message: `تم تسجيل الدباب الجديد (${savedPlate}) في أسطول الفرع.`,
        });
      }, 150);
    } catch (err: any) {
      showBottomAlert({
        type: 'error',
        title: 'خطأ في الإضافة',
        message: err?.message || 'فشل تسجيل الدباب الجديد.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAccident = async () => {
    if (!accidentPlate.trim() || !accidentDesc.trim()) {
      showBottomAlert({
        type: 'warning',
        title: 'بيانات ناقصة',
        message: 'يرجى اختيار رقم لوحة الدباب وكتابة تفاصيل الحادث.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const params: ReportAccidentParams = {
        employeeName: accidentDelName.trim(),
        motorcycleNumber: accidentPlate.trim(),
        description: accidentDesc.trim(),
        severity: accidentSeverity,
      };
      await operationsApi.reportAccident(params);
      setAccidentDelName('');
      setAccidentPlate('');
      setAccidentDesc('');
      setShowAccidentDropdown(false);
      onRefresh();
      showBottomAlert({
        type: 'success',
        title: 'تم إرسال البلاغ',
        message: 'تم تسجيل بلاغ الحادث وإحالته كطلب صيانة طارئ للورشة.',
      });
    } catch (err: any) {
      showBottomAlert({
        type: 'error',
        title: 'فشل الإرسال',
        message: err?.message || 'فشل تسجيل بلاغ الحادث.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const activeVehiclesCount = allSearchableBikes.filter((v) => v.status === 'ACTIVE').length;
  const maintenanceVehiclesCount = allSearchableBikes.filter((v) => v.status === 'MAINTENANCE').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {mode === 'all' && (
        <View style={[styles.segmentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'oil' && [styles.activeSegment, { backgroundColor: colors.primary }]]}
            onPress={() => setActiveTab('oil')}
          >
            <Text style={[styles.segmentText, { color: activeTab === 'oil' ? '#fff' : colors.textSecondary }]}>
              تغيير الزيت والمخزن
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'fleet' && [styles.activeSegment, { backgroundColor: colors.primary }]]}
            onPress={() => setActiveTab('fleet')}
          >
            <Text style={[styles.segmentText, { color: activeTab === 'fleet' ? '#fff' : colors.textSecondary }]}>
              الأسطول ({allSearchableBikes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === 'accidents' && [styles.activeSegment, { backgroundColor: colors.primary }]]}
            onPress={() => setActiveTab('accidents')}
          >
            <Text style={[styles.segmentText, { color: activeTab === 'accidents' ? '#fff' : colors.textSecondary }]}>
              بلاغ حادث طارئ
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {activeTab === 'oil' && (
          <ModuleErrorBoundary moduleName="صرف الزيت والمخزون" colors={colors} onReset={onRefresh}>
            <OperationsOilTab
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              dispensePlate={dispensePlate}
              dispenseKm={dispenseKm}
              dispenseQty={dispenseQty}
              dispenseNotes={dispenseNotes}
              showDispenseDropdown={showDispenseDropdown}
              matchingDispenseVehicles={matchingDispenseVehicles}
              submitting={submitting}
              totalOilQty={totalOilQty}
              oilItem={oilItem}
              isOilLow={isOilLow}
              onChangePlate={(txt) => {
                setDispensePlate(txt);
                setShowDispenseDropdown(true);
              }}
              onFocusPlate={() => setShowDispenseDropdown(true)}
              onClearPlate={() => {
                setDispensePlate('');
                setShowDispenseDropdown(false);
              }}
              onSelectBike={handleSelectBikeForOil}
              onChangeKm={setDispenseKm}
              onChangeQty={setDispenseQty}
              onChangeNotes={setDispenseNotes}
              onSubmitDispense={handleDispenseOil}
            />
          </ModuleErrorBoundary>
        )}

        {activeTab === 'fleet' && (
          <ModuleErrorBoundary moduleName="إدارة الأسطول والدبابات" colors={colors} onReset={onRefresh}>
            <OperationsFleetTab
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              mode={mode}
              newPlate={newPlate}
              newModel={newModel}
              newKm={newKm}
              submitting={submitting}
              totalCount={allSearchableBikes.length}
              activeCount={activeVehiclesCount}
              maintenanceCount={maintenanceVehiclesCount}
              fleetSearchQuery={fleetSearchQuery}
              filteredVehicles={filteredVehicles}
              updatingVehicleId={updatingVehicleId}
              onChangeNewPlate={setNewPlate}
              onChangeNewModel={setNewModel}
              onChangeNewKm={setNewKm}
              onCreateVehicle={handleCreateVehicle}
              onChangeFleetSearch={setFleetSearchQuery}
              onToggleVehicleStatus={handleToggleVehicleStatus}
              onQuickDispense={handleQuickDispense}
            />
          </ModuleErrorBoundary>
        )}

        {activeTab === 'accidents' && (
          <ModuleErrorBoundary moduleName="تسجيل بلاغات الحوادث" colors={colors} onReset={onRefresh}>
            <OperationsAccidentsTab
              colors={colors}
              isRTL={isRTL}
              accidentPlate={accidentPlate}
              accidentDelName={accidentDelName}
              accidentSeverity={accidentSeverity}
              accidentDesc={accidentDesc}
              showAccidentDropdown={showAccidentDropdown}
              matchingAccidentVehicles={matchingAccidentVehicles}
              submitting={submitting}
              onChangePlate={(txt) => {
                setAccidentPlate(txt);
                setShowAccidentDropdown(true);
              }}
              onFocusPlate={() => setShowAccidentDropdown(true)}
              onSelectBike={(v) => {
                setAccidentPlate(v.plate_number);
                if (v.courierName && !accidentDelName) {
                  setAccidentDelName(v.courierName);
                }
                setShowAccidentDropdown(false);
              }}
              onChangeDelName={setAccidentDelName}
              onChangeSeverity={setAccidentSeverity}
              onChangeDesc={setAccidentDesc}
              onSubmitAccident={handleSubmitAccident}
            />
          </ModuleErrorBoundary>
        )}
      </ScrollView>

      <ModuleErrorBoundary
        moduleName="نافذة صرف الزيت السريع"
        colors={colors}
        onReset={() => setDispenseModalVisible(false)}
      >
        <DispenseOilModal
          visible={dispenseModalVisible}
          colors={colors}
          isRTL={isRTL}
          dispensePlate={dispensePlate}
          dispenseKm={dispenseKm}
          showDispenseDropdown={showDispenseDropdown}
          matchingDispenseVehicles={matchingDispenseVehicles}
          submitting={submitting}
          onChangePlate={(txt) => {
            setDispensePlate(txt);
            setShowDispenseDropdown(true);
          }}
          onSelectBike={handleSelectBikeForOil}
          onChangeKm={setDispenseKm}
          onSubmit={handleDispenseOil}
          onClose={() => setDispenseModalVisible(false)}
        />
      </ModuleErrorBoundary>
    </View>
  );
});
