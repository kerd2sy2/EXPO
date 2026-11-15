import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { DelegateWithStatus } from '../../../services/supervisor';
import { qrScannerStyles as styles } from './qrScannerStyles';

let CameraViewComponent: any = null;
let useCameraPermsHook: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const expoCam = require('expo-camera');
  CameraViewComponent = expoCam.CameraView;
  useCameraPermsHook = expoCam.useCameraPermissions;
} catch (err) {
  console.warn('[DelegateQrCameraStep] expo-camera unavailable:', err);
}

const BARCODE_SETTINGS = { barcodeTypes: ['qr', 'code128', 'code39', 'ean13'] };

interface DelegateQrCameraStepProps {
  visible: boolean;
  branchDelegates: DelegateWithStatus[];
  resolving: boolean;
  scanError: string;
  onBarcodeScanned: (rawData: string) => void;
  onSelectManualDelegate: (delegate: DelegateWithStatus) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

export const DelegateQrCameraStep: React.FC<DelegateQrCameraStepProps> = ({
  visible,
  branchDelegates,
  resolving,
  scanError,
  onBarcodeScanned,
  onSelectManualDelegate,
  colors,
  isDarkMode,
  isRTL,
}) => {
  const [torchOn, setTorchOn] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [fallbackGranted, setFallbackGranted] = useState<boolean | null>(null);
  const lastScannedRef = useRef<{ value: string; time: number }>({ value: '', time: 0 });

  const hookResult = useCameraPermsHook
    ? useCameraPermsHook()
    : [null, async () => ({ granted: false })];
  const camPermission = hookResult[0];
  const requestCamPermission = hookResult[1];

  useEffect(() => {
    if (!visible) return;
    setManualQuery('');
    setTorchOn(false);
    lastScannedRef.current = { value: '', time: 0 };

    if (requestCamPermission) {
      requestCamPermission()
        .then((res: any) => setFallbackGranted(Boolean(res?.granted)))
        .catch(() => {});
    } else {
      ImagePicker.requestCameraPermissionsAsync()
        .then((res) => setFallbackGranted(res.granted))
        .catch(() => setFallbackGranted(false));
    }
  }, [visible]);

  const hasPermission = camPermission?.granted ?? fallbackGranted;

  const handleRequestPermission = async () => {
    if (requestCamPermission) {
      const res = await requestCamPermission().catch(() => null);
      if (res) setFallbackGranted(Boolean(res.granted));
      return;
    }
    const res = await ImagePicker.requestCameraPermissionsAsync().catch(() => null);
    if (res) setFallbackGranted(res.granted);
  };

  const handleBarCodeRead = (event: { data?: string }) => {
    const raw = (event?.data || '').trim();
    if (!raw || resolving) return;
    const now = Date.now();
    if (lastScannedRef.current.value === raw && now - lastScannedRef.current.time < 2200) {
      return;
    }
    lastScannedRef.current = { value: raw, time: now };
    onBarcodeScanned(raw);
  };

  const manualMatches = useMemo(() => {
    const q = toEnglishDigits(manualQuery.trim()).toLowerCase();
    if (!q) return branchDelegates.slice(0, 6);
    return branchDelegates
      .filter((d) => {
        const name = (d.name || '').toLowerCase();
        const key = toEnglishDigits(d.key_number || '').toLowerCase();
        const nid = toEnglishDigits(d.national_id || '').toLowerCase();
        const phone = toEnglishDigits(d.phone || '').toLowerCase();
        const plate = toEnglishDigits(d.motorcycle_number || '').toLowerCase();
        return (
          name.includes(q) ||
          key.includes(q) ||
          nid.includes(q) ||
          phone.includes(q) ||
          plate.includes(q)
        );
      })
      .slice(0, 12);
  }, [branchDelegates, manualQuery]);

  return (
    <ScrollView
      contentContainerStyle={styles.bodyScroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Camera Viewport */}
      <View style={[styles.cameraCard, { borderColor: colors.primary + '55' }]}>
        {CameraViewComponent && hasPermission ? (
          <>
            <CameraViewComponent
              style={{ flex: 1 }}
              facing="back"
              enableTorch={torchOn}
              barcodeScannerSettings={BARCODE_SETTINGS}
              onBarcodeScanned={handleBarCodeRead}
            />
            <View style={styles.cameraOverlay} pointerEvents="box-none">
              <View style={styles.cameraTopRow}>
                <View style={styles.scanPill}>
                  {resolving ? (
                    <ActivityIndicator size="small" color="#38bdf8" />
                  ) : (
                    <Ionicons name="qr-code-outline" size={14} color="#38bdf8" />
                  )}
                  <Text style={styles.scanPillText}>
                    {resolving ? 'جاري التعرف على المندوب...' : 'وجّه الكاميرا نحو باركود المندوب'}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setTorchOn((v) => !v)}
                  style={styles.torchBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={torchOn ? 'flash' : 'flash-outline'}
                    size={19}
                    color={torchOn ? '#fbbf24' : '#ffffff'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.reticleWrap} pointerEvents="none">
                <View style={styles.reticleBox}>
                  <View style={[styles.cornerTL, { borderColor: colors.primary }]} />
                  <View style={[styles.cornerTR, { borderColor: colors.primary }]} />
                  <View style={[styles.cornerBL, { borderColor: colors.primary }]} />
                  <View style={[styles.cornerBR, { borderColor: colors.primary }]} />
                </View>
              </View>

              <View style={{ height: 12 }} />
            </View>
          </>
        ) : (
          <View style={styles.permissionCard}>
            <Ionicons name="camera-outline" size={42} color="#94a3b8" />
            <Text style={styles.permissionText}>
              {CameraViewComponent
                ? 'يرجى منح صلاحية الكاميرا لمسح رمز المندوب (QR)'
                : 'الكاميرا غير متوفرة في هذا الجهاز — يمكنك البحث عن المندوب يدوياً أدناه'}
            </Text>
            {CameraViewComponent && (
              <TouchableOpacity
                onPress={handleRequestPermission}
                style={[styles.permissionBtn, { backgroundColor: colors.primary }]}
                activeOpacity={0.85}
              >
                <Text style={styles.permissionBtnText}>تفعيل الكاميرا</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {scanError ? (
        <View
          style={[
            styles.errorBanner,
            {
              backgroundColor: isDarkMode ? 'rgba(239,68,68,0.14)' : '#fef2f2',
              borderColor: '#ef444460',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="alert-circle" size={18} color="#ef4444" />
          <Text style={[styles.errorText, { color: '#ef4444', textAlign: isRTL ? 'right' : 'left' }]}>
            {scanError}
          </Text>
        </View>
      ) : null}

      {/* Manual Fallback Quick Search */}
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            أو اختر المندوب يدوياً
          </Text>
          <View style={[styles.sectionBadge, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.sectionBadgeText, { color: colors.primary }]}>
              {branchDelegates.length} مندوب
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
          <TextInput
            value={manualQuery}
            onChangeText={setManualQuery}
            placeholder="ابحث بالاسم أو رقم المفتاح أو الجوال..."
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.searchInput,
              { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
            ]}
          />
          {manualQuery ? (
            <TouchableOpacity onPress={() => setManualQuery('')}>
              <Ionicons name="close-circle" size={17} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ gap: 8 }}>
          {manualMatches.map((emp) => (
            <TouchableOpacity
              key={emp.id}
              onPress={() => onSelectManualDelegate(emp)}
              activeOpacity={0.78}
              style={[
                styles.listItemRow,
                {
                  backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc',
                  borderColor: colors.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 2 }}>
                <Text style={[styles.itemPrimaryText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {emp.name}
                </Text>
                <Text style={[styles.itemSecondaryText, { color: colors.textSecondary }]} numberOfLines={1}>
                  {emp.key_number ? `مفتاح ${emp.key_number} • ` : ''}
                  {emp.motorcycle_number ? `دباب ${emp.motorcycle_number}` : 'بدون دباب'}
                </Text>
              </View>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
};
