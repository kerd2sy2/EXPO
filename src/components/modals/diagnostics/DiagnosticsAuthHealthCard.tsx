import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../../types/delegate';
import { ModuleErrorBoundary } from '../../ModuleErrorBoundary';
import { TokenInspectResult } from './diagnosticsHelpers';
import { diagnosticsStyles as styles } from './diagnosticsStyles';

interface DiagnosticsAuthHealthCardProps {
  tokenInfo: TokenInspectResult;
  hasRefreshToken: boolean;
  pingStatus: string | null;
  pinging: boolean;
  refreshingToken: boolean;
  systemInfo: Record<string, any>;
  logsCount: number;
  onRefreshToken: () => void;
  onPingServer: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

/** Displays JWT validity, refresh token status, server ping test, and device diagnostics. */
export const DiagnosticsAuthHealthCard: React.FC<DiagnosticsAuthHealthCardProps> = ({
  tokenInfo,
  hasRefreshToken,
  pingStatus,
  pinging,
  refreshingToken,
  systemInfo,
  logsCount,
  onRefreshToken,
  onPingServer,
  colors,
  isDarkMode,
  isRTL,
}) => {
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <ModuleErrorBoundary moduleName="DiagnosticsAuthHealthCard" colors={colors}>
      <View style={[styles.sysCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <View style={[styles.cardHeaderRow, { flexDirection: rowDir }]}>
          <Text style={[styles.cardHeading, { color: colors.textPrimary }]}>
            {isRTL ? 'حالة التوثيق والاتصال بالسيرفر' : 'Auth & Server Health'}
          </Text>
          <View
            style={[
              styles.tokenStatusPill,
              { backgroundColor: tokenInfo.isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' },
            ]}
          >
            <Text style={{ color: tokenInfo.isExpired ? '#ef4444' : '#10b981', fontSize: 11, fontWeight: '700' }}>
              {tokenInfo.label}
            </Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={styles.statLabel}>{isRTL ? 'صلاحية التوكن' : 'Token Validity'}</Text>
            <Text style={[styles.statVal, { color: colors.textPrimary }]}>{tokenInfo.details || 'نشط'}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.statLabel}>{isRTL ? 'رمز التحديث (Refresh)' : 'Refresh Token'}</Text>
            <Text style={[styles.statVal, { color: hasRefreshToken ? '#10b981' : '#f59e0b' }]}>
              {hasRefreshToken ? (isRTL ? 'متوفر (صالح 7 أيام)' : 'Available') : isRTL ? 'غير متوفر' : 'Missing'}
            </Text>
          </View>
        </View>

        {pingStatus && (
          <View style={[styles.pingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="wifi-outline" size={14} color={colors.primary} />
            <Text style={[styles.pingText, { color: colors.textPrimary }]}>{pingStatus}</Text>
          </View>
        )}

        <View style={[styles.miniActionRow, { flexDirection: rowDir }]}>
          <TouchableOpacity
            style={[styles.miniActionBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
            onPress={onRefreshToken}
            disabled={refreshingToken}
            activeOpacity={0.8}
          >
            {refreshingToken ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="key-outline" size={14} color={colors.primary} />
                <Text style={[styles.miniActionBtnText, { color: colors.primary }]}>
                  {isRTL ? 'تجديد الجلسة الآن' : 'Refresh Token'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.miniActionBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0', borderColor: colors.border }]}
            onPress={onPingServer}
            disabled={pinging}
            activeOpacity={0.8}
          >
            {pinging ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <>
                <Ionicons name="pulse-outline" size={14} color={colors.textPrimary} />
                <Text style={[styles.miniActionBtnText, { color: colors.textPrimary }]}>
                  {isRTL ? 'فحص الاتصال (Ping)' : 'Ping Server'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.sysCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
        <Text style={[styles.cardHeading, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
          {isRTL ? 'معلومات النظام والجهاز' : 'System & Device'}
        </Text>

        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={styles.statLabel}>{isRTL ? 'الجهاز' : 'Device'}</Text>
            <Text style={[styles.statVal, { color: colors.textPrimary }]}>
              {systemInfo.brand || 'Device'} {systemInfo.modelName || ''}
            </Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.statLabel}>{isRTL ? 'النظام' : 'OS'}</Text>
            <Text style={[styles.statVal, { color: colors.textPrimary }]}>
              {systemInfo.platform || ''} v{String(systemInfo.platformVersion || '')}
            </Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          <View style={styles.gridCol}>
            <Text style={styles.statLabel}>{isRTL ? 'إصدار التطبيق' : 'App Version'}</Text>
            <Text style={[styles.statVal, { color: colors.textPrimary }]}>{systemInfo.appVersion || '1.0.0'}</Text>
          </View>
          <View style={styles.gridCol}>
            <Text style={styles.statLabel}>{isRTL ? 'الأخطاء المسجلة' : 'Errors Logged'}</Text>
            <Text style={[styles.statVal, { color: logsCount > 0 ? '#ef4444' : '#10b981', fontWeight: '800' }]}>
              {logsCount} {isRTL ? 'حدث مسجل' : 'events'}
            </Text>
          </View>
        </View>
      </View>
    </ModuleErrorBoundary>
  );
};
