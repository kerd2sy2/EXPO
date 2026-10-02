import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AccidentAlertModalProps {
  visible: boolean;
  onClose: () => void;
  employee: EmployeeProfile | null;
  activeSession?: WorkSession | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  lang?: Language;
}

const EMERGENCY_PHONE = '0500626432';
const EMERGENCY_PHONE_INTL = '966500626432';

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
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          damping: 22,
          mass: 0.9,
          stiffness: 160,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
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
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        accuracy = position.coords.accuracy ? Math.round(position.coords.accuracy) : null;
        setGpsData({ lat, lng, accuracy: accuracy || 0 });
      }
    } catch (locErr) {
      console.warn('[AccidentAlertModal] Error obtaining GPS:', locErr);
    }

    const nowStr = new Date().toLocaleString(
      lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : 'en-US'
    );

    const empName = employee?.name || 'غير محدد';
    const empPhone = employee?.phone || '—';
    const empId = employee?.national_id || '—';
    const bikePlate = activeSession?.motorcycle_number || employee?.motorcycle_number || '—';
    const keyNum = employee?.key_number || '—';
    const branchName = employee?.branch_name || '—';

    let mapsUrl = '';
    let locText = 'تعذر التقاط الموقع بدقة';
    if (lat && lng) {
      mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      locText = `${lat.toFixed(6)}, ${lng.toFixed(6)} (دقة: ${accuracy || 5}م)`;
    }

    const emergencyMsg = `🚨 *بلاغ طوارئ وحادث مندوب عاجل* 🚨
━━━━━━━━━━━━━━━━━━━━
👤 *اسم المندوب:* ${empName}
📱 *هاتف المندوب:* ${empPhone}
🆔 *رقم الهوية:* ${empId}
🛵 *رقم الدباب:* ${bikePlate}
🔑 *رقم المفتاح:* ${keyNum}
🏢 *الفرع:* ${branchName}

📍 *الموقع الجغرافي الدقيق:*
${locText}

🗺️ *رابط خرائط جوجل للموقع مباشرة:*
${mapsUrl ? mapsUrl : 'https://maps.google.com'}

⏰ *وقت البلاغ:* ${nowStr}
━━━━━━━━━━━━━━━━━━━━
⚠️ *يرجى التوجه فوراً أو تقديم المساعدة والدعم للمندوب!*`;

    const encodedMsg = encodeURIComponent(emergencyMsg);
    const whatsappAppUrl = `whatsapp://send?phone=${EMERGENCY_PHONE_INTL}&text=${encodedMsg}`;
    const whatsappWebUrl = `https://wa.me/${EMERGENCY_PHONE_INTL}?text=${encodedMsg}`;
    const smsUrl = `sms:${EMERGENCY_PHONE}${Platform.OS === 'ios' ? '&' : '?'}body=${encodedMsg}`;

    setLoadingLocation(false);
    setLocationSent(true);

    // Open WhatsApp directly, fallback to SMS
    try {
      const canOpen = await Linking.canOpenURL(whatsappAppUrl);
      if (canOpen) {
        await Linking.openURL(whatsappAppUrl);
      } else {
        await Linking.openURL(whatsappWebUrl);
      }
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
    const nowStr = new Date().toLocaleString(
      lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : 'en-US'
    );
    const mapsUrl = `https://www.google.com/maps?q=${gpsData.lat},${gpsData.lng}`;
    const emergencyMsg = `🚨 *بلاغ طوارئ وحادث مندوب عاجل* 🚨
👤 المندوب: ${employee?.name || ''}
📱 الهاتف: ${employee?.phone || ''}
🛵 الدباب: ${activeSession?.motorcycle_number || employee?.motorcycle_number || ''}
📍 الموقع: ${mapsUrl}
⏰ الوقت: ${nowStr}`;

    const encoded = encodeURIComponent(emergencyMsg);
    Linking.openURL(`https://wa.me/${EMERGENCY_PHONE_INTL}?text=${encoded}`).catch(() => {});
  };

  const titleText =
    lang === 'bn'
      ? 'আপনি কি ঠিক আছেন?'
      : lang === 'en'
      ? 'Are you alright?'
      : 'هل أنت بخير؟';

  const subText =
    lang === 'bn'
      ? 'হঠাৎ কোনো ধাক্কা বা ঝাঁকুনি শনাক্ত হয়েছে। দুর্ঘটনায় পড়লে নিচের বাটনে চাপ দিন।'
      : lang === 'en'
      ? 'Sudden impact detected. If you had an accident, tap below to send your live location.'
      : 'تم استشعار اهتزاز قوي أو حركة مفاجئة. إذا تعرضت لحادث، اضغط لإرسال موقعك لطوارئ العمل.';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <View style={styles.modalRoot}>
        {/* Backdrop overlay */}
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.65],
                }),
              },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Bottom Sheet Container */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Sheet Drag Indicator */}
          <View style={[styles.dragHandle, { backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0' }]} />

          {/* Large Lottie Car Accident Animation */}
          <View style={styles.lottieWrap}>
            <LottieView
              source={require('../../../assets/Lottie/json/Car accident.json')}
              autoPlay
              loop
              style={styles.lottieAnim}
              resizeMode="contain"
            />
          </View>

          {/* Simplified, Clean Header */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {titleText}
          </Text>

          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {subText}
          </Text>

          {/* Emergency Phone Chip */}
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

          {/* Loading or Sent State */}
          {loadingLocation ? (
            <View style={[styles.statusBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color="#EF4444" />
              <Text style={[styles.statusText, { color: colors.textPrimary }]}>
                {statusMessage}
              </Text>
            </View>
          ) : locationSent ? (
            <View style={styles.sentContainer}>
              <View style={[styles.sentSuccessBadge, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.sentSuccessText}>
                  {lang === 'bn'
                    ? 'তথ্য ও লোকেশন পাঠানো হয়েছে'
                    : lang === 'en'
                    ? 'Location sent to Emergency'
                    : 'تم إرسال موقعك وبياناتك بنجاح'}
                </Text>
              </View>

              <View style={[styles.actionButtonsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.callBtn]}
                  onPress={handleCallEmergency}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={18} color="#FFFFFF" />
                  <Text style={styles.btnTextWhite}>
                    {lang === 'bn' ? 'কল করুন' : lang === 'en' ? 'Call' : 'اتصال مباشر'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.whatsappBtn]}
                  onPress={handleResendWhatsapp}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                  <Text style={styles.btnTextWhite}>واتساب</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.closeSecondaryBtn,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
                onPress={handleDismiss}
              >
                <Text style={[styles.closeSecondaryText, { color: colors.textSecondary }]}>
                  {lang === 'bn' ? 'إغلاق' : lang === 'en' ? 'Close' : 'إغلاق'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Action Buttons: Yes, Send Location vs No, I am Safe */
            <View style={styles.buttonsContainer}>
              {/* Emergency Trigger Button */}
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmAccident}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="ambulance" size={22} color="#FFFFFF" style={{ marginHorizontal: 6 }} />
                <Text style={styles.confirmButtonText}>
                  {lang === 'bn'
                    ? 'জরুরি লোকেশন পাঠান'
                    : lang === 'en'
                    ? 'Send Location for Help'
                    : 'إرسال موقعي للطوارئ'}
                </Text>
              </TouchableOpacity>

              {/* Dismiss Button */}
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={isDarkMode ? '#34D399' : '#059669'}
                  style={{ marginHorizontal: 6 }}
                />
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: isDarkMode ? '#34D399' : '#059669' },
                  ]}
                >
                  {lang === 'bn'
                    ? 'আমি নিরাপদ আছি'
                    : lang === 'en'
                    ? 'I am safe'
                    : 'أنا بخير والحمد لله'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  bottomSheet: {
    width: '100%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 8,
  },
  lottieWrap: {
    width: 240,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  lottieAnim: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  emergencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  emergencyChipText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 12,
    marginHorizontal: 6,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
  },
  confirmButton: {
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelButton: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginVertical: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  sentSuccessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 14,
    marginBottom: 14,
    gap: 6,
  },
  sentSuccessText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginBottom: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    gap: 6,
  },
  callBtn: {
    backgroundColor: '#EF4444',
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
  },
  btnTextWhite: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  closeSecondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 2,
  },
  closeSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
