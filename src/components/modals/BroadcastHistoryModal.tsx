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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BroadcastNotificationItem } from '../../services/notificationService';
import { ThemeColors } from '../../types/delegate';

interface BroadcastHistoryModalProps {
  visible: boolean;
  broadcasts: BroadcastNotificationItem[];
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onClose: () => void;
  onSelectBroadcast: (item: BroadcastNotificationItem) => void;
  onPreviewImage?: (url: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

export const BroadcastHistoryModal: React.FC<BroadcastHistoryModalProps> = ({
  visible,
  broadcasts,
  colors,
  isDarkMode,
  isRTL,
  onClose,
  onSelectBroadcast,
  onPreviewImage,
  onRefresh,
  loading,
}) => {
  const bgModal = isDarkMode ? '#0f172a' : '#f8fafc';
  const cardBg = isDarkMode ? '#1e293b' : '#ffffff';
  const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
  const textMuted = isDarkMode ? '#94a3b8' : '#64748b';
  const borderCol = isDarkMode ? '#334155' : '#e2e8f0';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: bgModal }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: cardBg, borderBottomColor: borderCol }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={[styles.headerTitle, { color: textColor }]}>مركز الإشعارات والتعاميم</Text>
            <Text style={[styles.headerSub, { color: textMuted }]}>
              {broadcasts.length} إشعار وتعميم إداري
            </Text>
          </View>

          {onRefresh ? (
            <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={20} color={colors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: textMuted }]}>جاري تحميل الإشعارات...</Text>
          </View>
        ) : broadcasts.length === 0 ? (
          <View style={styles.centered}>
            <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? '#1e293b' : '#e2e8f0' }]}>
              <Ionicons name="notifications-off-outline" size={36} color={textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>لا توجد إشعارات حالياً</Text>
            <Text style={[styles.emptySub, { color: textMuted }]}>
              سيتم تنبيهك هنا بأي تعاميم أو استبيانات إدارية جديدة فور إرسالها
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {broadcasts.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.itemCard,
                  { backgroundColor: cardBg, borderColor: borderCol },
                  !item.is_read && { borderRightColor: colors.primary, borderRightWidth: 4 },
                ]}
                activeOpacity={0.75}
                onPress={() => onSelectBroadcast(item)}
              >
                {/* Image Thumbnail if attached */}
                {item.image_url ? (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => onPreviewImage && onPreviewImage(item.image_url!)}
                    style={styles.thumbnailWrap}
                  >
                    <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
                  </TouchableOpacity>
                ) : null}

                <View style={styles.itemInfo}>
                  <View style={styles.itemTopRow}>
                    <View style={styles.itemTitleRow}>
                      {!item.is_read ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
                      <Text style={[styles.itemTitle, { color: textColor }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>

                    <Text style={[styles.itemTime, { color: textMuted }]}>
                      {new Date(item.created_at).toLocaleDateString('ar-SA')}
                    </Text>
                  </View>

                  <Text style={[styles.itemSnippet, { color: textMuted }]} numberOfLines={2}>
                    {item.body}
                  </Text>

                  {/* Poll indicator */}
                  {item.has_poll ? (
                    <View style={styles.pollIndicatorRow}>
                      <View style={styles.pollTag}>
                        <Ionicons name="stats-chart" size={12} color="#10b981" />
                        <Text style={styles.pollTagText}>استبيان</Text>
                      </View>

                      {item.user_vote ? (
                        <Text
                          style={[
                            styles.userVoteText,
                            { color: item.user_vote === 'AGREE' ? '#10b981' : '#ef4444' },
                          ]}
                        >
                          صوتك: {item.user_vote === 'AGREE' ? 'موافق 🟢' : 'معترض 🔴'}
                        </Text>
                      ) : (
                        <Text style={styles.pendingVoteText}>بانتظار تصويتك ✍️</Text>
                      )}
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  titleWrap: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  refreshBtn: {
    padding: 6,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    marginTop: 6,
  },
  emptyIconWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  itemCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row-reverse',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  thumbnailWrap: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#00000010',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  itemTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  itemTime: {
    fontSize: 10,
  },
  itemSnippet: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'right',
  },
  pollIndicatorRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pollTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b98118',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pollTagText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  userVoteText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pendingVoteText: {
    fontSize: 10,
    color: '#f59e0b',
    fontWeight: '600',
  },
});
