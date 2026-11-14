import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { PreviewPhotoData, ThemeColors, WorkSession } from '../../types/delegate';
import { DelegateWithStatus } from '../../services/supervisor';
import { formatImageUrl } from '../../services/api';
import { ordersReviewStyles as styles } from './ordersReviewStyles';
import {
  calcReviewShiftHours,
  formatReviewDateTimeFull,
  formatReviewTimeOnly,
} from './ordersReviewHelpers';

interface OrderSessionCardProps {
  session: WorkSession;
  empRecord?: DelegateWithStatus;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  onOpenEdit: (session: WorkSession) => void;
}

export const OrderSessionCard: React.FC<OrderSessionCardProps> = React.memo(({
  session,
  empRecord,
  colors,
  isDarkMode,
  isRTL,
  onPreviewPhoto,
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
  const hoursLabel = calcReviewShiftHours(session.start_time, session.end_time);

  const orderedMetrics = [
    { label: '1. وقت البداية', value: formatReviewTimeOnly(session.start_time), icon: 'play-circle-outline', color: '#0284c7' },
    { label: '2. كيلو البداية', value: `${startKmVal} كم`, icon: 'speedometer-outline', color: '#0284c7' },
    { label: '3. وقت النهاية', value: formatReviewTimeOnly(session.end_time), icon: 'stop-circle-outline', color: '#6366f1' },
    { label: '4. كيلو النهاية', value: `${endKmVal} كم`, icon: 'flag-outline', color: '#6366f1' },
    { label: '5. عدد الكيلوات', value: `${distanceKm} كم`, icon: 'analytics-outline', color: '#0d9488' },
    { label: '6. الطلبات', value: `${session.orders_count ?? 0} طلب`, icon: 'bag-check-outline', color: '#10b981', highlight: true },
    { label: '7. الساعات', value: hoursLabel, icon: 'time-outline', color: '#8b5cf6' },
    { label: '8. بنزين', value: `${Math.round(Number(session.fuel_cost ?? 0))} ر.س`, icon: 'flame-outline', color: '#f59e0b' },
    { label: '9. المعرف', value: String(appId), icon: 'id-card-outline', color: '#ec4899' },
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => onOpenEdit(session)}
      style={[
        styles.sessionCard,
        {
          backgroundColor: colors.card,
          borderColor: session.is_reviewed ? colors.border : '#f59e0b60',
        },
      ]}
    >
      <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <View style={[styles.nameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.empName, { color: colors.textPrimary }]} numberOfLines={1}>
              {empName}
            </Text>
            {!!keyNum && (
              <View style={[styles.keyBadge, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b50', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="key" size={11} color="#d97706" />
                <Text style={styles.keyBadgeText}>مفتاح {keyNum}</Text>
              </View>
            )}
          </View>

          <View style={[styles.dateTimeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="calendar-outline" size={12} color={colors.textSecondary} />
            <Text style={[styles.dateTimeText, { color: colors.textSecondary }]}>
              {formatReviewDateTimeFull(session.end_time || session.start_time)}
            </Text>
            {!!session.motorcycle_number && (
              <Text style={[styles.dateTimeText, { color: colors.primary, fontWeight: '700' }]}>
                • {session.motorcycle_number}
              </Text>
            )}
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: session.is_reviewed ? '#10b98118' : '#f59e0b18',
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons
            name={session.is_reviewed ? 'checkmark-circle' : 'time'}
            size={13}
            color={session.is_reviewed ? '#10b981' : '#d97706'}
          />
          <Text
            style={[
              styles.statusBadgeText,
              { color: session.is_reviewed ? '#10b981' : '#d97706' },
            ]}
          >
            {session.is_reviewed ? 'معتمد' : 'بانتظار الاعتماد'}
          </Text>
        </View>
      </View>

      <View style={[styles.orderedGrid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        {orderedMetrics.map((m, idx) => (
          <View
            key={idx}
            style={[
              styles.metricBox,
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
            <View style={[styles.metricLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name={m.icon as any} size={12} color={m.color} />
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

      <View style={[styles.cardFooter, { flexDirection: isRTL ? 'row-reverse' : 'row', borderTopColor: colors.border }]}>
        <View style={[styles.photosActionGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {!!session.start_km_image && (
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() =>
                onPreviewPhoto({
                  url: formatImageUrl(session.start_km_image) || '',
                  title: `عداد البداية (${startKmVal} كم) - ${empName}`,
                })
              }
            >
              <Image
                source={{ uri: formatImageUrl(session.start_km_image) || '' }}
                style={styles.tinyThumb}
                contentFit="cover"
              />
              <Text style={[styles.photoBtnText, { color: colors.textPrimary }]}>صورة البداية</Text>
            </TouchableOpacity>
          )}

          {!!session.end_km_image && (
            <TouchableOpacity
              style={[styles.photoBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() =>
                onPreviewPhoto({
                  url: formatImageUrl(session.end_km_image) || '',
                  title: `عداد النهاية (${endKmVal} كم) - ${empName}`,
                })
              }
            >
              <Image
                source={{ uri: formatImageUrl(session.end_km_image) || '' }}
                style={styles.tinyThumb}
                contentFit="cover"
              />
              <Text style={[styles.photoBtnText, { color: colors.textPrimary }]}>صورة النهاية</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.editActionBtn, { backgroundColor: colors.primary }]}
          onPress={() => onOpenEdit(session)}
        >
          <Ionicons name="create-outline" size={15} color="#ffffff" />
          <Text style={styles.editActionBtnText}>
            {session.is_reviewed ? 'تعديل' : 'مراجعة واعتماد'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
});
