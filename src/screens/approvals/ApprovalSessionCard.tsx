import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { PreviewPhotoData, ThemeColors, WorkSession } from '../../types/delegate';
import { DelegateWithStatus } from '../../services/supervisor';
import { formatImageUrl } from '../../services/api';
import { approvalsCardStyles as styles } from './approvalsCardStyles';
import {
  calcShiftHours,
  formatDateTimeFull,
  formatTimeOnly,
} from './approvalsHelpers';

interface ApprovalSessionCardProps {
  session: WorkSession;
  empRecord?: DelegateWithStatus;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  onQuickApprove: (session: WorkSession) => void;
  onOpenEdit: (session: WorkSession) => void;
}

export const ApprovalSessionCard: React.FC<ApprovalSessionCardProps> = React.memo(({
  session,
  empRecord,
  colors,
  isDarkMode,
  isRTL,
  onPreviewPhoto,
  onQuickApprove,
  onOpenEdit,
}) => {
  const empName =
    session.employee_name ||
    session.employee?.name ||
    empRecord?.name ||
    'مندوب';
  const keyNum =
    (session as any).key_number ||
    (session.employee as any)?.key_number ||
    empRecord?.key_number ||
    '';
  const appId =
    (session as any).application_id ||
    (session.employee as any)?.application_id ||
    empRecord?.application_id ||
    '---';
  const startKmVal = Number(session.start_km ?? 0);
  const endKmVal = Number(session.end_km ?? 0);
  const distanceKm =
    endKmVal >= startKmVal && endKmVal > 0
      ? endKmVal - startKmVal
      : Number((session as any).total_km ?? session.distance ?? 0);
  const hoursLabel = calcShiftHours(session.start_time, session.end_time);

  // The 9 ordered metrics requested by user:
  // 1. وقت البداية | 2. كيلو البداية | 3. وقت النهاية | 4. كيلو النهاية | 5. عدد الكيلوات | 6. الطلبات | 7. الساعات | 8. بنزين | 9. المعرف
  const orderedMetrics = [
    { label: '1. وقت البداية', value: formatTimeOnly(session.start_time), icon: 'play-circle-outline', color: '#0284c7' },
    { label: '2. كيلو البداية', value: `${startKmVal} كم`, icon: 'speedometer-outline', color: '#0284c7' },
    { label: '3. وقت النهاية', value: formatTimeOnly(session.end_time), icon: 'stop-circle-outline', color: '#6366f1' },
    { label: '4. كيلو النهاية', value: `${endKmVal} كم`, icon: 'flag-outline', color: '#6366f1' },
    { label: '5. عدد الكيلوات', value: `${distanceKm} كم`, icon: 'analytics-outline', color: '#0d9488' },
    { label: '6. الطلبات', value: `${session.orders_count ?? 0} طلب`, icon: 'bag-check-outline', color: '#10b981', highlight: true },
    { label: '7. الساعات', value: hoursLabel, icon: 'time-outline', color: '#8b5cf6' },
    { label: '8. بنزين', value: `${Math.round(Number(session.fuel_cost ?? 0))} ر.س`, icon: 'flame-outline', color: '#f59e0b' },
    { label: '9. المعرف', value: String(appId), icon: 'id-card-outline', color: '#ec4899' },
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={() => onOpenEdit(session)}
      style={[
        styles.approvalCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header: Courier Name, Key Badge, Completion Timestamp */}
      <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.empBadgeCircle, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="person" size={18} color={colors.primary} />
        </View>

        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <View style={[styles.nameAndKeyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {empName}
            </Text>
            {!!keyNum && (
              <View style={[styles.keyPill, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b50', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="key" size={11} color="#d97706" />
                <Text style={styles.keyPillText}>مفتاح {keyNum}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.cardTimestamp, { color: colors.textSecondary }]}>
            انتهى: {formatDateTimeFull(session.end_time || session.start_time)} • الدباب: {session.motorcycle_number || '---'}
          </Text>
        </View>
      </View>

      {/* 9 Ordered Shift Metrics Grid (3x3 Structured Layout) */}
      <View style={[styles.orderedGrid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        {orderedMetrics.map((m, idx) => (
          <View
            key={idx}
            style={[
              styles.metricCell,
              {
                backgroundColor: m.highlight
                  ? isDarkMode
                    ? 'rgba(16, 185, 129, 0.14)'
                    : '#ecfdf5'
                  : isDarkMode
                  ? '#1e293b'
                  : '#f8fafc',
                borderColor: m.highlight ? '#10b98150' : colors.border,
              },
            ]}
          >
            <View style={[styles.metricTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name={m.icon as any} size={13} color={m.color} />
              <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                {m.label}
              </Text>
            </View>
            <Text
              style={[
                styles.metricValue,
                { color: m.highlight ? '#10b981' : colors.textPrimary },
              ]}
              numberOfLines={1}
            >
              {m.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Odometer Photos Strip (if available) */}
      {(session.start_km_image || session.end_km_image) && (
        <View style={[styles.photosRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {!!session.start_km_image && (
            <TouchableOpacity
              style={[styles.photoThumbBtn, { borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() =>
                onPreviewPhoto({
                  url: formatImageUrl(session.start_km_image) || '',
                  title: `عداد البداية (${startKmVal} كم) - ${empName}`,
                })
              }
            >
              <Image
                source={{ uri: formatImageUrl(session.start_km_image) || '' }}
                style={styles.miniThumb}
                contentFit="cover"
              />
              <Text style={[styles.photoThumbText, { color: colors.textPrimary }]}>
                صورة البداية
              </Text>
            </TouchableOpacity>
          )}

          {!!session.end_km_image && (
            <TouchableOpacity
              style={[styles.photoThumbBtn, { borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() =>
                onPreviewPhoto({
                  url: formatImageUrl(session.end_km_image) || '',
                  title: `عداد النهاية (${endKmVal} كم) - ${empName}`,
                })
              }
            >
              <Image
                source={{ uri: formatImageUrl(session.end_km_image) || '' }}
                style={styles.miniThumb}
                contentFit="cover"
              />
              <Text style={[styles.photoThumbText, { color: colors.textPrimary }]}>
                صورة النهاية
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Action Buttons: Quick Approve or Edit/Review */}
      <View style={[styles.cardActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[styles.approveDirectBtn, { backgroundColor: '#10b981' }]}
          onPress={() => onQuickApprove(session)}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
          <Text style={styles.approveDirectBtnText}>اعتماد فوري</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.editReviewBtn,
            {
              backgroundColor: colors.primary + '15',
              borderColor: colors.primary + '40',
            },
          ]}
          onPress={() => onOpenEdit(session)}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={17} color={colors.primary} />
          <Text style={[styles.editReviewBtnText, { color: colors.primary }]}>
            تعديل ومراجعة
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});
