import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DelegateWithStatus, PendingAdvanceRequest, supervisorApi } from '../services/supervisor';
import { ThemeColors } from '../types/delegate';
import { ItemActionBottomSheet } from '../components/modals/ItemActionBottomSheet';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { supervisorReportStyles as styles } from './supervisor-report/supervisorReportStyles';
import {
  polishSupervisorReportText,
  filterDelegatesByQuery,
} from './supervisor-report/supervisorReportHelpers';
import { SupervisorReportsListTab } from './supervisor-report/SupervisorReportsListTab';
import { SupervisorReportFormTab } from './supervisor-report/SupervisorReportFormTab';

interface SupervisorReportScreenProps {
  branchDelegates: DelegateWithStatus[];
  initialMode?: 'list' | 'create';
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onSuccess?: () => void;
  onBack?: () => void;
}

export const SupervisorReportScreen: React.FC<SupervisorReportScreenProps> = ({
  branchDelegates,
  initialMode = 'list',
  colors,
  isDarkMode,
  isRTL,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>(initialMode);
  const [reports, setReports] = useState<PendingAdvanceRequest[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    if (initialMode) {
      setActiveTab(initialMode);
    }
  }, [initialMode]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateWithStatus | null>(null);
  const [reportText, setReportText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [aiSuccessBadge, setAiSuccessBadge] = useState(false);
  const [actionItem, setActionItem] = useState<PendingAdvanceRequest | null>(null);

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const all = await supervisorApi.getAllInvestigations();
      const supReports = all.filter((inv) => inv.type === 'supervisor_report');
      setReports(supReports);
    } catch (e) {
      console.warn('Fetch reports error:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const filteredDelegates = useMemo(
    () => filterDelegatesByQuery(branchDelegates, searchQuery),
    [searchQuery, branchDelegates]
  );

  const handlePolishText = () => {
    if (!reportText.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة نص الملاحظات أو الشكوى أولاً لتحسين صياغتها ولغتها');
      return;
    }

    setIsAiRewriting(true);
    setAiSuccessBadge(false);

    setTimeout(() => {
      try {
        const text = polishSupervisorReportText(reportText);
        setReportText(text);
        setAiSuccessBadge(true);
      } catch (e) {
        console.warn('Polish text error:', e);
      } finally {
        setIsAiRewriting(false);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    if (!selectedDelegate && !editingId) {
      Alert.alert('تنبيه', 'يرجى اختيار المندوب المعني أولاً من شريط البحث');
      return;
    }
    if (!reportText.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة نص التقرير أو الشكوى');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        await supervisorApi.updateInvestigation(editingId, {
          reportText: reportText.trim(),
        });
        Alert.alert('تم التعديل', 'تم تحديث بيانات التقرير الإداري بنجاح.');
      } else {
        await supervisorApi.createEmployeeReportOrAdvance({
          employeeId: selectedDelegate!.id,
          employeeName: selectedDelegate!.name,
          nationalId: selectedDelegate!.national_id,
          type: 'supervisor_report',
          reportText: reportText.trim(),
        });
        Alert.alert(
          'تم بنجاح',
          `تم رفع التقرير الإداري الخاص بالمندوب (${selectedDelegate!.name}) للإدارة.`
        );
      }

      setEditingId(null);
      setSelectedDelegate(null);
      setSearchQuery('');
      setReportText('');
      setAiSuccessBadge(false);
      fetchReports();
      setActiveTab('list');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل حفظ التقرير، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (rep: PendingAdvanceRequest) => {
    setEditingId(rep.id);
    setReportText(rep.report_text || rep.reason || rep.notes || '');
    const del =
      branchDelegates.find((d) => d.id === rep.employee_id) ||
      ({
        id: rep.employee_id,
        name: rep.employee_name,
      } as any);
    setSelectedDelegate(del);
    setActiveTab('create');
  };

  const handleDeleteReport = (rep: PendingAdvanceRequest) => {
    Alert.alert(
      'تأكيد الحذف النهائي',
      `هل أنت متأكد من حذف تقرير المندوب (${rep.employee_name}) نهائياً؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف نهائياً',
          style: 'destructive',
          onPress: async () => {
            try {
              await supervisorApi.deleteInvestigation(rep.id);
              Alert.alert('تم الحذف', 'تم حذف التقرير نهائياً.');
              fetchReports();
              if (onSuccess) onSuccess();
            } catch (err: any) {
              Alert.alert('خطأ', err?.message || 'تعذر حذف التقرير من السيرفر');
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: colors.bg }]}
    >
      {/* Top Mode Segment */}
      <View
        style={[
          styles.segmentContainer,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'list' && { backgroundColor: '#8b5cf6', elevation: 2 },
          ]}
          onPress={() => {
            setEditingId(null);
            setActiveTab('list');
          }}
        >
          <Ionicons
            name="list-outline"
            size={16}
            color={activeTab === 'list' ? '#fff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              { color: activeTab === 'list' ? '#fff' : colors.textSecondary },
            ]}
          >
            سجل تقارير المشرف ({reports.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'create' && { backgroundColor: '#8b5cf6', elevation: 2 },
          ]}
          onPress={() => setActiveTab('create')}
        >
          <Ionicons
            name={editingId ? 'pencil' : 'add-circle-outline'}
            size={16}
            color={activeTab === 'create' ? '#fff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              { color: activeTab === 'create' ? '#fff' : colors.textSecondary },
            ]}
          >
            {editingId ? 'تعديل التقرير' : 'إنشاء تقرير جديد'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          activeTab === 'list' ? (
            <RefreshControl
              refreshing={loadingReports}
              onRefresh={fetchReports}
              colors={['#8b5cf6']}
              tintColor="#8b5cf6"
            />
          ) : undefined
        }
      >
        {activeTab === 'list' ? (
          <ModuleErrorBoundary
            moduleName="سجل تقارير المشرف"
            colors={colors}
            onReset={fetchReports}
          >
            <SupervisorReportsListTab
              reports={reports}
              loadingReports={loadingReports}
              colors={colors}
              isRTL={isRTL}
              onCreateNew={() => setActiveTab('create')}
              onLongPressReport={setActionItem}
            />
          </ModuleErrorBoundary>
        ) : (
          <ModuleErrorBoundary
            moduleName="نموذج تقرير المشرف"
            colors={colors}
            onReset={() => setActiveTab('list')}
          >
            <SupervisorReportFormTab
              editingId={editingId}
              searchQuery={searchQuery}
              onChangeSearchQuery={setSearchQuery}
              filteredDelegates={filteredDelegates}
              selectedDelegate={selectedDelegate}
              onSelectDelegate={setSelectedDelegate}
              reportText={reportText}
              onChangeReportText={(text) => {
                setReportText(text);
                setAiSuccessBadge(false);
              }}
              isAiRewriting={isAiRewriting}
              aiSuccessBadge={aiSuccessBadge}
              isSubmitting={isSubmitting}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              onPolishText={handlePolishText}
              onSubmit={handleSubmit}
              onCancelEdit={() => {
                setEditingId(null);
                setSelectedDelegate(null);
                setReportText('');
                setActiveTab('list');
              }}
            />
          </ModuleErrorBoundary>
        )}
      </ScrollView>

      <ModuleErrorBoundary
        moduleName="قائمة خيارات التقرير"
        colors={colors}
        onReset={() => setActionItem(null)}
      >
        <ItemActionBottomSheet
          visible={!!actionItem}
          title={actionItem ? `تقرير المندوب: ${actionItem.employee_name}` : ''}
          subtitle="اختر الإجراء المطلوب تنفيذه على هذا التقرير"
          itemTypeLabel="التقرير"
          onEdit={() => {
            if (actionItem) handleStartEdit(actionItem);
            setActionItem(null);
          }}
          onDelete={() => {
            if (actionItem) handleDeleteReport(actionItem);
            setActionItem(null);
          }}
          onClose={() => setActionItem(null)}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      </ModuleErrorBoundary>
    </KeyboardAvoidingView>
  );
};
