import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, WorkSession, PreviewPhotoData } from '../types/delegate';
import {
  PendingAdvanceRequest,
  PendingMaintenanceRequest,
  DelegateWithStatus,
  supervisorApi,
} from '../services/supervisor';
import { formatImageUrl } from '../services/api';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';

interface ApprovalsScreenProps {
  pendingSessions: WorkSession[];
  pendingAdvances: PendingAdvanceRequest[];
  pendingMaintenance: PendingMaintenanceRequest[];
  employees?: DelegateWithStatus[];
  loading: boolean;
  onRefresh: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  targetSessionId?: string | null;
  targetEmployeeId?: string | null;
  onClearTargetSession?: () => void;
}



const formatTimeOnly = (iso?: string) => {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
};

const formatDateTimeFull = (iso?: string) => {
  if (!iso) return '---';
  try {
    const d = new Date(iso);
    const datePart = d.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timePart = d.toLocaleTimeString('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} • ${timePart}`;
  } catch {
    return iso;
  }
};

const calcShiftHours = (startIso?: string, endIso?: string) => {
  if (!startIso || !endIso) return '0 س';
  try {
    const diffMs = new Date(endIso).getTime() - new Date(startIso).getTime();
    if (diffMs <= 0) return '0 س';
    const totalMins = Math.floor(diffMs / 60000);
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (hrs === 0) return `${mins} د`;
    return mins > 0 ? `${hrs} س ${mins} د` : `${hrs} ساعة`;
  } catch {
    return '0 س';
  }
};

export const ApprovalsScreen: React.FC<ApprovalsScreenProps> = ({
  pendingSessions,
  pendingAdvances,
  pendingMaintenance,
  employees = [],
  loading,
  onRefresh,
  colors,
  isDarkMode,
  isRTL,
  onPreviewPhoto,
  targetSessionId,
  targetEmployeeId,
  onClearTargetSession,
}) => {
  
  const [selectedSession, setSelectedSession] = useState<WorkSession | null>(null);
  const [editedOrders, setEditedOrders] = useState('');
  const [editedFuel, setEditedFuel] = useState('');
  const [editedStartKm, setEditedStartKm] = useState('');
  const [editedEndKm, setEditedEndKm] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Employee lookup map for Application ID (المعرف) & Key Number (مفتاح رقم)
  const employeeMap = useMemo(() => {
    const map = new Map<string, DelegateWithStatus>();
    employees.forEach((e) => {
      if (e.id) map.set(String(e.id), e);
    });
    return map;
  }, [employees]);

  // Filter ONLY completed shifts and sort descending by end_time (newest finished first)
  const sortedCompletedPendingSessions = useMemo(() => {
    return pendingSessions
      .filter((s) => s.status === 'COMPLETED' && Boolean(s.end_time))
      .sort((a, b) => {
        const tB = new Date(b.end_time || b.start_time || 0).getTime();
        const tA = new Date(a.end_time || a.start_time || 0).getTime();
        return tB - tA;
      });
  }, [pendingSessions]);

  // Auto-open review modal when navigated from a push notification
  useEffect(() => {
    if (!targetSessionId && !targetEmployeeId) return;
    if (sortedCompletedPendingSessions.length === 0) return;

    let match = targetSessionId
      ? sortedCompletedPendingSessions.find((s) => String(s.id) === String(targetSessionId))
      : undefined;

    if (!match && targetEmployeeId) {
      match = sortedCompletedPendingSessions.find(
        (s) => String(s.employee_id) === String(targetEmployeeId)
      );
    }

    if (match) {
      openSessionModal(match);
      onClearTargetSession?.();
    }
  }, [targetSessionId, targetEmployeeId, sortedCompletedPendingSessions]);

  const openSessionModal = (session: WorkSession) => {
    setSelectedSession(session);
    setEditedOrders(String(session.orders_count ?? 0));
    setEditedFuel(String(session.fuel_cost ?? 0));
    setEditedStartKm(String(session.start_km ?? 0));
    setEditedEndKm(String(session.end_km ?? 0));
    setReviewNotes(session.review_notes || '');
  };

  const handleConfirmSession = async () => {
    if (!selectedSession) return;
    const startVal = Number(toEnglishDigits(editedStartKm)) || 0;
    const endVal = Number(toEnglishDigits(editedEndKm)) || 0;

    if (endVal > 0 && endVal < startVal) {
      showBottomAlert({
        type: 'warning',
        title: 'تنبيه قراءة العداد',
        message: 'كيلو النهاية لا يمكن أن يكون أقل من كيلو البداية.',
      });
      return;
    }

    try {
      setSubmitting(true);
      await supervisorApi.reviewSession({
        sessionId: selectedSession.id,
        isReviewed: true,
        ordersCount: Number(toEnglishDigits(editedOrders)) || 0,
        fuelCost: Number(toEnglishDigits(editedFuel)) || 0,
        startKm: startVal,
        endKm: endVal,
        reviewNotes: reviewNotes.trim() || 'تمت المراجعة والاعتماد من المشرف',
      });
      const empName =
        selectedSession.employee_name ||
        selectedSession.employee?.name ||
        employeeMap.get(String(selectedSession.employee_id))?.name ||
        'المندوب';
      setSelectedSession(null);
      onRefresh();
      setTimeout(() => {
        showBottomAlert({
          type: 'success',
          title: 'تم الاعتماد بنجاح',
          message: `تم اعتماد شفت وطلبات المندوب (${empName}) بنجاح.`,
        });
      }, 150);
    } catch (e: any) {
      showBottomAlert({
        type: 'error',
        title: 'فشل الاعتماد',
        message: e?.message || 'حدث خطأ أثناء اعتماد الوردية، يرجى المحاولة مرة أخرى.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickApproveSession = async (session: WorkSession) => {
    try {
      setSubmitting(true);
      await supervisorApi.reviewSession({
        sessionId: session.id,
        isReviewed: true,
        ordersCount: Number(session.orders_count ?? 0),
        fuelCost: Number(session.fuel_cost ?? 0),
        startKm: Number(session.start_km ?? 0),
        endKm: Number(session.end_km ?? 0),
        reviewNotes: 'اعتماد سريع من المشرف',
      });
      const empName =
        session.employee_name ||
        session.employee?.name ||
        employeeMap.get(String(session.employee_id))?.name ||
        'المندوب';
      onRefresh();
      showBottomAlert({
        type: 'success',
        title: 'تم الاعتماد',
        message: `تم اعتماد وردية (${empName}) بنجاح.`,
      });
    } catch (e: any) {
      showBottomAlert({
        type: 'error',
        title: 'خطأ في الاعتماد',
        message: e?.message || 'تعذر اعتماد الوردية.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInvestigationDecision = async (id: string, approve: boolean) => {
    try {
      setSubmitting(true);
      if (approve) {
        await supervisorApi.approveInvestigation(id);
      } else {
        await supervisorApi.rejectInvestigation(id, 'مرفوض من المشرف');
      }
      onRefresh();
      showBottomAlert({
        type: 'success',
        title: approve ? 'تمت الموافقة' : 'تم الرفض',
        message: approve ? 'تمت الموافقة على الطلب بنجاح.' : 'تم رفض الطلب.',
      });
    } catch (e: any) {
      showBottomAlert({
        type: 'error',
        title: 'خطأ',
        message: e?.message || 'فشل تنفيذ الإجراء.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaintenanceDecision = async (id: string, approve: boolean) => {
    try {
      setSubmitting(true);
      await supervisorApi.updateMaintenanceStatus(
        id,
        approve ? 'APPROVED' : 'REJECTED',
        approve ? 'موافق على الصيانة' : 'مرفوض'
      );
      onRefresh();
      showBottomAlert({
        type: 'success',
        title: approve ? 'تمت الموافقة' : 'تم الرفض',
        message: approve ? 'تم اعتماد طلب الصيانة بنجاح.' : 'تم رفض طلب الصيانة.',
      });
    } catch (e: any) {
      showBottomAlert({
        type: 'error',
        title: 'خطأ',
        message: e?.message || 'فشل تنفيذ الإجراء.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* COMPLETED SHIFTS FOR ORDERS APPROVAL */}
        {sortedCompletedPendingSessions.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: '#10b98118' }]}>
                  <Ionicons name="checkmark-done-outline" size={38} color="#10b981" />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  تم اعتماد جميع الشفتات المنتهية
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  لا توجد ورديات منتهية بانتظار المراجعة حالياً
                </Text>
              </View>
            ) : (
              sortedCompletedPendingSessions.map((session) => {
                const empRecord = employeeMap.get(String(session.employee_id));
                const empName =
                  session.employee_name ||
                  session.employee?.name ||
                  empRecord?.name ||
                  'مندوب';
                const keyNum =
                  (session as any).key_number ||
                  (session.employee as any)?.key_number ||
                  empRecord?.key_number ||
                  '';
                const appId =
                  (session as any).application_id ||
                  (session.employee as any)?.application_id ||
                  empRecord?.application_id ||
                  '---';
                const startKmVal = Number(session.start_km ?? 0);
                const endKmVal = Number(session.end_km ?? 0);
                const distanceKm =
                  endKmVal >= startKmVal && endKmVal > 0
                    ? endKmVal - startKmVal
                    : Number((session as any).total_km ?? session.distance ?? 0);
                const hoursLabel = calcShiftHours(session.start_time, session.end_time);

                // The 9 ordered metrics requested by user:
                // 1. وقت البداية | 2. كيلو البداية | 3. وقت النهاية | 4. كيلو النهاية | 5. عدد الكيلوات | 6. الطلبات | 7. الساعات | 8. بنزين | 9. المعرف
                const orderedMetrics = [
                  { label: '1. وقت البداية', value: formatTimeOnly(session.start_time), icon: 'play-circle-outline', color: '#0284c7' },
                  { label: '2. كيلو البداية', value: `${startKmVal} كم`, icon: 'speedometer-outline', color: '#0284c7' },
                  { label: '3. وقت النهاية', value: formatTimeOnly(session.end_time), icon: 'stop-circle-outline', color: '#6366f1' },
                  { label: '4. كيلو النهاية', value: `${endKmVal} كم`, icon: 'flag-outline', color: '#6366f1' },
                  { label: '5. عدد الكيلوات', value: `${distanceKm} كم`, icon: 'analytics-outline', color: '#0d9488' },
                  { label: '6. الطلبات', value: `${session.orders_count ?? 0} طلب`, icon: 'bag-check-outline', color: '#10b981', highlight: true },
                  { label: '7. الساعات', value: hoursLabel, icon: 'time-outline', color: '#8b5cf6' },
                  { label: '8. بنزين', value: `${session.fuel_cost ?? 0} ر.س`, icon: 'flame-outline', color: '#f59e0b' },
                  { label: '9. المعرف', value: String(appId), icon: 'id-card-outline', color: '#ec4899' },
                ];

                return (
                  <View
                    key={session.id}
                    style={[
                      styles.approvalCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {/* Header: Courier Name, Key Badge, Completion Timestamp */}
                    <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.empBadgeCircle, { backgroundColor: colors.primary + '18' }]}>
                        <Ionicons name="person" size={18} color={colors.primary} />
                      </View>

                      <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <View style={[styles.nameAndKeyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                            {empName}
                          </Text>
                          {!!keyNum && (
                            <View style={[styles.keyPill, { backgroundColor: '#f59e0b18', borderColor: '#f59e0b50', flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                              <Ionicons name="key" size={11} color="#d97706" />
                              <Text style={styles.keyPillText}>مفتاح {keyNum}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.cardTimestamp, { color: colors.textSecondary }]}>
                          انتهى: {formatDateTimeFull(session.end_time || session.start_time)} • الدباب: {session.motorcycle_number || '---'}
                        </Text>
                      </View>
                    </View>

                    {/* 9 Ordered Shift Metrics Grid (3x3 Structured Layout) */}
                    <View style={[styles.orderedGrid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
                      {orderedMetrics.map((m, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.metricCell,
                            {
                              backgroundColor: m.highlight
                                ? isDarkMode
                                  ? 'rgba(16, 185, 129, 0.14)'
                                  : '#ecfdf5'
                                : isDarkMode
                                ? '#1e293b'
                                : '#f8fafc',
                              borderColor: m.highlight ? '#10b98150' : colors.border,
                            },
                          ]}
                        >
                          <View style={[styles.metricTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                            <Ionicons name={m.icon as any} size={13} color={m.color} />
                            <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>
                              {m.label}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.metricValue,
                              { color: m.highlight ? '#10b981' : colors.textPrimary },
                            ]}
                            numberOfLines={1}
                          >
                            {m.value}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Odometer Photos Strip (if available) */}
                    {(session.start_km_image || session.end_km_image) && (
                      <View style={[styles.photosRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        {!!session.start_km_image && (
                          <TouchableOpacity
                            style={[styles.photoThumbBtn, { borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                            onPress={() =>
                              onPreviewPhoto({
                                url: formatImageUrl(session.start_km_image) || '',
                                title: `عداد البداية (${startKmVal} كم) - ${empName}`,
                              })
                            }
                          >
                            <Image
                              source={{ uri: formatImageUrl(session.start_km_image) || '' }}
                              style={styles.miniThumb}
                              contentFit="cover"
                            />
                            <Text style={[styles.photoThumbText, { color: colors.textPrimary }]}>
                              صورة البداية
                            </Text>
                          </TouchableOpacity>
                        )}

                        {!!session.end_km_image && (
                          <TouchableOpacity
                            style={[styles.photoThumbBtn, { borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                            onPress={() =>
                              onPreviewPhoto({
                                url: formatImageUrl(session.end_km_image) || '',
                                title: `عداد النهاية (${endKmVal} كم) - ${empName}`,
                              })
                            }
                          >
                            <Image
                              source={{ uri: formatImageUrl(session.end_km_image) || '' }}
                              style={styles.miniThumb}
                              contentFit="cover"
                            />
                            <Text style={[styles.photoThumbText, { color: colors.textPrimary }]}>
                              صورة النهاية
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}

                    {/* Action Buttons: Edit/Review or Quick Approve */}
                    <View style={[styles.cardActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity
                        style={[styles.approveDirectBtn, { backgroundColor: '#10b981' }]}
                        onPress={() => handleQuickApproveSession(session)}
                        disabled={submitting}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                        <Text style={styles.approveDirectBtnText}>اعتماد فوري</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.editReviewBtn,
                          {
                            backgroundColor: colors.primary + '15',
                            borderColor: colors.primary + '40',
                          },
                        ]}
                        onPress={() => openSessionModal(session)}
                        disabled={submitting}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="create-outline" size={17} color={colors.primary} />
                        <Text style={[styles.editReviewBtnText, { color: colors.primary }]}>
                          تعديل ومراجعة
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
        </ScrollView>

      {/* Shift Edit & Review Modal */}
      <Modal
        visible={Boolean(selectedSession)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedSession(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                مراجعة وتعديل بيانات الشفت
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedSession(null)}
                style={[styles.closeIconBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedSession && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* Summary Strip */}
                <View
                  style={[
                    styles.modalSummaryBanner,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.modalEmpName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {selectedSession.employee_name || selectedSession.employee?.name || 'مندوب'}
                  </Text>
                  <Text style={[styles.modalSubMeta, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    وقت البداية: {formatDateTimeFull(selectedSession.start_time)}
                  </Text>
                  <Text style={[styles.modalSubMeta, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    وقت النهاية: {formatDateTimeFull(selectedSession.end_time)}
                  </Text>
                </View>

                {/* Editable KM Row */}
                <View style={[styles.modalDualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      كيلو البداية
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          textAlign: 'center',
                        },
                      ]}
                      keyboardType="numeric"
                      value={editedStartKm}
                      onChangeText={(v) => setEditedStartKm(toEnglishDigits(v))}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      كيلو النهاية
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          textAlign: 'center',
                        },
                      ]}
                      keyboardType="numeric"
                      value={editedEndKm}
                      onChangeText={(v) => setEditedEndKm(toEnglishDigits(v))}
                    />
                  </View>
                </View>

                {/* Editable Orders & Fuel Row */}
                <View style={[styles.modalDualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      عدد الطلبات
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.primary,
                          color: colors.textPrimary,
                          textAlign: 'center',
                        },
                      ]}
                      keyboardType="numeric"
                      value={editedOrders}
                      onChangeText={(v) => setEditedOrders(toEnglishDigits(v))}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      تكلفة البنزين (ر.س)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          textAlign: 'center',
                        },
                      ]}
                      keyboardType="numeric"
                      value={editedFuel}
                      onChangeText={(v) => setEditedFuel(toEnglishDigits(v))}
                    />
                  </View>
                </View>

                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  ملاحظات المشرف
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                  placeholder="أضف ملاحظة (اختياري)..."
                  placeholderTextColor={colors.textSecondary}
                  value={reviewNotes}
                  onChangeText={setReviewNotes}
                />

                <TouchableOpacity
                  style={[styles.confirmModalBtn, { backgroundColor: '#10b981' }]}
                  onPress={handleConfirmSession}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle" size={20} color="#ffffff" />
                      <Text style={styles.confirmModalBtnText}>حفظ واعتماد الشفت</Text>
                    </>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
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
  topTabsWrapper: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  subTabsBar: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
  },
  approvalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardHeader: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  empBadgeCircle: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameAndKeyRow: {
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  keyPill: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  keyPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#d97706',
  },
  cardTimestamp: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  orderedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  metricCell: {
    width: '31.8%',
    borderRadius: 11,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  metricTopRow: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  photosRow: {
    gap: 8,
    marginBottom: 12,
  },
  photoThumbBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 6,
    alignItems: 'center',
    gap: 8,
  },
  miniThumb: {
    width: 34,
    height: 34,
    borderRadius: 7,
  },
  photoThumbText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardActionsRow: {
    gap: 8,
  },
  approveDirectBtn: {
    flex: 1.2,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveDirectBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  editReviewBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editReviewBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeaderRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSummaryBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    gap: 3,
  },
  modalEmpName: {
    fontSize: 15,
    fontWeight: '800',
  },
  modalSubMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalDualRow: {
    gap: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    height: 44,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: '700',
  },
  confirmModalBtn: {
    height: 48,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    marginBottom: 8,
  },
  confirmModalBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
