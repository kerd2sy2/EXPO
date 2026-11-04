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
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents, toEnglishDigits } from '@shared/utils/plateUtils';
import { DelegateWithStatus, supervisorApi } from '../../services/supervisor';
import { VehicleItem } from '../../services/operations';
import { showBottomAlert } from './ActionAlertBottomSheet';

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

const DELIVERY_APPS = [
  { key: 'ninja', label: 'نينجا (Ninja)' },
  { key: 'jahez', label: 'جاهز (Jahez)' },
  { key: 'hungerstation', label: 'هنقرستيشن' },
  { key: 'keeta', label: 'كيتا (Keeta)' },
  { key: 'mrsool', label: 'مرسول' },
  { key: 'toyou', label: 'تو يو (ToYou)' },
];

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
      setApplicationType((employee.application_type || 'ninja').toLowerCase());
      setApplicationId(employee.application_id || '');
      setIqamaExpirationDate(employee.iqama_expiration_date || '');
      setShowPasswordSection(false);
      setNewPassword('');
      setErrorMsg('');
      setIsPlatePickerOpen(false);
      setPlateSearch('');
    }
  }, [employee]);

  // Filtered vehicles for picker (supports Arabic & English digits)
  const filteredVehicles = useMemo(() => {
    if (!plateSearch.trim()) return vehicles;
    const q = toEnglishDigits(plateSearch.trim()).toLowerCase();
    return vehicles.filter((v) => {
      const p = toEnglishDigits(v.plate_number || '').toLowerCase();
      const k = toEnglishDigits(v.key_number || '').toLowerCase();
      return p.includes(q) || k.includes(q);
    });
  }, [vehicles, plateSearch]);

  const plateComponents = useMemo(() => {
    return parsePlateComponents(motorcycleNumber || '');
  }, [motorcycleNumber]);

  const handleSave = async () => {
    if (!employee?.id) return;
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم الموظف');
      showBottomAlert({
        type: 'warning',
        title: 'بيانات ناقصة',
        message: 'يرجى إدخال اسم الموظف قبل الحفظ.',
      });
      return;
    }
    if (!nationalId.trim()) {
      setErrorMsg('يرجى إدخال رقم الهوية أو الإقامة');
      showBottomAlert({
        type: 'warning',
        title: 'بيانات ناقصة',
        message: 'يرجى إدخال رقم الهوية أو الإقامة.',
      });
      return;
    }

    if (showPasswordSection && newPassword.trim() && newPassword.trim().length < 4) {
      showBottomAlert({
        type: 'warning',
        title: 'تنبيه كلمة المرور',
        message: 'كلمة المرور الجديدة يجب ألا تقل عن 4 خانات.',
      });
      return;
    }

    try {
      setSaving(true);

      const payload: Record<string, any> = {
        name: name.trim(),
        phone: toEnglishDigits(phone.trim()),
        national_id: toEnglishDigits(nationalId.trim()),
        employee_number: toEnglishDigits(employeeNumber.trim()),
        job_role: jobRole,
        shift,
        vehicle_type: vehicleType,
        motorcycle_number: motorcycleNumber.trim(),
        key_number: toEnglishDigits(keyNumber.trim()),
        application_type: applicationType.trim(),
        application_id: toEnglishDigits(applicationId.trim()),
        iqama_expiration_date: iqamaExpirationDate.trim() || undefined,
      };

      const res = await supervisorApi.updateEmployee(employee.id, payload);

      // Reset password if provided
      if (showPasswordSection && newPassword.trim().length >= 4) {
        await supervisorApi.resetEmployeePassword(employee.id, newPassword.trim()).catch((err) => {
          console.warn('[EditEmployeePage] reset password error:', err);
        });
      }

      onSuccess(res?.data || { ...employee, ...payload });
      onClose();
      setTimeout(() => {
        showBottomAlert({
          type: 'success',
          title: 'تم الحفظ بنجاح',
          message: `تم تحديث بيانات الموظف (${name.trim()}) بنجاح.`,
        });
      }, 150);
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ أثناء حفظ التعديلات';
      setErrorMsg(msg);
      showBottomAlert({
        type: 'error',
        title: 'فشل الحفظ',
        message: msg,
      });
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !employee) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.pageContainer, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

        {/* Full-Page Top Navigation Bar */}
        <View
          style={[
            styles.pageHeader,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            disabled={saving}
            style={[
              styles.backBtn,
              { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' },
            ]}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isRTL ? 'arrow-forward' : 'arrow-back'}
              size={22}
              color={colors.textPrimary}
            />
          </TouchableOpacity>

          <View style={[styles.headerTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
              ملف وتعديل بيانات الموظف
            </Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {employee.name} {keyNumber ? `• مفتاح رقم ${keyNumber}` : ''}
            </Text>
          </View>

          {keyNumber ? (
            <View style={[styles.keyHeaderBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
              <Ionicons name="key" size={14} color={colors.primary} />
              <Text style={[styles.keyHeaderBadgeText, { color: colors.primary }]}>
                {keyNumber}
              </Text>
            </View>
          ) : null}
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Error Banner */}
            {!!errorMsg && (
              <View style={[styles.errorBanner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="alert-circle" size={18} color="#ef4444" />
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            )}

            {/* Card 1: Vehicle, Key Number & Compact Plate Preview */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.cardTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#0284c718' }]}>
                  <Ionicons name="bicycle" size={18} color="#0284c7" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  بيانات الدباب ورقم المفتاح
                </Text>
              </View>

              {/* Compact Plate & Key Summary Banner */}
              <View
                style={[
                  styles.compactPlateBanner,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 6 }}>
                  <View style={[styles.keyPillLarge, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b50', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="key" size={15} color="#d97706" />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#d97706' }}>
                      مفتاح الدباب: {keyNumber || 'غير محدد'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }}>
                    {motorcycleNumber.trim()
                      ? `اللوحة المسجلة: ${motorcycleNumber}`
                      : 'لم يتم ربط لوحة دباب بعد'}
                  </Text>
                </View>

                {/* Proportional Compact Plate (No extra vertical space) */}
                <SaudiPlateView
                  digits={plateComponents.digits}
                  letters={plateComponents.letters}
                  editable={false}
                  scale={0.46}
                  isDarkMode={isDarkMode}
                />
              </View>

              {/* Key Number & Plate Inputs Row */}
              <View style={[styles.dualRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 12 }]}>
                <View style={[styles.inputGroup, { flex: 0.85 }]}>
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
                        textAlign: 'center',
                        fontWeight: '800',
                        fontSize: 16,
                      },
                    ]}
                    value={keyNumber}
                    onChangeText={(val) => setKeyNumber(toEnglishDigits(val))}
                    placeholder="مثلاً: 12"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1.45 }]}>
                  <View style={[styles.labelWithAction, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                      رقم اللوحة (أرقام وحروف)
                    </Text>
                    {vehicles.length > 0 && (
                      <TouchableOpacity
                        onPress={() => setIsPlatePickerOpen(!isPlatePickerOpen)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={[styles.pickerToggleText, { color: colors.primary }]}>
                          {isPlatePickerOpen ? 'إغلاق القائمة' : 'اختر من الأسطول'}
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
                        fontWeight: '700',
                      },
                    ]}
                    value={motorcycleNumber}
                    onChangeText={setMotorcycleNumber}
                    placeholder="مثال: 5443 ا ح"
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
                    placeholder="ابحث برقم اللوحة أو رقم المفتاح..."
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
                          if (v.key_number) setKeyNumber(toEnglishDigits(v.key_number));
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

              {/* Vehicle Type Selector */}
              <View style={[styles.inputGroup, { marginTop: 4, marginBottom: 0 }]}>
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
            </View>

            {/* Card 2: Basic Employee Information */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.cardTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.cardIconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="person-outline" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  البيانات الشخصية والوظيفية
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
                    onChangeText={(v) => setPhone(toEnglishDigits(v))}
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
                    onChangeText={(v) => setNationalId(toEnglishDigits(v))}
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

              {/* Job Role & Shift */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  المسمى الوظيفي
                </Text>
                <View style={[styles.chipsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {[
                    { key: 'DRIVER', label: 'مندوب توصيل', icon: 'bicycle-outline' },
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
                          size={15}
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

              <View style={[styles.inputGroup, { marginBottom: 0 }]}>
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
            </View>

            {/* Card 3: Delivery App & Identifier */}
            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.cardTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.cardIconWrap, { backgroundColor: '#10b98118' }]}>
                  <Ionicons name="apps-outline" size={18} color="#10b981" />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  منصة التوصيل والمعرف (ID)
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  اختر منصة التوصيل
                </Text>
                <View style={[styles.chipsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {DELIVERY_APPS.map((app) => {
                    const selected = applicationType.toLowerCase() === app.key;
                    return (
                      <TouchableOpacity
                        key={app.key}
                        onPress={() => setApplicationType(app.key)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: selected
                              ? colors.primary + '20'
                              : isDarkMode
                              ? '#1e293b'
                              : '#f1f5f9',
                            borderColor: selected ? colors.primary : colors.border,
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            {
                              color: selected ? colors.primary : colors.textPrimary,
                              fontWeight: selected ? '700' : '500',
                            },
                          ]}
                        >
                          {app.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  المعرف في التطبيق (Application ID)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                      fontWeight: '700',
                    },
                  ]}
                  value={applicationId}
                  onChangeText={setApplicationId}
                  placeholder="معرف المندوب في نينجا / جاهز..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            </View>

            {/* Card 4: Password Reset */}
            <TouchableOpacity
              style={[
                styles.passwordToggleBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => setShowPasswordSection(!showPasswordSection)}
              activeOpacity={0.7}
            >
              <View style={[styles.toggleLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="lock-closed-outline" size={18} color="#f59e0b" />
                <Text style={[styles.passwordToggleText, { color: colors.textPrimary }]}>
                  تغيير أو إعادة تعيين كلمة المرور للموظف
                </Text>
              </View>
              <Ionicons
                name={showPasswordSection ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {showPasswordSection && (
              <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                  placeholder="أدخل كلمة مرور جديدة (4 خانات على الأقل)"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                />
              </View>
            )}
          </ScrollView>

          {/* Bottom Sticky Save Bar */}
          <View
            style={[
              styles.pageFooter,
              {
                backgroundColor: colors.card,
                borderTopColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                  borderColor: colors.border,
                },
              ]}
              onPress={onClose}
              disabled={saving}
              activeOpacity={0.75}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>رجوع</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View style={[styles.saveBtnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#ffffff" />
                  <Text style={styles.saveBtnText}>حفظ التعديلات</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
  },
  pageHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    gap: 2,
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  pageSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  keyHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  keyHeaderBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardTitleRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  compactPlateBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  keyPillLarge: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  errorBannerText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  labelWithAction: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  pickerToggleText: {
    fontSize: 12,
    fontWeight: '800',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  dualRow: {
    gap: 10,
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
    marginBottom: 12,
    maxHeight: 200,
  },
  pickerSearchInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
    marginBottom: 8,
  },
  pickerList: {
    maxHeight: 140,
  },
  pickerItem: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerPlateText: {
    fontSize: 14,
    fontWeight: '700',
  },
  pickerSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  passwordToggleBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLeft: {
    alignItems: 'center',
    gap: 8,
  },
  passwordToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  pageFooter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 10,
  },
  cancelBtn: {
    flex: 0.4,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
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
