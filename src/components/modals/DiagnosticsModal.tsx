import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Share, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { getErrorLogs, clearErrorLogs, getSystemDiagnostics, DebugErrorLog } from '../../services/errorLogger';
import { getStoredToken, getStoredRefreshToken, refreshAuthToken, API_BASE_URL } from '../../services/api';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import {
  TokenInspectResult,
  inspectJwt,
  formatSingleLogText,
  buildFullDiagnosticsReport,
  filterDiagnosticLogs,
} from './diagnostics/diagnosticsHelpers';
import { diagnosticsStyles as styles } from './diagnostics/diagnosticsStyles';
import { DiagnosticsAuthHealthCard } from './diagnostics/DiagnosticsAuthHealthCard';
import { DiagnosticsLogCard } from './diagnostics/DiagnosticsLogCard';

export interface DiagnosticsModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onClose: () => void;
}

/** Modal displaying live JWT health, server connectivity ping, and crash/network logs. */
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

  const [tokenInfo, setTokenInfo] = useState<TokenInspectResult>({
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
      const [fetchedLogs, sys] = await Promise.all([getErrorLogs(), getSystemDiagnostics()]);
      setLogs(fetchedLogs || []);
      setSystemInfo(sys || {});

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
    if (visible) loadDiagnostics();
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
      const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' }).catch(async () =>
        fetch(`${API_BASE_URL}`, { method: 'GET' })
      );
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

  const handleCopySingleLog = async (log: DebugErrorLog) => {
    try {
      const formatted = `📋 [تقرير خطأ AAMS للمطور / الأجينت]\n------------------------------------\n${formatSingleLogText(log)}------------------------------------`;
      if (typeof navigator !== 'undefined' && (navigator as any).clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(formatted);
      }
      await Share.share({ title: 'تفاصيل الخطأ للأجينت', message: formatted });
    } catch (err) {
      console.log('Error sharing single log:', err);
    }
  };

  const handleCopyAllForAgent = async () => {
    try {
      const reportText = buildFullDiagnosticsReport(systemInfo, tokenInfo, hasRefreshToken, logs, API_BASE_URL);
      if (typeof navigator !== 'undefined' && (navigator as any).clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(reportText);
      }
      await Share.share({ title: 'تقرير أخطاء AAMS للأجينت', message: reportText });
    } catch (err) {
      console.log('Copy all report error:', err);
    }
  };

  const filteredLogs = useMemo(() => filterDiagnosticLogs(logs, logFilter), [logs, logFilter]);
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.header, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
            <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 10 }}>
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
              <DiagnosticsAuthHealthCard
                tokenInfo={tokenInfo}
                hasRefreshToken={hasRefreshToken}
                pingStatus={pingStatus}
                pinging={pinging}
                refreshingToken={refreshingToken}
                systemInfo={systemInfo}
                logsCount={logs.length}
                onRefreshToken={handleManualRefreshToken}
                onPingServer={handlePingServer}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
              />

              <View style={[styles.actionRow, { flexDirection: rowDir }]}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#10b981', flex: 1.4 }]} onPress={handleCopyAllForAgent} activeOpacity={0.8}>
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

              <View style={[styles.filterChipsRow, { flexDirection: rowDir }]}>
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

              <Text style={[styles.sectionHeading, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'سجل تفاصيل الأخطاء والانهيارات' : 'Detailed Crash & Error Logs'}
              </Text>

              <ModuleErrorBoundary moduleName="DiagnosticsLogsList" colors={colors}>
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
                  filteredLogs.map((log) => (
                    <DiagnosticsLogCard
                      key={log.id}
                      log={log}
                      isExpanded={expandedLogId === log.id}
                      onToggleExpand={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                      onCopyLog={handleCopySingleLog}
                      colors={colors}
                      isRTL={isRTL}
                    />
                  ))
                )}
              </ModuleErrorBoundary>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};
