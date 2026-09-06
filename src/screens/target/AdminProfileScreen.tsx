import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { ThemeColors } from '../../types/delegate';
import { AppUpdateBottomSheet, UpdateModalState } from '../../components/modals/AppUpdateBottomSheet';

interface AdminProfileScreenProps {
  user: any;
  onOpenTargetSettings?: () => void;
  onLogout: () => void;
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
}

export const AdminProfileScreen: React.FC<AdminProfileScreenProps> = ({
  user,
  onOpenTargetSettings,
  onLogout,
  colors,
  isDarkMode = false,
  isRTL = true,
}) => {
  const isSupervisor = user?.role === 'SUPERVISOR';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const roleLabel = isSupervisor ? 'مشرف التوصيل (Supervisor)' : 'مدير النظام (Admin)';

  // Updates BottomSheet State (Matching Delegate Experience)
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [updateState, setUpdateState] = useState<UpdateModalState>('CHECKING');
  const [updateError, setUpdateError] = useState('');

  const handleCheckForUpdates = async () => {
    if (__DEV__ || !Updates.isEnabled) {
      setUpdateState('CHECKING');
      setUpdateModalVisible(true);
      setTimeout(() => {
        setUpdateState('UP_TO_DATE');
      }, 1200);
      return;
    }

    try {
      setUpdateState('CHECKING');
      setUpdateModalVisible(true);
      const startTime = Date.now();
      const check = await Updates.checkForUpdateAsync().catch((e) => {
        console.log('checkForUpdateAsync catch:', e);
        return { isAvailable: false } as Updates.UpdateCheckResult;
      });
      const elapsed = Date.now() - startTime;
      if (elapsed < 900) {
        await new Promise((resolve) => setTimeout(resolve, 900 - elapsed));
      }

      if (check && check.isAvailable) {
        setUpdateState('DOWNLOADING');
        await Updates.fetchUpdateAsync();
        setUpdateState('READY');
      } else {
        setUpdateState('UP_TO_DATE');
      }
    } catch (err: any) {
      console.log('Update check error:', err);
      setUpdateState('ERROR');
      setUpdateError(err?.message || (isRTL ? 'تعذر الاتصال بخوادم التحديث' : 'Update server unavailable'));
    }
  };

  const handleApplyUpdate = async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      console.log('Update reload error:', e);
      setUpdateModalVisible(false);
    }
  };

  const handleConfirmLogout = () => {
    Alert.alert(
      isRTL ? 'تسجيل الخروج' : 'Logout',
      isRTL ? 'هل أنت متأكد من رغبتك في تسجيل الخروج من لوحة التحكم؟' : 'Are you sure you want to log out?',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        { text: isRTL ? 'تأكيد الخروج' : 'Log Out', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Profile Hero Card (Identical structure to Delegate Profile) */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileAvatarSection}>
            <View style={[styles.profileAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
              <Ionicons
                name={isSupervisor ? 'shield-outline' : 'shield-checkmark'}
                size={44}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>
              {user?.name || 'مدير النظام'}
            </Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="ribbon-outline" size={13} color={colors.primary} />
              <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                {roleLabel}
              </Text>
            </View>
          </View>

          {/* User Info List */}
          <View style={[styles.profileInfoList, { borderTopColor: colors.border }]}>
            {/* Account Type / Role */}
            <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.infoLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="key-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>نوع الحساب</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                {user?.role || 'ADMIN'}
              </Text>
            </View>

            {/* Username / Email */}
            {(user?.email || user?.username) && (
              <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.infoLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>البريد / المعرف</Text>
                </View>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {user?.email || user?.username}
                </Text>
              </View>
            )}

            {/* Account Status */}
            <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.infoLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>حالة الحساب</Text>
              </View>
              <View style={[styles.statusBadgePill, { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.18)' : '#dcfce7' }]}>
                <Text style={[styles.statusBadgeText, { color: '#16a34a' }]}>نشط ومفعل</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Target Settings Card (تعديل التارجت - يظهر للمدير فقط) */}
        {isAdmin && onOpenTargetSettings && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
              إدارة وقواعد التارچت
            </Text>

            <TouchableOpacity
              style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={onOpenTargetSettings}
              activeOpacity={0.75}
            >
              <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.settingIconBox, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="options-outline" size={20} color={colors.primary} />
                </View>
                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
                  <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>
                    تعديل التارچت وقواعد الإنجاز
                  </Text>
                  <Text style={[styles.settingRowSub, { color: colors.textSecondary }]}>
                    ضبط حدود التارچت اليومي والشهري للمعرفين
                  </Text>
                </View>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* 3. App Settings Box (Matching Delegate: Check for Updates & Logout) */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
            إعدادات النظام والتحديثات
          </Text>

          {/* Check for Updates Row - Triggers Updates BottomSheet */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleCheckForUpdates}
            activeOpacity={0.7}
          >
            <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.settingIconBox, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#dbeafe' }]}>
                <Ionicons name="cloud-download-outline" size={20} color="#2563eb" />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
                <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>
                  تحديث التطبيق
                </Text>
                <Text style={[styles.settingRowSub, { color: colors.textSecondary }]}>
                  التحقق من توفر تحديث هوائي جديد (OTA Update)
                </Text>
              </View>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Logout Row */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={handleConfirmLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.settingIconBox, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2' }]}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              </View>
              <Text style={[styles.settingRowText, { color: '#ef4444' }]}>تسجيل الخروج</Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* 4. Standalone Big Logout Button (Delegate style) */}
        <TouchableOpacity
          style={[
            styles.standaloneLogoutBtn,
            {
              backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fee2e2',
              borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.28)' : '#fca5a5',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={handleConfirmLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={styles.standaloneLogoutText}>
            {isRTL ? 'تسجيل الخروج من الحساب' : 'Log Out of Account'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 4. App Update Bottom Sheet (Same as Delegate) */}
      <AppUpdateBottomSheet
        visible={updateModalVisible}
        state={updateState}
        errorMessage={updateError}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        onApplyUpdate={handleApplyUpdate}
        onCheckAgain={handleCheckForUpdates}
        onClose={() => setUpdateModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  profileAvatarSection: {
    alignItems: 'center',
    marginBottom: 14,
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
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  profileInfoList: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 12,
  },
  infoRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabelGroup: {
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  settingRow: {
    paddingVertical: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingRowRight: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingRowText: {
    fontSize: 14,
    fontWeight: '700',
  },
  settingRowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  standaloneLogoutBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 24,
  },
  standaloneLogoutText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ef4444',
  },
});
