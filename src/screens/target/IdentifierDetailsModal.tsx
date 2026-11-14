import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { IdentifierDetails, AccountStatus } from '../../types/target';
import { targetApi } from '../../services/targetApi';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import {
  formatIdentifierTitleName,
  getAccountStatusInfo,
  getIdentifierPlatformKey,
  getIdentifierStatusBadge,
} from './identifier-details/identifierDetailsHelpers';
import { identifierDetailsMainStyles as styles } from './identifier-details/identifierDetailsMainStyles';
import { identifierDetailsModalStyles as mStyles } from './identifier-details/identifierDetailsModalStyles';
import { DriverBreakdownCard } from './identifier-details/DriverBreakdownCard';
import { AccountStatusSheetModal } from './identifier-details/AccountStatusSheetModal';

interface IdentifierDetailsModalProps {
  visible: boolean;
  identifierId: string | null;
  month?: string;
  onClose: () => void;
  isDarkMode?: boolean;
  isAdmin?: boolean;
  onUpdated?: () => void;
}

export const IdentifierDetailsModal: React.FC<IdentifierDetailsModalProps> = ({
  visible,
  identifierId,
  month,
  onClose,
  isDarkMode = false,
  isAdmin = true,
  onUpdated,
}) => {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<IdentifierDetails | null>(null);
  const [error, setError] = useState('');
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

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

  useEffect(() => {
    if (visible && identifierId) {
      loadDetails();
    } else {
      setDetails(null);
      setError('');
    }
  }, [visible, identifierId, month]);

  if (!visible) return null;

  const p = details?.performance;
  const driversBreakdown = Array.isArray(details?.drivers_breakdown) ? details.drivers_breakdown : [];
  const appsBreakdown =
    details?.apps_breakdown && typeof details.apps_breakdown === 'object' ? details.apps_breakdown : {};
  const statusBadge = p ? getIdentifierStatusBadge(p.status, isDarkMode) : null;
  const platform = getIdentifierPlatformKey(p?.name, p?.code, p?.app_name);
  const currentAccountStatus: AccountStatus = p?.account_status || 'ACTIVE';
  const accountStatusInfo = getAccountStatusInfo(currentAccountStatus, isDarkMode);

  const performUpdateStatus = async (newStatus: AccountStatus) => {
    if (!identifierId) return;
    try {
      setStatusUpdating(true);
      await targetApi.updateIdentifier(identifierId, { account_status: newStatus });
      setDetails((prev) =>
        prev ? { ...prev, performance: { ...prev.performance, account_status: newStatus } } : null
      );
      setShowStatusModal(false);
      Alert.alert('تم بنجاح', 'تم تحديث حالة تشغيل المعرف بنجاح');
      onUpdated?.();
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'فشل في تحديث حالة المعرف');
    } finally {
      setStatusUpdating(false);
    }
  };

  const confirmChangeStatus = (newStatus: AccountStatus) => {
    if (newStatus === currentAccountStatus) {
      setShowStatusModal(false);
      return;
    }
    const title =
      newStatus === 'ACTIVE'
        ? 'تفعيل المعرف'
        : newStatus === 'SUSPENDED_TEMP'
        ? 'إيقاف مؤقت للمعرف'
        : 'إيقاف نهائي للمعرف';
    const msg =
      newStatus === 'ACTIVE'
        ? 'هل أنت متأكد من تفعيل هذا المعرف وعودته لاستقبال الطلبات بشكل طبيعي؟'
        : newStatus === 'SUSPENDED_TEMP'
        ? 'هل أنت متأكد من إيقاف هذا المعرف مؤقتاً لحين استئناف العمل من الإدارة؟\n\n💡 ملاحظة: المناديب يمكنهم العمل تحت أي معرف آخر بحرية.'
        : 'هل أنت متأكد من إيقاف هذا المعرف نهائياً؟\nلن يتم إضافة أو احتساب أي طلبات جديدة لهذا المعرف في المستقبل.\n\n💡 ملاحظة: المناديب المرتبطين يمكنهم العمل على أي معرف آخر بحرية تامة.';

    Alert.alert(title, msg, [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تأكيد الحفظ',
        style: newStatus === 'SUSPENDED_PERM' ? 'destructive' : 'default',
        onPress: () => performUpdateStatus(newStatus),
      },
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, isDarkMode && styles.darkContainer]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={isDarkMode ? '#fff' : '#1e293b'} />
            </TouchableOpacity>
            <View style={styles.headerTitleGroup}>
              <View style={styles.titleContainer}>
                <Text style={[styles.title, isDarkMode && styles.darkText]}>
                  {p?.name ? `تفاصيل المعرف: ${formatIdentifierTitleName(p.name)}` : 'تفاصيل المعرف'}
                </Text>
                {p?.code ? <Text style={styles.codeText}>كود: {p.code}</Text> : null}
              </View>
              {p?.name ? (
                <View
                  style={[
                    styles.platformAvatar,
                    {
                      backgroundColor: platform === 'ninja' || platform === 'toyou' ? '#ffffff' : '#fde047',
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
                    style={platform === 'ninja' ? styles.ninjaAvatarImg : platform === 'toyou' ? styles.toyouAvatarImg : styles.keetaAvatarImg}
                    resizeMode={platform === 'keeta' ? 'cover' : 'contain'}
                  />
                </View>
              ) : null}
            </View>
          </View>

          {loading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#0284c7" />
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
              <View style={[mStyles.accountStatusCard, { backgroundColor: accountStatusInfo.bg, borderColor: accountStatusInfo.border }]}>
                <View style={mStyles.accountStatusTopRow}>
                  <View style={mStyles.accountStatusTitleGroup}>
                    <Text style={[mStyles.accountStatusTitle, { color: accountStatusInfo.text }]}>
                      حالة الحساب: {accountStatusInfo.badgeText}
                    </Text>
                  </View>
                  {isAdmin && (
                    <TouchableOpacity
                      style={[
                        mStyles.changeStatusBtn,
                        { borderColor: accountStatusInfo.border, backgroundColor: isDarkMode ? '#1e293b' : '#ffffff' },
                      ]}
                      onPress={() => setShowStatusModal(true)}
                      activeOpacity={0.7}
                    >
                      <Feather name="edit-3" size={13} color={accountStatusInfo.text} />
                      <Text style={[mStyles.changeStatusBtnText, { color: accountStatusInfo.text }]}>تعديل الحالة</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <Text style={[mStyles.accountStatusDesc, { color: isDarkMode ? '#cbd5e1' : '#475569' }]}>
                  {accountStatusInfo.desc}
                </Text>

                <View style={[mStyles.driverNoticeBox, isDarkMode && mStyles.driverNoticeBoxDark]}>
                  <Ionicons name="information-circle-outline" size={17} color={isDarkMode ? '#38bdf8' : '#0284c7'} />
                  <Text style={[mStyles.driverNoticeText, isDarkMode && mStyles.driverNoticeTextDark]}>
                    <Text style={{ fontWeight: '800', color: isDarkMode ? '#38bdf8' : '#0369a1' }}>
                      💡 تنبيه استقلالية المناديب:{' '}
                    </Text>
                    إيقاف الحساب يخص هذا المعرف (اليوزر) فقط. المناديب مستقلون تماماً، ويمكن للمندوب العمل تحت أي معرف آخر بحرية تامة دون أي قيود.
                  </Text>
                </View>
              </View>

              <View style={styles.bannerRow}>
                {statusBadge && (
                  <View style={[styles.badge, { backgroundColor: statusBadge.bg }]}>
                    <Text style={[styles.badgeText, { color: statusBadge.text }]}>{statusBadge.label}</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        p.status === 'TARGET_ACHIEVED'
                          ? '#dbeafe'
                          : p.status === 'ON_TRACK'
                          ? '#ecfdf5'
                          : p.status === 'AT_RISK'
                          ? (isDarkMode ? 'rgba(245, 158, 11, 0.22)' : '#fef3c7')
                          : '#fff1f2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          p.status === 'TARGET_ACHIEVED'
                            ? '#1d4ed8'
                            : p.status === 'ON_TRACK'
                            ? '#047857'
                            : p.status === 'AT_RISK'
                            ? (isDarkMode ? '#fbbf24' : '#b45309')
                            : '#be123c',
                      },
                    ]}
                  >
                    {p.status === 'TARGET_ACHIEVED'
                      ? 'حقق التارچت المطلوب'
                      : p.status === 'ON_TRACK'
                      ? 'مؤهل (يسير بالمعدل)'
                      : p.status === 'AT_RISK'
                      ? 'فرصة قائمة (في المتناول)'
                      : 'غير مؤهل (متأخر)'}
                  </Text>
                </View>
              </View>

              <View style={[styles.card, isDarkMode && styles.darkCard]}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, isDarkMode && styles.darkText]}>نسبة الإنجاز الشهري</Text>
                  <Text style={styles.progressPercent}>{p.achievement_percent}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(0, p.achievement_percent))}%` }]} />
                </View>
                <View style={styles.progressSubRow}>
                  <Text style={styles.subText}>المنفذ: {p.month_orders} طلب</Text>
                  <Text style={styles.subText}>التارچت: {p.monthly_target} طلب</Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <View style={[styles.statBox, isDarkMode && styles.darkCard]}>
                  <Text style={styles.statLabel}>متوسط يومي</Text>
                  <Text style={styles.statValue}>{p.daily_average}</Text>
                  <Text style={styles.statHint}>طلب / يوم</Text>
                </View>
                <View style={[styles.statBox, isDarkMode && styles.darkCard]}>
                  <Text style={styles.statLabel}>المطلوب يومياً</Text>
                  <Text style={[styles.statValue, { color: '#0284c7' }]}>{Math.round(p.daily_required || 0)}</Text>
                  <Text style={styles.statHint}>طلب / يوم</Text>
                </View>
                <View style={[styles.statBox, isDarkMode && styles.darkCard]}>
                  <Text style={styles.statLabel}>توقع الإجمالي</Text>
                  <Text
                    style={[
                      styles.statValue,
                      { color: p.status === 'TARGET_ACHIEVED' ? '#2563eb' : p.status === 'ON_TRACK' ? '#10b981' : p.status === 'AT_RISK' ? '#f59e0b' : '#ef4444' },
                    ]}
                  >
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

              {p.estimated_achievement_date ? (
                <View style={[styles.infoRowCard, isDarkMode && styles.darkCard]}>
                  <Feather name="calendar" size={18} color="#3b82f6" />
                  <Text style={[styles.infoRowText, isDarkMode && styles.darkText]}>تاريخ الوصول المتوقع للتارچت:</Text>
                  <Text style={styles.infoRowValue}>{p.estimated_achievement_date}</Text>
                </View>
              ) : null}

              <View style={styles.sectionHeader}>
                <Ionicons name="people-outline" size={20} color="#0284c7" />
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>
                  تحليل المندوبين المشتركين ({driversBreakdown.length})
                </Text>
              </View>

              {driversBreakdown.length === 0 ? (
                <Text style={styles.emptyText}>لا يوجد مناديب مسجلين لهذا المعرف في هذا الشهر</Text>
              ) : (
                driversBreakdown.map((drv, idx) => (
                  <DriverBreakdownCard
                    key={drv.driver_id || idx}
                    drv={drv}
                    index={idx}
                    month={month}
                    dailyTimeline={details?.daily_timeline}
                    isExpanded={expandedDriverId === drv.driver_id}
                    isDarkMode={isDarkMode}
                    onToggle={() => setExpandedDriverId(expandedDriverId === drv.driver_id ? null : drv.driver_id)}
                  />
                ))
              )}

              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="apps" size={20} color="#0284c7" />
                <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>توزيع الطلبات حسب التطبيقات</Text>
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

      <ModuleErrorBoundary moduleName="تعديل حالة المعرف" onReset={() => setShowStatusModal(false)}>
        <AccountStatusSheetModal
          visible={showStatusModal}
          isDarkMode={isDarkMode}
          statusUpdating={statusUpdating}
          currentAccountStatus={currentAccountStatus}
          identifierName={p?.name}
          onClose={() => setShowStatusModal(false)}
          onSelectStatus={confirmChangeStatus}
        />
      </ModuleErrorBoundary>
    </Modal>
  );
};
