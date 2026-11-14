import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BroadcastNotificationItem, getLocalizedBroadcast } from '../../../services/notificationService';
import { formatImageUrl } from '../../../services/api';
import { ThemeColors, Language } from '../../../types/delegate';
import { formatBroadcastDate, formatBroadcastTime } from './broadcastHistoryHelpers';
import { broadcastHistoryStyles as styles } from './broadcastHistoryStyles';

interface BroadcastHistoryCardProps {
  item: BroadcastNotificationItem;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  lang: Language;
  texts: {
    agreeText: string;
    disagreeText: string;
    pollText: string;
    newBadgeText: string;
    tapVoteText: string;
    viewDetailsText: string;
  };
  onSelect: (item: BroadcastNotificationItem) => void;
  onPreviewImage?: (url: string) => void;
}

/**
 * Renders an individual broadcast notification or poll summary card.
 */
export const BroadcastHistoryCard: React.FC<BroadcastHistoryCardProps> = ({
  item,
  colors,
  isDarkMode,
  isRTL,
  lang,
  texts,
  onSelect,
  onPreviewImage,
}) => {
  const hasUnread = !item.is_read;
  const { title: locTitle, body: locBody } = getLocalizedBroadcast(item, lang);
  const imageUri = item.image_url ? formatImageUrl(item.image_url) : null;

  return (
    <TouchableOpacity
      style={[
        styles.premiumNotifCard,
        {
          backgroundColor: colors.card,
          borderColor: hasUnread ? colors.primary : colors.border,
          borderWidth: hasUnread ? 1.5 : 1,
        },
      ]}
      activeOpacity={0.8}
      onPress={() => onSelect(item)}
    >
      {/* Card Header: Date Badge + Poll / Status Badge */}
      <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.dateGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.dateIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="time-outline" size={14} color={colors.primary} />
          </View>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {formatBroadcastDate(item.created_at, lang)} • {formatBroadcastTime(item.created_at, lang)}
          </Text>
        </View>

        <View style={[styles.badgeGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {item.has_poll ? (
            <View
              style={[
                styles.pollBadge,
                {
                  backgroundColor: item.user_vote
                    ? item.user_vote === 'AGREE'
                      ? '#dcfce7'
                      : '#fee2e2'
                    : isDarkMode
                    ? 'rgba(56, 189, 248, 0.16)'
                    : '#e0f2fe',
                  borderColor: item.user_vote
                    ? item.user_vote === 'AGREE'
                      ? '#bbf7d0'
                      : '#fecaca'
                    : isDarkMode
                    ? 'rgba(56, 189, 248, 0.3)'
                    : '#bae6fd',
                },
              ]}
            >
              <Ionicons
                name="stats-chart"
                size={12}
                color={
                  item.user_vote ? (item.user_vote === 'AGREE' ? '#16a34a' : '#ef4444') : '#0284c7'
                }
              />
              <Text
                style={[
                  styles.pollBadgeText,
                  {
                    color: item.user_vote
                      ? item.user_vote === 'AGREE'
                        ? '#15803d'
                        : '#b91c1c'
                      : '#0369a1',
                  },
                ]}
              >
                {item.user_vote
                  ? item.user_vote === 'AGREE'
                    ? texts.agreeText
                    : texts.disagreeText
                  : texts.pollText}
              </Text>
            </View>
          ) : null}

          {hasUnread ? (
            <View
              style={[
                styles.newBadge,
                { backgroundColor: colors.primaryLight, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.newBadgeText, { color: colors.primary }]}>
                {texts.newBadgeText}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Card Main Body */}
      <View style={[styles.cardBodyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {imageUri ? (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => onPreviewImage && onPreviewImage(imageUri)}
            style={[styles.thumbnailWrap, { borderColor: colors.border }]}
          >
            <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
          </TouchableOpacity>
        ) : null}

        <View style={[styles.cardTextContent, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text
            style={[
              styles.cardTitle,
              {
                color: colors.textPrimary,
                textAlign: isRTL ? 'right' : 'left',
                fontWeight: hasUnread ? '900' : '700',
              },
            ]}
            numberOfLines={1}
          >
            {locTitle}
          </Text>

          <Text
            style={[
              styles.cardSnippet,
              {
                color: colors.textSecondary,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
            numberOfLines={2}
          >
            {locBody}
          </Text>
        </View>
      </View>

      {/* Card Footer */}
      <View
        style={[
          styles.cardFooterRow,
          {
            flexDirection: isRTL ? 'row-reverse' : 'row',
            borderTopColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.tapDetailsText, { color: colors.primary }]}>
          {item.has_poll && !item.user_vote ? texts.tapVoteText : texts.viewDetailsText}
        </Text>
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={16}
          color={colors.primary}
        />
      </View>
    </TouchableOpacity>
  );
};
