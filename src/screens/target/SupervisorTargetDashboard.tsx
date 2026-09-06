import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import {
  TargetDashboardSummary,
  IdentifierPerformance,
  DriverPerformance,
  TargetAlertItem,
} from '../../types/target';
import { ThemeColors } from '../../types/delegate';
import { targetApi } from '../../services/targetApi';
import { IdentifierDetailsModal } from './IdentifierDetailsModal';

interface SupervisorTargetDashboardProps {
  user: any;
  onLogout: () => void;
  isDarkMode?: boolean;
  colors?: ThemeColors;
  isRTL?: boolean;
}

export const SupervisorTargetDashboard: React.FC<SupervisorTargetDashboardProps> = ({
  user,
  onLogout,
  isDarkMode = false,
  colors: propColors,
  isRTL = true,
}) => {
  const [activeTab, setActiveTab] = useState<'identifiers' | 'drivers' | 'alerts'>('identifiers');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary] = useState<TargetDashboardSummary | null>(null);
  const [identifiers, setIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
  const [alerts, setAlerts] = useState<TargetAlertItem[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIdentifierId, setSelectedIdentifierId] = useState<string | null>(null);

  const colors: ThemeColors = propColors || (isDarkMode
    ? {
        bg: '#000000',
        card: '#16161a',
        cardHeader: '#202026',
        textPrimary: '#ffffff',
        textSecondary: '#9ca3af',
        border: '#27272e',
        primary: '#f97316',
        primaryLight: 'rgba(249, 115, 22, 0.16)',
        primaryText: '#ffffff',
        accent: '#3b82f6',
        accentLight: 'rgba(59, 130, 246, 0.16)',
        inputBg: '#1a1a1f',
        inputBorder: '#27272e',
        warningBg: 'rgba(245, 158, 11, 0.15)',
        warningBorder: '#f59e0b',
        warningText: '#f59e0b',
        errorBg: 'rgba(239, 68, 68, 0.15)',
        errorText: '#ef4444',
      }
    : {
        bg: '#f8fafc',
        card: '#ffffff',
        cardHeader: '#f1f5f9',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        primary: '#f97316',
        primaryLight: 'rgba(249, 115, 22, 0.12)',
        primaryText: '#ffffff',
        accent: '#2563eb',
        accentLight: 'rgba(37, 99, 235, 0.12)',
        inputBg: '#f1f5f9',
        inputBorder: '#cbd5e1',
        warningBg: '#fef3c7',
        warningBorder: '#f59e0b',
        warningText: '#b45309',
        errorBg: '#fee2e2',
        errorText: '#b91c1c',
      });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sumData, identsData, driversData, alertsData] = await Promise.all([
        targetApi.getDashboard(),
        targetApi.listIdentifiers({ search: searchQuery, status: statusFilter }),
        targetApi.listDrivers({ search: searchQuery }),
        targetApi.listAlerts({ unresolved_only: true }),
      ]);
      setSummary(sumData);
      setIdentifiers(identsData);
      setDrivers(driversData);
      setAlerts(alertsData);
    } catch (err: any) {
      console.log('Error loading supervisor dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TARGET_ACHIEVED':
        return {
          bg: isDarkMode ? 'rgba(59, 130, 246, 0.18)' : '#dbeafe',
          text: isDarkMode ? '#60a5fa' : '#1d4ed8',
          label: 'حقق التارچت',
          dot: '#3b82f6',
        };
      case 'ON_TRACK':
        return {
          bg: isDarkMode ? 'rgba(34, 197, 94, 0.18)' : '#dcfce7',
          text: isDarkMode ? '#4ade80' : '#15803d',
          label: 'يسير بالمعدل',
          dot: '#22c55e',
        };
      case 'AT_RISK':
        return {
          bg: isDarkMode ? 'rgba(234, 179, 8, 0.18)' : '#fef9c3',
          text: isDarkMode ? '#fde047' : '#854d0e',
          label: 'في خطر',
          dot: '#eab308',
        };
      case 'BEHIND_TARGET':
      default:
        return {
          bg: isDarkMode ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2',
          text: isDarkMode ? '#f87171' : '#b91c1c',
          label: 'متأخر',
          dot: '#ef4444',
        };
    }
  };

  const targetAchievedPercent = summary
    ? Math.min(100, Math.round(((summary.target_achieved + summary.on_track) / Math.max(1, summary.total_identifiers)) * 100))
    : 0;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Header */}
      <View style={[styles.appHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.headerUserInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.headerAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
          </View>
          <View style={[styles.headerUserText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text
              style={[styles.headerUserName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
              numberOfLines={1}
            >
              {user?.name || 'المشرف'}
            </Text>
            <View style={[styles.headerIdBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name="shield-checkmark-outline" size={13} color={colors.primary} />
              <Text style={[styles.headerUserRole, { color: colors.textSecondary }]}>
                مشرف التوصيل الميداني (Supervisor)
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh-outline" size={22} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerActionBtn, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fee2e2', borderColor: isDarkMode ? '#7f1d1d' : '#fecaca' }]}
            onPress={onLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.mainScrollContent}
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
        <View style={styles.tabContainer}>
          {/* Target Progress Card */}
          <View style={[styles.targetCardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.targetCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.targetTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.heroIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="trending-up" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.targetCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    معدل إنجاز التارچت لشهر {summary?.current_month || 'الحالي'}
                  </Text>
                  <Text style={[styles.heroSubText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    متابعة أداء المعرفين ونسب إنجاز المناديب
                  </Text>
                </View>
              </View>

              <Text style={[styles.targetRatioText, { color: colors.textSecondary }]}>
                <Text style={[styles.targetRatioBold, { color: colors.textPrimary }]}>
                  {summary?.total_month_orders?.toLocaleString('en-US') || 0}
                </Text>{' '}
                طلب
              </Text>
            </View>

            <View style={styles.targetProgressContainer}>
              <View style={[styles.progressBarTrack, { backgroundColor: isDarkMode ? '#1f2433' : '#f1f5f9' }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.max(3, targetAchievedPercent)}%`,
                      backgroundColor: targetAchievedPercent >= 75 ? '#22c55e' : colors.primary,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={[styles.targetFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.targetFooterTag, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={[styles.targetFooterNotice, { color: colors.textSecondary }]}>
                  متبقي {summary?.remaining_days || 0} يوم على نهاية الشهر
                </Text>
              </View>

              <View style={[styles.todayBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="flash" size={13} color="#f59e0b" />
                <Text style={styles.todayOrdersText}>
                  اليوم: {summary?.today_total_orders?.toLocaleString('en-US') || 0} طلب
                </Text>
              </View>
            </View>
          </View>

          {/* Quick KPI Stats */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
              مؤشرات الأداء الرئيسية
            </Text>
          </View>

          <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#dbeafe' }]}>
                <Ionicons name="people" size={22} color="#2563eb" />
              </View>
              <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                {summary?.total_identifiers ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>إجمالي المعرفين</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#dcfce7' }]}>
                <Ionicons name="trophy" size={22} color="#16a34a" />
              </View>
              <Text style={[styles.statNumber, { color: '#16a34a' }]}>
                {summary?.target_achieved ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>حققوا التارچت</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.16)' : '#ccfbf1' }]}>
                <Ionicons name="trending-up" size={22} color="#0d9488" />
              </View>
              <Text style={[styles.statNumber, { color: '#0d9488' }]}>
                {summary?.on_track ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>بالمعدل المطلوب</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2' }]}>
                <Ionicons name="warning" size={22} color="#dc2626" />
              </View>
              <Text style={[styles.statNumber, { color: '#dc2626' }]}>
                {(summary?.at_risk ?? 0) + (summary?.behind_target ?? 0)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>في خطر / متأخرين</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="flash" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.statNumber, { color: colors.primary }]}>
                {summary?.today_total_orders ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>طلبات اليوم</Text>
            </View>

            <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.16)' : '#f3e8ff' }]}>
                <Ionicons name="notifications" size={22} color="#9333ea" />
              </View>
              <Text style={[styles.statNumber, { color: alerts.length > 0 ? '#9333ea' : colors.textPrimary }]}>
                {alerts.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>تنبيهات العجز النشطة</Text>
            </View>
          </View>

          {/* Segmented Control */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
              سجل الأداء والمتابعة
            </Text>
          </View>

          <View style={[styles.segmentedTabsContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.segmentedTab,
                activeTab === 'identifiers' && [styles.activeSegmentedTab, { backgroundColor: colors.card }],
              ]}
              onPress={() => setActiveTab('identifiers')}
            >
              <Text
                style={[
                  styles.segmentedTabText,
                  { color: activeTab === 'identifiers' ? colors.primary : colors.textSecondary },
                ]}
              >
                المعرفين ({identifiers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentedTab,
                activeTab === 'drivers' && [styles.activeSegmentedTab, { backgroundColor: colors.card }],
              ]}
              onPress={() => setActiveTab('drivers')}
            >
              <Text
                style={[
                  styles.segmentedTabText,
                  { color: activeTab === 'drivers' ? colors.primary : colors.textSecondary },
                ]}
              >
                المناديب ({drivers.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentedTab,
                activeTab === 'alerts' && [styles.activeSegmentedTab, { backgroundColor: colors.card }],
              ]}
              onPress={() => setActiveTab('alerts')}
            >
              <Text
                style={[
                  styles.segmentedTabText,
                  { color: activeTab === 'alerts' ? colors.primary : colors.textSecondary },
                ]}
              >
                التنبيهات ({alerts.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
              placeholder={
                activeTab === 'identifiers'
                  ? 'بحث باسم المعرف أو الكود...'
                  : activeTab === 'drivers'
                  ? 'بحث باسم المندوب...'
                  : 'بحث في التنبيهات...'
              }
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Status Filter Chips */}
          {activeTab === 'identifiers' && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.filterChipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            >
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: statusFilter === '' ? colors.primary : colors.card, borderColor: colors.border },
                ]}
                onPress={() => setStatusFilter('')}
              >
                <Text style={[styles.filterChipText, { color: statusFilter === '' ? '#fff' : colors.textSecondary }]}>
                  الكل ({identifiers.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: statusFilter === 'ON_TRACK' ? colors.primary : colors.card, borderColor: colors.border },
                ]}
                onPress={() => setStatusFilter('ON_TRACK')}
              >
                <View style={[styles.chipDot, { backgroundColor: '#22c55e' }]} />
                <Text style={[styles.filterChipText, { color: statusFilter === 'ON_TRACK' ? '#fff' : colors.textSecondary }]}>
                  يسير بالمعدل
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: statusFilter === 'AT_RISK' ? colors.primary : colors.card, borderColor: colors.border },
                ]}
                onPress={() => setStatusFilter('AT_RISK')}
              >
                <View style={[styles.chipDot, { backgroundColor: '#eab308' }]} />
                <Text style={[styles.filterChipText, { color: statusFilter === 'AT_RISK' ? '#fff' : colors.textSecondary }]}>
                  في خطر
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: statusFilter === 'BEHIND_TARGET' ? colors.primary : colors.card, borderColor: colors.border },
                ]}
                onPress={() => setStatusFilter('BEHIND_TARGET')}
              >
                <View style={[styles.chipDot, { backgroundColor: '#ef4444' }]} />
                <Text style={[styles.filterChipText, { color: statusFilter === 'BEHIND_TARGET' ? '#fff' : colors.textSecondary }]}>
                  متأخر
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: statusFilter === 'TARGET_ACHIEVED' ? colors.primary : colors.card, borderColor: colors.border },
                ]}
                onPress={() => setStatusFilter('TARGET_ACHIEVED')}
              >
                <View style={[styles.chipDot, { backgroundColor: '#3b82f6' }]} />
                <Text style={[styles.filterChipText, { color: statusFilter === 'TARGET_ACHIEVED' ? '#fff' : colors.textSecondary }]}>
                  حقق التارچت
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* Content Lists */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>جارٍ جلب البيانات ومطابقة الأداء...</Text>
            </View>
          ) : activeTab === 'identifiers' ? (
            identifiers.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={44} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا توجد معرفات مطابقة</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  جرب البحث باسم آخر أو تأكد من مطابقة ملفات الإكسل
                </Text>
              </View>
            ) : (
              identifiers.map((ident) => {
                const badge = getStatusBadge(ident.status);
                return (
                  <TouchableOpacity
                    key={ident.id}
                    style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => setSelectedIdentifierId(ident.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.itemTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.itemTitleGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <Text style={[styles.itemName, { color: colors.textPrimary }]}>{ident.name}</Text>
                        {ident.code ? (
                          <Text style={[styles.itemCode, { color: colors.textSecondary }]}>كود: {ident.code}</Text>
                        ) : null}
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: badge.bg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.badgeDot, { backgroundColor: badge.dot }]} />
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>

                    <View style={styles.itemProgressSection}>
                      <View style={[styles.itemProgressTrack, { backgroundColor: isDarkMode ? '#1f2433' : '#f1f5f9' }]}>
                        <View
                          style={[
                            styles.itemProgressFill,
                            {
                              width: `${Math.min(100, Math.max(2, ident.achievement_percent))}%`,
                              backgroundColor: ident.achievement_percent >= 100 ? '#22c55e' : colors.primary,
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.itemProgressPct, { color: colors.primary }]}>
                        {ident.achievement_percent}%
                      </Text>
                    </View>

                    <View style={[styles.itemMetricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={styles.itemMetricCol}>
                        <Text style={[styles.itemMetricVal, { color: colors.textPrimary }]}>
                          {ident.month_orders} / {ident.monthly_target}
                        </Text>
                        <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>الطلبات / التارچت</Text>
                      </View>

                      <View style={styles.itemMetricCol}>
                        <Text style={[styles.itemMetricVal, { color: colors.textPrimary }]}>
                          {ident.daily_average}
                        </Text>
                        <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>متوسط يومي</Text>
                      </View>

                      <View style={styles.itemMetricCol}>
                        <Text style={[styles.itemMetricVal, { color: colors.primary }]}>
                          {ident.daily_required}
                        </Text>
                        <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>المطلوب يومياً</Text>
                      </View>

                      <View style={styles.itemMetricCol}>
                        <Text
                          style={[
                            styles.itemMetricVal,
                            { color: ident.is_qualified ? '#16a34a' : '#dc2626' },
                          ]}
                        >
                          {ident.projected_monthly_orders}
                        </Text>
                        <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>التوقع الشهري</Text>
                      </View>
                    </View>

                    <View style={[styles.itemBottomRow, { borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.qualificationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons
                          name={ident.is_qualified ? 'checkmark-circle' : 'close-circle'}
                          size={15}
                          color={ident.is_qualified ? '#16a34a' : '#dc2626'}
                        />
                        <Text
                          style={[
                            styles.qualificationText,
                            { color: ident.is_qualified ? '#16a34a' : '#dc2626' },
                          ]}
                        >
                          {ident.is_qualified ? 'مؤهل للتارچت' : 'غير مؤهل'}
                        </Text>
                      </View>

                      <View style={[styles.tapDetailsGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.tapDetailsText, { color: colors.primary }]}>التفاصيل والمناديب</Text>
                        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={14} color={colors.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )
          ) : activeTab === 'drivers' ? (
            drivers.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="people-outline" size={44} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا يوجد مناديب مسجلين</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  تأكد من مطابقة أسماء المناديب داخل ملف الإكسل
                </Text>
              </View>
            ) : (
              drivers.map((drv) => (
                <View
                  key={drv.id}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.itemTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.driverAvatarRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.driverAvatarCircle, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="person" size={20} color={colors.primary} />
                      </View>
                      <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text style={[styles.itemName, { color: colors.textPrimary }]}>{drv.name}</Text>
                        {drv.phone ? (
                          <Text style={[styles.itemCode, { color: colors.textSecondary }]}>{drv.phone}</Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={[styles.driverBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.driverBadgeNum, { color: colors.primary }]}>{drv.month_orders}</Text>
                      <Text style={[styles.driverBadgeLbl, { color: colors.textSecondary }]}>طلب بالشهر</Text>
                    </View>
                  </View>

                  {drv.identifiers && drv.identifiers.length > 0 && (
                    <View style={[styles.tagRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.tagLabel, { color: colors.textSecondary }]}>المعرفات:</Text>
                      <Text style={[styles.tagValue, { color: colors.textPrimary }]}>{drv.identifiers.join('، ')}</Text>
                    </View>
                  )}

                  {drv.apps && drv.apps.length > 0 && (
                    <View style={[styles.tagRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.tagLabel, { color: colors.textSecondary }]}>التطبيقات:</Text>
                      <Text style={[styles.tagValue, { color: colors.primary }]}>{drv.apps.join('، ')}</Text>
                    </View>
                  )}
                </View>
              ))
            )
          ) : (
            alerts.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="checkmark-circle-outline" size={48} color="#16a34a" />
                <Text style={[styles.emptyTitle, { color: '#16a34a', marginTop: 10 }]}>
                  لا توجد تنبيهات عجز نشطة
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  كافة المعرفين يسيرون بالمعدل المطلوب أو أفضل!
                </Text>
              </View>
            ) : (
              alerts.map((alert) => (
                <View
                  key={alert.id}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.itemTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                      <Text style={[styles.itemName, { color: colors.textPrimary }]}>
                        المعرف: {alert.identifier_name}
                      </Text>
                      <Text style={[styles.itemCode, { color: colors.textSecondary }]}>
                        تاريخ التنبيه: {alert.alert_date}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2' }]}>
                      <Text style={[styles.statusBadgeText, { color: '#dc2626' }]}>
                        عجز {alert.deficit} طلب
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.alertNumsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Text style={[styles.alertNumText, { color: colors.textSecondary }]}>
                      التارچت اليومي: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{alert.target_orders}</Text>
                    </Text>
                    <Text style={[styles.alertNumText, { color: colors.textSecondary }]}>
                      المنفذ فعلياً: <Text style={{ color: colors.primary, fontWeight: '700' }}>{alert.actual_orders}</Text>
                    </Text>
                  </View>
                </View>
              ))
            )
          )}
        </View>
      </ScrollView>

      <IdentifierDetailsModal
        visible={!!selectedIdentifierId}
        identifierId={selectedIdentifierId}
        onClose={() => setSelectedIdentifierId(null)}
        isDarkMode={isDarkMode}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  appHeader: {
    minHeight: 72,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerUserInfo: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerUserText: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  headerUserName: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerIdBadgeRow: {
    alignItems: 'center',
    gap: 5,
  },
  headerUserRole: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  targetCardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  targetCardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  targetTitleGroup: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  heroIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  heroSubText: {
    fontSize: 11,
    marginTop: 1,
  },
  targetRatioText: {
    fontSize: 13,
    fontWeight: '600',
  },
  targetRatioBold: {
    fontWeight: '800',
    fontSize: 16,
  },
  targetProgressContainer: {
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  targetFooterRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetFooterTag: {
    alignItems: 'center',
    gap: 6,
  },
  targetFooterNotice: {
    fontSize: 12,
    fontWeight: '600',
  },
  todayBadgeRow: {
    alignItems: 'center',
    gap: 4,
  },
  todayOrdersText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#f59e0b',
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  statsGrid: {
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentedTabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 12,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegmentedTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentedTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  filterChipsRow: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  itemCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  itemTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemTitleGroup: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
  },
  itemCode: {
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemProgressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  itemProgressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  itemProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  itemProgressPct: {
    fontSize: 12,
    fontWeight: '800',
    width: 40,
    textAlign: 'center',
  },
  itemMetricsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  itemMetricCol: {
    alignItems: 'center',
    flex: 1,
  },
  itemMetricVal: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  itemMetricLbl: {
    fontSize: 10,
  },
  itemBottomRow: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 6,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qualificationRow: {
    alignItems: 'center',
    gap: 4,
  },
  qualificationText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tapDetailsGroup: {
    alignItems: 'center',
    gap: 4,
  },
  tapDetailsText: {
    fontSize: 11,
    fontWeight: '700',
  },
  driverAvatarRow: {
    alignItems: 'center',
    gap: 10,
  },
  driverAvatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  driverBadgeNum: {
    fontSize: 15,
    fontWeight: '800',
  },
  driverBadgeLbl: {
    fontSize: 9,
    fontWeight: '600',
  },
  tagRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  alertNumsRow: {
    gap: 16,
    marginVertical: 8,
  },
  alertNumText: {
    fontSize: 12,
  },
});
