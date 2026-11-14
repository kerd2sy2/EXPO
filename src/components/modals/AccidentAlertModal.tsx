import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { EmployeeProfile, WorkSession, ThemeColors, Language } from '../../types/delegate';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import {
  EMERGENCY_PHONE,
  EMERGENCY_PHONE_INTL,
  buildEmergencyAccidentMessage,
  buildResendAccidentMessage,
} from './accident-alert/accidentAlertHelpers';
import { accidentAlertStyles as styles } from './accident-alert/accidentAlertStyles';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface AccidentAlertModalProps {
  visible: boolean;
  onClose: () => void;
  employee: EmployeeProfile | null;
  activeSession?: WorkSession | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  lang?: Language;
}

/** Bottom-sheet modal triggered by impact detection to dispatch live GPS emergency alerts. */
export const AccidentAlertModal: React.FC<AccidentAlertModalProps> = ({
  visible,
  onClose,
  employee,
  activeSession,
  colors,
  isDarkMode,
  isRTL,
  lang = 'ar',
}) => {
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationSent, setLocationSent] = useState(false);
  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setLocationSent(false);
      setGpsData(null);
      setStatusMessage('');
      setLoadingLocation(false);

      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 22, mass: 0.9, stiffness: 160, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, translateY, backdropAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const handleConfirmAccident = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {}

    setLoadingLocation(true);
    setStatusMessage(
      lang === 'bn'
        ? 'আপনার নির্ভুল অবস্থান শনাক্ত করা হচ্ছে...'
        : lang === 'en'
        ? 'Detecting accurate GPS location...'
        : 'جاري تحديد موقعك بدقة...'
    );

    let lat: number | null = null;
    let lng: number | null = null;
    let accuracy: number | null = null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        accuracy = position.coords.accuracy ? Math.round(position.coords.accuracy) : null;
        setGpsData({ lat, lng, accuracy: accuracy || 0 });
      }
    } catch (locErr) {
      console.warn('[AccidentAlertModal] Error obtaining GPS:', locErr);
    }

    const emergencyMsg = buildEmergencyAccidentMessage(employee, activeSession, lat, lng, accuracy, lang);
    const encodedMsg = encodeURIComponent(emergencyMsg);
    const whatsappAppUrl = `whatsapp://send?phone=${EMERGENCY_PHONE_INTL}&text=${encodedMsg}`;
    const whatsappWebUrl = `https://wa.me/${EMERGENCY_PHONE_INTL}?text=${encodedMsg}`;
    const smsUrl = `sms:${EMERGENCY_PHONE}${Platform.OS === 'ios' ? '&' : '?'}body=${encodedMsg}`;

    setLoadingLocation(false);
    setLocationSent(true);

    try {
      const canOpen = await Linking.canOpenURL(whatsappAppUrl);
      await Linking.openURL(canOpen ? whatsappAppUrl : whatsappWebUrl);
    } catch {
      try {
        await Linking.openURL(smsUrl);
      } catch {
        Linking.openURL(`tel:${EMERGENCY_PHONE}`).catch(() => {});
      }
    }
  };

  const handleCallEmergency = () => {
    Linking.openURL(`tel:${EMERGENCY_PHONE}`).catch(() => {});
  };

  const handleResendWhatsapp = async () => {
    if (!gpsData) return;
    const msg = buildResendAccidentMessage(employee, activeSession, gpsData, lang);
    Linking.openURL(`https://wa.me/${EMERGENCY_PHONE_INTL}?text=${encodeURIComponent(msg)}`).catch(() => {});
  };

  const titleText = lang === 'bn' ? 'আপনি কি ঠিক আছেন?' : lang === 'en' ? 'Are you alright?' : 'هل أنت بخير؟';
  const subText =
    lang === 'bn'
      ? 'হঠাৎ কোনো ধাক্কা বা ঝাঁকুনি শনাক্ত হয়েছে। দুর্ঘটনায় পড়লে নিচের বাটনে চাপ দিন।'
      : lang === 'en'
      ? 'Sudden impact detected. If you had an accident, tap below to send your live location.'
      : 'تم استشعار اهتزاز قوي أو حركة مفاجئة. إذا تعرضت لحادث، اضغط لإرسال موقعك لطوارئ العمل.';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <View style={styles.modalRoot}>
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.65] }) },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateY }] }]}
        >
          <View style={[styles.dragHandle, { backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0' }]} />

          <ModuleErrorBoundary moduleName="AccidentAlertModal" colors={colors}>
            <View style={styles.lottieWrap}>
              <LottieView
                source={require('../../../assets/Lottie/json/Car accident.json')}
                autoPlay
                loop
                style={styles.lottieAnim}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>{titleText}</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subText}</Text>

            <TouchableOpacity
              style={[
                styles.emergencyChip,
                {
                  backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2',
                  borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
                },
              ]}
              onPress={handleCallEmergency}
              activeOpacity={0.7}
            >
              <Ionicons name="call" size={15} color="#EF4444" />
              <Text style={styles.emergencyChipText}>
                {lang === 'bn' ? 'জরুরি কল:' : lang === 'en' ? 'Emergency Call:' : 'طوارئ الإدارة:'} {EMERGENCY_PHONE}
              </Text>
            </TouchableOpacity>

            {loadingLocation ? (
              <View style={[styles.statusBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <ActivityIndicator size="small" color="#EF4444" />
                <Text style={[styles.statusText, { color: colors.textPrimary }]}>{statusMessage}</Text>
              </View>
            ) : locationSent ? (
              <View style={styles.sentContainer}>
                <View style={[styles.sentSuccessBadge, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.sentSuccessText}>
                    {lang === 'bn' ? 'তথ্য ও লোকেশন পাঠানো হয়েছে' : lang === 'en' ? 'Location sent to Emergency' : 'تم إرسال موقعك وبياناتك بنجاح'}
                  </Text>
                </View>

                <View style={[styles.actionButtonsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity style={[styles.actionBtn, styles.callBtn]} onPress={handleCallEmergency} activeOpacity={0.8}>
                    <Ionicons name="call" size={18} color="#FFFFFF" />
                    <Text style={styles.btnTextWhite}>{lang === 'bn' ? 'কল করুন' : lang === 'en' ? 'Call' : 'اتصال مباشر'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.actionBtn, styles.whatsappBtn]} onPress={handleResendWhatsapp} activeOpacity={0.8}>
                    <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                    <Text style={styles.btnTextWhite}>واتساب</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.closeSecondaryBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  onPress={handleDismiss}
                >
                  <Text style={[styles.closeSecondaryText, { color: colors.textSecondary }]}>
                    {lang === 'bn' ? 'إغلاق' : lang === 'en' ? 'Close' : 'إغلاق'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.buttonsContainer}>
                <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmAccident} activeOpacity={0.85}>
                  <MaterialCommunityIcons name="ambulance" size={22} color="#FFFFFF" style={{ marginHorizontal: 6 }} />
                  <Text style={styles.confirmButtonText}>
                    {lang === 'bn' ? 'জরুরি লোকেশন পাঠান' : lang === 'en' ? 'Send Location for Help' : 'إرسال موقعي للطوارئ'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  onPress={handleDismiss}
                  activeOpacity={0.7}
                >
                  <Ionicons name="shield-checkmark" size={18} color={isDarkMode ? '#34D399' : '#059669'} style={{ marginHorizontal: 6 }} />
                  <Text style={[styles.cancelButtonText, { color: isDarkMode ? '#34D399' : '#059669' }]}>
                    {lang === 'bn' ? 'আমি নিরাপদ আছি' : lang === 'en' ? 'I am safe' : 'أنا بخير والحمد لله'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ModuleErrorBoundary>
        </Animated.View>
      </View>
    </Modal>
  );
};
