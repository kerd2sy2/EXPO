import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, TabType } from '../types/delegate';
import { DelegateWithStatus } from '../services/supervisor';
import { VehicleItem, operationsApi } from '../services/operations';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';
import { toEnglishDigits } from '@shared/utils/plateUtils';

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
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [dispensingVehicleId, setDispensingVehicleId] = useState<string | null>(null);

  // Direct dispense handler
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

      try {
        setDispensingVehicleId(vehicle.id);
        await operationsApi.dispenseOil({
          motorcycleNumber: plate,
          currentKm: currKm || Number(vehicle.current_km) || 0,
          quantity: 1,
          notes: `صرف زيت مباشر بواسطة ${adminName}`,
        });

        showBottomAlert({
          type: 'success',
          title: 'تم الصرف بنجاح',
          message: `تم صرف جركن زيت وتسجيل غيار الزيت للدباب (${plate}) بنجاح.`,
        });

        onRefresh?.();
      } catch (err: any) {
        showBottomAlert({
          type: 'error',
          title: 'فشل الصرف',
          message: err?.response?.data?.error || err?.message || 'تعذر تسجيل صرف الزيت.',
        });
      } finally {
        setDispensingVehicleId(null);
      }
    },
    [adminName, onRefresh]
  );

  // Form states for modal
  const [editLastKm, setEditLastKm] = useState('');
  const [editCurrentKm, setEditCurrentKm] = useState('');
  const [editLastDate, setEditLastDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

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

  // Filter only motorcycles & sort primarily by Key Number
  const motorcyclesList = useMemo(() => {
    const filtered = vehicles.filter((v) => {
      const t = String(v.vehicle_type || (v as any).type || '').toLowerCase();
      return t === '' || t.includes('motorcycle') || t.includes('دباب');
    });

    return filtered.sort((a, b) => {
      const keyA = parseInt(a.key_number || '999999', 10);
      const keyB = parseInt(b.key_number || '999999', 10);
      if (!Number.isNaN(keyA) && !Number.isNaN(keyB)) {
        return keyA - keyB;
      }
      return String(a.key_number || '').localeCompare(String(b.key_number || ''));
    });
  }, [vehicles]);

  // Filter by search query (by motorcycle plate or key number)
  const displayedVehicles = useMemo(() => {
    const q = toEnglishDigits(searchQuery.trim()).toLowerCase();
    if (!q) return motorcyclesList;

    return motorcyclesList.filter((v) => {
      const plate = toEnglishDigits(v.plate_number || '').toLowerCase();
      const key = toEnglishDigits(v.key_number || '').toLowerCase();
      const assigned =
        (plate && driverByPlate.get(plate)) ||
        (key && driverByKey.get(key));
      const driverName = (assigned?.name || '').toLowerCase();

      return plate.includes(q) || key.includes(q) || driverName.includes(q);
    });
  }, [motorcyclesList, searchQuery, driverByPlate, driverByKey]);

  // Open edit modal for vehicle
  const handleOpenEditModal = (vehicle: VehicleItem) => {
    setSelectedVehicle(vehicle);
    setEditLastKm(String(Number(vehicle.last_oil_change_km || 0) || ''));
    setEditCurrentKm(String(Number(vehicle.current_km || 0) || ''));
    
    const lastDate = (vehicle as any).last_oil_change_date || (vehicle as any).last_oil_change_at;
    if (lastDate) {
      try {
        const d = new Date(lastDate);
        setEditLastDate(d.toISOString().split('T')[0]);
      } catch {
        setEditLastDate('');
      }
    } else {
      setEditLastDate('');
    }

    setEditNotes(vehicle.notes || '');
    setShowEditModal(true);
  };

  // Submit edit changes
  const handleSaveEdit = async () => {
    if (!selectedVehicle) return;

    const parsedLastKm = parseFloat(toEnglishDigits(editLastKm.trim()));
    const parsedCurrentKm = parseFloat(toEnglishDigits(editCurrentKm.trim()));

    if (isNaN(parsedLastKm) || parsedLastKm < 0) {
      showBottomAlert({
        type: 'warning',
        title: 'قيمة غير صالحة',
        message: 'يرجى إدخال قراءة كيلومتر صالحة لآخر غيار زيت.',
      });
      return;
    }

    try {
      setSavingEdit(true);
      const payload: any = {
        last_oil_change_km: parsedLastKm,
      };

      if (!isNaN(parsedCurrentKm) && parsedCurrentKm >= 0) {
        payload.current_km = parsedCurrentKm;
      }

      if (editLastDate.trim()) {
        try {
          const dateObj = new Date(editLastDate.trim());
          if (!isNaN(dateObj.getTime())) {
            payload.last_oil_change_date = dateObj.toISOString();
          }
        } catch {}
      }

      if (editNotes.trim()) {
        payload.notes = editNotes.trim();
      }

      await operationsApi.updateVehicle(selectedVehicle.id, payload);

      showBottomAlert({
        type: 'success',
        title: 'تم تحديث البيانات',
        message: `تم تحديث قراءة وتاريخ غيار الزيت للدباب (${selectedVehicle.plate_number}) بنجاح.`,
      });

      setShowEditModal(false);
      onRefresh?.();
    } catch (err: any) {
      showBottomAlert({
        type: 'error',
        title: 'فشل التحديث',
        message: err?.response?.data?.error || err?.message || 'تعذر حفظ تعديل غيار الزيت.',
      });
    } finally {
      setSavingEdit(false);
    }
  };

  // Set today date in modal
  const handleSetToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setEditLastDate(todayStr);
  };

  const renderMotorcycleCard = ({ item: v }: { item: VehicleItem }) => {
    const plateClean = (v.plate_number || '').trim().toLowerCase();
    const keyClean = (v.key_number || '').trim().toLowerCase();
    const assignedDriver =
      (plateClean && driverByPlate.get(plateClean)) ||
      (keyClean && driverByKey.get(keyClean));
    const keyDisplay = v.key_number || assignedDriver?.key_number || 'بدون';
    
    const currKm = Number(v.current_km || 0);
    const lastOilKm = Number(v.last_oil_change_km || 0);
    const isBroken = Boolean(v.is_odometer_broken) || String(v.plate_number).includes('7569') || String(v.plate_number).includes('8043');
    const interval = 950; // standard motorcycle oil interval

    // Calculate remaining KM
    let remainingKm = 0;
    let isOverdue = false;
    let brokenDaysSince = 0;
    let brokenDaysLeft = 0;

    if (isBroken) {
      const lastDate = (v as any).last_oil_change_date || (v as any).last_oil_change_at;
      if (lastDate) {
        const diffMs = Date.now() - new Date(lastDate).getTime();
        brokenDaysSince = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        brokenDaysLeft = 4 - brokenDaysSince;
        isOverdue = brokenDaysSince >= 4;
      } else {
        isOverdue = true;
      }
    } else {
      const driven = lastOilKm > 0 && currKm >= lastOilKm ? currKm - lastOilKm : Number(v.total_distance || 0);
      remainingKm = interval - driven;
      isOverdue = remainingKm <= 0;
    }

    const lastDateStr = (v as any).last_oil_change_date || (v as any).last_oil_change_at;
    const formattedLastDate = lastDateStr
      ? new Date(lastDateStr).toLocaleDateString('ar-SA')
      : 'غير مسجل';

    const isDispensing = dispensingVehicleId === v.id;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        delayLongPress={450}
        onLongPress={() => handleOpenEditModal(v)}
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
            {/* Key Number Badge */}
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

            {/* Plate Number */}
            <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.plateText, { color: colors.textPrimary }]}>
                {v.plate_number}
              </Text>
              <Text style={[styles.driverText, { color: colors.textSecondary }]}>
                المندوب: {assignedDriver?.name || 'غير مسند'}
              </Text>
            </View>
          </View>

          {/* Quick Edit Icon */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleOpenEditModal(v)}
            style={[
              styles.editIconCircle,
              { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border },
            ]}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Primary Status Banner: فاضل كام كيلو ويتغير الزيت */}
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
                  : `عداد عاطل - باقي ${Math.max(0, brokenDaysLeft)} أيام لتغيير الزيت (كل 4-5 أيام)`}
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

        {/* Details Grid: Current KM & Last Oil Change KM & Date */}
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
          onPress={() => handleDirectDispense(v, currKm)}
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

        {/* Interactive Long Press Hint */}
        <View style={[styles.hintRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="hand-right-outline" size={13} color={colors.textSecondary} />
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            اضغط مطولاً على الكرت لتعديل قراءة وتاريخ آخر غيار زيت
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Search Input Bar */}
      <View
        style={[
          styles.searchArea,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
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
              {
                color: colors.textPrimary,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            placeholder="بحث برقم الدباب أو رقم المفتاح..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Motorcycles List */}
      <FlatList
        data={displayedVehicles}
        keyExtractor={(item, index) => item.id || String(index)}
        renderItem={renderMotorcycleCard}
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
            <View style={[styles.emptyIconCircle, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
              <Ionicons name="bicycle-outline" size={44} color={colors.textSecondary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {searchQuery ? 'لا توجد نتائج مطابقة' : 'لا توجد دبابات مسجلة'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {searchQuery ? 'تأكد من كتابة رقم اللوحة أو المفتاح بشكل صحيح' : 'لم يتم العثور على دبابات في هذا الفرع'}
            </Text>
          </View>
        }
      />

      {/* Edit Last Oil Change Modal */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.modalTitleGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  تعديل آخر غيار زيت
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  دباب ({selectedVehicle?.plate_number}) - مفتاح #{selectedVehicle?.key_number || 'بدون'}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Field 1: Last Oil Change KM */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  كيلومتر آخر غيار زيت (كم) *
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  keyboardType="numeric"
                  placeholder="مثال: 14500"
                  placeholderTextColor={colors.textSecondary}
                  value={editLastKm}
                  onChangeText={setEditLastKm}
                />
              </View>

              {/* Field 2: Current KM */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  قراءة العداد الحالية (كم)
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  keyboardType="numeric"
                  placeholder="مثال: 15200"
                  placeholderTextColor={colors.textSecondary}
                  value={editCurrentKm}
                  onChangeText={setEditCurrentKm}
                />
              </View>

              {/* Field 3: Date of Last Oil Change */}
              <View style={styles.fieldGroup}>
                <View style={[styles.labelWithActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                    تاريخ آخر غيار زيت (YYYY-MM-DD)
                  </Text>
                  <TouchableOpacity
                    onPress={handleSetToday}
                    style={[styles.todayBtn, { backgroundColor: colors.primary + '18' }]}
                  >
                    <Text style={[styles.todayBtnText, { color: colors.primary }]}>اليوم</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  placeholder="2026-11-06"
                  placeholderTextColor={colors.textSecondary}
                  value={editLastDate}
                  onChangeText={setEditLastDate}
                />
              </View>

              {/* Field 4: Notes */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  ملاحظات
                </Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                      height: 70,
                      paddingTop: 10,
                    },
                  ]}
                  multiline
                  placeholder="ملاحظات إضافية حول صيانة وغيار الزيت..."
                  placeholderTextColor={colors.textSecondary}
                  value={editNotes}
                  onChangeText={setEditNotes}
                />
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={[styles.modalActionsRow, { borderTopColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={savingEdit}
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                    <Text style={styles.modalSaveBtnText}>حفظ وتحديث</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchArea: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
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
    gap: 12,
    paddingBottom: 40,
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
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
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
  keyAndPlateGroup: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  keyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 5,
  },
  keyBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#d97706',
  },
  plateText: {
    fontSize: 16,
    fontWeight: '900',
  },
  driverText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  editIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  oilStatusBanner: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  oilStatusTextGroup: {
    flex: 1,
  },
  oilStatusMainText: {
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  metricsRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  cellDivider: {
    width: 1,
    height: 22,
  },
  dispenseBtn: {
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dispenseBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  hintRow: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  hintText: {
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '85%',
  },
  modalHeader: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitleGroup: {
    gap: 2,
    flex: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 18,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  labelWithActionRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  todayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  modalActionsRow: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  modalSaveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  modalCancelBtn: {
    paddingHorizontal: 18,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
