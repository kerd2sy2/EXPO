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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { EmployeeProfile, WorkSession, ThemeColors, Language } from '../../types/delegate';

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

  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      setLocationSent(false);
      setGpsData(null);
      setStatusMessage('');
      setLoadingLocation(false);

      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, scaleAnim]);

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
        : 'جاري تحديد إحداثيات موقعك بأعلى دقة...'
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
⚠️ *يرجى التوجه فوراً أو تقديم المساعدة والدعم العاجل للمندوب!*`;

    const encodedMsg = encodeURIComponent(emergencyMsg);
    const whatsappAppUrl = `whatsapp://send?phone=${EMERGENCY_PHONE_INTL}&text=${encodedMsg}`;
    const whatsappWebUrl = `https://wa.me/${EMERGENCY_PHONE_INTL}?text=${encodedMsg}`;
    const smsUrl = `sms:${EMERGENCY_PHONE}${Platform.OS === 'ios' ? '&' : '?'}body=${encodedMsg}`;

    setLoadingLocation(false);
    setLocationSent(true);

    // Try opening WhatsApp directly
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
      } catch (smsErr) {
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
🆔 الهوية: ${employee?.national_id || ''}
🛵 الدباب: ${activeSession?.motorcycle_number || employee?.motorcycle_number || ''}
📍 الموقع: ${mapsUrl}
⏰ الوقت: ${nowStr}`;

    const encoded = encodeURIComponent(emergencyMsg);
    Linking.openURL(`https://wa.me/${EMERGENCY_PHONE_INTL}?text=${encoded}`).catch(() => {});
  };

  const titleText =
    lang === 'bn'
      ? '🚨 আপনি কি কোনো দুর্ঘটনার শিকার হয়েছেন?'
      : lang === 'en'
      ? '🚨 Did you experience an accident?'
      : '🚨 هل تعرضت إلى حادث لا قدر الله؟';

  const subText =
    lang === 'bn'
      ? 'আমরা আপনার পাশে আছি। (হ্যাঁ) চাপলে আপনার সঠিক লোকেশন ও তথ্য জরুরি নম্বরে (0500626432) পাঠানো হবে।'
      : lang === 'en'
      ? 'We are here to help. Tapping (Yes) will instantly send your exact GPS location and info to Emergency (0500626432).'
      : 'نحن هنا لمساعدتك. عند الضغط على "نعم"، سيتم إرسال إحداثيات موقعك الجغرافي الدقيق وبياناتك فوراً إلى رقم الطوارئ (0500626432) لتقديم المساعدة.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
              borderColor: isDarkMode ? '#ef4444' : '#fee2e2',
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Lottie Car Accident Animation */}
          <View style={styles.lottieContainer}>
            <LottieView
              source={require('../../../assets/Lottie/Car accident.json')}
              autoPlay
              loop
              style={styles.lottieAnim}
              resizeMode="contain"
            />
          </View>

          {/* Title & Description */}
          <Text style={[styles.title, { color: isDarkMode ? '#ffffff' : '#0f172a' }]}>
            {titleText}
          </Text>

          <Text style={[styles.subtitle, { color: isDarkMode ? '#94a3b8' : '#64748b' }]}>
            {subText}
          </Text>

          {/* Emergency Phone Badge */}
          <View
            style={[
              styles.emergencyContactBadge,
              { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fef2f2' },
            ]}
          >
            <Ionicons name="call" size={16} color="#ef4444" />
            <Text style={styles.emergencyContactText}>
              {lang === 'bn' ? 'জরুরি নম্বর:' : lang === 'en' ? 'Emergency Number:' : 'هاتف الطوارئ والإسعاف:'} {EMERGENCY_PHONE}
            </Text>
          </View>

          {/* Loading or Sent State */}
          {loadingLocation ? (
            <View style={styles.statusBox}>
              <ActivityIndicator size="small" color="#ef4444" />
              <Text style={[styles.statusText, { color: isDarkMode ? '#fca5a5' : '#dc2626' }]}>
                {statusMessage}
              </Text>
            </View>
          ) : locationSent ? (
            <View style={styles.sentContainer}>
              <View style={styles.sentSuccessBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.sentSuccessText}>
                  {lang === 'bn'
                    ? 'তথ্য ও লোকেশন পাঠানো হয়েছে'
                    : lang === 'en'
                    ? 'Location dispatched to Emergency'
                    : 'تم تجهيز وإرسال البلاغ والموقع بنجاح'}
                </Text>
              </View>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.callBtn]}
                  onPress={handleCallEmergency}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={18} color="#ffffff" />
                  <Text style={styles.btnTextWhite}>
                    {lang === 'bn' ? 'কল করুন' : lang === 'en' ? 'Call Now' : 'اتصال مباشر'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.whatsappBtn]}
                  onPress={handleResendWhatsapp}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
                  <Text style={styles.btnTextWhite}>واتساب</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.closeSecondaryBtn,
                  { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' },
                ]}
                onPress={onClose}
              >
                <Text style={[styles.closeSecondaryText, { color: isDarkMode ? '#e2e8f0' : '#475569' }]}>
                  {lang === 'bn' ? 'বন্ধ করুন' : lang === 'en' ? 'Close' : 'إغلاق النافذة'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Action Buttons: Yes, Need Help vs No, I am Safe */
            <View style={styles.buttonsContainer}>
              {/* YES Button */}
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmAccident}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="ambulance" size={22} color="#ffffff" style={{ marginHorizontal: 6 }} />
                <Text style={styles.confirmButtonText}>
                  {lang === 'bn'
                    ? 'হ্যাঁ, আমি দুর্ঘটনায় পড়েছি - সাহায্য পাঠান'
                    : lang === 'en'
                    ? 'Yes, I had an accident - Send Help'
                    : 'نعم، أحتاج مساعدة طارئة وإرسال موقعي'}
                </Text>
              </TouchableOpacity>

              {/* NO Button */}
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                    borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0',
                  },
                ]}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={18}
                  color={isDarkMode ? '#34d399' : '#10b981'}
                  style={{ marginHorizontal: 6 }}
                />
                <Text
                  style={[
                    styles.cancelButtonText,
                    { color: isDarkMode ? '#34d399' : '#059669' },
                  ]}
                >
                  {lang === 'bn'
                    ? 'না, আমি নিরাপদে আছি والحمد لله'
                    : lang === 'en'
                    ? 'No, I am safe'
                    : 'لا، أنا بخير والحمد لله'}
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 390,
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
  lottieContainer: {
    width: 170,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  lottieAnim: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
  },
  emergencyContactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    marginBottom: 20,
  },
  emergencyContactText: {
    color: '#ef4444',
    fontWeight: '700',
    fontSize: 13,
    marginHorizontal: 6,
  },
  buttonsContainer: {
    width: '100%',
    gap: 10,
  },
  confirmButton: {
    backgroundColor: '#dc2626',
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelButton: {
    borderRadius: 16,
    borderWidth: 1.2,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    marginVertical: 10,
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
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
    gap: 6,
  },
  sentSuccessText: {
    color: '#10b981',
    fontWeight: '700',
    fontSize: 13,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginBottom: 12,
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
    backgroundColor: '#ef4444',
  },
  whatsappBtn: {
    backgroundColor: '#25D366',
  },
  btnTextWhite: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  closeSecondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  closeSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
