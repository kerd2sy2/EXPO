import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Modal, Switch, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { AppUpdateBottomSheet } from '../../components/modals/AppUpdateBottomSheet';
import { DiagnosticsModal } from '../../components/modals/DiagnosticsModal';
import { LogoutBottomSheet } from '../../components/modals/LogoutBottomSheet';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { TargetRulesScreen } from './TargetRulesScreen';
import { adminProfileStyles as styles } from './admin-profile/adminProfileStyles';
import { useAdminProfileActions } from './admin-profile/useAdminProfileActions';

interface AdminProfileScreenProps {
  user: any;
  onOpenTargetSettings?: () => void;
  onOpenTargetRules?: () => void;
  onResetData?: () => void;
  onLogout: () => void;
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
}

export const AdminProfileScreen: React.FC<AdminProfileScreenProps> = ({
  user,
  onOpenTargetSettings,
  onOpenTargetRules,
  onResetData,
  onLogout,
  colors,
  isDarkMode = false,
  isRTL = true,
}) => {
  const isSupervisor = user?.role === 'SUPERVISOR';
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const roleLabel = isSupervisor ? 'مشرف التوصيل (Supervisor)' : 'مدير النظام (Admin)';

  const actions = useAdminProfileActions(user, isAdmin, isRTL, onResetData);

  if (actions.currentSubView === 'rules') {
    return (
      <ModuleErrorBoundary moduleName="قواعد التارچت" colors={colors} onReset={() => actions.setCurrentSubView('profile')}>
        <TargetRulesScreen
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onBack={() => actions.setCurrentSubView('profile')}
          onOpenTargetSettings={onOpenTargetSettings}
        />
      </ModuleErrorBoundary>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={actions.refreshing}
            onRefresh={actions.handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileAvatarSection}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={actions.handleAvatarTap}
              style={[styles.profileAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            >
              <Ionicons name={isSupervisor ? 'shield-outline' : 'shield-checkmark'} size={44} color={colors.primary} />
            </TouchableOpacity>

            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{user?.name || 'مدير النظام'}</Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="ribbon-outline" size={13} color={colors.primary} />
              <Text style={[styles.roleBadgeText, { color: colors.primary }]}>{roleLabel}</Text>
            </View>
          </View>

          <View style={[styles.profileInfoList, { borderTopColor: colors.border }]}>
            <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.infoLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="key-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>نوع الحساب</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.role || 'ADMIN'}</Text>
            </View>

            {(user?.email || user?.username) && (
              <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.infoLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="mail-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>البريد / المعرف</Text>
                </View>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{user?.email || user?.username}</Text>
              </View>
            )}

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

        {isAdmin && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
              إدارة وقواعد التارچت
            </Text>

            {onOpenTargetSettings && (
              <TouchableOpacity
                style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={onOpenTargetSettings}
                activeOpacity={0.75}
              >
                <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.settingIconBox, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="options-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
                    <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>تعديل التارچت وقواعد الإنجاز</Text>
                    <Text style={[styles.settingRowSub, { color: colors.textSecondary }]}>ضبط حدود التارچت اليومي والشهري للمعرفين</Text>
                  </View>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.primary} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={actions.handleDeleteAllIdentifiers}
              disabled={actions.deletingAll}
              activeOpacity={0.75}
            >
              <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.settingIconBox, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2' }]}>
                  {actions.deletingAll ? <ActivityIndicator size="small" color="#dc2626" /> : <Ionicons name="trash-outline" size={20} color="#dc2626" />}
                </View>
                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
                  <Text style={[styles.settingRowText, { color: '#dc2626', fontWeight: '800' }]}>مسح كافة المعرفات والبيانات</Text>
                  <Text style={[styles.settingRowSub, { color: colors.textSecondary }]}>إعادة تعيين وحذف كافة المعرفات للبدء برفع داتا جديدة</Text>
                </View>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color="#dc2626" />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
            إعدادات النظام والتحديثات
          </Text>

          {actions.biometricsAvailable && (
            <View style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.settingIconBox, { backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.16)' : '#ffedd5' }]}>
                  <Ionicons name="finger-print" size={20} color="#0284c7" />
                </View>
                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
                  <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>تسجيل الدخول بالبصمة</Text>
                  <Text style={[styles.settingRowSub, { color: colors.textSecondary }]}>بصمة الإصبع أو الوجه لتسجيل الدخول السريع</Text>
                </View>
              </View>
              <Switch
                value={actions.biometricsOn}
                onValueChange={actions.handleToggleBiometrics}
                trackColor={{ false: isDarkMode ? '#334155' : '#cbd5e1', true: colors.primary }}
                thumbColor="#ffffff"
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => (onOpenTargetRules ? onOpenTargetRules() : actions.setCurrentSubView('rules'))}
            activeOpacity={0.7}
          >
            <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.settingIconBox, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#eff6ff' }]}>
                <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
                <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>قواعد ومعايير احتساب التارچت</Text>
                <Text style={[styles.settingRowSub, { color: colors.textSecondary }]}>الضوابط الرياضية، نموذج التوقع التراكمي، ومعايير تقييم الأداء</Text>
              </View>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={actions.handleCheckForUpdates}
            activeOpacity={0.7}
          >
            <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.settingIconBox, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#dbeafe' }]}>
                <Ionicons name="cloud-download-outline" size={20} color="#2563eb" />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
                <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>تحديث التطبيق</Text>
                <Text style={[styles.settingRowSub, { color: colors.textSecondary }]}>التحقق من توفر تحديث هوائي جديد (OTA Update)</Text>
              </View>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => actions.setShowLogoutModal(true)}
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
      </ScrollView>

      <Modal
        visible={actions.updateModalVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => actions.setUpdateModalVisible(false)}
      >
        <ModuleErrorBoundary moduleName="تحديث التطبيق" colors={colors} fallback={null}>
          <AppUpdateBottomSheet
            visible={actions.updateModalVisible}
            state={actions.updateState}
            errorMessage={actions.updateError}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            onApplyUpdate={actions.handleApplyUpdate}
            onCheckAgain={actions.handleCheckForUpdates}
            onClose={() => actions.setUpdateModalVisible(false)}
          />
        </ModuleErrorBoundary>
      </Modal>

      <ModuleErrorBoundary moduleName="سجل الأعطال" colors={colors} fallback={null}>
        <DiagnosticsModal
          visible={actions.showDiagnosticsModal}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onClose={() => actions.setShowDiagnosticsModal(false)}
        />
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="تسجيل الخروج" colors={colors} fallback={null}>
        <LogoutBottomSheet
          visible={actions.showLogoutModal}
          user={user}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onConfirm={onLogout}
          onClose={() => actions.setShowLogoutModal(false)}
        />
      </ModuleErrorBoundary>
    </View>
  );
};
