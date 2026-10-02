import React, { useRef } from 'react';
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
import { ThemeColors, PreviewPhotoData } from '../../../types/delegate';

interface EndShiftSectionProps {
  isExemptOdometer: boolean;
  startKmNum: number;
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
  canEndShift: boolean;
  submitting: boolean;
  onTakeOdometerPhoto: (type: 'start' | 'end') => Promise<void>;
  onEndShift: () => Promise<void>;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  onScrollToInput?: (yOffset: number) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
}

export const EndShiftSection: React.FC<EndShiftSectionProps> = ({
  isExemptOdometer,
  startKmNum,
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
  canEndShift,
  submitting,
  onTakeOdometerPhoto,
  onEndShift,
  onPreviewPhoto,
  onScrollToInput,
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  const ordersInputRef = useRef<TextInput>(null);
  const fuelInputRef = useRef<TextInput>(null);

  return (
    <>
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
    </>
  );
};

const styles = StyleSheet.create({
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
});
