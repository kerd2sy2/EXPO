import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { parsePlateComponents, toEnglishDigits } from '@shared/utils/plateUtils';
import { DelegateWithStatus, supervisorApi } from '../../services/supervisor';
import { VehicleItem } from '../../services/operations';
import { targetApi } from '../../services/targetApi';
import { IdentifierPerformance } from '../../types/target';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { showBottomAlert } from './ActionAlertBottomSheet';
import {
  filterVehiclesByQuery,
  normalizeAndFilterIdentifiers,
} from './edit-employee/editEmployeeHelpers';
import { editEmployeeStyles as styles } from './edit-employee/editEmployeeStyles';
import { EmployeeEditFormBody } from './edit-employee/EmployeeEditFormBody';
import { EmployeePlatePickerOverlay } from './edit-employee/EmployeePlatePickerOverlay';
import { EmployeeIdentifierPickerOverlay } from './edit-employee/EmployeeIdentifierPickerOverlay';

export interface EditEmployeeModalProps {
  visible: boolean;
  employee: DelegateWithStatus | null;
  vehicles: VehicleItem[];
  onClose: () => void;
  onSuccess: (updatedEmp?: any) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

/** Full-screen modal for editing a delegate's profile, vehicle, platform ID, and password. */
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

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const [isPlateModalOpen, setIsPlateModalOpen] = useState(false);
  const [plateSearchText, setPlateSearchText] = useState('');
  const [manualPlateInput, setManualPlateInput] = useState('');

  const [isIdentifierModalOpen, setIsIdentifierModalOpen] = useState(false);
  const [identifierSearchText, setIdentifierSearchText] = useState('');
  const [manualIdInput, setManualIdInput] = useState('');
  const [allIdentifiers, setAllIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [loadingIdentifiers, setLoadingIdentifiers] = useState(false);
  const [modalAppFilter, setModalAppFilter] = useState<string>('ALL');

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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

  const filteredVehicles = useMemo(
    () => filterVehiclesByQuery(vehicles, plateSearchText),
    [vehicles, plateSearchText]
  );

  const filteredIdentifiers = useMemo(
    () => normalizeAndFilterIdentifiers(allIdentifiers, modalAppFilter, identifierSearchText),
    [allIdentifiers, modalAppFilter, identifierSearchText]
  );

  const plateComponents = useMemo(() => parsePlateComponents(motorcycleNumber || ''), [motorcycleNumber]);

  const handleSave = async () => {
    if (!employee?.id) return;
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('يرجى إدخال اسم الموظف');
      showBottomAlert({ type: 'warning', title: 'بيانات ناقصة', message: 'يرجى إدخال اسم الموظف قبل الحفظ.' });
      return;
    }
    if (!nationalId.trim()) {
      setErrorMsg('يرجى إدخال رقم الهوية أو الإقامة');
      showBottomAlert({ type: 'warning', title: 'بيانات ناقصة', message: 'يرجى إدخال رقم الهوية أو الإقامة.' });
      return;
    }
    if (showPasswordSection && newPassword.trim() && newPassword.trim().length < 4) {
      showBottomAlert({ type: 'warning', title: 'تنبيه كلمة المرور', message: 'كلمة المرور الجديدة يجب ألا تقل عن 4 خانات.' });
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

      if (showPasswordSection && newPassword.trim().length >= 4) {
        await supervisorApi.resetEmployeePassword(employee.id, newPassword.trim()).catch((err) => {
          console.warn('[EditEmployeePage] reset password error:', err);
        });
      }

      onSuccess(res?.data || { ...employee, ...payload });
      onClose();
      setTimeout(() => {
        showBottomAlert({ type: 'success', title: 'تم الحفظ بنجاح', message: `تم تحديث بيانات الموظف (${name.trim()}) بنجاح.` });
      }, 150);
    } catch (err: any) {
      const msg = err?.message || 'حدث خطأ أثناء حفظ التعديلات';
      setErrorMsg(msg);
      showBottomAlert({ type: 'error', title: 'فشل الحفظ', message: msg });
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !employee) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={[styles.pageContainer, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

        <View style={[styles.pageHeader, { backgroundColor: colors.card, borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            onPress={onClose}
            disabled={saving}
            style={[styles.backBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
            activeOpacity={0.7}
          >
            <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={[styles.headerTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>ملف وتعديل بيانات الموظف</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {employee.name} {keyNumber ? `• مفتاح رقم ${keyNumber}` : ''}
            </Text>
          </View>

          {keyNumber ? (
            <View style={[styles.keyHeaderBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
              <Ionicons name="key" size={14} color={colors.primary} />
              <Text style={[styles.keyHeaderBadgeText, { color: colors.primary }]}>{keyNumber}</Text>
            </View>
          ) : null}
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ModuleErrorBoundary moduleName="EmployeeEditFormBody" colors={colors}>
            <EmployeeEditFormBody
              errorMsg={errorMsg}
              name={name}
              setName={setName}
              phone={phone}
              setPhone={setPhone}
              nationalId={nationalId}
              setNationalId={setNationalId}
              employeeNumber={employeeNumber}
              setEmployeeNumber={setEmployeeNumber}
              iqamaExpirationDate={iqamaExpirationDate}
              setIqamaExpirationDate={setIqamaExpirationDate}
              jobRole={jobRole}
              setJobRole={setJobRole}
              shift={shift}
              setShift={setShift}
              vehicleType={vehicleType}
              setVehicleType={setVehicleType}
              motorcycleNumber={motorcycleNumber}
              setMotorcycleNumber={setMotorcycleNumber}
              keyNumber={keyNumber}
              setKeyNumber={setKeyNumber}
              plateComponents={plateComponents}
              onOpenPlatePicker={() => {
                setPlateSearchText('');
                setManualPlateInput(motorcycleNumber || '');
                setIsPlateModalOpen(true);
              }}
              applicationType={applicationType}
              onSelectDeliveryApp={(key) => {
                setApplicationType(key);
                setModalAppFilter(key);
              }}
              applicationId={applicationId}
              setApplicationId={setApplicationId}
              onOpenIdentifierPicker={() => {
                setIdentifierSearchText('');
                setManualIdInput(applicationId || '');
                setModalAppFilter(applicationType);
                setIsIdentifierModalOpen(true);
              }}
              showPasswordSection={showPasswordSection}
              setShowPasswordSection={setShowPasswordSection}
              newPassword={newPassword}
              setNewPassword={setNewPassword}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
            />
          </ModuleErrorBoundary>

          <View style={[styles.pageFooter, { backgroundColor: colors.card, borderTopColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}
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

        <EmployeePlatePickerOverlay
          visible={isPlateModalOpen}
          vehicles={filteredVehicles}
          motorcycleNumber={motorcycleNumber}
          plateSearchText={plateSearchText}
          manualPlateInput={manualPlateInput}
          onChangeSearch={setPlateSearchText}
          onChangeManual={setManualPlateInput}
          onSelectVehicle={(v) => {
            setMotorcycleNumber(v.plate_number);
            if (v.key_number) setKeyNumber(toEnglishDigits(v.key_number));
            setIsPlateModalOpen(false);
          }}
          onApplyManual={(plate) => {
            setMotorcycleNumber(plate);
            setIsPlateModalOpen(false);
          }}
          onClose={() => setIsPlateModalOpen(false)}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />

        <EmployeeIdentifierPickerOverlay
          visible={isIdentifierModalOpen}
          loadingIdentifiers={loadingIdentifiers}
          filteredIdentifiers={filteredIdentifiers}
          applicationId={applicationId}
          modalAppFilter={modalAppFilter}
          identifierSearchText={identifierSearchText}
          manualIdInput={manualIdInput}
          onChangeAppFilter={setModalAppFilter}
          onChangeSearch={setIdentifierSearchText}
          onChangeManual={setManualIdInput}
          onSelectIdentifier={(item) => {
            setApplicationId(item.code || item.driverName);
            setApplicationType(item.appKey);
            setIsIdentifierModalOpen(false);
          }}
          onApplyManual={(val) => {
            setApplicationId(val);
            setIsIdentifierModalOpen(false);
          }}
          onClose={() => setIsIdentifierModalOpen(false)}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      </SafeAreaView>
    </Modal>
  );
};
