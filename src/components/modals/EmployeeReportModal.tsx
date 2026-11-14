import React, { useState, useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { DelegateWithStatus, supervisorApi } from '../../services/supervisor';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import {
  ReportType,
  filterReportDelegates,
  rewriteArabicReportText,
} from './employee-report/employeeReportAiRewrite';
import { employeeReportStyles as styles } from './employee-report/employeeReportStyles';
import { EmployeeReportFormBody } from './employee-report/EmployeeReportFormBody';

export interface EmployeeReportModalProps {
  visible: boolean;
  onClose: () => void;
  branchDelegates: DelegateWithStatus[];
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL?: boolean;
  onSuccess?: () => void;
}

/** Modal bottom-sheet allowing supervisors to submit employee reports or advance requests. */
export const EmployeeReportModal: React.FC<EmployeeReportModalProps> = ({
  visible,
  onClose,
  branchDelegates,
  colors,
  isRTL = true,
  onSuccess,
}) => {
  const [reportType, setReportType] = useState<ReportType>('supervisor_report');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDelegate, setSelectedDelegate] = useState<DelegateWithStatus | null>(null);
  const [reportText, setReportText] = useState('');
  const [amount, setAmount] = useState('');
  const [deductionMonth, setDeductionMonth] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiRewriting, setIsAiRewriting] = useState(false);
  const [aiSuccessBadge, setAiSuccessBadge] = useState(false);

  const searchResults = useMemo(
    () => filterReportDelegates(branchDelegates, searchQuery),
    [searchQuery, branchDelegates]
  );

  const handleAiRewrite = () => {
    if (!reportText.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة بعض الكلمات أو الملاحظات أولاً لتحسين صياغتها ولغتها');
      return;
    }

    setIsAiRewriting(true);
    setAiSuccessBadge(false);

    setTimeout(() => {
      try {
        setReportText(rewriteArabicReportText(reportText, reportType));
        setAiSuccessBadge(true);
      } catch (err) {
        console.warn('AI Polish error:', err);
      } finally {
        setIsAiRewriting(false);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    if (!selectedDelegate) {
      Alert.alert('تنبيه', 'يرجى اختيار المندوب المعني أولاً');
      return;
    }
    if (!reportText.trim()) {
      Alert.alert('تنبيه', reportType === 'advance' ? 'يرجى كتابة سبب طلب السلفة' : 'يرجى كتابة تفاصيل التقرير أو الشكوى');
      return;
    }
    if (reportType === 'advance' && (!amount || Number(amount) <= 0)) {
      Alert.alert('تنبيه', 'يرجى إدخال مبلغ السلفة بشكل صحيح');
      return;
    }

    try {
      setIsSubmitting(true);
      await supervisorApi.createEmployeeReportOrAdvance({
        employeeId: selectedDelegate.id,
        employeeName: selectedDelegate.name,
        nationalId: selectedDelegate.national_id,
        type: reportType,
        reportText: reportText.trim(),
        amount: reportType === 'advance' ? Number(amount) : undefined,
        deductionMonth: deductionMonth.trim() || undefined,
        notes: reportType === 'advance' ? `سلفة للمندوب: ${amount} ر.س` : 'تقرير إداري من المشرف الميداني',
      });

      Alert.alert(
        'تم بنجاح',
        reportType === 'advance'
          ? `تم رفع طلب السلفة للمندوب (${selectedDelegate.name}) بنجاح إلى الإدارة`
          : `تم تسجيل التقرير الإداري للمندوب (${selectedDelegate.name}) وإرساله للإدارة بنجاح`
      );

      setSelectedDelegate(null);
      setSearchQuery('');
      setReportText('');
      setAmount('');
      setDeductionMonth('');
      setAiSuccessBadge(false);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      Alert.alert('خطأ', err?.message || 'فشل إرسال الطلب، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <TouchableOpacity activeOpacity={1} onPress={onClose} style={styles.backdrop} />

        <View style={[styles.sheetContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sheetHandleBar}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          </View>

          <View style={styles.sheetHeader}>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تقارير الموظفين والطلبات</Text>
              <Text style={[styles.sheetSub, { color: colors.textSecondary }]}>رفع تقرير مشرف إداري أو تقديم طلب سلفة مالية</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.bg }]}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ModuleErrorBoundary moduleName="EmployeeReportFormBody" colors={colors}>
            <EmployeeReportFormBody
              reportType={reportType}
              onChangeReportType={(type) => {
                setReportType(type);
                setAiSuccessBadge(false);
              }}
              searchQuery={searchQuery}
              onChangeSearch={setSearchQuery}
              searchResults={searchResults}
              selectedDelegate={selectedDelegate}
              onSelectDelegate={(d) => {
                setSelectedDelegate(d);
                setSearchQuery('');
              }}
              onClearDelegate={() => {
                setSelectedDelegate(null);
                setSearchQuery('');
              }}
              amount={amount}
              onChangeAmount={setAmount}
              deductionMonth={deductionMonth}
              onChangeDeductionMonth={setDeductionMonth}
              reportText={reportText}
              onChangeReportText={(txt) => {
                setReportText(txt);
                setAiSuccessBadge(false);
              }}
              isAiRewriting={isAiRewriting}
              aiSuccessBadge={aiSuccessBadge}
              onAiRewrite={handleAiRewrite}
              isSubmitting={isSubmitting}
              onSubmit={handleSubmit}
              colors={colors}
              isRTL={isRTL}
            />
          </ModuleErrorBoundary>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
