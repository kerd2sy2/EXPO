import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { DelegateWithStatus } from '../../../services/supervisor';
import { ModuleErrorBoundary } from '../../ModuleErrorBoundary';
import { ReportType } from './employeeReportAiRewrite';
import { employeeReportStyles as styles } from './employeeReportStyles';

interface EmployeeReportFormBodyProps {
  reportType: ReportType;
  onChangeReportType: (type: ReportType) => void;
  searchQuery: string;
  onChangeSearch: (q: string) => void;
  searchResults: DelegateWithStatus[];
  selectedDelegate: DelegateWithStatus | null;
  onSelectDelegate: (d: DelegateWithStatus) => void;
  onClearDelegate: () => void;
  amount: string;
  onChangeAmount: (v: string) => void;
  deductionMonth: string;
  onChangeDeductionMonth: (v: string) => void;
  reportText: string;
  onChangeReportText: (v: string) => void;
  isAiRewriting: boolean;
  aiSuccessBadge: boolean;
  onAiRewrite: () => void;
  isSubmitting: boolean;
  onSubmit: () => void;
  colors: ThemeColors;
  isRTL: boolean;
}

/** Form body for supervisor incident reports and delegate financial advance requests. */
export const EmployeeReportFormBody: React.FC<EmployeeReportFormBodyProps> = ({
  reportType,
  onChangeReportType,
  searchQuery,
  onChangeSearch,
  searchResults,
  selectedDelegate,
  onSelectDelegate,
  onClearDelegate,
  amount,
  onChangeAmount,
  deductionMonth,
  onChangeDeductionMonth,
  reportText,
  onChangeReportText,
  isAiRewriting,
  aiSuccessBadge,
  onAiRewrite,
  isSubmitting,
  onSubmit,
  colors,
  isRTL,
}) => {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <ModuleErrorBoundary moduleName="EmployeeReportTypeSegment" colors={colors}>
        <View style={[styles.typeSegment, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.typeBtn, reportType === 'supervisor_report' && [styles.typeBtnActive, { backgroundColor: colors.primary }]]}
            onPress={() => onChangeReportType('supervisor_report')}
          >
            <Ionicons name="document-text-outline" size={18} color={reportType === 'supervisor_report' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.typeBtnText, { color: reportType === 'supervisor_report' ? '#fff' : colors.textSecondary }]}>تقرير مشرف / شكوى</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeBtn, reportType === 'advance' && [styles.typeBtnActive, { backgroundColor: colors.primary }]]}
            onPress={() => onChangeReportType('advance')}
          >
            <Ionicons name="cash-outline" size={18} color={reportType === 'advance' ? '#fff' : colors.textSecondary} />
            <Text style={[styles.typeBtnText, { color: reportType === 'advance' ? '#fff' : colors.textSecondary }]}>طلب سلفة مالية</Text>
          </TouchableOpacity>
        </View>
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="EmployeeReportDelegatePicker" colors={colors}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>المندوب المعني *</Text>
        {selectedDelegate ? (
          <View style={[styles.selectedCard, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <View style={styles.selectedAvatar}>
              <Text style={styles.selectedAvatarText}>{selectedDelegate.name ? selectedDelegate.name.charAt(0) : 'م'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.selectedName, { color: colors.primary }]}>{selectedDelegate.name}</Text>
              <Text style={[styles.selectedMeta, { color: colors.textSecondary }]}>
                {selectedDelegate.employee_number ? `كود: ${selectedDelegate.employee_number} • ` : ''}
                {selectedDelegate.phone || ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClearDelegate} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={[styles.searchBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                placeholder="اكتب أول حرفين من اسم أو كود المندوب..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={onChangeSearch}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => onChangeSearch('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {searchResults.length > 0 && (
              <View style={[styles.candidateDropdown, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                {searchResults.map((cand) => (
                  <TouchableOpacity key={cand.id} style={[styles.candidateRow, { borderBottomColor: colors.border }]} onPress={() => onSelectDelegate(cand)}>
                    <View style={[styles.candidateDot, { backgroundColor: colors.primary }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.candidateName, { color: colors.textPrimary }]}>{cand.name}</Text>
                      <Text style={[styles.candidateSub, { color: colors.textSecondary }]}>
                        {cand.employee_number ? `كود: ${cand.employee_number} ` : ''}
                        {cand.motorcycle_number ? `• دباب: ${cand.motorcycle_number}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="arrow-back" size={16} color={colors.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ModuleErrorBoundary>

      {reportType === 'advance' && (
        <View style={styles.advanceRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>مبلغ السلفة (ر.س) *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="مثال: 500"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={onChangeAmount}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>شهر الخصم (اختياري)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="الشهر القادم"
              placeholderTextColor={colors.textSecondary}
              value={deductionMonth}
              onChangeText={onChangeDeductionMonth}
            />
          </View>
        </View>
      )}

      <View style={styles.labelWithAiRow}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
          {reportType === 'advance' ? 'سبب السلفة وتفاصيل الحاجة *' : 'نص الشكوى أو التقرير الإداري *'}
        </Text>

        <TouchableOpacity
          style={[styles.aiBtn, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
          onPress={onAiRewrite}
          disabled={isAiRewriting}
          activeOpacity={0.8}
        >
          {isAiRewriting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Ionicons name="sparkles" size={15} color={colors.primary} />
              <Text style={[styles.aiBtnText, { color: colors.primary }]}>تحسين الصياغة واللهجة</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <TextInput
        style={[
          styles.textArea,
          { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
        ]}
        multiline
        numberOfLines={6}
        placeholder={
          reportType === 'advance'
            ? 'اكتب سبب السلفة، واضغط على تحسين الصياغة لضبط اللهجة واللغة فصحى ومباشرة...'
            : 'اكتب الشكوى أو الملاحظات (سريعة أو بالعامية)، واضغط لتحسين اللهجة واللغة فصحى ومباشرة بدون إطالة...'
        }
        placeholderTextColor={colors.textSecondary}
        value={reportText}
        onChangeText={onChangeReportText}
      />

      {aiSuccessBadge && (
        <View style={styles.aiBadgeRow}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.aiBadgeText}>تم تحسين الصياغة وتعديل اللهجة فصحى ومباشرة</Text>
        </View>
      )}

      <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={onSubmit} disabled={isSubmitting} activeOpacity={0.85}>
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name={reportType === 'advance' ? 'cash' : 'paper-plane'} size={18} color="#fff" />
            <Text style={styles.submitBtnText}>{reportType === 'advance' ? 'تأكيد وإرسال طلب السلفة' : 'اعتماد وإرسال التقرير للإدارة'}</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};
