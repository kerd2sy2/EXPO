import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { IdentifierDetails } from '../../types/target';
import { targetApi } from '../../services/targetApi';

interface IdentifierDetailsModalProps {
  visible: boolean;
  identifierId: string | null;
  month?: string;
  onClose: () => void;
  isDarkMode?: boolean;
}

export const IdentifierDetailsModal: React.FC<IdentifierDetailsModalProps> = ({
  visible,
  identifierId,
  month,
  onClose,
  isDarkMode = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<IdentifierDetails | null>(null);
  const [error, setError] = useState('');
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);

  useEffect(() => {
    if (visible && identifierId) {
      loadDetails();
    } else {
      setDetails(null);
      setError('');
    }
  }, [visible, identifierId, month]);

  const loadDetails = async () => {
    if (!identifierId) return;
    try {
      setLoading(true);
      setError('');
      const data = await targetApi.getIdentifierDetails(identifierId, month);
      setDetails(data);
    } catch (err: any) {
      setError(err.message || 'فشل في تحميل تفاصيل المعرف');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  const p = details?.performance;
  const driversBreakdown = Array.isArray(details?.drivers_breakdown) ? details.drivers_breakdown : [];
  const appsBreakdown = (details?.apps_breakdown && typeof details.apps_breakdown === 'object') ? details.apps_breakdown : {};

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TARGET_ACHIEVED':
        return { bg: '#dbeafe', text: '#1d4ed8', label: '🔵 حقق التارچت' };
      case 'ON_TRACK':
        return { bg: '#dcfce7', text: '#15803d', label: '🟢 يسير بالمعدل المطلوب' };
      case 'AT_RISK':
        return {
          bg: isDarkMode ? 'rgba(245, 158, 11, 0.22)' : '#fef3c7',
          text: isDarkMode ? '#fbbf24' : '#b45309',
          label: '🟡 على وشك المعدل',
        };
      case 'BEHIND_TARGET':
      default:
        return { bg: '#fee2e2', text: '#b91c1c', label: '🔴 متأخر عن التارچت' };
    }
  };

  const getIdentifierPlatform = (name?: string, code?: string, appName?: string): 'keeta' | 'ninja' | 'toyou' => {
    const app = (appName || '').toLowerCase();
    if (app.includes('ninja') || app.includes('نينجا')) return 'ninja';
    if (app.includes('toyou') || app.includes('to you') || app.includes('تويو')) return 'toyou';
    if (app.includes('keeta') || app.includes('كيتا') || app.includes('كينتا')) return 'keeta';

    const str = `${name || ''} ${code || ''}`.toLowerCase();
    if (str.includes('ninja') || str.includes('نينجا') || str.includes('فردين')) return 'ninja';
    if (str.includes('toyou') || str.includes('to you') || str.includes('تويو')) return 'toyou';
    return 'keeta';
  };

  const formatIdentifierDisplayName = (name?: string) => {
    if (!name) return '';
    return name.replace(/\s*\((كيتا|نينجا|تويو|كينتا|Keeta|Ninja|Toyou)\)/gi, '').trim();
  };

  const statusBadge = p ? getStatusBadge(p.status) : null;
  const platform = getIdentifierPlatform(p?.name, p?.code, p?.app_name);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, isDarkMode && styles.darkContainer]}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#1e293b'} />
            </TouchableOpacity>
            <View style={styles.headerTitleGroup}>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, isDarkMode && styles.darkText]}>
                  {p?.name ? `تفاصيل المعرف: ${formatIdentifierDisplayName(p.name)}` : 'تفاصيل المعرف'}
                </Text>
                {p?.code ? <Text style={styles.codeText}>كود: {p.code}</Text> : null}
              </View>
              {p?.name ? (
                <View
                  style={[
                    styles.platformAvatar,
                    {
                      backgroundColor:
                        platform === 'ninja' ? '#ffffff' : platform === 'toyou' ? '#ffffff' : '#fde047',
                      borderColor:
                        platform === 'ninja'
                          ? isDarkMode ? '#475569' : '#0f172a'
                          : platform === 'toyou'
                          ? '#06b6d4'
                          : '#eab308',
                    },
                  ]}
                >
                  <Image
                    source={
                      platform === 'ninja'
                        ? require('../../../assets/images/ninja.png')
                        : platform === 'toyou'
                        ? require('../../../assets/images/toyou.png')
                        : require('../../../assets/images/keeta.png')
                    }
                    style={
                      platform === 'ninja'
                        ? styles.ninjaAvatarImg
                        : platform === 'toyou'
                        ? styles.toyouAvatarImg
                        : styles.keetaAvatarImg
                    }
                    resizeMode={platform === 'keeta' ? 'cover' : 'contain'}
                  />
                </View>
              ) : null}
            </View>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#f97316" />
              <Text style={styles.loadingText}>جارٍ تحميل تفاصيل المعرف...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerBox}>
              <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={loadDetails} style={styles.retryBtn}>
                <Text style={styles.retryText}>إعادة المحاولة</Text>
              </TouchableOpacity>
            </View>
          ) : p && details ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              {/* Status & Qualification Banners */}
              <View style={styles.bannerRow}>
                {statusBadge && (
                  <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
                    <Text style={[styles.badgeText, { color: statusBadge.text }]}>
                      {statusBadge.label}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: p.is_qualified ? '#ecfdf5' : '#fff1f2' },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: p.is_qualified ? '#047857' : '#be123c' },
                    ]}
                  >
                    {p.is_qualified ? '✅ مؤهل (Qualified)' : '❌ غير مؤهل (Not Qualified)'}
                  </Text>
                </View>
              </View>

              {/* Progress Bar Card */}
              <View style={[styles.card, isDarkMode && styles.darkCard]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>
                    نسبة الإنجاز الشهري
                  </Text>
                  <Text style={styles.progressPercent}>{p.achievement_percent}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, Math.max(0, p.achievement_percent))}%` },
                    ]}
                  />
                </View>
                <View style={styles.progressSubRow}>
                  <Text style={styles.subText}>المنفذ: {p.month_orders} طلب</Text>
                  <Text style={styles.subText}>التارچت: {p.monthly_target} طلب</Text>
                </View>
              </View>

              {/* Key Metrics Grid */}
              <View style={styles.statsGrid}>
                <View style={[styles.statBox, isDarkMode && styles.darkCard]}>
                  <Text style={styles.statLabel}>متوسط يومي</Text>
                  <Text style={styles.statValue}>{p.daily_average}</Text>
                  <Text style={styles.statHint}>طلب / يوم</Text>
                </View>

                <View style={[styles.statBox, isDarkMode && styles.darkCard]}>
                  <Text style={styles.statLabel}>المطلوب يومياً</Text>
                  <Text style={[styles.statValue, { color: '#f97316' }]}>{Math.round(p.daily_required || 0)}</Text>
                  <Text style={styles.statHint}>طلب / يوم</Text>
                </View>

                <View style={[styles.statBox, isDarkMode && styles.darkCard]}>
                  <Text style={styles.statLabel}>توقع الإجمالي</Text>
                  <Text style={[styles.statValue, { color: p.is_qualified ? '#10b981' : '#ef4444' }]}>
                    {p.projected_monthly_orders}
                  </Text>
                  <Text style={styles.statHint}>بنهاية الشهر</Text>
                </View>

                <View style={[styles.statBox, isDarkMode && styles.darkCard]}>
                  <Text style={styles.statLabel}>الأيام المتبقية</Text>
                  <Text style={styles.statValue}>{p.remaining_days}</Text>
                  <Text style={styles.statHint}>يوم</Text>
                </View>
              </View>

              {/* Estimated Achievement Date */}
              {p.estimated_achievement_date ? (
                <View style={[styles.infoRowCard, isDarkMode && styles.darkCard]}>
                  <Feather name="calendar" size={18} color="#3b82f6" />
                  <Text style={[styles.infoRowText, isDarkMode && styles.darkText]}>
                    تاريخ الوصول المتوقع للتارچت:
                  </Text>
                  <Text style={styles.infoRowValue}>{p.estimated_achievement_date}</Text>
                </View>
              ) : null}

              {/* Drivers Breakdown */}
              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={20} color="#f97316" />
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                  تحليل المندوبين المشتركين ({driversBreakdown.length})
                </Text>
              </View>

              {driversBreakdown.length === 0 ? (
                <Text style={styles.emptyText}>لا يوجد مناديب مسجلين لهذا المعرف في هذا الشهر</Text>
              ) : (
                driversBreakdown.map((drv, idx) => {
                  const isExpanded = expandedDriverId === drv.driver_id;
                  const dailyOrders = drv.daily_orders || {};
                  
                  // Extract available days from dailyTimeline or build 1-31
                  const timeline = details?.daily_timeline || [];
                  const daysList = timeline.length > 0
                    ? timeline
                    : Array.from({ length: 31 }, (_, i) => ({
                        day: i + 1,
                        date: `${(month || new Date().toISOString().slice(0, 7))}-${String(i + 1).padStart(2, '0')}`,
                        orders: 0,
                        target: 15,
                      }));

                  // Calculate active days vs absent days
                  const activeDaysCount = Object.keys(dailyOrders).filter(d => (dailyOrders[d] || 0) > 0).length;

                  return (
                    <TouchableOpacity
                      key={drv.driver_id || idx}
                      style={[
                        styles.driverCard,
                        isDarkMode && styles.darkCard,
                        isExpanded && { borderColor: '#f97316', borderWidth: 1.5 },
                      ]}
                      onPress={() => setExpandedDriverId(isExpanded ? null : drv.driver_id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.driverInfo}>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, flex: 1 }}>
                          <Text style={[styles.driverName, isDarkMode && styles.darkText]}>
                            {idx + 1}. {drv.driver_name}
                          </Text>
                          <Ionicons
                            name={isExpanded ? 'chevron-up-circle' : 'chevron-down-circle-outline'}
                            size={18}
                            color={isExpanded ? '#f97316' : '#94a3b8'}
                          />
                        </View>
                        <View style={{ alignItems: 'flex-start' }}>
                          <Text style={styles.driverOrders}>{drv.orders} طلب</Text>
                          <Text style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                            {activeDaysCount} يوم عمل
                          </Text>
                        </View>
                      </View>
                      <View style={styles.driverBarWrapper}>
                        <View style={styles.driverBarBg}>
                          <View
                            style={[
                              styles.driverBarFill,
                              { width: `${Math.min(100, Math.max(0, drv.percentage))}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.driverPercent}>{drv.percentage}%</Text>
                      </View>

                      {/* Click hint / indicator */}
                      {!isExpanded && (
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: isDarkMode ? '#334155' : '#f1f5f9' }}>
                          <Text style={{ fontSize: 11, color: '#f97316', fontWeight: '600' }}>
                            اضغط لعرض تفاصيل الأيام اليومية والغياب 👈
                          </Text>
                        </View>
                      )}

                      {/* Daily Details Breakdown when expanded */}
                      {isExpanded && (
                        <View style={[styles.dailyBreakdownContainer, isDarkMode && styles.dailyBreakdownDark]}>
                          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                              تفاصيل الطلبات اليومية للمندوب:
                            </Text>
                            <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
                              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' }} />
                                <Text style={{ fontSize: 10, color: '#64748b' }}>حاضر</Text>
                              </View>
                              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
                                <Text style={{ fontSize: 10, color: '#64748b' }}>غائب</Text>
                              </View>
                            </View>
                          </View>

                          <View style={styles.dailyGrid}>
                            {daysList.map((dItem) => {
                              const dayOrders = dailyOrders[dItem.date] || 0;
                              const isAbsent = dayOrders === 0;

                              return (
                                <View
                                  key={dItem.day}
                                  style={[
                                    styles.dayBox,
                                    isAbsent
                                      ? (isDarkMode ? styles.dayBoxAbsentDark : styles.dayBoxAbsentLight)
                                      : (isDarkMode ? styles.dayBoxActiveDark : styles.dayBoxActiveLight),
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.dayBoxDayNum,
                                      { color: isAbsent ? '#ef4444' : '#10b981' },
                                    ]}
                                  >
                                    يوم {dItem.day}
                                  </Text>
                                  <Text
                                    style={[
                                      styles.dayBoxOrders,
                                      { color: isAbsent ? (isDarkMode ? '#fca5a5' : '#dc2626') : (isDarkMode ? '#6ee7b7' : '#059669') },
                                    ]}
                                  >
                                    {isAbsent ? 'غائب' : `${dayOrders} طلب`}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}

              {/* Apps Breakdown */}
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="apps" size={20} color="#f97316" />
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                  توزيع الطلبات حسب التطبيقات
                </Text>
              </View>
              <View style={styles.appsRow}>
                {Object.entries(appsBreakdown).length === 0 ? (
                  <Text style={styles.emptyText}>لا توجد تطبيقات مسجلة</Text>
                ) : (
                  Object.entries(appsBreakdown).map(([appName, count], i) => (
                    <View key={i} style={[styles.appChip, isDarkMode && styles.darkCard]}>
                      <Text style={styles.appChipName}>{appName}</Text>
                      <Text style={styles.appChipCount}>{count} طلب</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
    paddingBottom: 24,
  },
  darkContainer: {
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  platformAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  ninjaAvatarImg: {
    width: 32,
    height: 32,
  },
  toyouAvatarImg: {
    width: 35,
    height: 35,
  },
  keetaAvatarImg: {
    width: 44,
    height: 44,
  },
  titleContainer: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  darkText: {
    color: '#f8fafc',
  },
  codeText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 14,
    backgroundColor: '#f97316',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  bannerRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 14,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  darkCard: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  progressPercent: {
    fontSize: 16,
    fontWeight: '800',
    color: '#f97316',
  },
  progressBarBg: {
    height: 10,
    backgroundColor: '#e2e8f0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f97316',
    borderRadius: 5,
  },
  progressSubRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  subText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginVertical: 2,
  },
  statHint: {
    fontSize: 10,
    color: '#94a3b8',
  },
  infoRowCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 14,
    gap: 8,
  },
  infoRowText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  infoRowValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563eb',
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginVertical: 14,
  },
  driverCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  driverInfo: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  driverOrders: {
    fontSize: 13,
    fontWeight: '800',
    color: '#f97316',
  },
  driverBarWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  driverBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  driverBarFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  driverPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    width: 38,
    textAlign: 'left',
  },
  appsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  appChip: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  appChipName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  appChipCount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#f97316',
    marginTop: 2,
  },
  dailyBreakdownContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  dailyBreakdownDark: {
    borderTopColor: '#334155',
  },
  dailyGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-start',
  },
  dayBox: {
    width: '18%',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  dayBoxActiveLight: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  dayBoxActiveDark: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#059669',
  },
  dayBoxAbsentLight: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  dayBoxAbsentDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: '#dc2626',
  },
  dayBoxDayNum: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  dayBoxOrders: {
    fontSize: 10,
    fontWeight: '800',
  },
});
