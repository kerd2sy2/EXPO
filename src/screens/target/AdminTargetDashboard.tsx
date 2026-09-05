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
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import {
  TargetDashboardSummary,
  IdentifierPerformance,
  DriverPerformance,
  TargetAlertItem,
} from '../../types/target';
import { targetApi } from '../../services/targetApi';
import { IdentifierDetailsModal } from './IdentifierDetailsModal';
import { TargetSettingsModal } from './TargetSettingsModal';
import { ImportOrdersModal } from './ImportOrdersModal';

interface AdminTargetDashboardProps {
  user: any;
  onLogout: () => void;
  isDarkMode?: boolean;
}

export const AdminTargetDashboard: React.FC<AdminTargetDashboardProps> = ({
  user,
  onLogout,
  isDarkMode = false,
}) => {
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
  const [showAddIdentModal, setShowAddIdentModal] = useState(false);
  const [newIdentName, setNewIdentName] = useState('');
  const [creatingIdent, setCreatingIdent] = useState(false);

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
      console.log('Error loading dashboard data:', err);
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

  const handleCreateIdentifier = async () => {
    if (!newIdentName.trim()) {
      Alert.alert('خطأ', 'يرجى كتابة اسم المعرف');
      return;
    }
    try {
      setCreatingIdent(true);
      await targetApi.createIdentifier({ name: newIdentName.trim() });
      Alert.alert('نجاح', 'تمت إضافة المعرف بنجاح');
      setNewIdentName('');
      setShowAddIdentModal(false);
      loadData();
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'فشل في إضافة المعرف');
    } finally {
      setCreatingIdent(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await targetApi.resolveAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (e: any) {
      Alert.alert('خطأ', e.message || 'فشل في تسوية التنبيه');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TARGET_ACHIEVED':
        return { bg: '#dbeafe', text: '#1d4ed8', label: 'حقق التارچت' };
      case 'ON_TRACK':
        return { bg: '#dcfce7', text: '#15803d', label: 'يسير بالمعدل' };
      case 'AT_RISK':
        return { bg: '#fef9c3', text: '#854d0e', label: 'في خطر' };
      case 'BEHIND_TARGET':
      default:
        return { bg: '#fee2e2', text: '#b91c1c', label: 'متأخر' };
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.darkArea]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Top Header */}
      <View style={[styles.header, isDarkMode && styles.darkHeader]}>
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>خروج</Text>
        </TouchableOpacity>

        <View style={styles.userInfo}>
          <Text style={[styles.userName, isDarkMode && styles.darkText]}>
            {user?.name || 'مدير النظام'}
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>لوحة تحكم الأدمن (Admin)</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f97316']} />}
      >
        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#f97316' }]}
            onPress={() => setShowImportModal(true)}
          >
            <Feather name="upload-cloud" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>رفع ملف إكسل</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}
            onPress={() => setShowAddIdentModal(true)}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.actionBtnText}>إضافة معرف</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#475569' }]}
            onPress={() => setShowSettingsModal(true)}
          >
            <Ionicons name="settings-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>إعدادات التارچت</Text>
          </TouchableOpacity>
        </View>

        {/* Top Summary Stats Cards */}
        {summary && (
          <View style={styles.statsOverview}>
            <View style={[styles.overviewCard, isDarkMode && styles.darkCard]}>
              <Text style={styles.overviewNum}>{summary.total_identifiers}</Text>
              <Text style={styles.overviewLabel}>إجمالي المعرفين</Text>
            </View>

            <View style={[styles.overviewCard, isDarkMode && styles.darkCard]}>
              <Text style={[styles.overviewNum, { color: '#2563eb' }]}>{summary.target_achieved}</Text>
              <Text style={styles.overviewLabel}>حققوا التارچت</Text>
            </View>

            <View style={[styles.overviewCard, isDarkMode && styles.darkCard]}>
              <Text style={[styles.overviewNum, { color: '#10b981' }]}>{summary.on_track}</Text>
              <Text style={styles.overviewLabel}>بالمعدل المطلوب</Text>
            </View>

            <View style={[styles.overviewCard, isDarkMode && styles.darkCard]}>
              <Text style={[styles.overviewNum, { color: '#eab308' }]}>{summary.at_risk}</Text>
              <Text style={styles.overviewLabel}>في خطر</Text>
            </View>

            <View style={[styles.overviewCard, isDarkMode && styles.darkCard]}>
              <Text style={[styles.overviewNum, { color: '#ef4444' }]}>{summary.behind_target}</Text>
              <Text style={styles.overviewLabel}>متأخرين</Text>
            </View>
          </View>
        )}

        {/* Month Totals Banner */}
        {summary && (
          <View style={[styles.monthBanner, isDarkMode && styles.darkCard]}>
            <View style={styles.monthStatItem}>
              <Text style={styles.monthStatNum}>{summary.total_month_orders}</Text>
              <Text style={styles.monthStatLabel}>طلبات هذا الشهر ({summary.current_month})</Text>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthStatItem}>
              <Text style={[styles.monthStatNum, { color: '#f97316' }]}>{summary.today_total_orders}</Text>
              <Text style={styles.monthStatLabel}>طلبات اليوم</Text>
            </View>
            <View style={styles.monthDivider} />
            <View style={styles.monthStatItem}>
              <Text style={styles.monthStatNum}>{summary.remaining_days}</Text>
              <Text style={styles.monthStatLabel}>أيام متبقية للشهر</Text>
            </View>
          </View>
        )}

        {/* Navigation Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'identifiers' && styles.activeTabPill]}
            onPress={() => setActiveTab('identifiers')}
          >
            <Text style={[styles.tabText, activeTab === 'identifiers' && styles.activeTabText]}>
              المعرفين والتارچت ({identifiers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'drivers' && styles.activeTabPill]}
            onPress={() => setActiveTab('drivers')}
          >
            <Text style={[styles.tabText, activeTab === 'drivers' && styles.activeTabText]}>
              أداء المندوبين ({drivers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabPill, activeTab === 'alerts' && styles.activeTabPill]}
            onPress={() => setActiveTab('alerts')}
          >
            <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>
              التنبيهات ({alerts.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchBox, isDarkMode && styles.darkCard]}>
          <Ionicons name="search-outline" size={18} color="#94a3b8" />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.darkText]}
            placeholder={
              activeTab === 'identifiers'
                ? 'بحث باسم المعرف أو الكود...'
                : activeTab === 'drivers'
                ? 'بحث باسم المندوب...'
                : 'بحث...'
            }
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            textAlign="right"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filter Pills (for Identifiers Tab) */}
        {activeTab === 'identifiers' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterPillsRow}>
            <TouchableOpacity
              style={[styles.filterPill, statusFilter === '' && styles.activeFilterPill]}
              onPress={() => setStatusFilter('')}
            >
              <Text style={[styles.filterPillText, statusFilter === '' && styles.activeFilterText]}>
                الكل
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'ON_TRACK' && styles.activeFilterPill]}
              onPress={() => setStatusFilter('ON_TRACK')}
            >
              <Text style={[styles.filterPillText, statusFilter === 'ON_TRACK' && styles.activeFilterText]}>
                🟢 يسير بالمعدل
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'AT_RISK' && styles.activeFilterPill]}
              onPress={() => setStatusFilter('AT_RISK')}
            >
              <Text style={[styles.filterPillText, statusFilter === 'AT_RISK' && styles.activeFilterText]}>
                🟡 في خطر
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'BEHIND_TARGET' && styles.activeFilterPill]}
              onPress={() => setStatusFilter('BEHIND_TARGET')}
            >
              <Text style={[styles.filterPillText, statusFilter === 'BEHIND_TARGET' && styles.activeFilterText]}>
                🔴 متأخر
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, statusFilter === 'TARGET_ACHIEVED' && styles.activeFilterPill]}
              onPress={() => setStatusFilter('TARGET_ACHIEVED')}
            >
              <Text style={[styles.filterPillText, statusFilter === 'TARGET_ACHIEVED' && styles.activeFilterText]}>
                🔵 حقق التارچت
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {/* Content Section */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#f97316" />
            <Text style={styles.loadingText}>جارٍ تحديث البيانات...</Text>
          </View>
        ) : activeTab === 'identifiers' ? (
          /* Identifiers List */
          identifiers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>لا توجد معرفات مطابقة للبحث</Text>
            </View>
          ) : (
            identifiers.map((ident) => {
              const badge = getStatusBadge(ident.status);
              return (
                <TouchableOpacity
                  key={ident.id}
                  style={[styles.identCard, isDarkMode && styles.darkCard]}
                  onPress={() => setSelectedIdentifierId(ident.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.identTopRow}>
                    <View style={styles.identTitleWrap}>
                      <Text style={[styles.identName, isDarkMode && styles.darkText]}>{ident.name}</Text>
                      {ident.code ? <Text style={styles.identCode}>كود: {ident.code}</Text> : null}
                    </View>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeSmallText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.progressBarWrapper}>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${Math.min(100, Math.max(0, ident.achievement_percent))}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.percentText}>{ident.achievement_percent}%</Text>
                  </View>

                  {/* Metrics Row */}
                  <View style={styles.identMetricsRow}>
                    <View style={styles.metricCol}>
                      <Text style={styles.metricVal}>{ident.month_orders} / {ident.monthly_target}</Text>
                      <Text style={styles.metricLbl}>الطلبات / التارچت</Text>
                    </View>

                    <View style={styles.metricCol}>
                      <Text style={styles.metricVal}>{ident.daily_average}</Text>
                      <Text style={styles.metricLbl}>متوسط يومي</Text>
                    </View>

                    <View style={styles.metricCol}>
                      <Text style={[styles.metricVal, { color: '#f97316' }]}>{ident.daily_required}</Text>
                      <Text style={styles.metricLbl}>المطلوب يومياً</Text>
                    </View>

                    <View style={styles.metricCol}>
                      <Text
                        style={[
                          styles.metricVal,
                          { color: ident.is_qualified ? '#10b981' : '#ef4444' },
                        ]}
                      >
                        {ident.projected_monthly_orders}
                      </Text>
                      <Text style={styles.metricLbl}>التوقع الشهري</Text>
                    </View>
                  </View>

                  {/* Bottom Info Bar */}
                  <View style={styles.identBottomRow}>
                    <Text style={styles.qualificationTag}>
                      {ident.is_qualified ? '✅ مؤهل للتارچت' : '❌ غير مؤهل'}
                    </Text>
                    <View style={styles.tapDetails}>
                      <Text style={styles.tapDetailsText}>عرض التفاصيل والمندوبين</Text>
                      <Ionicons name="chevron-back" size={14} color="#f97316" />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )
        ) : activeTab === 'drivers' ? (
          /* Drivers List */
          drivers.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>لا يوجد مناديب مسجلين</Text>
            </View>
          ) : (
            drivers.map((drv) => (
              <View key={drv.id} style={[styles.driverCard, isDarkMode && styles.darkCard]}>
                <View style={styles.driverTopRow}>
                  <View>
                    <Text style={[styles.driverCardName, isDarkMode && styles.darkText]}>{drv.name}</Text>
                    {drv.phone ? <Text style={styles.driverCardPhone}>{drv.phone}</Text> : null}
                  </View>
                  <View style={styles.driverOrdersBadge}>
                    <Text style={styles.driverOrdersBadgeNum}>{drv.month_orders}</Text>
                    <Text style={styles.driverOrdersBadgeLbl}>طلب هذا الشهر</Text>
                  </View>
                </View>

                {drv.identifiers && drv.identifiers.length > 0 && (
                  <View style={styles.driverSubInfo}>
                    <Text style={styles.driverSubLabel}>المعرفات المرتبطة:</Text>
                    <Text style={styles.driverSubVal}>{drv.identifiers.join('، ')}</Text>
                  </View>
                )}

                {drv.apps && drv.apps.length > 0 && (
                  <View style={styles.driverSubInfo}>
                    <Text style={styles.driverSubLabel}>التطبيقات:</Text>
                    <Text style={styles.driverSubVal}>{drv.apps.join('، ')}</Text>
                  </View>
                )}
              </View>
            ))
          )
        ) : (
          /* Alerts List */
          alerts.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="checkmark-circle-outline" size={40} color="#10b981" />
              <Text style={[styles.emptyText, { color: '#10b981', marginTop: 6 }]}>
                لا توجد تنبيهات عجز نشطة حالياً! الأداء ممتاز.
              </Text>
            </View>
          ) : (
            alerts.map((alert) => (
              <View key={alert.id} style={[styles.alertCard, isDarkMode && styles.darkCard]}>
                <View style={styles.alertTop}>
                  <View style={styles.alertMeta}>
                    <Text style={[styles.alertIdent, isDarkMode && styles.darkText]}>
                      المعرف: {alert.identifier_name}
                    </Text>
                    <Text style={styles.alertDate}>تاريخ التنبيه: {alert.alert_date}</Text>
                  </View>
                  <View style={styles.deficitBadge}>
                    <Text style={styles.deficitNum}>عجز {alert.deficit} طلب</Text>
                  </View>
                </View>

                <View style={styles.alertNumbers}>
                  <Text style={styles.alertNumText}>التارچت اليومي: {alert.target_orders} طلب</Text>
                  <Text style={styles.alertNumText}>المنفذ فعلياً: {alert.actual_orders} طلب</Text>
                </View>

                <TouchableOpacity
                  style={styles.resolveBtn}
                  onPress={() => handleResolveAlert(alert.id)}
                >
                  <Text style={styles.resolveBtnText}>تسوية التنبيه</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        )}
      </ScrollView>

      {/* Add Identifier Modal */}
      {showAddIdentModal && (
        <View style={styles.addModalOverlay}>
          <View style={[styles.addModalCard, isDarkMode && styles.darkCard]}>
            <Text style={[styles.addModalTitle, isDarkMode && styles.darkText]}>إضافة معرف جديد</Text>
            <TextInput
              style={[styles.addModalInput, isDarkMode && { backgroundColor: '#1c1c22', color: '#ffffff', borderColor: '#2e2e38' }]}
              placeholder="اسم المعرف (مثال: فهد)"
              placeholderTextColor="#94a3b8"
              value={newIdentName}
              onChangeText={setNewIdentName}
              textAlign="right"
            />
            <View style={styles.addModalBtnsRow}>
              <TouchableOpacity
                style={styles.addModalCancelBtn}
                onPress={() => setShowAddIdentModal(false)}
              >
                <Text style={styles.addModalCancelText}>إلغاء</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addModalSubmitBtn}
                onPress={handleCreateIdentifier}
                disabled={creatingIdent}
              >
                {creatingIdent ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.addModalSubmitText}>إضافة</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Modals */}
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
    backgroundColor: '#f8fafc',
  },
  darkArea: {
    backgroundColor: '#020617',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  darkHeader: {
    backgroundColor: '#0f172a',
    borderBottomColor: '#1e293b',
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  darkText: {
    color: '#f8fafc',
  },
  roleBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fff1f2',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 40,
  },
  actionsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  statsOverview: {
    flexDirection: 'row-reverse',
    gap: 6,
    marginBottom: 12,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkCard: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  overviewNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  overviewLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  monthBanner: {
    flexDirection: 'row-reverse',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  monthStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  monthStatNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  monthStatLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  monthDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  tabsRow: {
    flexDirection: 'row-reverse',
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  tabPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  activeTabPill: {
    backgroundColor: '#fff',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  activeTabText: {
    color: '#0f172a',
    fontWeight: '800',
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  filterPillsRow: {
    flexDirection: 'row-reverse',
    gap: 6,
    marginBottom: 12,
    paddingBottom: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  activeFilterPill: {
    backgroundColor: '#f97316',
    borderColor: '#f97316',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  activeFilterText: {
    color: '#fff',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  emptyCard: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
  },
  identCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  identTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  identTitleWrap: {
    alignItems: 'flex-end',
  },
  identName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  identCode: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeSmallText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginVertical: 10,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 4,
  },
  percentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#f97316',
    width: 44,
    textAlign: 'left',
  },
  identMetricsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  metricCol: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLbl: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  identBottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  qualificationTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  tapDetails: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  tapDetailsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#f97316',
  },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  driverTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  driverCardName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  driverCardPhone: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  driverOrdersBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  driverOrdersBadgeNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#c2410c',
  },
  driverOrdersBadgeLbl: {
    fontSize: 9,
    color: '#9a3412',
    fontWeight: '600',
  },
  driverSubInfo: {
    flexDirection: 'row-reverse',
    gap: 4,
    marginTop: 3,
  },
  driverSubLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  driverSubVal: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: '700',
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  alertTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertMeta: {
    alignItems: 'flex-end',
  },
  alertIdent: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  alertDate: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  deficitBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  deficitNum: {
    fontSize: 11,
    fontWeight: '800',
    color: '#b91c1c',
  },
  alertNumbers: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  alertNumText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  resolveBtn: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  resolveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  addModalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  addModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
  },
  addModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 14,
  },
  addModalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 14,
  },
  addModalBtnsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  addModalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  addModalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  addModalSubmitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  addModalSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
