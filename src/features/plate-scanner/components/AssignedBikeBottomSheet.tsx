import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { parseAssignedPlateInfo } from '../services/plateOcrService';
import { SaudiMotorcyclePlate } from '../../../components/ui/SaudiMotorcyclePlate';

const LOCALIZED_STRINGS: Record<string, {
  title: string;
  question: string;
  yes: string;
  no: string;
}> = {
  ar: {
    title: 'تأكيد استخدام الدباب',
    question: 'هل أنت تستخدم هذا الدباب؟',
    yes: 'نعم، استخدام هذا الدباب',
    no: 'لا، مسح دباب آخر بالماسح',
  },
  en: {
    title: 'Confirm Motorcycle',
    question: 'Are you using this motorcycle?',
    yes: 'Yes, Use This Motorcycle',
    no: 'No, Scan Another Bike',
  },
  ur: {
    title: 'موٹر سائیکل کی تصدیق',
    question: 'کیا آپ یہ موٹرسائیکل استعمال کر رہے ہیں؟',
    yes: 'ہاں، یہی موٹرسائیکل استعمال کریں',
    no: 'نہیں، دوسری موٹرسائیکل اسکین کریں',
  },
  bn: {
    title: 'মোটরসাইকেল নিশ্চিতকরণ',
    question: 'আপনি কি এই বাইকটি ব্যবহার করছেন?',
    yes: 'হ্যাঁ, এই বাইকটি ব্যবহার করুন',
    no: 'না, অন্য বাইক স্ক্যান করুন',
  },
};

export interface AssignedBikeBottomSheetProps {
  visible: boolean;
  assignedPlate: string;
  sheetAnim: Animated.Value;
  onConfirm: () => void;
  onClose: () => void;
  isDark?: boolean;
  isBusy?: boolean;
  lang?: string;
  t?: any;
  isRTL?: boolean;
}

export const AssignedBikeBottomSheet: React.FC<AssignedBikeBottomSheetProps> = ({
  visible,
  assignedPlate,
  sheetAnim,
  onConfirm,
  onClose,
  isDark = true,
  isBusy = false,
  lang = 'ar',
  t,
  isRTL: propIsRTL,
}) => {
  if (!visible) return null;

  const currentLang = (lang && LOCALIZED_STRINGS[lang]) ? lang : 'ar';
  const texts = LOCALIZED_STRINGS[currentLang];
  const isRTL = propIsRTL !== undefined ? propIsRTL : (currentLang === 'ar' || currentLang === 'ur');

  // Extract digits and letters for the authentic Saudi Motorcycle Plate
  const plateInfo = parseAssignedPlateInfo(assignedPlate);
  const plateDigits = plateInfo?.digits || assignedPlate.replace(/[^0-9]/g, '') || assignedPlate;
  const plateLetters = plateInfo?.arLetters || plateInfo?.enLetters || assignedPlate.replace(/[0-9]/g, '').trim() || 'ا د';

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableWithoutFeedback onPress={onClose} disabled={isBusy}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.72)',
              opacity: sheetAnim,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            transform: [
              {
                translateY: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [500, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Top Handle Pill */}
        <View style={[styles.sheetPill, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]} />

        {/* Modal Title */}
        <Text style={[styles.sheetTitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          {texts.title}
        </Text>

        {/* Main Question (Clean question without duplicating plate number) */}
        <Text style={[styles.sheetQuestion, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
          {texts.question}
        </Text>

        {/* Small Authentic Saudi Motorcycle Plate (Numbers & Letters in Arabic & English) */}
        <View style={styles.platePreviewWrapper}>
          <SaudiMotorcyclePlate
            digits={plateDigits}
            letters={plateLetters}
            editable={false}
            isDarkMode={isDark}
            scale={0.76}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {/* YES Button: Confirms using assigned motorcycle */}
          <TouchableOpacity
            style={[styles.confirmBtn, isBusy && { opacity: 0.7 }]}
            onPress={onConfirm}
            activeOpacity={0.85}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <View style={[styles.btnInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="checkmark-circle" size={22} color="#ffffff" style={{ marginHorizontal: 6 }} />
                <Text style={styles.confirmBtnText}>{texts.yes}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* NO Button: Closes modal and lets courier scan other bike with camera */}
          <TouchableOpacity
            style={[
              styles.cancelBtn,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#f1f5f9' },
            ]}
            onPress={onClose}
            activeOpacity={0.7}
            disabled={isBusy}
          >
            <View style={[styles.btnInner, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="scan-outline" size={19} color={isDark ? '#cbd5e1' : '#475569'} style={{ marginHorizontal: 6 }} />
              <Text style={[styles.cancelBtnText, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                {texts.no}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderTopWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 25,
  },
  sheetPill: {
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  sheetQuestion: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    lineHeight: 25,
  },
  platePreviewWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    height: 130,
    marginVertical: 4,
    overflow: 'visible',
  },
  actionsRow: {
    width: '100%',
    gap: 10,
    marginTop: 6,
  },
  btnInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '800',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
});
