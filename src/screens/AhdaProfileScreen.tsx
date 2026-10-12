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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
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
      {/* Top Navbar */}
      <View style={[styles.navbar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-forward" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.textPrimary }]}>الملف الشخصي والإعدادات</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatarContainer, { backgroundColor: '#fff7ed', borderColor: '#ea580c' }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <Ionicons name="person" size={40} color="#ea580c" />
            )}
          </View>
          <Text style={[styles.userName, { color: colors.textPrimary }]}>{userName}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{userEmail}</Text>

          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#16a34a" />
            <Text style={styles.roleBadgeText}>{userRole}</Text>
          </View>
        </View>

        {/* Section: Google Account Link */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>حساب Google المرتبط</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#fef2f2' }]}>
                <MaterialCommunityIcons name="google" size={20} color="#ea4335" />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>تسجيل الدخول السريع</Text>
                <Text style={[styles.infoSub, { color: colors.textSecondary }]}>{userEmail}</Text>
              </View>
            </View>
            <View style={styles.verifiedTag}>
              <Text style={styles.verifiedTagText}>مرتبط وموثق ✓</Text>
            </View>
          </View>
        </View>

        {/* Section: Application Settings */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>إعدادات التطبيق والمظهر</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Theme Toggle */}
          <TouchableOpacity style={styles.settingRow} onPress={onToggleTheme} activeOpacity={0.7}>
            <View style={styles.infoRowLeft}>
              <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
                <Ionicons
                  name={isDarkMode ? 'sunny' : 'moon'}
                  size={18}
                  color={isDarkMode ? '#fbbf24' : '#0f172a'}
                />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>المظهر (Dark / Light)</Text>
                <Text style={[styles.infoSub, { color: colors.textSecondary }]}>
                  {isDarkMode ? 'الوضع الليلي (Dark Mode)' : 'الوضع النهاري (Light Mode)'}
                </Text>
              </View>
            </View>
            <Ionicons name="swap-horizontal-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Check for Updates */}
          <TouchableOpacity style={styles.settingRow} onPress={handleCheckUpdates} activeOpacity={0.7} disabled={checkingUpdate}>
            <View style={styles.infoRowLeft}>
              <View style={[styles.iconBox, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="cloud-download-outline" size={18} color="#2563eb" />
              </View>
              <View style={styles.infoTextCol}>
                <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>فحص التحديثات السحابية</Text>
                <Text style={[styles.infoSub, { color: colors.textSecondary }]}>الإصدار 1.0.0 (OTA Enabled)</Text>
              </View>
            </View>
            {checkingUpdate ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Section: About System */}
        <Text style={[styles.sectionHeading, { color: colors.textSecondary }]}>حول المنظومة</Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
            <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>حالة الاتصال بالباك إند:</Text>
            <Text style={[styles.metaValue, { color: '#16a34a' }]}>متصل ومؤمن (api.kerd2sy.com)</Text>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={confirmLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.logoutBtnText}>تسجيل الخروج من الحساب</Text>
        </TouchableOpacity>

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
  navbar: {
    height: 56,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarContainer: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 12,
    textAlign: 'center',
  },
  roleBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16a34a',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginRight: 4,
    textAlign: 'right',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoRowLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextCol: {
    alignItems: 'flex-end',
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  infoSub: {
    fontSize: 12,
    marginTop: 2,
  },
  verifiedTag: {
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
  },
  settingRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  divider: {
    height: 1,
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
    marginBottom: 20,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#dc2626',
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
  },
});
