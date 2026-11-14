import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, WorkSession, PreviewPhotoData } from '../types/delegate';
import {
  PendingAdvanceRequest,
  PendingMaintenanceRequest,
  DelegateWithStatus,
  supervisorApi,
} from '../services/supervisor';
import { targetApi } from '../services/targetApi';
import { IdentifierPerformance } from '../types/target';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { showBottomAlert } from '../components/modals/ActionAlertBottomSheet';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { approvalsCardStyles as styles } from './approvals/approvalsCardStyles';
import {
  buildFilteredIdentifiers,
  combineDateTimeIso,
  toDateStr,
  toTimeStr,
} from './approvals/approvalsHelpers';
import { ApprovalSessionCard } from './approvals/ApprovalSessionCard';
import { ApprovalEditModal } from './approvals/ApprovalEditModal';

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
  onSessionApproved?: (sessionId: string) => void;
  onAdvanceDecision?: (advanceId: string) => void;
  onMaintenanceDecision?: (maintenanceId: string) => void;
}

export const ApprovalsScreen: React.FC<ApprovalsScreenProps> = React.memo(({
  pendingSessions,
  pendingAdvances: _pendingAdvances,
  pendingMaintenance: _pendingMaintenance,
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
  onSessionApproved,
  onAdvanceDecision: _onAdvanceDecision,
  onMaintenanceDecision: _onMaintenanceDecision,
}) => {
  // Keep the device screen awake while the supervisor is on approvals screen / reviewing shifts
  useKeepAwake();

  const [approvedSessionIds, setApprovedSessionIds] = useState<Set<string>>(new Set());

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
  const [submitting] = useState(false);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string | null>(null);
  const [datePickerTarget, setDatePickerTarget] = useState<'START' | 'END' | null>(null);

  // Identifier Picker State inside Modal
  const [allIdentifiers, setAllIdentifiers] = useState<IdentifierPerformance[]>([]);
  const [loadingIdentifiers, setLoadingIdentifiers] = useState(false);
  const [isIdentifierPickerOpen, setIsIdentifierPickerOpen] = useState(false);
  const [identifierSearchText, setIdentifierSearchText] = useState('');
  const [identifierAppFilter, setIdentifierAppFilter] = useState('ALL');
  const [manualIdInput, setManualIdInput] = useState('');

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

  const employeeMap = useMemo(() => {
    const map = new Map<string, DelegateWithStatus>();
    employees.forEach((e) => {
      if (e.id) map.set(String(e.id), e);
    });
    return map;
  }, [employees]);

  const filteredIdentifiers = useMemo(
    () =>
      buildFilteredIdentifiers(
        allIdentifiers,
        employees,
        identifierAppFilter,
        identifierSearchText
      ),
    [allIdentifiers, employees, identifierAppFilter, identifierSearchText]
  );

  const sortedCompletedPendingSessions = useMemo(() => {
    return pendingSessions
      .filter((s) => !approvedSessionIds.has(s.id))
      .filter((s) => (s.status === 'COMPLETED' || (s.status as string) !== 'ACTIVE') && Boolean(s.end_time))
      .sort((a, b) => {
        const tB = new Date(b.end_time || b.start_time || 0).getTime();
        const tA = new Date(a.end_time || a.start_time || 0).getTime();
        return tB - tA;
      });
  }, [pendingSessions, approvedSessionIds]);

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

    const sessionId = selectedSession.id;
    const payload = {
      sessionId,
      isReviewed: true,
      ordersCount: Number(toEnglishDigits(editedOrders)) || 0,
      fuelCost: Number(toEnglishDigits(editedFuel)) || 0,
      startKm: startVal,
      endKm: endVal,
      startTime: combineDateTimeIso(editedStartDate, editedStartTime),
      endTime: combineDateTimeIso(editedEndDate, editedEndTime),
      applicationId: editedAppId.trim(),
      reviewNotes: reviewNotes.trim() || 'تمت المراجعة والاعتماد من المشرف',
    };

    setApprovedSessionIds((prev) => new Set(prev).add(sessionId));
    onSessionApproved?.(sessionId);
    setSelectedSession(null);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}

    showBottomAlert({
      type: 'success',
      title: 'تم الاعتماد بنجاح',
      message: 'تم حفظ التعديلات واعتماد وردية المندوب فوراً.',
      autoCloseMs: 2000,
    });

    supervisorApi.reviewSession(payload).catch((e: any) => {
      console.warn('[handleConfirmSession] background review notice:', e);
    });
  };

  const handleQuickApproveSession = (session: WorkSession) => {
    setApprovedSessionIds((prev) => new Set(prev).add(session.id));
    onSessionApproved?.(session.id);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {}

    showBottomAlert({
      type: 'success',
      title: 'تم الاعتماد بنجاح',
      message: `تم اعتماد وردية المندوب (${session.employee_name || 'المندوب'}) فوراً.`,
      autoCloseMs: 2000,
    });

    supervisorApi.reviewSession({
      sessionId: session.id,
      isReviewed: true,
      ordersCount: Number(session.orders_count ?? 0),
      fuelCost: Number(session.fuel_cost ?? 0),
      startKm: Number(session.start_km ?? 0),
      endKm: Number(session.end_km ?? 0),
      reviewNotes: 'اعتماد سريع من المشرف',
    }).catch((e: any) => {
      console.warn('[handleQuickApproveSession] background review notice:', e);
    });
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

        <ModuleErrorBoundary moduleName="قائمة اعتماد الورديات" colors={colors} onReset={onRefresh}>
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
              <ModuleErrorBoundary
                key={session.id}
                moduleName={`بطاقة وردية ${session.employee_name || 'المندوب'}`}
                colors={colors}
              >
                <ApprovalSessionCard
                  session={session}
                  empRecord={employeeMap.get(String(session.employee_id))}
                  colors={colors}
                  isDarkMode={isDarkMode}
                  isRTL={isRTL}
                  onPreviewPhoto={onPreviewPhoto}
                  onQuickApprove={handleQuickApproveSession}
                  onOpenEdit={openSessionModal}
                />
              </ModuleErrorBoundary>
            ))
          )}
        </ModuleErrorBoundary>
      </ScrollView>

      <ModuleErrorBoundary
        moduleName="نافذة تعديل واعتماد الوردية"
        colors={colors}
        onReset={() => setSelectedSession(null)}
      >
        <ApprovalEditModal
          selectedSession={selectedSession}
          employeeMap={employeeMap}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          editedStartDate={editedStartDate}
          editedStartTime={editedStartTime}
          editedStartKm={editedStartKm}
          editedEndDate={editedEndDate}
          editedEndTime={editedEndTime}
          editedEndKm={editedEndKm}
          editedOrders={editedOrders}
          editedFuel={editedFuel}
          editedAppId={editedAppId}
          reviewNotes={reviewNotes}
          submitting={submitting}
          datePickerTarget={datePickerTarget}
          isIdentifierPickerOpen={isIdentifierPickerOpen}
          loadingIdentifiers={loadingIdentifiers}
          filteredIdentifiers={filteredIdentifiers}
          identifierAppFilter={identifierAppFilter}
          identifierSearchText={identifierSearchText}
          manualIdInput={manualIdInput}
          onChangeStartTime={setEditedStartTime}
          onChangeStartKm={setEditedStartKm}
          onChangeEndTime={setEditedEndTime}
          onChangeEndKm={setEditedEndKm}
          onChangeOrders={setEditedOrders}
          onChangeFuel={setEditedFuel}
          onChangeAppId={setEditedAppId}
          onChangeReviewNotes={setReviewNotes}
          onOpenDatePicker={setDatePickerTarget}
          onSelectDate={(dateStr) => {
            if (datePickerTarget === 'START') {
              setEditedStartDate(dateStr);
            } else if (datePickerTarget === 'END') {
              setEditedEndDate(dateStr);
            }
            setDatePickerTarget(null);
          }}
          onCloseDatePicker={() => setDatePickerTarget(null)}
          onOpenIdentifierPicker={() => {
            setIdentifierSearchText('');
            setManualIdInput(editedAppId || '');
            setIsIdentifierPickerOpen(true);
          }}
          onCloseIdentifierPicker={() => setIsIdentifierPickerOpen(false)}
          onChangeAppFilter={setIdentifierAppFilter}
          onChangeSearchText={setIdentifierSearchText}
          onChangeManualInput={setManualIdInput}
          onConfirmSession={handleConfirmSession}
          onClose={() => setSelectedSession(null)}
        />
      </ModuleErrorBoundary>
    </View>
  );
});
