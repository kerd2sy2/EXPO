import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import { ThemeColors } from '../types/delegate';
import { custodyService } from '../services/custodyService';
import { saveCachedUser, formatImageUrl, updateMyAvatar } from '../services/api';
import { AhdaLogoutBottomSheet } from '../components/modals/AhdaLogoutBottomSheet';
import { AhdaAvatarSuccessModal } from '../components/modals/AhdaAvatarSuccessModal';

interface AhdaProfileScreenProps {
  currentUser: any;
  colors: ThemeColors;
  isDarkMode: boolean;
  onBack: () => void;
  onLogout: () => void;
  onToggleTheme: () => void;
  themePreference?: 'system' | 'light' | 'dark';
  onSelectThemePreference?: (pref: 'system' | 'light' | 'dark') => void;
  onUpdateUser?: (updated: any) => void;
}

export const AhdaProfileScreen: React.FC<AhdaProfileScreenProps> = ({
  currentUser,
  colors,
  isDarkMode,
  onBack,
  onLogout,
  onToggleTheme,
  themePreference = 'light',
  onSelectThemePreference,
  onUpdateUser,
}) => {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateModalState, setUpdateModalState] = useState<'checking' | 'up_to_date' | 'available' | 'downloading'>('checking');
  
  // Theme Modal State
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Avatar Edit & Upload State
  const [showAvatarActionModal, setShowAvatarActionModal] = useState(false);
  const [showAvatarSuccessModal, setShowAvatarSuccessModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

  // Load cached avatar on mount or sync from server user profile
  React.useEffect(() => {
    AsyncStorage.getItem('@aams_cached_avatar').then((saved) => {
      if (saved) {
        setLocalAvatarUri(saved);
      } else if (currentUser?.avatar || currentUser?.google_avatar || currentUser?.personal_image) {
        const serverAvatar = currentUser.avatar || currentUser.google_avatar || currentUser.personal_image;
        setLocalAvatarUri(serverAvatar);
        AsyncStorage.setItem('@aams_cached_avatar', serverAvatar).catch(() => {});
      }
    }).catch(() => {});
  }, [currentUser?.avatar, currentUser?.google_avatar, currentUser?.personal_image]);

  const userName = currentUser?.name || currentUser?.full_name || currentUser?.username || 'مسؤول العهدة';
  const userEmail = currentUser?.email || currentUser?.google_email || '—';
  const rawAvatar =
    localAvatarUri ||
    currentUser?.avatar ||
    currentUser?.google_avatar ||
    currentUser?.personal_image ||
    currentUser?.photo ||
    currentUser?.image ||
    currentUser?.picture ||
    currentUser?.employee?.personal_image ||
    currentUser?.admin?.google_avatar ||
    null;
  const avatarUrl = formatImageUrl(rawAvatar);
  const userCode = currentUser?.code || currentUser?.username || '—';

  // Handle OTA Cloud Updates
  const handleCheckUpdates = async () => {
    setUpdateModalVisible(true);
    setUpdateModalState('checking');
    setCheckingUpdate(true);

    try {
      if (__DEV__) {
        await new Promise((res) => setTimeout(res, 800));
        setUpdateModalState('up_to_date');
        setCheckingUpdate(false);
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateModalState('available');
      } else {
        setUpdateModalState('up_to_date');
      }
    } catch (err: any) {
      console.warn('Update check error:', err);
      setUpdateModalState('up_to_date');
    } finally {
      setCheckingUpdate(false);
    }
  };

  // Auto-close update modal 1 second after 'up_to_date' animation completes (with safety fallback)
  useEffect(() => {
    let timer: any;
    if (updateModalVisible && updateModalState === 'up_to_date') {
      timer = setTimeout(() => {
        setUpdateModalVisible(false);
      }, 3500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [updateModalVisible, updateModalState]);

  const handleApplyUpdateNow = async () => {
    try {
      setUpdateModalState('downloading');
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (err: any) {
      console.warn('Failed to apply update:', err);
      Alert.alert('تنبيه', 'تعذر استكمال تطبيق التحديث حالياً، يرجى المحاولة لاحقاً.');
      setUpdateModalVisible(false);
    }
  };

  // Handle Avatar Change (Camera or Gallery)
  const handlePickAvatar = async (type: 'camera' | 'library') => {
    setShowAvatarActionModal(false);
    try {
      let result: ImagePicker.ImagePickerResult;

      if (type === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('إذن الكاميرا مطلوب', 'يرجى منح إذن الوصول للكاميرا من إعدادات الهاتف لالتقاط الصورة.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('إذن الصور مطلوب', 'يرجى منح إذن الوصول لمعرض الصور لاختيار الصورة.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        setLocalAvatarUri(pickedUri);
        setUploadingAvatar(true);

        // Upload image to backend
        let finalAvatarUrl = pickedUri;
        try {
          const uploadedUrl = await custodyService.uploadInvoiceImage(pickedUri);
          if (uploadedUrl) {
            finalAvatarUrl = uploadedUrl;
          }
        } catch (uploadErr) {
          console.warn('Avatar upload to server failed, keeping local uri:', uploadErr);
        }

        // Persist permanently to backend database + user session
        await updateMyAvatar(finalAvatarUrl);

        const updatedUser = {
          ...currentUser,
          avatar: finalAvatarUrl,
          google_avatar: finalAvatarUrl,
          personal_image: finalAvatarUrl,
        };
        if (onUpdateUser) {
          onUpdateUser(updatedUser);
        }
        setShowAvatarSuccessModal(true);
      }
    } catch (err: any) {
      console.error('Error changing avatar:', err);
      Alert.alert('خطأ', 'فشل تغيير صورة الملف الشخصي، يرجى المحاولة مجدداً.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setShowAvatarActionModal(false);
    setLocalAvatarUri(null);
    await updateMyAvatar('');
    const updatedUser = {
      ...currentUser,
      avatar: null,
      google_avatar: null,
      personal_image: null,
    };
    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }
    Alert.alert('تم', 'تمت إزالة صورة الملف الشخصي.');
  };

  // Logout Bottom Sheet State
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = () => {
    setShowLogoutModal(true);
  };

  const currentThemeLabel =
    themePreference === 'dark' || isDarkMode
      ? 'الوضع الداكن'
      : 'الوضع الفاتح';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* ── Sub-Page Header Row (Matching Delegate Screens Style) ── */}
      <View style={styles.subPageHeaderRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.subPageTitleContainer}>
          <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary }]}>الملف الشخصي</Text>
          <View style={[styles.titleUnderlineBar, { backgroundColor: '#047857' }]} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── 1. Profile Header Card (Enhanced Avatar & Identity) ── */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileAvatarSection}>
            <TouchableOpacity
              style={styles.avatarTouchable}
              onPress={() => setShowAvatarActionModal(true)}
              activeOpacity={0.85}
              disabled={uploadingAvatar}
            >
              {/* Outer decorative ring */}
              <View
                style={[
                  styles.profileAvatarRing,
                  {
                    borderColor: isDarkMode ? '#065f46' : '#a7f3d0',
                    backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
                  },
                ]}
              >
                <View style={[styles.profileAvatar, { backgroundColor: isDarkMode ? '#022c22' : '#f0fdf4', borderColor: '#047857' }]}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.profileAvatarImg} />
                  ) : (
                    <Ionicons name="person" size={48} color="#047857" />
                  )}
                  {uploadingAvatar && (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  )}
                </View>
              </View>

              {/* Edit Camera Badge */}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={13} color="#ffffff" />
              </View>
            </TouchableOpacity>

            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{userName}</Text>

            {/* Role & Branch Badges */}
            <View style={styles.profileBadgesRow}>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: isDarkMode ? 'rgba(6, 78, 59, 0.4)' : '#ecfdf5',
                    borderColor: isDarkMode ? '#059669' : '#a7f3d0',
                  },
                ]}
              >
                <Ionicons name="shield-checkmark" size={13} color="#047857" />
                <Text style={[styles.roleBadgeText, { color: isDarkMode ? '#6ee7b7' : '#047857' }]}>
                  مسؤول العهدة المالية
                </Text>
              </View>

              {currentUser?.branch?.name && (
                <View
                  style={[
                    styles.branchBadge,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                      borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                    },
                  ]}
                >
                  <Ionicons name="business-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.branchBadgeText, { color: colors.textSecondary }]}>
                    {currentUser.branch.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── 2. Settings Card (Refined & Modern) ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleGroup}>
              <View style={[styles.sectionIconBadge, { backgroundColor: isDarkMode ? 'rgba(6, 78, 59, 0.4)' : '#ecfdf5' }]}>
                <Ionicons name="options-outline" size={16} color="#047857" />
              </View>
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>إعدادات التطبيق والمظهر</Text>
            </View>
          </View>

          {/* Theme Mode Selector */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
            onPress={() => setShowThemeModal(true)}
            activeOpacity={0.7}
          >
            <View style={styles.settingRowRight}>
              <View
                style={[
                  styles.settingIconBox,
                  {
                    backgroundColor: isDarkMode ? '#0f172a' : '#fef3c7',
                    borderColor: isDarkMode ? '#334155' : '#fde68a',
                  },
                ]}
              >
                <Ionicons
                  name={isDarkMode ? 'moon' : 'sunny'}
                  size={19}
                  color={isDarkMode ? '#38bdf8' : '#d97706'}
                />
              </View>
              <View style={{ alignItems: 'flex-start' }}>
                <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>مظهر التطبيق</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  تخصيص الوضع الفاتح أو الداكن
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <View
                style={[
                  styles.pillTag,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#ecfdf5',
                    borderColor: isDarkMode ? '#334155' : '#a7f3d0',
                  },
                ]}
              >
                <Text style={[styles.pillTagText, { color: isDarkMode ? '#94a3b8' : '#047857' }]}>
                  {currentThemeLabel}
                </Text>
              </View>
              <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          {/* Check for OTA Updates Row */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            onPress={handleCheckUpdates}
            activeOpacity={0.7}
          >
            <View style={styles.settingRowRight}>
              <View
                style={[
                  styles.settingIconBox,
                  {
                    backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
                    borderColor: isDarkMode ? '#047857' : '#a7f3d0',
                  },
                ]}
              >
                <Ionicons name="cloud-download-outline" size={19} color="#047857" />
              </View>
              <View style={{ alignItems: 'flex-start' }}>
                <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>تحديث التطبيق السحابي</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  التحقق من وجود آخر المزايا والتحسينات
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
              <View
                style={[
                  styles.pillTag,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  },
                ]}
              >
                <Text style={[styles.pillTagText, { color: colors.textSecondary }]}>v1.0.0</Text>
              </View>
              <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ── 3. Dedicated Standout Logout Card ── */}
        <TouchableOpacity
          style={[
            styles.logoutCard,
            {
              backgroundColor: isDarkMode ? '#1f1414' : '#fef2f2',
              borderColor: isDarkMode ? '#450a0a' : '#fecaca',
            },
          ]}
          onPress={confirmLogout}
          activeOpacity={0.82}
        >
          <View style={styles.logoutContentRow}>
            <View style={[styles.logoutIconCircle, { backgroundColor: isDarkMode ? '#450a0a' : '#fee2e2' }]}>
              <Ionicons name="log-out-outline" size={20} color="#dc2626" />
            </View>
            <View style={{ alignItems: 'flex-start', flex: 1 }}>
              <Text style={styles.logoutTitle}>تسجيل الخروج من الحساب</Text>
              <Text style={[styles.logoutSub, { color: isDarkMode ? '#f87171' : '#b91c1c' }]}>
                الخروج الآمن وإنهاء الجلسة الحالية
              </Text>
            </View>
            <Ionicons name="chevron-back" size={17} color="#dc2626" />
          </View>
        </TouchableOpacity>

        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          جميع الحقوق محفوظة © {new Date().getFullYear()} AAMS Logistics
        </Text>
      </ScrollView>

      {/* ── 3. Bottom Sheet Modal: Theme Mode Selector ── */}
      <Modal
        visible={showThemeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowThemeModal(false)}
          />
          <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHandle} />

            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary, textAlign: 'center' }]}>مظهر التطبيق</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
                اختر النمط المناسب لك لعرض واجهات النظام
              </Text>
            </View>

            {/* Options */}
            <View style={styles.themeOptionsList}>
              {/* Option 1: Light Mode */}
              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderColor: themePreference === 'light' ? '#047857' : (isDarkMode ? '#334155' : '#e2e8f0'),
                  },
                  themePreference === 'light' && styles.themeOptionCardActive,
                ]}
                onPress={() => {
                  if (onSelectThemePreference) {
                    onSelectThemePreference('light');
                  } else if (isDarkMode) {
                    onToggleTheme();
                  }
                  setShowThemeModal(false);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.themeOptionRight}>
                  <View style={[styles.themeIconBox, { backgroundColor: '#ecfdf5' }]}>
                    <Ionicons name="sunny" size={20} color="#047857" />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.themeOptionTitle, { color: colors.textPrimary }]}>الوضع الفاتح</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>مظهر نهاري ساطع ومريح للعين</Text>
                  </View>
                </View>
                <Ionicons
                  name={themePreference === 'light' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={themePreference === 'light' ? '#047857' : colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Option 2: Dark Mode */}
              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderColor: themePreference === 'dark' ? '#047857' : (isDarkMode ? '#334155' : '#e2e8f0'),
                  },
                  themePreference === 'dark' && styles.themeOptionCardActive,
                ]}
                onPress={() => {
                  if (onSelectThemePreference) {
                    onSelectThemePreference('dark');
                  } else if (!isDarkMode) {
                    onToggleTheme();
                  }
                  setShowThemeModal(false);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.themeOptionRight}>
                  <View style={[styles.themeIconBox, { backgroundColor: isDarkMode ? '#0f172a' : '#f1f5f9' }]}>
                    <Ionicons name="moon" size={20} color="#38bdf8" />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.themeOptionTitle, { color: colors.textPrimary }]}>الوضع الداكن</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>مظهر ليلي أنيق وموفر للطاقة</Text>
                  </View>
                </View>
                <Ionicons
                  name={themePreference === 'dark' ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={themePreference === 'dark' ? '#047857' : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 4. Cloud Update Status Modal (Bottom Sheet Presentation) ── */}
      <Modal
        visible={updateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (updateModalState !== 'downloading') setUpdateModalVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              if (updateModalState !== 'downloading') setUpdateModalVisible(false);
            }}
          />
          <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHandle} />

            {updateModalState === 'checking' && (
              <View style={styles.updateModalContent}>
                <View style={[styles.updateIconCircle, { backgroundColor: '#ecfdf5' }]}>
                  <ActivityIndicator size="large" color="#047857" />
                </View>
                <Text style={[styles.updateModalTitle, { color: colors.textPrimary }]}>
                  جارِ التحقق من التحديثات...
                </Text>
                <Text style={[styles.updateModalSub, { color: colors.textSecondary }]}>
                  يتم فحص خادم التحديثات السحابية لتوفير أحدث نسخة معتمدة.
                </Text>
              </View>
            )}

            {updateModalState === 'up_to_date' && (
              <View style={styles.updateModalContent}>
                <View style={styles.updateLottieWrap}>
                  <LottieView
                    source={require('../../assets/Lottie/lottie/OfbVDo06RM.lottie')}
                    autoPlay
                    loop={false}
                    style={styles.updateLottieAnim}
                    onAnimationFinish={() => {
                      setTimeout(() => {
                        setUpdateModalVisible(false);
                      }, 1000);
                    }}
                  />
                </View>
                <Text style={[styles.updateModalTitle, { color: colors.textPrimary }]}>
                  أنت على آخر إصدار
                </Text>
                <Text style={[styles.updateModalSub, { color: colors.textSecondary }]}>
                  تطبيقك محدث بالكامل ومزود بأحدث التحسينات المعتمدة.
                </Text>
              </View>
            )}

            {updateModalState === 'available' && (
              <View style={styles.updateModalContent}>
                <View style={styles.updateLottieWrap}>
                  <LottieView
                    source={require('../../assets/Lottie/lottie/lZP6vbMw39.lottie')}
                    autoPlay
                    loop={true}
                    style={styles.updateLottieAnim}
                  />
                </View>
                <Text style={[styles.updateModalTitle, { color: colors.textPrimary }]}>
                  يوجد تحديث سحابي جديد متوفر
                </Text>
                <Text style={[styles.updateModalSub, { color: colors.textSecondary }]}>
                  يتوفر إصدار جديد يتضمن ترقيات وتحسينات للنظام. هل تريد تنزيله وتطبيقه الآن؟
                </Text>
                <View style={styles.updateActionsRow}>
                  <TouchableOpacity
                    style={[styles.updateSecondaryBtn, { borderColor: colors.border }]}
                    onPress={() => setUpdateModalVisible(false)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.updateSecondaryBtnText, { color: colors.textSecondary }]}>لاحقاً</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.updateMainBtn, { flex: 1, marginTop: 0 }]}
                    onPress={handleApplyUpdateNow}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="refresh" size={16} color="#ffffff" style={{ marginLeft: 6 }} />
                    <Text style={styles.updateMainBtnText}>تحديث الآن</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {updateModalState === 'downloading' && (
              <View style={styles.updateModalContent}>
                <View style={styles.updateLottieWrap}>
                  <LottieView
                    source={require('../../assets/Lottie/lottie/lZP6vbMw39.lottie')}
                    autoPlay
                    loop={true}
                    style={styles.updateLottieAnim}
                  />
                </View>
                <Text style={[styles.updateModalTitle, { color: colors.textPrimary }]}>
                  جارِ تنزيل وتطبيق التحديث...
                </Text>
                <Text style={[styles.updateModalSub, { color: colors.textSecondary }]}>
                  يرجى الانتظار لحظات، سيتم إعادة تشغيل التطبيق تلقائياً بالنسخة المحدثة.
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── 5. Avatar Action Modal (Camera / Gallery Picker / Remove) ── */}
      <Modal
        visible={showAvatarActionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAvatarActionModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setShowAvatarActionModal(false)}
          />
          <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                onPress={() => setShowAvatarActionModal(false)}
                style={styles.modalCloseIconBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              <View style={{ alignItems: 'flex-end', flex: 1 }}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تغيير صورة الملف الشخصي</Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                  اختر طريقة تعيين الصورة الخاصة بحسابك
                </Text>
              </View>
            </View>

            <View style={styles.themeOptionsList}>
              {/* Option 1: Camera */}
              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  },
                ]}
                onPress={() => handlePickAvatar('camera')}
                activeOpacity={0.8}
              >
                <View style={styles.themeOptionRight}>
                  <View style={[styles.themeIconBox, { backgroundColor: '#ecfdf5' }]}>
                    <Ionicons name="camera" size={20} color="#047857" />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.themeOptionTitle, { color: colors.textPrimary }]}>التقاط صورة بالكاميرا</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>استخدام كاميرا الهاتف مباشرة</Text>
                  </View>
                </View>
                <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Option 2: Photo Library */}
              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  },
                ]}
                onPress={() => handlePickAvatar('library')}
                activeOpacity={0.8}
              >
                <View style={styles.themeOptionRight}>
                  <View style={[styles.themeIconBox, { backgroundColor: '#f0f9ff' }]}>
                    <Ionicons name="images" size={20} color="#0284c7" />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.themeOptionTitle, { color: colors.textPrimary }]}>اختيار من معرض الصور</Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>تحديد صورة مخزنة على جهازك</Text>
                  </View>
                </View>
                <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
              </TouchableOpacity>

              {/* Option 3: Remove Avatar (if exists) */}
              {(avatarUrl || localAvatarUri) && (
                <TouchableOpacity
                  style={[
                    styles.themeOptionCard,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#fef2f2',
                      borderColor: isDarkMode ? '#334155' : '#fee2e2',
                    },
                  ]}
                  onPress={handleRemoveAvatar}
                  activeOpacity={0.8}
                >
                  <View style={styles.themeOptionRight}>
                    <View style={[styles.themeIconBox, { backgroundColor: '#fee2e2' }]}>
                      <Ionicons name="trash-outline" size={20} color="#dc2626" />
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.themeOptionTitle, { color: '#dc2626' }]}>إزالة الصورة الحالية</Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary }}>العودة إلى الأيقونة الرمزية الافتراضية</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[styles.modalBottomBtn, { borderColor: colors.border }]}
              onPress={() => setShowAvatarActionModal(false)}
            >
              <Text style={[styles.modalBottomBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── 5. Logout Confirmation Bottom Sheet ── */}
      <AhdaLogoutBottomSheet
        visible={showLogoutModal}
        user={currentUser}
        colors={colors}
        isDarkMode={isDarkMode}
        onConfirm={onLogout}
        onClose={() => setShowLogoutModal(false)}
      />

      {/* ── 6. Avatar Save Success Bottom Sheet Modal (with Zt7a58Tu7M Animation) ── */}
      <AhdaAvatarSuccessModal
        visible={showAvatarSuccessModal}
        colors={colors}
        isDarkMode={isDarkMode}
        onClose={() => setShowAvatarSuccessModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  subPageHeaderRow: {
    height: 56,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 0,
  },
  headerBackBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subPageTitleContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  subPageHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'right',
  },
  titleUnderlineBar: {
    width: 28,
    height: 3,
    borderRadius: 2,
    alignSelf: 'flex-end',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatarSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarTouchable: {
    position: 'relative',
    marginBottom: 10,
  },
  profileAvatarRing: {
    width: 98,
    height: 98,
    borderRadius: 49,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  profileAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileAvatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#047857',
    borderWidth: 2,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  profileName: {
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  profileBadgesRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  branchBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  branchBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  sectionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  settingRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingRowRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingRowText: {
    fontSize: 13.5,
    fontWeight: '800',
    textAlign: 'right',
  },
  pillTag: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillTagText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  logoutCard: {
    borderRadius: 20,
    borderWidth: 1.2,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutContentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  logoutIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
    textAlign: 'right',
    marginBottom: 2,
  },
  logoutSub: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  modalCloseIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'right',
  },
  sheetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
  themeOptionsList: {
    width: '100%',
    gap: 10,
    marginBottom: 16,
  },
  themeOptionCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  themeOptionCardActive: {
    borderColor: '#047857',
  },
  themeOptionRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  themeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  modalBottomBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBottomBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Update Modal Center Box
  modalCenterBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  updateCardBox: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  updateModalContent: {
    width: '100%',
    alignItems: 'center',
  },
  updateLottieWrap: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  updateLottieAnim: {
    width: '100%',
    height: '100%',
  },
  updateIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  updateModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  updateModalSub: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  updateMainBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    backgroundColor: '#047857',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  updateMainBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  updateActionsRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  updateSecondaryBtn: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  updateSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
