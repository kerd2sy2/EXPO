import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BroadcastNotificationItem, getLocalizedBroadcast } from '../../services/notificationService';
import { ThemeColors, Language } from '../../types/delegate';
import { formatImageUrl } from '../../services/api';

interface BroadcastHistoryModalProps {
  visible: boolean;
  broadcasts: BroadcastNotificationItem[];
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  lang?: Language;
  onClose: () => void;
  onSelectBroadcast: (item: BroadcastNotificationItem) => void;
  onPreviewImage?: (url: string) => void;
  onRefresh?: () => void;
  onMarkAllAsRead?: () => void;
  loading?: boolean;
}

export const BroadcastHistoryModal: React.FC<BroadcastHistoryModalProps> = ({
  visible,
  broadcasts,
  colors,
  isDarkMode,
  isRTL,
  lang = 'ar',
  onClose,
  onSelectBroadcast,
  onPreviewImage,
  onRefresh,
  onMarkAllAsRead,
  loading,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handlePullRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  // Localized texts
  const headerTitle = lang === 'bn' ? 'বিজ্ঞপ্তি ও নোটিশ কেন্দ্র' : lang === 'en' ? 'Notifications & Broadcasts' : 'مركز الإشعارات والتعاميم';
  const loadingText = lang === 'bn' ? 'বিজ্ঞপ্তি লোড হচ্ছে...' : lang === 'en' ? 'Loading notifications...' : 'جاري تحميل الإشعارات...';
  const emptyTitle = lang === 'bn' ? 'এখনো কোন বিজ্ঞপ্তি নেই' : lang === 'en' ? 'No notifications yet' : 'لا توجد إشعارات حالياً';
  const emptySub = lang === 'bn'
    ? 'প্রশাসনিক নোটিশ বা জরিপ পাঠানো হলে এখানে দেখতে পাবেন'
    : lang === 'en'
    ? 'You will receive administrative broadcasts and polls here.'
    : 'سيتم تنبيهك هنا بأي تعاميم أو استبيانات إدارية جديدة فور إرسالها';

  const hasUnread = broadcasts.some((b) => !b.is_read);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={colors.bg}
        />

        {/* Standard App Sub-Page Header */}
        <View style={[styles.appHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.subPageHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>

            <View style={[styles.subPageTitleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {headerTitle}
              </Text>
              <View style={[styles.titleUnderlineBar, { backgroundColor: colors.primary }]} />
            </View>

            {onMarkAllAsRead ? (
              <TouchableOpacity
                onPress={onMarkAllAsRead}
                style={[
                  styles.headerActionBtn,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name="checkmark-done"
                  size={20}
                  color={hasUnread ? colors.primary : colors.textSecondary}
                />
              </TouchableOpacity>
            ) : onRefresh ? (
              <TouchableOpacity
                onPress={onRefresh}
                style={[
                  styles.headerActionBtn,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                ]}
                activeOpacity={0.7}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="refresh" size={20} color={colors.primary} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36 }} />
            )}
          </View>
        </View>

        {/* Content Body */}
        {loading && !refreshing ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              {loadingText}
            </Text>
          </View>
        ) : broadcasts.length === 0 ? (
          <ScrollView
            contentContainerStyle={[styles.centered, { flexGrow: 1 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handlePullRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              ) : undefined
            }
          >
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="notifications-off-outline" size={36} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                {emptyTitle}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {emptySub}
              </Text>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handlePullRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              ) : undefined
            }
          >
            {broadcasts.map((item) => {
              const hasUnread = !item.is_read;
              const { title: locTitle, body: locBody } = getLocalizedBroadcast(item, lang);

              const agreeText = lang === 'bn' ? 'সম্মত' : lang === 'en' ? 'Agreed' : 'تمت الموافقة';
              const disagreeText = lang === 'bn' ? 'অসম্মত' : lang === 'en' ? 'Disagreed' : 'معترض';
              const pollText = lang === 'bn' ? 'ভোট / জরিপ' : lang === 'en' ? 'Poll' : 'استبيان رأي';
              const newBadgeText = lang === 'bn' ? 'নতুন' : lang === 'en' ? 'NEW' : 'جديد';
              const tapVoteText = lang === 'bn' ? 'ভোট দিতে চাপ দিন' : lang === 'en' ? 'Tap to cast your vote' : 'اضغط للمشاركة في التصويت';
              const viewDetailsText = lang === 'bn' ? 'বিস্তারিত দেখুন' : lang === 'en' ? 'View details' : 'عرض التفاصيل الكاملة';

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.premiumNotifCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: hasUnread ? colors.primary : colors.border,
                      borderWidth: hasUnread ? 1.5 : 1,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => onSelectBroadcast(item)}
                >
                  {/* Card Header: Date Badge + Poll / Status Badge */}
                  <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {/* Date & Time Badge */}
                    <View style={[styles.dateGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.dateIconCircle, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="time-outline" size={14} color={colors.primary} />
                      </View>
                      <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                        {formatDate(item.created_at)} • {formatTime(item.created_at)}
                      </Text>
                    </View>

                    {/* Unread / Poll Badges */}
                    <View style={[styles.badgeGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      {item.has_poll ? (
                        <View
                          style={[
                            styles.pollBadge,
                            {
                              backgroundColor: item.user_vote ? (item.user_vote === 'AGREE' ? '#dcfce7' : '#fee2e2') : (isDarkMode ? 'rgba(56, 189, 248, 0.16)' : '#e0f2fe'),
                              borderColor: item.user_vote ? (item.user_vote === 'AGREE' ? '#bbf7d0' : '#fecaca') : (isDarkMode ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'),
                            },
                          ]}
                        >
                          <Ionicons
                            name="stats-chart"
                            size={12}
                            color={item.user_vote ? (item.user_vote === 'AGREE' ? '#16a34a' : '#ef4444') : '#0284c7'}
                          />
                          <Text
                            style={[
                              styles.pollBadgeText,
                              {
                                color: item.user_vote ? (item.user_vote === 'AGREE' ? '#15803d' : '#b91c1c') : '#0369a1',
                              },
                            ]}
                          >
                            {item.user_vote
                              ? (item.user_vote === 'AGREE' ? agreeText : disagreeText)
                              : pollText}
                          </Text>
                        </View>
                      ) : null}

                      {hasUnread ? (
                        <View style={[styles.newBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                          <Text style={[styles.newBadgeText, { color: colors.primary }]}>
                            {newBadgeText}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Card Main Body */}
                  <View style={[styles.cardBodyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {/* Thumbnail if attached */}
                    {item.image_url && formatImageUrl(item.image_url) ? (
                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => onPreviewImage && onPreviewImage(formatImageUrl(item.image_url)!)}
                        style={[styles.thumbnailWrap, { borderColor: colors.border }]}
                      >
                        <Image source={{ uri: formatImageUrl(item.image_url)! }} style={styles.thumbnail} resizeMode="cover" />
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

                  {/* Card Footer: Action Indicator */}
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
                      {item.has_poll && !item.user_vote
                        ? tapVoteText
                        : viewDetailsText}
                    </Text>
                    <Ionicons
                      name={isRTL ? 'chevron-back' : 'chevron-forward'}
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  appHeader: {
    minHeight: 72,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subPageHeaderRow: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  subPageTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  subPageHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  titleUnderlineBar: {
    width: 34,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyCard: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  premiumNotifCard: {
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    gap: 12,
  },
  cardTopRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateGroup: {
    alignItems: 'center',
    gap: 6,
  },
  dateIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '600',
  },
  badgeGroup: {
    alignItems: 'center',
    gap: 6,
  },
  pollBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  pollBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardBodyRow: {
    alignItems: 'center',
    gap: 12,
  },
  thumbnailWrap: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  cardTextContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    letterSpacing: -0.2,
  },
  cardSnippet: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardFooterRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tapDetailsText: {
    fontSize: 12,
    fontWeight: '700',
  },
});

