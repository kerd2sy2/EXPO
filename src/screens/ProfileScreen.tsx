import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { EmployeeProfile, WorkSession, Language, ThemeColors, PreviewPhotoData } from '../types/delegate';
import { ActionAlertBottomSheet, AlertModalConfig } from '../components/modals/ActionAlertBottomSheet';
import { ChangePasswordModal } from '../components/modals/ChangePasswordModal';
import { AddPhoneBottomSheet } from '../components/modals/AddPhoneBottomSheet';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { formatBranchName } from '../utils/branchUtils';
import { formatBikePlateForDisplay } from '../utils/plateUtils';
import {
  isBiometricEnabled,
  setBiometricEnabled,
  saveLastCredentialsForBiometrics,
  getStoredToken,
  loadStoredToken,
  loadStoredRefreshToken,
} from '../services/api';
import { profileStyles as styles } from './profile/profileStyles';
import { buildProfileDocuments } from './profile/profileHelpers';
import { ProfileDocumentsDeck } from './profile/ProfileDocumentsDeck';
import { ProfileSettingsCard } from './profile/ProfileSettingsCard';
import { PhoneSuccessSheetModal } from './profile/PhoneSuccessSheetModal';

interface ProfileScreenProps {
  employee: EmployeeProfile;
  activeSession?: WorkSession | null;
  activeBikeRegistrationImage?: string | null;
  empPhotoUrl: string | null;
  lang: Language;
  onOpenQrModal: () => void;
  onOpenLangModal: () => void;
  onToggleTheme?: () => void;
  onCheckForUpdates: () => void;
  onOpenDiagnostics?: () => void;
  setParentScrollEnabled?: (enabled: boolean) => void;
  onLogout: () => void;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  onUpdateEmployee?: (updated: EmployeeProfile) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  employee,
  activeSession,
  activeBikeRegistrationImage,
  empPhotoUrl,
  lang,
  onOpenLangModal,
  onToggleTheme,
  onCheckForUpdates,
  onOpenDiagnostics,
  setParentScrollEnabled,
  onLogout,
  onPreviewPhoto,
  onUpdateEmployee,
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  const [currentEmp, setCurrentEmp] = useState<EmployeeProfile>(employee);
  const [showAddPhoneModal, setShowAddPhoneModal] = useState(false);

  useEffect(() => {
    setCurrentEmp(employee);
  }, [employee]);

  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhoneSuccessSheet, setShowPhoneSuccessSheet] = useState(false);
  const successSheetTranslateY = useRef(new Animated.Value(350)).current;
  const successSheetTimerRef = useRef<any>(null);

  const closePhoneSavedSheet = () => {
    if (successSheetTimerRef.current) clearTimeout(successSheetTimerRef.current);
    Animated.timing(successSheetTranslateY, {
      toValue: 350,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setShowPhoneSuccessSheet(false);
    });
  };

  const triggerPhoneSavedSheet = () => {
    setShowPhoneSuccessSheet(true);
    Animated.spring(successSheetTranslateY, {
      toValue: 0,
      bounciness: 4,
      speed: 14,
      useNativeDriver: true,
    }).start();

    if (successSheetTimerRef.current) clearTimeout(successSheetTimerRef.current);
    successSheetTimerRef.current = setTimeout(() => {
      closePhoneSavedSheet();
    }, 3500);
  };

  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsOn, setBiometricsOn] = useState(false);

  useEffect(() => {
    const checkBio = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (hasHardware && isEnrolled) {
          setBiometricsAvailable(true);
          const enabled = await isBiometricEnabled();
          setBiometricsOn(enabled);
        }
      } catch (e) {
        console.log('Biometric check error in Profile:', e);
      }
    };
    checkBio();
  }, []);

  const handleToggleBiometrics = async (val: boolean) => {
    if (val) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: t.biometricConfirmTitle || (isRTL ? 'تأكيد البصمة لتفعيل الدخول السريع' : 'Confirm Biometrics to Enable'),
          cancelLabel: t.cancelBtn || (isRTL ? 'إلغاء' : 'Cancel'),
          disableDeviceFallback: false,
        });
        if (result.success) {
          const token = getStoredToken() || (await loadStoredToken());
          const rToken = await loadStoredRefreshToken();
          const identifier =
            employee?.national_id ||
            employee?.phone ||
            (employee as any)?.username ||
            (employee as any)?.email ||
            employee?.id ||
            'supervisor';

          if (token && identifier) {
            await saveLastCredentialsForBiometrics(identifier, token, employee, rToken || undefined);
          }
          await setBiometricEnabled(true);
          setBiometricsOn(true);
          setAlertConfig({
            type: 'info',
            title: t.biometricEnabledTitle || (isRTL ? 'تم التفعيل بنجاح' : 'Enabled Successfully'),
            message: t.biometricEnabledMsg || (isRTL
              ? 'تم تفعيل الدخول بالبصمة بنجاح لهذا الجهاز.'
              : 'Biometric login has been activated on this device.'),
            primaryButtonText: t.okBtn || (isRTL ? 'حسناً' : 'OK'),
          });
        }
      } catch (e) {
        console.log('Biometric activation error:', e);
      }
    } else {
      await setBiometricEnabled(false);
      setBiometricsOn(false);
    }
  };

  const rawActiveBike = activeSession?.motorcycle_number || currentEmp.motorcycle_number;
  const activeBikeNumber = formatBikePlateForDisplay(rawActiveBike, lang);
  const currentVehicleRegImage = activeSession
    ? (activeBikeRegistrationImage || currentEmp.vehicle_registration_image)
    : currentEmp.vehicle_registration_image;

  const rawPhone = (
    currentEmp.phone ||
    (currentEmp as any).phone_number ||
    (currentEmp as any).mobile ||
    ''
  ).trim();
  const hasPhone = Boolean(rawPhone && rawPhone !== '' && rawPhone !== '—');

  const documents = buildProfileDocuments(
    currentEmp,
    activeBikeNumber,
    currentVehicleRegImage,
    isRTL,
    t
  );

  const tapCountRef = useRef(0);
  const lastTapRef = useRef(0);

  const handleAvatarTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 600) {
      tapCountRef.current += 1;
      if (tapCountRef.current >= 3) {
        tapCountRef.current = 0;
        if (onOpenDiagnostics) {
          onOpenDiagnostics();
        }
      }
    } else {
      tapCountRef.current = 1;
    }
    lastTapRef.current = now;
  };

  return (
    <View style={styles.tabContainer}>
      <ModuleErrorBoundary moduleName="بطاقة الملف الشخصي" colors={colors}>
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileAvatarSection}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleAvatarTap}
              style={[styles.profileAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            >
              {empPhotoUrl ? (
                <Image source={{ uri: empPhotoUrl }} style={styles.profileAvatarImg} />
              ) : (
                <Ionicons name="person" size={44} color={colors.primary} />
              )}
            </TouchableOpacity>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{currentEmp.name}</Text>
          </View>

          <View style={[styles.profileInfoList, { borderTopColor: colors.border }]}>
            <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.infoLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="card-outline" size={15} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t.nationalId}</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{currentEmp.national_id || '—'}</Text>
            </View>

            <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.infoLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="call-outline" size={15} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                  {t.phoneNumber || (isRTL ? 'رقم الهاتف' : 'Phone Number')}
                </Text>
              </View>

              {hasPhone ? (
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {rawPhone}
                </Text>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.addPhoneBadgeBtn,
                    {
                      backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.16)' : '#ecfdf5',
                      borderColor: '#10b981',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  onPress={() => setShowAddPhoneModal(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add-circle" size={16} color="#10b981" />
                  <Text style={styles.addPhoneBadgeText}>
                    {t.addPhone || (isRTL ? 'إضافة رقم' : 'Add Phone')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {currentEmp.branch_name && (
              <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.infoLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="business-outline" size={15} color={colors.textSecondary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t.branch}</Text>
                </View>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {formatBranchName(currentEmp.branch_name, lang)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="عرض الوثائق الرسمية" colors={colors}>
        <ProfileDocumentsDeck
          documents={documents}
          colors={colors}
          isRTL={isRTL}
          t={t}
          setParentScrollEnabled={setParentScrollEnabled}
          onPreviewPhoto={onPreviewPhoto}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="إعدادات الحساب والتطبيق" colors={colors}>
        <ProfileSettingsCard
          colors={colors}
          lang={lang}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          t={t}
          biometricsAvailable={biometricsAvailable}
          biometricsOn={biometricsOn}
          onOpenLangModal={onOpenLangModal}
          onToggleTheme={onToggleTheme}
          onToggleBiometrics={handleToggleBiometrics}
          onOpenPasswordModal={() => setShowPasswordModal(true)}
          onCheckForUpdates={onCheckForUpdates}
          onLogout={onLogout}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary
        moduleName="نوافذ تحديث الحساب"
        colors={colors}
        onReset={() => {
          setShowPasswordModal(false);
          setShowAddPhoneModal(false);
        }}
      >
        <ChangePasswordModal
          visible={showPasswordModal}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          t={t}
          onClose={() => setShowPasswordModal(false)}
          onSuccess={() => {
            setShowPasswordModal(false);
            setAlertConfig({
              type: 'success',
              title: t.passwordChangedSuccess,
              message: isRTL
                ? 'تم تحديث كلمة المرور الخاصة بك بنجاح، يمكنك استخدامها في المرات القادمة.'
                : 'Your account password has been updated successfully.',
              primaryButtonText: t.okBtn || 'حسناً',
              onPrimaryPress: () => setAlertConfig(null),
            });
          }}
        />

        <AddPhoneBottomSheet
          visible={showAddPhoneModal}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          t={t}
          onClose={() => setShowAddPhoneModal(false)}
          onSuccess={(newPhone, updatedEmp) => {
            setShowAddPhoneModal(false);
            const updated: EmployeeProfile = updatedEmp || { ...currentEmp, phone: newPhone };
            setCurrentEmp(updated);
            onUpdateEmployee?.(updated);
            triggerPhoneSavedSheet();
          }}
        />

        <PhoneSuccessSheetModal
          visible={showPhoneSuccessSheet}
          translateY={successSheetTranslateY}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          t={t}
          onClose={closePhoneSavedSheet}
        />

        <ActionAlertBottomSheet
          config={alertConfig}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onClose={() => setAlertConfig(null)}
        />
      </ModuleErrorBoundary>
    </View>
  );
};
