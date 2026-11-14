import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PendingAdvanceRequest } from '../../services/supervisor';
import { ThemeColors } from '../../types/delegate';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { supervisorReportStyles as styles } from './supervisorReportStyles';

interface SupervisorReportsListTabProps {
  reports: PendingAdvanceRequest[];
  loadingReports: boolean;
  colors: ThemeColors;
  isRTL: boolean;
  onCreateNew: () => void;
  onLongPressReport: (rep: PendingAdvanceRequest) => void;
}

export const SupervisorReportsListTab: React.FC<SupervisorReportsListTabProps> = ({
  reports,
  loadingReports,
  colors,
  isRTL,
  onCreateNew,
  onLongPressReport,
}) => {
  return (
    <View style={styles.listWrapper}>
      <View
        style={[
          styles.listHeaderInfo,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        <Text style={[styles.listSectionTitle, { color: colors.textPrimary }]}>
          تقارير المشرف الميدانية
        </Text>
        <Text style={[styles.listHint, { color: colors.textSecondary }]}>
          اضغط مطولاً على أي تقرير لتعديله أو حذفه
        </Text>
      </View>

      {loadingReports && reports.length === 0 ? (
        <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 40 }} />
      ) : reports.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={54} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            لا توجد تقارير مشرف مسجلة
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            يمكنك رفع تقرير جديد عن أي ملاحظة ميدانية أو مخالفة
          </Text>
          <TouchableOpacity
            style={[styles.createFirstBtn, { backgroundColor: '#8b5cf6' }]}
            onPress={onCreateNew}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.createFirstBtnText}>إنشاء أول تقرير</Text>
          </TouchableOpacity>
        </View>
      ) : (
        reports.map((rep) => (
          <ModuleErrorBoundary
            key={rep.id}
            moduleName={`تقرير ${rep.employee_name || ''}`}
            colors={colors}
          >
            <TouchableOpacity
              style={[
                styles.reportCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              activeOpacity={0.8}
              onLongPress={() => onLongPressReport(rep)}
              delayLongPress={350}
            >
              <View style={[styles.reportIconBox, { backgroundColor: '#8b5cf618' }]}>
                <Ionicons name="document-text" size={22} color="#8b5cf6" />
              </View>
              <View style={[styles.reportInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <View
                  style={[
                    styles.repHeaderRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Text style={[styles.repName, { color: colors.textPrimary }]}>
                    {rep.employee_name}
                  </Text>
                  <View style={styles.repBadge}>
                    <Text style={styles.repBadgeText}>تقرير مشرف</Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.repText,
                    { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                  ]}
                  numberOfLines={3}
                >
                  {rep.report_text || rep.reason || rep.notes || 'لا يوجد نص'}
                </Text>
                <View
                  style={[
                    styles.repFooterRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Text style={[styles.repDate, { color: colors.textSecondary }]}>
                    {rep.created_at ? new Date(rep.created_at).toLocaleDateString('ar-SA') : ''}
                  </Text>
                  <Text style={styles.longPressHint}>اضغط مطولاً للخيارات</Text>
                </View>
              </View>
            </TouchableOpacity>
          </ModuleErrorBoundary>
        ))
      )}
    </View>
  );
};
