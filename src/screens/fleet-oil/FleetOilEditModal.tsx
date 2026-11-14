import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { VehicleItem, operationsApi } from '../../services/operations';
import { showBottomAlert } from '../../components/modals/ActionAlertBottomSheet';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { fleetOilStyles as styles } from './fleetOilStyles';

interface FleetOilEditModalProps {
  visible: boolean;
  vehicle: VehicleItem | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const FleetOilEditModal: React.FC<FleetOilEditModalProps> = ({
  visible,
  vehicle,
  colors,
  isDarkMode,
  isRTL,
  onClose,
  onSaved,
}) => {
  const [editLastKm, setEditLastKm] = useState('');
  const [editCurrentKm, setEditCurrentKm] = useState('');
  const [editLastDate, setEditLastDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!visible || !vehicle) return;
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
  }, [visible, vehicle]);

  const handleSetToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setEditLastDate(todayStr);
  };

  const handleSaveEdit = async () => {
    if (!vehicle) return;

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

      await operationsApi.updateVehicle(vehicle.id, payload);

      showBottomAlert({
        type: 'success',
        title: 'تم تحديث البيانات',
        message: `تم تحديث قراءة وتاريخ غيار الزيت للدباب (${vehicle.plate_number}) بنجاح.`,
      });

      onClose();
      onSaved?.();
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBackdrop}
      >
        <View
          style={[
            styles.modalSheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {/* Modal Header */}
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={[styles.modalTitleGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                تعديل آخر غيار زيت
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                دباب ({vehicle?.plate_number}) - مفتاح #{vehicle?.key_number || 'بدون'}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.modalCloseBtn,
                { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Field 1: Last Oil Change KM */}
            <View style={styles.fieldGroup}>
              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
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
              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
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
              <View
                style={[
                  styles.labelWithActionRow,
                  { flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
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
              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
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
          <View
            style={[
              styles.modalActionsRow,
              {
                borderTopColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
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
              onPress={onClose}
            >
              <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>
                إلغاء
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
