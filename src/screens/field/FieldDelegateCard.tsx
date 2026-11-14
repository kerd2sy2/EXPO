import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { DelegateWithStatus } from '../../services/supervisor';
import { calcLiveElapsed } from './fieldHelpers';
import { fieldStyles as styles } from './fieldStyles';

interface FieldDelegateCardProps {
  delegate: DelegateWithStatus;
  isWorking: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onCall: (phone?: string) => void;
  onWhatsApp: (phone?: string) => void;
  onOpenOverride: (d: DelegateWithStatus, mode: 'start' | 'end') => void;
}

export const FieldDelegateCard: React.FC<FieldDelegateCardProps> = ({
  delegate: d,
  isWorking,
  colors,
  isDarkMode,
  isRTL,
  onCall,
  onWhatsApp,
  onOpenOverride,
}) => {
  const hasKey = Boolean(d.key_number && d.key_number.trim());
  const plate = d.active_motorcycle || d.motorcycle_number || 'بدون لوحة';
  const rawStartTime = d.shift_start_time || d.active_session?.start_time;
  const elapsed = isWorking && rawStartTime ? calcLiveElapsed(rawStartTime) : '';
  const startTimeFormatted = rawStartTime
    ? new Date(rawStartTime).toLocaleTimeString('ar-SA', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';
  const startKmVal =
    d.start_km !== undefined && d.start_km !== null
      ? d.start_km
      : d.active_session?.start_km !== undefined && d.active_session?.start_km !== null
      ? d.active_session.start_km
      : 0;

  return (
    <View
      style={[
        styles.delegateCard,
        {
          backgroundColor: colors.card,
          borderColor: isWorking ? '#10b98160' : colors.border,
        },
      ]}
    >
      {/* Top Row */}
      <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View
          style={[
            styles.keyBox,
            {
              backgroundColor: hasKey
                ? isDarkMode
                  ? 'rgba(245, 158, 11, 0.16)'
                  : '#fffbeb'
                : isDarkMode
                ? '#1e293b'
                : '#f1f5f9',
              borderColor: hasKey ? '#f59e0b60' : colors.border,
            },
          ]}
        >
          <Ionicons name="key" size={12} color={hasKey ? '#d97706' : colors.textSecondary} />
          <Text style={[styles.keyNumberText, { color: hasKey ? '#d97706' : colors.textSecondary }]}>
            {hasKey ? d.key_number : '--'}
          </Text>
        </View>

        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.delegateName, { color: colors.textPrimary }]} numberOfLines={1}>
            {d.name}
          </Text>
          <View style={[styles.statusLine, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isWorking ? '#10b981' : '#ef4444' },
              ]}
            />
            <Text
              style={[
                styles.statusText,
                { color: isWorking ? '#10b981' : colors.textSecondary },
              ]}
            >
              {isWorking ? `في الميدان (${elapsed || 'نشط'})` : 'خارج الدوام'}
            </Text>
          </View>
        </View>

        {!!d.phone && (
          <View style={[styles.commButtons, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[styles.commBtn, { backgroundColor: '#10b98118' }]}
              onPress={() => onCall(d.phone)}
            >
              <Ionicons name="call" size={15} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.commBtn, { backgroundColor: '#25D36618' }]}
              onPress={() => onWhatsApp(d.phone)}
            >
              <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Info Strip */}
      <View
        style={[
          styles.infoStrip,
          {
            backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
            borderColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={styles.infoCell}>
          <Text style={[styles.infoCellLabel, { color: colors.textSecondary }]}>الدباب</Text>
          <Text style={[styles.infoCellValue, { color: colors.textPrimary }]} numberOfLines={1}>
            {plate}
          </Text>
        </View>

        {isWorking ? (
          <>
            <View style={styles.infoCell}>
              <Text style={[styles.infoCellLabel, { color: colors.textSecondary }]}>وقت البداية</Text>
              <Text style={[styles.infoCellValue, { color: '#0284c7' }]}>{startTimeFormatted}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={[styles.infoCellLabel, { color: colors.textSecondary }]}>كيلو البداية</Text>
              <Text style={[styles.infoCellValue, { color: colors.textPrimary }]}>
                {startKmVal} كم
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.infoCell}>
            <Text style={[styles.infoCellLabel, { color: colors.textSecondary }]}>المنصة والمعرف</Text>
            <Text style={[styles.infoCellValue, { color: colors.textPrimary }]} numberOfLines={1}>
              {d.application_type || '---'} {d.application_id ? `#${d.application_id}` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Supervisor Override Action Button */}
      <TouchableOpacity
        style={[
          styles.overrideBtn,
          {
            backgroundColor: isWorking ? '#ef444415' : '#10b98115',
            borderColor: isWorking ? '#ef444440' : '#10b98140',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
        onPress={() => onOpenOverride(d, isWorking ? 'end' : 'start')}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isWorking ? 'stop-circle-outline' : 'play-circle-outline'}
          size={18}
          color={isWorking ? '#ef4444' : '#10b981'}
        />
        <Text
          style={[
            styles.overrideBtnText,
            { color: isWorking ? '#ef4444' : '#10b981' },
          ]}
        >
          {isWorking ? 'إنهاء الوردية كمشرف' : 'بدء وردية للمندوب كمشرف'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
