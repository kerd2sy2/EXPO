import React from 'react';
import {
  ActivityIndicator,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { ThemeColors } from '../../types/delegate';
import { AhdaLogoutBottomSheet } from '../../components/modals/AhdaLogoutBottomSheet';
import { AhdaAvatarSuccessModal } from '../../components/modals/AhdaAvatarSuccessModal';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { ahdaProfileStyles as styles } from './ahdaProfileStyles';

interface AhdaProfileModalsProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  currentUser: any;
  themePreference: 'system' | 'light' | 'dark';
  onToggleTheme: () => void;
  onSelectThemePreference?: (pref: 'system' | 'light' | 'dark') => void;
  showThemeModal: boolean;
  onCloseThemeModal: () => void;
  updateModalVisible: boolean;
  updateModalState: 'checking' | 'up_to_date' | 'available' | 'downloading';
  onCloseUpdateModal: () => void;
  onApplyUpdateNow: () => void;
  showAvatarActionModal: boolean;
  onCloseAvatarActionModal: () => void;
  onPickAvatar: (type: 'camera' | 'library') => void;
  onRemoveAvatar: () => void;
  hasExistingAvatar: boolean;
  showLogoutModal: boolean;
  onCloseLogoutModal: () => void;
  onLogout: () => void;
  showAvatarSuccessModal: boolean;
  onCloseAvatarSuccessModal: () => void;
}

export const AhdaProfileModals: React.FC<AhdaProfileModalsProps> = ({
  colors,
  isDarkMode,
  currentUser,
  themePreference,
  onToggleTheme,
  onSelectThemePreference,
  showThemeModal,
  onCloseThemeModal,
  updateModalVisible,
  updateModalState,
  onCloseUpdateModal,
  onApplyUpdateNow,
  showAvatarActionModal,
  onCloseAvatarActionModal,
  onPickAvatar,
  onRemoveAvatar,
  hasExistingAvatar,
  showLogoutModal,
  onCloseLogoutModal,
  onLogout,
  showAvatarSuccessModal,
  onCloseAvatarSuccessModal,
}) => (
  <>
    <ModuleErrorBoundary moduleName="نافذة المظهر">
      <Modal
        visible={showThemeModal}
        transparent
        animationType="slide"
        onRequestClose={onCloseThemeModal}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onCloseThemeModal}
          />
          <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHandle} />

            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary, textAlign: 'center' }]}>مظهر التطبيق</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
                اختر النمط المناسب لك لعرض واجهات النظام
              </Text>
            </View>

            <View style={styles.themeOptionsList}>
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
                  onCloseThemeModal();
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
                  onCloseThemeModal();
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
    </ModuleErrorBoundary>

    <ModuleErrorBoundary moduleName="نافذة التحديث السحابي">
      <Modal
        visible={updateModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (updateModalState !== 'downloading') onCloseUpdateModal();
        }}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              if (updateModalState !== 'downloading') onCloseUpdateModal();
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
                    source={require('../../../assets/Lottie/lottie/OfbVDo06RM.lottie')}
                    autoPlay
                    loop={false}
                    style={styles.updateLottieAnim}
                    onAnimationFinish={() => {
                      setTimeout(() => {
                        onCloseUpdateModal();
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
                    source={require('../../../assets/Lottie/lottie/lZP6vbMw39.lottie')}
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
                    onPress={onCloseUpdateModal}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.updateSecondaryBtnText, { color: colors.textSecondary }]}>لاحقاً</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.updateMainBtn, { flex: 1, marginTop: 0 }]}
                    onPress={onApplyUpdateNow}
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
                    source={require('../../../assets/Lottie/lottie/lZP6vbMw39.lottie')}
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
    </ModuleErrorBoundary>

    <ModuleErrorBoundary moduleName="نافذة الصورة الشخصية">
      <Modal
        visible={showAvatarActionModal}
        transparent
        animationType="slide"
        onRequestClose={onCloseAvatarActionModal}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onCloseAvatarActionModal}
          />
          <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.sheetHandle} />

            <View style={styles.modalHeaderRow}>
              <TouchableOpacity
                onPress={onCloseAvatarActionModal}
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
              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  },
                ]}
                onPress={() => onPickAvatar('camera')}
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

              <TouchableOpacity
                style={[
                  styles.themeOptionCard,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  },
                ]}
                onPress={() => onPickAvatar('library')}
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

              {hasExistingAvatar && (
                <TouchableOpacity
                  style={[
                    styles.themeOptionCard,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#fef2f2',
                      borderColor: isDarkMode ? '#334155' : '#fee2e2',
                    },
                  ]}
                  onPress={onRemoveAvatar}
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
              onPress={onCloseAvatarActionModal}
            >
              <Text style={[styles.modalBottomBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ModuleErrorBoundary>

    <ModuleErrorBoundary moduleName="تسجيل الخروج">
      <AhdaLogoutBottomSheet
        visible={showLogoutModal}
        user={currentUser}
        colors={colors}
        isDarkMode={isDarkMode}
        onConfirm={onLogout}
        onClose={onCloseLogoutModal}
      />
    </ModuleErrorBoundary>

    <ModuleErrorBoundary moduleName="تأكيد الصورة الشخصية">
      <AhdaAvatarSuccessModal
        visible={showAvatarSuccessModal}
        colors={colors}
        isDarkMode={isDarkMode}
        onClose={onCloseAvatarSuccessModal}
      />
    </ModuleErrorBoundary>
  </>
);
