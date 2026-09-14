import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import {
  getErrorLogs,
  clearErrorLogs,
  getSystemDiagnostics,
  DebugErrorLog,
} from '../../services/errorLogger';
import {
  getStoredToken,
  getStoredRefreshToken,
  refreshAuthToken,
  API_BASE_URL,
} from '../../services/api';

interface DiagnosticsModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onClose: () => void;
}

function decodeBase64Safe(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const str = input.replace(/=+$/, '');
  let output = '';
  if (str.length % 4 === 1) return '';
  let bc = 0;
  let bs = 0;
  for (let idx = 0; idx < str.length; idx++) {
    const char = str.charAt(idx);
    const b = chars.indexOf(char);
    if (b === -1) continue;
    bs = bc % 4 ? bs * 64 + b : b;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

function inspectJwt(token: string | null): { isExpired: boolean; label: string; details: string } {
  if (!token) {
    return { isExpired: true, label: 'غير متوفر', details: 'لا يوجد توكن مخزن' };
  }
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return { isExpired: false, label: 'نشط', details: 'توكن قياسي' };
    }
    const jsonStr = decodeBase64Safe(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(jsonStr);
    if (!payload.exp) {
      return { isExpired: false, label: 'دائم', details: 'بدون تاريخ انتهاء' };
    }
    const expMs = payload.exp * 1000;
    const isExpired = Date.now() >= expMs;
    const expDate = new Date(expMs);
    const timeStr = expDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      isExpired,
      label: isExpired ? 'منتهي الصلاحية' : 'نشط وصالح',
      details: isExpired ? `انتهى في (${timeStr})` : `ينتهي في (${timeStr})`,
    };
  } catch {
    return { isExpired: false, label: 'نشط', details: 'صالح' };
  }
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  visible,
  colors,
  isDarkMode,
  isRTL,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<DebugErrorLog[]>([]);
  const [systemInfo, setSystemInfo] = useState<Record<string, any>>({});
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [logFilter, setLogFilter] = useState<'ALL' | 'CRASH' | 'NETWORK'>('ALL');

  // Live Token & Ping State
  const [tokenInfo, setTokenInfo] = useState<{ isExpired: boolean; label: string; details: string }>({
    isExpired: false,
    label: 'جاري الفحص...',
    details: '',
  });
  const [hasRefreshToken, setHasRefreshToken] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [pinging, setPinging] = useState(false);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const [fetchedLogs, sys] = await Promise.all([
        getErrorLogs(),
        getSystemDiagnostics(),
      ]);
      setLogs(fetchedLogs || []);
      setSystemInfo(sys || {});

      // Check current auth token status
      const curToken = getStoredToken();
      const rToken = getStoredRefreshToken();
      setTokenInfo(inspectJwt(curToken));
      setHasRefreshToken(Boolean(rToken));
    } catch (e) {
      console.log('Error loading diagnostics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadDiagnostics();
    }
  }, [visible]);

  const handleManualRefreshToken = async () => {
    setRefreshingToken(true);
    try {
      const newToken = await refreshAuthToken();
      if (newToken) {
        setTokenInfo(inspectJwt(newToken));
        setHasRefreshToken(true);
        Alert.alert(
          isRTL ? 'نجاح التجديد' : 'Success',
          isRTL ? 'تم تجديد رمز الجلسة والتوكن بنجاح!' : 'Session token refreshed successfully!'
        );
      } else {
        Alert.alert(
          isRTL ? 'تنبيه' : 'Notice',
          isRTL ? 'تعذر التجديد، يرجى تسجيل الخروج والدخول مجدداً' : 'Failed to refresh, please re-login.'
        );
      }
    } catch (err: any) {
      Alert.alert(isRTL ? 'خطأ' : 'Error', err?.message || 'فشل التجديد');
    } finally {
      setRefreshingToken(false);
    }
  };

  const handlePingServer = async () => {
    setPinging(true);
    setPingStatus(null);
    const start = Date.now();
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' }).catch(async () => {
        return fetch(`${API_BASE_URL}`, { method: 'GET' });
      });
      const latency = Date.now() - start;
      if (res && res.status < 500) {
        setPingStatus(`متصل بالسيرفر (${latency}ms) - الحالة: ${res.status}`);
      } else {
        setPingStatus(`استجابة غير طبيعية (${latency}ms) - الحالة: ${res?.status}`);
      }
    } catch (err: any) {
      const latency = Date.now() - start;
      setPingStatus(`تعذر الاتصال (${latency}ms): ${err?.message || 'انقطاع شبكة'}`);
    } finally {
      setPinging(false);
    }
  };

  const handleClearLogs = () => {
    Alert.alert(
      isRTL ? 'مسح سجل الأخطاء' : 'Clear Error Logs',
      isRTL ? 'هل أنت متأكد من رغبتك في مسح كافة الأخطاء المسجلة؟' : 'Are you sure you want to clear all logs?',
      [
        { text: isRTL ? 'إلغاء' : 'Cancel', style: 'cancel' },
        {
          text: isRTL ? 'مسح' : 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearErrorLogs();
            setLogs([]);
          },
        },
      ]
    );
  };

  const formatSingleLogText = (l: DebugErrorLog) => {
    let out = `• المصدر (Source): ${l.source}\n`;
    out += `• التوقيت: ${new Date(l.timestamp).toLocaleString('ar-EG')}\n`;
    out += `• الرسالة: ${l.message}\n`;
    if (l.details) {
      try {
        out += `• تفاصيل إضافية: ${typeof l.details === 'string' ? l.details : JSON.stringify(l.details, null, 2)}\n`;
      } catch {
        out += `• تفاصيل إضافية: ${String(l.details)}\n`;
      }
    }
    if (l.stack) {
      out += `• المسار الفني (Stack Trace):\n${l.stack}\n`;
    }
    return out;
  };

  const handleCopySingleLog = async (log: DebugErrorLog) => {
    try {
      const formatted = `📋 [تقرير خطأ AAMS للمطور / الأجينت]\n------------------------------------\n${formatSingleLogText(log)}------------------------------------`;
      if (typeof navigator !== 'undefined' && (navigator as any).clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(formatted);
      }
      await Share.share({
        title: 'تفاصيل الخطأ للأجينت',
        message: formatted,
      });
    } catch (err) {
      console.log('Error sharing single log:', err);
    }
  };

  const handleCopyAllForAgent = async () => {
    try {
      let reportText = `📋 [تقرير تشخيص وأخطاء AAMS الشامل لإرساله للأجينت]\n`;
      reportText += `تاريخ التقرير: ${new Date().toLocaleString('ar-EG')}\n`;
      reportText += `إصدار التطبيق: ${systemInfo.appVersion || '1.0.0'}\n`;
      reportText += `الجهاز: ${systemInfo.brand || ''} ${systemInfo.modelName || ''} (${systemInfo.platform} v${systemInfo.platformVersion || ''})\n`;
      reportText += `حالة التوكن: ${tokenInfo.label} (${tokenInfo.details})\n`;
      reportText += `رمز التحديث (Refresh Token): ${hasRefreshToken ? 'متوفر' : 'غير متوفر'}\n`;
      reportText += `رابط السيرفر: ${API_BASE_URL}\n`;
      reportText += `إجمالي الأخطاء المسجلة: ${logs.length}\n`;
      reportText += `====================================\n\n`;

      if (logs.length === 0) {
        reportText += `لا توجد أخطاء مسجلة حالياً، التطبيق يعمل باستقرار تام.\n`;
      } else {
        logs.forEach((l, idx) => {
          reportText += `🔴 الخطأ (${idx + 1} من ${logs.length}):\n`;
          reportText += formatSingleLogText(l);
          reportText += `------------------------------------\n\n`;
        });
      }

      if (typeof navigator !== 'undefined' && (navigator as any).clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(reportText);
      }

      await Share.share({
        title: 'تقرير أخطاء AAMS للأجينت',
        message: reportText,
      });
    } catch (err) {
      console.log('Copy all report error:', err);
    }
  };

  const handleShareReport = async () => {
    await handleCopyAllForAgent();
  };

  const filteredLogs = useMemo(() => {
    if (logFilter === 'CRASH') {
      return logs.filter((l) => l.source === 'UNHANDLED_EXCEPTION' || l.source === 'REACT_ERROR_BOUNDARY');
    }
    if (logFilter === 'NETWORK') {
      return logs.filter((l) => l.source === 'API_NETWORK' || l.source === 'PROMISE_REJECTION');
    }
    return logs;
  }, [logs, logFilter]);

  const getSourceBadgeColor = (source: DebugErrorLog['source']) => {
    switch (source) {
      case 'UNHANDLED_EXCEPTION':
        return '#ef4444';
      case 'REACT_ERROR_BOUNDARY':
        return '#dc2626';
      case 'GPS_TRACKING':
        return '#f59e0b';
      case 'API_NETWORK':
        return '#3b82f6';
      case 'OTA_UPDATES':
        return '#8b5cf6';
      default:
        return '#6b7280';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Ionicons name="bug" size={20} color="#ef4444" />
              </View>
              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                  {isRTL ? 'سجل تشخيص وفحص الأخطاء والانهيار' : 'Diagnostics & Error/Crash Logs'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {isRTL ? 'تتبع الأعطال، حالة الجلسة، واختبار الاتصال بالسيرفر' : 'Crash tracing, session status & API ping'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={{ color: colors.textSecondary, marginTop: 12, fontSize: 13 }}>
                {isRTL ? 'جاري قراءة السجلات...' : 'Loading diagnostics...'}
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {/* 1. Live Auth & Connection Health Card */}
              <View style={[styles.sysCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.cardHeading, { color: colors.textPrimary }]}>
                    {isRTL ? 'حالة التوثيق والاتصال بالسيرفر' : 'Auth & Server Health'}
                  </Text>
                  <View style={[styles.tokenStatusPill, { backgroundColor: tokenInfo.isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)' }]}>
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
                      {hasRefreshToken ? (isRTL ? 'متوفر (صالح 7 أيام)' : 'Available') : (isRTL ? 'غير متوفر' : 'Missing')}
                    </Text>
                  </View>
                </View>

                {pingStatus && (
                  <View style={[styles.pingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="wifi-outline" size={14} color={colors.primary} />
                    <Text style={[styles.pingText, { color: colors.textPrimary }]}>{pingStatus}</Text>
                  </View>
                )}

                {/* Quick Diagnostics Actions */}
                <View style={[styles.miniActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <TouchableOpacity
                    style={[styles.miniActionBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                    onPress={handleManualRefreshToken}
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
                    onPress={handlePingServer}
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

              {/* 2. System Overview Card */}
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
                    <Text style={[styles.statVal, { color: colors.textPrimary }]}>
                      {systemInfo.appVersion || '1.0.0'}
                    </Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.statLabel}>{isRTL ? 'الأخطاء المسجلة' : 'Errors Logged'}</Text>
                    <Text style={[styles.statVal, { color: logs.length > 0 ? '#ef4444' : '#10b981', fontWeight: '800' }]}>
                      {logs.length} {isRTL ? 'حدث مسجل' : 'events'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 3. Action Buttons Row */}
              <View style={[styles.actionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#10b981', flex: 1.4 }]}
                  onPress={handleCopyAllForAgent}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={16} color="#ffffff" style={{ marginHorizontal: 4 }} />
                  <Text style={styles.actionBtnText}>{isRTL ? 'نسخ كافة سجلات الأخطاء' : 'Copy All Logs'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]}
                  onPress={loadDiagnostics}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.textPrimary} style={{ marginHorizontal: 4 }} />
                  <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>{isRTL ? 'تحديث' : 'Refresh'}</Text>
                </TouchableOpacity>

                {logs.length > 0 && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', borderWidth: 1 }]}
                    onPress={handleClearLogs}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginHorizontal: 4 }} />
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>{isRTL ? 'مسح' : 'Clear'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* 4. Filter Chips */}
              <View style={[styles.filterChipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.filterChip, logFilter === 'ALL' && { backgroundColor: colors.primary }]}
                  onPress={() => setLogFilter('ALL')}
                >
                  <Text style={[styles.filterChipText, logFilter === 'ALL' ? { color: '#ffffff' } : { color: colors.textSecondary }]}>
                    {isRTL ? `الكل (${logs.length})` : `All (${logs.length})`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, logFilter === 'CRASH' && { backgroundColor: '#ef4444' }]}
                  onPress={() => setLogFilter('CRASH')}
                >
                  <Text style={[styles.filterChipText, logFilter === 'CRASH' ? { color: '#ffffff' } : { color: colors.textSecondary }]}>
                    {isRTL ? 'الانهيارات (Crashes)' : 'Crashes'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, logFilter === 'NETWORK' && { backgroundColor: '#3b82f6' }]}
                  onPress={() => setLogFilter('NETWORK')}
                >
                  <Text style={[styles.filterChipText, logFilter === 'NETWORK' ? { color: '#ffffff' } : { color: colors.textSecondary }]}>
                    {isRTL ? 'أخطاء الشبكة والـ API' : 'Network/API'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* 5. Logs List */}
              <Text style={[styles.sectionHeading, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'سجل تفاصيل الأخطاء والانهيارات' : 'Detailed Crash & Error Logs'}
              </Text>

              {filteredLogs.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                  <Ionicons name="checkmark-circle-outline" size={44} color="#10b981" />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {isRTL ? 'لا توجد أخطاء مسجلة في هذا القسم' : 'No Recorded Errors in this section'}
                  </Text>
                  <Text style={styles.emptySub}>
                    {isRTL
                      ? 'التطبيق يعمل باستقرار تام ولم يتم التقاط أي أعطال أو انهيارات حديثة.'
                      : 'The app is running smoothly with no crashes detected.'}
                  </Text>
                </View>
              ) : (
                filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const badgeColor = getSourceBadgeColor(log.source);
                  const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <View
                      key={log.id}
                      style={[styles.logCard, { backgroundColor: colors.inputBg, borderColor: isExpanded ? badgeColor : colors.border }]}
                    >
                      <View style={[styles.logCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.sourceBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}>
                            <Text style={[styles.sourceBadgeText, { color: badgeColor }]}>{log.source}</Text>
                          </View>
                          <Text style={styles.logTime}>{timeStr}</Text>
                        </View>

                        <TouchableOpacity
                          style={[styles.miniCopyBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                          onPress={() => handleCopySingleLog(log)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="copy-outline" size={13} color={colors.primary} />
                          <Text style={[styles.miniCopyBtnText, { color: colors.primary }]}>
                            {isRTL ? 'نسخ الخطأ' : 'Copy'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity
                        onPress={() => setExpandedLogId(isExpanded ? null : log.id)}
                        activeOpacity={0.85}
                      >
                        <Text
                          selectable={true}
                          style={[styles.logMessage, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                        >
                          {log.message}
                        </Text>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.expandedBox}>
                          {log.stack && (
                            <View style={styles.stackBox}>
                              <Text style={styles.stackTitle}>Stack Trace:</Text>
                              <Text selectable={true} style={styles.stackText}>{log.stack}</Text>
                            </View>
                          )}
                          {log.details && (
                            <View style={styles.detailsBox}>
                              <Text style={styles.stackTitle}>Details:</Text>
                              <Text selectable={true} style={styles.stackText}>{JSON.stringify(log.details, null, 2)}</Text>
                            </View>
                          )}

                          <TouchableOpacity
                            style={[styles.fullCopyBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
                            onPress={() => handleCopySingleLog(log)}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="copy-outline" size={15} color={colors.primary} />
                            <Text style={[styles.fullCopyBtnText, { color: colors.primary }]}>
                              {isRTL ? 'نسخ تفاصيل هذا السجل' : 'Copy Log Details'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <TouchableOpacity
                        style={[styles.expandHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        onPress={() => setExpandedLogId(isExpanded ? null : log.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                          {isExpanded ? (isRTL ? 'إخفاء التفاصيل' : 'Hide Details') : (isRTL ? 'اضغط لعرض المسار الفني والـ Stack' : 'Tap for Stack Trace')}
                        </Text>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  sysCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  cardHeaderRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardHeading: {
    fontSize: 13,
    fontWeight: '700',
  },
  tokenStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 2,
  },
  statVal: {
    fontSize: 12,
    fontWeight: '600',
  },
  pingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 6,
  },
  pingText: {
    fontSize: 11,
    fontWeight: '600',
  },
  miniActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  miniActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  miniActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  logCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  logCardHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sourceBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  logTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
  logMessage: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 6,
  },
  expandedBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(148, 163, 184, 0.2)',
  },
  stackBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  detailsBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
  },
  stackTitle: {
    fontSize: 11,
    color: '#f97316',
    fontWeight: '700',
    marginBottom: 4,
  },
  stackText: {
    fontSize: 10,
    color: '#cbd5e1',
    fontFamily: 'monospace',
  },
  expandHint: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  miniCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  miniCopyBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  fullCopyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  fullCopyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

