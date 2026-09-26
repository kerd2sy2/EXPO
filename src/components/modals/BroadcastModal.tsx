import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BroadcastNotificationItem, getLocalizedBroadcast } from '../../services/notificationService';
import { ThemeColors, Language } from '../../types/delegate';
import { formatImageUrl } from '../../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BroadcastModalProps {
  visible: boolean;
  broadcast: BroadcastNotificationItem | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  lang?: Language;
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
  lang = 'ar',
  onClose,
  onVote,
  onPreviewImage,
}) => {
  const [activeLang, setActiveLang] = useState<Language>(lang);
  const [voting, setVoting] = useState<'AGREE' | 'DISAGREE' | null>(null);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setActiveLang(lang);
    }
  }, [visible, lang]);

  useEffect(() => {
    if (visible && broadcast) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          bounciness: 3,
          speed: 14,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, broadcast]);

  const handleCloseSheet = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleVote = async (response: 'AGREE' | 'DISAGREE') => {
    if (!broadcast) return;
    try {
      setVoting(response);
      await onVote(broadcast.id, response);
    } finally {
      setVoting(null);
    }
  };

  if (!broadcast && !visible) return null;

  const validImageUrl = broadcast?.image_url ? formatImageUrl(broadcast.image_url) : null;
  const { title: locTitle, body: locBody, poll_question: locPollQuestion } = broadcast
    ? getLocalizedBroadcast(broadcast, activeLang)
    : { title: '', body: '', poll_question: '' };

  const currentIsRTL = activeLang === 'ar';

  // Localized UI strings based on activeLang
  const sheetHeaderTitle = broadcast?.has_poll
    ? (activeLang === 'bn' ? 'মতামত ও জরিপ' : activeLang === 'en' ? 'Poll & Opinion Survey' : 'استبيان واستطلاع رأي')
    : (activeLang === 'bn' ? 'জরুরি নোظيف / বিজ্ঞপ্তি' : activeLang === 'en' ? 'Official Broadcast' : 'تعميم وإشعار هام');

  const targetSubTitle = broadcast?.target === 'ALL'
    ? (activeLang === 'bn' ? 'সকল কর্মীদের জন্য' : activeLang === 'en' ? 'All Delegates' : 'موجه لجميع المناديب')
    : (activeLang === 'bn' ? `শাখা: (${broadcast?.branch_name || ''})` : activeLang === 'en' ? `Branch: (${broadcast?.branch_name || ''})` : `خاص بفرعك (${broadcast?.branch_name || ''})`);

  const zoomText = activeLang === 'bn' ? 'বড় করে দেখুন' : activeLang === 'en' ? 'Tap to zoom' : 'اضغط للتكبير';
  const pollHeader = activeLang === 'bn' ? 'জরিপের প্রশ্ন:' : activeLang === 'en' ? 'Poll Question:' : 'سؤال الاستبيان:';
  const agreeBtnText = activeLang === 'bn' ? 'সম্মত' : activeLang === 'en' ? 'Agree' : 'موافق';
  const disagreeBtnText = activeLang === 'bn' ? 'অসম্মত' : activeLang === 'en' ? 'Disagree' : 'معترض';
  const votedAgreeText = activeLang === 'bn' ? 'আপনার ভোট: সম্মত' : activeLang === 'en' ? 'You voted: Agreed' : 'تم تسجيل صوتك: موافق';
  const votedDisagreeText = activeLang === 'bn' ? 'আপনার ভোট: অসম্মত' : activeLang === 'en' ? 'You voted: Disagreed' : 'تم تسجيل صوتك: معترض';
  const closeBtnText = activeLang === 'bn' ? 'ঠিক আছে / বন্ধ করুন' : activeLang === 'en' ? 'Acknowledge & Close' : 'تم الاطلاع / إغلاق';

  // Check which languages have custom content in this broadcast
  const hasEn = Boolean(broadcast?.title_en || broadcast?.body_en);
  const hasBn = Boolean(broadcast?.title_bn || broadcast?.body_bn);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleCloseSheet}
      statusBarTranslucent
    >
      <View style={styles.modalOverlay}>
        {/* Animated Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleCloseSheet}
          />
        </Animated.View>

        {/* Bottom Sheet Card */}
        <Animated.View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Top Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: isDarkMode ? '#475569' : '#cbd5e1' }]} />
          </View>

          {/* Header Row */}
          <View
            style={[
              styles.headerRow,
              {
                flexDirection: currentIsRTL ? 'row-reverse' : 'row',
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={[styles.headerTitleGroup, { flexDirection: currentIsRTL ? 'row-reverse' : 'row' }]}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: broadcast?.has_poll ? 'rgba(56, 189, 248, 0.16)' : colors.primaryLight,
                  },
                ]}
              >
                <Ionicons
                  name={broadcast?.has_poll ? 'stats-chart' : 'megaphone'}
                  size={20}
                  color={broadcast?.has_poll ? '#0284c7' : colors.primary}
                />
              </View>
              <View style={[styles.headerTextCol, { alignItems: currentIsRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                  {sheetHeaderTitle}
                </Text>
                <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>
                  {targetSubTitle}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCloseSheet}
              style={[styles.closeBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* 3-Language Selector Bar */}
          <View style={[styles.langBarContainer, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setActiveLang('ar')}
              style={[
                styles.langTabBtn,
                activeLang === 'ar' && [styles.langTabBtnActive, { backgroundColor: colors.primary }]
              ]}
            >
              <Text style={[styles.langTabBtnText, activeLang === 'ar' ? styles.langTabBtnTextActive : { color: colors.textSecondary }]}>
                🇸🇦 العربية
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveLang('en')}
              style={[
                styles.langTabBtn,
                activeLang === 'en' && [styles.langTabBtnActive, { backgroundColor: colors.primary }]
              ]}
            >
              <Text style={[styles.langTabBtnText, activeLang === 'en' ? styles.langTabBtnTextActive : { color: colors.textSecondary }]}>
                🇺🇸 English {hasEn ? '✓' : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveLang('bn')}
              style={[
                styles.langTabBtn,
                activeLang === 'bn' && [styles.langTabBtnActive, { backgroundColor: colors.primary }]
              ]}
            >
              <Text style={[styles.langTabBtnText, activeLang === 'bn' ? styles.langTabBtnTextActive : { color: colors.textSecondary }]}>
                🇧🇩 বাংলা {hasBn ? '✓' : ''}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scrollable Body Content */}
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Banner Image with preview zoom */}
            {validImageUrl ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => onPreviewImage && onPreviewImage(validImageUrl)}
                style={[styles.imageWrap, { borderColor: colors.border }]}
              >
                <Image
                  source={{ uri: validImageUrl }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
                <View style={styles.zoomBadge}>
                  <Ionicons name="expand-outline" size={13} color="#ffffff" />
                  <Text style={styles.zoomBadgeText}>{zoomText}</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* Broadcast Title */}
            <Text
              style={[
                styles.broadcastTitle,
                {
                  color: colors.textPrimary,
                  textAlign: currentIsRTL ? 'right' : 'left',
                },
              ]}
            >
              {locTitle}
            </Text>

            {/* Broadcast Description / Body */}
            <Text
              style={[
                styles.broadcastBody,
                {
                  color: isDarkMode ? '#cbd5e1' : '#334155',
                  textAlign: currentIsRTL ? 'right' : 'left',
                },
              ]}
            >
              {locBody}
            </Text>

            {/* Poll / Survey Voting Card */}
            {broadcast?.has_poll ? (
              <View
                style={[
                  styles.pollCard,
                  {
                    backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.08)' : '#f0f9ff',
                    borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.25)' : '#bae6fd',
                  },
                ]}
              >
                <View style={[styles.pollHeaderRow, { flexDirection: currentIsRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="help-circle-outline" size={20} color="#0284c7" />
                  <Text style={[styles.pollCardTitle, { color: isDarkMode ? '#7dd3fc' : '#0369a1' }]}>
                    {pollHeader}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.pollQuestionText,
                    {
                      color: colors.textPrimary,
                      textAlign: currentIsRTL ? 'right' : 'left',
                    },
                  ]}
                >
                  {locPollQuestion || locTitle}
                </Text>

                {broadcast.user_vote ? (
                  <View
                    style={[
                      styles.votedStatusBadge,
                      {
                        backgroundColor: broadcast.user_vote === 'AGREE' ? '#dcfce7' : '#fee2e2',
                        borderColor: broadcast.user_vote === 'AGREE' ? '#bbf7d0' : '#fecaca',
                      },
                    ]}
                  >
                    <Ionicons
                      name={broadcast.user_vote === 'AGREE' ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={broadcast.user_vote === 'AGREE' ? '#16a34a' : '#ef4444'}
                    />
                    <Text
                      style={[
                        styles.votedStatusText,
                        {
                          color: broadcast.user_vote === 'AGREE' ? '#15803d' : '#b91c1c',
                        },
                      ]}
                    >
                      {broadcast.user_vote === 'AGREE'
                        ? votedAgreeText
                        : votedDisagreeText}
                    </Text>
                  </View>
                ) : null}

                {/* Vote Action Buttons */}
                <View style={[styles.voteButtonsRow, { flexDirection: currentIsRTL ? 'row-reverse' : 'row' }]}>
                  {/* Agree Button */}
                  <TouchableOpacity
                    style={[
                      styles.voteBtn,
                      styles.agreeBtn,
                      broadcast.user_vote === 'AGREE' && styles.selectedAgreeBtn,
                    ]}
                    onPress={() => handleVote('AGREE')}
                    disabled={voting !== null}
                    activeOpacity={0.8}
                  >
                    {voting === 'AGREE' ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <View style={[styles.btnInnerRow, { flexDirection: currentIsRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                        <Text style={styles.voteBtnText}>{agreeBtnText}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Disagree Button */}
                  <TouchableOpacity
                    style={[
                      styles.voteBtn,
                      styles.disagreeBtn,
                      broadcast.user_vote === 'DISAGREE' && styles.selectedDisagreeBtn,
                    ]}
                    onPress={() => handleVote('DISAGREE')}
                    disabled={voting !== null}
                    activeOpacity={0.8}
                  >
                    {voting === 'DISAGREE' ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <View style={[styles.btnInnerRow, { flexDirection: currentIsRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="close-circle" size={18} color="#ffffff" />
                        <Text style={styles.voteBtnText}>{disagreeBtnText}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Footer Action Button */}
          <View style={[styles.footerWrap, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
              onPress={handleCloseSheet}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmBtnText}>
                {closeBtnText}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  bottomSheet: {
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.88,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitleGroup: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sheetSub: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  langBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  langTabBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langTabBtnActive: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  langTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  langTabBtnTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  scrollBody: {
    maxHeight: SCREEN_HEIGHT * 0.65,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
    paddingBottom: 24,
  },
  imageWrap: {
    width: '100%',
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
    backgroundColor: '#00000010',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  zoomBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  broadcastTitle: {
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 24,
  },
  broadcastBody: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  pollCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginTop: 6,
  },
  pollHeaderRow: {
    alignItems: 'center',
    gap: 6,
  },
  pollCardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  pollQuestionText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  votedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  votedStatusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  voteButtonsRow: {
    gap: 12,
    marginTop: 4,
  },
  voteBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  agreeBtn: {
    backgroundColor: '#16a34a',
  },
  selectedAgreeBtn: {
    backgroundColor: '#15803d',
    borderWidth: 2,
    borderColor: '#bbf7d0',
  },
  disagreeBtn: {
    backgroundColor: '#ef4444',
  },
  selectedDisagreeBtn: {
    backgroundColor: '#b91c1c',
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  btnInnerRow: {
    alignItems: 'center',
    gap: 6,
  },
  voteBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  footerWrap: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  confirmBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
