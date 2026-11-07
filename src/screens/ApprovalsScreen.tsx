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
import { targetApi } from '../services/targetApi';
import { IdentifierPerformance } from '../types/target';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';
import { DatePickerBottomSheet } from '../components/modals/DatePickerBottomSheet';

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

const toDateStr = (iso?: string): string => {
  if (!iso) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

const toTimeStr = (iso?: string): string => {
  if (!iso) return '00:00';
  try {
    const d = new Date(iso);
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  } catch {
    return '00:00';
  }
};

const combineDateTimeIso = (dateStr: string, timeStr: string): string => {
  try {
    const cleanDate = (dateStr || '').trim() || new Date().toISOString().split('T')[0];
    let cleanTime = (timeStr || '').trim() || '00:00';
    if (!cleanTime.includes(':')) cleanTime = `${cleanTime}:00`;
    const [h, m] = cleanTime.split(':');
    const [year, month, day] = cleanDate.split('-').map(Number);
    const d = new Date(year, month - 1, day, Number(h) || 0, Number(m) || 0, 0);
    return d.toISOString();
  } catch {
    return new Date().toISOString();
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
  // Active review modal state
  const [selectedSession, setSelectedSession] = useState<WorkSession | null>(null);
  const [editedOrders, setEditedOrders] = useState('');
  const [editedFuel, setEditedFuel] = useState('');
  const [editedStartKm, setEditedStartKm] = useState('');
  const [editedEndKm, setEditedEndKm] = useState('');
  const [editedStartDate, setEditedStartDate] = useState('');
  const [editedStartTime, setEditedStartTime] = useState('');
  const [editedEndDate, setEditedEndDate] = useState('');
  const [editedEndTime, setEditedEndTime] = useState('');
  const [editedAppId, setEditedAppId] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<'START' | 'END' | null>(null);

  // Identifier Picker State inside Modal
  const [allIdentifiers, setAllIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [loadingIdentifiers, setLoadingIdentifiers] = useState(false);
  const [isIdentifierPickerOpen, setIsIdentifierPickerOpen] = useState(false);
  const [identifierSearchText, setIdentifierSearchText] = useState('');
  const [identifierAppFilter, setIdentifierAppFilter] = useState('ALL');
  const [manualIdInput, setManualIdInput] = useState('');

  // Load Identifiers from Target API
  useEffect(() => {
    let isMounted = true;
    const fetchIds = async () => {
      try {
        setLoadingIdentifiers(true);
        const list = await targetApi.listIdentifiers();
        if (isMounted && Array.isArray(list)) {
          setAllIdentifiers(list);
        }
      } catch (err) {
        console.warn('[ApprovalsScreen] failed to load identifiers:', err);
      } finally {
        if (isMounted) setLoadingIdentifiers(false);
      }
    };
    fetchIds();
    return () => {
      isMounted = false;
    };
  }, []);

  // Employee lookup map for Application ID (المعرف) & Key Number (مفتاح رقم)
  const employeeMap = useMemo(() => {
    const map = new Map<string, DelegateWithStatus>();
    employees.forEach((e) => {
      if (e.id) map.set(String(e.id), e);
    });
    return map;
  }, [employees]);

  // Combined identifiers: Target API + Employees' registered IDs
  const filteredIdentifiers = useMemo(() => {
    const activeApp = identifierAppFilter !== 'ALL' ? identifierAppFilter.toLowerCase() : null;
    const q = toEnglishDigits(identifierSearchText.trim()).toLowerCase();

    const itemsMap = new Map<string, {
      id: string;
      code: string;
      driverName: string;
      appKey: string;
      appNameAr: string;
    }>();

    // 1. API Identifiers
    allIdentifiers.forEach((item) => {
      const rawApp = (item.app_name || '').toLowerCase();
      let appKey = 'other';
      let appNameAr = item.app_name || 'منصة توصيل';
      if (rawApp.includes('keeta') || rawApp.includes('كيتا')) {
        appKey = 'keeta';
        appNameAr = 'كيتا (Keeta)';
      } else if (rawApp.includes('ninja') || rawApp.includes('نينجا')) {
        appKey = 'ninja';
        appNameAr = 'نينجا (Ninja)';
      } else if (rawApp.includes('hunger') || rawApp.includes('هنقر')) {
        appKey = 'hungerstation';
        appNameAr = 'هنقرستيشن';
      }

      const codeVal = (item.code || item.name || '').trim();
      const driverVal = (item.driver_name || '').trim();
      const uniqueKey = codeVal ? `${appKey}_${codeVal}` : `${appKey}_${item.id}`;

      if (codeVal || driverVal) {
        itemsMap.set(uniqueKey, {
          id: item.id || uniqueKey,
          code: codeVal,
          driverName: driverVal,
          appKey,
          appNameAr,
        });
      }
    });

    // 2. Employees' registered application IDs
    employees.forEach((emp) => {
      if (emp.application_id && emp.application_id.trim()) {
        const rawApp = (emp.application_type || 'keeta').toLowerCase();
        let appKey = 'other';
        let appNameAr = emp.application_type || 'منصة';
        if (rawApp.includes('keeta') || rawApp.includes('كيتا')) {
          appKey = 'keeta';
          appNameAr = 'كيتا (Keeta)';
        } else if (rawApp.includes('ninja') || rawApp.includes('نينجا')) {
          appKey = 'ninja';
          appNameAr = 'نينجا (Ninja)';
        } else if (rawApp.includes('hunger') || rawApp.includes('هنقر')) {
          appKey = 'hungerstation';
          appNameAr = 'هنقرستيشن';
        }

        const codeVal = emp.application_id.trim();
        const uniqueKey = `${appKey}_${codeVal}`;
        if (!itemsMap.has(uniqueKey)) {
          itemsMap.set(uniqueKey, {
            id: uniqueKey,
            code: codeVal,
            driverName: emp.name || '',
            appKey,
            appNameAr,
          });
        }
      }
    });

    const list = Array.from(itemsMap.values());

    return list.filter((item) => {
      if (activeApp && item.appKey !== activeApp) return false;
      if (!q) return true;
      const c = toEnglishDigits(item.code).toLowerCase();
      const d = toEnglishDigits(item.driverName).toLowerCase();
      return c.includes(q) || d.includes(q);
    });
  }, [allIdentifiers, employees, identifierAppFilter, identifierSearchText]);

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

  // When navigated from a push notification, filter by that specific employee without auto-opening a modal
  useEffect(() => {
    if (targetEmployeeId) {
      setSelectedEmployeeFilter(String(targetEmployeeId));
    } else if (targetSessionId) {
      const match = pendingSessions.find((s) => String(s.id) === String(targetSessionId));
      if (match && match.employee_id) {
        setSelectedEmployeeFilter(String(match.employee_id));
      }
    }
  }, [targetSessionId, targetEmployeeId, pendingSessions]);

  // Filter sessions shown on page (restricted to the target employee if navigated from notification)
  const displaySessions = useMemo(() => {
    if (!selectedEmployeeFilter) return sortedCompletedPendingSessions;
    return sortedCompletedPendingSessions.filter(
      (s) => String(s.employee_id) === String(selectedEmployeeFilter)
    );
  }, [sortedCompletedPendingSessions, selectedEmployeeFilter]);

  const openSessionModal = (session: WorkSession) => {
    const empRecord = employeeMap.get(String(session.employee_id));
    const currentAppId =
      (session as any).application_id ||
      (session.employee as any)?.application_id ||
      empRecord?.application_id ||
      '';

    setSelectedSession(session);
    setEditedOrders(String(session.orders_count ?? 0));
    setEditedFuel(String(session.fuel_cost ?? 0));
    setEditedStartKm(String(session.start_km ?? 0));
    setEditedEndKm(String(session.end_km ?? 0));
    setEditedStartDate(toDateStr(session.start_time));
    setEditedStartTime(toTimeStr(session.start_time));
    setEditedEndDate(toDateStr(session.end_time || session.start_time));
    setEditedEndTime(toTimeStr(session.end_time || session.start_time));
    setEditedAppId(String(currentAppId));
    setReviewNotes(session.review_notes || '');
    setIsIdentifierPickerOpen(false);
    setIdentifierSearchText('');
    setManualIdInput('');
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
        autoCloseMs: 2500,
      });
      return;
    }

    try {
      setSubmitting(true);
      const isoStart = combineDateTimeIso(editedStartDate, editedStartTime);
      const isoEnd = combineDateTimeIso(editedEndDate, editedEndTime);

      await supervisorApi.reviewSession({
        sessionId: selectedSession.id,
        isReviewed: true,
        ordersCount: Number(toEnglishDigits(editedOrders)) || 0,
        fuelCost: Number(toEnglishDigits(editedFuel)) || 0,
        startKm: startVal,
        endKm: endVal,
        startTime: isoStart,
        endTime: isoEnd,
        applicationId: editedAppId.trim(),
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
          autoCloseMs: 800,
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
        autoCloseMs: 800,
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
        {/* Active Employee Filter Banner (when navigated from a notification) */}
        {Boolean(selectedEmployeeFilter) && (
          <View
            style={[
              styles.filterBanner,
              {
                backgroundColor: colors.primary + '14',
                borderColor: colors.primary + '35',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="person-circle" size={20} color={colors.primary} />
                <Text style={[styles.filterTitle, { color: colors.textPrimary }]}>
                  ورديات المندوب: {employeeMap.get(String(selectedEmployeeFilter))?.name || displaySessions[0]?.employee_name || 'المندوب'}
                </Text>
              </View>
              <Text style={[styles.filterSubtitle, { color: colors.textSecondary }]}>
                تم التصفية تلقائياً من الإشعار • عدد الورديات ({displaySessions.length})
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.clearFilterBtn,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  borderColor: colors.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => {
                setSelectedEmployeeFilter(null);
                onClearTargetSession?.();
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.clearFilterText, { color: colors.textPrimary }]}>
                عرض الكل
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* COMPLETED SHIFTS FOR ORDERS APPROVAL */}
        {displaySessions.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: '#10b98118' }]}>
              <Ionicons name="checkmark-done-outline" size={38} color="#10b981" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              تم اعتماد جميع الشفتات المنتهية
            </Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              {selectedEmployeeFilter ? 'لا توجد شفتات منتهية لهذا المندوب حالياً' : 'لا توجد ورديات منتهية بانتظار المراجعة حالياً'}
            </Text>
          </View>
        ) : (
          displaySessions.map((session) => {
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
              { label: '8. بنزين', value: `${Math.round(Number(session.fuel_cost ?? 0))} ر.س`, icon: 'flame-outline', color: '#f59e0b' },
              { label: '9. المعرف', value: String(appId), icon: 'id-card-outline', color: '#ec4899' },
            ];

            return (
              <TouchableOpacity
                key={session.id}
                activeOpacity={0.92}
                onPress={() => openSessionModal(session)}
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

                {/* Action Buttons: Quick Approve or Edit/Review */}
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
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Shift Edit Bottom Sheet Modal */}
      <Modal
        visible={Boolean(selectedSession)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (isIdentifierPickerOpen) {
            setIsIdentifierPickerOpen(false);
          } else {
            setSelectedSession(null);
          }
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  مراجعة وتعديل بيانات الشفت
                </Text>
                <Text style={[styles.modalSubMeta, { color: colors.textSecondary }]}>
                  المندوب: {selectedSession?.employee_name || selectedSession?.employee?.name || employeeMap.get(String(selectedSession?.employee_id))?.name || 'المندوب'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedSession(null)}
                style={[styles.closeIconBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedSession && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* 1. Start Details (تاريخ، وقت، وكيلو البدء) */}
                <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="play-circle-outline" size={16} color="#0284c7" />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>بيانات البداية (Start)</Text>
                </View>

                <View style={[styles.modalDualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* تاريخ البدء */}
                  <View style={{ flex: 1.2 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      تاريخ البدء
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.datePickerBtn,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                      onPress={() => setDatePickerTarget('START')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={17} color={colors.primary} />
                      <Text style={[styles.datePickerBtnText, { color: colors.textPrimary }]}>
                        {editedStartDate || 'اختر التاريخ'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* وقت البدء */}
                  <View style={{ flex: 0.9 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      وقت البدء (س:د)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          textAlign: 'center',
                          fontWeight: '700',
                        },
                      ]}
                      placeholder="08:00"
                      placeholderTextColor={colors.textSecondary}
                      value={editedStartTime}
                      onChangeText={(v) => setEditedStartTime(toEnglishDigits(v))}
                    />
                  </View>

                  {/* كيلو البدء */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      كيلو البدء
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          textAlign: 'center',
                          fontWeight: '700',
                        },
                      ]}
                      keyboardType="numeric"
                      value={editedStartKm}
                      onChangeText={(v) => setEditedStartKm(toEnglishDigits(v))}
                    />
                  </View>
                </View>

                {/* 2. End Details (تاريخ، وقت، وكيلو الانتهاء) */}
                <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="stop-circle-outline" size={16} color="#6366f1" />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>بيانات النهاية (End)</Text>
                </View>

                <View style={[styles.modalDualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* تاريخ الانهاء */}
                  <View style={{ flex: 1.2 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      تاريخ الانهاء
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.datePickerBtn,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                      onPress={() => setDatePickerTarget('END')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={17} color={colors.primary} />
                      <Text style={[styles.datePickerBtnText, { color: colors.textPrimary }]}>
                        {editedEndDate || 'اختر التاريخ'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* وقت الانهاء */}
                  <View style={{ flex: 0.9 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      وقت الانهاء (س:د)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          textAlign: 'center',
                          fontWeight: '700',
                        },
                      ]}
                      placeholder="16:00"
                      placeholderTextColor={colors.textSecondary}
                      value={editedEndTime}
                      onChangeText={(v) => setEditedEndTime(toEnglishDigits(v))}
                    />
                  </View>

                  {/* كيلو الانهاء */}
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
                          fontWeight: '700',
                        },
                      ]}
                      keyboardType="numeric"
                      value={editedEndKm}
                      onChangeText={(v) => setEditedEndKm(toEnglishDigits(v))}
                    />
                  </View>
                </View>

                {/* 3. Performance & Courier ID (الطلبات، البنزين، والمعرف كقائمة منسدلة) */}
                <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="analytics-outline" size={16} color="#10b981" />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>الطلبات، البنزين والمعرف</Text>
                </View>

                <View style={[styles.modalDualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  {/* عدد الطلبات */}
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
                          fontWeight: '800',
                        },
                      ]}
                      keyboardType="numeric"
                      value={editedOrders}
                      onChangeText={(v) => setEditedOrders(toEnglishDigits(v))}
                    />
                  </View>

                  {/* تكلفة البنزين */}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      قيمة البنزين (ر.س)
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.inputBorder,
                          color: colors.textPrimary,
                          textAlign: 'center',
                          fontWeight: '700',
                        },
                      ]}
                      keyboardType="numeric"
                      value={editedFuel}
                      onChangeText={(v) => setEditedFuel(toEnglishDigits(v))}
                    />
                  </View>
                </View>

                {/* المعرف (Application ID) - Dropdown Selector Trigger */}
                <View style={{ marginTop: 6 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    المعرف (كود التطبيق / Application ID)
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.selectorTriggerBtn,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: editedAppId ? '#10b981' : colors.inputBorder,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                    onPress={() => {
                      setIdentifierSearchText('');
                      setManualIdInput(editedAppId || '');
                      setIsIdentifierPickerOpen(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.selectorTriggerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons
                        name="id-card-outline"
                        size={18}
                        color={editedAppId ? '#10b981' : colors.textSecondary}
                      />
                      <Text
                        style={[
                          styles.selectorTriggerValue,
                          {
                            color: editedAppId ? colors.textPrimary : colors.textSecondary,
                            fontWeight: editedAppId ? '800' : '600',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {editedAppId || 'اختر المعرف من القائمة...'}
                      </Text>
                    </View>
                    <View style={[styles.selectorTriggerBadge, { backgroundColor: '#10b98118' }]}>
                      <Text style={[styles.selectorTriggerBadgeText, { color: '#10b981' }]}>
                        {editedAppId ? 'تغيير' : 'اختيار'}
                      </Text>
                      <Ionicons name="chevron-down" size={14} color="#10b981" />
                    </View>
                  </TouchableOpacity>
                </View>

                {/* ملاحظات المشرف */}
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', marginTop: 12 }]}>
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
                  activeOpacity={0.85}
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

            {/* Identifier Dropdown / Picker Overlay (Inside Modal) */}
            {isIdentifierPickerOpen && (
              <View style={styles.overlayContainer}>
                <TouchableOpacity
                  style={styles.backdropDismiss}
                  activeOpacity={1}
                  onPress={() => setIsIdentifierPickerOpen(false)}
                />
                <View
                  style={[
                    styles.pickerModalCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Picker Header */}
                  <View
                    style={[
                      styles.pickerModalHeader,
                      {
                        borderBottomColor: colors.border,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                  >
                    <View style={[styles.modalHeaderIconCircle, { backgroundColor: '#10b98118' }]}>
                      <Ionicons name="id-card" size={20} color="#10b981" />
                    </View>
                    <View style={[styles.pickerModalTitleWrap, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.pickerModalTitle, { color: colors.textPrimary }]}>
                        اختيار معرف المندوب
                      </Text>
                      <Text style={[styles.pickerModalSubtitle, { color: colors.textSecondary }]}>
                        اختر المعرف بالاسم أو ابحث بالرقم
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setIsIdentifierPickerOpen(false)}
                      style={[styles.modalCloseCircle, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
                    >
                      <Ionicons name="close" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  {/* Platform Filter Chips */}
                  <View style={[styles.modalPlatformChipsWrap, { borderBottomColor: colors.border }]}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={[styles.modalPlatformScroll, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                    >
                      {[
                        { key: 'ALL', label: 'الكل' },
                        { key: 'keeta', label: 'كيتا (Keeta)' },
                        { key: 'ninja', label: 'نينجا (Ninja)' },
                        { key: 'hungerstation', label: 'هنقرستيشن' },
                      ].map((p) => {
                        const isSelected = identifierAppFilter.toLowerCase() === p.key.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={p.key}
                            style={[
                              styles.miniFilterChip,
                              {
                                backgroundColor: isSelected ? '#10b981' : isDarkMode ? '#1e293b' : '#f1f5f9',
                                borderColor: isSelected ? '#10b981' : colors.border,
                              },
                            ]}
                            onPress={() => setIdentifierAppFilter(p.key)}
                            activeOpacity={0.7}
                          >
                            <Text
                              style={[
                                styles.miniFilterChipText,
                                { color: isSelected ? '#ffffff' : colors.textPrimary },
                              ]}
                            >
                              {p.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Search Bar */}
                  <View style={styles.pickerModalSearchWrap}>
                    <View
                      style={[
                        styles.searchBarInner,
                        {
                          backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                          borderColor: colors.border,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                    >
                      <Ionicons name="search" size={18} color={colors.textSecondary} />
                      <TextInput
                        style={[
                          styles.pickerModalSearchInput,
                          {
                            color: colors.textPrimary,
                            textAlign: isRTL ? 'right' : 'left',
                          },
                        ]}
                        value={identifierSearchText}
                        onChangeText={setIdentifierSearchText}
                        placeholder="ابحث بالاسم أو رقم المعرف..."
                        placeholderTextColor={colors.textSecondary}
                      />
                      {identifierSearchText ? (
                        <TouchableOpacity onPress={() => setIdentifierSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {/* Identifiers List */}
                  <ScrollView
                    style={styles.pickerModalScroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={true}
                  >
                    {loadingIdentifiers ? (
                      <View style={styles.emptySearchWrap}>
                        <ActivityIndicator size="small" color="#10b981" />
                        <Text style={[styles.emptySearchSub, { color: colors.textSecondary, marginTop: 8 }]}>
                          جاري تحميل المعرفات...
                        </Text>
                      </View>
                    ) : filteredIdentifiers.length === 0 ? (
                      <View style={styles.emptySearchWrap}>
                        <Ionicons name="folder-open-outline" size={36} color={colors.textSecondary} />
                        <Text style={[styles.emptySearchTitle, { color: colors.textPrimary }]}>
                          لا توجد معرفات مسجلة لهذه المنصة
                        </Text>
                        <Text style={[styles.emptySearchSub, { color: colors.textSecondary }]}>
                          يمكنك إدخال اسم أو رقم المعرف يدويًا بالأسفل
                        </Text>
                      </View>
                    ) : (
                      filteredIdentifiers.map((item) => {
                        const selectedVal = item.code || item.driverName;
                        const isSelected = editedAppId === selectedVal || (item.code && editedAppId === item.code);
                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[
                              styles.pickerCardItem,
                              {
                                backgroundColor: isSelected
                                  ? '#10b98112'
                                  : isDarkMode
                                  ? '#1e293b60'
                                  : '#f8fafc',
                                borderColor: isSelected ? '#10b981' : colors.border,
                                flexDirection: isRTL ? 'row-reverse' : 'row',
                              },
                            ]}
                            onPress={() => {
                              setEditedAppId(item.code || item.driverName);
                              setIsIdentifierPickerOpen(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.pickerItemRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                              <View
                                style={[
                                  styles.pickerItemBadgeCircle,
                                  {
                                    backgroundColor: isSelected ? '#10b981' : colors.primary + '18',
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={isSelected ? 'checkmark' : 'id-card'}
                                  size={16}
                                  color={isSelected ? '#ffffff' : colors.primary}
                                />
                              </View>
                              <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                                <View style={[styles.codeAndBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                                  <Text style={[styles.pickerItemCode, { color: colors.textPrimary }]}>
                                    {item.code || '---'}
                                  </Text>
                                  <View style={[styles.pickerAppPill, { backgroundColor: '#10b98118' }]}>
                                    <Text style={styles.pickerAppPillText}>
                                      {item.appNameAr}
                                    </Text>
                                  </View>
                                </View>
                                {item.driverName ? (
                                  <Text style={[styles.pickerItemDriverName, { color: colors.textSecondary }]}>
                                    المندوب: {item.driverName}
                                  </Text>
                                ) : null}
                              </View>
                            </View>

                            {isSelected && (
                              <View style={styles.selectedCheckWrap}>
                                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </ScrollView>

                  {/* Manual Input Footer */}
                  <View style={[styles.manualPickerFooter, { borderTopColor: colors.border }]}>
                    <Text style={[styles.manualInputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      أو كتابة المعرف يدويًا
                    </Text>
                    <View style={[styles.manualInputRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TextInput
                        style={[
                          styles.manualTextInput,
                          {
                            backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                            borderColor: colors.border,
                            color: colors.textPrimary,
                            textAlign: isRTL ? 'right' : 'left',
                          },
                        ]}
                        value={manualIdInput}
                        onChangeText={setManualIdInput}
                        placeholder="أدخل رقم أو اسم المعرف..."
                        placeholderTextColor={colors.textSecondary}
                      />
                      <TouchableOpacity
                        style={[
                          styles.manualApplyBtn,
                          {
                            backgroundColor: manualIdInput.trim() ? '#10b981' : colors.border,
                          },
                        ]}
                        disabled={!manualIdInput.trim()}
                        onPress={() => {
                          setEditedAppId(manualIdInput.trim());
                          setIsIdentifierPickerOpen(false);
                        }}
                      >
                        <Text style={styles.manualApplyBtnText}>تطبيق</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Bottom Sheet for Start/End Date */}
      <DatePickerBottomSheet
        visible={Boolean(datePickerTarget)}
        selectedDate={datePickerTarget === 'START' ? editedStartDate : editedEndDate}
        onSelectDate={(dateStr) => {
          if (datePickerTarget === 'START') {
            setEditedStartDate(dateStr);
          } else if (datePickerTarget === 'END') {
            setEditedEndDate(dateStr);
          }
          setDatePickerTarget(null);
        }}
        onClose={() => setDatePickerTarget(null)}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  filterBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    alignItems: 'center',
    gap: 10,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  filterSubtitle: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  clearFilterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    gap: 5,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitleRow: {
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  datePickerBtn: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  datePickerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  container: {
    flex: 1,
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
    maxHeight: '90%',
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
  modalSubMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
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
  selectorTriggerBtn: {
    height: 46,
    borderRadius: 11,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorTriggerContent: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  selectorTriggerValue: {
    fontSize: 13,
    flex: 1,
  },
  selectorTriggerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectorTriggerBadgeText: {
    fontSize: 11,
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
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  pickerModalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  pickerModalHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalHeaderIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalTitleWrap: {
    flex: 1,
    marginHorizontal: 10,
  },
  pickerModalTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  pickerModalSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  modalCloseCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPlatformChipsWrap: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  modalPlatformScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  miniFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  miniFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pickerModalSearchWrap: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBarInner: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  pickerModalSearchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  pickerModalScroll: {
    maxHeight: 260,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  emptySearchWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 6,
  },
  emptySearchTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptySearchSub: {
    fontSize: 12,
    textAlign: 'center',
  },
  pickerCardItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerItemRight: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  pickerItemBadgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeAndBadgeRow: {
    alignItems: 'center',
    gap: 8,
  },
  pickerItemCode: {
    fontSize: 14,
    fontWeight: '800',
  },
  pickerAppPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pickerAppPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10b981',
  },
  pickerItemDriverName: {
    fontSize: 11,
    marginTop: 2,
  },
  selectedCheckWrap: {
    marginLeft: 8,
  },
  manualPickerFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  manualInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  manualInputRow: {
    gap: 8,
    alignItems: 'center',
  },
  manualTextInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  manualApplyBtn: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualApplyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});
