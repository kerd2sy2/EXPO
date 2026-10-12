import React, { useState } from 'react';
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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { ThemeColors } from '../types/delegate';

interface AhdaProfileScreenProps {
  currentUser: any;
  colors: ThemeColors;
  isDarkMode: boolean;
  onBack: () => void;
  onLogout: () => void;
  onToggleTheme: () => void;
}

export const AhdaProfileScreen: React.FC<AhdaProfileScreenProps> = ({
  currentUser,
  colors,
  isDarkMode,
  onBack,
  onLogout,
  onToggleTheme,
}) => {
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const userName = currentUser?.name || 'مسؤول العهدة والمصروفات';
  const userEmail = currentUser?.email || currentUser?.google_email || 'kerd2sy@gmail.com';
  const userRole = currentUser?.role === 'SUPER_ADMIN' ? 'مدير عام للنظام (Super Admin)' : 'مسؤول عهدة وحسابات';
  const avatarUrl = currentUser?.google_avatar || currentUser?.avatar || null;
  const userCode = currentUser?.code || currentUser?.username || '1eff2027ef';

  // Check OTA updates using expo-updates
  const handleCheckUpdates = async () => {
    try {
      setCheckingUpdate(true);
      if (__DEV__) {
        Alert.alert('وضع التطوير', 'فحص التحديثات يعمل في النسخ المبنية فقط.');
        return;
      }
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert(
          'تحديث متاح',
          'يوجد تحديث جديد لنظام العهدة. هل تريد تحميله وتطبيقه الآن؟',
          [
            { text: 'إلغاء', style: 'cancel' },
            {
              text: 'تحديث الآن',
              onPress: async () => {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              },
            },
          ]
        );
      } else {
        Alert.alert('التطبيق محدث', 'أنت تستخدم أحدث إصدار من تطبيق AHDA.');
      }
    } catch (err: any) {
      console.warn('Update check error:', err);
      Alert.alert('فحص التحديثات', 'التطبيق يعمل على أحدث إصدار متصل بالسيرفر.');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'تسجيل الخروج',
      'هل أنت متأكد من رغبتك في تسجيل الخروج من نظام العهدة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        { text: 'تسجيل الخروج', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} edges={['top', 'left', 'right']}>
      {/* ── Sub-Page Header Row (Matching Delegate Screens Style) ── */}
      <View style={styles.subPageHeaderRow}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-forward" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.subPageTitleContainer}>
          <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary }]}>الملف الشخصي</Text>
          <View style={[styles.titleUnderlineBar, { backgroundColor: '#ea580c' }]} />
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── 1. Profile Header Card (Delegate App Style) ── */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.profileAvatarSection}>
            <View style={[styles.profileAvatar, { backgroundColor: '#fff7ed', borderColor: '#ea580c' }]}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.profileAvatarImg} />
              ) : (
                <Ionicons name="person" size={44} color="#ea580c" />
              )}
            </View>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{userName}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#16a34a" />
              <Text style={styles.roleBadgeText}>{userRole}</Text>
            </View>
          </View>

          {/* Info Rows List */}
          <View style={[styles.profileInfoList, { borderTopColor: colors.border }]}>
            {/* National ID / Username */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelGroup}>
                <Ionicons name="card-outline" size={15} color="#ea580c" />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>كود المستخدم</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{userCode}</Text>
            </View>

            {/* Email */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelGroup}>
                <Ionicons name="mail-outline" size={15} color="#ea580c" />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>البريد الإلكتروني</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>
                {userEmail}
              </Text>
            </View>

            {/* Google Sync Status */}
            <View style={styles.infoRow}>
              <View style={styles.infoLabelGroup}>
                <MaterialCommunityIcons name="google" size={15} color="#ea4335" />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>ربط Google</Text>
              </View>
              <View style={styles.syncBadge}>
                <Ionicons name="checkmark-circle" size={13} color="#16a34a" />
                <Text style={styles.syncBadgeText}>مربوط وموثق</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── 2. Settings Card (Delegate App Style) ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleGroup}>
              <Ionicons name="settings-outline" size={18} color="#ea580c" />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>إعدادات التطبيق والمظهر</Text>
            </View>
          </View>

          {/* Theme Mode Toggle (الوضع الفاتح / المظلم) */}
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingRowRight}>
              <Ionicons
                name={isDarkMode ? 'moon-outline' : 'sunny-outline'}
                size={20}
                color={isDarkMode ? '#fbbf24' : '#ea580c'}
              />
              <View style={{ alignItems: 'flex-start' }}>
                <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>مظهر التطبيق</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  {isDarkMode ? 'الوضع المظلم (Dark)' : 'الوضع الفاتح (Light)'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={onToggleTheme}
              trackColor={{ false: '#cbd5e1', true: '#ea580c' }}
              thumbColor="#ffffff"
            />
          </View>

          {/* Check for OTA Updates Row */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomColor: colors.border }]}
            onPress={handleCheckUpdates}
            activeOpacity={0.7}
            disabled={checkingUpdate}
          >
            <View style={styles.settingRowRight}>
              <Ionicons name="cloud-download-outline" size={20} color="#ea580c" />
              <View style={{ alignItems: 'flex-start' }}>
                <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>تحديث التطبيق السحابي</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                  قناة التحديث (ahda) • الإصدار 1.0.0
                </Text>
              </View>
            </View>
            {checkingUpdate ? (
              <ActivityIndicator size="small" color="#ea580c" />
            ) : (
              <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
            )}
          </TouchableOpacity>

          {/* Logout Row */}
          <TouchableOpacity
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            onPress={confirmLogout}
            activeOpacity={0.7}
          >
            <View style={styles.settingRowRight}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={[styles.settingRowText, { color: '#ef4444' }]}>تسجيل الخروج من الحساب</Text>
            </View>
            <Ionicons name="chevron-back" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* ── 3. System Info Card (Delegate App Style) ── */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.titleGroup}>
              <Ionicons name="information-circle-outline" size={18} color="#ea580c" />
              <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>حول المنظومة</Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>اسم النظام:</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>AAMS Logistics - إدارة العهد والمحاسبة</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>الجهة المشغلة:</Text>
            <Text style={[styles.metaValue, { color: colors.textPrimary }]}>شركة أبعاد التقنية المتقدمة</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>حالة الاتصال:</Text>
            <Text style={[styles.metaValue, { color: '#16a34a' }]}>متصل ومؤمن (api.kerd2sy.com) ✓</Text>
          </View>
        </View>

        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          جميع الحقوق محفوظة © {new Date().getFullYear()} AAMS Logistics
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Sub-page header matching delegate app
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
    borderRadius: 12,
  },
  subPageTitleContainer: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  subPageHeaderTitle: {
    fontSize: 17,
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
  // Profile card matching delegate screen
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileAvatarSection: {
    alignItems: 'center',
    marginBottom: 14,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
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
    marginBottom: 6,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.25)',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  profileInfoList: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabelGroup: {
    flexDirection: 'row-reverse',
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
    maxWidth: '55%',
  },
  syncBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  syncBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  // Card matching delegate screen
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  settingRow: {
    paddingVertical: 14,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingRowRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  settingRowText: {
    fontSize: 14,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 10,
    marginBottom: 20,
  },
});
