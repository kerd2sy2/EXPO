import React from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ThemeColors } from '../../../types/delegate';
import { TargetDashboardSummary } from '../../../types/target';
import { DateFilterValue } from '../DateFilterModal';
import { DashboardDataTab } from './targetDashboardHelpers';
import { targetDashboardHeaderStyles as styles } from './targetDashboardHeaderStyles';

interface TargetHomeViewProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  loadError: string | null;
  retrying: boolean;
  onRetry: () => void;
  summary: TargetDashboardSummary | null;
  identifiersCount: number;
  driversCount: number;
  totalDriversPeriodOrders: number;
  dateFilterType: DateFilterValue['type'];
  unresolvedAlertsCount: number;
  platformsCount: number;
  onCardPress: (tab: DashboardDataTab, status?: string) => void;
  onOpenPlatforms: () => void;
  onOpenLogs: () => void;
  onOpenImport?: () => void;
}

export const TargetHomeView: React.FC<TargetHomeViewProps> = ({
  colors,
  isDarkMode,
  isRTL,
  refreshing,
  onRefresh,
  loadError,
  retrying,
  onRetry,
  summary,
  identifiersCount,
  driversCount,
  totalDriversPeriodOrders,
  dateFilterType,
  unresolvedAlertsCount,
  platformsCount,
  onCardPress,
  onOpenPlatforms,
  onOpenLogs,
  onOpenImport,
}) => {
  return (
    <ScrollView
      contentContainerStyle={styles.mainScrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      <View style={styles.tabContainer}>
        {loadError && (
          <TouchableOpacity
            style={[
              styles.errorRetryBanner,
              {
                backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                borderColor: isDarkMode ? 'rgba(239, 68, 68, 0.4)' : '#fca5a5',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
            onPress={onRetry}
            disabled={retrying}
            activeOpacity={0.8}
          >
            {retrying ? (
              <ActivityIndicator size="small" color="#ef4444" style={{ marginHorizontal: 4 }} />
            ) : (
              <Ionicons name="refresh-circle" size={22} color="#ef4444" />
            )}
            <Text style={[styles.errorRetryBannerText, { color: isDarkMode ? '#fca5a5' : '#b91c1c', textAlign: isRTL ? 'right' : 'left' }]}>
              {loadError}
            </Text>
            <View style={[styles.errorRetryBtnWrap, retrying && { opacity: 0.7 }]}>
              <Text style={styles.errorRetryBtnText}>{retrying ? 'جارٍ المحاولة...' : 'إعادة المحاولة'}</Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            مؤشرات أداء المعرفين
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            اضغط على أي مؤشر لعرض تفاصيل البيانات ومطابقة الأداء
          </Text>
        </View>

        <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onCardPress('identifiers', '')}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#dbeafe' }]}>
              <Ionicons name="people" size={22} color="#2563eb" />
            </View>
            <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
              {summary?.total_identifiers ?? identifiersCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>إجمالي المعرفين</Text>
            <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.statTapHintText, { color: colors.primary }]}>عرض الكل</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color={colors.primary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onCardPress('identifiers', 'ON_TRACK')}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#dcfce7' }]}>
              <Ionicons name="trending-up" size={22} color="#16a34a" />
            </View>
            <Text style={[styles.statNumber, { color: '#16a34a' }]}>
              {(summary?.on_track ?? 0) + (summary?.target_achieved ?? 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>بالمعدل والمحققين</Text>
            <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.statTapHintText, { color: '#16a34a' }]}>
                {(summary?.target_achieved ?? 0) > 0 ? `${summary?.target_achieved} حقق التارچت 🏆` : 'عرض السائرين'}
              </Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color="#16a34a" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onCardPress('identifiers', 'AT_RISK')}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7' }]}>
              <Ionicons name="time" size={22} color="#d97706" />
            </View>
            <Text style={[styles.statNumber, { color: '#d97706' }]}>{summary?.at_risk ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>على وشك</Text>
            <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.statTapHintText, { color: '#d97706' }]}>عرض على وشك</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color="#d97706" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onCardPress('identifiers', 'BEHIND_TARGET')}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2' }]}>
              <Ionicons name="warning" size={22} color="#dc2626" />
            </View>
            <Text style={[styles.statNumber, { color: '#dc2626' }]}>{summary?.behind_target ?? 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>متأخرين</Text>
            <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.statTapHintText, { color: '#dc2626' }]}>عرض المتأخرين</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color="#dc2626" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onCardPress('drivers')}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="bicycle" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{driversCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>المناديب المسجلين</Text>
            <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.statTapHintText, { color: colors.primary }]}>
                {totalDriversPeriodOrders.toLocaleString('en-US')} طلب{' '}
                {dateFilterType === 'month' ? 'بالشهر' : dateFilterType === 'day' ? 'باليوم' : 'بالفترة'}
              </Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color={colors.primary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => onCardPress('alerts')}
            activeOpacity={0.75}
          >
            <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.16)' : '#f3e8ff' }]}>
              <Ionicons name="notifications" size={22} color="#9333ea" />
            </View>
            <Text style={[styles.statNumber, { color: unresolvedAlertsCount > 0 ? '#dc2626' : colors.textPrimary }]}>
              {unresolvedAlertsCount}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>تنبيهات العجز</Text>
            <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.statTapHintText, { color: '#9333ea' }]}>عرض التنبيهات</Text>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color="#9333ea" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.operationsCardsContainer}>
          <TouchableOpacity
            style={[
              styles.quickCardRow,
              { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
            onPress={onOpenPlatforms}
            activeOpacity={0.75}
          >
            <View style={[styles.quickCardIconCircle, { backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.16)' : '#ffedd5' }]}>
              <Ionicons name="grid-outline" size={22} color={colors.primary} />
            </View>
            <View style={[styles.quickCardTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.historyTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.quickCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  تطبيقات التوصيل
                </Text>
                <View style={[styles.historyBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.historyBadgeText, { color: colors.primary }]}>{platformsCount} تطبيقات</Text>
                </View>
              </View>
              <Text style={[styles.quickCardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                استعراض تفاصيل طلبات وأداء نينجا وكيتا
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.historyHeroCard,
              { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
            onPress={onOpenLogs}
            activeOpacity={0.75}
          >
            <View style={[styles.historyIconCircle, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#dbeafe' }]}>
              <Ionicons name="time-outline" size={26} color="#2563eb" />
            </View>
            <View style={[styles.historyTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <View style={[styles.historyTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text style={[styles.historyCardTitle, { color: colors.textPrimary }]}>سجل العمليات والأداء</Text>
                <View style={[styles.historyBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.historyBadgeText, { color: colors.primary }]}>السجل التاريخي</Text>
                </View>
              </View>
              <Text style={[styles.historyCardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                استعراض سجل استيراد الطلبات، تنبيهات العجز، والتسويات
              </Text>
            </View>
            <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={22} color={colors.textSecondary} />
          </TouchableOpacity>

          {onOpenImport && (
            <TouchableOpacity
              style={[
                styles.quickCardRow,
                { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={onOpenImport}
              activeOpacity={0.7}
            >
              <View style={[styles.quickCardIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Feather name="upload-cloud" size={22} color={colors.primary} />
              </View>
              <View style={[styles.quickCardTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.quickCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  استيراد ملف إكسل اليومي
                </Text>
                <Text style={[styles.quickCardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  رفع كشف الطلبات ومطابقة التارچت آلياً
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};
