import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

interface AdminProfileModalProps {
  visible: boolean;
  onClose: () => void;
  user: any;
  onOpenTargetSettings: () => void;
  onLogout: () => void;
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
}

export const AdminProfileModal: React.FC<AdminProfileModalProps> = ({
  visible,
  onClose,
  user,
  onOpenTargetSettings,
  onLogout,
  colors,
  isDarkMode = false,
  isRTL = true,
}) => {
  const isSupervisor = user?.role === 'SUPERVISOR';
  const roleLabel = isSupervisor ? 'مشرف التوصيل' : 'مدير النظام (Admin)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.titleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.titleIconBox, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="person-circle-outline" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>الملف الشخصي</Text>
            </View>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Avatar & User Details */}
            <View style={styles.userHeroSection}>
              <View style={[styles.largeAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Ionicons
                  name={isSupervisor ? 'shield-outline' : 'shield-checkmark'}
                  size={46}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.userName, { color: colors.textPrimary }]}>
                {user?.name || 'مدير النظام'}
              </Text>
              <View style={[styles.roleBadge, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="ribbon-outline" size={14} color={colors.primary} />
                <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                  {roleLabel}
                </Text>
              </View>
              {user?.email || user?.username ? (
                <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
                  {user?.email || user?.username}
                </Text>
              ) : null}
            </View>

            {/* Quick Info Grid */}
            <View style={[styles.infoGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.infoItem, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="key-outline" size={16} color={colors.primary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>نوع الحساب</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                  {user?.role || 'ADMIN'}
                </Text>
              </View>
              <View style={[styles.infoItem, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>حالة الحساب</Text>
                <Text style={[styles.infoValue, { color: '#16a34a' }]}>نشط ومفعل</Text>
              </View>
            </View>

            {/* Actions Section */}
            <View style={styles.actionsContainer}>
              <Text style={[styles.actionsSectionTitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                إدارة التارچت والإعدادات
              </Text>

              {/* Edit Target Button */}
              <TouchableOpacity
                style={[styles.actionRowBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => {
                  onClose();
                  setTimeout(() => {
                    onOpenTargetSettings();
                  }, 250);
                }}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconBox, { backgroundColor: colors.primary }]}>
                  <Ionicons name="options-outline" size={20} color="#ffffff" />
                </View>
                <View style={[styles.actionTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.actionMainText, { color: colors.primary }]}>
                    تعديل التارچت وقواعد الإنجاز
                  </Text>
                  <Text style={[styles.actionSubText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    تحديد التارچت اليومي والشهري الافتراضي للمعرفين
                  </Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.primary} />
              </TouchableOpacity>

              {/* Logout Button */}
              <TouchableOpacity
                style={[
                  styles.logoutBtn,
                  {
                    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fee2e2',
                    borderColor: isDarkMode ? '#7f1d1d' : '#fecaca',
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
                onPress={() => {
                  onClose();
                  onLogout();
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.logoutBtnText}>تسجيل الخروج من الحساب</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  titleGroup: {
    alignItems: 'center',
    gap: 10,
  },
  titleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  userHeroSection: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 6,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 6,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
  },
  infoGrid: {
    gap: 10,
    marginBottom: 20,
  },
  infoItem: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionsContainer: {
    gap: 12,
  },
  actionsSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  actionRowBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    alignItems: 'center',
    gap: 12,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextCol: {
    flex: 1,
    gap: 2,
  },
  actionMainText: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionSubText: {
    fontSize: 11,
  },
  logoutBtn: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
});
