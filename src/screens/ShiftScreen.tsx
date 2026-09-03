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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EmployeeProfile, WorkSession, PreviewPhotoData, ThemeColors } from '../types/delegate';

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
  startNotes: string;
  setStartNotes: (val: string) => void;
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
  gpsDistance?: number;
  onScrollToInput?: (yOffset: number) => void;
  submitting: boolean;
  onTakeOdometerPhoto: (type: 'start' | 'end') => Promise<void>;
  onStartShift: () => Promise<void>;
  onEndShift: () => Promise<void>;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  formatTimeStr: (iso?: string) => string;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
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
  startNotes,
  setStartNotes,
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
  gpsDistance = 0,
  onScrollToInput,
  submitting,
  onTakeOdometerPhoto,
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
  const ordersInputRef = React.useRef<TextInput>(null);
  const fuelInputRef = React.useRef<TextInput>(null);

  // Calculate elapsed hours from start_time
  const elapsedHours = React.useMemo(() => {
    if (!activeSession?.start_time) return 1;
    const startMs = new Date(activeSession.start_time).getTime();
    const nowMs = Date.now();
    const diffHours = (nowMs - startMs) / (1000 * 60 * 60);
    return Math.max(0.5, Math.min(24, diffHours));
  }, [activeSession?.start_time]);

  // Estimated distance based on GPS (if active) or orders count / hours
  const ordersNum = Number(ordersCount) || 0;
  const estimatedKm = React.useMemo(() => {
    if (gpsDistance > 0) {
      return Math.round(gpsDistance);
    }
    if (ordersNum > 0) {
      return Math.round(ordersNum * 4.2);
    }
    return Math.round(elapsedHours * 14);
  }, [gpsDistance, ordersNum, elapsedHours]);

  const gpsEndKm = startKmNum + Math.round(gpsDistance);
  const suggestedEndKm = startKmNum + estimatedKm;

  return (
    <View style={styles.tabContainer}>
      {!activeSession ? (
        /* =========================================================================
            START SHIFT FORM
           ========================================================================= */
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.cardHeaderWithBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.startShiftSub}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Text style={[styles.statusBadgeText, { color: colors.primaryText }]}>
                {t.readyToStart}
              </Text>
            </View>
          </View>

          {/* Motorcycle Number Input */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t.actualBikeNumber}
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="bike" size={20} color={colors.primary} />
              <TextInput
                style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t.actualBikePlaceholder}
                placeholderTextColor="#94a3b8"
                value={enteredMotorcycle}
                onChangeText={setEnteredMotorcycle}
                autoCapitalize="characters"
              />
            </View>
            {enteredMotorcycle.trim() && employee?.motorcycle_number && (
              <View style={[styles.bikeVerificationBox, { backgroundColor: enteredMotorcycle.trim().toUpperCase() === employee.motorcycle_number.toUpperCase() ? '#dcfce7' : '#fef3c7', borderColor: enteredMotorcycle.trim().toUpperCase() === employee.motorcycle_number.toUpperCase() ? '#22c55e' : '#f59e0b' }]}>
                <Ionicons
                  name={enteredMotorcycle.trim().toUpperCase() === employee.motorcycle_number.toUpperCase() ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={enteredMotorcycle.trim().toUpperCase() === employee.motorcycle_number.toUpperCase() ? '#16a34a' : '#d97706'}
                />
                <Text style={[styles.bikeVerificationText, { color: enteredMotorcycle.trim().toUpperCase() === employee.motorcycle_number.toUpperCase() ? '#15803d' : '#b45309', textAlign: isRTL ? 'right' : 'left' }]}>
                  {enteredMotorcycle.trim().toUpperCase() === employee.motorcycle_number.toUpperCase()
                    ? t.bikeMatchingSuccess
                    : t.bikeMismatchWarning}
                </Text>
              </View>
            )}
          </View>

          {/* Start KM Input & Photo or Broken Odometer Notice */}
          {isOdometerBroken ? (
            <View style={[styles.bikeVerificationBox, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', borderColor: '#f59e0b', padding: 14, borderRadius: 14, marginBottom: 14 }]}>
              <Ionicons name="warning" size={22} color="#d97706" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: isDarkMode ? '#fbbf24' : '#92400e', fontSize: 13, fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>
                  {t.odometerBrokenNotice}
                </Text>
                <Text style={{ color: isDarkMode ? '#fde68a' : '#b45309', fontSize: 11, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>
                  {t.odometerExempt} ✅
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* Start KM Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.startKmLabel}
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="speedometer-outline" size={20} color={colors.primary} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={t.startKmPlaceholder}
                    placeholderTextColor="#94a3b8"
                    value={startKm}
                    onChangeText={setStartKm}
                    keyboardType="numeric"
                  />
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t.km}</Text>
                </View>
                {autoKmFetched && (
                  <View style={[styles.badgeHint, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="information-circle" size={14} color={colors.primary} />
                    <Text style={[styles.badgeHintText, { color: colors.primary }]}>{t.autoKmFetched}</Text>
                  </View>
                )}
              </View>

              {/* Start KM Photo Capture Box */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.startKmPhotoLabel}
                </Text>
                {startKmImage ? (
                  <View style={[styles.photoPreviewCard, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <TouchableOpacity
                      onPress={() => onPreviewPhoto({ url: startKmImage, title: t.startKmPhotoLabel })}
                      style={styles.photoPreviewTouch}
                    >
                      <Image source={{ uri: startKmImage }} style={styles.photoThumbnail} resizeMode="cover" />
                      <View style={styles.photoPreviewMeta}>
                        <Text style={[styles.photoPreviewTitle, { color: colors.textPrimary }]}>
                          {t.photoCapturedSuccess}
                        </Text>
                        <Text style={[styles.photoPreviewSub, { color: colors.primary }]}>
                          {t.tapToViewPhoto}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.retakeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => onTakeOdometerPhoto('start')}
                    >
                      <Ionicons name="camera-reverse-outline" size={16} color={colors.primary} />
                      <Text style={[styles.retakeBtnText, { color: colors.primary }]}>{t.retakePhoto}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.cameraCaptureCard, { backgroundColor: colors.inputBg, borderColor: colors.primary }]}
                    onPress={() => onTakeOdometerPhoto('start')}
                  >
                    <View style={[styles.cameraIconWrap, { backgroundColor: colors.primary }]}>
                      <Ionicons name="camera" size={24} color="#ffffff" />
                    </View>
                    <Text style={[styles.cameraCardTitle, { color: colors.textPrimary }]}>
                      {t.captureCamera}
                    </Text>
                    <Text style={[styles.cameraCardSub, { color: colors.textSecondary }]}>
                      {t.odometerGuideSub}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* Start Notes */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t.startNotesLabel}
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, height: 68, alignItems: 'flex-start', paddingTop: 8 }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t.startNotesPlaceholder}
                placeholderTextColor="#94a3b8"
                value={startNotes}
                onChangeText={setStartNotes}
                multiline
              />
            </View>
          </View>

          {/* Start Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 8 }]}
            onPress={onStartShift}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="play" size={20} color="#ffffff" />
                <Text style={styles.primaryButtonText}>{t.confirmStartBtn}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* =========================================================================
            END SHIFT FORM (Active Shift in Progress)
           ========================================================================= */
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* End KM Input & Photo or Broken Odometer Notice */}
          {isOdometerBroken || (startKmNum === 0 && !activeSession.start_km_image) ? (
            <View style={[styles.bikeVerificationBox, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7', borderColor: '#f59e0b', padding: 14, borderRadius: 14, marginBottom: 14 }]}>
              <Ionicons name="warning" size={22} color="#d97706" />
              <View style={{ flex: 1 }}>
                <Text style={{ color: isDarkMode ? '#fbbf24' : '#92400e', fontSize: 13, fontWeight: 'bold', textAlign: isRTL ? 'right' : 'left' }}>
                  {t.odometerBrokenNotice}
                </Text>
                <Text style={{ color: isDarkMode ? '#fde68a' : '#b45309', fontSize: 11, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>
                  {t.odometerExempt} ✅
                </Text>
              </View>
            </View>
          ) : (
            <>
              {/* End KM Input with Inline Smart Suggestion */}
              <View style={styles.formGroup}>
                <View style={[styles.labelRow, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                  <Text style={[styles.label, { color: colors.textPrimary, marginBottom: 0 }]}>
                    {t.endKmInputLabel}
                  </Text>
                  {startKmNum > 0 && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: '600' }}>
                      {t.startKmLabel}: {startKmNum} {t.km}
                    </Text>
                  )}
                </View>

                <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="speedometer-outline" size={20} color={colors.primary} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={isRTL ? `المقترح: ${gpsDistance > 0 ? gpsEndKm : suggestedEndKm}` : `Suggested: ${gpsDistance > 0 ? gpsEndKm : suggestedEndKm}`}
                    placeholderTextColor="#94a3b8"
                    value={endKm}
                    onChangeText={setEndKm}
                    keyboardType="numeric"
                    returnKeyType="next"
                    blurOnSubmit={false}
                    onSubmitEditing={() => ordersInputRef.current?.focus()}
                    onFocus={() => onScrollToInput?.(40)}
                  />
                  {startKmNum > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.insideInputBtn,
                        {
                          backgroundColor: gpsDistance > 0
                            ? (isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5')
                            : colors.primaryLight,
                          borderColor: gpsDistance > 0 ? '#10b981' : colors.primary,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                      onPress={() => setEndKm(String(gpsDistance > 0 ? gpsEndKm : suggestedEndKm))}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={gpsDistance > 0 ? 'navigate' : 'flash'}
                        size={13}
                        color={gpsDistance > 0 ? '#10b981' : colors.primary}
                      />
                      <Text
                        style={[
                          styles.insideInputBtnText,
                          { color: gpsDistance > 0 ? (isDarkMode ? '#34d399' : '#047857') : colors.primary },
                        ]}
                      >
                        {t.suggestedKm || (isRTL ? 'المقترح' : 'Suggest')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t.km}</Text>
                </View>
              </View>

              {/* End KM Photo Capture Box */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.endKmPhotoLabel}
                </Text>
                {endKmImage ? (
                  <View style={[styles.photoPreviewCard, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <TouchableOpacity
                      onPress={() => onPreviewPhoto({ url: endKmImage, title: t.endKmPhotoLabel })}
                      style={styles.photoPreviewTouch}
                    >
                      <Image source={{ uri: endKmImage }} style={styles.photoThumbnail} resizeMode="cover" />
                      <View style={styles.photoPreviewMeta}>
                        <Text style={[styles.photoPreviewTitle, { color: colors.textPrimary }]}>
                          {t.photoCapturedSuccess}
                        </Text>
                        <Text style={[styles.photoPreviewSub, { color: colors.primary }]}>
                          {t.tapToViewPhoto}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.retakeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => onTakeOdometerPhoto('end')}
                    >
                      <Ionicons name="camera-reverse-outline" size={16} color={colors.primary} />
                      <Text style={[styles.retakeBtnText, { color: colors.primary }]}>{t.retakePhoto}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.cameraCaptureCard, { backgroundColor: colors.inputBg, borderColor: colors.primary }]}
                    onPress={() => onTakeOdometerPhoto('end')}
                  >
                    <View style={[styles.cameraIconWrap, { backgroundColor: colors.primary }]}>
                      <Ionicons name="camera" size={24} color="#ffffff" />
                    </View>
                    <Text style={[styles.cameraCardTitle, { color: colors.textPrimary }]}>
                      {t.captureCamera}
                    </Text>
                    <Text style={[styles.cameraCardSub, { color: colors.textSecondary }]}>
                      {t.odometerGuideSub}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          )}

          {/* Orders Count Input */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t.ordersCountLabel}
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="package-variant-closed" size={20} color={colors.primary} />
              <TextInput
                ref={ordersInputRef}
                style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t.ordersCountPlaceholder}
                placeholderTextColor="#94a3b8"
                value={ordersCount}
                onChangeText={setOrdersCount}
                keyboardType="numeric"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => fuelInputRef.current?.focus()}
                onFocus={() => onScrollToInput?.(100)}
              />
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t.ordersUnit}</Text>
            </View>
          </View>

          {/* Fuel Cost Input */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t.fuelCostLabel}
            </Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <MaterialCommunityIcons name="gas-station" size={20} color="#eab308" />
              <TextInput
                ref={fuelInputRef}
                style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder={t.fuelCostPlaceholder}
                placeholderTextColor="#94a3b8"
                value={fuelCost}
                onChangeText={setFuelCost}
                keyboardType="numeric"
                returnKeyType="done"
                blurOnSubmit={true}
                onFocus={() => onScrollToInput?.(160)}
              />
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{t.sar}</Text>
            </View>
          </View>

          {/* End Shift Button */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: '#ef4444', marginTop: 12, marginBottom: 8 }]}
            onPress={onEndShift}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="stop" size={20} color="#ffffff" />
                <Text style={styles.primaryButtonText}>{t.confirmEndBtn}</Text>
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
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardHeaderWithBadge: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  formGroup: {
    marginBottom: 16,
  },
  labelRow: {
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 14,
  },
  bikeVerificationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
    gap: 6,
  },
  bikeVerificationText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
  },
  badgeHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
    gap: 4,
  },
  badgeHintText: {
    fontSize: 11,
    fontWeight: '600',
  },
  photoPreviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoPreviewTouch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  photoThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  photoPreviewMeta: {
    flex: 1,
  },
  photoPreviewTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  photoPreviewSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  retakeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cameraCaptureCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  cameraCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  cameraCardSub: {
    fontSize: 11,
    textAlign: 'center',
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContentRow: {
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 10,
  },
  activeBannerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  activeBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  activeBannerSub: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeTimerBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeTimerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991b1b',
  },
  activeInfoGrid: {
    gap: 10,
    marginBottom: 16,
  },
  activeInfoBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  activeInfoLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  activeInfoVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  insideInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  insideInputBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
