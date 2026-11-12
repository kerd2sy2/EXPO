import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, TabType, WorkSession } from '../types/delegate';
import { BranchStats, DelegateWithStatus } from '../services/supervisor';
import { VehicleItem, isVehicleOilDue, operationsApi } from '../services/operations';
import { DashboardSkeleton } from '../components/skeletons/DashboardSkeleton';

interface DashboardScreenProps {
  adminName: string;
  branchName: string;
  stats: BranchStats;
  workingDelegates: DelegateWithStatus[];
  allDelegates?: DelegateWithStatus[];
  pendingSessions?: WorkSession[];
  vehicles?: VehicleItem[];
  approvedOrdersCount?: number;
  approvedKmCount?: number;
  approvedFuelCount?: number;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onNavigateToTab: (tab: TabType) => void;
  onOpenOverrideModal?: () => void;
  onOpenReportModal?: (preferredMode?: 'list' | 'create') => void;
  onOpenOperationVideosModal?: () => void;
  onOpenOhdaApp?: () => void;
  hasCustody?: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  loading?: boolean;
  contentContainerStyle?: any;
  onScroll?: (event: any) => void;
  scrollEventThrottle?: number;
  progressViewOffset?: number;
  scrollRef?: any;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = React.memo(({
  adminName,
  branchName,
  stats,
  workingDelegates,
  allDelegates = [],
  pendingSessions = [],
  vehicles = [],
  approvedOrdersCount,
  approvedKmCount,
  approvedFuelCount,
  colors,
  isDarkMode,
  isRTL,
  onNavigateToTab,
  onOpenReportModal,
  onOpenOperationVideosModal,
  onOpenOhdaApp,
  hasCustody = false,
  onRefresh,
  refreshing,
  loading = false,
  contentContainerStyle,
  onScroll,
  scrollEventThrottle = 16,
  progressViewOffset = 0,
  scrollRef,
}) => {
  // Format supervisor name to display first and second name only
  const getFirstTwoNames = (fullName?: string) => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length <= 2) return parts.join(' ');
    return `${parts[0]} ${parts[1]}`;
  };

  // Compute Deep Analytical KPIs
  const analyticsData = useMemo(() => {
    const driversOnly = allDelegates.filter((d) => {
      const role = (d.job_role || (d as any).role_name || 'DRIVER').toUpperCase();
      return !role.includes('SUPERVISOR') && !role.includes('ADMIN');
    });

    const totalDrivers = driversOnly.length || stats.totalCount || 0;
    const actualWorkingDelegatesCount = workingDelegates.filter((d) => {
      const role = (d.job_role || (d as any).role_name || 'DRIVER').toUpperCase();
      return !role.includes('SUPERVISOR') && !role.includes('ADMIN');
    }).length;
    const activeCount = Math.max(
      actualWorkingDelegatesCount,
      stats.workingCount ?? 0
    );
    const todayCount =
      stats.todayEmployeesCount !== undefined && stats.todayEmployeesCount > 0
        ? Math.max(stats.todayEmployeesCount, activeCount)
        : activeCount;
    const finishedCount =
      stats.finishedEmployeesCount !== undefined
        ? stats.finishedEmployeesCount
        : Math.max(0, todayCount - activeCount);
    const idleCount = Math.max(0, totalDrivers - activeCount);
    const attendanceRate = totalDrivers > 0 ? Math.round((todayCount / totalDrivers) * 100) : 0;

    // Fleet & Plates stats
    let assignedBikes = 0;
    let missingPlates = 0;
    let missingKeys = 0;
    const appCounts: Record<string, number> = {};
    const driverByPlate = new Map<string, DelegateWithStatus>();
    const driverByKey = new Map<string, DelegateWithStatus>();

    driversOnly.forEach((d) => {
      if (d.motorcycle_number && d.motorcycle_number.trim()) {
        assignedBikes++;
        driverByPlate.set(d.motorcycle_number.trim().toLowerCase(), d);
      } else {
        missingPlates++;
      }

      if (d.key_number && d.key_number.trim()) {
        driverByKey.set(d.key_number.trim().toLowerCase(), d);
      } else {
        missingKeys++;
      }

      const appName = (d.application_type || 'غير محدد').trim().toUpperCase();
      appCounts[appName] = (appCounts[appName] || 0) + 1;
    });

    // Completed pending sessions metrics
    const completedPending = pendingSessions.filter(
      (s) => s.status === 'COMPLETED' && Boolean(s.end_time)
    );
    let pendingOrdersSum = 0;
    let pendingKmSum = 0;
    let pendingFuelSum = 0;

    completedPending.forEach((s) => {
      pendingOrdersSum += Number(s.orders_count ?? 0);
      pendingFuelSum += Number(s.fuel_cost ?? 0);
      const dist =
        s.end_km !== undefined && s.start_km !== undefined && Number(s.end_km) >= Number(s.start_km) && Number(s.end_km) > 0
          ? Number(s.end_km) - Number(s.start_km)
          : Number((s as any).total_km ?? s.distance ?? 0);
      pendingKmSum += dist;
    });

    // Vehicles needing oil change
    const oilDueVehicles = vehicles.filter((v) => isVehicleOilDue(v));
    const oilDueCount = oilDueVehicles.length;

    const appDistribution = Object.entries(appCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalDrivers,
      activeCount,
      todayCount,
      finishedCount,
      idleCount,
      attendanceRate,
      assignedBikes,
      missingPlates,
      missingKeys,
      completedPendingCount: completedPending.length,
      pendingOrdersSum,
      pendingKmSum,
      pendingFuelSum,
      oilDueCount,
      oilDueVehicles,
      driverByPlate,
      driverByKey,
      appDistribution,
    };
  }, [allDelegates, workingDelegates, stats, pendingSessions, vehicles]);

  const shortcuts = [
    { title: 'مركز الموافقات', sub: `${analyticsData.completedPendingCount} بانتظارك`, icon: 'checkmark-done-circle-outline', color: '#f59e0b', onPress: () => onNavigateToTab('approvals') },
    { title: 'مراجعة الطلبات', sub: 'السجل التنازلي', icon: 'list-circle-outline', color: '#0284c7', onPress: () => onNavigateToTab('orders-review') },
    { title: 'تغيير الزيت', sub: 'مرتب برقم المفتاح', icon: 'construct-outline', color: '#8b5cf6', onPress: () => onNavigateToTab('fleet-oil') },
    { title: 'التقارير والسلف', sub: 'رفع تقرير مشرف', icon: 'document-text-outline', color: '#ec4899', onPress: () => onOpenReportModal?.('list') },
    { title: 'المخزن', sub: 'المخزون والعهد', icon: 'cube-outline', color: '#10b981', onPress: () => onNavigateToTab('operations') },
    { title: 'إدارة الموظفين', sub: 'مرتب بالمفاتيح', icon: 'people-outline', color: '#6366f1', onPress: () => onNavigateToTab('employees') },
  ];

  const rawOrdersCount =
    approvedOrdersCount !== undefined
      ? approvedOrdersCount
      : (stats.todayOrdersCount || 0);
  const rawKmCount =
    approvedKmCount !== undefined
      ? approvedKmCount
      : 0;
  const rawFuelCount =
    approvedFuelCount !== undefined
      ? approvedFuelCount
      : 0;

  const displayedOrdersCount = Number(rawOrdersCount || 0);
  const displayedKmCount =
    Number(rawKmCount || 0) % 1 === 0 ? String(Number(rawKmCount || 0)) : Number(rawKmCount || 0).toFixed(1);
  const displayedFuelCount = String(Math.round(Number(rawFuelCount || 0)));

  if (loading) {
    return (
      <ScrollView
        ref={scrollRef}
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
      >
        <DashboardSkeleton colors={colors} isDarkMode={isDarkMode} isRTL={isRTL} />
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={[styles.container, { backgroundColor: colors.bg }]}
        contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            progressViewOffset={progressViewOffset}
          />
        }
      >
        {/* 1. Executive Branch Status Hero Card (Long press opens field tracking) */}
        <TouchableOpacity
          activeOpacity={0.92}
          delayLongPress={450}
          onLongPress={() => onNavigateToTab('field')}
          style={[
            styles.heroCard,
            {
              backgroundColor: isDarkMode ? '#0f172a' : '#0369a1',
              borderColor: isDarkMode ? '#1e293b' : '#0284c7',
            },
          ]}
        >
          <View style={[styles.heroTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }]}>
            <Text style={styles.heroTitle}>مؤشرات الأداء والتشغيل</Text>

            {/* الأيقونة والرقم في المية فقط على نفس السطر بدون نصوص إضافية */}
            <View style={[styles.ratePill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="speedometer-outline" size={16} color="#38bdf8" />
              <Text style={styles.ratePillValue}>{analyticsData.attendanceRate}%</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(100, analyticsData.attendanceRate)}%` },
              ]}
            />
          </View>

          {/* Four Stats: إجمالي المناديب -> مناديب اليوم -> يعملون -> أنهوا الشفت */}
          <View style={[styles.heroBottomStats, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatVal, { color: '#ffffff' }]}>{analyticsData.totalDrivers}</Text>
              <Text style={styles.heroStatLbl}>إجمالي المناديب</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatVal, { color: '#38bdf8' }]}>{analyticsData.todayCount}</Text>
              <Text style={styles.heroStatLbl}>مناديب اليوم</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatVal, { color: '#4ade80' }]}>{analyticsData.activeCount}</Text>
              <Text style={styles.heroStatLbl}>يعملون الآن</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={[styles.heroStatVal, { color: '#fbbf24' }]}>{analyticsData.finishedCount}</Text>
              <Text style={styles.heroStatLbl}>أنهوا الشفت</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* 3. Analytical KPI Grid (4 Focused Operational Indicators) */}
        <Text style={[styles.sectionHeader, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
          مؤشرات اليوم للفرع والأسطول
        </Text>

        <View style={[styles.kpiGrid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
          {/* 1. طلبات اليوم */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#10b98118' }]}>
              <Ionicons name="bag-check" size={22} color="#10b981" />
            </View>
            <Text style={[styles.kpiNumber, { color: colors.textPrimary }]}>
              {displayedOrdersCount}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>طلبات اليوم</Text>
          </View>

          {/* 2. كيلومترات اليوم */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#0284c718' }]}>
              <Ionicons name="speedometer" size={22} color="#0284c7" />
            </View>
            <Text style={[styles.kpiNumber, { color: colors.textPrimary }]}>
              {displayedKmCount} كم
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>كيلومترات اليوم</Text>
          </View>

          {/* 3. بنزين اليوم (مع شعار الريال السعودي) */}
          <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#f59e0b18' }]}>
              <Ionicons name="flame" size={22} color="#f59e0b" />
            </View>
            <View style={[styles.riyalValueRow, { flexDirection: 'row', direction: 'ltr' }]}>
              <Image
                source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
                style={[styles.riyalSymbolImg, { tintColor: isDarkMode ? '#fbbf24' : '#d97706' }]}
                resizeMode="contain"
              />
              <Text style={[styles.kpiNumber, { color: colors.textPrimary }]}>
                {displayedFuelCount}
              </Text>
            </View>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>بنزين اليوم</Text>
          </View>

          {/* 4. الدبابات اللى محتاجة تغير زيت */}
          <TouchableOpacity
            activeOpacity={0.78}
            onPress={() => onNavigateToTab('oil-change')}
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.card,
                borderColor: analyticsData.oilDueCount > 0 ? '#ef444460' : colors.border,
              },
            ]}
          >
            <View style={[styles.kpiIconBox, { backgroundColor: '#ef444418' }]}>
              <Ionicons name="construct" size={22} color="#ef4444" />
            </View>
            <Text style={[styles.kpiNumber, { color: analyticsData.oilDueCount > 0 ? '#ef4444' : colors.textPrimary }]}>
              {analyticsData.oilDueCount}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              تغيير زيت
            </Text>
          </TouchableOpacity>
        </View>

        {/* 4. Delivery Platforms Distribution Breakdown */}
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

        {/* 5. Quick Operational Navigation Shortcuts */}
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

        {/* 6. Operations Video Banner */}
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

        {/* 7. Dedicated Custody (العهدة) Banner for Authorized Supervisors */}
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
      </ScrollView>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  heroTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroBranchBadge: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  ratePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    alignItems: 'center',
    gap: 6,
  },
  ratePillValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  heroSubtitle: {
    color: '#bae6fd',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  modernRateBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    alignItems: 'center',
    gap: 6,
  },
  modernRateLabel: {
    color: '#bae6fd',
    fontSize: 12,
    fontWeight: '700',
  },
  modernRateValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  attendanceCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 2,
    borderColor: '#38bdf8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendancePctText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  attendanceSubText: {
    color: '#bae6fd',
    fontSize: 9,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#4ade80',
  },
  heroBottomStats: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    paddingVertical: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  heroStatVal: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  heroStatLbl: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  urgentBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  urgentIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f59e0b25',
    justifyContent: 'center',
    alignItems: 'center',
  },
  urgentTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  urgentSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  kpiCard: {
    width: '48.3%',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
  },
  riyalValueRow: {
    alignItems: 'center',
    gap: 5,
  },
  riyalSymbolImg: {
    width: 15,
    height: 15,
  },
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  cardHeaderRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  distRow: {
    marginBottom: 10,
  },
  distLabelRow: {
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  distAppName: {
    fontSize: 12,
    fontWeight: '800',
  },
  distCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  distBarBg: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  shortcutCard: {
    width: '48.3%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 10,
  },
  shortcutIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  shortcutSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  videoBannerBtn: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 12,
  },
  ohdaBannerBtn: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1.2,
    padding: 14,
    alignItems: 'center',
    gap: 12,
  },
  ohdaIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ohdaTitleText: {
    fontSize: 16,
    fontWeight: '800',
  },
  ohdaSubText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  ohdaActionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignItems: 'center',
    gap: 4,
  },
  ohdaActionPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 12,
  },
  modalHeaderTitleRow: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  modalSubTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    maxHeight: 460,
  },
  emptyOilState: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
  },
  emptyOilIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyOilTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  emptyOilSub: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  oilVehicleCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  oilCardTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  oilPlateRow: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  oilBikeBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  oilPlateText: {
    fontSize: 15,
    fontWeight: '900',
  },
  oilKeyPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  oilKeyPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706',
  },
  oilDriverText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  oilWarningBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  oilWarningBadgeText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '800',
  },
  oilMetricsRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginBottom: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  oilMetricBox: {
    alignItems: 'center',
    flex: 1,
  },
  oilMetricLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  oilMetricValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  oilMetricDivider: {
    width: 1,
    height: 24,
  },
  oilDispenseActionBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  oilDispenseActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  modalFooter: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 4,
  },
  modalPrimaryBtn: {
    borderRadius: 14,
    paddingVertical: 13,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  modalPrimaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
