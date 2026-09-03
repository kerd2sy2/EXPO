import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { EmployeeProfile, Language, ThemeColors, PreviewPhotoData } from '../types/delegate';
import { ActionAlertBottomSheet, AlertModalConfig } from '../components/modals/ActionAlertBottomSheet';
import { ChangePasswordModal } from '../components/modals/ChangePasswordModal';
import {
  getTrustedDevicesList,
  revokeTrustedDevice,
  TrustedDeviceItem,
  isBiometricEnabled,
  setBiometricEnabled,
  saveLastCredentialsForBiometrics,
  getStoredToken,
} from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.22;

interface ProfileScreenProps {
  employee: EmployeeProfile;
  empPhotoUrl: string | null;
  lang: Language;
  onOpenQrModal: () => void;
  onOpenLangModal: () => void;
  onLogout: () => void;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  employee,
  empPhotoUrl,
  lang,
  onOpenLangModal,
  onLogout,
  onPreviewPhoto,
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  // Trusted Devices State & Management
  const [trustedDevices, setTrustedDevices] = useState<TrustedDeviceItem[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const loadDevices = async () => {
    if (employee?.national_id) {
      setLoadingDevices(true);
      try {
        const devs = await getTrustedDevicesList(employee.national_id);
        setTrustedDevices(devs);
      } catch (e) {
        console.log('Error loading trusted devices:', e);
      } finally {
        setLoadingDevices(false);
      }
    }
  };

  useEffect(() => {
    loadDevices();
  }, [employee?.national_id]);

  const confirmRevokeDevice = (device: TrustedDeviceItem) => {
    setAlertConfig({
      type: 'confirm',
      title: isRTL ? 'إزالة توثيق الجهاز' : 'Remove Trusted Device',
      message: isRTL
        ? `هل أنت متأكد من رغبتك في حذف توثيق (${device.name})؟\nسيتطلب تسجيل الدخول القادم رمز تحقق OTP جديد من المشرف.`
        : `Are you sure you want to revoke trust for (${device.name})?\nNext login will require a new supervisor OTP.`,
      primaryButtonText: isRTL ? 'إزالة التوثيق' : 'Revoke',
      secondaryButtonText: isRTL ? 'إلغاء' : 'Cancel',
      onPrimaryPress: async () => {
        if (employee?.national_id) {
          await revokeTrustedDevice(employee.national_id, device.uuid);
          await loadDevices();
        }
      },
    });
  };

  // Biometric Management in Profile
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsOn, setBiometricsOn] = useState(false);

  useEffect(() => {
    const checkBio = async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (hasHardware && isEnrolled) {
          setBiometricsAvailable(true);
          const enabled = await isBiometricEnabled();
          setBiometricsOn(enabled);
        }
      } catch (e) {
        console.log('Biometric check error in Profile:', e);
      }
    };
    checkBio();
  }, []);

  const handleToggleBiometrics = async (val: boolean) => {
    if (val) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: isRTL ? 'تأكيد البصمة لتفعيل الدخول السريع' : 'Confirm Biometrics to Enable',
          cancelLabel: isRTL ? 'إلغاء' : 'Cancel',
          disableDeviceFallback: false,
        });
        if (result.success) {
          const token = getStoredToken();
          if (token && employee?.national_id) {
            await saveLastCredentialsForBiometrics(employee.national_id, token, employee);
          }
          await setBiometricEnabled(true);
          setBiometricsOn(true);
          setAlertConfig({
            type: 'info',
            title: isRTL ? 'تم التفعيل بنجاح' : 'Enabled Successfully',
            message: isRTL
              ? 'تم تفعيل الدخول بالبصمة بنجاح لهذا الجهاز.'
              : 'Biometric login has been activated on this device.',
            primaryButtonText: isRTL ? 'حسناً' : 'OK',
          });
        }
      } catch (e) {
        console.log('Biometric activation error:', e);
      }
    } else {
      await setBiometricEnabled(false);
      setBiometricsOn(false);
    }
  };

  // Format document URLs if stored as relative path
  const formatDocUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `https://aams-backend-fxy7.onrender.com/uploads/${url.replace(/^\/+/, '')}`;
  };

  const nationalIdPhotoUrl = formatDocUrl(employee.national_id_image);
  const drivingLicensePhotoUrl = formatDocUrl(employee.driving_license_image);
  const vehicleRegPhotoUrl = formatDocUrl(employee.vehicle_registration_image);
  const passportPhotoUrl = formatDocUrl(employee.passport_image);

  const phoneValue =
    employee.employee_number ||
    employee.phone ||
    (employee as any).phone_number ||
    (employee as any).mobile ||
    '—';

  // 4 Documents Deck in exact order
  const allDocuments = [
    {
      id: 'national_id',
      title: t.idAndIqamaPhoto || 'صورة الهوية / الإقامة',
      shortTitle: isRTL ? 'الهوية الوطنية / الإقامة' : 'National ID / Iqama',
      icon: 'card-outline' as const,
      iconFamily: 'ion',
      accentColor: '#3b82f6',
      badgeColor: 'rgba(59, 130, 246, 0.15)',
      url: nationalIdPhotoUrl,
    },
    {
      id: 'driving_license',
      title: t.drivingLicensePhoto || 'صورة رخصة القيادة',
      shortTitle: isRTL ? 'رخصة القيادة' : 'Driving License',
      icon: 'card-account-details-outline' as const,
      iconFamily: 'material',
      accentColor: '#10b981',
      badgeColor: 'rgba(16, 185, 129, 0.15)',
      url: drivingLicensePhotoUrl,
    },
    {
      id: 'vehicle_registration',
      title: t.vehicleRegistrationPhoto || 'صورة رخصة الدباب (الاستمارة)',
      shortTitle: isRTL ? 'رخصة الدباب (الاستمارة)' : 'Vehicle Registration',
      icon: 'file-document-outline' as const,
      iconFamily: 'material',
      accentColor: '#f59e0b',
      badgeColor: 'rgba(245, 158, 11, 0.15)',
      url: vehicleRegPhotoUrl,
    },
    {
      id: 'passport',
      title: t.passportPhoto || 'صورة جواز السفر',
      shortTitle: isRTL ? 'جواز السفر' : 'Passport',
      icon: 'passport' as const,
      iconFamily: 'material',
      accentColor: '#8b5cf6',
      badgeColor: 'rgba(139, 92, 246, 0.15)',
      url: passportPhotoUrl,
    },
  ];

  // Only keep documents that have an uploaded photo / URL
  const documents = allDocuments.filter((doc) => Boolean(doc.url));

  const [currentIndex, setCurrentIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.25 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const forceSwipe = (direction: 'right' | 'left') => {
    const x = direction === 'right' ? SCREEN_WIDTH + 80 : -SCREEN_WIDTH - 80;
    Animated.timing(position, {
      toValue: { x, y: 20 },
      duration: 220,
      useNativeDriver: false,
    }).start(() => onSwipeComplete());
  };

  const onSwipeComplete = () => {
    position.setValue({ x: 0, y: 0 });
    if (documents.length > 0) {
      setCurrentIndex((prev) => (prev + 1) % documents.length);
    }
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      tension: 40,
      useNativeDriver: false,
    }).start();
  };

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
    outputRange: ['-22deg', '0deg', '22deg'],
  });

  const cardStyle = {
    transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
  };

  const handleCardPress = (doc: (typeof allDocuments)[0]) => {
    if (doc.url) {
      onPreviewPhoto({
        url: doc.url,
        title: `${doc.title} - ${employee.name}`,
      });
    }
  };

  return (
    <View style={styles.tabContainer}>
      {/* Profile Header Card */}
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.profileAvatarSection}>
          <View style={[styles.profileAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            {empPhotoUrl ? (
              <Image source={{ uri: empPhotoUrl }} style={styles.profileAvatarImg} />
            ) : (
              <Ionicons name="person" size={44} color={colors.primary} />
            )}
          </View>
          <Text style={[styles.profileName, { color: colors.textPrimary }]}>{employee.name}</Text>
        </View>

        {/* Info Rows */}
        <View style={[styles.profileInfoList, { borderTopColor: colors.border }]}>
          {/* National ID */}
          <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t.nationalId}</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{employee.national_id || '—'}</Text>
          </View>

          {/* Phone Number */}
          <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t.phoneNumber}</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{phoneValue}</Text>
          </View>

          {/* Branch (if available) */}
          {employee.branch_name && (
            <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{t.branch}</Text>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{employee.branch_name}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Official Documents Section (3D Swipe Paper Stack Deck) */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header */}
        <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.titleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="documents-outline" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {t.officialDocuments || 'الوثائق والمستندات الرسمية'}
            </Text>
          </View>

          <View style={[styles.counterBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Text style={[styles.counterBadgeText, { color: colors.primaryText }]}>
              {documents.length > 0 ? `${Math.min(currentIndex + 1, documents.length)} / ${documents.length}` : '0 / 0'}
            </Text>
          </View>
        </View>

        {documents.length > 0 ? (
          <>
            <Text style={[styles.swipeInstruction, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t.docsCardSub}
            </Text>

            {/* 3D Stack Deck Area */}
            <View style={styles.deckContainer}>
              {/* Render cards from back to front */}
              {documents
                .map((doc, idx) => {
                  if (idx < currentIndex) {
                    return null;
                  }

                  const isFrontCard = idx === currentIndex;
                  const depthIndex = idx - currentIndex;

                  if (isFrontCard) {
                    return (
                      <Animated.View
                        key={doc.id}
                        {...panResponder.panHandlers}
                        style={[
                          styles.flyingCard,
                          cardStyle,
                          {
                            backgroundColor: colors.card,
                            borderColor: doc.accentColor,
                            zIndex: 20,
                          },
                        ]}
                      >
                        {/* Top Accent Strip */}
                        <View style={[styles.cardAccentBar, { backgroundColor: doc.accentColor }]} />

                        {/* Card Header inside */}
                        <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <View style={[styles.cardIconBadge, { backgroundColor: doc.badgeColor }]}>
                            {doc.iconFamily === 'ion' ? (
                              <Ionicons name={doc.icon as any} size={20} color={doc.accentColor} />
                            ) : (
                              <MaterialCommunityIcons name={doc.icon as any} size={20} color={doc.accentColor} />
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.cardDocTitle,
                                { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                              ]}
                              numberOfLines={1}
                            >
                              {doc.title}
                            </Text>
                          </View>

                          <View style={[styles.statusPill, { backgroundColor: 'rgba(34, 197, 94, 0.12)', borderColor: '#22c55e' }]}>
                            <Ionicons name="checkmark-circle" size={13} color="#22c55e" />
                            <Text
                              style={[
                                styles.statusPillText,
                                { color: '#22c55e' },
                              ]}
                            >
                              {t.docReadyBadge || 'جاهزة'}
                            </Text>
                          </View>
                        </View>

                        {/* Direct Image Display without inner box wrapper */}
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => handleCardPress(doc)}
                          style={styles.cardDirectImageTouch}
                        >
                          <Image
                            source={{ uri: doc.url! }}
                            style={styles.cardDirectImage}
                            resizeMode="cover"
                          />
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  }

                  // Background stacked cards (peek underneath)
                  const scale = 1 - depthIndex * 0.05;
                  const translateY = depthIndex * 14;
                  const opacity = 1 - depthIndex * 0.25;

                  return (
                    <View
                      key={doc.id}
                      style={[
                        styles.flyingCard,
                        styles.backgroundDeckCard,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: doc.accentColor + '55',
                          transform: [{ scale }, { translateY }],
                          opacity,
                          zIndex: 10 - depthIndex,
                        },
                      ]}
                    >
                      <View style={[styles.cardAccentBar, { backgroundColor: doc.accentColor }]} />
                      <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.cardIconBadge, { backgroundColor: doc.badgeColor }]}>
                          {doc.iconFamily === 'ion' ? (
                            <Ionicons name={doc.icon as any} size={18} color={doc.accentColor} />
                          ) : (
                            <MaterialCommunityIcons name={doc.icon as any} size={18} color={doc.accentColor} />
                          )}
                        </View>
                        <Text
                          style={[
                            styles.cardDocTitle,
                            { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                          ]}
                          numberOfLines={1}
                        >
                          {doc.title}
                        </Text>
                      </View>
                    </View>
                  );
                })
                .reverse()}
            </View>
          </>
        ) : (
          <View style={[styles.cardEmptyPlaceholder, { borderColor: colors.border, height: 140, marginTop: 8 }]}>
            <Ionicons name="document-text-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              {t.noDocumentPhoto || 'لا توجد وثائق مرفقة حالياً'}
            </Text>
          </View>
        )}
      </View>

      {/* Trusted Devices Box */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginBottom: 12 }]}>
          <View style={[styles.titleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <MaterialCommunityIcons name="shield-check" size={20} color="#10b981" />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {t.trustedDevices || 'الأجهزة الموثقة'}
            </Text>
          </View>
          <View style={[styles.counterBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: 'rgba(16, 185, 129, 0.25)' }]}>
            <Text style={[styles.counterBadgeText, { color: '#10b981' }]}>
              {trustedDevices.length}
            </Text>
          </View>
        </View>

        {loadingDevices ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
        ) : trustedDevices.length > 0 ? (
          <View style={styles.devicesList}>
            {trustedDevices.map((device, idx) => (
              <View
                key={device.uuid || idx}
                style={[
                  styles.deviceRow,
                  {
                    backgroundColor: device.isCurrent
                      ? (isDarkMode ? 'rgba(16, 185, 129, 0.08)' : '#f0fdf4')
                      : (isDarkMode ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc'),
                    borderColor: device.isCurrent
                      ? (isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#bbf7d0')
                      : colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                {/* Device Icon */}
                <View
                  style={[
                    styles.deviceIconBox,
                    {
                      backgroundColor: device.isCurrent
                        ? (isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#dcfce7')
                        : (isDarkMode ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0'),
                    },
                  ]}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={22}
                    color={device.isCurrent ? '#10b981' : colors.textSecondary}
                  />
                </View>

                {/* Device Info */}
                <View style={[styles.deviceInfoCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <View style={[styles.deviceNameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.deviceNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                      {device.name}
                    </Text>
                    {device.isCurrent && (
                      <View style={styles.currentDeviceBadge}>
                        <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                        <Text style={styles.currentDeviceBadgeText}>
                          {t.currentDeviceBadge || 'هذا الجهاز الحالي'}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.deviceOsText, { color: colors.textSecondary }]}>
                    {device.os ? `${device.os} • ` : ''}
                    {t.trustedDeviceStatus || 'موثق عبر المشرف'}
                  </Text>
                </View>

                {/* Delete / Revoke Action */}
                <TouchableOpacity
                  style={[styles.deviceDeleteBtn, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fee2e2' }]}
                  onPress={() => confirmRevokeDevice(device)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={17} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.cardEmptyPlaceholder, { borderColor: colors.border, height: 90, marginTop: 4 }]}>
            <MaterialCommunityIcons name="shield-off-outline" size={26} color={colors.textSecondary} />
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              {t.noTrustedDevices || 'لا توجد أجهزة موثقة مسجلة'}
            </Text>
          </View>
        )}
      </View>

      {/* Language & Settings Box */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
          {t.appSettings}
        </Text>

        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={onOpenLangModal}
        >
          <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="globe-outline" size={20} color={colors.primary} />
            <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>
              {t.language}
            </Text>
          </View>
          <Text style={[styles.settingRowVal, { color: colors.primary }]}>
            {lang === 'ar' ? 'العربية' : lang === 'en' ? 'English' : 'বাংলা'}
          </Text>
        </TouchableOpacity>

        {/* Biometrics Toggle Row */}
        {biometricsAvailable && (
          <View
            style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          >
            <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="finger-print" size={20} color={colors.primary} />
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>
                  {t.biometricLogin || 'تسجيل الدخول بالبصمة'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  {t.biometricLoginSub || 'بصمة الإصبع أو الوجه'}
                </Text>
              </View>
            </View>
            <Switch
              value={biometricsOn}
              onValueChange={handleToggleBiometrics}
              trackColor={{ false: '#94a3b8', true: '#10b981' }}
              thumbColor="#ffffff"
            />
          </View>
        )}

        {/* Change Password Row */}
        <TouchableOpacity
          style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={() => setShowPasswordModal(true)}
        >
          <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="key-outline" size={20} color={colors.primary} />
            <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>
              {t.changePassword}
            </Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={onLogout}
        >
          <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={[styles.settingRowText, { color: '#ef4444' }]}>{t.logout}</Text>
          </View>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ChangePasswordModal
        visible={showPasswordModal}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        t={t}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => {
          setShowPasswordModal(false);
          setAlertConfig({
            type: 'success',
            title: t.passwordChangedSuccess,
            message: isRTL
              ? 'تم تحديث كلمة المرور الخاصة بك بنجاح، يمكنك استخدامها في المرات القادمة.'
              : 'Your account password has been updated successfully.',
            primaryButtonText: t.okBtn || 'حسناً',
            onPrimaryPress: () => setAlertConfig(null),
          });
        }}
      />

      <ActionAlertBottomSheet
        config={alertConfig}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        onClose={() => setAlertConfig(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    padding: 16,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  profileAvatarSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  profileAvatarImg: {
    width: '100%',
    height: '100%',
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileInfoList: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 12,
  },
  infoRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleGroup: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  swipeInstruction: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 14,
    marginTop: 2,
  },
  deckContainer: {
    height: 250,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  flyingCard: {
    position: 'absolute',
    width: '100%',
    height: 240,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  backgroundDeckCard: {
    pointerEvents: 'none',
  },
  cardAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  cardHeader: {
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  cardIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardDocTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  cardDirectImageTouch: {
    flex: 1,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardDirectImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  cardEmptyPlaceholder: {
    flex: 1,
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  placeholderText: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingRow: {
    paddingVertical: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingRowRight: {
    alignItems: 'center',
    gap: 10,
  },
  settingRowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingRowVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  devicesList: {
    gap: 10,
    marginTop: 4,
  },
  deviceRow: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  deviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deviceInfoCol: {
    flex: 1,
    gap: 4,
  },
  deviceNameRow: {
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  deviceNameText: {
    fontSize: 14,
    fontWeight: '700',
  },
  currentDeviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  currentDeviceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  deviceOsText: {
    fontSize: 11,
    fontWeight: '500',
  },
  deviceDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
