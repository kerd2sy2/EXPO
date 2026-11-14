import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { VehicleItem } from '../../../services/operations';
import { ModuleErrorBoundary } from '../../ModuleErrorBoundary';
import { editEmployeeStyles as styles } from './editEmployeeStyles';

interface EmployeePlatePickerOverlayProps {
  visible: boolean;
  vehicles: VehicleItem[];
  motorcycleNumber: string;
  plateSearchText: string;
  manualPlateInput: string;
  onChangeSearch: (v: string) => void;
  onChangeManual: (v: string) => void;
  onSelectVehicle: (vehicle: VehicleItem) => void;
  onApplyManual: (plate: string) => void;
  onClose: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

/** Bottom-sheet overlay allowing the supervisor to select or enter a motorcycle plate. */
export const EmployeePlatePickerOverlay: React.FC<EmployeePlatePickerOverlayProps> = ({
  visible,
  vehicles,
  motorcycleNumber,
  plateSearchText,
  manualPlateInput,
  onChangeSearch,
  onChangeManual,
  onSelectVehicle,
  onApplyManual,
  onClose,
  colors,
  isDarkMode,
  isRTL,
}) => {
  if (!visible) return null;

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const inputBg = isDarkMode ? '#1e293b' : '#f8fafc';

  return (
    <ModuleErrorBoundary moduleName="EmployeePlatePickerOverlay" colors={colors}>
      <View style={styles.overlayContainer}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.backdropDismiss} activeOpacity={1} onPress={onClose} />
          <View style={[styles.pickerModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.pickerModalHeader, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
              <View style={[styles.modalHeaderIconCircle, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="bicycle" size={20} color={colors.primary} />
              </View>
              <View style={[styles.pickerModalTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.pickerModalTitle, { color: colors.textPrimary }]}>اختيار لوحة الدباب</Text>
                <Text style={[styles.pickerModalSubtitle, { color: colors.textSecondary }]}>ابحث برقم اللوحة أو رقم المفتاح</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={[styles.modalCloseCircle, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerModalSearchWrap}>
              <View style={[styles.searchBarInner, { backgroundColor: inputBg, borderColor: colors.border, flexDirection: rowDir }]}>
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.pickerModalSearchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  value={plateSearchText}
                  onChangeText={onChangeSearch}
                  placeholder="ابحث برقم اللوحة أو رقم المفتاح..."
                  placeholderTextColor={colors.textSecondary}
                  autoFocus={false}
                />
                {plateSearchText ? (
                  <TouchableOpacity onPress={() => onChangeSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <ScrollView style={styles.pickerModalScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true}>
              {vehicles.length === 0 ? (
                <View style={styles.emptySearchWrap}>
                  <Ionicons name="search-outline" size={36} color={colors.textSecondary} />
                  <Text style={[styles.emptySearchTitle, { color: colors.textPrimary }]}>لا توجد دبابات مطابقة للبحث</Text>
                  <Text style={[styles.emptySearchSub, { color: colors.textSecondary }]}>يمكنك كتابة رقم اللوحة يدويًا بالأسفل</Text>
                </View>
              ) : (
                vehicles.map((v) => {
                  const isSelected = motorcycleNumber === v.plate_number;
                  return (
                    <TouchableOpacity
                      key={v.id || v.plate_number}
                      style={[
                        styles.pickerCardItem,
                        {
                          backgroundColor: isSelected ? colors.primary + '12' : isDarkMode ? '#1e293b60' : '#f8fafc',
                          borderColor: isSelected ? colors.primary : colors.border,
                          flexDirection: rowDir,
                        },
                      ]}
                      onPress={() => onSelectVehicle(v)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text style={[styles.plateCardText, { color: colors.textPrimary }]}>{v.plate_number}</Text>
                        <View style={[styles.cardMetaRow, { flexDirection: rowDir }]}>
                          {v.key_number ? (
                            <View style={[styles.miniMetaBadge, { backgroundColor: '#f59e0b20' }]}>
                              <Text style={[styles.miniMetaText, { color: '#f59e0b' }]}>مفتاح {v.key_number}</Text>
                            </View>
                          ) : null}
                          <Text style={[styles.plateKmText, { color: colors.textSecondary }]}>
                            {v.current_km || (v as any).starting_km || 0} كم
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.checkCircle,
                          {
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                            borderWidth: isSelected ? 0 : 1.5,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        {isSelected && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <View style={[styles.pickerModalFooter, { borderTopColor: colors.border }]}>
              <Text style={[styles.manualSectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                أو إدخال لوحة غير مسجلة بالأسطول يدويًا:
              </Text>
              <View style={[styles.manualInputRow, { flexDirection: rowDir }]}>
                <TextInput
                  style={[styles.manualInput, { backgroundColor: inputBg, borderColor: colors.border, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  value={manualPlateInput}
                  onChangeText={onChangeManual}
                  placeholder="مثلاً: 1234 أ ب ج"
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity
                  style={[
                    styles.manualApplyBtn,
                    { backgroundColor: manualPlateInput.trim() ? colors.primary : colors.border, opacity: manualPlateInput.trim() ? 1 : 0.6 },
                  ]}
                  disabled={!manualPlateInput.trim()}
                  onPress={() => onApplyManual(manualPlateInput.trim())}
                >
                  <Text style={styles.manualApplyBtnText}>تطبيق اللوحة</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </ModuleErrorBoundary>
  );
};
