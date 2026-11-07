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
import { targetApi } from '../../services/targetApi';
import { IdentifierPerformance } from '../../types/target';
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
  { key: 'keeta', label: 'كيتا (Keeta)', color: '#0284c7', icon: 'bicycle-outline' },
  { key: 'ninja', label: 'نينجا (Ninja)', color: '#10b981', icon: 'flash-outline' },
  { key: 'hungerstation', label: 'هنقرستيشن (HungerStation)', color: '#f59e0b', icon: 'fast-food-outline' },
  { key: 'jahez', label: 'جاهز (Jahez)', color: '#ef4444', icon: 'restaurant-outline' },
  { key: 'toyou', label: 'تو يو (ToYou)', color: '#8b5cf6', icon: 'cube-outline' },
  { key: 'mrsool', label: 'مرسول (Mrsool)', color: '#06b6d4', icon: 'paper-plane-outline' },
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
  const [applicationType, setApplicationType] = useState('keeta');
  const [applicationId, setApplicationId] = useState('');
  const [iqamaExpirationDate, setIqamaExpirationDate] = useState('');

  // Password Reset State
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Fleet Plate Modal State
  const [isPlateModalOpen, setIsPlateModalOpen] = useState(false);
  const [plateSearchText, setPlateSearchText] = useState('');
  const [manualPlateInput, setManualPlateInput] = useState('');

  // Identifier Modal State
  const [isIdentifierModalOpen, setIsIdentifierModalOpen] = useState(false);
  const [identifierSearchText, setIdentifierSearchText] = useState('');
  const [manualIdInput, setManualIdInput] = useState('');
  const [allIdentifiers, setAllIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [loadingIdentifiers, setLoadingIdentifiers] = useState(false);
  const [modalAppFilter, setModalAppFilter] = useState<string>('ALL');

  // Submission State
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Load Identifiers from Target API
  const loadIdentifiers = async () => {
    try {
      setLoadingIdentifiers(true);
      const list = await targetApi.listIdentifiers();
      if (Array.isArray(list)) {
        setAllIdentifiers(list);
      }
    } catch (err) {
      console.warn('[EditEmployeeModal] failed to load identifiers:', err);
    } finally {
      setLoadingIdentifiers(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadIdentifiers();
    }
  }, [visible]);

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
      const initialApp = (employee.application_type || 'keeta').toLowerCase();
      setApplicationType(initialApp);
      setModalAppFilter(initialApp);
      setApplicationId(employee.application_id || '');
      setIqamaExpirationDate(employee.iqama_expiration_date || '');
      setShowPasswordSection(false);
      setNewPassword('');
      setErrorMsg('');
      setIsPlateModalOpen(false);
      setPlateSearchText('');
      setManualPlateInput('');
      setIsIdentifierModalOpen(false);
      setIdentifierSearchText('');
      setManualIdInput('');
    }
  }, [employee]);

  // Filtered vehicles for picker (supports Arabic & English digits)
  const filteredVehicles = useMemo(() => {
    if (!plateSearchText.trim()) return vehicles;
    const q = toEnglishDigits(plateSearchText.trim()).toLowerCase();
    return vehicles.filter((v) => {
      const p = toEnglishDigits(v.plate_number || '').toLowerCase();
      const k = toEnglishDigits(v.key_number || '').toLowerCase();
      return p.includes(q) || k.includes(q);
    });
  }, [vehicles, plateSearchText]);

  // Filtered identifiers for modal picker
  const filteredIdentifiers = useMemo(() => {
    const activeApp = modalAppFilter !== 'ALL' ? modalAppFilter : applicationType;
    const q = identifierSearchText.trim().toLowerCase();

    return allIdentifiers.filter((item) => {
      // 1. App filter
      if (activeApp && activeApp !== 'ALL') {
        const itemApp = (item.app_name || '').toLowerCase();
        const targetApp = activeApp.toLowerCase();
        const isMatch =
          (targetApp.includes('ninja') || targetApp.includes('نينجا'))
            ? (itemApp.includes('ninja') || itemApp.includes('نينجا'))
            : (targetApp.includes('keeta') || targetApp.includes('كيتا'))
            ? (itemApp.includes('keeta') || itemApp.includes('كيتا'))
            : (targetApp.includes('hunger') || targetApp.includes('هنقر'))
            ? (itemApp.includes('hunger') || itemApp.includes('هنقر'))
            : (targetApp.includes('jahez') || targetApp.includes('جاهز'))
            ? (itemApp.includes('jahez') || itemApp.includes('جاهز'))
            : (targetApp.includes('toyou') || targetApp.includes('تويو'))
            ? (itemApp.includes('toyou') || itemApp.includes('تويو'))
            : (targetApp.includes('mrsool') || targetApp.includes('مرسول'))
            ? (itemApp.includes('mrsool') || itemApp.includes('مرسول'))
            : itemApp.includes(targetApp);

        if (!isMatch) return false;
      }

      // 2. Search query filter
      if (q) {
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const codeMatch = (item.code || '').toLowerCase().includes(q);
        const appMatch = (item.app_name || '').toLowerCase().includes(q);
        if (!nameMatch && !codeMatch && !appMatch) return false;
      }

      return true;
    });
  }, [allIdentifiers, modalAppFilter, applicationType, identifierSearchText]);

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
                      لوحة الدباب
                    </Text>
                    {motorcycleNumber ? (
                      <TouchableOpacity
                        onPress={() => setMotorcycleNumber('')}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>
                          مسح اللوحة
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.selectorTriggerBtn,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                        borderColor: motorcycleNumber ? colors.primary : colors.border,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                    onPress={() => {
                      setPlateSearchText('');
                      setManualPlateInput(motorcycleNumber || '');
                      setIsPlateModalOpen(true);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.selectorTriggerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons
                        name="bicycle"
                        size={18}
                        color={motorcycleNumber ? colors.primary : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.selectorTriggerValue,
                          {
                            color: motorcycleNumber ? colors.textPrimary : colors.textSecondary,
                            fontWeight: motorcycleNumber ? '800' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {motorcycleNumber || 'اختر لوحة الدباب من الأسطول...'}
                      </Text>
                    </View>
                    <View style={[styles.selectorTriggerBadge, { backgroundColor: colors.primary + '18' }]}>
                      <Text style={[styles.selectorTriggerBadgeText, { color: colors.primary }]}>
                        {motorcycleNumber ? 'تغيير' : 'اختيار'}
                      </Text>
                      <Ionicons name="search" size={13} color={colors.primary} />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

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
                  المنصات (كيتا، نينجا، هنقرستيشن...)
                </Text>
                <View style={[styles.chipsContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {DELIVERY_APPS.map((app) => {
                    const selected = applicationType.toLowerCase() === app.key;
                    return (
                      <TouchableOpacity
                        key={app.key}
                        onPress={() => {
                          setApplicationType(app.key);
                          setModalAppFilter(app.key);
                        }}
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
                          name={(app.icon as any) || 'apps-outline'}
                          size={14}
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
                          {app.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={[styles.inputGroup, { marginBottom: 0 }]}>
                <View style={[styles.labelWithAction, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    رقم المعرف في المنصة (Application ID)
                  </Text>
                  {applicationId ? (
                    <TouchableOpacity
                      onPress={() => setApplicationId('')}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>
                        مسح المعرف
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={[
                    styles.selectorTriggerBtn,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: applicationId ? '#10b981' : colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  onPress={() => {
                    setIdentifierSearchText('');
                    setManualIdInput(applicationId || '');
                    setModalAppFilter(applicationType);
                    setIsIdentifierModalOpen(true);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.selectorTriggerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons
                      name="id-card-outline"
                      size={18}
                      color={applicationId ? '#10b981' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.selectorTriggerValue,
                        {
                          color: applicationId ? colors.textPrimary : colors.textSecondary,
                          fontWeight: applicationId ? '800' : '500',
                          fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {applicationId || `اختر معرف ${DELIVERY_APPS.find((a) => a.key === applicationType)?.label.split(' ')[0] || ''}...`}
                    </Text>
                  </View>
                  <View style={[styles.selectorTriggerBadge, { backgroundColor: '#10b98120' }]}>
                    <Text style={[styles.selectorTriggerBadgeText, { color: '#10b981' }]}>
                      {applicationId ? 'تغيير' : 'اختيار'}
                    </Text>
                    <Ionicons name="search" size={13} color="#10b981" />
                  </View>
                </TouchableOpacity>
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

        {/* ========================================================================= */}
        {/* Sub-Modal 1: Motorcycle Plate Picker                                     */}
        {/* ========================================================================= */}
        <Modal
          visible={isPlateModalOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsPlateModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.pickerModalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Header */}
              <View
                style={[
                  styles.pickerModalHeader,
                  {
                    borderBottomColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View style={[styles.modalHeaderIconCircle, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="bicycle" size={20} color={colors.primary} />
                </View>
                <View style={[styles.pickerModalTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.pickerModalTitle, { color: colors.textPrimary }]}>
                    اختيار لوحة الدباب
                  </Text>
                  <Text style={[styles.pickerModalSubtitle, { color: colors.textSecondary }]}>
                    ابحث برقم اللوحة أو رقم المفتاح
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsPlateModalOpen(false)}
                  style={[styles.modalCloseCircle, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Search Bar */}
              <View style={styles.pickerModalSearchWrap}>
                <View
                  style={[
                    styles.searchBarInner,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons name="search" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[
                      styles.pickerModalSearchInput,
                      {
                        color: colors.textPrimary,
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                    value={plateSearchText}
                    onChangeText={setPlateSearchText}
                    placeholder="ابحث برقم اللوحة أو رقم المفتاح..."
                    placeholderTextColor={colors.textSecondary}
                    autoFocus={false}
                  />
                  {plateSearchText ? (
                    <TouchableOpacity onPress={() => setPlateSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Vehicles List */}
              <ScrollView
                style={styles.pickerModalScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {filteredVehicles.length === 0 ? (
                  <View style={styles.emptySearchWrap}>
                    <Ionicons name="search-outline" size={36} color={colors.textSecondary} />
                    <Text style={[styles.emptySearchTitle, { color: colors.textPrimary }]}>
                      لا توجد دبابات مطابقة للبحث
                    </Text>
                    <Text style={[styles.emptySearchSub, { color: colors.textSecondary }]}>
                      يمكنك كتابة رقم اللوحة يدويًا بالأسفل
                    </Text>
                  </View>
                ) : (
                  filteredVehicles.map((v) => {
                    const isSelected = motorcycleNumber === v.plate_number;
                    return (
                      <TouchableOpacity
                        key={v.id || v.plate_number}
                        style={[
                          styles.pickerCardItem,
                          {
                            backgroundColor: isSelected
                              ? colors.primary + '12'
                              : isDarkMode
                              ? '#1e293b60'
                              : '#f8fafc',
                            borderColor: isSelected ? colors.primary : colors.border,
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          },
                        ]}
                        onPress={() => {
                          setMotorcycleNumber(v.plate_number);
                          if (v.key_number) setKeyNumber(toEnglishDigits(v.key_number));
                          setIsPlateModalOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                          <Text style={[styles.plateCardText, { color: colors.textPrimary }]}>
                            {v.plate_number}
                          </Text>
                          <View style={[styles.cardMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            {v.key_number ? (
                              <View style={[styles.miniMetaBadge, { backgroundColor: '#f59e0b20' }]}>
                                <Text style={[styles.miniMetaText, { color: '#f59e0b' }]}>
                                  مفتاح {v.key_number}
                                </Text>
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

              {/* Manual Input Footer */}
              <View style={[styles.pickerModalFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.manualSectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  أو إدخال لوحة غير مسجلة بالأسطول يدويًا:
                </Text>
                <View style={[styles.manualInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TextInput
                    style={[
                      styles.manualInput,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                        borderColor: colors.border,
                        color: colors.textPrimary,
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                    value={manualPlateInput}
                    onChangeText={setManualPlateInput}
                    placeholder="مثلاً: 1234 أ ب ج"
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity
                    style={[
                      styles.manualApplyBtn,
                      {
                        backgroundColor: manualPlateInput.trim() ? colors.primary : colors.border,
                        opacity: manualPlateInput.trim() ? 1 : 0.6,
                      },
                    ]}
                    disabled={!manualPlateInput.trim()}
                    onPress={() => {
                      setMotorcycleNumber(manualPlateInput.trim());
                      setIsPlateModalOpen(false);
                    }}
                  >
                    <Text style={styles.manualApplyBtnText}>تطبيق اللوحة</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* ========================================================================= */}
        {/* Sub-Modal 2: Platform Identifier Picker                                  */}
        {/* ========================================================================= */}
        <Modal
          visible={isIdentifierModalOpen}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsIdentifierModalOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View
              style={[
                styles.pickerModalCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Header */}
              <View
                style={[
                  styles.pickerModalHeader,
                  {
                    borderBottomColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View style={[styles.modalHeaderIconCircle, { backgroundColor: '#10b98118' }]}>
                  <Ionicons name="id-card" size={20} color="#10b981" />
                </View>
                <View style={[styles.pickerModalTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.pickerModalTitle, { color: colors.textPrimary }]}>
                    اختيار معرف المندوب
                  </Text>
                  <Text style={[styles.pickerModalSubtitle, { color: colors.textSecondary }]}>
                    ابحث بالرقم أو الاسم لاختيار المعرف المسجل
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setIsIdentifierModalOpen(false)}
                  style={[styles.modalCloseCircle, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Platform Selector Filter Chips */}
              <View style={[styles.modalPlatformChipsWrap, { borderBottomColor: colors.border }]}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={[styles.modalPlatformScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                >
                  {[
                    { key: 'ALL', label: 'الكل' },
                    { key: 'keeta', label: 'كيتا (Keeta)' },
                    { key: 'ninja', label: 'نينجا (Ninja)' },
                    { key: 'hungerstation', label: 'هنقرستيشن' },
                    { key: 'jahez', label: 'جاهز' },
                    { key: 'toyou', label: 'تويو' },
                    { key: 'mrsool', label: 'مرسول' },
                  ].map((p) => {
                    const isSelected = modalAppFilter.toLowerCase() === p.key.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={p.key}
                        style={[
                          styles.miniFilterChip,
                          {
                            backgroundColor: isSelected ? '#10b981' : isDarkMode ? '#1e293b' : '#f1f5f9',
                            borderColor: isSelected ? '#10b981' : colors.border,
                          },
                        ]}
                        onPress={() => setModalAppFilter(p.key)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.miniFilterChipText,
                            { color: isSelected ? '#ffffff' : colors.textPrimary },
                          ]}
                        >
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Search Bar */}
              <View style={styles.pickerModalSearchWrap}>
                <View
                  style={[
                    styles.searchBarInner,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons name="search" size={18} color={colors.textSecondary} />
                  <TextInput
                    style={[
                      styles.pickerModalSearchInput,
                      {
                        color: colors.textPrimary,
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                    value={identifierSearchText}
                    onChangeText={setIdentifierSearchText}
                    placeholder="ابحث برقم المعرف أو الاسم..."
                    placeholderTextColor={colors.textSecondary}
                    autoFocus={false}
                  />
                  {identifierSearchText ? (
                    <TouchableOpacity onPress={() => setIdentifierSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>

              {/* Identifiers List */}
              <ScrollView
                style={styles.pickerModalScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={true}
              >
                {loadingIdentifiers ? (
                  <View style={styles.emptySearchWrap}>
                    <ActivityIndicator size="small" color="#10b981" />
                    <Text style={[styles.emptySearchSub, { color: colors.textSecondary, marginTop: 8 }]}>
                      جاري تحميل المعرفات...
                    </Text>
                  </View>
                ) : filteredIdentifiers.length === 0 ? (
                  <View style={styles.emptySearchWrap}>
                    <Ionicons name="folder-open-outline" size={36} color={colors.textSecondary} />
                    <Text style={[styles.emptySearchTitle, { color: colors.textPrimary }]}>
                      لا توجد معرفات مسجلة لهذه المنصة
                    </Text>
                    <Text style={[styles.emptySearchSub, { color: colors.textSecondary }]}>
                      يمكنك إدخال رقم المعرف يدويًا بالأسفل
                    </Text>
                  </View>
                ) : (
                  filteredIdentifiers.map((item) => {
                    const identifierVal = item.code || item.id;
                    const isSelected = applicationId === identifierVal;
                    const appName = item.app_name || '';
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.pickerCardItem,
                          {
                            backgroundColor: isSelected
                              ? '#10b98112'
                              : isDarkMode
                              ? '#1e293b60'
                              : '#f8fafc',
                            borderColor: isSelected ? '#10b981' : colors.border,
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          },
                        ]}
                        onPress={() => {
                          setApplicationId(identifierVal);
                          // Auto-select platform if matched
                          const appLow = appName.toLowerCase();
                          if (appLow.includes('ninja') || appLow.includes('نينجا')) {
                            setApplicationType('ninja');
                          } else if (appLow.includes('keeta') || appLow.includes('كيتا')) {
                            setApplicationType('keeta');
                          } else if (appLow.includes('hunger') || appLow.includes('هنقر')) {
                            setApplicationType('hungerstation');
                          } else if (appLow.includes('jahez') || appLow.includes('جاهز')) {
                            setApplicationType('jahez');
                          } else if (appLow.includes('toyou') || appLow.includes('تويو')) {
                            setApplicationType('toyou');
                          } else if (appLow.includes('mrsool') || appLow.includes('مرسول')) {
                            setApplicationType('mrsool');
                          }
                          setIsIdentifierModalOpen(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                          <Text style={[styles.idCardCodeText, { color: colors.textPrimary }]}>
                            {identifierVal}
                          </Text>
                          <View style={[styles.cardMetaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            {appName ? (
                              <View style={[styles.miniMetaBadge, { backgroundColor: '#10b98120' }]}>
                                <Text style={[styles.miniMetaText, { color: '#10b981' }]}>
                                  {appName}
                                </Text>
                              </View>
                            ) : null}
                            {item.name && item.name !== identifierVal ? (
                              <Text style={[styles.plateKmText, { color: colors.textSecondary }]} numberOfLines={1}>
                                {item.name}
                              </Text>
                            ) : null}
                            {item.branch ? (
                              <Text style={[styles.plateKmText, { color: colors.textSecondary }]}>
                                {item.branch}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <View
                          style={[
                            styles.checkCircle,
                            {
                              backgroundColor: isSelected ? '#10b981' : 'transparent',
                              borderWidth: isSelected ? 0 : 1.5,
                              borderColor: isSelected ? '#10b981' : colors.border,
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

              {/* Manual Input Footer */}
              <View style={[styles.pickerModalFooter, { borderTopColor: colors.border }]}>
                <Text style={[styles.manualSectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  أو إدخال رقم المعرف يدويًا:
                </Text>
                <View style={[styles.manualInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TextInput
                    style={[
                      styles.manualInput,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                        borderColor: colors.border,
                        color: colors.textPrimary,
                        textAlign: isRTL ? 'right' : 'left',
                        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                      },
                    ]}
                    value={manualIdInput}
                    onChangeText={setManualIdInput}
                    placeholder="أدخل رقم المعرف يدويًا..."
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TouchableOpacity
                    style={[
                      styles.manualApplyBtn,
                      {
                        backgroundColor: manualIdInput.trim() ? '#10b981' : colors.border,
                        opacity: manualIdInput.trim() ? 1 : 0.6,
                      },
                    ]}
                    disabled={!manualIdInput.trim()}
                    onPress={() => {
                      setApplicationId(toEnglishDigits(manualIdInput.trim()));
                      setIsIdentifierModalOpen(false);
                    }}
                  >
                    <Text style={styles.manualApplyBtnText}>تطبيق المعرف</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
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
  selectorTriggerBtn: {
    height: 48,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorTriggerContent: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  selectorTriggerValue: {
    fontSize: 13,
    flex: 1,
  },
  selectorTriggerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectorTriggerBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  pickerModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    borderTopWidth: 1,
  },
  pickerModalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  pickerModalTitleWrap: {
    flex: 1,
    gap: 2,
  },
  modalHeaderIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  pickerModalSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalCloseCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPlatformChipsWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  modalPlatformScroll: {
    gap: 8,
    paddingRight: 8,
  },
  miniFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  miniFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pickerModalSearchWrap: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchBarInner: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  pickerModalSearchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  pickerModalScroll: {
    paddingHorizontal: 14,
    maxHeight: 280,
  },
  pickerCardItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  plateCardText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  idCardCodeText: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardMetaRow: {
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  miniMetaBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  miniMetaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  plateKmText: {
    fontSize: 11,
    fontWeight: '600',
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySearchWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptySearchTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySearchSub: {
    fontSize: 12,
  },
  pickerModalFooter: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  manualSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  manualInputRow: {
    alignItems: 'center',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  manualApplyBtn: {
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualApplyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
