import React from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../../types/delegate';
import { PlatformSummaryItem } from './targetDashboardHelpers';
import { targetDashboardPlatformStyles as styles } from './targetDashboardPlatformStyles';

interface TargetPlatformsViewProps {
  platformsList: PlatformSummaryItem[];
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onSelectPlatformStatus: (platformKey: string, status: 'ON_TRACK' | 'BEHIND_TARGET') => void;
}

export const TargetPlatformsView: React.FC<TargetPlatformsViewProps> = ({
  platformsList,
  colors,
  isDarkMode,
  isRTL,
  refreshing,
  onRefresh,
  onSelectPlatformStatus,
}) => {
  return (
    <ScrollView
      contentContainerStyle={styles.platformsCleanScrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.platformsCleanList}>
        {platformsList.map((plat, index) => {
          const isKeeta = plat.key === 'keeta';
          const isNinja = plat.key === 'ninja';
          const brandColor = isNinja ? colors.textPrimary : '#d97706';

          return (
            <React.Fragment key={plat.key}>
              <View style={styles.platformCleanSection}>
                <View style={[styles.platformCleanHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.platformHeaderLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View
                      style={[
                        styles.platformCleanLogoBox,
                        {
                          backgroundColor: plat.bgColor,
                          borderColor: plat.borderColor || colors.border,
                        },
                      ]}
                    >
                      {plat.image ? (
                        <Image
                          source={plat.image}
                          style={isKeeta ? styles.platformCleanKeetaImg : styles.platformCleanLogoImg}
                          resizeMode={isKeeta ? 'cover' : 'contain'}
                        />
                      ) : (
                        <Ionicons name="cube-outline" size={28} color={plat.color} />
                      )}
                    </View>
                    <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={[styles.platformCleanTitle, { color: colors.textPrimary }]}>
                        {plat.name}
                      </Text>
                      <Text style={[styles.platformCleanSubtitle, { color: colors.textSecondary }]}>
                        تطبيق توصيل طلبات
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.platformIdentsBadge,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Ionicons name="people-outline" size={14} color={colors.primary} />
                    <Text style={[styles.platformIdentsBadgeText, { color: colors.textPrimary }]}>
                      {plat.idents} معرفات
                    </Text>
                  </View>
                </View>

                <View style={styles.platformStatsBlock}>
                  <View style={[styles.platformMainStatsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.platformStatItem, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <View style={[styles.platformStatLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="bag-handle-outline" size={15} color={brandColor} />
                        <Text style={[styles.platformStatLabel, { color: colors.textSecondary }]}>
                          الطلبات المنفذة
                        </Text>
                      </View>
                      <Text style={[styles.platformStatValueLarge, { color: brandColor }]}>
                        {plat.orders.toLocaleString('en-US')}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.platformVerticalDivider,
                        { backgroundColor: isDarkMode ? '#27272e' : '#e2e8f0' },
                      ]}
                    />

                    <View style={[styles.platformStatItem, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <View style={[styles.platformStatLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="trending-up-outline" size={15} color="#3b82f6" />
                        <Text style={[styles.platformStatLabel, { color: colors.textSecondary }]}>
                          متوقع التارچت
                        </Text>
                      </View>
                      <Text style={[styles.platformStatValueLarge, { color: '#3b82f6' }]}>
                        {(plat.projected ?? 0).toLocaleString('en-US')}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.platformStatusRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => onSelectPlatformStatus(plat.key, 'ON_TRACK')}
                      style={[
                        styles.platformStatusCard,
                        {
                          backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.08)' : '#f0fdf4',
                          borderColor: isDarkMode ? 'rgba(34, 197, 94, 0.25)' : '#bbf7d0',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <View style={[styles.statusIconCircle, { backgroundColor: isDarkMode ? '#14532d' : '#dcfce7' }]}>
                        <Ionicons name="checkmark" size={16} color="#16a34a" />
                      </View>
                      <View style={[styles.statusTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.statusCountText, { color: '#16a34a' }]}>{plat.onTrack ?? 0}</Text>
                        <Text style={[styles.statusNameText, { color: isDarkMode ? '#86efac' : '#15803d' }]}>
                          يسير بالمعدل
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={() => onSelectPlatformStatus(plat.key, 'BEHIND_TARGET')}
                      style={[
                        styles.platformStatusCard,
                        {
                          backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
                          borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.25)' : '#fecaca',
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <View style={[styles.statusIconCircle, { backgroundColor: isDarkMode ? '#7f1d1d' : '#fee2e2' }]}>
                        <Ionicons name="alert" size={16} color="#dc2626" />
                      </View>
                      <View style={[styles.statusTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.statusCountText, { color: '#dc2626' }]}>{plat.behind ?? 0}</Text>
                        <Text style={[styles.statusNameText, { color: isDarkMode ? '#fca5a5' : '#b91c1c' }]}>
                          المتأخرين
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {index < platformsList.length - 1 && (
                <View
                  style={[
                    styles.platformSimpleDivider,
                    { backgroundColor: isDarkMode ? '#27272e' : '#e2e8f0' },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </ScrollView>
  );
};
