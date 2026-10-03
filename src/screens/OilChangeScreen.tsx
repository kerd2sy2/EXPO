import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { ThemeColors, Language } from '../types/delegate';

export interface OilChangeScreenProps {
  motorcycleNumber?: string;
  distanceSinceOil?: number;
  remainingOilKm?: number;
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
  lang?: Language;
  t: any;
  onRecheck: () => Promise<boolean | void>;
  onScanAnother: () => void;
  onBackToHome: () => void;
}

export const OilChangeScreen: React.FC<OilChangeScreenProps> = ({
  motorcycleNumber,
  distanceSinceOil,
  colors,
  isDarkMode = false,
  isRTL = true,
  lang = 'ar',
  t,
  onRecheck,
  onScanAnother,
  onBackToHome,
}) => {
  const [isRechecking, setIsRechecking] = useState(false);

  const handleRecheckPress = async () => {
    if (isRechecking) return;
    setIsRechecking(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await onRecheck();
    } finally {
      setIsRechecking(false);
    }
  };

  const alertMessage =
    lang === 'ar'
      ? 'الدباب يحتاج الى تغير زيت ارجع لى المشرف لصرف زيت للدباب'
      : lang === 'ur'
      ? 'موٹر سائیکل کو تیل تبدیل کرنے کی ضرورت ہے، آئل کے لیے سپروائزر سے رجوع کریں'
      : lang === 'bn'
      ? 'বাইকে তেল পরিবর্তন প্রয়োজন, তেল পাওয়ার জন্য সুপারভাইজারের সাথে যোগাযোগ করুন'
      : 'Motorcycle requires an oil change. Please return to supervisor to dispense oil.';

  const screenTitle =
    lang === 'ar'
      ? 'تغيير زيت الدباب مطلوب'
      : lang === 'ur'
      ? 'تیل کی تبدیلی ضروری ہے'
      : lang === 'bn'
      ? 'তেল পরিবর্তন প্রয়োজন'
      : 'Oil Change Required';

  const subDescription =
    lang === 'ar'
      ? 'تم إيقاف بدء الدوام مؤقتاً لحماية محرك الدباب من التلف. يرجى التوجه لمشرف الفرع لصرف وتغيير الزيت ثم إعادة الفحص.'
      : lang === 'ur'
      ? 'انجن کی حفاظت کے لیے شفٹ شروع کرنا عارضی طور پر روک دیا گیا ہے۔ برائے مہربانی سپروائزر سے تیل تبدیل کروا کر دوبارہ چیک کریں۔'
      : lang === 'bn'
      ? 'ইঞ্জিনের সুরক্ষার জন্য শিফট শুরু সাময়িকভাবে বন্ধ রয়েছে। তেল পরিবর্তন করে আবার যাচাই করুন।'
      : 'Shift start is paused to protect the engine. Please contact the supervisor to dispense oil and then recheck.';

  const intervalNotice =
    lang === 'ar'
      ? 'معلومة: يتم تغيير الزيت كل 950 كم للمحافظة على محرك الدباب'
      : lang === 'ur'
      ? 'معلومات: موٹر سائیکل کا انجن محفوظ رکھنے کے لیے ہر 950 کلومیٹر پر تیل تبدیل ہوتا ہے'
      : lang === 'bn'
      ? 'তথ্য: ইঞ্জিন সুরক্ষার জন্য প্রতি ৯৫০ কিমিতে তেল পরিবর্তন করা হয়'
      : 'Note: Oil change is required every 950 km to maintain motorcycle engine health';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Top Banner & Lottie Animation */}
      <View
        style={[
          styles.lottieCard,
          {
            backgroundColor: isDarkMode ? '#171f30' : '#ffffff',
            borderColor: isDarkMode ? 'rgba(249, 115, 22, 0.25)' : '#fed7aa',
          },
        ]}
      >
        <View style={styles.glowAura}>
          <LottieView
            source={require('../../assets/Lottie/LCKboLMu6C.lottie')}
            autoPlay
            loop
            style={styles.lottieAnim}
            resizeMode="contain"
          />
        </View>

        {motorcycleNumber ? (
          <View
            style={[
              styles.bikeTag,
              {
                backgroundColor: isDarkMode ? 'rgba(249, 115, 22, 0.18)' : '#fff7ed',
                borderColor: isDarkMode ? 'rgba(249, 115, 22, 0.4)' : '#fdba74',
              },
            ]}
          >
            <Ionicons name="bicycle" size={16} color="#f97316" />
            <Text style={[styles.bikeTagText, { color: isDarkMode ? '#fb923c' : '#c2410c' }]}>
              {lang === 'ar'
                ? `دباب رقم: ${motorcycleNumber}`
                : `Bike: ${motorcycleNumber}`}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.title, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
          {screenTitle}
        </Text>

        {/* Main User Requested Alert Box */}
        <View
          style={[
            styles.alertBox,
            {
              backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
              borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.35)' : '#fecaca',
            },
          ]}
        >
          <Ionicons name="alert-circle" size={24} color="#ef4444" style={{ marginTop: 2 }} />
          <Text
            style={[
              styles.alertText,
              {
                color: isDarkMode ? '#fca5a5' : '#b91c1c',
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          >
            {alertMessage}
          </Text>
        </View>

        <Text
          style={[
            styles.subDesc,
            { color: isDarkMode ? '#94a3b8' : '#64748b', textAlign: 'center' },
          ]}
        >
          {subDescription}
        </Text>
      </View>

      {/* Oil & Distance Metric Card */}
      <View
        style={[
          styles.infoCard,
          {
            backgroundColor: isDarkMode ? '#171f30' : '#ffffff',
            borderColor: isDarkMode ? '#334155' : '#e2e8f0',
          },
        ]}
      >
        <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.metricIconWrap}>
            <Ionicons name="speedometer-outline" size={20} color="#f97316" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.metricLabel, { color: isDarkMode ? '#94a3b8' : '#64748b', textAlign: isRTL ? 'right' : 'left' }]}>
              {lang === 'ar' ? 'المعيار المعتمد لتغيير الزيت' : 'Oil Change Interval'}
            </Text>
            <Text style={[styles.metricValue, { color: isDarkMode ? '#f8fafc' : '#0f172a', textAlign: isRTL ? 'right' : 'left' }]}>
              {lang === 'ar' ? 'كل 950 كم' : 'Every 950 KM'}
            </Text>
          </View>
        </View>

        {distanceSinceOil !== undefined && distanceSinceOil > 0 ? (
          <View
            style={[
              styles.infoRow,
              styles.infoRowBorder,
              {
                flexDirection: isRTL ? 'row-reverse' : 'row',
                borderColor: isDarkMode ? '#1e293b' : '#f1f5f9',
              },
            ]}
          >
            <View style={styles.metricIconWrap}>
              <Ionicons name="trail-sign-outline" size={20} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.metricLabel, { color: isDarkMode ? '#94a3b8' : '#64748b', textAlign: isRTL ? 'right' : 'left' }]}>
                {lang === 'ar' ? 'آخر قراءة عداد مسجلة' : 'Last Recorded Odometer'}
              </Text>
              <Text style={[styles.metricValue, { color: isDarkMode ? '#f8fafc' : '#0f172a', textAlign: isRTL ? 'right' : 'left' }]}>
                {`${distanceSinceOil} كم`}
              </Text>
            </View>
          </View>
        ) : null}

        {/* Interval hint badge */}
        <View
          style={[
            styles.hintBadge,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
              borderColor: isDarkMode ? '#334155' : '#e2e8f0',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="information-circle-outline" size={16} color="#0ea5e9" />
          <Text
            style={[
              styles.hintBadgeText,
              { color: isDarkMode ? '#38bdf8' : '#0284c7', textAlign: isRTL ? 'right' : 'left' },
            ]}
          >
            {intervalNotice}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Re-check Oil Button */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.primaryBtn, { backgroundColor: '#f97316' }]}
          onPress={handleRecheckPress}
          disabled={isRechecking}
          activeOpacity={0.85}
        >
          {isRechecking ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Ionicons
                name="refresh"
                size={20}
                color="#ffffff"
                style={{ marginHorizontal: 6 }}
              />
              <Text style={styles.primaryBtnText}>
                {lang === 'ar'
                  ? 'إعادة الفحص والتحقق'
                  : lang === 'ur'
                  ? 'دوبارہ تصدیق کریں'
                  : lang === 'bn'
                  ? 'পুনরায় পরীক্ষা করুন'
                  : 'Re-check Oil Status'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Scan Another Bike Button */}
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.secondaryBtn,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
              borderColor: isDarkMode ? '#334155' : '#cbd5e1',
            },
          ]}
          onPress={onScanAnother}
          activeOpacity={0.75}
        >
          <Ionicons
            name="camera-outline"
            size={19}
            color={colors.textPrimary}
            style={{ marginHorizontal: 6 }}
          />
          <Text style={[styles.secondaryBtnText, { color: colors.textPrimary }]}>
            {lang === 'ar'
              ? 'تصوير لوحة دباب آخر'
              : lang === 'ur'
              ? 'دوسری موٹر سائیکل اسکین کریں'
              : lang === 'bn'
              ? 'অন্য বাইক স্ক্যান করুন'
              : 'Scan Another Bike Plate'}
          </Text>
        </TouchableOpacity>

        {/* Return to Home */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.tertiaryBtn]}
          onPress={onBackToHome}
          activeOpacity={0.7}
        >
          <Ionicons
            name="home-outline"
            size={18}
            color={isDarkMode ? '#94a3b8' : '#64748b'}
            style={{ marginHorizontal: 6 }}
          />
          <Text style={[styles.tertiaryBtnText, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
            {lang === 'ar' ? 'الرجوع إلى الرئيسية' : 'Return to Home'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
  },
  lottieCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  glowAura: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lottieAnim: {
    width: 130,
    height: 130,
  },
  bikeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
    gap: 6,
  },
  bikeTagText: {
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
    textAlign: 'center',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    width: '100%',
    marginBottom: 10,
    gap: 10,
  },
  alertText: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 22,
    flexShrink: 1,
  },
  subDesc: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  infoRowBorder: {
    borderTopWidth: 1,
    marginTop: 6,
    paddingTop: 10,
  },
  metricIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  hintBadge: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  hintBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 17,
    flexShrink: 1,
  },
  actionsContainer: {
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  primaryBtn: {
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tertiaryBtn: {
    backgroundColor: 'transparent',
    height: 42,
  },
  tertiaryBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
