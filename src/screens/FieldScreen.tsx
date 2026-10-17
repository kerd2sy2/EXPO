import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  Image,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents } from '@shared/utils/plateUtils';
import {
  DelegateWithStatus,
  supervisorApi,
  SupervisorStartShiftParams,
  SupervisorEndShiftParams,
} from '../services/supervisor';

interface FieldScreenProps {
  delegates: DelegateWithStatus[];
  loading: boolean;
  onRefresh: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onOverrideSuccess?: () => void;
}

type FilterTab = 'all' | 'working' | 'idle';

export const FieldScreen: React.FC<FieldScreenProps> = ({
  delegates,
  loading,
  onRefresh,
  colors,
  isDarkMode,
  isRTL,
  onOverrideSuccess,
}) => {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Override Modal state
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateWithStatus | null>(null);
  const [modalMode, setModalMode] = useState<'start' | 'end'>('start');
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form Fields for Override
  const [startKm, setStartKm] = useState('');
  const [motorcycleNumber, setMotorcycleNumber] = useState('');
  const [endKm, setEndKm] = useState('');
  const [ordersCount, setOrdersCount] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [overrideReason, setOverrideReason] = useState('عطل بهاتف المندوب');
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');

  const REASON_PRESETS_START = [
    'عطل بهاتف المندوب',
    'مشكلة في تطبيق المندوب أو الاتصال',
    'توجيه إداري ميداني عاجل',
    'فقدان أو كسر الجهاز',
  ];

  const REASON_PRESETS_END = [
    'عطل بهاتف المندوب عند الإغلاق',
    'نفاد شحن هاتف المندوب',
    'اعتماد وإنهاء يدوي مباشر بطلب المشرف',
    'حالة طوارئ ميدانية',
  ];

  const openOverrideModal = (del: DelegateWithStatus, mode: 'start' | 'end') => {
    setSelectedDelegate(del);
    setModalMode(mode);
    setErrorMessage('');
    setStartKm('');
    setMotorcycleNumber(del.motorcycle_number || '');
    setEndKm('');
    setOrdersCount('');
    setFuelCost('');
    setNotes('');
    setCustomReason('');
    setOverrideReason(mode === 'start' ? REASON_PRESETS_START[0] : REASON_PRESETS_END[0]);
    setModalVisible(true);
  };

  const closeOverrideModal = () => {
    if (submitting) return;
    setModalVisible(false);
    setSelectedDelegate(null);
  };

  const handleSubmitOverride = async () => {
    if (!selectedDelegate) return;
    setErrorMessage('');

    const finalReason = customReason.trim() ? customReason.trim() : overrideReason;

    try {
      setSubmitting(true);
      if (modalMode === 'start') {
        const kmVal = Number(startKm);
        if (isNaN(kmVal) || kmVal <= 0) {
          setErrorMessage('يرجى إدخال قراءة عداد صحيحة للبدء');
          setSubmitting(false);
          return;
        }

        const params: SupervisorStartShiftParams = {
          employeeId: selectedDelegate.id,
          startKm: kmVal,
          motorcycleNumber: motorcycleNumber.trim() || selectedDelegate.motorcycle_number,
          overrideReason: finalReason,
          notes: notes.trim(),
        };

        await supervisorApi.startShiftOverride(params);
        Alert.alert('نجاح', `تم بدء الوردية استثنائياً للمندوب ${selectedDelegate.name}`);
      } else {
        const endKmVal = Number(endKm);
        if (isNaN(endKmVal) || endKmVal <= 0) {
          setErrorMessage('يرجى إدخال قراءة العداد النهائية');
          setSubmitting(false);
          return;
        }

        const ordersVal = Number(ordersCount) || 0;
        const fuelVal = Number(fuelCost) || 0;

        const params: SupervisorEndShiftParams = {
          employeeId: selectedDelegate.id,
          endKm: endKmVal,
          ordersCount: ordersVal,
          fuelCost: fuelVal,
          overrideReason: finalReason,
          reviewNotes: notes.trim(),
        };

        await supervisorApi.endShiftOverride(params);
        Alert.alert('نجاح', `تم إنهاء واعتماد وردية المندوب ${selectedDelegate.name}`);
      }

      setModalVisible(false);
      if (onOverrideSuccess) onOverrideSuccess();
      onRefresh();
    } catch (err: any) {
      console.error('[FieldScreen] Override error:', err);
      const msg = err?.message || 'حدث خطأ أثناء تنفيذ التدخل الاستثنائي';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Exclude supervisors and administrators from branch delegates so only actual drivers appear
  const branchDriversOnly = useMemo(() => {
    return (delegates || []).filter((del) => {
      const role = (del.job_role || (del as any).role_name || '').toUpperCase();
      return role === 'DRIVER' || (!role.includes('SUPERVISOR') && !role.includes('ADMIN'));
    });
  }, [delegates]);

  // 2. Cross-branch search state ("التركاية": فروع أخرى تظهر فقط عند البحث)
  const [remoteSearchResults, setRemoteSearchResults] = useState<DelegateWithStatus[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setRemoteSearchResults([]);
      setIsSearchingRemote(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingRemote(true);
        const results = await supervisorApi.searchDelegates(q);
        setRemoteSearchResults(results);
      } catch (err) {
        console.warn('[FieldScreen] search error:', err);
      } finally {
        setIsSearchingRemote(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Combined list: default is ONLY supervisor's branch. When searching, include cross-branch matches.
  const activeDelegatesPool = useMemo(() => {
    if (!searchQuery.trim()) {
      return branchDriversOnly;
    }

    const map = new Map<string, DelegateWithStatus>();
    // First, local branch drivers
    branchDriversOnly.forEach((d) => map.set(d.id, d));
    // Second, remote drivers matching query (from any branch)
    remoteSearchResults.forEach((d) => {
      if (!map.has(d.id)) {
        map.set(d.id, d);
      }
    });

    return Array.from(map.values());
  }, [branchDriversOnly, remoteSearchResults, searchQuery]);

  // Filter delegates by active tab and search query
  const filteredDelegates = useMemo(() => {
    return activeDelegatesPool.filter((del) => {
      // Tab filter
      if (filter === 'working' && !del.is_working) return false;
      if (filter === 'idle' && del.is_working) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = del.name?.toLowerCase().includes(q);
        const matchPhone = del.phone?.includes(q);
        const matchId = del.national_id?.includes(q);
        const matchBike = del.motorcycle_number?.toLowerCase().includes(q);
        const matchBranch = (del.branch_name || '').toLowerCase().includes(q);
        return matchName || matchPhone || matchId || matchBike || matchBranch;
      }
      return true;
    });
  }, [activeDelegatesPool, filter, searchQuery]);

  const workingCount = branchDriversOnly.filter((d) => d.is_working).length;
  const idleCount = Math.max(0, branchDriversOnly.length - workingCount);

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Search Bar */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
          placeholder="ابحث بالاسم، الهوية، الجوال أو رقم الدباب (بحث عام بكافة الفروع)..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {isSearchingRemote ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginHorizontal: 6 }} />
        ) : searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            filter === 'all' && [styles.activeTabItem, { borderColor: colors.primary, backgroundColor: colors.primary + '15' }],
          ]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.tabLabel, { color: filter === 'all' ? colors.primary : colors.textSecondary }]}>
            الكل ({delegates.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            filter === 'working' && [styles.activeTabItem, { borderColor: '#10B981', backgroundColor: '#10B98115' }],
          ]}
          onPress={() => setFilter('working')}
        >
          <View style={styles.tabBadgeRow}>
            <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.tabLabel, { color: filter === 'working' ? '#10B981' : colors.textSecondary }]}>
              في الميدان ({workingCount})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            filter === 'idle' && [styles.activeTabItem, { borderColor: '#6B7280', backgroundColor: '#6B728015' }],
          ]}
          onPress={() => setFilter('idle')}
        >
          <View style={styles.tabBadgeRow}>
            <View style={[styles.statusDot, { backgroundColor: '#9CA3AF' }]} />
            <Text style={[styles.tabLabel, { color: filter === 'idle' ? colors.textPrimary : colors.textSecondary }]}>
              لم يبدأوا ({idleCount})
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Delegates List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {filteredDelegates.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>لا يوجد مناديب مطابقين للبحث</Text>
          </View>
        ) : (
          filteredDelegates.map((del) => {
            const isWorking = !!del.is_working;
            const plate = parsePlateComponents(del.motorcycle_number || '');

            return (
              <View
                key={del.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: isWorking ? '#10B98140' : colors.border,
                  },
                ]}
              >
                {/* Header: Avatar, Name, Status Badge */}
                <View style={styles.cardHeader}>
                  <View style={styles.delegateInfoRow}>
                    <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '20' }]}>
                      {(del.photo_url || del.personal_image) ? (
                        <Image source={{ uri: del.photo_url || del.personal_image }} style={styles.avatarImg} />
                      ) : (
                        <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                          {del.name ? del.name.charAt(0) : 'م'}
                        </Text>
                      )}
                    </View>
                    <View style={styles.nameBlock}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.delName, { color: colors.textPrimary }]}>{del.name}</Text>
                        {del.branch_name ? (
                          <View style={[styles.branchPill, { backgroundColor: colors.primaryLight }]}>
                            <Text style={[styles.branchPillText, { color: colors.primary }]}>{del.branch_name}</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={[styles.delPhone, { color: colors.textSecondary }]}>
                        {del.phone || del.national_id}
                      </Text>
                    </View>
                  </View>

                  {/* Status Indicator */}
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isWorking ? '#10B98115' : '#6B728015',
                        borderColor: isWorking ? '#10B981' : '#9CA3AF',
                      },
                    ]}
                  >
                    <View style={[styles.statusDot, { backgroundColor: isWorking ? '#10B981' : '#9CA3AF' }]} />
                    <Text style={[styles.statusText, { color: isWorking ? '#10B981' : '#6B7280' }]}>
                      {isWorking ? 'في الميدان' : 'لم يبدأ'}
                    </Text>
                  </View>
                </View>

                {/* Body: Bike Plate & Zone Flags */}
                <View style={styles.cardBody}>
                  <View style={styles.bikeSection}>
                    <Text style={[styles.bikeLabel, { color: colors.textSecondary }]}>الدباب المسجل:</Text>
                    {del.motorcycle_number ? (
                      <SaudiPlateView
                        digits={plate.digits}
                        letters={plate.letters}
                        editable={false}
                        scale={0.65}
                        isDarkMode={isDarkMode}
                      />
                    ) : (
                      <Text style={[styles.noBikeText, { color: colors.textSecondary }]}>غير مسجل</Text>
                    )}
                  </View>

                  {del.out_of_zone && (
                    <View style={styles.warningFlag}>
                      <Ionicons name="warning" size={14} color="#EF4444" />
                      <Text style={styles.warningFlagText}>خارج النطاق الميداني</Text>
                    </View>
                  )}
                </View>

                {/* Footer Action Buttons */}
                <View style={styles.cardFooter}>
                  {isWorking ? (
                    <TouchableOpacity
                      style={[styles.overrideBtn, { backgroundColor: '#EF444415', borderColor: '#EF4444' }]}
                      onPress={() => openOverrideModal(del, 'end')}
                    >
                      <Ionicons name="stop-circle" size={18} color="#EF4444" />
                      <Text style={[styles.overrideBtnText, { color: '#EF4444' }]}>إنهاء الوردية استثنائياً</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.overrideBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}
                      onPress={() => openOverrideModal(del, 'start')}
                    >
                      <Ionicons name="play-circle" size={18} color={colors.primary} />
                      <Text style={[styles.overrideBtnText, { color: colors.primary }]}>بدء الوردية استثنائياً</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Supervisor Shift Override Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeOverrideModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleBlock}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {modalMode === 'start' ? 'بدء وردية استثنائي' : 'إنهاء وردية استثنائي'}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  المندوب: {selectedDelegate?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={closeOverrideModal} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {errorMessage.length > 0 && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#EF4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
              {modalMode === 'start' ? (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>قراءة العداد الحالية (كم) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                    keyboardType="numeric"
                    placeholder="مثال: 45200"
                    placeholderTextColor={colors.textSecondary}
                    value={startKm}
                    onChangeText={setStartKm}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>رقم لوحة الدباب</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="مثال: 7030 ب ع"
                    placeholderTextColor={colors.textSecondary}
                    value={motorcycleNumber}
                    onChangeText={setMotorcycleNumber}
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>قراءة العداد النهائية (كم) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                    keyboardType="numeric"
                    placeholder="مثال: 45310"
                    placeholderTextColor={colors.textSecondary}
                    value={endKm}
                    onChangeText={setEndKm}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>عدد الطلبات المنجزة *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                    keyboardType="numeric"
                    placeholder="مثال: 18"
                    placeholderTextColor={colors.textSecondary}
                    value={ordersCount}
                    onChangeText={setOrdersCount}
                  />

                  <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>تكلفة البنزين (ريال)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                    keyboardType="numeric"
                    placeholder="مثال: 25"
                    placeholderTextColor={colors.textSecondary}
                    value={fuelCost}
                    onChangeText={setFuelCost}
                  />
                </>
              )}

              {/* Override Reason Presets */}
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>سبب التدخل الاستثنائي *</Text>
              <View style={styles.presetsContainer}>
                {(modalMode === 'start' ? REASON_PRESETS_START : REASON_PRESETS_END).map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[
                      styles.presetBadge,
                      {
                        backgroundColor: overrideReason === preset ? colors.primary + '20' : colors.bg,
                        borderColor: overrideReason === preset ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setOverrideReason(preset);
                      setCustomReason('');
                    }}
                  >
                    <Text
                      style={[
                        styles.presetText,
                        { color: overrideReason === preset ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      {preset}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border, marginTop: 8 }]}
                placeholder="أو اكتب سبب آخر مخصص..."
                placeholderTextColor={colors.textSecondary}
                value={customReason}
                onChangeText={setCustomReason}
              />

              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>ملاحظات المشرف</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                multiline
                numberOfLines={3}
                placeholder="ملاحظات توثيقية إضافية..."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: modalMode === 'start' ? colors.primary : '#EF4444' }]}
                onPress={handleSubmitOverride}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {modalMode === 'start' ? 'تأكيد بدء الوردية' : 'تأكيد إنهاء واعتماد الوردية'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTabItem: {
    borderWidth: 1,
  },
  tabBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  delegateInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
  },
  nameBlock: {
    gap: 2,
  },
  delName: {
    fontSize: 15,
    fontWeight: '800',
  },
  delPhone: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bikeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bikeLabel: {
    fontSize: 12,
  },
  noBikeText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  warningFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EF444415',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  warningFlagText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
  },
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#6B728030',
    paddingTop: 10,
  },
  overrideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  overrideBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitleBlock: {
    gap: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 13,
  },
  modalCloseBtn: {
    padding: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EF444415',
    borderColor: '#EF4444',
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  modalBody: {
    maxHeight: 420,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    height: 70,
    textAlignVertical: 'top',
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalFooter: {
    marginTop: 16,
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  branchPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  branchPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
