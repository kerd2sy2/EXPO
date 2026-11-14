import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import * as ImagePicker from 'expo-image-picker';
import { ThemeColors } from '../types/delegate';
import { custodyService } from '../services/custodyService';
import { formatImageUrl, updateMyAvatar } from '../services/api';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { AhdaProfileModals } from './profile/AhdaProfileModals';
import { ahdaProfileStyles as styles } from './profile/ahdaProfileStyles';

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
  const [, setCheckingUpdate] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateModalState, setUpdateModalState] = useState<'checking' | 'up_to_date' | 'available' | 'downloading'>('checking');
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showAvatarActionModal, setShowAvatarActionModal] = useState(false);
  const [showAvatarSuccessModal, setShowAvatarSuccessModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const serverAvatar =
      currentUser?.avatar ||
      currentUser?.google_avatar ||
      currentUser?.personal_image ||
      null;
    setLocalAvatarUri(serverAvatar);
  }, [currentUser?.avatar, currentUser?.google_avatar, currentUser?.personal_image]);

  const userName = currentUser?.name || currentUser?.full_name || currentUser?.username || 'مسؤول العهدة';
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
      setUpdateModalState(update.isAvailable ? 'available' : 'up_to_date');
    } catch (err: any) {
      console.warn('Update check error:', err);
      setUpdateModalState('up_to_date');
    } finally {
      setCheckingUpdate(false);
    }
  };

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

        let finalAvatarUrl = pickedUri;
        try {
          const uploadedUrl = await custodyService.uploadInvoiceImage(pickedUri);
          if (uploadedUrl) {
            finalAvatarUrl = uploadedUrl;
          }
        } catch (uploadErr) {
          console.warn('Avatar upload to server failed, keeping local uri:', uploadErr);
        }

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

  const currentThemeLabel =
    themePreference === 'dark' || isDarkMode ? 'الوضع الداكن' : 'الوضع الفاتح';

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
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
        <ModuleErrorBoundary moduleName="بطاقة الملف الشخصي">
          <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.profileAvatarSection}>
              <TouchableOpacity
                style={styles.avatarTouchable}
                onPress={() => setShowAvatarActionModal(true)}
                activeOpacity={0.85}
                disabled={uploadingAvatar}
              >
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

                <View style={styles.avatarEditBadge}>
                  <Ionicons name="camera" size={13} color="#ffffff" />
                </View>
              </TouchableOpacity>

              <Text style={[styles.profileName, { color: colors.textPrimary }]}>{userName}</Text>

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
        </ModuleErrorBoundary>

        <ModuleErrorBoundary moduleName="إعدادات التطبيق">
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.titleGroup}>
                <View style={[styles.sectionIconBadge, { backgroundColor: isDarkMode ? 'rgba(6, 78, 59, 0.4)' : '#ecfdf5' }]}>
                  <Ionicons name="options-outline" size={16} color="#047857" />
                </View>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>إعدادات التطبيق والمظهر</Text>
              </View>
            </View>

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
        </ModuleErrorBoundary>

        <TouchableOpacity
          style={[
            styles.logoutCard,
            {
              backgroundColor: isDarkMode ? '#1f1414' : '#fef2f2',
              borderColor: isDarkMode ? '#450a0a' : '#fecaca',
            },
          ]}
          onPress={() => setShowLogoutModal(true)}
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

      <AhdaProfileModals
        colors={colors}
        isDarkMode={isDarkMode}
        currentUser={currentUser}
        themePreference={themePreference}
        onToggleTheme={onToggleTheme}
        onSelectThemePreference={onSelectThemePreference}
        showThemeModal={showThemeModal}
        onCloseThemeModal={() => setShowThemeModal(false)}
        updateModalVisible={updateModalVisible}
        updateModalState={updateModalState}
        onCloseUpdateModal={() => setUpdateModalVisible(false)}
        onApplyUpdateNow={handleApplyUpdateNow}
        showAvatarActionModal={showAvatarActionModal}
        onCloseAvatarActionModal={() => setShowAvatarActionModal(false)}
        onPickAvatar={handlePickAvatar}
        onRemoveAvatar={handleRemoveAvatar}
        hasExistingAvatar={Boolean(avatarUrl || localAvatarUri)}
        showLogoutModal={showLogoutModal}
        onCloseLogoutModal={() => setShowLogoutModal(false)}
        onLogout={onLogout}
        showAvatarSuccessModal={showAvatarSuccessModal}
        onCloseAvatarSuccessModal={() => setShowAvatarSuccessModal(false)}
      />
    </View>
  );
};
