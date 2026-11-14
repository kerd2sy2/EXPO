import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, PreviewPhotoData, Language } from '../../../types/delegate';
import { formatBikePlateForDisplay } from '../../../utils/plateUtils';
import { formatImageUrl } from '../../../services/api';
import { ModuleErrorBoundary } from '../../../components/ModuleErrorBoundary';
import { startShiftStyles as styles } from './startShiftStyles';
import { StartShiftOdometerBlock } from './StartShiftOdometerBlock';

interface StartShiftSectionProps {
  enteredMotorcycle: string;
  plateDigits: string;
  plateLetters: string;
  assignedBike: string;
  isBikeMatching: boolean;
  isOdometerBroken: boolean;
  startKm: string;
  setStartKm: (val: string) => void;
  autoKmFetched: boolean;
  startKmImage: string | null;
  canStartShift: boolean;
  submitting: boolean;
  activeBikeRegistrationImage?: string | null;
  needsOilChange?: boolean;
  onOpenOilChangeModal?: () => void;
  onScanPlate?: () => void;
  onTakeOdometerPhoto: (type: 'start' | 'end') => Promise<void>;
  onStartShift: () => Promise<void>;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  lang?: Language;
}

export const StartShiftSection: React.FC<StartShiftSectionProps> = ({
  enteredMotorcycle,
  plateDigits,
  plateLetters,
  assignedBike,
  isBikeMatching,
  isOdometerBroken,
  startKm,
  setStartKm,
  autoKmFetched,
  startKmImage,
  canStartShift,
  submitting,
  activeBikeRegistrationImage,
  needsOilChange,
  onOpenOilChangeModal,
  onScanPlate,
  onTakeOdometerPhoto,
  onStartShift,
  onPreviewPhoto,
  colors,
  isDarkMode,
  isRTL,
  t,
  lang = 'ar',
}) => {
  return (
    <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.headerIconCircle}>
          <Ionicons name="flash" size={22} color="#0284c7" />
        </View>
        <View style={styles.headerTextWrap}>
          <Text
            style={[
              styles.cardTitle,
              { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {t.startShiftTitle || (isRTL ? 'تسجيل بدء الدوام' : 'Start Shift')}
          </Text>
          <Text
            style={[
              styles.cardSubtitle,
              { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {t.startKmRecorded ||
              (isRTL
                ? 'تسجيل قراءة عداد البداية وتأكيد الدوام'
                : 'Record start odometer & start shift')}
          </Text>
        </View>
      </View>

      <View style={styles.sectionContainer}>
        {/* Confirmed Plate Summary Header */}
        <ModuleErrorBoundary moduleName="لوحة الدباب المعتمدة" colors={colors}>
          <View
            style={[
              styles.confirmedPlateBanner,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#f0fdf4',
                borderColor: isDarkMode ? '#334155' : '#86efac',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text
                style={[
                  styles.confirmedPlateLabel,
                  {
                    color: isDarkMode ? '#4ade80' : '#166534',
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
              >
                {t.confirmedPlate || (isRTL ? 'لوحة الدباب المعتمدة' : 'Confirmed Plate')}:
              </Text>
              <Text
                style={[
                  styles.confirmedPlateVal,
                  { color: isDarkMode ? '#ffffff' : '#0f172a', textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {formatBikePlateForDisplay(
                  enteredMotorcycle || (plateDigits ? `${plateDigits} ${plateLetters}` : ''),
                  lang
                ) ||
                  t.pleaseScanPlate ||
                  (isRTL ? 'يرجى مسح اللوحة' : 'Please scan plate')}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.editPlateBtn,
                {
                  backgroundColor: isDarkMode ? '#334155' : '#e2e8f0',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                  alignItems: 'center',
                },
              ]}
              onPress={onScanPlate}
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={14} color={colors.primary} />
              <Text
                style={[styles.editPlateBtnText, { color: colors.textPrimary, marginHorizontal: 4 }]}
              >
                {t.rescan || (isRTL ? 'إعادة مسح' : 'Rescan')}
              </Text>
            </TouchableOpacity>
          </View>
        </ModuleErrorBoundary>

        {/* Bike Matching Verification Badge */}
        {Boolean(assignedBike && enteredMotorcycle) && (
          <View
            style={[
              styles.verificationBadge,
              {
                backgroundColor: isBikeMatching
                  ? 'rgba(34, 197, 94, 0.12)'
                  : 'rgba(245, 158, 11, 0.12)',
                borderColor: isBikeMatching ? '#22c55e' : '#f59e0b',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                marginBottom: 10,
              },
            ]}
          >
            <Ionicons
              name={isBikeMatching ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={isBikeMatching ? '#22c55e' : '#f59e0b'}
            />
            <Text
              style={[
                styles.verificationText,
                {
                  color: isBikeMatching
                    ? isDarkMode
                      ? '#4ade80'
                      : '#15803d'
                    : isDarkMode
                    ? '#fbbf24'
                    : '#b45309',
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
            >
              {isBikeMatching
                ? t.bikeMatchingSuccess ||
                  (isRTL ? 'مطابق للدباب المربوط بك بالنظام' : 'Matches assigned motorcycle')
                : t.bikeMismatchWarning ||
                  (isRTL ? 'تنبيه: الدباب مختلف عن المربوط بك' : 'Different bike from assigned')}
            </Text>
          </View>
        )}

        {/* Fleet Registration Card Verification Badge */}
        {Boolean(enteredMotorcycle && activeBikeRegistrationImage) && (
          <View
            style={[
              styles.regCardVerifiedBadge,
              {
                backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
                borderColor: isDarkMode ? '#059669' : '#a7f3d0',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                marginBottom: 10,
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={22} color="#10b981" />
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text
                style={{
                  color: isDarkMode ? '#6ee7b7' : '#065f46',
                  fontSize: 12,
                  fontWeight: '700',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {isRTL ? 'دباب معتمد بالأسطول - الاستمارة مربوطة' : 'Fleet Verified - Registration Linked'}
              </Text>
              <Text
                style={{
                  color: isDarkMode ? '#a7f3d0' : '#047857',
                  fontSize: 11,
                  marginTop: 2,
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {!isBikeMatching
                  ? isRTL
                    ? 'دباب بديل معتمد: ستظهر استمارته بملفك وتختفي تلقائياً فور إنهاء الشفت'
                    : 'Authorized alternate bike: Registration appears in documents and vanishes upon shift end'
                  : isRTL
                  ? 'الاستمارة الرسمية جاهزة ومتاحة بملفك في قسم الوثائق'
                  : 'Official registration ready in your profile documents'}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.viewRegDocBtn,
                {
                  backgroundColor: isDarkMode ? '#064e3b' : '#d1fae5',
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => {
                const fullUrl = formatImageUrl(activeBikeRegistrationImage);
                if (fullUrl) {
                  onPreviewPhoto({
                    url: fullUrl,
                    title: isRTL ? 'استمارة الدباب' : 'Motorcycle Registration',
                  });
                }
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={14} color="#10b981" />
              <Text style={{ color: '#059669', fontSize: 11, fontWeight: '700', marginHorizontal: 4 }}>
                {isRTL ? 'معاينة' : 'View'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Motorcycle Oil Change Warning Banner */}
        {Boolean(enteredMotorcycle && needsOilChange) && (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onOpenOilChangeModal}
            style={[
              styles.oilChangeWarningBadge,
              {
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.14)' : '#fef2f2',
                borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.4)' : '#fca5a5',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                marginBottom: 10,
              },
            ]}
          >
            <Ionicons name="alert-circle" size={22} color="#ef4444" />
            <View style={{ flex: 1, marginHorizontal: 8 }}>
              <Text
                style={{
                  color: isDarkMode ? '#fca5a5' : '#b91c1c',
                  fontSize: 12.5,
                  fontWeight: '800',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {t.oilChangeAlertTitle || (isRTL ? 'تغيير زيت الدباب مطلوب' : 'Oil Change Required')}
              </Text>
              <Text
                style={{
                  color: isDarkMode ? '#f87171' : '#dc2626',
                  fontSize: 11,
                  marginTop: 2,
                  fontWeight: '600',
                  textAlign: isRTL ? 'right' : 'left',
                }}
              >
                {t.oilChangeAlertMessage ||
                  (isRTL
                    ? 'ارجع الى المشرف لتغير زيت الدباب اولا'
                    : 'Please return to supervisor to change the motorcycle oil first')}
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#ef4444" />
          </TouchableOpacity>
        )}

        {/* Odometer Section */}
        <ModuleErrorBoundary moduleName="قراءة وصورة عداد البداية" colors={colors}>
          <StartShiftOdometerBlock
            isOdometerBroken={isOdometerBroken}
            startKm={startKm}
            setStartKm={setStartKm}
            autoKmFetched={autoKmFetched}
            startKmImage={startKmImage}
            onTakeOdometerPhoto={onTakeOdometerPhoto}
            onPreviewPhoto={onPreviewPhoto}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            t={t}
          />
        </ModuleErrorBoundary>

        {/* Confirm Start Shift Action Button */}
        <TouchableOpacity
          style={[
            styles.actionSubmitBtn,
            {
              backgroundColor: canStartShift
                ? colors.primary
                : isDarkMode
                ? '#334155'
                : '#cbd5e1',
              opacity: canStartShift && !submitting ? 1 : 0.65,
              marginTop: 20,
            },
          ]}
          onPress={onStartShift}
          disabled={!canStartShift || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <View style={[styles.btnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <ActivityIndicator color="#ffffff" size="small" />
              <Text style={[styles.btnText, { marginHorizontal: 8 }]}>
                {t.savingStartBtn ||
                  (isRTL ? 'جاري بدء الدوام وحفظ البيانات...' : 'Starting shift...')}
              </Text>
            </View>
          ) : (
            <View style={[styles.btnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="play" size={20} color="#ffffff" />
              <Text style={styles.btnText}>
                {t.confirmStartBtn || (isRTL ? 'تأكيد وبدء الدوام الآن' : 'Start Shift')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};
