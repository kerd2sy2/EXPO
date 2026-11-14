import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { DelegateWithStatus } from '../../services/supervisor';
import {
  getPlatformColor,
  getPlatformLabelAr,
  normalizePlatformKey,
} from '../../components/modals/edit-employee/editEmployeeHelpers';
import { platformDelegatesModalStyles as styles } from './platformDelegatesModalStyles';

interface IdentifierLookupEntry {
  driverName: string;
  name: string;
  appKey: string;
}

interface PlatformDelegateRowCardProps {
  delegate: DelegateWithStatus;
  identifierLookup: Map<string, IdentifierLookupEntry>;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onLongPress: (d: DelegateWithStatus) => void;
}

export const PlatformDelegateRowCard: React.FC<PlatformDelegateRowCardProps> = React.memo(({
  delegate: d,
  identifierLookup,
  colors,
  isDarkMode,
  isRTL,
  onLongPress,
}) => {
  const platKey = normalizePlatformKey(d.application_type);
  const platColor = getPlatformColor(platKey);
  const platLabel = getPlatformLabelAr(platKey);
  const appIdTrimmed = (d.application_id || '').trim();
  const normId = toEnglishDigits(appIdTrimmed).toLowerCase();
  const matched = normId
    ? identifierLookup.get(`${platKey}_${normId}`) || identifierLookup.get(normId)
    : undefined;
  const driverHint =
    matched?.driverName && toEnglishDigits(matched.driverName).toLowerCase() !== normId
      ? ` (${matched.driverName})`
      : '';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: appIdTrimmed ? platColor + '45' : colors.border,
        },
      ]}
      onLongPress={() => onLongPress(d)}
      delayLongPress={320}
      activeOpacity={0.85}
    >
      <View style={[styles.cardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.keyBadge, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b45' }]}>
          <Ionicons name="key" size={12} color="#d97706" />
          <Text style={styles.keyText}>{d.key_number || '--'}</Text>
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.empName, { color: colors.textPrimary }]} numberOfLines={1}>
            {d.name}
          </Text>
          <Text style={[styles.bikeText, { color: colors.textSecondary }]} numberOfLines={1}>
            الدباب: {d.motorcycle_number || 'غير محدد'}
          </Text>
        </View>
        <View style={[styles.platBadge, { backgroundColor: platColor + '18', borderColor: platColor + '45' }]}>
          <Text style={[styles.platBadgeText, { color: platColor }]}>{platLabel}</Text>
        </View>
      </View>

      <View
        style={[
          styles.linkedUserRow,
          {
            backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
            borderColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Ionicons
          name={appIdTrimmed ? 'person-circle-outline' : 'alert-circle-outline'}
          size={18}
          color={appIdTrimmed ? platColor : '#ef4444'}
        />
        <Text
          style={[
            styles.linkedUserText,
            { color: appIdTrimmed ? colors.textPrimary : '#ef4444' },
          ]}
          numberOfLines={1}
        >
          {appIdTrimmed ? `مربوط بيوزر: #${appIdTrimmed}${driverHint}` : 'غير مربوط بأي يوزر'}
        </Text>
        <Text style={[styles.longPressHint, { color: colors.textSecondary }]}>ضغطة مطولة للتعديل</Text>
      </View>
    </TouchableOpacity>
  );
});
