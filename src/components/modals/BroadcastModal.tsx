import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, Image, ScrollView, StyleSheet, Dimensions, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BroadcastNotificationItem, getLocalizedBroadcast } from '../../services/notificationService';
import { ThemeColors, Language } from '../../types/delegate';
import { formatImageUrl } from '../../services/api';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { getBroadcastUiStrings } from './broadcast/broadcastHelpers';
import { broadcastStyles as styles } from './broadcast/broadcastStyles';
import { BroadcastPollCard } from './broadcast/BroadcastPollCard';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface BroadcastModalProps {
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

/** Animated bottom-sheet displaying multi-language broadcasts, attachments, and opinion polls. */
export const BroadcastModal: React.FC<BroadcastModalProps> = ({
  visible,
  broadcast,
  colors,
  isDarkMode,
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
    if (visible) setActiveLang(lang);
  }, [visible, lang]);

  useEffect(() => {
    if (visible && broadcast) {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, { toValue: 0, bounciness: 3, speed: 14, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, broadcast]);

  const handleCloseSheet = () => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(sheetTranslateY, { toValue: SCREEN_HEIGHT, duration: 220, useNativeDriver: true }),
    ]).start(() => onClose());
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

  const ui = getBroadcastUiStrings(activeLang, broadcast);
  const rowDir = ui.currentIsRTL ? 'row-reverse' : 'row';
  const hasEn = Boolean(broadcast?.title_en || broadcast?.body_en);
  const hasBn = Boolean(broadcast?.title_bn || broadcast?.body_bn);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleCloseSheet} statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleCloseSheet} />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomSheet,
            { backgroundColor: colors.card, borderColor: colors.border, transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.dragHandle, { backgroundColor: isDarkMode ? '#475569' : '#cbd5e1' }]} />
          </View>

          <View style={[styles.headerRow, { flexDirection: rowDir, borderBottomColor: colors.border }]}>
            <View style={[styles.headerTitleGroup, { flexDirection: rowDir }]}>
              <View
                style={[styles.iconCircle, { backgroundColor: broadcast?.has_poll ? 'rgba(56, 189, 248, 0.16)' : colors.primaryLight }]}
              >
                <Ionicons
                  name={broadcast?.has_poll ? 'stats-chart' : 'megaphone'}
                  size={20}
                  color={broadcast?.has_poll ? '#0284c7' : colors.primary}
                />
              </View>
              <View style={[styles.headerTextCol, { alignItems: ui.currentIsRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{ui.sheetHeaderTitle}</Text>
                <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>{ui.targetSubTitle}</Text>
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

          <View
            style={[styles.langBarContainer, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderBottomColor: colors.border }]}
          >
            <TouchableOpacity
              onPress={() => setActiveLang('ar')}
              style={[styles.langTabBtn, activeLang === 'ar' && [styles.langTabBtnActive, { backgroundColor: colors.primary }]]}
            >
              <Text style={[styles.langTabBtnText, activeLang === 'ar' ? styles.langTabBtnTextActive : { color: colors.textSecondary }]}>
                🇸🇦 العربية
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveLang('en')}
              style={[styles.langTabBtn, activeLang === 'en' && [styles.langTabBtnActive, { backgroundColor: colors.primary }]]}
            >
              <Text style={[styles.langTabBtnText, activeLang === 'en' ? styles.langTabBtnTextActive : { color: colors.textSecondary }]}>
                🇺🇸 English {hasEn ? '✓' : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveLang('bn')}
              style={[styles.langTabBtn, activeLang === 'bn' && [styles.langTabBtnActive, { backgroundColor: colors.primary }]]}
            >
              <Text style={[styles.langTabBtnText, activeLang === 'bn' ? styles.langTabBtnTextActive : { color: colors.textSecondary }]}>
                🇧🇩 বাংলা {hasBn ? '✓' : ''}
              </Text>
            </TouchableOpacity>
          </View>

          <ModuleErrorBoundary moduleName="BroadcastModalContent" colors={colors}>
            <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {validImageUrl ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => onPreviewImage && onPreviewImage(validImageUrl)}
                  style={[styles.imageWrap, { borderColor: colors.border }]}
                >
                  <Image source={{ uri: validImageUrl }} style={styles.bannerImage} resizeMode="cover" />
                  <View style={styles.zoomBadge}>
                    <Ionicons name="expand-outline" size={13} color="#ffffff" />
                    <Text style={styles.zoomBadgeText}>{ui.zoomText}</Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              <Text style={[styles.broadcastTitle, { color: colors.textPrimary, textAlign: ui.currentIsRTL ? 'right' : 'left' }]}>
                {locTitle}
              </Text>

              <Text
                style={[styles.broadcastBody, { color: isDarkMode ? '#cbd5e1' : '#334155', textAlign: ui.currentIsRTL ? 'right' : 'left' }]}
              >
                {locBody}
              </Text>

              {broadcast?.has_poll ? (
                <BroadcastPollCard
                  broadcast={broadcast}
                  locTitle={locTitle}
                  locPollQuestion={locPollQuestion}
                  ui={ui}
                  voting={voting}
                  onVote={handleVote}
                  colors={colors}
                  isDarkMode={isDarkMode}
                />
              ) : null}
            </ScrollView>
          </ModuleErrorBoundary>

          <View style={[styles.footerWrap, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleCloseSheet} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>{ui.closeBtnText}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};
