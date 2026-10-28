import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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
  t?: any;
  onRecheck?: () => Promise<boolean | void>;
  onScanAnother?: () => void;
  onBackToHome: () => void;
}

export const OilChangeScreen: React.FC<OilChangeScreenProps> = ({
  colors,
  isDarkMode = false,
  isRTL = true,
  lang = 'ar',
  t,
  onBackToHome,
}) => {
  const handleDonePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onBackToHome();
  };

  const titleText =
    t?.oilChangeAlertTitle ||
    (lang === 'ar'
      ? 'حافظ على الدباب وغيّر الزيت'
      : lang === 'ur'
      ? 'موٹر سائیکل کی حفاظت اور آئل تبدیلی'
      : lang === 'bn'
      ? 'বাইকের যত্ন ও ইঞ্জিন অয়েল পরিবর্তন'
      : 'Protect your bike and change the oil');

  const subtitleText =
    t?.oilChangeAlertMessage ||
    (lang === 'ar'
      ? 'راجع المشرف لتغيير الزيت'
      : lang === 'ur'
      ? 'تیل تبدیل کروانے کے لیے سپروائزر سے ملیں'
      : lang === 'bn'
      ? 'তেল পরিবর্তনের জন্য সুপারভাইজারের কাছে যান'
      : 'Return to supervisor to change oil');

  const buttonText =
    t?.oilChangeAlertBtn ||
    (lang === 'ar'
      ? 'تم'
      : lang === 'ur'
      ? 'مکمل'
      : lang === 'bn'
      ? 'সম্পন্ন'
      : 'Done');

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Lottie Animation directly in the page without card */}
      <View style={styles.animationWrapper}>
        <LottieView
          source={require('../../assets/Lottie/LCKboLMu6C.lottie')}
          autoPlay
          loop
          style={styles.lottieAnim}
          resizeMode="contain"
        />
      </View>

      {/* Title: strictly on one line */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.title,
          {
            color: isDarkMode ? '#f8fafc' : '#0f172a',
          },
        ]}
      >
        {titleText}
      </Text>

      {/* Paragraph: strictly on one line */}
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.subtitle,
          {
            color: isDarkMode ? '#94a3b8' : '#64748b',
          },
        ]}
      >
        {subtitleText}
      </Text>

      {/* Action Button: "تم" */}
      <TouchableOpacity
        style={[styles.doneButton, { backgroundColor: colors.primary || '#f97316' }]}
        onPress={handleDonePress}
        activeOpacity={0.85}
      >
        <Ionicons
          name="checkmark-circle-outline"
          size={22}
          color="#ffffff"
          style={{ marginHorizontal: 6 }}
        />
        <Text style={styles.doneButtonText}>{buttonText}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    minHeight: 520,
    width: '100%',
  },
  animationWrapper: {
    width: 230,
    height: 230,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lottieAnim: {
    width: 220,
    height: 220,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 36,
    paddingHorizontal: 16,
  },
  doneButton: {
    width: '100%',
    maxWidth: 320,
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
