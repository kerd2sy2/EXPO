import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { TabType } from '@shared/types';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents } from '@shared/utils/plateUtils';
import { BranchStats, DelegateWithStatus } from '../services/supervisor';

interface DashboardScreenProps {
  adminName: string;
  branchName: string;
  stats: BranchStats;
  workingDelegates: DelegateWithStatus[];
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onNavigateToTab: (tab: TabType) => void;
  onOpenOverrideModal: (delegate?: DelegateWithStatus) => void;
  onOpenReportModal?: () => void;
  onOpenOperationVideosModal?: () => void;
  onOpenWhatsAppModal?: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  adminName,
  branchName,
  stats,
  workingDelegates,
  colors,
  isDarkMode,
  isRTL,
  onNavigateToTab,
  onOpenOverrideModal,
  onOpenReportModal,
  onOpenOperationVideosModal,
  onOpenWhatsAppModal,
  onRefresh,
  refreshing,
}) => {
  const activeDrivers = (workingDelegates || []).filter((del) => {
    const role = (del.job_role || (del as any).role_name || '').toUpperCase();
    return role === 'DRIVER' || (!role.includes('SUPERVISOR') && !role.includes('ADMIN'));
  });

  const workingPct = stats.totalCount > 0 ? Math.round((activeDrivers.length / stats.totalCount) * 100) : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* 2. Hero KPI Statistics Grid (Only Active Now & Not Started Yet) */}
      <View style={[styles.kpiRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {/* Working in Field Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateToTab('field')}
          style={[styles.kpiHeroCard, { backgroundColor: colors.card, borderColor: '#10b981' }]}
        >
          <View style={[styles.kpiHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.pulseBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <View style={styles.pulseDot} />
              <Text style={[styles.pulseText, { color: '#10b981' }]}>نشط الآن</Text>
            </View>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="bicycle" size={20} color="#10b981" />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: '#10b981', textAlign: isRTL ? 'right' : 'left' }]}>
            {stats.workingCount}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            مندوب في الميدان
          </Text>
        </TouchableOpacity>

        {/* Not Started Yet Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onNavigateToTab('field')}
          style={[styles.kpiHeroCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <View style={[styles.kpiHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.pulseBadge, { backgroundColor: colors.cardHeader }]}>
              <Text style={[styles.pulseText, { color: colors.textSecondary }]}>لم يبدأوا</Text>
            </View>
            <View style={[styles.kpiIconWrap, { backgroundColor: colors.cardHeader }]}>
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            </View>
          </View>
          <Text style={[styles.kpiValue, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            {stats.notStartedCount}
          </Text>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            متبقي بالفرع
          </Text>
        </TouchableOpacity>
      </View>

      {/* 3. Field Coverage Progress Banner */}
      <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.progressHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>نسبة التغطية الميدانية</Text>
          <Text style={[styles.progressPct, { color: colors.primary }]}>{workingPct}%</Text>
        </View>
        <View style={[styles.progressBarBg, { backgroundColor: colors.cardHeader }]}>
          <View style={[styles.progressBarFill, { width: `${workingPct}%`, backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.progressCaption, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          {stats.workingCount} من أصل {stats.totalCount} مندوب خرجوا في ورديات العمل اليوم
        </Text>
      </View>

      {/* 4. Live In-Field Active Delegates List */}
      <View style={styles.liveSection}>
        <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.sectionHeaderTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 6 }]}>
            <View style={styles.liveGreenDot} />
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>المناديب في الميدان حالياً</Text>
          </View>
          <TouchableOpacity onPress={() => onNavigateToTab('field')}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>عرض الكل ({stats.workingCount})</Text>
          </TouchableOpacity>
        </View>

        {activeDrivers.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="bicycle-outline" size={44} color={colors.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا يوجد مناديب في الميدان الآن</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              يمكنك متابعة حالة المناديب وبدء وردية استثنائية من شاشة الميدان
            </Text>
          </View>
        ) : (
          activeDrivers.slice(0, 5).map((del) => (
            <TouchableOpacity
              key={del.id}
              activeOpacity={0.85}
              onPress={() => onOpenOverrideModal(del)}
              style={[
                styles.delegateCard,
                { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              {/* Delegate Avatar & Info on Start */}
              <View style={[styles.delegateInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, flex: 1 }]}>
                {del.personal_image ? (
                  <Image source={{ uri: del.personal_image }} style={styles.delAvatar} />
                ) : (
                  <View style={[styles.delAvatarPlaceholder, { backgroundColor: colors.cardHeader }]}>
                    <Ionicons name="person" size={18} color={colors.textSecondary} />
                  </View>
                )}
                <View style={[styles.delTextGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.delName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {del.name}
                  </Text>
                  <Text style={[styles.delPhone, { color: colors.textSecondary }]}>
                    {del.employee_number ? `كود: ${del.employee_number}` : (del.phone || del.national_id)}
                  </Text>
                </View>
              </View>

              {/* Motorcycle Plate & Status on End */}
              <View style={[styles.delPlateCol, { alignItems: isRTL ? 'flex-start' : 'flex-end', gap: 4 }]}>
                {del.motorcycle_number ? (() => {
                  const plate = parsePlateComponents(del.motorcycle_number);
                  return (
                    <SaudiPlateView
                      digits={plate.digits}
                      letters={plate.letters}
                      editable={false}
                      scale={0.52}
                      isDarkMode={isDarkMode}
                    />
                  );
                })() : (
                  <Text style={[styles.noBikeText, { color: colors.textSecondary }]}>بدون دباب</Text>
                )}
                <View style={[styles.activeTag, { backgroundColor: '#10b98115', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.pulseDot} />
                  <Text style={[styles.activeTagText, { color: '#10b981' }]}>في الميدان</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  welcomeCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0284c7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  welcomeTextGroup: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  branchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 8,
  },
  branchBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  welcomeSub: {
    fontSize: 13,
  },
  kpiRow: {
    gap: 12,
    marginBottom: 16,
  },
  kpiHeroCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 4,
  },
  pulseText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10b981',
  },
  kpiIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: '900',
    marginBottom: 2,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  progressPct: {
    fontSize: 16,
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressCaption: {
    fontSize: 12,
  },
  quickActionsContainer: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtnItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  liveSection: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  delegateCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  delegateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  delAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
  },
  delAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  delTextGroup: {
    flex: 1,
  },
  delName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  delPhone: {
    fontSize: 12,
  },
  delPlateCol: {
    alignItems: 'flex-end',
  },
  noBikeText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 240,
  },
});
