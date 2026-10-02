import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EmployeeProfile, WorkSession, PreviewPhotoData, ThemeColors } from '../types/delegate';
import { SaudiMotorcyclePlate } from '../components/ui/SaudiMotorcyclePlate';

interface ShiftScreenProps {
  employee: EmployeeProfile | null;
  activeSession: WorkSession | null;
  enteredMotorcycle: string;
  setEnteredMotorcycle: (val: string) => void;
  startKm: string;
  setStartKm: (val: string) => void;
  autoKmFetched: boolean;
  isOdometerBroken?: boolean;
  startKmImage: string | null;
  startPlateImage?: string | null;
  isPlateConfirmed?: boolean;
  setIsPlateConfirmed?: (val: boolean) => void;
  startNotes?: string;
  setStartNotes?: (val: string) => void;
  endKm: string;
  setEndKm: (val: string) => void;
  endKmImage: string | null;
  ordersCount: string;
  setOrdersCount: (val: string) => void;
  fuelCost: string;
  setFuelCost: (val: string) => void;
  endNotes: string;
  setEndNotes: (val: string) => void;
  calculatedDistance: number;
  elapsedTime: string;
  onScrollToInput?: (yOffset: number) => void;
  submitting: boolean;
  onTakeOdometerPhoto: (type: 'start' | 'end') => Promise<void>;
  onScanPlate?: () => void;
  isScanningPlate?: boolean;
  onStartShift: () => Promise<void>;
  onEndShift: () => Promise<void>;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  formatTimeStr: (iso?: string) => string;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
}

// Helper to extract digits & letters from raw plate string
function parsePlateComponents(raw: string) {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const normalized = (raw || '').replace(/[٠-٩]/g, (w) => `${arabicDigits.indexOf(w)}`);
  const digitsMatch = normalized.match(/\d+/g);
  const digits = digitsMatch ? digitsMatch.join('') : '';
  const letters = normalized.replace(/[0-9٠-٩\-_/]/g, ' ').replace(/\s+/g, ' ').trim();
  return { digits, letters };
}

export const ShiftScreen: React.FC<ShiftScreenProps> = ({
  employee,
  activeSession,
  enteredMotorcycle,
  setEnteredMotorcycle,
  startKm,
  setStartKm,
  autoKmFetched,
  isOdometerBroken = false,
  startKmImage,
  startPlateImage,
  isPlateConfirmed = false,
  setIsPlateConfirmed,
  endKm,
  setEndKm,
  endKmImage,
  ordersCount,
  setOrdersCount,
  fuelCost,
  setFuelCost,
  endNotes,
  setEndNotes,
  calculatedDistance,
  elapsedTime,
  onScrollToInput,
  submitting,
  onTakeOdometerPhoto,
  onScanPlate,
  isScanningPlate = false,
  onStartShift,
  onEndShift,
  onPreviewPhoto,
  formatTimeStr,
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  const startKmNum = Number(activeSession?.start_km) || 0;
  const ordersInputRef = useRef<TextInput>(null);
  const fuelInputRef = useRef<TextInput>(null);
  const plateLettersRef = useRef<TextInput>(null);

  // Dual Plate Fields State (Digits & Letters) - only populated when plate photo is captured/confirmed
  const hasCapturedPhoto = Boolean(startPlateImage || isPlateConfirmed);
  const initialParsed = parsePlateComponents(hasCapturedPhoto ? (enteredMotorcycle || '') : '');
  const [plateDigits, setPlateDigits] = useState(initialParsed.digits);
  const [plateLetters, setPlateLetters] = useState(initialParsed.letters);

  // Synchronize internal plate fields when external enteredMotorcycle or startPlateImage changes
  useEffect(() => {
    if (startPlateImage || isPlateConfirmed) {
      const parsed = parsePlateComponents(enteredMotorcycle);
      setPlateDigits(parsed.digits);
      setPlateLetters(parsed.letters);
    } else {
      setPlateDigits('');
      setPlateLetters('');
    }
  }, [enteredMotorcycle, startPlateImage, isPlateConfirmed]);

  // Combine and update parent motorcycle state
  const handlePlateChange = (newDigits: string, newLetters: string) => {
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const cleanDigits = newDigits.replace(/[٠-٩]/g, (w) => `${arabicDigits.indexOf(w)}`).replace(/\D/g, '');
    const cleanLetters = newLetters.replace(/[0-9٠-٩]/g, '').trim();

    setPlateDigits(cleanDigits);
    setPlateLetters(cleanLetters);

    const combined = cleanLetters ? `${cleanDigits} ${cleanLetters}`.trim() : cleanDigits.trim();
    setEnteredMotorcycle(combined);
  };

  const isExemptOdometer = isOdometerBroken || (startKmNum === 0 && !activeSession?.start_km_image);

  const hasBikeNumber = Boolean(plateDigits.trim() || enteredMotorcycle.trim());
  const isPlateCaptured = Boolean(startPlateImage && hasBikeNumber);

  const canStartShift = isOdometerBroken
    ? hasBikeNumber
    : Boolean(
        hasBikeNumber &&
        startKm.trim() &&
        Number(startKm) > 0 &&
        startKmImage
      );

  const canEndShift = isExemptOdometer
    ? true
    : Boolean(
        endKm.trim() &&
        Number(endKm) >= startKmNum &&
        Number(endKm) > 0 &&
        endKmImage
      );

  // Verification matching against assigned motorcycle
  const assignedBike = employee?.motorcycle_number || '';
  const assignedParsed = parsePlateComponents(assignedBike);
  const isBikeMatching =
    Boolean(plateDigits) &&
    (assignedParsed.digits ? plateDigits === assignedParsed.digits : true) &&
    (assignedParsed.letters && plateLetters ? plateLetters === assignedParsed.letters : true);

  return (
    <View style={styles.tabContainer}>
      {!activeSession ? (
        /* =========================================================================
            START SHIFT FORM (Modern Progressive 2-Step Flow)
           ========================================================================= */
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
                {isRTL ? 'تسجيل قراءة عداد البداية وتأكيد الدوام' : 'Record start odometer & start shift'}
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
                  {isRTL ? 'لوحة الدباب المعتمدة:' : 'Confirmed Plate:'}
                </Text>
                <Text style={[styles.confirmedPlateVal, { color: isDarkMode ? '#ffffff' : '#0f172a', textAlign: isRTL ? 'right' : 'left' }]}>
                  {enteredMotorcycle || `${plateDigits} ${plateLetters}` || (isRTL ? 'يرجى مسح اللوحة' : 'Please scan plate')}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.editPlateBtn, { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0', flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }]}
                onPress={onScanPlate}
                activeOpacity={0.7}
              >
                <Ionicons name="camera" size={14} color={colors.primary} />
                <Text style={[styles.editPlateBtnText, { color: colors.textPrimary, marginHorizontal: 4 }]}>
                  {isRTL ? 'إعادة مسح' : 'Rescan'}
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
                          <Text style={styles.photoZoomText}>{isRTL ? 'معاينة مكبرة' : 'Preview'}</Text>
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
      ) : (
        /* =========================================================================
            END SHIFT FORM (Active Shift in Progress - Modernized)
           ========================================================================= */
        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Active Shift Live Status Card */}
          <View style={[styles.activeShiftLiveCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
            <View style={[styles.activeLiveHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.pulseDotWrap}>
                <View style={styles.pulseDot} />
                <Text style={[styles.liveStatusTitle, { color: '#22c55e' }]}>
                  {isRTL ? 'الدوام قيد التنفيذ حالياً' : 'Shift is Active'}
                </Text>
              </View>
              <View style={[styles.timerBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                <Ionicons name="time-outline" size={14} color="#22c55e" />
                <Text style={styles.timerBadgeText}>{elapsedTime}</Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', marginVertical: 6 }}>
              <SaudiMotorcyclePlate
                digits={parsePlateComponents(activeSession.motorcycle_number || employee?.motorcycle_number || '').digits}
                letters={parsePlateComponents(activeSession.motorcycle_number || employee?.motorcycle_number || '').letters}
                editable={false}
                isDarkMode={isDarkMode}
              />
            </View>

            <View style={[styles.liveSessionInfoGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.liveInfoItem}>
                <Text style={[styles.liveInfoLabel, { color: colors.textSecondary }]}>{isRTL ? 'رقم الدباب' : 'Bike'}</Text>
                <Text style={[styles.liveInfoValue, { color: colors.textPrimary }]}>
                  {activeSession.motorcycle_number || employee?.motorcycle_number || '-'}
                </Text>
              </View>

              <View style={styles.liveInfoDivider} />

              <View style={styles.liveInfoItem}>
                <Text style={[styles.liveInfoLabel, { color: colors.textSecondary }]}>{isRTL ? 'عداد البداية' : 'Start KM'}</Text>
                <Text style={[styles.liveInfoValue, { color: colors.textPrimary }]}>
                  {startKmNum > 0 ? `${startKmNum} كم` : (isRTL ? 'معفى' : 'Exempt')}
                </Text>
              </View>

              <View style={styles.liveInfoDivider} />

              <View style={styles.liveInfoItem}>
                <Text style={[styles.liveInfoLabel, { color: colors.textSecondary }]}>{isRTL ? 'وقت البدء' : 'Started'}</Text>
                <Text style={[styles.liveInfoValue, { color: colors.textPrimary }]}>
                  {formatTimeStr(activeSession.start_time)}
                </Text>
              </View>
            </View>
          </View>

          {/* 1. End KM Input & Photo Capture */}
          {isExemptOdometer ? (
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
            <View style={styles.sectionContainer}>
              <View style={[styles.sectionLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between' }]}>
                <View style={[styles.rowAligned, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="speedometer" size={18} color={colors.primary} />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    {t.endKmInputLabel || (isRTL ? 'قراءة عداد النهاية (End KM)' : 'End KM')}
                  </Text>
                </View>
                {startKmNum > 0 && (
                  <Text style={[styles.startRefText, { color: colors.textSecondary }]}>
                    {isRTL ? `عداد البداية: ${startKmNum} كم` : `Start: ${startKmNum} KM`}
                  </Text>
                )}
              </View>

              {/* End KM Input Box */}
              <View style={[styles.modernInputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="speedometer-outline" size={20} color={colors.primary} />
                <TextInput
                  style={[styles.modernTextInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={isRTL ? 'اكتب قراءة عداد النهاية...' : 'Enter end KM...'}
                  placeholderTextColor="#94a3b8"
                  value={endKm}
                  onChangeText={(val) => {
                    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
                    setEndKm(val.replace(/[٠-٩]/g, (w) => `${arabicDigits.indexOf(w)}`));
                  }}
                  keyboardType="numeric"
                  returnKeyType="next"
                  onSubmitEditing={() => ordersInputRef.current?.focus()}
                  onFocus={() => onScrollToInput?.(40)}
                />
                <View style={[styles.unitBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.unitBadgeText, { color: colors.primary }]}>{t.km || 'كم'}</Text>
                </View>
              </View>

              {calculatedDistance > 0 && (
                <View style={[styles.distanceBadge, { backgroundColor: 'rgba(56, 189, 248, 0.12)', borderColor: '#38bdf8', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="navigate-circle" size={16} color="#0284c7" />
                  <Text style={[styles.distanceBadgeText, { color: isDarkMode ? '#38bdf8' : '#0369a1' }]}>
                    {isRTL ? `المسافة المقطوعة المحسوبة: ${calculatedDistance} كم` : `Calculated Distance: ${calculatedDistance} KM`}
                  </Text>
                </View>
              )}

              {/* End KM Photo Capture */}
              <View style={{ marginTop: 14 }}>
                <Text style={[styles.photoSectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.endKmPhotoLabel || (isRTL ? 'صورة عداد النهاية (مطلوبة للإقفال)' : 'End Odometer Photo')}
                </Text>

                {endKmImage ? (
                  <View style={[styles.photoPreviewCard, { borderColor: colors.primary, backgroundColor: colors.inputBg }]}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => onPreviewPhoto({ url: endKmImage, title: t.endKmPhotoLabel })}
                      style={styles.photoPreviewTouch}
                    >
                      <Image source={{ uri: endKmImage }} style={styles.photoPreviewImage} resizeMode="cover" />
                      <View style={[styles.photoZoomBadge, isRTL ? { left: 10 } : { right: 10 }]}>
                        <Ionicons name="expand-outline" size={14} color="#ffffff" />
                        <Text style={styles.photoZoomText}>{isRTL ? 'معاينة مكبرة' : 'Preview'}</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.photoRetakeButton,
                        isRTL ? { right: 10 } : { left: 10 },
                        { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)' },
                      ]}
                      onPress={() => onTakeOdometerPhoto('end')}
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
                    onPress={() => onTakeOdometerPhoto('end')}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.cameraIconWrap, { backgroundColor: colors.primary }]}>
                      <Ionicons name="camera" size={26} color="#ffffff" />
                    </View>
                    <Text style={[styles.cameraTitle, { color: colors.textPrimary }]}>
                      {t.captureCamera || (isRTL ? 'فتح الكاميرا وتصوير عداد النهاية' : 'Capture End Odometer')}
                    </Text>
                    <Text style={[styles.cameraSubtitle, { color: colors.textSecondary }]}>
                      {t.odometerGuideSub || (isRTL ? 'وجّه الكاميرا نحو شاشة العداد وتأكد من وضوح الأرقام' : 'Point camera at odometer display')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* 2. Orders Delivered & Fuel Cost Stats */}
          <View style={styles.sectionContainer}>
            {/* Orders Count Input */}
            <View style={styles.formGroup}>
              <View style={[styles.sectionLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="package-variant-closed" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t.ordersCountLabel || (isRTL ? 'عدد الطلبات المنجزة' : 'Orders Completed')}
                </Text>
              </View>

              <View style={[styles.modernInputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="cube-outline" size={20} color={colors.primary} />
                <TextInput
                  ref={ordersInputRef}
                  style={[styles.modernTextInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="15"
                  placeholderTextColor="#94a3b8"
                  value={ordersCount}
                  onChangeText={setOrdersCount}
                  keyboardType="numeric"
                  returnKeyType="next"
                  onSubmitEditing={() => fuelInputRef.current?.focus()}
                  onFocus={() => onScrollToInput?.(100)}
                />
                <View style={[styles.unitBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.unitBadgeText, { color: colors.primary }]}>{t.ordersUnit || 'طلب'}</Text>
                </View>
              </View>
            </View>

            {/* Fuel Cost Input */}
            <View style={styles.formGroup}>
              <View style={[styles.sectionLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="gas-station" size={18} color="#eab308" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t.fuelCostLabel || (isRTL ? 'تكلفة الوقود (ر.س)' : 'Fuel Cost (SAR)')}
                </Text>
              </View>

              <View style={[styles.modernInputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="gas-station-outline" size={20} color="#eab308" />
                <TextInput
                  ref={fuelInputRef}
                  style={[styles.modernTextInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  value={fuelCost}
                  onChangeText={setFuelCost}
                  keyboardType="numeric"
                  returnKeyType="done"
                  onFocus={() => onScrollToInput?.(160)}
                />
                <View style={[styles.unitBadge, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                  <Text style={[styles.unitBadgeText, { color: '#ca8a04' }]}>{t.sar || 'ر.س'}</Text>
                </View>
              </View>
            </View>

            {/* End Notes Input (Optional) */}
            <View style={styles.formGroup}>
              <Text style={[styles.photoSectionLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.endNotesLabel || (isRTL ? 'ملاحظات ختامية (اختياري)' : 'End Notes (Optional)')}
              </Text>
              <View style={[styles.modernTextAreaBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <TextInput
                  style={[styles.modernTextAreaInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                  placeholder={t.endNotesPlaceholder || (isRTL ? 'أي ملاحظات حول الشفت أو الدباب...' : 'Any shift notes...')}
                  placeholderTextColor="#94a3b8"
                  value={endNotes}
                  onChangeText={setEndNotes}
                  multiline
                />
              </View>
            </View>
          </View>

          {/* 3. Confirm End Shift Button */}
          <TouchableOpacity
            style={[
              styles.actionSubmitBtn,
              {
                backgroundColor: canEndShift ? '#ef4444' : (isDarkMode ? '#334155' : '#cbd5e1'),
                opacity: canEndShift && !submitting ? 1 : 0.65,
              },
            ]}
            onPress={onEndShift}
            disabled={!canEndShift || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <View style={[styles.btnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <ActivityIndicator color="#ffffff" size="small" />
                <Text style={[styles.btnText, { marginHorizontal: 8 }]}>
                  {t.savingEndBtn || (isRTL ? 'جاري إنهاء الدوام وحفظ البيانات...' : 'Ending shift...')}
                </Text>
              </View>
            ) : (
              <View style={[styles.btnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="stop" size={20} color="#ffffff" />
                <Text style={styles.btnText}>{t.confirmEndBtn || (isRTL ? 'إنهاء الدوام وإرسال البيانات' : 'End Shift')}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    padding: 16,
  },
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
  rowAligned: {
    alignItems: 'center',
    gap: 8,
  },
  startRefText: {
    fontSize: 12,
    fontWeight: '600',
  },
  formGroup: {
    marginBottom: 14,
  },
  /* Authentic Saudi License Plate Frame */
  saudiPlateFrame: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  plateEmblemBar: {
    backgroundColor: '#16a34a',
    paddingVertical: 4,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  plateCountryAr: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  plateEmblemDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  plateCountryEn: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  plateInputsRow: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  plateBoxWrap: {
    flex: 1,
    alignItems: 'center',
  },
  plateBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  plateInputBox: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateInputDigits: {
    width: '100%',
    height: '100%',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 3,
  },
  plateInputLetters: {
    width: '100%',
    height: '100%',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
  },
  plateVerticalDivider: {
    width: 1.5,
    height: 48,
    marginHorizontal: 10,
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
  /* Modern Input Boxes */
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
  modernTextAreaBox: {
    height: 72,
    borderRadius: 14,
    borderWidth: 1.2,
    padding: 10,
  },
  modernTextAreaInput: {
    width: '100%',
    height: '100%',
    fontSize: 13,
    textAlignVertical: 'top',
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
  distanceBadge: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
    gap: 6,
  },
  distanceBadgeText: {
    fontSize: 12,
    fontWeight: '700',
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
  /* Camera & Photo Cards */
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
  /* Action Button */
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
  /* Active Shift Live Status Card */
  activeShiftLiveCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  activeLiveHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pulseDotWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
  },
  liveStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  timerBadgeText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  liveSessionInfoGrid: {
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.12)',
  },
  liveInfoItem: {
    alignItems: 'center',
  },
  liveInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  liveInfoValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  liveInfoDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
  /* Step 1 & Step 2 Buttons & Banners */
  stepButtonContainer: {
    width: '100%',
    marginTop: 12,
    gap: 8,
  },
  confirmPlateBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmPlateBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  retakePlateBtn: {
    width: '100%',
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  retakePlateBtnText: {
    fontSize: 13,
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
});
