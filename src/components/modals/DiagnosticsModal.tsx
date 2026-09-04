import React, { useState, useEffect } from 'react';
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

interface DiagnosticsModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onClose: () => void;
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

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const [fetchedLogs, sys] = await Promise.all([
        getErrorLogs(),
        getSystemDiagnostics(),
      ]);
      setLogs(fetchedLogs);
      setSystemInfo(sys);
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

  const handleShareReport = async () => {
    try {
      const report = {
        title: 'AAMS Mobile App Diagnostics Report',
        generatedAt: new Date().toISOString(),
        system: systemInfo,
        totalErrors: logs.length,
        logs: logs.map((l) => ({
          time: l.timestamp,
          source: l.source,
          message: l.message,
          stack: l.stack,
          details: l.details,
        })),
      };

      await Share.share({
        title: 'AAMS Diagnostics Report',
        message: JSON.stringify(report, null, 2),
      });
    } catch (err) {
      console.log('Share report error:', err);
    }
  };

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
                  {isRTL ? 'سجل تشخيص وفحص الأخطاء' : 'Diagnostics & Error Logs'}
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {isRTL ? 'تتبع الأعطال وأسباب إغلاق التطبيق' : 'Crash tracing and error monitoring'}
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
              {/* System Overview Card */}
              <View style={[styles.sysCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.cardHeading, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {isRTL ? 'معلومات النظام والجهاز' : 'System & Device'}
                </Text>

                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={styles.statLabel}>{isRTL ? 'الجهاز' : 'Device'}</Text>
                    <Text style={[styles.statVal, { color: colors.textPrimary }]}>
                      {systemInfo.brand} {systemInfo.modelName}
                    </Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.statLabel}>{isRTL ? 'النظام' : 'OS'}</Text>
                    <Text style={[styles.statVal, { color: colors.textPrimary }]}>
                      {systemInfo.platform} v{String(systemInfo.platformVersion)}
                    </Text>
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={styles.statLabel}>{isRTL ? 'إصدار التطبيق' : 'App Version'}</Text>
                    <Text style={[styles.statVal, { color: colors.textPrimary }]}>
                      {systemInfo.appVersion} ({systemInfo.runtimeVersion})
                    </Text>
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.statLabel}>{isRTL ? 'الأخطاء المسجلة' : 'Errors Logged'}</Text>
                    <Text style={[styles.statVal, { color: logs.length > 0 ? '#ef4444' : '#10b981', fontWeight: '800' }]}>
                      {logs.length} {isRTL ? 'خطأ' : 'events'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={[styles.actionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                  onPress={handleShareReport}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-social-outline" size={16} color="#ffffff" style={{ marginHorizontal: 4 }} />
                  <Text style={styles.actionBtnText}>{isRTL ? 'مشاركة التقرير' : 'Share Report'}</Text>
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

              {/* Logs List */}
              <Text style={[styles.sectionHeading, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {isRTL ? 'سجل تفاصيل الأخطاء والانهيارات' : 'Detailed Crash & Error Logs'}
              </Text>

              {logs.length === 0 ? (
                <View style={[styles.emptyBox, { borderColor: colors.border }]}>
                  <Ionicons name="checkmark-circle-outline" size={44} color="#10b981" />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    {isRTL ? 'لا توجد أخطاء مسجلة' : 'No Recorded Errors'}
                  </Text>
                  <Text style={styles.emptySub}>
                    {isRTL
                      ? 'التطبيق يعمل باستقرار تام ولم يتم التقاط أي أعطال أو انهيارات حديثة.'
                      : 'The app is running smoothly with no crashes detected.'}
                  </Text>
                </View>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const badgeColor = getSourceBadgeColor(log.source);
                  const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <TouchableOpacity
                      key={log.id}
                      style={[styles.logCard, { backgroundColor: colors.inputBg, borderColor: isExpanded ? badgeColor : colors.border }]}
                      onPress={() => setExpandedLogId(isExpanded ? null : log.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.logCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.sourceBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}>
                          <Text style={[styles.sourceBadgeText, { color: badgeColor }]}>{log.source}</Text>
                        </View>
                        <Text style={styles.logTime}>{timeStr}</Text>
                      </View>

                      <Text style={[styles.logMessage, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {log.message}
                      </Text>

                      {isExpanded && (
                        <View style={styles.expandedBox}>
                          {log.stack && (
                            <View style={styles.stackBox}>
                              <Text style={styles.stackTitle}>Stack Trace:</Text>
                              <Text style={styles.stackText}>{log.stack}</Text>
                            </View>
                          )}
                          {log.details && (
                            <View style={styles.detailsBox}>
                              <Text style={styles.stackTitle}>Details:</Text>
                              <Text style={styles.stackText}>{JSON.stringify(log.details, null, 2)}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      <View style={[styles.expandHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                          {isExpanded ? (isRTL ? 'إخفاء التفاصيل' : 'Hide Details') : (isRTL ? 'اضغط لعرض المسار الفني والـ Stack' : 'Tap for Stack Trace')}
                        </Text>
                        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
                      </View>
                    </TouchableOpacity>
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
    height: '86%',
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
  cardHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
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
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
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
});
