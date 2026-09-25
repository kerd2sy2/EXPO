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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BroadcastNotificationItem } from '../../services/notificationService';
import { ThemeColors } from '../../types/delegate';

const { width } = Dimensions.get('window');

interface BroadcastModalProps {
  visible: boolean;
  broadcast: BroadcastNotificationItem | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onClose: () => void;
  onVote: (broadcastId: string, response: 'AGREE' | 'DISAGREE') => Promise<void>;
  onPreviewImage?: (url: string) => void;
}

export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  visible,
  broadcast,
  colors,
  isDarkMode,
  isRTL,
  onClose,
  onVote,
  onPreviewImage,
}) => {
  const [voting, setVoting] = useState<'AGREE' | 'DISAGREE' | null>(null);

  if (!broadcast) return null;

  const handleVote = async (response: 'AGREE' | 'DISAGREE') => {
    try {
      setVoting(response);
      await onVote(broadcast.id, response);
    } finally {
      setVoting(null);
    }
  };

  const bgModal = isDarkMode ? '#1e293b' : '#ffffff';
  const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
  const textMuted = isDarkMode ? '#94a3b8' : '#64748b';
  const borderCol = isDarkMode ? '#334155' : '#e2e8f0';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: bgModal, borderColor: borderCol }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: borderCol }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconWrap, { backgroundColor: isDarkMode ? '#0f766e33' : '#ccfbf1' }]}>
                <Ionicons name="megaphone" size={20} color="#0d9488" />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: textColor }]}>تعميم وإشعار هام</Text>
                <Text style={[styles.headerSub, { color: textMuted }]}>
                  {broadcast.target === 'ALL' ? '🌍 لجميع المناديب' : '🏢 خاص بفرعك'}
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={22} color={textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
            {/* Attached Image (Banner) */}
            {broadcast.image_url ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onPreviewImage && onPreviewImage(broadcast.image_url!)}
                style={styles.imageContainer}
              >
                <Image
                  source={{ uri: broadcast.image_url }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
                <View style={styles.zoomBadge}>
                  <Ionicons name="expand-outline" size={14} color="#ffffff" />
                  <Text style={styles.zoomText}>اضغط للتكبير</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Broadcast Title */}
            <Text style={[styles.title, { color: textColor }]}>{broadcast.title}</Text>

            {/* Broadcast Body */}
            <Text style={[styles.body, { color: isDarkMode ? '#cbd5e1' : '#334155' }]}>
              {broadcast.body}
            </Text>

            {/* Survey / Poll Section (موافق / معترض) */}
            {broadcast.has_poll ? (
              <View style={[styles.pollBox, { backgroundColor: isDarkMode ? '#064e3b22' : '#f0fdf4', borderColor: '#10b98144' }]}>
                <View style={styles.pollHeader}>
                  <Ionicons name="stats-chart" size={18} color="#10b981" />
                  <Text style={[styles.pollQuestionTitle, { color: isDarkMode ? '#a7f3d0' : '#065f46' }]}>
                    استطلاع رأي المندوب:
                  </Text>
                </View>

                <Text style={[styles.pollQuestion, { color: textColor }]}>
                  {broadcast.poll_question || broadcast.title}
                </Text>

                {broadcast.user_vote ? (
                  <View style={styles.votedBadge}>
                    <Ionicons
                      name={broadcast.user_vote === 'AGREE' ? 'checkmark-circle' : 'close-circle'}
                      size={20}
                      color={broadcast.user_vote === 'AGREE' ? '#10b981' : '#ef4444'}
                    />
                    <Text
                      style={[
                        styles.votedText,
                        { color: broadcast.user_vote === 'AGREE' ? '#10b981' : '#ef4444' },
                      ]}
                    >
                      صوّتت سابقاً بـ: {broadcast.user_vote === 'AGREE' ? 'موافق 🟢' : 'معترض 🔴'}
                    </Text>
                  </View>
                ) : null}

                {/* Vote Buttons: Agree / Disagree */}
                <View style={styles.voteButtonsRow}>
                  {/* Agree Button */}
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      styles.agreeButton,
                      broadcast.user_vote === 'AGREE' && styles.selectedAgreeButton,
                    ]}
                    onPress={() => handleVote('AGREE')}
                    disabled={voting !== null}
                    activeOpacity={0.8}
                  >
                    {voting === 'AGREE' ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                        <Text style={styles.voteButtonText}>موافق</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {/* Disagree Button */}
                  <TouchableOpacity
                    style={[
                      styles.voteButton,
                      styles.disagreeButton,
                      broadcast.user_vote === 'DISAGREE' && styles.selectedDisagreeButton,
                    ]}
                    onPress={() => handleVote('DISAGREE')}
                    disabled={voting !== null}
                    activeOpacity={0.8}
                  >
                    {voting === 'DISAGREE' ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="close-circle" size={20} color="#ffffff" />
                        <Text style={styles.voteButtonText}>معترض</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: borderCol }]}>
            <TouchableOpacity
              style={[styles.dismissBtn, { backgroundColor: colors.primary }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={styles.dismissBtnText}>تم الاطلاع / إغلاق</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
    textAlign: 'right',
  },
  closeBtn: {
    padding: 4,
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollInner: {
    padding: 18,
    gap: 12,
  },
  imageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#00000010',
    position: 'relative',
    marginBottom: 4,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  zoomText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'right',
  },
  pollBox: {
    marginTop: 6,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
  },
  pollHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  pollQuestionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  pollQuestion: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
    lineHeight: 22,
  },
  votedBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  votedText: {
    fontSize: 12,
    fontWeight: '700',
  },
  voteButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  voteButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  agreeButton: {
    backgroundColor: '#10b981',
  },
  selectedAgreeButton: {
    backgroundColor: '#059669',
    borderWidth: 2,
    borderColor: '#34d399',
  },
  disagreeButton: {
    backgroundColor: '#ef4444',
  },
  selectedDisagreeButton: {
    backgroundColor: '#dc2626',
    borderWidth: 2,
    borderColor: '#f87171',
  },
  voteButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  footer: {
    padding: 14,
    borderTopWidth: 1,
  },
  dismissBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
