import React from 'react';
import { View, Text, TouchableOpacity, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Language, ThemeColors } from '../../types/delegate';
import { profileStyles as styles } from './profileStyles';
import { formatLanguageLabel } from './profileHelpers';

interface ProfileSettingsCardProps {
  colors: ThemeColors;
  lang: Language;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  biometricsAvailable: boolean;
  biometricsOn: boolean;
  onOpenLangModal: () => void;
  onToggleTheme?: () => void;
  onToggleBiometrics: (val: boolean) => void;
  onOpenPasswordModal: () => void;
  onCheckForUpdates: () => void;
  onLogout: () => void;
}

export const ProfileSettingsCard: React.FC<ProfileSettingsCardProps> = ({
  colors,
  lang,
  isDarkMode,
  isRTL,
  t,
  biometricsAvailable,
  biometricsOn,
  onOpenLangModal,
  onToggleTheme,
  onToggleBiometrics,
  onOpenPasswordModal,
  onCheckForUpdates,
  onLogout,
}) => (
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
        {formatLanguageLabel(lang)}
      </Text>
    </TouchableOpacity>

    {onToggleTheme && (
      <View
        style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons
            name={isDarkMode ? 'moon-outline' : 'sunny-outline'}
            size={20}
            color={isDarkMode ? '#fbbf24' : '#f59e0b'}
          />
          <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>
              {t.appTheme || (isRTL ? 'مظهر التطبيق' : 'App Theme')}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
              {isDarkMode ? (t.darkMode || 'الوضع المظلم') : (t.lightMode || 'الوضع الفاتح')}
            </Text>
          </View>
        </View>
        <Switch
          value={isDarkMode}
          onValueChange={onToggleTheme}
          trackColor={{ false: '#cbd5e1', true: '#f59e0b' }}
          thumbColor="#ffffff"
        />
      </View>
    )}

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
          onValueChange={onToggleBiometrics}
          trackColor={{ false: '#94a3b8', true: '#10b981' }}
          thumbColor="#ffffff"
        />
      </View>
    )}

    <TouchableOpacity
      style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      onPress={onOpenPasswordModal}
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
      style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      onPress={onCheckForUpdates}
      activeOpacity={0.7}
    >
      <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
        <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>
          {t.checkForUpdates || (isRTL ? 'تحديث التطبيق' : 'Check for Updates')}
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
);
