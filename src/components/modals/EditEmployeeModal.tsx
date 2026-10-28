import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents } from '@shared/utils/plateUtils';
import { DelegateWithStatus, supervisorApi } from '../../services/supervisor';
import { VehicleItem } from '../../services/operations';

interface EditEmployeeModalProps {
  visible: boolean;
  employee: DelegateWithStatus | null;
  vehicles: VehicleItem[];
  onClose: () => void;
  onSuccess: (updatedEmp?: any) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  visible,
  employee,
  vehicles,
  onClose,
  onSuccess,
  colors,
  isDarkMode,
  isRTL,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [jobRole, setJobRole] = useState('DRIVER');
  const [shift, setShift] = useState('morning');
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [motorcycleNumber, setMotorcycleNumber] = useState('');
  const [keyNumber, setKeyNumber] = useState('');
  const [applicationType, setApplicationType] = useState('ninja');
  const [applicationId, setApplicationId] = useState('');
  const [iqamaExpirationDate, setIqamaExpirationDate] = useState('');

  // Password Reset State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Fleet Plate Selector State
  const [isPlatePickerOpen, setIsPlatePickerOpen] = useState(false);
  const [plateSearch, setPlateSearch] = useState('');

  // Submission State
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initialize form when employee opens
  useEffect(() => {
    if (employee) {
      setName(employee.name || '');
      setPhone(employee.phone || '');
      setNationalId(employee.national_id || '');
      setEmployeeNumber(employee.employee_number || '');
      setJobRole((employee.job_role || (employee as any).role_name || 'DRIVER').toUpperCase());
      setShift(employee.shift || 'morning');
      setVehicleType(employee.vehicle_type || 'motorcycle');
      setMotorcycleNumber(employee.motorcycle_number || '');
      setKeyNumber(employee.key_number || '');
      setApplicationType(employee.application_type || 'ninja');
      setApplicationId(employee.application_id || '');
      setIqamaExpirationDate(employee.iqama_expiration_date || '');
      setShowPasswordSection(false);
      setNewPassword('');
      setErrorMsg('');
      setIsPlatePickerOpen(false);
      setPlateSearch('');
    }
  }, [employee]);

  // Filtered vehicles for picker
  const filteredVehicles = useMemo(() => {
    if (!plateSearch.trim()) return vehicles;
    const q = plateSearch.trim().toLowerCase();
    return vehicles.filter(
      (v) =>
        (v.plate_number && v.plate_number.toLowerCase().includes(q)) ||
        (v.key_number && v.key_number.toLowerCase().includes(q))
    );
  }, [vehicles, plateSearch]);

  const plateComponents = useMemo(() => {
    return parsePlateComponents(motorcycleNumber || '');
  }, [motorcycleNumber]);

  const handleSave = async () => {
    if (!employee?.id) return;
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم الموظف');
      return;
    }
    if (!nationalId.trim()) {
      setErrorMsg('يرجى إدخال رقم الهوية أو الإقامة');
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, any> = {
        name: name.trim(),
        phone: phone.trim(),
        national_id: nationalId.trim(),
        employee_number: employeeNumber.trim(),
        job_role: jobRole,
        shift,
        vehicle_type: vehicleType,
        motorcycle_number: motorcycleNumber.trim(),
        key_number: keyNumber.trim(),
        application_type: applicationType,
        application_id: applicationId.trim(),
        iqama_expiration_date: iqamaExpirationDate.trim() || undefined,
      };

      const res = await supervisorApi.updateEmployee(employee.id, payload);

      // Reset password if provided
      if (showPasswordSection && newPassword.trim()) {
        if (newPassword.trim().length < 4) {
          Alert.alert('تنبيه', 'كلمة المرور يجب ألا تقل عن 4 خانات');
        } else {
          await supervisorApi.resetEmployeePassword(employee.id, newPassword.trim()).catch((err) => {
            console.warn('[EditEmployeeModal] reset password error:', err);
          });
        }
      }

      Alert.alert('نجاح', 'تم تحديث بيانات الموظف بنجاح');
      onSuccess(res?.data || { ...employee, ...payload });
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ أثناء حفظ التعديلات';
      setErrorMsg(msg);
      Alert.alert('خطأ', msg);
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !employee) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.modalTitleBlock, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.headerIconRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.iconPill, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  تعديل بيانات الموظف
                </Text>
              </View>
              <Text style={[styles.modalSubTitle, { color: colors.textSecondary }]}>
                {employee.name} {employee.employee_number ? `(${employee.employee_number})` : ''}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onClose}
              disabled={saving}
              style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {!!errorMsg && (
            <View style={[styles.errorBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="alert-circle" size={18} color="#ef4444" />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          {/* Form Scroll Area */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Section 1: Basic Information */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                البيانات الأساسية
              </Text>
            </View>

            {/* Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                اسم الموظف *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="الاسم الكامل"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Phone & National ID Row */}
            <View style={[styles.dualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  رقم الجوال
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="05xxxxxxxx"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  رقم الهوية / الإقامة *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  value={nationalId}
                  onChangeText={setNationalId}
                  placeholder="10 خانات"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Employee Number & Iqama Expiration Row */}
            <View style={[styles.dualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  كود الموظف
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  value={employeeNumber}
                  onChangeText={setEmployeeNumber}
                  placeholder="مثلاً: 1045"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  تاريخ انتهاء الإقامة
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  value={iqamaExpirationDate}
                  onChangeText={setIqamaExpirationDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Job Role Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                المسمى الوظيفي
              </Text>
              <View style={[styles.chipsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {[
                  { key: 'DRIVER', label: 'سائق / مندوب', icon: 'bicycle-outline' },
                  { key: 'SUPERVISOR', label: 'مشرف ميداني', icon: 'shield-outline' },
                  { key: 'ADMIN', label: 'إداري', icon: 'business-outline' },
                ].map((item) => {
                  const selected = jobRole === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setJobRole(item.key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? colors.primary + '20'
                            : isDarkMode
                            ? '#1e293b'
                            : '#f1f5f9',
                          borderColor: selected ? colors.primary : colors.border,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={16}
                        color={selected ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selected ? colors.primary : colors.textPrimary,
                            fontWeight: selected ? '700' : '500',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Shift Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                وردية العمل
              </Text>
              <View style={[styles.chipsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {[
                  { key: 'morning', label: 'صباحي ☀️' },
                  { key: 'evening', label: 'مسائي 🌙' },
                  { key: 'flexible', label: 'مرن 🔄' },
                ].map((item) => {
                  const selected = shift === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setShift(item.key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? '#10b98120'
                            : isDarkMode
                            ? '#1e293b'
                            : '#f1f5f9',
                          borderColor: selected ? '#10b981' : colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selected ? '#10b981' : colors.textPrimary,
                            fontWeight: selected ? '700' : '500',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Section 2: Vehicle & Fleet Details */}
            <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                بيانات المركبة والأسطول
              </Text>
            </View>

            {/* Vehicle Type */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                نوع المركبة
              </Text>
              <View style={[styles.chipsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {[
                  { key: 'motorcycle', label: 'دراجة نارية (دباب)', icon: 'bicycle-outline' },
                  { key: 'car', label: 'سيارة', icon: 'car-outline' },
                ].map((item) => {
                  const selected = vehicleType === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setVehicleType(item.key)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: selected
                            ? '#0284c720'
                            : isDarkMode
                            ? '#1e293b'
                            : '#f1f5f9',
                          borderColor: selected ? '#0284c7' : colors.border,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={16}
                        color={selected ? '#0284c7' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.chipText,
                          {
                            color: selected ? '#0284c7' : colors.textPrimary,
                            fontWeight: selected ? '700' : '500',
                          },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Motorcycle Plate & Key Row */}
            <View style={[styles.dualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Plate Input with Picker Button */}
              <View style={[styles.inputGroup, { flex: 1.4 }]}>
                <View style={[styles.labelWithAction, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    رقم اللوحة
                  </Text>
                  {vehicles.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setIsPlatePickerOpen(!isPlatePickerOpen)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={[styles.pickerToggleText, { color: colors.primary }]}>
                        {isPlatePickerOpen ? 'إدخال يدوي' : 'اختر من الأسطول'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  value={motorcycleNumber}
                  onChangeText={setMotorcycleNumber}
                  placeholder="مثال: 5443 ا ح"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Key Number */}
              <View style={[styles.inputGroup, { flex: 0.8 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  رقم المفتاح
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  value={keyNumber}
                  onChangeText={setKeyNumber}
                  placeholder="مثلاً: 39"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Fleet Plate Quick Selector Dropdown */}
            {isPlatePickerOpen && (
              <View
                style={[
                  styles.pickerContainer,
                  { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={[
                    styles.pickerSearchInput,
                    {
                      backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  placeholder="بحث في مركبات الأسطول..."
                  placeholderTextColor={colors.textSecondary}
                  value={plateSearch}
                  onChangeText={setPlateSearch}
                />
                <ScrollView style={styles.pickerList} nestedScrollEnabled>
                  {filteredVehicles.map((v) => (
                    <TouchableOpacity
                      key={v.id}
                      style={[
                        styles.pickerItem,
                        {
                          borderColor: colors.border,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                          backgroundColor:
                            v.plate_number === motorcycleNumber ? colors.primary + '15' : 'transparent',
                        },
                      ]}
                      onPress={() => {
                        setMotorcycleNumber(v.plate_number || '');
                        if (v.key_number) setKeyNumber(v.key_number);
                        setIsPlatePickerOpen(false);
                      }}
                    >
                      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text style={[styles.pickerPlateText, { color: colors.textPrimary }]}>
                          {v.plate_number}
                        </Text>
                        <Text style={[styles.pickerSubText, { color: colors.textSecondary }]}>
                          {v.key_number ? `مفتاح: ${v.key_number} • ` : ''}عداد: {v.current_km || 0} كم
                        </Text>
                      </View>
                      {v.plate_number === motorcycleNumber && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* Saudi Plate Preview */}
            {!!motorcycleNumber.trim() && (
              <View style={styles.platePreviewBox}>
                <SaudiPlateView
                  digits={plateComponents.digits}
                  letters={plateComponents.letters}
                  editable={false}
                  scale={0.65}
                  isDarkMode={isDarkMode}
                />
              </View>
            )}

            {/* Section 3: Delivery App Association */}
            <View style={[styles.sectionHeaderRow, { marginTop: 12 }]}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                بيانات تطبيق التوصيل
              </Text>
            </View>

            <View style={[styles.dualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* App Type */}
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  تطبيق التوصيل
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  value={applicationType}
                  onChangeText={setApplicationType}
                  placeholder="ninja, jahez..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {/* Application ID */}
              <View style={[styles.inputGroup, { flex: 1.2 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  معرف الموظف بالتطبيق
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  value={applicationId}
                  onChangeText={setApplicationId}
                  placeholder="ID في جاهز / نينجا"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Section 4: Security & Password Reset */}
            <TouchableOpacity
              style={[
                styles.passwordToggleBtn,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderColor: colors.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => setShowPasswordSection(!showPasswordSection)}
              activeOpacity={0.7}
            >
              <View style={[styles.toggleLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="key-outline" size={18} color="#f59e0b" />
                <Text style={[styles.passwordToggleText, { color: colors.textPrimary }]}>
                  إعادة تعيين كلمة المرور
                </Text>
              </View>
              <Ionicons
                name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showPasswordSection && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  كلمة المرور الجديدة
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="أدخل كلمة مرور جديدة"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
              </View>
            )}
          </ScrollView>

          {/* Footer Save Button */}
          <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View style={[styles.saveBtnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="save-outline" size={20} color="#ffffff" />
                  <Text style={styles.saveBtnText}>حفظ التعديلات</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '90%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.15)',
  },
  modalTitleBlock: {
    flex: 1,
    gap: 3,
  },
  headerIconRow: {
    alignItems: 'center',
    gap: 8,
  },
  iconPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalSubTitle: {
    fontSize: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorBanner: {
    backgroundColor: '#ef444415',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  errorBannerText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 14,
    gap: 14,
  },
  sectionHeaderRow: {
    marginTop: 4,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
  },
  dualRow: {
    gap: 12,
    alignItems: 'flex-start',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  labelWithAction: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chipsContainer: {
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    maxHeight: 180,
  },
  pickerSearchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    marginBottom: 8,
  },
  pickerList: {
    maxHeight: 130,
  },
  pickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerPlateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pickerSubText: {
    fontSize: 11,
  },
  platePreviewBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  passwordToggleBtn: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  toggleLeft: {
    alignItems: 'center',
    gap: 8,
  },
  passwordToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalFooter: {
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnRow: {
    alignItems: 'center',
    gap: 8,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
