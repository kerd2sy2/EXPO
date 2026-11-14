import React from 'react';
import { View, Text, ScrollView, RefreshControl, TouchableOpacity, TextInput, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../../types/delegate';
import { DriverPerformance, IdentifierPerformance, TargetAlertItem } from '../../../types/target';
import { DateFilterValue } from '../DateFilterModal';
import {
  DashboardDataTab,
  formatIdentifierDisplayName,
  getIdentifierPlatform,
  getStatusBadge,
} from './targetDashboardHelpers';
import { targetDashboardHeaderStyles as hStyles } from './targetDashboardHeaderStyles';
import { targetDashboardContentStyles as styles } from './targetDashboardContentStyles';

interface TargetDataListViewProps {
  isAdmin: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  loading: boolean;
  activeTab: DashboardDataTab;
  searchQuery: string;
  onChangeSearch: (q: string) => void;
  platformTab: 'ninja' | 'keeta';
  onChangePlatformTab: (tab: 'ninja' | 'keeta') => void;
  ninjaCount: number;
  keetaCount: number;
  identsList: IdentifierPerformance[];
  driversList: DriverPerformance[];
  alertsList: TargetAlertItem[];
  dateFilterType: DateFilterValue['type'];
  getDriverPeriodOrders: (drv: DriverPerformance) => number;
  getAssignedDriverName: (alert: TargetAlertItem) => string;
  onSelectIdentifier: (id: string) => void;
  onSelectDriver: (drv: DriverPerformance) => void;
  onResolveAlert?: (alertId: string) => void;
}

const getStatusColor = (status: string) =>
  status === 'TARGET_ACHIEVED'
    ? '#2563eb'
    : status === 'ON_TRACK'
    ? '#16a34a'
    : status === 'AT_RISK'
    ? '#d97706'
    : '#dc2626';

export const TargetDataListView: React.FC<TargetDataListViewProps> = ({
  isAdmin, colors, isDarkMode, isRTL, refreshing, onRefresh, loading, activeTab,
  searchQuery, onChangeSearch, platformTab, onChangePlatformTab, ninjaCount, keetaCount,
  identsList, driversList, alertsList, dateFilterType, getDriverPeriodOrders,
  getAssignedDriverName, onSelectIdentifier, onSelectDriver, onResolveAlert,
}) => {
  return (
    <ScrollView
      contentContainerStyle={hStyles.mainScrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      <View style={hStyles.tabContainer}>
        <View style={[hStyles.searchBox, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[hStyles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
            placeholder={
              activeTab === 'identifiers'
                ? 'بحث باسم المعرف أو الكود...'
                : activeTab === 'drivers'
                ? 'بحث باسم المندوب...'
                : 'بحث في التنبيهات بالاسم أو التاريخ...'
            }
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={onChangeSearch}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => onChangeSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>جارٍ جلب البيانات ومطابقة الأداء...</Text>
          </View>
        ) : activeTab === 'identifiers' ? (
          <View>
            <View style={[styles.platformTabsBar, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[
                  styles.platformTabItem,
                  platformTab === 'ninja' && [styles.platformTabItemActive, { backgroundColor: '#000000', borderColor: isDarkMode ? '#334155' : '#0f172a', borderWidth: 1 }],
                ]}
                onPress={() => onChangePlatformTab('ninja')}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isAdmin ? 5 : 6 }}>
                  <Image source={require('../../../../assets/images/ninja.png')} style={styles.platformTabLogo} resizeMode="contain" />
                  <Text style={[styles.platformTabItemText, { color: platformTab === 'ninja' ? '#ffffff' : colors.textPrimary }, platformTab === 'ninja' && styles.platformTabItemTextActive]}>
                    نينجا
                  </Text>
                  <View style={[styles.platformCountBadge, { backgroundColor: platformTab === 'ninja' ? (isAdmin ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.3)') : isDarkMode ? (isAdmin ? '#334155' : 'rgba(255,255,255,0.12)') : (isAdmin ? '#e2e8f0' : 'rgba(0,0,0,0.08)') }]}>
                    <Text style={[styles.platformCountText, { color: platformTab === 'ninja' ? '#ffffff' : colors.textPrimary }]}>{ninjaCount}</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.platformTabItem,
                  platformTab === 'keeta' && [styles.platformTabItemActive, { backgroundColor: '#d97706' }],
                ]}
                onPress={() => onChangePlatformTab('keeta')}
                activeOpacity={0.75}
              >
                <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: isAdmin ? 5 : 6 }}>
                  <Image source={require('../../../../assets/images/keeta.png')} style={styles.platformTabLogo} resizeMode="cover" />
                  <Text style={[styles.platformTabItemText, { color: platformTab === 'keeta' ? '#ffffff' : colors.textPrimary }, platformTab === 'keeta' && styles.platformTabItemTextActive]}>
                    كيتا
                  </Text>
                  <View style={[styles.platformCountBadge, { backgroundColor: platformTab === 'keeta' ? (isAdmin ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.3)') : isDarkMode ? (isAdmin ? '#334155' : 'rgba(255,255,255,0.12)') : (isAdmin ? '#e2e8f0' : 'rgba(0,0,0,0.08)') }]}>
                    <Text style={[styles.platformCountText, { color: platformTab === 'keeta' ? '#ffffff' : colors.textPrimary }]}>{keetaCount}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {identsList.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="search-outline" size={44} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  {platformTab === 'keeta' ? 'لا توجد معرفات لتطبيق كيتا' : platformTab === 'ninja' ? 'لا توجد معرفات لتطبيق نينجا' : 'لا توجد معرفات مسجلة'}
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  {isAdmin ? 'يمكنك استيراد كشف الطلبات عبر لوحة التحكم' : 'لا توجد بيانات مطابقة لخيارات البحث الحالية'}
                </Text>
              </View>
            ) : (
              identsList.map((ident) => {
                const badge = getStatusBadge(ident.status, isDarkMode);
                const platform = getIdentifierPlatform(ident);
                const statusClr = getStatusColor(ident.status);
                return (
                  <TouchableOpacity
                    key={ident.id}
                    style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => onSelectIdentifier(ident.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.itemTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.identAvatarTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View
                          style={[
                            styles.identPlatformAvatar,
                            {
                              backgroundColor: platform === 'ninja' || platform === 'toyou' ? '#ffffff' : '#fde047',
                              borderColor: platform === 'ninja' ? (isDarkMode ? '#475569' : '#0f172a') : platform === 'toyou' ? '#06b6d4' : '#eab308',
                            },
                          ]}
                        >
                          <Image
                            source={
                              platform === 'ninja'
                                ? require('../../../../assets/images/ninja.png')
                                : platform === 'toyou'
                                ? require('../../../../assets/images/toyou.png')
                                : require('../../../../assets/images/keeta.png')
                            }
                            style={platform === 'ninja' ? styles.identNinjaAvatarImg : platform === 'toyou' ? styles.identToyouAvatarImg : styles.identKeetaAvatarImg}
                            resizeMode={platform === 'keeta' ? 'cover' : 'contain'}
                          />
                        </View>

                        <View style={[styles.itemTitleGroup, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={[styles.itemName, { color: colors.textPrimary }]}>{formatIdentifierDisplayName(ident.name)}</Text>
                            {ident.account_status === 'SUSPENDED_TEMP' && (
                              <View style={{ backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#fde68a' }}>
                                <Text style={{ color: isDarkMode ? '#fbbf24' : '#b45309', fontSize: 10, fontWeight: '700' }}>⏸️ موقوف مؤقتاً</Text>
                              </View>
                            )}
                            {ident.account_status === 'SUSPENDED_PERM' && (
                              <View style={{ backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#fecaca' }}>
                                <Text style={{ color: isDarkMode ? '#f87171' : '#dc2626', fontSize: 10, fontWeight: '700' }}>🛑 موقوف نهائياً</Text>
                              </View>
                            )}
                          </View>
                          {ident.code ? <Text style={[styles.itemCode, { color: colors.textSecondary }]}>كود: {ident.code}</Text> : null}
                        </View>
                      </View>

                      <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border || 'transparent', borderWidth: badge.border ? 1 : 0, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.badgeDot, { backgroundColor: badge.dot }]} />
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                      </View>
                    </View>

                    <View style={styles.itemProgressSection}>
                      <View style={[styles.itemProgressTrack, { backgroundColor: isDarkMode ? '#1f2433' : '#f1f5f9' }]}>
                        <View style={[styles.itemProgressFill, { width: `${Math.min(100, Math.max(2, ident.achievement_percent || 0))}%`, backgroundColor: (ident.achievement_percent || 0) >= 100 ? '#22c55e' : colors.primary }]} />
                      </View>
                      <Text style={[styles.itemProgressPct, { color: colors.primary }]}>{ident.achievement_percent || 0}%</Text>
                    </View>

                    <View style={[styles.itemMetricsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={styles.itemMetricCol}>
                        <Text style={[styles.itemMetricVal, { color: colors.textPrimary }]}>{ident.month_orders || 0} / {ident.monthly_target || 0}</Text>
                        <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>الطلبات / التارچت</Text>
                      </View>
                      <View style={styles.itemMetricCol}>
                        <Text style={[styles.itemMetricVal, { color: colors.textPrimary }]}>{ident.daily_average || 0}</Text>
                        <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>متوسط يومي</Text>
                      </View>
                      <View style={styles.itemMetricCol}>
                        <Text style={[styles.itemMetricVal, { color: colors.primary }]}>{Math.round(ident.daily_required || 0)}</Text>
                        <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>المطلوب يومياً</Text>
                      </View>
                      <View style={styles.itemMetricCol}>
                        <Text style={[styles.itemMetricVal, { color: statusClr }]}>{ident.projected_monthly_orders || 0}</Text>
                        <Text style={[styles.itemMetricLbl, { color: colors.textSecondary }]}>التوقع الشهري</Text>
                      </View>
                    </View>

                    <View style={[styles.itemBottomRow, { borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.qualificationRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons
                          name={ident.status === 'TARGET_ACHIEVED' ? 'trophy' : ident.status === 'ON_TRACK' ? 'checkmark-circle' : ident.status === 'AT_RISK' ? 'time-outline' : 'close-circle'}
                          size={15}
                          color={statusClr}
                        />
                        <Text style={[styles.qualificationText, { color: statusClr }]}>
                          {ident.status === 'TARGET_ACHIEVED' ? 'حقق التارچت 🏆' : ident.status === 'ON_TRACK' ? 'مؤهل للتارچت' : ident.status === 'AT_RISK' ? 'فرصة قائمة (في المتناول)' : 'غير مؤهل (متأخر)'}
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
            )}
          </View>
        ) : activeTab === 'drivers' ? (
          driversList.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="people-outline" size={44} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا يوجد مناديب مسجلين</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                {isAdmin ? 'تأكد من مطابقة أسماء المناديب داخل ملف الإكسل' : 'تأكد من مطابقة أسماء المناديب داخل كشف الطلبات'}
              </Text>
            </View>
          ) : (
            <View>
              {driversList.map((drv) => (
                <TouchableOpacity
                  key={drv.id}
                  style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => onSelectDriver(drv)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.itemTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={[styles.driverAvatarRow, { flexDirection: isRTL ? 'row-reverse' : 'row', flex: 1 }]}>
                      <View style={[styles.driverAvatarCircle, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="person" size={20} color={colors.primary} />
                      </View>
                      <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1, marginHorizontal: 6 }}>
                        <Text style={[styles.itemName, { color: colors.textPrimary }]} numberOfLines={1}>{drv.name}</Text>
                        {drv.phone ? <Text style={[styles.itemCode, { color: colors.textSecondary }]}>{drv.phone}</Text> : null}
                      </View>
                    </View>

                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.driverBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 1, minWidth: 76 }]}>
                        <Text style={[styles.driverBadgeNum, { color: colors.primary, fontSize: 16 }]}>{getDriverPeriodOrders(drv)}</Text>
                        <Text style={[styles.driverBadgeLbl, { color: colors.primary, fontWeight: '700' }]}>
                          {dateFilterType === 'month' ? 'الشهر' : dateFilterType === 'day' ? 'اليوم' : 'الفترة'}
                        </Text>
                      </View>
                      <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.textSecondary} />
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
                </TouchableOpacity>
              ))}
            </View>
          )
        ) : alertsList.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#16a34a" />
            <Text style={[styles.emptyTitle, { color: '#16a34a', marginTop: 10 }]}>لا توجد تنبيهات عجز مسجلة</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>كافة المعرفين يسيرون بالمعدل المطلوب أو أفضل!</Text>
          </View>
        ) : (
          alertsList.map((alert, idx) => {
            const isResolved = Boolean(alert.is_resolved);
            const targetOrders = alert.target_orders && alert.target_orders !== 15 ? alert.target_orders : 18;
            const actualOrders = alert.actual_orders ?? 0;
            const deficit = isResolved ? 0 : Math.max(0, targetOrders - actualOrders);
            return (
              <View key={alert.id || `alert-${idx}`} style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.itemTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start', flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]}>
                      {isAdmin ? formatIdentifierDisplayName(alert.identifier_name) || 'معرف' : alert.identifier_name || 'بدون اسم'}
                    </Text>
                    <View style={[styles.alertDriverRow, { flexDirection: isRTL ? 'row-reverse' : 'row', ...(isAdmin ? {} : { alignItems: 'center', gap: 4, marginTop: 4 }) }]}>
                      <Ionicons name="person-outline" size={13} color={colors.primary} />
                      <Text style={[styles.alertDriverText, { color: isAdmin ? colors.primary : colors.textSecondary }]}>
                        المندوب المسؤول اليوم:{' '}
                        {isAdmin ? (
                          getAssignedDriverName(alert)
                        ) : (
                          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{getAssignedDriverName(alert)}</Text>
                        )}
                      </Text>
                    </View>
                    {!isAdmin && (
                      <Text style={[styles.itemCode, { color: colors.textSecondary, marginTop: 3 }]}>
                        تاريخ التنبيه: {alert.alert_date || '-'}
                      </Text>
                    )}
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isResolved
                          ? isDarkMode ? 'rgba(34, 197, 94, 0.18)' : '#dcfce7'
                          : isDarkMode ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2',
                      },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: isResolved ? '#16a34a' : '#dc2626' }]}>
                      {isResolved ? 'تمت التسوية' : `عجز ${deficit} طلب`}
                    </Text>
                  </View>
                </View>

                <View style={[styles.alertNumsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.alertNumText, { color: colors.textSecondary }]}>
                    التارچت اليومي: <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{targetOrders}</Text>
                  </Text>
                  <Text style={[styles.alertNumText, { color: colors.textSecondary }]}>
                    المنفذ فعلياً: <Text style={{ color: colors.primary, fontWeight: '700' }}>{actualOrders}</Text>
                  </Text>
                </View>

                {isAdmin && !isResolved && onResolveAlert && (
                  <TouchableOpacity
                    style={[styles.resolveBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                    onPress={() => onResolveAlert(alert.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
                    <Text style={[styles.resolveBtnText, { color: colors.primary }]}>تسوية التنبيه</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};
