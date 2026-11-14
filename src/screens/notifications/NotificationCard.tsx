import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { NotificationItem } from './notificationsHelpers';
import { notificationsStyles as styles } from './notificationsStyles';

interface NotificationCardProps {
  item: NotificationItem;
  isRead: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onPress: (item: NotificationItem) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  item,
  isRead,
  colors,
  isDarkMode,
  isRTL,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.notificationCard,
        {
          backgroundColor: colors.card,
          borderColor: isRead ? colors.border : item.iconColor + '50',
          borderStartWidth: isRead ? 1 : 4,
          borderStartColor: isRead ? colors.border : item.iconColor,
        },
      ]}
      onPress={() => onPress(item)}
      activeOpacity={0.8}
    >
      <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
          <Ionicons name={item.iconName} size={20} color={item.iconColor} />
        </View>

        <View style={[styles.titleCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.titleBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{item.title}</Text>
            {!isRead && <View style={[styles.unreadDot, { backgroundColor: item.iconColor }]} />}
          </View>

          {item.delegateName && (
            <Text style={[styles.delegateName, { color: colors.primary }]}>
              {item.delegateName}
            </Text>
          )}
        </View>

        <Text style={[styles.timeAgoText, { color: colors.textSecondary }]}>{item.timestamp}</Text>
      </View>

      <Text
        style={[
          styles.cardMessage,
          { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
        ]}
      >
        {item.message}
      </Text>

      <View style={[styles.cardFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View
          style={[
            styles.actionBtn,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Text style={[styles.actionBtnText, { color: colors.textPrimary }]}>
            {item.actionLabel}
          </Text>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={14}
            color={colors.textSecondary}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};
