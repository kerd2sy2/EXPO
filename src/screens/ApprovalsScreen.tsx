import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { WorkSession } from '@shared/types';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents } from '@shared/utils/plateUtils';
import {
  supervisorApi,
  PendingAdvanceRequest,
  PendingMaintenanceRequest,
  ReviewSessionParams,
} from '../services/supervisor';

interface ApprovalsScreenProps {
  pendingSessions: WorkSession[];
  pendingAdvances: PendingAdvanceRequest[];
  pendingMaintenance: PendingMaintenanceRequest[];
  loading: boolean;
  onRefresh: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onPreviewPhoto?: (photo: { url: string; title: string }) => void;
}

type ApprovalTab = 'shifts' | 'advances' | 'maintenance';

export const ApprovalsScreen: React.FC<ApprovalsScreenProps> = ({
  pendingSessions,
  pendingAdvances,
  pendingMaintenance,
  loading,
  onRefresh,
  colors,
  isDarkMode,
  isRTL,
  onPreviewPhoto,
}) => {
  const [activeTab, setActiveTab] = useState<ApprovalTab>('shifts');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Edit & Review Shift Modal State
  const [editingSession, setEditingSession] = useState<WorkSession | null>(null);
  const [editOrdersCount, setEditOrdersCount] = useState('');
  const [editFuelCost, setEditFuelCost] = useState('');
  const [editReviewNotes, setEditReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Quick Approve Shift
  const handleApproveShift = async (session: WorkSession) => {
    try {
      setActionLoadingId(session.id);
      await supervisorApi.reviewSession({
        sessionId: session.id,
        isReviewed: true,
        reviewNotes: 'معتمد بواسطة المشرف',
        ordersCount: session.orders_count,
        fuelCost: session.fuel_cost,
      });
      Alert.alert('تم بنجاح', 'تم اعتماد الوردية بنجاح وتحديث السجلات');
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل اعتماد الوردية');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Edit Review Modal
  const openEditModal = (session: WorkSession) => {
    setEditingSession(session);
    setEditOrdersCount(String(session.orders_count || 0));
    setEditFuelCost(String(session.fuel_cost || 0));
    setEditReviewNotes(session.review_notes || 'تمت المراجعة والتعديل بواسطة المشرف');
  };

  const handleSaveEditReview = async () => {
    if (!editingSession) return;
    try {
      setSubmittingReview(true);
      await supervisorApi.reviewSession({
        sessionId: editingSession.id,
        isReviewed: true,
        ordersCount: Number(editOrdersCount) || 0,
        fuelCost: Number(editFuelCost) || 0,
        reviewNotes: editReviewNotes.trim(),
      });
      Alert.alert('تم بنجاح', 'تم تعديل واعتماد الوردية بنجاح');
      setEditingSession(null);
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل حفظ التعديلات');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Maintenance action
  const handleMaintenanceAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setActionLoadingId(id);
      await supervisorApi.updateMaintenanceStatus(id, status);
      Alert.alert('تم', status === 'APPROVED' ? 'تمت الموافقة وإحالة الدباب لمركز الصيانة' : 'تم رفض الطلب');
      onRefresh();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل تحديث طلب الصيانة');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Segmented Top Bar */}
      <View style={[styles.segmentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'shifts' && [styles.activeSegment, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('shifts')}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'shifts' ? '#fff' : colors.textSecondary }]}>
            الورديات ({pendingSessions.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'advances' && [styles.activeSegment, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('advances')}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'advances' ? '#fff' : colors.textSecondary }]}>
            السلف ({pendingAdvances.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'maintenance' && [styles.activeSegment, { backgroundColor: colors.primary }]]}
          onPress={() => setActiveTab('maintenance')}
        >
          <Text style={[styles.segmentText, { color: activeTab === 'maintenance' ? '#fff' : colors.textSecondary }]}>
            الصيانة ({pendingMaintenance.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
      >
        {/* SHIFTS TAB */}
        {activeTab === 'shifts' && (
          <>
            {pendingSessions.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="checkmark-done-circle" size={54} color="#10B981" />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا توجد ورديات معلقة</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  جميع ورديات فرعك معتمدة ومحدثة بالكامل
                </Text>
              </View>
            ) : (
              pendingSessions.map((session) => {
                const isLoading = actionLoadingId === session.id;
                const distance =
                  session.end_km && session.start_km ? Math.max(0, session.end_km - session.start_km) : 0;

                return (
                  <View key={session.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.headerTitleCol}>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                          مندوب: {session.employee_name || session.employee_id}
                        </Text>
                        <Text style={[styles.cardTime, { color: colors.textSecondary }]}>
                          {session.start_time ? new Date(session.start_time).toLocaleDateString('ar-SA') : 'اليوم'}
                        </Text>
                      </View>
                      <View style={[styles.statusTag, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B' }]}>
                        <Text style={styles.statusTagText}>بانتظار الاعتماد</Text>
                      </View>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={[styles.statVal, { color: colors.primary }]}>{session.orders_count || 0}</Text>
                        <Text style={[styles.statLbl, { color: colors.textSecondary }]}>الطلبات</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={[styles.statVal, { color: colors.textPrimary }]}>{distance} كم</Text>
                        <Text style={[styles.statLbl, { color: colors.textSecondary }]}>المسافة</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={[styles.statVal, { color: colors.textPrimary }]}>{session.fuel_cost || 0} ر.س</Text>
                        <Text style={[styles.statLbl, { color: colors.textSecondary }]}>الوقود</Text>
                      </View>
                    </View>

                    {/* Photo previews if available */}
                    {(session.start_km_image || session.end_km_image) && (
                      <View style={styles.photoRow}>
                        {session.start_km_image && (
                          <TouchableOpacity
                            style={styles.photoThumbWrapper}
                            onPress={() =>
                              onPreviewPhoto?.({ url: session.start_km_image!, title: 'عداد البداية' })
                            }
                          >
                            <Image source={{ uri: session.start_km_image }} style={styles.photoThumb} />
                            <Text style={styles.photoThumbLabel}>عداد البدء</Text>
                          </TouchableOpacity>
                        )}
                        {session.end_km_image && (
                          <TouchableOpacity
                            style={styles.photoThumbWrapper}
                            onPress={() =>
                              onPreviewPhoto?.({ url: session.end_km_image!, title: 'عداد النهاية' })
                            }
                          >
                            <Image source={{ uri: session.end_km_image }} style={styles.photoThumb} />
                            <Text style={styles.photoThumbLabel}>عداد الإغلاق</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Action buttons */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.editBtn, { borderColor: colors.border }]}
                        onPress={() => openEditModal(session)}
                      >
                        <Ionicons name="create-outline" size={16} color={colors.textPrimary} />
                        <Text style={[styles.editBtnText, { color: colors.textPrimary }]}>مراجعة وتعديل</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.approveBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => handleApproveShift(session)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text style={styles.approveBtnText}>اعتماد مباشر</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}

        {/* ADVANCES TAB */}
        {activeTab === 'advances' && (
          <>
            {pendingAdvances.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="wallet-outline" size={54} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا توجد طلبات سلف معلقة</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  جميع طلبات السلف تمت معالجتها
                </Text>
              </View>
            ) : (
              pendingAdvances.map((adv) => (
                <View key={adv.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{adv.employee_name}</Text>
                      <Text style={[styles.cardTime, { color: colors.textSecondary }]}>
                        {adv.type === 'internet_advance' ? 'سلفة باقة إنترنت' : 'سلفة مالية شهرية'}
                      </Text>
                    </View>
                    <Text style={[styles.amountText, { color: colors.primary }]}>{adv.amount} ر.س</Text>
                  </View>

                  {adv.reason && (
                    <Text style={[styles.reasonText, { color: colors.textSecondary }]}>
                      السبب: {adv.reason}
                    </Text>
                  )}

                  <View style={styles.actionsRow}>
                    <TouchableOpacity
                      style={[styles.rejectBtn, { borderColor: '#EF4444' }]}
                      onPress={() => Alert.alert('رفض الطلب', 'هل تود رفض طلب السلفة؟')}
                    >
                      <Text style={[styles.rejectBtnText, { color: '#EF4444' }]}>رفض</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.approveBtn, { backgroundColor: '#10B981' }]}
                      onPress={() => Alert.alert('موافقة', 'تم إرسال الموافقة للإدارة المالية')}
                    >
                      <Text style={styles.approveBtnText}>موافقة واعتماد</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* MAINTENANCE TAB */}
        {activeTab === 'maintenance' && (
          <>
            {pendingMaintenance.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="build-outline" size={54} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا توجد طلبات صيانة معلقة</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  أسطول دبابات الفرع في حالة ممتازة
                </Text>
              </View>
            ) : (
              pendingMaintenance.map((maint) => {
                const isLoading = actionLoadingId === maint.id;
                const plate = parsePlateComponents(maint.motorcycle_number || '');

                return (
                  <View key={maint.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                          المندوب: {maint.employee_name || 'غير محدد'}
                        </Text>
                        <Text style={[styles.cardTime, { color: colors.textSecondary }]}>
                          {new Date(maint.created_at).toLocaleDateString('ar-SA')}
                        </Text>
                      </View>
                      <SaudiPlateView
                        digits={plate.digits}
                        letters={plate.letters}
                        editable={false}
                        scale={0.65}
                        isDarkMode={isDarkMode}
                      />
                    </View>

                    <View style={styles.issueBox}>
                      <Text style={[styles.issueLabel, { color: colors.textSecondary }]}>وصف العطل المبلغ عنه:</Text>
                      <Text style={[styles.issueText, { color: colors.textPrimary }]}>{maint.issue_description}</Text>
                    </View>

                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={[styles.rejectBtn, { borderColor: '#EF4444' }]}
                        onPress={() => handleMaintenanceAction(maint.id, 'REJECTED')}
                        disabled={isLoading}
                      >
                        <Text style={[styles.rejectBtnText, { color: '#EF4444' }]}>رفض</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.approveBtn, { backgroundColor: '#10B981' }]}
                        onPress={() => handleMaintenanceAction(maint.id, 'APPROVED')}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.approveBtnText}>إحالة للورشة والعهدة</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>

      {/* Edit & Review Modal */}
      <Modal visible={!!editingSession} transparent animationType="slide" onRequestClose={() => setEditingSession(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>مراجعة وتعديل بيانات الوردية</Text>
              <TouchableOpacity onPress={() => setEditingSession(null)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>عدد الطلبات الفعلي</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                keyboardType="numeric"
                value={editOrdersCount}
                onChangeText={setEditOrdersCount}
              />

              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>تكلفة الوقود المعتمدة (ريال)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                keyboardType="numeric"
                value={editFuelCost}
                onChangeText={setEditFuelCost}
              />

              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>ملاحظات الاعتماد والتدقيق</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.bg, color: colors.textPrimary, borderColor: colors.border }]}
                multiline
                numberOfLines={3}
                value={editReviewNotes}
                onChangeText={setEditReviewNotes}
              />
            </ScrollView>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={handleSaveEditReview}
              disabled={submittingReview}
            >
              {submittingReview ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>تأكيد التعديل والاعتماد</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegment: {},
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
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
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
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
  headerTitleCol: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardTime: {
    fontSize: 12,
  },
  statusTag: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusTagText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#6B728025',
  },
  statBox: {
    alignItems: 'center',
    gap: 2,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  statLbl: {
    fontSize: 11,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  photoThumbWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  photoThumb: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  photoThumbLabel: {
    fontSize: 10,
    color: '#6B7280',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  approveBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  rejectBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  issueBox: {
    backgroundColor: '#6B728010',
    padding: 10,
    borderRadius: 10,
    gap: 4,
  },
  issueLabel: {
    fontSize: 11,
  },
  issueText: {
    fontSize: 13,
    fontWeight: '600',
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
    maxHeight: '80%',
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
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
  saveBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});
