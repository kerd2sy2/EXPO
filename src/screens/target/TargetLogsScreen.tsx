import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { TargetAlertItem } from '../../types/target';
import { targetApi } from '../../services/targetApi';

interface TargetLogsScreenProps {
  onBack?: () => void;
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
}

export const TargetLogsScreen: React.FC<TargetLogsScreenProps> = ({
  colors,
  isDarkMode = false,
  isRTL = true,
}) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<TargetAlertItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'unresolved' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all alerts (resolved & unresolved)
      const data = await targetApi.listAlerts({ unresolved_only: false }).catch(() => []);
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log('Error loading logs:', err);
      setAlerts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  const filteredAlerts = useMemo(() => {
    return (Array.isArray(alerts) ? alerts : []).filter((alert) => {
      if (!alert) return false;
      // Status filter
      if (filterType === 'unresolved' && alert.is_resolved) return false;
      if (filterType === 'resolved' && !alert.is_resolved) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = alert.identifier_name?.toLowerCase().includes(q);
        const matchDate = alert.alert_date?.includes(q);
        const matchDeficit = String(alert.deficit ?? '').includes(q);
        return Boolean(matchName || matchDate || matchDeficit);
      }
      return true;
    });
  }, [alerts, filterType, searchQuery]);

  const resolvedCount = useMemo(() => {
    return (Array.isArray(alerts) ? alerts : []).filter((a) => a && a.is_resolved).length;
  }, [alerts]);

  const unresolvedCount = useMemo(() => {
    return (Array.isArray(alerts) ? alerts : []).filter((a) => a && !a.is_resolved).length;
  }, [alerts]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        {/* Quick Summary Cards */}
        <View style={[styles.summaryGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="list-outline" size={20} color={colors.primary} />
            <Text style={[styles.summaryNum, { color: colors.textPrimary }]}>{alerts.length}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>إجمالي السجلات</Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" />
            <Text style={[styles.summaryNum, { color: '#16a34a' }]}>{resolvedCount}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>عمليات مسواة</Text>
          </View>

          <View style={[styles.summaryBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
            <Text style={[styles.summaryNum, { color: '#dc2626' }]}>{unresolvedCount}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>تنبيهات نشطة</Text>
          </View>
        </View>

        {/* Filter Segmented Control */}
        <View style={[styles.filterRow, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.filterTab, filterType === 'all' && [styles.activeFilterTab, { backgroundColor: colors.card }]]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterTabText, { color: filterType === 'all' ? colors.primary : colors.textSecondary }]}>
              الكل ({alerts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filterType === 'resolved' && [styles.activeFilterTab, { backgroundColor: colors.card }]]}
            onPress={() => setFilterType('resolved')}
          >
            <Text style={[styles.filterTabText, { color: filterType === 'resolved' ? '#16a34a' : colors.textSecondary }]}>
              المسواة ({resolvedCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterTab, filterType === 'unresolved' && [styles.activeFilterTab, { backgroundColor: colors.card }]]}
            onPress={() => setFilterType('unresolved')}
          >
            <Text style={[styles.filterTabText, { color: filterType === 'unresolved' ? '#dc2626' : colors.textSecondary }]}>
              النشطة ({unresolvedCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Field */}
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder="بحث في السجل بالمعرف أو التاريخ..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* List Content */}
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>جارٍ جلب سجل العمليات...</Text>
          </View>
        ) : filteredAlerts.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="receipt-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا توجد سجلات مطابقة</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              لم يتم العثور على أية تنبيهات أو عمليات مسجلة وفق الفلاتر المحددة
            </Text>
          </View>
        ) : (
          filteredAlerts.map((item) => {
            const isResolved = item.is_resolved;
            return (
              <View
                key={item.id}
                style={[styles.logCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.logTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.logTitleCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.logIdentName, { color: colors.textPrimary }]}>
                      المعرف: {item.identifier_name}
                    </Text>
                    <View style={[styles.logDateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                      <Text style={[styles.logDateText, { color: colors.textSecondary }]}>
                        {item.alert_date}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.logBadge,
                      {
                        backgroundColor: isResolved
                          ? (isDarkMode ? 'rgba(34, 197, 94, 0.18)' : '#dcfce7')
                          : (isDarkMode ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2'),
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <Ionicons
                      name={isResolved ? 'checkmark-circle' : 'alert-circle'}
                      size={14}
                      color={isResolved ? '#16a34a' : '#dc2626'}
                    />
                    <Text
                      style={[
                        styles.logBadgeText,
                        { color: isResolved ? '#16a34a' : '#dc2626' },
                      ]}
                    >
                      {isResolved ? 'تمت التسوية' : `عجز ${item.deficit} طلب`}
                    </Text>
                  </View>
                </View>

                {/* Metrics Breakdown */}
                <View style={[styles.logMetricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.logMetricItem}>
                    <Text style={[styles.logMetricVal, { color: colors.textPrimary }]}>
                      {item.target_orders}
                    </Text>
                    <Text style={[styles.logMetricLbl, { color: colors.textSecondary }]}>التارچت اليومي</Text>
                  </View>

                  <View style={styles.logMetricItem}>
                    <Text style={[styles.logMetricVal, { color: colors.primary }]}>
                      {item.actual_orders}
                    </Text>
                    <Text style={[styles.logMetricLbl, { color: colors.textSecondary }]}>المنفذ فعلياً</Text>
                  </View>

                  <View style={styles.logMetricItem}>
                    <Text style={[styles.logMetricVal, { color: isResolved ? '#16a34a' : '#dc2626' }]}>
                      {item.deficit}
                    </Text>
                    <Text style={[styles.logMetricLbl, { color: colors.textSecondary }]}>قيمة العجز</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 36,
  },
  summaryGrid: {
    gap: 10,
    marginBottom: 16,
  },
  summaryBox: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  summaryNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 14,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterTab: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  loadingBox: {
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 32,
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  logCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  logTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTitleCol: {
    flex: 1,
    gap: 4,
  },
  logIdentName: {
    fontSize: 15,
    fontWeight: '800',
  },
  logDateRow: {
    alignItems: 'center',
    gap: 4,
  },
  logDateText: {
    fontSize: 12,
  },
  logBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    alignItems: 'center',
    gap: 5,
  },
  logBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  logMetricsRow: {
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
    justifyContent: 'space-between',
  },
  logMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  logMetricVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  logMetricLbl: {
    fontSize: 10,
    marginTop: 2,
  },
});
