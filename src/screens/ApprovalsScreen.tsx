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

interface ShiftApprovalCardItemProps {
  session: WorkSession;
  empRecord?: DelegateWithStatus;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  submitting: boolean;
  onApprove: (payload: {
    sessionId: string;
    ordersCount: number;
    fuelCost: number;
    startKm: number;
    endKm: number;
    startTime: string;
    endTime: string;
    applicationId: string;
    reviewNotes: string;
    employeeName: string;
  }) => Promise<void>;
  onOpenTimeModal: (data: {
    sessionId: string;
    employeeName: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    onSave: (newStartIso: string, newEndIso: string) => void;
  }) => void;
  onPreviewPhoto: (photo: { url: string; title: string }) => void;
}

const ShiftApprovalCardItem: React.FC<ShiftApprovalCardItemProps> = ({
  session,
  empRecord,
  colors,
  isDarkMode,
  isRTL,
  submitting,
  onApprove,
  onOpenTimeModal,
  onPreviewPhoto,
}) => {
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
  const initialAppId =
    (session as any).application_id ||
    (session.employee as any)?.application_id ||
    empRecord?.application_id ||
    '';

  const [startIso, setStartIso] = useState(session.start_time || '');
  const [endIso, setEndIso] = useState(session.end_time || session.start_time || '');
  const [orders, setOrders] = useState(String(session.orders_count ?? 0));
  const [fuel, setFuel] = useState(String(session.fuel_cost ?? 0));
  const [startKm, setStartKm] = useState(String(session.start_km ?? 0));
  const [endKm, setEndKm] = useState(String(session.end_km ?? 0));
  const [appId, setAppId] = useState(String(initialAppId));
  const [notes, setNotes] = useState(session.review_notes || '');

  // Dynamic calculations
  const startKmNum = Number(toEnglishDigits(startKm)) || 0;
  const endKmNum = Number(toEnglishDigits(endKm)) || 0;
  const distanceKm =
    endKmNum >= startKmNum && endKmNum > 0
      ? endKmNum - startKmNum
      : Number((session as any).total_km ?? session.distance ?? 0);
  const hoursLabel = calcShiftHours(startIso, endIso);

  const handleTimeCardPress = () => {
    onOpenTimeModal({
      sessionId: session.id,
      employeeName: empName,
      startDate: toDateStr(startIso),
      startTime: toTimeStr(startIso),
      endDate: toDateStr(endIso || startIso),
      endTime: toTimeStr(endIso || startIso),
      onSave: (newStart, newEnd) => {
        setStartIso(newStart);
        setEndIso(newEnd);
      },
    });
  };

  return (
    <View
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
            انتهى: {formatDateTimeFull(endIso || startIso)} • الدباب: {session.motorcycle_number || '---'}
          </Text>
        </View>
      </View>

      {/* 9 Ordered Shift Metrics Grid (3x3 Structured Layout) */}
      <View style={[styles.orderedGrid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        {/* 1. وقت البداية (كرت قابل للضغط يفتح مديولا تعديل الوقت فقط) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleTimeCardPress}
          style={[
            styles.metricCell,
            styles.timeClickableCell,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f0f9ff',
              borderColor: '#0284c780',
            },
          ]}
        >
          <View style={[styles.metricTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="play-circle-outline" size={13} color="#0284c7" />
            <Text style={[styles.metricLabel, { color: '#0284c7' }]} numberOfLines={1}>1. وقت البداية</Text>
            <Ionicons name="pencil" size={10} color="#0284c7" />
          </View>
          <Text style={[styles.metricValue, { color: '#0284c7' }]} numberOfLines={1}>
            {formatTimeOnly(startIso)}
          </Text>
          <Text style={[styles.metricSubHint, { color: colors.textSecondary }]}>
            {toDateStr(startIso)}
          </Text>
        </TouchableOpacity>

        {/* 2. كيلو البداية (إدخال مباشر) */}
        <View
          style={[
            styles.metricCell,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.metricTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="speedometer-outline" size={13} color="#0284c7" />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>2. كيلو البداية</Text>
          </View>
          <TextInput
            style={[
              styles.metricInlineInput,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.textPrimary,
              },
            ]}
            keyboardType="numeric"
            value={startKm}
            onChangeText={(v) => setStartKm(toEnglishDigits(v))}
          />
        </View>

        {/* 3. وقت النهاية (كرت قابل للضغط يفتح مديولا تعديل الوقت فقط) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleTimeCardPress}
          style={[
            styles.metricCell,
            styles.timeClickableCell,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#eef2ff',
              borderColor: '#6366f180',
            },
          ]}
        >
          <View style={[styles.metricTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="stop-circle-outline" size={13} color="#6366f1" />
            <Text style={[styles.metricLabel, { color: '#6366f1' }]} numberOfLines={1}>3. وقت النهاية</Text>
            <Ionicons name="pencil" size={10} color="#6366f1" />
          </View>
          <Text style={[styles.metricValue, { color: '#6366f1' }]} numberOfLines={1}>
            {formatTimeOnly(endIso)}
          </Text>
          <Text style={[styles.metricSubHint, { color: colors.textSecondary }]}>
            {toDateStr(endIso)}
          </Text>
        </TouchableOpacity>

        {/* 4. كيلو النهاية (إدخال مباشر) */}
        <View
          style={[
            styles.metricCell,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.metricTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="flag-outline" size={13} color="#6366f1" />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>4. كيلو النهاية</Text>
          </View>
          <TextInput
            style={[
              styles.metricInlineInput,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.textPrimary,
              },
            ]}
            keyboardType="numeric"
            value={endKm}
            onChangeText={(v) => setEndKm(toEnglishDigits(v))}
          />
        </View>

        {/* 5. عدد الكيلوات (محسوب تلقائياً) */}
        <View
          style={[
            styles.metricCell,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.metricTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="analytics-outline" size={13} color="#0d9488" />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>5. عدد الكيلوات</Text>
          </View>
          <Text style={[styles.metricValue, { color: '#0d9488' }]} numberOfLines={1}>
            {distanceKm} كم
          </Text>
        </View>

        {/* 6. الطلبات (إدخال مباشر بارز ومميز) */}
        <View
          style={[
            styles.metricCell,
            {
              backgroundColor: isDarkMode ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5',
              borderColor: '#10b98160',
            },
          ]}
        >
          <View style={[styles.metricTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="bag-check-outline" size={13} color="#10b981" />
            <Text style={[styles.metricLabel, { color: '#10b981', fontWeight: '800' }]} numberOfLines={1}>6. الطلبات</Text>
          </View>
          <TextInput
            style={[
              styles.metricInlineInput,
              {
                backgroundColor: isDarkMode ? '#064e3b40' : '#ffffff',
                borderColor: '#10b981',
                color: '#10b981',
                fontWeight: '900',
              },
            ]}
            keyboardType="numeric"
            value={orders}
            onChangeText={(v) => setOrders(toEnglishDigits(v))}
          />
        </View>

        {/* 7. الساعات (محسوبة تلقائياً مع إمكانية الضغط لتعديل الوقت) */}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleTimeCardPress}
          style={[
            styles.metricCell,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
              borderColor: colors.border,
            },
          ]}
        >
          <View style={[styles.metricTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="time-outline" size={13} color="#8b5cf6" />
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]} numberOfLines={1}>7. الساعات</Text>
          </View>
          <Text style={[styles.metricValue, { color: '#8b5cf6' }]} numberOfLines={1}>
            {hoursLabel}
          </Text>
        </TouchableOpacity>

        {/* 8. بنزين (إدخال مباشر) */}
        <View
          style={[
            styles.metricCell,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#fffbeb',
              borderColor: '#f59e0b50',
            },
          ]}
        >
          <View style={[styles.metricTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="flame-outline" size={13} color="#f59e0b" />
            <Text style={[styles.metricLabel, { color: '#d97706' }]} numberOfLines={1}>8. بنزين (ر.س)</Text>
          </View>
          <TextInput
            style={[
              styles.metricInlineInput,
              {
                backgroundColor: isDarkMode ? '#78350f30' : '#ffffff',
                borderColor: '#f59e0b',
                color: '#d97706',
                fontWeight: '800',
              },
            ]}
            keyboardType="numeric"
            value={fuel}
            onChangeText={(v) => setFuel(toEnglishDigits(v))}
          />
        </View>

        {/* 9. المعرف (إدخال مباشر) */}
        <View
          style={[
            styles.metricCell,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#fdf2f8',
              borderColor: '#ec489950',
            },
          ]}
        >
          <View style={[styles.metricTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="id-card-outline" size={13} color="#ec4899" />
            <Text style={[styles.metricLabel, { color: '#db2777' }]} numberOfLines={1}>9. المعرف</Text>
          </View>
          <TextInput
            style={[
              styles.metricInlineInput,
              {
                backgroundColor: isDarkMode ? '#83184330' : '#ffffff',
                borderColor: '#ec4899',
                color: '#db2777',
                fontWeight: '800',
              },
            ]}
            placeholder="المعرف"
            placeholderTextColor={colors.textSecondary}
            value={appId}
            onChangeText={setAppId}
          />
        </View>
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
                  title: `عداد البداية (${startKmNum} كم) - ${empName}`,
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
                  title: `عداد النهاية (${endKmNum} كم) - ${empName}`,
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

      {/* Direct Approve Button (Auto-dismiss in 800ms) */}
      <TouchableOpacity
        style={[styles.approveDirectBtn, { backgroundColor: '#10b981', marginTop: 4 }]}
        onPress={() =>
          onApprove({
            sessionId: session.id,
            ordersCount: Number(toEnglishDigits(orders)) || 0,
            fuelCost: Number(toEnglishDigits(fuel)) || 0,
            startKm: startKmNum,
            endKm: endKmNum,
            startTime: startIso,
            endTime: endIso,
            applicationId: appId,
            reviewNotes: notes,
            employeeName: empName,
          })
        }
        disabled={submitting}
        activeOpacity={0.85}
      >
        <Ionicons name="checkmark-circle" size={19} color="#ffffff" />
        <Text style={styles.approveDirectBtnText}>اعتماد الشفت</Text>
      </TouchableOpacity>
    </View>
  );
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
  
  // State for Dedicated Time Edit Modal (ONLY opened when tapping a Time card)
  interface TimeModalData {
    sessionId: string;
    employeeName: string;
    startDate: string;
    startTime: string;
    endDate: string;
    endTime: string;
    onSave: (newStartIso: string, newEndIso: string) => void;
  }

  const [timeModalData, setTimeModalData] = useState<TimeModalData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<'START' | 'END' | null>(null);

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

  const handleApproveShift = async (payload: {
    sessionId: string;
    ordersCount: number;
    fuelCost: number;
    startKm: number;
    endKm: number;
    startTime: string;
    endTime: string;
    applicationId: string;
    reviewNotes: string;
    employeeName: string;
  }) => {
    if (payload.endKm > 0 && payload.endKm < payload.startKm) {
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
      await supervisorApi.reviewSession({
        sessionId: payload.sessionId,
        isReviewed: true,
        ordersCount: payload.ordersCount,
        fuelCost: payload.fuelCost,
        startKm: payload.startKm,
        endKm: payload.endKm,
        startTime: payload.startTime,
        endTime: payload.endTime,
        applicationId: payload.applicationId.trim(),
        reviewNotes: payload.reviewNotes.trim() || 'تمت المراجعة والاعتماد من المشرف',
      });
      onRefresh();
      showBottomAlert({
        type: 'success',
        title: 'تم الاعتماد بنجاح',
        message: `تم اعتماد شفت وطلبات (${payload.employeeName}) بنجاح.`,
        autoCloseMs: 800,
      });
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
          displaySessions.map((session) => (
            <ShiftApprovalCardItem
              key={session.id}
              session={session}
              empRecord={employeeMap.get(String(session.employee_id))}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              submitting={submitting}
              onApprove={handleApproveShift}
              onOpenTimeModal={(data) => setTimeModalData(data)}
              onPreviewPhoto={onPreviewPhoto}
            />
          ))
        )}
      </ScrollView>

      {/* Dedicated Time Edit Bottom Sheet Modal - ONLY shown when pressing the Time card */}
      <Modal
        visible={Boolean(timeModalData)}
        transparent
        animationType="slide"
        onRequestClose={() => setTimeModalData(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  تعديل وقت وتاريخ الشفت
                </Text>
                <Text style={[styles.modalSubMeta, { color: colors.textSecondary }]}>
                  المندوب: {timeModalData?.employeeName || 'المندوب'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setTimeModalData(null)}
                style={[styles.closeIconBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
              >
                <Ionicons name="close" size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {timeModalData && (
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {/* 1. وقت وتاريخ البدء */}
                <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="play-circle-outline" size={17} color="#0284c7" />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>وقت وتاريخ البدء (Start)</Text>
                </View>

                <View style={[styles.modalDualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                        {timeModalData.startDate || 'اختر التاريخ'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flex: 1 }}>
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
                      value={timeModalData.startTime}
                      onChangeText={(v) =>
                        setTimeModalData((prev) => (prev ? { ...prev, startTime: toEnglishDigits(v) } : null))
                      }
                    />
                  </View>
                </View>

                {/* 2. وقت وتاريخ الانتهاء */}
                <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 14 }]}>
                  <Ionicons name="stop-circle-outline" size={17} color="#6366f1" />
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>وقت وتاريخ الانتهاء (End)</Text>
                </View>

                <View style={[styles.modalDualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={{ flex: 1.2 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      تاريخ الانتهاء
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
                        {timeModalData.endDate || 'اختر التاريخ'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      وقت الانتهاء (س:د)
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
                      value={timeModalData.endTime}
                      onChangeText={(v) =>
                        setTimeModalData((prev) => (prev ? { ...prev, endTime: toEnglishDigits(v) } : null))
                      }
                    />
                  </View>
                </View>

                {/* Save Time Button */}
                <TouchableOpacity
                  style={[styles.confirmModalBtn, { backgroundColor: colors.primary, marginTop: 22 }]}
                  onPress={() => {
                    const newStartIso = combineDateTimeIso(timeModalData.startDate, timeModalData.startTime);
                    const newEndIso = combineDateTimeIso(timeModalData.endDate, timeModalData.endTime);
                    timeModalData.onSave(newStartIso, newEndIso);
                    setTimeModalData(null);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="checkmark-done" size={20} color="#ffffff" />
                  <Text style={styles.confirmModalBtnText}>حفظ الوقت وتحديث الكرت</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker Bottom Sheet for Start/End Date */}
      <DatePickerBottomSheet
        visible={Boolean(datePickerTarget)}
        selectedDate={
          datePickerTarget === 'START'
            ? timeModalData?.startDate || ''
            : timeModalData?.endDate || ''
        }
        onSelectDate={(dateStr) => {
          if (timeModalData) {
            if (datePickerTarget === 'START') {
              setTimeModalData({ ...timeModalData, startDate: dateStr });
            } else if (datePickerTarget === 'END') {
              setTimeModalData({ ...timeModalData, endDate: dateStr });
            }
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
  timeClickableCell: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
  },
  metricInlineInput: {
    height: 32,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 0,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 2,
  },
  metricSubHint: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
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
