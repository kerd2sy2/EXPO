import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../../types/delegate';
import { DebugErrorLog } from '../../../services/errorLogger';
import { getSourceBadgeColor } from './diagnosticsHelpers';
import { diagnosticsStyles as styles } from './diagnosticsStyles';

interface DiagnosticsLogCardProps {
  log: DebugErrorLog;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCopyLog: (log: DebugErrorLog) => void;
  colors: ThemeColors;
  isRTL: boolean;
}

/** Expandable card displaying a recorded diagnostic error log and stack trace. */
export const DiagnosticsLogCard: React.FC<DiagnosticsLogCardProps> = ({
  log,
  isExpanded,
  onToggleExpand,
  onCopyLog,
  colors,
  isRTL,
}) => {
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const badgeColor = getSourceBadgeColor(log.source);
  const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <View style={[styles.logCard, { backgroundColor: colors.inputBg, borderColor: isExpanded ? badgeColor : colors.border }]}>
      <View style={[styles.logCardHeader, { flexDirection: rowDir }]}>
        <View style={{ flexDirection: rowDir, alignItems: 'center', gap: 6 }}>
          <View style={[styles.sourceBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor }]}>
            <Text style={[styles.sourceBadgeText, { color: badgeColor }]}>{log.source}</Text>
          </View>
          <Text style={styles.logTime}>{timeStr}</Text>
        </View>

        <TouchableOpacity
          style={[styles.miniCopyBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
          onPress={() => onCopyLog(log)}
          activeOpacity={0.7}
        >
          <Ionicons name="copy-outline" size={13} color={colors.primary} />
          <Text style={[styles.miniCopyBtnText, { color: colors.primary }]}>{isRTL ? 'نسخ الخطأ' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.85}>
        <Text selectable={true} style={[styles.logMessage, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
          {log.message}
        </Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.expandedBox}>
          {log.stack && (
            <View style={styles.stackBox}>
              <Text style={styles.stackTitle}>Stack Trace:</Text>
              <Text selectable={true} style={styles.stackText}>
                {log.stack}
              </Text>
            </View>
          )}
          {log.details && (
            <View style={styles.detailsBox}>
              <Text style={styles.stackTitle}>Details:</Text>
              <Text selectable={true} style={styles.stackText}>
                {JSON.stringify(log.details, null, 2)}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.fullCopyBtn, { backgroundColor: colors.card, borderColor: colors.primary }]}
            onPress={() => onCopyLog(log)}
            activeOpacity={0.8}
          >
            <Ionicons name="copy-outline" size={15} color={colors.primary} />
            <Text style={[styles.fullCopyBtnText, { color: colors.primary }]}>
              {isRTL ? 'نسخ تفاصيل هذا السجل' : 'Copy Log Details'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={[styles.expandHint, { flexDirection: rowDir }]} onPress={onToggleExpand} activeOpacity={0.7}>
        <Text style={{ fontSize: 11, color: colors.textSecondary }}>
          {isExpanded ? (isRTL ? 'إخفاء التفاصيل' : 'Hide Details') : isRTL ? 'اضغط لعرض المسار الفني والـ Stack' : 'Tap for Stack Trace'}
        </Text>
        <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textSecondary} />
      </TouchableOpacity>
    </View>
  );
};
