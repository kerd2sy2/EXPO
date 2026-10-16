import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents } from '@shared/utils/plateUtils';
import {
  InventoryItem,
  VehicleItem,
  operationsApi,
  DispenseOilParams,
  CreateVehicleParams,
  ReportAccidentParams,
} from '../services/operations';

interface OperationsScreenProps {
  inventoryItems: InventoryItem[];
  vehicles: VehicleItem[];
  loading: boolean;
  onRefresh: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

type OperationsTab = 'oil' | 'fleet' | 'accidents';

export const OperationsScreen: React.FC<OperationsScreenProps> = ({
  inventoryItems,
  vehicles,
  loading,
  onRefresh,
  colors,
  isDarkMode,
  isRTL,
}) => {
  const [activeTab, setActiveTab] = useState<OperationsTab>('oil');
  const [submitting, setSubmitting] = useState(false);

  // Dispense Oil Modal State
  const [dispenseModalVisible, setDispenseModalVisible] = useState(false);
  const [dispensePlate, setDispensePlate] = useState('');
  const [dispenseKm, setDispenseKm] = useState('');
  const [dispenseQty, setDispenseQty] = useState('1');
  const [dispenseNotes, setDispenseNotes] = useState('');

  // Add Vehicle Modal State
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

  // Submit Dispense Oil
  const handleDispenseOil = async () => {
    if (!dispensePlate.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم لوحة الدباب');
      return;
    }
    const kmVal = Number(dispenseKm);
    if (isNaN(kmVal) || kmVal <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال قراءة عداد صحيحة');
      return;
    }

    try {
      setSubmitting(true);
      const params: DispenseOilParams = {
        motorcycleNumber: dispensePlate.trim(),
        currentKm: kmVal,
        quantity: Number(dispenseQty) || 1,
        notes: dispenseNotes.trim(),
      };
      await operationsApi.dispenseOil(params);
      Alert.alert('تم بنجاح', `تم صرف الزيت وتحديث عداد الدباب ${dispensePlate}`);
      setDispenseModalVisible(false);
      setDispensePlate('');
      setDispenseKm('');
      setDispenseNotes('');
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشلت عملية صرف الزيت');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Create Vehicle
  const handleCreateVehicle = async () => {
    if (!newPlate.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال رقم اللوحة');
      return;
    }

    try {
      setSubmitting(true);
      const params: CreateVehicleParams = {
        plateNumber: newPlate.trim(),
        model: newModel.trim(),
        vin: newVin.trim(),
        initialKm: Number(newKm) || 0,
      };
      await operationsApi.createVehicle(params);
      Alert.alert('تم بنجاح', `تم تسجيل الدباب الجديد ${newPlate} في الأسطول`);
      setAddVehicleModalVisible(false);
      setNewPlate('');
      setNewVin('');
      setNewKm('0');
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل تسجيل الدباب الجديد');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Accident Report
  const handleSubmitAccident = async () => {
    if (!accidentPlate.trim() || !accidentDesc.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة رقم لوحة الدباب وتفاصيل الحادث');
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
      Alert.alert('تم الإبلاغ', 'تم تسجيل بلاغ الحادث وإحالته كطلب صيانة طارئ للورشة');
      setAccidentDelName('');
      setAccidentPlate('');
      setAccidentDesc('');
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل تسجيل بلاغ الحادث');
    } finally {
      setSubmitting(false);
    }
  };

  // Oil stock calculation
  const oilItem = inventoryItems.find(
    (item) => item.name.includes('زيت') || item.category === 'OIL' || item.name.toLowerCase().includes('oil')
  ) || inventoryItems[0];

  const totalOilQty = oilItem ? oilItem.quantity : 0;
  const isOilLow = totalOilQty <= (oilItem?.min_limit || 5);

  const activeVehiclesCount = vehicles.filter((v) => v.status === 'ACTIVE').length;
  const maintenanceVehiclesCount = vehicles.filter((v) => v.status === 'MAINTENANCE').length;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Segmented Navigation Bar */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'oil' && [styles.activeSegment, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('oil')}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'oil' ? '#fff' : colors.textSecondary }]}>
            مخزن وزيت الفرع
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'fleet' && [styles.activeSegment, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('fleet')}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'fleet' ? '#fff' : colors.textSecondary }]}>
            الأسطول ({vehicles.length})
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

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {/* 1. OIL & WAREHOUSE TAB */}
        {activeTab === 'oil' && (
          <View style={styles.tabContent}>
            {/* Oil Stock KPI Card */}
            <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: isOilLow ? '#EF4444' : colors.border }]}>
              <View style={styles.kpiHeader}>
                <View style={[styles.iconCircle, { backgroundColor: isOilLow ? '#EF444415' : colors.primary + '15' }]}>
                  <Ionicons name="color-fill" size={24} color={isOilLow ? '#EF4444' : colors.primary} />
                </View>
                <View style={styles.kpiTextGroup}>
                  <Text style={[styles.kpiTitle, { color: colors.textPrimary }]}>مخزون زيت المحركات بالفرع</Text>
                  <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                    {oilItem?.name || 'عبوات زيت المحرك المعتمدة'}
                  </Text>
                </View>
              </View>

              <View style={styles.qtyRow}>
                <Text style={[styles.qtyNumber, { color: isOilLow ? '#EF4444' : colors.textPrimary }]}>
                  {totalOilQty}
                </Text>
                <Text style={[styles.qtyUnit, { color: colors.textSecondary }]}>علبة متوفرة</Text>
                {isOilLow && (
                  <View style={styles.lowStockBadge}>
                    <Ionicons name="alert-circle" size={14} color="#EF4444" />
                    <Text style={styles.lowStockText}>مخزون منخفض - يلزم طلب توريد</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => setDispenseModalVisible(true)}
              >
                <Ionicons name="water" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>صرف زيت لدباب وتسجيل العداد</Text>
              </TouchableOpacity>
            </View>

            {/* Warehouse Items List */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>المواد المتوفرة في المستودع</Text>
            {inventoryItems.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="cube-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>لا توجد مواد مسجلة بالمستودع</Text>
              </View>
            ) : (
              inventoryItems.map((item) => (
                <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.itemCat, { color: colors.textSecondary }]}>
                      {item.category || 'مستهلكات عامة'}
                    </Text>
                  </View>
                  <View style={styles.itemQtyBadge}>
                    <Text style={[styles.itemQtyText, { color: colors.primary }]}>{item.quantity}</Text>
                    <Text style={[styles.itemUnitText, { color: colors.textSecondary }]}>{item.unit || 'قطعة'}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* 2. FLEET MANAGEMENT TAB */}
        {activeTab === 'fleet' && (
          <View style={styles.tabContent}>
            {/* Fleet Summary Card */}
            <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.fleetStatsRow}>
                <View style={styles.fleetStatCol}>
                  <Text style={[styles.fleetStatNum, { color: colors.textPrimary }]}>{vehicles.length}</Text>
                  <Text style={[styles.fleetStatLbl, { color: colors.textSecondary }]}>إجمالي الأسطول</Text>
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

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                onPress={() => setAddVehicleModalVisible(true)}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>إضافة وتوثيق دباب جديد</Text>
              </TouchableOpacity>
            </View>

            {/* Vehicle List */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>دبابات ومركبات الفرع</Text>
            {vehicles.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="bicycle-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>لا توجد دبابات مسجلة</Text>
              </View>
            ) : (
              vehicles.map((v) => {
                const plate = parsePlateComponents(v.plate_number || '');
                const isActive = v.status === 'ACTIVE';

                return (
                  <View key={v.id} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.vehicleInfoCol}>
                      <SaudiPlateView
                        digits={plate.digits}
                        letters={plate.letters}
                        editable={false}
                        scale={0.65}
                        isDarkMode={isDarkMode}
                      />
                      <Text style={[styles.vehicleModelText, { color: colors.textSecondary }]}>
                        {v.model || 'دباب توصيل'} {v.current_km ? `(${v.current_km} كم)` : ''}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusTag,
                        {
                          backgroundColor: isActive ? '#10B98115' : '#F59E0B15',
                          borderColor: isActive ? '#10B981' : '#F59E0B',
                        },
                      ]}
                    >
                      <Text style={[styles.statusTagText, { color: isActive ? '#10B981' : '#F59E0B' }]}>
                        {isActive ? 'جاهز بالخدمة' : 'في الصيانة'}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* 3. ACCIDENTS & EMERGENCY INCIDENTS TAB */}
        {activeTab === 'accidents' && (
          <View style={styles.tabContent}>
            <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: '#EF444450' }]}>
              <View style={styles.kpiHeader}>
                <View style={[styles.iconCircle, { backgroundColor: '#EF444415' }]}>
                  <Ionicons name="warning" size={24} color="#EF4444" />
                </View>
                <View style={styles.kpiTextGroup}>
                  <Text style={[styles.kpiTitle, { color: colors.textPrimary }]}>تسجيل بلاغ حادث أو عطل طارئ</Text>
                  <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                    يتم إحالة البلاغ مباشرة لورشة الصيانة بأولوية عاجلة
                  </Text>
                </View>
              </View>

              {/* Form Inputs */}
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>اسم المندوب المعني</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="اسم المندوب..."
                placeholderTextColor={colors.textSecondary}
                value={accidentDelName}
                onChangeText={setAccidentDelName}
              />

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>رقم لوحة الدباب المتضرر *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="مثال: 7030 ب ع"
                placeholderTextColor={colors.textSecondary}
                value={accidentPlate}
                onChangeText={setAccidentPlate}
              />

              {accidentPlate.trim().length > 0 && (() => {
                const parsed = parsePlateComponents(accidentPlate);
                return (
                  <View style={{ alignItems: 'center', marginVertical: 6 }}>
                    <SaudiPlateView
                      digits={parsed.digits}
                      letters={parsed.letters}
                      editable={false}
                      scale={0.7}
                      isDarkMode={isDarkMode}
                    />
                  </View>
                );
              })()}

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>درجة خطورة الحادث</Text>
              <View style={styles.severityRow}>
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

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>تفاصيل الحادث والأضرار *</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                multiline
                numberOfLines={3}
                placeholder="اكتب وصف الأضرار، سبب الحادث، وموقع الواقعة..."
                placeholderTextColor={colors.textSecondary}
                value={accidentDesc}
                onChangeText={setAccidentDesc}
              />

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#EF4444', marginTop: 14 }]}
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
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>صرف زيت لدباب</Text>
              <TouchableOpacity onPress={() => setDispenseModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>رقم لوحة الدباب *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="مثال: 7030 ب ع"
                placeholderTextColor={colors.textSecondary}
                value={dispensePlate}
                onChangeText={setDispensePlate}
              />

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>قراءة العداد الحالية (كم) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                keyboardType="numeric"
                placeholder="مثال: 45200"
                placeholderTextColor={colors.textSecondary}
                value={dispenseKm}
                onChangeText={setDispenseKm}
              />

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>عدد العلب المنصرفة</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                keyboardType="numeric"
                value={dispenseQty}
                onChangeText={setDispenseQty}
              />

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>ملاحظات</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                multiline
                numberOfLines={2}
                placeholder="ملاحظات اختيارية..."
                placeholderTextColor={colors.textSecondary}
                value={dispenseNotes}
                onChangeText={setDispenseNotes}
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

      {/* ADD VEHICLE MODAL */}
      <Modal visible={addVehicleModalVisible} transparent animationType="slide" onRequestClose={() => setAddVehicleModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>إضافة وتوثيق دباب جديد</Text>
              <TouchableOpacity onPress={() => setAddVehicleModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>رقم اللوحة *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="مثال: 8022 ب ع"
                placeholderTextColor={colors.textSecondary}
                value={newPlate}
                onChangeText={setNewPlate}
              />

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>الموديل والنوع</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                value={newModel}
                onChangeText={setNewModel}
              />

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>رقم الهيكل (VIN)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="اختياري..."
                placeholderTextColor={colors.textSecondary}
                value={newVin}
                onChangeText={setNewVin}
              />

              <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>قراءة العداد الابتدائية (كم)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                keyboardType="numeric"
                value={newKm}
                onChangeText={setNewKm}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
              onPress={handleCreateVehicle}
              disabled={submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>حفظ وتوثيق الدباب</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

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
    paddingBottom: 40,
  },
  tabContent: {
    gap: 14,
  },
  kpiCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  kpiHeader: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  qtyNumber: {
    fontSize: 32,
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
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  itemInfo: {
    gap: 3,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  itemCat: {
    fontSize: 12,
  },
  itemQtyBadge: {
    alignItems: 'center',
    gap: 1,
  },
  itemQtyText: {
    fontSize: 16,
    fontWeight: '800',
  },
  itemUnitText: {
    fontSize: 10,
  },
  fleetStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 4,
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
  vehicleInfoCol: {
    gap: 6,
  },
  vehicleModelText: {
    fontSize: 12,
  },
  statusTag: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    height: 70,
    textAlignVertical: 'top',
  },
  severityRow: {
    flexDirection: 'row',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
});
