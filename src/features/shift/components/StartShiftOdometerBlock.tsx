import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, PreviewPhotoData } from '../../../types/delegate';
import { startShiftStyles as styles } from './startShiftStyles';

interface StartShiftOdometerBlockProps {
  isOdometerBroken: boolean;
  startKm: string;
  setStartKm: (val: string) => void;
  autoKmFetched: boolean;
  startKmImage: string | null;
  onTakeOdometerPhoto: (type: 'start' | 'end') => Promise<void>;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
}

export const StartShiftOdometerBlock: React.FC<StartShiftOdometerBlockProps> = ({
  isOdometerBroken,
  startKm,
  setStartKm,
  autoKmFetched,
  startKmImage,
  onTakeOdometerPhoto,
  onPreviewPhoto,
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  if (isOdometerBroken) {
    return (
      <View
        style={[
          styles.brokenOdometerCard,
          {
            backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : '#fef3c7',
            borderColor: '#f59e0b',
          },
        ]}
      >
        <Ionicons name="warning" size={24} color="#d97706" />
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: isDarkMode ? '#fbbf24' : '#92400e',
              fontSize: 13,
              fontWeight: '700',
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {t.odometerBrokenNotice ||
              (isRTL
                ? 'عداد هذه المركبة معطل ومسجل كـ (تالف) بالنظام'
                : 'Odometer is recorded broken')}
          </Text>
          <Text
            style={{
              color: isDarkMode ? '#fde68a' : '#b45309',
              fontSize: 11,
              marginTop: 4,
              textAlign: isRTL ? 'right' : 'left',
            }}
          >
            {t.odometerExempt ||
              (isRTL
                ? 'تم الإعفاء من قراءة العداد وتصويره'
                : 'Exempted from odometer photo')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginTop: 10 }}>
      <View style={[styles.sectionLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="speedometer-outline" size={18} color={colors.primary} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {t.startKmInputLabel || (isRTL ? 'قراءة عداد البداية (Start KM)' : 'Start KM')}
        </Text>
      </View>

      <View
        style={[
          styles.modernInputBox,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Ionicons name="speedometer" size={20} color={colors.primary} />
        <TextInput
          style={[
            styles.modernTextInput,
            { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
          ]}
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
        <View
          style={[
            styles.autoFetchedNotice,
            {
              backgroundColor: colors.primaryLight,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="information-circle" size={15} color={colors.primary} />
          <Text
            style={[
              styles.autoFetchedText,
              { color: colors.primary, textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {t.autoKmFetched ||
              (isRTL
                ? 'تم جلب عداد نهاية الشفت السابق لهذا الدباب تلقائياً'
                : 'Auto-fetched last recorded KM')}
          </Text>
        </View>
      )}

      {/* Odometer Photo Capture Section */}
      <View style={{ marginTop: 14 }}>
        <Text
          style={[
            styles.photoSectionLabel,
            { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          {t.startKmPhotoLabel ||
            (isRTL ? 'صورة عداد البداية (مطلوبة)' : 'Start Odometer Photo')}
        </Text>

        {startKmImage ? (
          <View
            style={[
              styles.photoPreviewCard,
              { borderColor: colors.primary, backgroundColor: colors.inputBg },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => onPreviewPhoto({ url: startKmImage, title: t.startKmPhotoLabel })}
              style={styles.photoPreviewTouch}
            >
              <Image
                source={{ uri: startKmImage }}
                style={styles.photoPreviewImage}
                resizeMode="cover"
              />
              <View style={[styles.photoZoomBadge, isRTL ? { left: 10 } : { right: 10 }]}>
                <Ionicons name="expand-outline" size={14} color="#ffffff" />
                <Text style={styles.photoZoomText}>
                  {t.tapToViewPhoto || (isRTL ? 'معاينة مكبرة' : 'Preview')}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.photoRetakeButton,
                isRTL ? { right: 10 } : { left: 10 },
                {
                  backgroundColor: isDarkMode
                    ? 'rgba(15, 23, 42, 0.9)'
                    : 'rgba(255, 255, 255, 0.95)',
                },
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
            style={[
              styles.cameraCard,
              { backgroundColor: colors.inputBg, borderColor: colors.primary },
            ]}
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
              {t.odometerGuideSub ||
                (isRTL
                  ? 'وجّه الكاميرا نحو شاشة العداد وتأكد من وضوح الأرقام'
                  : 'Point camera at odometer display')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
