import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents, toEnglishDigits } from '@shared/utils/plateUtils';
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

type OperationsTab = 'oil' | 'fleet' | 'accidents';

interface EnrichedVehicleItem extends VehicleItem {
  courierName?: string;
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

  // Merge Fleet Vehicles + Employee-assigned Motorcycles so NO bike is ever missing from autocomplete
  const allSearchableBikes: EnrichedVehicleItem[] = useMemo(() => {
    const map = new Map<string, EnrichedVehicleItem>();

    vehicles.forEach((v) => {
      if (!v.plate_number || !v.plate_number.trim()) return;
      const normKey = toEnglishDigits(v.plate_number).replace(/\s+/g, '').toLowerCase();
      map.set(normKey, { ...v });
    });

    employees.forEach((emp) => {
      const plate = (emp.active_motorcycle || emp.motorcycle_number || '').trim();
      if (!plate) return;
      const normKey = toEnglishDigits(plate).replace(/\s+/g, '').toLowerCase();
      const existing = map.get(normKey);
      if (existing) {
        if (!existing.key_number && emp.key_number) existing.key_number = emp.key_number;
        if (!existing.courierName && emp.name) existing.courierName = emp.name;
        if (!existing.current_km && emp.start_km) existing.current_km = emp.start_km;
      } else {
        map.set(normKey, {
          id: `emp-bike-${emp.id}`,
          plate_number: plate,
          key_number: emp.key_number || '',
          model: 'دباب توصيل',
          status: 'ACTIVE',
          current_km: emp.start_km || 0,
          courierName: emp.name || '',
        });
      }
    });

    return Array.from(map.values());
  }, [vehicles, employees]);

  // Helper to filter bikes when user types >= 2 digits/characters (Arabic or English)
  const filterBikesByQuery = (rawQuery: string): EnrichedVehicleItem[] => {
    const normalizedQuery = toEnglishDigits(rawQuery.trim()).toLowerCase();
    // Require at least 2 characters/digits so dropdown is accurate and responsive
    const queryDigitsOnly = normalizedQuery.replace(/\D/g, '');
    if (queryDigitsOnly.length < 2 && normalizedQuery.length < 2) {
      return [];
    }

    return allSearchableBikes.filter((v) => {
      const plateNorm = toEnglishDigits(v.plate_number || '').toLowerCase();
      const plateDigits = plateNorm.replace(/\D/g, '');
      const keyNorm = toEnglishDigits(v.key_number || '').toLowerCase();
      const courierNorm = (v.courierName || '').toLowerCase();

      if (queryDigitsOnly.length >= 2 && plateDigits.includes(queryDigitsOnly)) {
        return true;
      }
      if (keyNorm && keyNorm === queryDigitsOnly) {
        return true;
      }
      return plateNorm.includes(normalizedQuery) || courierNorm.includes(normalizedQuery);
    });
  };

  const matchingDispenseVehicles = useMemo(
    () => filterBikesByQuery(dispensePlate),
    [dispensePlate, allSearchableBikes]
  );

  // Add Vehicle State
  const [addVehicleModalVisible, setAddVehicleModalVisible] = useState(false);
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('دباب توصيل سوزوكي');
  const [newVin, setNewVin] = useState('');
  const [newKm, setNewKm] = useState('0');

  // Accident Report State
  const [accidentDelName, setAccidentDelName] = useState('');
  const [accidentPlate, setAccidentPlate] = useState('');
  const [accidentDesc, setAccidentDesc] = useState('');
  const [accidentSeverity, setAccidentSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [showAccidentDropdown, setShowAccidentDropdown] = useState(false);

  const matchingAccidentVehicles = useMemo(
    () => filterBikesByQuery(accidentPlate),
    [accidentPlate, allSearchableBikes]
  );

  // Select bike from dropdown and auto-fetch latest KM if needed
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
  const [fleetStatusFilter, setFleetStatusFilter] = useState<'ALL' | 'ACTIVE' | 'MAINTENANCE'>('ALL');
  const [updatingVehicleId, setUpdatingVehicleId] = useState<string | null>(null);

  // Filtered Vehicles
  const filteredVehicles = useMemo(() => {
    return allSearchableBikes.filter((v) => {
      if (fleetStatusFilter === 'ACTIVE' && v.status !== 'ACTIVE') return false;
      if (fleetStatusFilter === 'MAINTENANCE' && v.status !== 'MAINTENANCE') return false;

      if (fleetSearchQuery.trim()) {
        const q = toEnglishDigits(fleetSearchQuery.trim()).toLowerCase();
        const matchPlate = toEnglishDigits(v.plate_number || '').toLowerCase().includes(q);
        const matchKey = toEnglishDigits(v.key_number || '').toLowerCase().includes(q);
        const matchCourier = (v.courierName || '').toLowerCase().includes(q);
        return matchPlate || matchKey || matchCourier;
      }
      return true;
    });
  }, [allSearchableBikes, fleetStatusFilter, fleetSearchQuery]);

  // Toggle Vehicle Status
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

  // Quick Dispense Oil for specific vehicle
  const handleQuickDispense = (v: EnrichedVehicleItem) => {
    setDispensePlate(v.plate_number);
    setDispenseKm(String(v.current_km || ''));
    setDispenseNotes('صرف زيت دوري معتمد');
    setDispenseModalVisible(true);
  };

  // Submit Dispense Oil
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

  // Submit Create Vehicle
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
        vin: newVin.trim(),
        initialKm: Number(toEnglishDigits(newKm)) || 0,
      };
      await operationsApi.createVehicle(params);
      const savedPlate = newPlate.trim();
      setAddVehicleModalVisible(false);
      setNewPlate('');
      setNewVin('');
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

  // Submit Accident Report
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

  const oilItems = inventoryItems.filter(
    (item) =>
      item.type === 'oil' ||
      item.category === 'OIL' ||
      item.name.includes('زيت') ||
      item.name.toLowerCase().includes('oil')
  );

  const totalOilQty =
    oilItems.length > 0
      ? oilItems.reduce((acc, itm) => acc + (itm.branch_quantity ?? itm.quantity ?? 0), 0)
      : inventoryItems[0]
      ? inventoryItems[0].branch_quantity ?? inventoryItems[0].quantity ?? 0
      : 0;

  const oilItem = oilItems[0] || inventoryItems[0];
  const isOilLow = totalOilQty <= (oilItem?.min_alert || oilItem?.min_limit || 5);

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
        {/* 1. OIL & WAREHOUSE TAB */}
        {activeTab === 'oil' && (
          <View style={styles.tabContent}>
            <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.kpiHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.iconCircle, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="water" size={24} color={colors.primary} />
                </View>
                <View style={[styles.kpiTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.kpiTitle, { color: colors.textPrimary }]}>
                    صرف وتغيير زيت الدباب
                  </Text>
                  <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                    اكتب رقمين من اللوحة لتظهر لك قائمة الدبابات وتختار منها مباشرة
                  </Text>
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                رقم لوحة الدباب (اكتب رقمين للبحث التلقائي) *
              </Text>
              <View style={[styles.inputWithClear, { backgroundColor: colors.bg, borderColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="search-outline" size={18} color={colors.primary} />
                <TextInput
                  style={[styles.flexInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="اكتب رقمين من اللوحة (مثال: 54 أو 70)..."
                  placeholderTextColor={colors.textSecondary}
                  value={dispensePlate}
                  onChangeText={(txt) => {
                    setDispensePlate(txt);
                    setShowDispenseDropdown(true);
                  }}
                  onFocus={() => setShowDispenseDropdown(true)}
                />
                {dispensePlate.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setDispensePlate('');
                      setShowDispenseDropdown(false);
                    }}
                  >
                    <Ionicons name="close-circle" size={19} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Interactive Dropdown List when >= 2 digits typed */}
              {showDispenseDropdown && matchingDispenseVehicles.length > 0 && (
                <View style={[styles.autocompleteBox, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                  <Text style={[styles.autocompleteHeader, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                    الدبابات المطابقة ({matchingDispenseVehicles.length}) — اضغط للاختيار:
                  </Text>
                  <ScrollView style={{ maxHeight: 220 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                    {matchingDispenseVehicles.slice(0, 12).map((v) => (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.autocompleteItem,
                          {
                            borderBottomColor: colors.border,
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          },
                        ]}
                        onPress={() => handleSelectBikeForOil(v)}
                      >
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                          <View style={[styles.bikeIconMini, { backgroundColor: colors.primary + '15' }]}>
                            <Ionicons name="bicycle" size={16} color={colors.primary} />
                          </View>
                          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
                            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={[styles.autocompletePlate, { color: colors.textPrimary }]}>
                                {v.plate_number}
                              </Text>
                              {!!v.key_number && (
                                <View style={styles.keyMiniBadge}>
                                  <Text style={styles.keyMiniBadgeText}>مفتاح {v.key_number}</Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.autocompleteKm, { color: colors.textSecondary }]} numberOfLines={1}>
                              {v.courierName ? `المندوب: ${v.courierName} • ` : ''}
                              العداد: {v.current_km || 0} كم
                            </Text>
                          </View>
                        </View>
                        <Ionicons name="add-circle" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Compact Plate Preview once selected */}
              {dispensePlate.trim().length > 0 && !showDispenseDropdown && (() => {
                const parsed = parsePlateComponents(dispensePlate);
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

              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', gap: 10 }}>
                <View style={{ flex: 1.3 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    قراءة العداد الحالية (كم) *
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: 'center', fontWeight: '800' }]}
                    keyboardType="numeric"
                    placeholder="مثال: 45200"
                    placeholderTextColor={colors.textSecondary}
                    value={dispenseKm}
                    onChangeText={(v) => setDispenseKm(toEnglishDigits(v))}
                  />
                </View>

                <View style={{ flex: 0.7 }}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    عدد العلب
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: 'center', fontWeight: '800' }]}
                    keyboardType="numeric"
                    value={dispenseQty}
                    onChangeText={(v) => setDispenseQty(toEnglishDigits(v))}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                ملاحظات (اختياري)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder="ملاحظات إضافية..."
                placeholderTextColor={colors.textSecondary}
                value={dispenseNotes}
                onChangeText={setDispenseNotes}
              />

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
                onPress={handleDispenseOil}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                    <Text style={styles.actionBtnText}>تأكيد تغيير وصرف الزيت</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Oil Stock KPI Card */}
            <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: isOilLow ? '#EF4444' : colors.border }]}>
              <View style={[styles.kpiHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.iconCircle, { backgroundColor: isOilLow ? '#EF444415' : colors.primary + '15' }]}>
                  <Ionicons name="color-fill" size={24} color={isOilLow ? '#EF4444' : colors.primary} />
                </View>
                <View style={[styles.kpiTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.kpiTitle, { color: colors.textPrimary }]}>مخزون زيت المحركات بالفرع</Text>
                  <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                    {oilItem?.name || 'عبوات زيت المحرك المعتمدة'}
                  </Text>
                </View>
              </View>

              <View style={[styles.qtyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.qtyNumber, { color: isOilLow ? '#EF4444' : colors.textPrimary }]}>
                  {totalOilQty}
                </Text>
                <Text style={[styles.qtyUnit, { color: colors.textSecondary }]}>علبة متوفرة</Text>
                {isOilLow && (
                  <View style={styles.lowStockBadge}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text style={styles.lowStockText}>مخزون منخفض</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* 2. FLEET MANAGEMENT TAB */}
        {activeTab === 'fleet' && (
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
                  onChangeText={setNewPlate}
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
                  onChangeText={setNewModel}
                />

                <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>قراءة العداد الابتدائية (كم)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: 'center' }]}
                  keyboardType="numeric"
                  value={newKm}
                  onChangeText={(v) => setNewKm(toEnglishDigits(v))}
                />

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 10 }]}
                  onPress={handleCreateVehicle}
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
                  <Text style={[styles.fleetStatNum, { color: colors.textPrimary }]}>{allSearchableBikes.length}</Text>
                  <Text style={[styles.fleetStatLbl, { color: colors.textSecondary }]}>إجمالي الدبابات</Text>
                </View>
                <View style={styles.fleetStatCol}>
                  <Text style={[styles.fleetStatNum, { color: '#10B981' }]}>{activeVehiclesCount}</Text>
                  <Text style={[styles.fleetStatLbl, { color: colors.textSecondary }]}>جاهز بالخدمة</Text>
                </View>
                <View style={styles.fleetStatCol}>
                  <Text style={[styles.fleetStatNum, { color: '#F59E0B' }]}>{maintenanceVehiclesCount}</Text>
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
                onChangeText={setFleetSearchQuery}
              />
              {fleetSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setFleetSearchQuery('')}>
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
                      onPress={() => handleToggleVehicleStatus(v)}
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
                      onPress={() => handleQuickDispense(v)}
                    >
                      <Ionicons name="water-outline" size={16} color={colors.primary} />
                      <Text style={[styles.fleetActionBtnText, { color: colors.primary }]}>صرف زيت</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* 3. ACCIDENTS TAB */}
        {activeTab === 'accidents' && (
          <View style={styles.tabContent}>
            <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: '#EF444450' }]}>
              <View style={[styles.kpiHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.iconCircle, { backgroundColor: '#EF444415' }]}>
                  <Ionicons name="warning" size={24} color="#EF4444" />
                </View>
                <View style={[styles.kpiTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.kpiTitle, { color: colors.textPrimary }]}>تسجيل بلاغ حادث أو عطل طارئ</Text>
                  <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                    اكتب رقمين من اللوحة لاختيار الدباب مباشرة
                  </Text>
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>رقم لوحة الدباب المتضرر *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder="اكتب رقمين من اللوحة..."
                placeholderTextColor={colors.textSecondary}
                value={accidentPlate}
                onChangeText={(txt) => {
                  setAccidentPlate(txt);
                  setShowAccidentDropdown(true);
                }}
                onFocus={() => setShowAccidentDropdown(true)}
              />

              {showAccidentDropdown && matchingAccidentVehicles.length > 0 && (
                <View style={[styles.autocompleteBox, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                  <Text style={[styles.autocompleteHeader, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                    الدبابات المطابقة (اضغط للاختيار):
                  </Text>
                  {matchingAccidentVehicles.slice(0, 6).map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.autocompleteItem, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      onPress={() => {
                        setAccidentPlate(v.plate_number);
                        if (v.courierName && !accidentDelName) {
                          setAccidentDelName(v.courierName);
                        }
                        setShowAccidentDropdown(false);
                      }}
                    >
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name="bicycle" size={16} color={colors.primary} />
                        <Text style={[styles.autocompletePlate, { color: colors.textPrimary }]}>{v.plate_number}</Text>
                        {!!v.key_number && (
                          <View style={styles.keyMiniBadge}>
                            <Text style={styles.keyMiniBadgeText}>مفتاح {v.key_number}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.autocompleteKm, { color: colors.textSecondary }]}>
                        {v.courierName || 'دباب'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>اسم المندوب المعني</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder="اسم المندوب..."
                placeholderTextColor={colors.textSecondary}
                value={accidentDelName}
                onChangeText={setAccidentDelName}
              />

              <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>درجة خطورة الحادث</Text>
              <View style={[styles.severityRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {(['LOW', 'MEDIUM', 'HIGH'] as const).map((lvl) => (
                  <TouchableOpacity
                    key={lvl}
                    style={[
                      styles.severityBtn,
                      accidentSeverity === lvl && [
                        styles.severityBtnActive,
                        {
                          backgroundColor:
                            lvl === 'HIGH' ? '#EF4444' : lvl === 'MEDIUM' ? '#F59E0B' : '#10B981',
                        },
                      ],
                    ]}
                    onPress={() => setAccidentSeverity(lvl)}
                  >
                    <Text
                      style={[
                        styles.severityBtnText,
                        { color: accidentSeverity === lvl ? '#fff' : colors.textSecondary },
                      ]}
                    >
                      {lvl === 'HIGH' ? 'خطير وطارئ' : lvl === 'MEDIUM' ? 'متوسط' : 'طفيف'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>تفاصيل الحادث والأضرار *</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                multiline
                numberOfLines={3}
                placeholder="اكتب وصف الأضرار، سبب الحادث، وموقع الواقعة..."
                placeholderTextColor={colors.textSecondary}
                value={accidentDesc}
                onChangeText={setAccidentDesc}
              />

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#EF4444', marginTop: 10 }]}
                onPress={handleSubmitAccident}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>إرسال البلاغ الفوري للورشة</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* DISPENSE OIL MODAL */}
      <Modal visible={dispenseModalVisible} transparent animationType="slide" onRequestClose={() => setDispenseModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>صرف زيت لدباب</Text>
              <TouchableOpacity onPress={() => setDispenseModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>رقم لوحة الدباب *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder="اكتب رقمين من اللوحة..."
                placeholderTextColor={colors.textSecondary}
                value={dispensePlate}
                onChangeText={(txt) => {
                  setDispensePlate(txt);
                  setShowDispenseDropdown(true);
                }}
              />

              {showDispenseDropdown && matchingDispenseVehicles.length > 0 && (
                <View style={[styles.autocompleteBox, { backgroundColor: colors.card, borderColor: colors.primary }]}>
                  {matchingDispenseVehicles.slice(0, 6).map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[styles.autocompleteItem, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      onPress={() => handleSelectBikeForOil(v)}
                    >
                      <Text style={[styles.autocompletePlate, { color: colors.textPrimary }]}>{v.plate_number}</Text>
                      <Text style={[styles.autocompleteKm, { color: colors.textSecondary }]}>
                        {v.key_number ? `مفتاح ${v.key_number} • ` : ''}{v.current_km || 0} كم
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.inputLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>قراءة العداد الحالية (كم) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, textAlign: 'center' }]}
                keyboardType="numeric"
                placeholder="مثال: 45200"
                placeholderTextColor={colors.textSecondary}
                value={dispenseKm}
                onChangeText={(v) => setDispenseKm(toEnglishDigits(v))}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
              onPress={handleDispenseOil}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>تأكيد صرف الزيت</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegment: {},
  segmentText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 14,
  },
  kpiCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  kpiHeader: {
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiTextGroup: {
    flex: 1,
    gap: 2,
  },
  kpiTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  kpiSub: {
    fontSize: 12,
  },
  qtyRow: {
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  qtyNumber: {
    fontSize: 30,
    fontWeight: '900',
  },
  qtyUnit: {
    fontSize: 14,
    fontWeight: '600',
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF444415',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  lowStockText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  fleetStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 4,
  },
  fleetStatCol: {
    alignItems: 'center',
    gap: 2,
  },
  fleetStatNum: {
    fontSize: 22,
    fontWeight: '900',
  },
  fleetStatLbl: {
    fontSize: 11,
  },
  searchBox: {
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  fleetCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  fleetCardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  fleetActionsRow: {
    alignItems: 'center',
    gap: 10,
  },
  fleetActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  fleetActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  inputWithClear: {
    borderWidth: 1.5,
    borderRadius: 11,
    paddingHorizontal: 12,
    height: 46,
    alignItems: 'center',
    gap: 8,
  },
  flexInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    height: '100%',
  },
  input: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    height: 70,
    textAlignVertical: 'top',
  },
  severityRow: {
    gap: 8,
  },
  severityBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6B728030',
    alignItems: 'center',
  },
  severityBtnActive: {
    borderColor: 'transparent',
  },
  severityBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    gap: 10,
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  autocompleteBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 2,
    marginBottom: 6,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  autocompleteHeader: {
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  autocompleteItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  bikeIconMini: {
    width: 32,
    height: 32,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  autocompletePlate: {
    fontSize: 14,
    fontWeight: '800',
  },
  keyMiniBadge: {
    backgroundColor: '#f59e0b20',
    borderColor: '#f59e0b60',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  keyMiniBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#d97706',
  },
  autocompleteKm: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
