import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { operationsStyles as styles } from './operationsStyles';
import { EnrichedVehicleItem } from './operationsHelpers';

interface DispenseOilModalProps {
  visible: boolean;
  colors: ThemeColors;
  isRTL: boolean;
  dispensePlate: string;
  dispenseKm: string;
  showDispenseDropdown: boolean;
  matchingDispenseVehicles: EnrichedVehicleItem[];
  submitting: boolean;
  onChangePlate: (val: string) => void;
  onSelectBike: (bike: EnrichedVehicleItem) => void;
  onChangeKm: (val: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const DispenseOilModal: React.FC<DispenseOilModalProps> = ({
  visible,
  colors,
  isRTL,
  dispensePlate,
  dispenseKm,
  showDispenseDropdown,
  matchingDispenseVehicles,
  submitting,
  onChangePlate,
  onSelectBike,
  onChangeKm,
  onSubmit,
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
        <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>صرف زيت لدباب</Text>
          <TouchableOpacity onPress={onClose}>
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
            onChangeText={onChangePlate}
          />

          {showDispenseDropdown && matchingDispenseVehicles.length > 0 && (
            <View style={[styles.autocompleteBox, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              {matchingDispenseVehicles.slice(0, 6).map((v) => (
                <TouchableOpacity
                  key={v.id}
                  style={[styles.autocompleteItem, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => onSelectBike(v)}
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
            onChangeText={(v) => onChangeKm(toEnglishDigits(v))}
          />
        </ScrollView>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
          onPress={onSubmit}
          disabled={submitting}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>تأكيد صرف الزيت</Text>}
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);
