import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { dashboardStyles as styles } from './dashboardStyles';
import { DashboardAnalytics } from './dashboardHelpers';

export interface DashboardShortcutItem {
  title: string;
  sub: string;
  icon: string;
  color: string;
  onPress: () => void;
}

interface DashboardDistributionAndShortcutsProps {
  analyticsData: DashboardAnalytics;
  shortcuts: DashboardShortcutItem[];
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onOpenOperationVideosModal?: () => void;
  onOpenOhdaApp?: () => void;
  hasCustody: boolean;
}

export const DashboardDistributionAndShortcuts: React.FC<DashboardDistributionAndShortcutsProps> = ({
  analyticsData,
  shortcuts,
  colors,
  isDarkMode,
  isRTL,
  onOpenOperationVideosModal,
  onOpenOhdaApp,
  hasCustody,
}) => (
  <>
    {analyticsData.appDistribution.length > 0 && (
      <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="pie-chart-outline" size={18} color={colors.primary} />
          <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary }]}>
            توزيع المناديب حسب منصات التوصيل
          </Text>
        </View>

        {analyticsData.appDistribution.map(([appName, count], idx) => {
          const pct = Math.round((count / (analyticsData.totalDrivers || 1)) * 100);
          return (
            <View key={idx} style={styles.distRow}>
              <View style={[styles.distLabelRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.distAppName, { color: colors.textPrimary }]}>
                  {appName}
                </Text>
                <Text style={[styles.distCountText, { color: colors.textSecondary }]}>
                  {count} مندوب ({pct}%)
                </Text>
              </View>
              <View style={[styles.distBarBg, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}>
                <View
                  style={[
                    styles.distBarFill,
                    { width: `${Math.max(6, pct)}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    )}

    <Text style={[styles.sectionHeader, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
      الوصول السريع لأقسام الإشراف
    </Text>

    <View style={[styles.shortcutsGrid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
      {shortcuts.map((item, i) => (
        <TouchableOpacity
          key={i}
          style={[
            styles.shortcutCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
          onPress={item.onPress}
          activeOpacity={0.8}
        >
          <View style={[styles.shortcutIcon, { backgroundColor: item.color + '18' }]}>
            <Ionicons name={item.icon as any} size={22} color={item.color} />
          </View>
          <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
            <Text style={[styles.shortcutTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.shortcutSub, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.sub}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>

    {onOpenOperationVideosModal && (
      <TouchableOpacity
        style={[
          styles.videoBannerBtn,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
        onPress={onOpenOperationVideosModal}
        activeOpacity={0.8}
      >
        <View style={[styles.shortcutIcon, { backgroundColor: '#0284c718' }]}>
          <Ionicons name="videocam-outline" size={22} color="#0284c7" />
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.shortcutTitle, { color: colors.textPrimary }]}>
            توثيق فيديوهات العمليات الميدانية
          </Text>
          <Text style={[styles.shortcutSub, { color: colors.textSecondary }]}>
            رفع واستعراض فيديوهات فحص الدبابات والعمليات
          </Text>
        </View>
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    )}

    {hasCustody && onOpenOhdaApp && (
      <TouchableOpacity
        style={[
          styles.ohdaBannerBtn,
          {
            backgroundColor: isDarkMode ? 'rgba(5, 150, 105, 0.12)' : '#f0fdf4',
            borderColor: isDarkMode ? '#05966944' : '#bbf7d0',
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
        onPress={onOpenOhdaApp}
        activeOpacity={0.82}
      >
        <View style={[styles.ohdaIconBox, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.18)' : '#dcfce7' }]}>
          <Ionicons name="wallet" size={24} color="#10b981" />
        </View>
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
          <Text style={[styles.ohdaTitleText, { color: colors.textPrimary }]}>
            العهدة
          </Text>
          <Text style={[styles.ohdaSubText, { color: colors.textSecondary }]}>
            إدارة المصروفات ورصيد الفرع اليومي
          </Text>
        </View>
        <View style={[styles.ohdaActionPill, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.ohdaActionPillText, { color: isDarkMode ? '#4ade80' : '#15803d' }]}>
            فتح التطبيق
          </Text>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={isDarkMode ? '#4ade80' : '#15803d'} />
        </View>
      </TouchableOpacity>
    )}
  </>
);
