import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
      ? 'حافظ على الدباب وقم بتغيير الزيت'
      : lang === 'ur'
      ? 'موٹر سائیکل کی حفاظت کریں اور تیل تبدیل کریں'
      : lang === 'bn'
      ? 'বাইক সুরক্ষিত রাখুন এবং ইঞ্জিন অয়েল পরিবর্তন করুন'
      : 'Maintain your motorcycle and change the oil');

  const subtitleText =
    t?.oilChangeAlertMessage ||
    (lang === 'ar'
      ? 'ارجع إلى المشرف وغير زيت'
      : lang === 'ur'
      ? 'نگران (سپروائزر) کے پاس جائیں اور تیل تبدیل کروائیں'
      : lang === 'bn'
      ? 'সুপারভাইজারের কাছে গিয়ে তেল পরিবর্তন করুন'
      : 'Please return to your supervisor to change the oil');

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
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDarkMode ? '#131b2e' : '#ffffff',
            borderColor: isDarkMode ? 'rgba(249, 115, 22, 0.25)' : 'rgba(249, 115, 22, 0.15)',
          },
        ]}
      >
        {/* Lottie Animation with Ambient Glow */}
        <View
          style={[
            styles.glowAura,
            {
              backgroundColor: isDarkMode
                ? 'rgba(249, 115, 22, 0.12)'
                : 'rgba(249, 115, 22, 0.08)',
            },
          ]}
        >
          <LottieView
            source={require('../../assets/Lottie/LCKboLMu6C.lottie')}
            autoPlay
            loop
            style={styles.lottieAnim}
            resizeMode="contain"
          />
        </View>

        {/* Text Paragraph */}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              {
                color: isDarkMode ? '#f8fafc' : '#0f172a',
                textAlign: 'center',
              },
            ]}
          >
            {titleText}
          </Text>

          <Text
            style={[
              styles.subtitle,
              {
                color: isDarkMode ? '#94a3b8' : '#475569',
                textAlign: 'center',
              },
            ]}
          >
            {subtitleText}
          </Text>
        </View>

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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    minHeight: 520,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: Platform.OS === 'ios' ? 0.12 : 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  glowAura: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lottieAnim: {
    width: 180,
    height: 180,
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 30,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
  },
  doneButton: {
    width: '100%',
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
