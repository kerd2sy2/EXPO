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
import { MonthPickerBottomSheet } from '../components/modals/MonthPickerBottomSheet';
import { ItemActionBottomSheet } from '../components/modals/ItemActionBottomSheet';
import { ModuleErrorBoundary } from '../components/ModuleErrorBoundary';
import { advanceStyles as styles } from './advances/advanceStyles';
import { polishAdvanceReasonText } from './advances/advanceHelpers';
import { AdvancesListTab } from './advances/AdvancesListTab';
import { AdvanceFormTab } from './advances/AdvanceFormTab';

interface AdvanceRequestScreenProps {
  branchDelegates: DelegateWithStatus[];
  initialMode?: 'list' | 'create';
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onSuccess?: () => void;
  onBack?: () => void;
}

export const AdvanceRequestScreen: React.FC<AdvanceRequestScreenProps> = ({
  branchDelegates,
  initialMode = 'list',
  colors,
  isDarkMode,
  isRTL,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>(initialMode);
  const [advances, setAdvances] = useState<PendingAdvanceRequest[]>([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);

  useEffect(() => {
    if (initialMode) {
      setActiveTab(initialMode);
    }
  }, [initialMode]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [advanceType, setAdvanceType] = useState<'advance' | 'internet_advance'>('advance');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateWithStatus | null>(null);
  const [amount, setAmount] = useState('');
  const [deductionMonth, setDeductionMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [aiSuccessBadge, setAiSuccessBadge] = useState(false);
  const [actionItem, setActionItem] = useState<PendingAdvanceRequest | null>(null);

  const fetchAdvances = async () => {
    try {
      setLoadingAdvances(true);
      const all = await supervisorApi.getAllInvestigations();
      const advList = all.filter(
        (inv) => inv.type === 'advance' || inv.type === 'internet_advance'
      );
      setAdvances(advList);
    } catch (e) {
      console.warn('Fetch advances error:', e);
    } finally {
      setLoadingAdvances(false);
    }
  };

  useEffect(() => {
    fetchAdvances();
  }, []);

  const filteredDelegates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return branchDelegates.filter((d) => {
      const name = (d.name || '').toLowerCase();
      const code = (d.employee_number || '').toLowerCase();
      const phone = (d.phone || (d as any).phone_number || '').toLowerCase();
      return name.includes(q) || code.includes(q) || phone.includes(q);
    });
  }, [searchQuery, branchDelegates]);

  const handlePolishText = () => {
    if (!reason.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة سبب طلب السلفة أولاً لتحسين صياغته ولغته');
      return;
    }

    setIsAiRewriting(true);
    setAiSuccessBadge(false);

    setTimeout(() => {
      try {
        setReason(polishAdvanceReasonText(reason));
        setAiSuccessBadge(true);
      } catch (e) {
        console.warn('Polish advance error:', e);
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
    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال مبلغ سلفة صحيح أكبر من صفر');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة سبب طلب السلفة');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        await supervisorApi.updateInvestigation(editingId, {
          amount: numAmount,
          deductionMonth,
          reportText: reason.trim(),
          type: advanceType,
        });
        Alert.alert('تم التعديل', 'تم تحديث بيانات طلب السلفة بنجاح.');
      } else {
        await supervisorApi.createEmployeeReportOrAdvance({
          employeeId: selectedDelegate!.id,
          employeeName: selectedDelegate!.name,
          nationalId: selectedDelegate!.national_id,
          type: advanceType,
          amount: numAmount,
          deductionMonth,
          reportText: reason.trim(),
        });

        Alert.alert(
          'تم رفع الطلب بنجاح',
          `تم إرسال طلب ${advanceType === 'internet_advance' ? 'سلفة باقة إنترنت' : 'السلفة النقدية'} بقيمة (${numAmount} ريال) للمندوب (${selectedDelegate!.name}) إلى الإدارة والحسابات المالية للاعتماد.`
        );
      }

      setEditingId(null);
      setSelectedDelegate(null);
      setSearchQuery('');
      setAmount('');
      setReason('');
      setAiSuccessBadge(false);
      fetchAdvances();
      setActiveTab('list');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل إرسال طلب السلفة، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (adv: PendingAdvanceRequest) => {
    setEditingId(adv.id);
    setAdvanceType(adv.type === 'internet_advance' ? 'internet_advance' : 'advance');
    setAmount(adv.amount ? String(adv.amount) : '');
    setDeductionMonth(adv.deduction_month || '');
    setReason(adv.report_text || adv.reason || adv.notes || '');
    const del = branchDelegates.find((d) => d.id === adv.employee_id) || ({
      id: adv.employee_id,
      name: adv.employee_name,
    } as any);
    setSelectedDelegate(del);
    setActiveTab('create');
  };

  const handleDeleteAdvance = (adv: PendingAdvanceRequest) => {
    Alert.alert(
      'تأكيد الحذف النهائي',
      `هل أنت متأكد من حذف طلب سلفة المندوب (${adv.employee_name}) بقيمة (${adv.amount || 0} ر.س) نهائياً؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف نهائياً',
          style: 'destructive',
          onPress: async () => {
            try {
              await supervisorApi.deleteInvestigation(adv.id);
              Alert.alert('تم الحذف', 'تم حذف طلب السلفة نهائياً.');
              fetchAdvances();
              if (onSuccess) onSuccess();
            } catch (err: any) {
              Alert.alert('خطأ', err?.message || 'تعذر حذف طلب السلفة من السيرفر');
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
      <View style={[styles.segmentContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'list' && { backgroundColor: '#10b981', elevation: 2 },
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
            سجل السلف ({advances.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            activeTab === 'create' && { backgroundColor: '#10b981', elevation: 2 },
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
            {editingId ? 'تعديل السلفة' : 'طلب سلفة جديدة'}
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
              refreshing={loadingAdvances}
              onRefresh={fetchAdvances}
              colors={['#10b981']}
              tintColor="#10b981"
            />
          ) : undefined
        }
      >
        {activeTab === 'list' ? (
          <ModuleErrorBoundary moduleName="سجل طلبات السلف" colors={colors} onReset={fetchAdvances}>
            <AdvancesListTab
              advances={advances}
              loadingAdvances={loadingAdvances}
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              onCreateNew={() => setActiveTab('create')}
              onLongPressItem={setActionItem}
            />
          </ModuleErrorBoundary>
        ) : (
          <ModuleErrorBoundary
            moduleName="نموذج طلب السلفة"
            colors={colors}
            onReset={() => setActiveTab('list')}
          >
            <AdvanceFormTab
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              editingId={editingId}
              advanceType={advanceType}
              searchQuery={searchQuery}
              selectedDelegate={selectedDelegate}
              filteredDelegates={filteredDelegates}
              amount={amount}
              deductionMonth={deductionMonth}
              reason={reason}
              isSubmitting={isSubmitting}
              isAiRewriting={isAiRewriting}
              aiSuccessBadge={aiSuccessBadge}
              onSelectType={(type) => {
                setAdvanceType(type);
                if (type === 'internet_advance' && !amount) setAmount('100');
              }}
              onChangeSearch={setSearchQuery}
              onSelectDelegate={setSelectedDelegate}
              onChangeAmount={setAmount}
              onOpenMonthPicker={() => setShowMonthPicker(true)}
              onChangeReason={(text) => {
                setReason(text);
                setAiSuccessBadge(false);
              }}
              onPolishText={handlePolishText}
              onSubmit={handleSubmit}
              onCancelEdit={() => {
                setEditingId(null);
                setSelectedDelegate(null);
                setAmount('');
                setReason('');
                setActiveTab('list');
              }}
            />
          </ModuleErrorBoundary>
        )}
      </ScrollView>

      <ModuleErrorBoundary
        moduleName="قائمة اختيار الشهر وخيارات السلفة"
        colors={colors}
        onReset={() => {
          setShowMonthPicker(false);
          setActionItem(null);
        }}
      >
        <MonthPickerBottomSheet
          visible={showMonthPicker}
          selectedMonth={deductionMonth}
          onSelect={(m) => setDeductionMonth(m)}
          onClose={() => setShowMonthPicker(false)}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />

        <ItemActionBottomSheet
          visible={!!actionItem}
          title={actionItem ? `سلفة المندوب: ${actionItem.employee_name}` : ''}
          subtitle={actionItem ? `المبلغ: ${actionItem.amount || 0} ر.س | شهر: ${actionItem.deduction_month || '---'}` : ''}
          itemTypeLabel="طلب السلفة"
          onEdit={() => {
            if (actionItem) handleStartEdit(actionItem);
            setActionItem(null);
          }}
          onDelete={() => {
            if (actionItem) handleDeleteAdvance(actionItem);
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
