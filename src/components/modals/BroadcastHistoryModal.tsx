import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BroadcastNotificationItem } from '../../services/notificationService';
import { ThemeColors, Language } from '../../types/delegate';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { getBroadcastHistoryTexts } from './broadcast-history/broadcastHistoryHelpers';
import { broadcastHistoryStyles as styles } from './broadcast-history/broadcastHistoryStyles';
import { BroadcastHistoryCard } from './broadcast-history/BroadcastHistoryCard';

export interface BroadcastHistoryModalProps {
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

/**
 * Full-screen modal displaying administrative broadcasts and polls history.
 */
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

  const texts = getBroadcastHistoryTexts(lang);
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
                {texts.headerTitle}
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

        {/* Content Body isolated in ModuleErrorBoundary so header navigation remains functional */}
        <ModuleErrorBoundary moduleName="BroadcastHistoryList" colors={colors}>
          {loading && !refreshing ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                {texts.loadingText}
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
                  {texts.emptyTitle}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  {texts.emptySub}
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
              {broadcasts.map((item) => (
                <ModuleErrorBoundary key={item.id} moduleName="BroadcastHistoryCard" colors={colors}>
                  <BroadcastHistoryCard
                    item={item}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    isRTL={isRTL}
                    lang={lang}
                    texts={texts}
                    onSelect={onSelectBroadcast}
                    onPreviewImage={onPreviewImage}
                  />
                </ModuleErrorBoundary>
              ))}
            </ScrollView>
          )}
        </ModuleErrorBoundary>
      </SafeAreaView>
    </Modal>
  );
};
