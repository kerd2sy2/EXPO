import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, PreviewPhotoData, Language } from '../../../types/delegate';
import { formatBikePlateForDisplay } from '../../../utils/plateUtils';
import { formatImageUrl } from '../../../services/api';

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
      {/* Header Banner */}
      <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.headerIconCircle}>
          <Ionicons name="flash" size={22} color="#f97316" />
        </View>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            {t.startShiftTitle || (isRTL ? 'تسجيل بدء الدوام' : 'Start Shift')}
          </Text>
          <Text style={[styles.cardSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {t.startKmRecorded || (isRTL ? 'تسجيل قراءة عداد البداية وتأكيد الدوام' : 'Record start odometer & start shift')}
          </Text>
        </View>
      </View>

      {/* Unified Start Shift Section */}
      <View style={styles.sectionContainer}>
        {/* Confirmed / Scanned Plate Summary Header */}
        <View style={[styles.confirmedPlateBanner, { backgroundColor: isDarkMode ? '#1e293b' : '#f0fdf4', borderColor: isDarkMode ? '#334155' : '#86efac', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="checkmark-circle" size={22} color="#16a34a" />
          <View style={{ flex: 1, marginHorizontal: 8 }}>
            <Text style={[styles.confirmedPlateLabel, { color: isDarkMode ? '#4ade80' : '#166534', textAlign: isRTL ? 'right' : 'left' }]}>
              {t.confirmedPlate || (isRTL ? 'لوحة الدباب المعتمدة' : 'Confirmed Plate')}:
            </Text>
            <Text style={[styles.confirmedPlateVal, { color: isDarkMode ? '#ffffff' : '#0f172a', textAlign: isRTL ? 'right' : 'left' }]}>
              {formatBikePlateForDisplay(enteredMotorcycle || (plateDigits ? `${plateDigits} ${plateLetters}` : ''), lang) || (t.pleaseScanPlate || (isRTL ? 'يرجى مسح اللوحة' : 'Please scan plate'))}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.editPlateBtn, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }]}
            onPress={onScanPlate}
            activeOpacity={0.7}
          >
            <Ionicons name="camera" size={14} color={colors.primary} />
            <Text style={[styles.editPlateBtnText, { color: colors.textPrimary, marginHorizontal: 4 }]}>
              {t.rescan || (isRTL ? 'إعادة مسح' : 'Rescan')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bike Matching Verification Badge */}
        {Boolean(assignedBike && enteredMotorcycle) && (
          <View
            style={[
              styles.verificationBadge,
              {
                backgroundColor: isBikeMatching ? 'rgba(34, 197, 94, 0.12)' : 'rgba(245, 158, 11, 0.12)',
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
                    ? (isDarkMode ? '#4ade80' : '#15803d')
                    : (isDarkMode ? '#fbbf24' : '#b45309'),
                  textAlign: isRTL ? 'right' : 'left',
                },
              ]}
            >
              {isBikeMatching
                ? (t.bikeMatchingSuccess || (isRTL ? 'مطابق للدباب المربوط بك بالنظام' : 'Matches assigned motorcycle'))
                : (t.bikeMismatchWarning || (isRTL ? 'تنبيه: الدباب مختلف عن المربوط بك' : 'Different bike from assigned'))}
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
                  ? (isRTL
                      ? 'دباب بديل معتمد: ستظهر استمارته بملفك وتختفي تلقائياً فور إنهاء الشفت'
                      : 'Authorized alternate bike: Registration appears in documents and vanishes upon shift end')
                  : (isRTL
                      ? 'الاستمارة الرسمية جاهزة ومتاحة بملفك في قسم الوثائق'
                      : 'Official registration ready in your profile documents')}
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

        {/* Odometer Section */}
        {isOdometerBroken ? (
          <View style={[styles.brokenOdometerCard, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : '#fef3c7', borderColor: '#f59e0b' }]}>
            <Ionicons name="warning" size={24} color="#d97706" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: isDarkMode ? '#fbbf24' : '#92400e', fontSize: 13, fontWeight: '700', textAlign: isRTL ? 'right' : 'left' }}>
                {t.odometerBrokenNotice || (isRTL ? 'عداد هذه المركبة معطل ومسجل كـ (تالف) بالنظام' : 'Odometer is recorded broken')}
              </Text>
              <Text style={{ color: isDarkMode ? '#fde68a' : '#b45309', fontSize: 11, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>
                {t.odometerExempt || (isRTL ? 'تم الإعفاء من قراءة العداد وتصويره' : 'Exempted from odometer photo')}
              </Text>
            </View>
          </View>
        ) : (
          <View style={{ marginTop: 10 }}>
            <View style={[styles.sectionLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="speedometer-outline" size={18} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                {t.startKmInputLabel || (isRTL ? 'قراءة عداد البداية (Start KM)' : 'Start KM')}
              </Text>
            </View>

            {/* Manual KM Input Box */}
            <View style={[styles.modernInputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="speedometer" size={20} color={colors.primary} />
              <TextInput
                style={[styles.modernTextInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t.startKmPlaceholder || '15400'}
                placeholderTextColor="#94a3b8"
                value={startKm}
                onChangeText={(val) => {
                  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                  setStartKm(val.replace(/[٠-٩]/g, (w) => `${arabicDigits.indexOf(w)}`));
                }}
                keyboardType="numeric"
              />
              <View style={[styles.unitBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.unitBadgeText, { color: colors.primary }]}>{t.km || 'كم'}</Text>
              </View>
            </View>

            {autoKmFetched && (
              <View style={[styles.autoFetchedNotice, { backgroundColor: colors.primaryLight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="information-circle" size={15} color={colors.primary} />
                <Text style={[styles.autoFetchedText, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.autoKmFetched || (isRTL ? 'تم جلب عداد نهاية الشفت السابق لهذا الدباب تلقائياً' : 'Auto-fetched last recorded KM')}
                </Text>
              </View>
            )}

            {/* Odometer Photo Capture Section */}
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.photoSectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.startKmPhotoLabel || (isRTL ? 'صورة عداد البداية (مطلوبة)' : 'Start Odometer Photo')}
              </Text>

              {startKmImage ? (
                <View style={[styles.photoPreviewCard, { borderColor: colors.primary, backgroundColor: colors.inputBg }]}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => onPreviewPhoto({ url: startKmImage, title: t.startKmPhotoLabel })}
                    style={styles.photoPreviewTouch}
                  >
                    <Image source={{ uri: startKmImage }} style={styles.photoPreviewImage} resizeMode="cover" />
                    <View style={[styles.photoZoomBadge, isRTL ? { left: 10 } : { right: 10 }]}>
                      <Ionicons name="expand-outline" size={14} color="#ffffff" />
                      <Text style={styles.photoZoomText}>{t.tapToViewPhoto || (isRTL ? 'معاينة مكبرة' : 'Preview')}</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.photoRetakeButton,
                      isRTL ? { right: 10 } : { left: 10 },
                      { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)' },
                    ]}
                    onPress={() => onTakeOdometerPhoto('start')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="camera-reverse-outline" size={16} color={colors.primary} />
                    <Text style={[styles.photoRetakeText, { color: colors.primary }]}>
                      {t.retakePhoto || (isRTL ? 'إعادة التصوير' : 'Retake')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.cameraCard, { backgroundColor: colors.inputBg, borderColor: colors.primary }]}
                  onPress={() => onTakeOdometerPhoto('start')}
                  activeOpacity={0.8}
                >
                  <View style={[styles.cameraIconWrap, { backgroundColor: colors.primary }]}>
                    <Ionicons name="camera" size={26} color="#ffffff" />
                  </View>
                  <Text style={[styles.cameraTitle, { color: colors.textPrimary }]}>
                    {t.captureCamera || (isRTL ? 'فتح الكاميرا وتصوير العداد' : 'Open Camera')}
                  </Text>
                  <Text style={[styles.cameraSubtitle, { color: colors.textSecondary }]}>
                    {t.odometerGuideSub || (isRTL ? 'وجّه الكاميرا نحو شاشة العداد وتأكد من وضوح الأرقام' : 'Point camera at odometer display')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Confirm Start Shift Action Button */}
        <TouchableOpacity
          style={[
            styles.actionSubmitBtn,
            {
              backgroundColor: canStartShift ? colors.primary : (isDarkMode ? '#334155' : '#cbd5e1'),
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
                {t.savingStartBtn || (isRTL ? 'جاري بدء الدوام وحفظ البيانات...' : 'Starting shift...')}
              </Text>
            </View>
          ) : (
            <View style={[styles.btnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="play" size={20} color="#ffffff" />
              <Text style={styles.btnText}>{t.confirmStartBtn || (isRTL ? 'تأكيد وبدء الدوام الآن' : 'Start Shift')}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  headerIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 3,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionLabelRow: {
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmedPlateBanner: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.2,
    marginBottom: 10,
  },
  confirmedPlateLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  confirmedPlateVal: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  editPlateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  editPlateBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  verificationBadge: {
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
    gap: 8,
  },
  verificationText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  brokenOdometerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  modernInputBox: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 10,
  },
  modernTextInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontWeight: '600',
  },
  unitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  unitBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  autoFetchedNotice: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
    gap: 6,
  },
  autoFetchedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  photoSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  cameraCard: {
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cameraTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  cameraSubtitle: {
    fontSize: 11,
    textAlign: 'center',
  },
  photoPreviewCard: {
    width: '100%',
    height: 195,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
  },
  photoPreviewTouch: {
    width: '100%',
    height: '100%',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  photoZoomBadge: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  photoZoomText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },
  photoRetakeButton: {
    position: 'absolute',
    top: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.4)',
    gap: 4,
  },
  photoRetakeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionSubmitBtn: {
    width: '100%',
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  btnRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  regCardVerifiedBadge: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.2,
    alignItems: 'center',
    gap: 8,
  },
  viewRegDocBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
});
