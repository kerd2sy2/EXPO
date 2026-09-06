import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  StatusBar,
  BackHandler,
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
import { TargetSettingsModal } from './TargetSettingsModal';
import { ImportOrdersModal } from './ImportOrdersModal';
import { AdminProfileScreen } from './AdminProfileScreen';
import { TargetLogsScreen } from './TargetLogsScreen';

interface AdminTargetDashboardProps {
  user: any;
  onLogout: () => void;
  isDarkMode?: boolean;
  colors?: ThemeColors;
  isRTL?: boolean;
}

export const AdminTargetDashboard: React.FC<AdminTargetDashboardProps> = ({
  user,
  onLogout,
  isDarkMode = false,
  colors: propColors,
  isRTL = true,
}) => {
  const [currentView, setCurrentView] = useState<'home' | 'data' | 'logs' | 'profile'>('home');
  const [activeTab, setActiveTab] = useState<'identifiers' | 'drivers' | 'alerts'>('identifiers');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary] = useState<TargetDashboardSummary | null>(null);
  const [identifiers, setIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [drivers, setDrivers] = useState<DriverPerformance[]>([]);
  const [alerts, setAlerts] = useState<TargetAlertItem[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [selectedIdentifierId, setSelectedIdentifierId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Theme Colors matching Delegate App
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
        targetApi.getDashboard().catch(() => null),
        targetApi.listIdentifiers({ search: searchQuery, status: statusFilter }).catch(() => []),
        targetApi.listDrivers({ search: searchQuery }).catch(() => []),
        targetApi.listAlerts({ unresolved_only: true }).catch(() => []),
      ]);
      setSummary(sumData || null);
      setIdentifiers(Array.isArray(identsData) ? identsData : []);
      setDrivers(Array.isArray(driversData) ? driversData : []);
      setAlerts(Array.isArray(alertsData) ? alertsData : []);
    } catch (err: any) {
      console.log('Error loading admin dashboard data:', err);
      setIdentifiers([]);
      setDrivers([]);
      setAlerts([]);
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

  useEffect(() => {
    const backAction = () => {
      if (currentView !== 'home') {
        setCurrentView('home');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentView]);

  const handleResolveAlert = async (alertId: string) => {
    try {
      await targetApi.resolveAlert(alertId);
      setAlerts((prev) => (Array.isArray(prev) ? prev.filter((a) => a.id !== alertId) : []));
      Alert.alert('تم', 'تمت تسوية التنبيه بنجاح');
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشل في تسوية التنبيه');
    }
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

  // Safe array guards
  const identsList = Array.isArray(identifiers) ? identifiers : [];
  const driversList = Array.isArray(drivers) ? drivers : [];
  const alertsList = Array.isArray(alerts) ? alerts : [];

  // Handler for KPI Card Clicks -> Opens Data Page filtered
  const handleCardPress = (tab: 'identifiers' | 'drivers' | 'alerts', status = '') => {
    setActiveTab(tab);
    setStatusFilter(status);
    setCurrentView('data');
  };

  // Sub-Page Title (Displayed with orange underline like Delegate screens)
  const getSubPageTitle = () => {
    if (currentView === 'profile') return 'الملف الشخصي';
    if (currentView === 'logs') return 'سجل العمليات والمتابعة';
    if (currentView === 'data') {
      if (activeTab === 'identifiers') {
        if (statusFilter === 'TARGET_ACHIEVED') return 'المعرفين - حققوا التارچت';
        if (statusFilter === 'ON_TRACK') return 'المعرفين - يسير بالمعدل';
        if (statusFilter === 'AT_RISK' || statusFilter === 'BEHIND_TARGET') return 'المعرفين - في خطر / متأخر';
        return 'قائمة المعرفين';
      }
      if (activeTab === 'drivers') return 'بيانات المناديب وطلبات اليوم';
      if (activeTab === 'alerts') return 'تنبيهات العجز النشطة';
      return 'صفحة البيانات';
    }
    return '';
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Dynamic Header matching Delegate App exactly */}
      <View style={[styles.appHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {currentView === 'home' ? (
          /* Home Header: User Avatar + Name + Refresh + Logout */
          <>
            <TouchableOpacity
              style={[styles.headerUserInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => setCurrentView('profile')}
              activeOpacity={0.8}
            >
              <View style={[styles.headerAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <Ionicons name="shield-checkmark" size={28} color={colors.primary} />
                <View style={[styles.avatarBadgeDot, { backgroundColor: '#22c55e' }]} />
              </View>
              <View style={[styles.headerUserText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.headerNameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text
                    style={[styles.headerUserName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                    numberOfLines={1}
                  >
                    {user?.name || 'مدير النظام'}
                  </Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
                </View>
                <View style={[styles.headerIdBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="shield-checkmark-outline" size={13} color={colors.primary} />
                  <Text style={[styles.headerUserRole, { color: colors.textSecondary }]}>
                    {user?.role === 'SUPERVISOR' ? 'مشرف التوصيل' : 'لوحة تحكم الإدارة'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.headerActionBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={onRefresh}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={22} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.headerActionBtn,
                  {
                    backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#fee2e2',
                    borderColor: isDarkMode ? '#7f1d1d' : '#fecaca',
                  },
                ]}
                onPress={onLogout}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out-outline" size={22} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* Sub-Page Header: Back Button + Start-Aligned Title with Orange Underline (Identical to Delegate App) */
          <View style={[styles.subPageHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={() => setCurrentView('home')}
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
                {getSubPageTitle()}
              </Text>
              <View style={[styles.titleUnderlineBar, { backgroundColor: colors.primary }]} />
            </View>
          </View>
        )}
      </View>

      {/* VIEW 1: PROFILE SCREEN (PAGE NOT MODAL) */}
      {currentView === 'profile' ? (
        <AdminProfileScreen
          user={user}
          onOpenTargetSettings={() => setShowSettingsModal(true)}
          onLogout={onLogout}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      ) : currentView === 'logs' ? (
        /* VIEW 2: LOGS SCREEN */
        <TargetLogsScreen
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      ) : currentView === 'home' ? (
        /* VIEW 3: HOME DASHBOARD (KPIs & Quick Cards) */
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
            {/* 1. Quick KPI Stats - Clickable Cards leading to Data Page */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                مؤشرات الأداء الرئيسية
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                اضغط على أي مؤشر لعرض تفاصيل البيانات ومطابقة الأداء
              </Text>
            </View>

            <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Card 1: إجمالي المعرفين */}
              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleCardPress('identifiers', '')}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#dbeafe' }]}>
                  <Ionicons name="people" size={22} color="#2563eb" />
                </View>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {summary?.total_identifiers ?? identsList.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>إجمالي المعرفين</Text>
                <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.statTapHintText, { color: colors.primary }]}>عرض الكل</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color={colors.primary} />
                </View>
              </TouchableOpacity>

              {/* Card 2: حققوا التارچت */}
              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleCardPress('identifiers', 'TARGET_ACHIEVED')}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#dcfce7' }]}>
                  <Ionicons name="trophy" size={22} color="#16a34a" />
                </View>
                <Text style={[styles.statNumber, { color: '#16a34a' }]}>
                  {summary?.target_achieved ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>حققوا التارچت</Text>
                <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.statTapHintText, { color: '#16a34a' }]}>عرض المحققين</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color="#16a34a" />
                </View>
              </TouchableOpacity>

              {/* Card 3: بالمعدل المطلوب */}
              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleCardPress('identifiers', 'ON_TRACK')}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.16)' : '#ccfbf1' }]}>
                  <Ionicons name="trending-up" size={22} color="#0d9488" />
                </View>
                <Text style={[styles.statNumber, { color: '#0d9488' }]}>
                  {summary?.on_track ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>بالمعدل المطلوب</Text>
                <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.statTapHintText, { color: '#0d9488' }]}>عرض السائرين</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color="#0d9488" />
                </View>
              </TouchableOpacity>

              {/* Card 4: في خطر / متأخرين */}
              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleCardPress('identifiers', 'AT_RISK')}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.16)' : '#fee2e2' }]}>
                  <Ionicons name="warning" size={22} color="#dc2626" />
                </View>
                <Text style={[styles.statNumber, { color: '#dc2626' }]}>
                  {(summary?.at_risk ?? 0) + (summary?.behind_target ?? 0)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>في خطر / متأخرين</Text>
                <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.statTapHintText, { color: '#dc2626' }]}>عرض المتأخرين</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color="#dc2626" />
                </View>
              </TouchableOpacity>

              {/* Card 5: طلبات اليوم */}
              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleCardPress('drivers')}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="flash" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.primary }]}>
                  {summary?.today_total_orders ?? 0}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>طلبات اليوم</Text>
                <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.statTapHintText, { color: colors.primary }]}>بيانات المناديب</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color={colors.primary} />
                </View>
              </TouchableOpacity>

              {/* Card 6: تنبيهات العجز النشطة */}
              <TouchableOpacity
                style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleCardPress('alerts')}
                activeOpacity={0.75}
              >
                <View style={[styles.statIconCircle, { backgroundColor: isDarkMode ? 'rgba(168, 85, 247, 0.16)' : '#f3e8ff' }]}>
                  <Ionicons name="notifications" size={22} color="#9333ea" />
                </View>
                <Text style={[styles.statNumber, { color: alertsList.length > 0 ? '#9333ea' : colors.textPrimary }]}>
                  {alertsList.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>تنبيهات العجز النشطة</Text>
                <View style={[styles.statTapHint, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.statTapHintText, { color: '#9333ea' }]}>عرض التنبيهات</Text>
                  <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={12} color="#9333ea" />
                </View>
              </TouchableOpacity>
            </View>

            {/* 2. Prominent "سجل" Card */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                سجل العمليات والمتابعة
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.historyHeroCard,
                { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => setCurrentView('logs')}
              activeOpacity={0.75}
            >
              <View style={[styles.historyIconCircle, { backgroundColor: isDarkMode ? 'rgba(59, 130, 246, 0.16)' : '#dbeafe' }]}>
                <Ionicons name="time-outline" size={26} color="#2563eb" />
              </View>
              <View style={[styles.historyTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <View style={[styles.historyTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.historyCardTitle, { color: colors.textPrimary }]}>
                    سجل العمليات والأداء
                  </Text>
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

            {/* 3. Operations: Import Excel Card */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                العمليات والاستيراد
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.quickCardRow,
                { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
              onPress={() => setShowImportModal(true)}
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
          </View>
        </ScrollView>
      ) : (
        /* VIEW 4: DATA VIEW (FULL LIST / SEARCH / FILTERS) */
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
            {/* Segmented Control / Tabs Header */}
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
                  المعرفين ({identsList.length})
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
                  المناديب ({driversList.length})
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
                  التنبيهات ({alertsList.length})
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

            {/* Status Filter Chips (For Identifiers) */}
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
                    الكل ({identsList.length})
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
              </ScrollView>
            )}

            {/* Content Rendering */}
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>جارٍ جلب البيانات ومطابقة الأداء...</Text>
              </View>
            ) : activeTab === 'identifiers' ? (
              identsList.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="search-outline" size={44} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا توجد معرفات مسجلة</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    يمكنك استيراد كشف الطلبات عبر لوحة التحكم
                  </Text>
                </View>
              ) : (
                identsList.map((ident) => {
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
                                width: `${Math.min(100, Math.max(2, ident.achievement_percent || 0))}%`,
                                backgroundColor: (ident.achievement_percent || 0) >= 100 ? '#22c55e' : colors.primary,
                              },
                            ]}
                          />
                        </View>
                        <Text style={[styles.itemProgressPct, { color: colors.primary }]}>
                          {ident.achievement_percent || 0}%
                        </Text>
                      </View>

                      <View style={[styles.itemMetricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={styles.itemMetricCol}>
                          <Text style={[styles.itemMetricVal, { color: colors.textPrimary }]}>
                            {ident.month_orders || 0} / {ident.monthly_target || 0}
                          </Text>
                          <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>الطلبات / التارچت</Text>
                        </View>

                        <View style={styles.itemMetricCol}>
                          <Text style={[styles.itemMetricVal, { color: colors.textPrimary }]}>
                            {ident.daily_average || 0}
                          </Text>
                          <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>متوسط يومي</Text>
                        </View>

                        <View style={styles.itemMetricCol}>
                          <Text style={[styles.itemMetricVal, { color: colors.primary }]}>
                            {ident.daily_required || 0}
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
                            {ident.projected_monthly_orders || 0}
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
              driversList.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="people-outline" size={44} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا يوجد مناديب مسجلين</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    تأكد من مطابقة أسماء المناديب داخل ملف الإكسل
                  </Text>
                </View>
              ) : (
                driversList.map((drv) => (
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
                        <Text style={[styles.driverBadgeNum, { color: colors.primary }]}>{drv.month_orders || 0}</Text>
                        <Text style={[styles.driverBadgeLbl, { color: colors.textSecondary }]}>طلب بالشهر</Text>
                      </View>
                    </View>

                    {Array.isArray(drv.identifiers) && drv.identifiers.length > 0 && (
                      <View style={[styles.tagRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.tagLabel, { color: colors.textSecondary }]}>المعرفات:</Text>
                        <Text style={[styles.tagValue, { color: colors.textPrimary }]}>{drv.identifiers.join('، ')}</Text>
                      </View>
                    )}

                    {Array.isArray(drv.apps) && drv.apps.length > 0 && (
                      <View style={[styles.tagRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Text style={[styles.tagLabel, { color: colors.textSecondary }]}>التطبيقات:</Text>
                        <Text style={[styles.tagValue, { color: colors.primary }]}>{drv.apps.join('، ')}</Text>
                      </View>
                    )}
                  </View>
                ))
              )
            ) : (
              alertsList.length === 0 ? (
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
                alertsList.map((alert) => (
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

                    <TouchableOpacity
                      style={[styles.resolveBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                      onPress={() => handleResolveAlert(alert.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
                      <Text style={[styles.resolveBtnText, { color: colors.primary }]}>تسوية التنبيه</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )
            )}
          </View>
        </ScrollView>
      )}

      {/* Sub-Modals */}
      <IdentifierDetailsModal
        visible={!!selectedIdentifierId}
        identifierId={selectedIdentifierId}
        onClose={() => setSelectedIdentifierId(null)}
        isDarkMode={isDarkMode}
      />

      <TargetSettingsModal
        visible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSaved={loadData}
        isDarkMode={isDarkMode}
      />

      <ImportOrdersModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={loadData}
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
    position: 'relative',
  },
  avatarBadgeDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  headerUserText: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  headerNameRow: {
    alignItems: 'center',
    gap: 4,
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
  subPageHeaderRow: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  subPageTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  subPageHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  titleUnderlineBar: {
    width: 34,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
  },
  mainScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statsGrid: {
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    width: '48%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 135,
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
    marginBottom: 6,
  },
  statTapHint: {
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  statTapHintText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyHeroCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  historyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTextCol: {
    flex: 1,
    gap: 3,
  },
  historyTitleRow: {
    alignItems: 'center',
    gap: 8,
  },
  historyCardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  historyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  historyBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyCardSub: {
    fontSize: 11,
  },
  quickCardRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  quickCardIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCardTextCol: {
    flex: 1,
    gap: 2,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  quickCardSub: {
    fontSize: 11,
  },
  segmentedTabsContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 12,
    gap: 4,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegmentedTab: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
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
    height: 44,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
  },
  itemCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  itemTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: '500',
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
    gap: 8,
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
    fontSize: 11,
    fontWeight: '800',
    minWidth: 35,
    textAlign: 'right',
  },
  itemMetricsRow: {
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  itemMetricCol: {
    alignItems: 'center',
  },
  itemMetricVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  itemMetricLbl: {
    fontSize: 10,
    marginTop: 2,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
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
    gap: 2,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignItems: 'center',
  },
  driverBadgeNum: {
    fontSize: 14,
    fontWeight: '800',
  },
  driverBadgeLbl: {
    fontSize: 9,
  },
  tagRow: {
    alignItems: 'center',
    gap: 6,
  },
  tagLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tagValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  alertNumsRow: {
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  alertNumText: {
    fontSize: 12,
  },
  resolveBtn: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  resolveBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
