import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { operationsApi, VehicleItem } from '../../../services/operations';
import { DelegateWithStatus, supervisorApi } from '../../../services/supervisor';
import { targetApi } from '../../../services/targetApi';
import { IdentifierPerformance } from '../../../types/target';
import { showBottomAlert } from '../ActionAlertBottomSheet';
import {
  DeliveryPlatformKey,
  normalizeAndFilterIdentifiers,
  normalizePlatformKey,
  toBackendAppName,
} from '../edit-employee/editEmployeeHelpers';
import { resolveScannedDelegate, subscribeDelegateQrScanner } from './qrScannerHelpers';
import { qrScannerStyles as styles } from './qrScannerStyles';
import { DelegateQrCameraStep } from './DelegateQrCameraStep';
import { DelegateQrLinkFormStep } from './DelegateQrLinkFormStep';

interface DelegateQrScannerModalProps {
  branchDelegates: DelegateWithStatus[];
  branchId?: string;
  onEmployeeUpdated: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

export const DelegateQrScannerModal: React.FC<DelegateQrScannerModalProps> = ({
  branchDelegates,
  branchId,
  onEmployeeUpdated,
  colors,
  isDarkMode,
  isRTL,
}) => {
  const [visible, setVisible] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scannedDelegate, setScannedDelegate] = useState<DelegateWithStatus | null>(null);

  const [vehicles, setVehicles] = useState<VehicleItem[]>([]);
  const [allIdentifiers, setAllIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const [selectedPlate, setSelectedPlate] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<DeliveryPlatformKey>('keeta');
  const [selectedIdentifier, setSelectedIdentifier] = useState('');
  const [saving, setSaving] = useState(false);

  const loadReferenceData = useCallback(async () => {
    try {
      setLoadingRefs(true);
      const [vehiclesList, idsList] = await Promise.all([
        operationsApi.getVehicles(branchId).catch(() => []),
        targetApi.listIdentifiers().catch(() => []),
      ]);
      if (Array.isArray(vehiclesList)) setVehicles(vehiclesList);
      if (Array.isArray(idsList)) setAllIdentifiers(idsList);
    } finally {
      setLoadingRefs(false);
    }
  }, [branchId]);

  useEffect(() => {
    return subscribeDelegateQrScanner(() => {
      setScannedDelegate(null);
      setScanError('');
      setSelectedPlate('');
      setSelectedPlatform('keeta');
      setSelectedIdentifier('');
      setVisible(true);
      loadReferenceData();
    });
  }, [loadReferenceData]);

  const applyDelegateDefaults = useCallback((delegate: DelegateWithStatus) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const normPlat = normalizePlatformKey(delegate.application_type);
    const defaultPlatform: DeliveryPlatformKey = normPlat !== 'unassigned' ? normPlat : 'keeta';
    setScannedDelegate(delegate);
    setScanError('');
    setSelectedPlate((delegate.motorcycle_number || '').trim());
    setSelectedPlatform(defaultPlatform);
    setSelectedIdentifier(toEnglishDigits((delegate.application_id || '').trim()));
  }, []);

  const handleBarcodeScanned = async (rawData: string) => {
    try {
      setResolving(true);
      setScanError('');
      const matched = await resolveScannedDelegate(rawData, branchDelegates);
      if (!matched) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        setScanError('لم يتم العثور على مندوب مطابق لهذا الرمز.');
        return;
      }
      applyDelegateDefaults(matched);
    } finally {
      setResolving(false);
    }
  };

  const handlePlatformChange = (platform: DeliveryPlatformKey) => {
    setSelectedPlatform(platform);
    if (!scannedDelegate) return;
    const origPlat = normalizePlatformKey(scannedDelegate.application_type);
    if (origPlat === platform) {
      setSelectedIdentifier(toEnglishDigits((scannedDelegate.application_id || '').trim()));
    } else {
      setSelectedIdentifier('');
    }
  };

  const handleClose = () => {
    if (saving) return;
    setVisible(false);
  };

  const handleSave = async () => {
    if (!scannedDelegate?.id) return;
    const cleanPlate = toEnglishDigits(selectedPlate.trim());
    const cleanId = toEnglishDigits(selectedIdentifier.trim());

    try {
      setSaving(true);
      const payload: Record<string, any> = {
        application_type: selectedPlatform,
      };
      if (cleanPlate) payload.motorcycle_number = cleanPlate;
      if (cleanId) payload.application_id = cleanId;

      await supervisorApi.updateEmployee(scannedDelegate.id, payload);

      // Register identifier in target list if manually entered and not already present
      if (cleanId) {
        const existingForPlat = normalizeAndFilterIdentifiers(
          allIdentifiers,
          selectedPlatform,
          '',
          branchDelegates
        );
        const alreadyExists = existingForPlat.some(
          (it) => toEnglishDigits(it.code).toLowerCase() === cleanId.toLowerCase()
        );
        if (!alreadyExists) {
          await targetApi
            .createIdentifier({
              name: cleanId,
              code: cleanId,
              app_name: toBackendAppName(selectedPlatform),
            })
            .catch(() => {});
        }
      }

      onEmployeeUpdated();
      setVisible(false);
      setTimeout(() => {
        showBottomAlert({
          type: 'success',
          title: 'تم حفظ الربط بنجاح',
          message: `تم تحديث بيانات (${scannedDelegate.name}) بنجاح.`,
        });
      }, 150);
    } catch (err: any) {
      showBottomAlert({
        type: 'error',
        title: 'تعذر الحفظ',
        message: err?.message || 'حدث خطأ أثناء تحديث ربط المندوب.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.pageContainer, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleClose}
            disabled={saving}
            style={[styles.headerBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
            activeOpacity={0.75}
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={[styles.headerTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              {scannedDelegate ? 'ربط بيانات المندوب' : 'مسح رمز المندوب (QR)'}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              {scannedDelegate
                ? 'اختر الدباب والتطبيق والمعرف ثم احفظ'
                : 'امسح باركود المندوب للربط السريع'}
            </Text>
          </View>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {!scannedDelegate ? (
            <DelegateQrCameraStep
              visible={visible}
              branchDelegates={branchDelegates}
              resolving={resolving}
              scanError={scanError}
              onBarcodeScanned={handleBarcodeScanned}
              onSelectManualDelegate={applyDelegateDefaults}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
            />
          ) : (
            <>
              <DelegateQrLinkFormStep
                delegate={scannedDelegate}
                vehicles={vehicles}
                allIdentifiers={allIdentifiers}
                branchDelegates={branchDelegates}
                loadingRefs={loadingRefs}
                selectedPlate={selectedPlate}
                onSelectPlate={setSelectedPlate}
                selectedPlatform={selectedPlatform}
                onSelectPlatform={handlePlatformChange}
                selectedIdentifier={selectedIdentifier}
                onSelectIdentifier={setSelectedIdentifier}
                onRescan={() => {
                  setScannedDelegate(null);
                  setScanError('');
                }}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
              />

              {/* Footer */}
              <View
                style={[
                  styles.footer,
                  {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={handleClose}
                  disabled={saving}
                  style={[
                    styles.cancelBtn,
                    { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border },
                  ]}
                  activeOpacity={0.78}
                >
                  <Text style={{ color: colors.textSecondary, fontWeight: '800', fontSize: 14 }}>إغلاق</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
                  activeOpacity={0.85}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="checkmark-done-circle-outline" size={20} color="#ffffff" />
                      <Text style={styles.saveBtnText}>حفظ الربط</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};
