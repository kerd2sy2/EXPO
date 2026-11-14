import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ExcelImportPreview } from '../../../types/target';
import { importOrdersMainStyles as styles } from './importOrdersMainStyles';
import { importOrdersRowStyles as rStyles } from './importOrdersRowStyles';

interface ImportPreviewSectionProps {
  preview: ExcelImportPreview;
  isDarkMode: boolean;
  dedupAction: 'IGNORE_DUPLICATES' | 'REPLACE_DUPLICATES' | 'CANCEL';
  onChangeDedupAction: (action: 'IGNORE_DUPLICATES' | 'REPLACE_DUPLICATES' | 'CANCEL') => void;
  confirming: boolean;
  onConfirm: () => void;
  showRowsPreview: boolean;
  onToggleRowsPreview: () => void;
}

export const ImportPreviewSection: React.FC<ImportPreviewSectionProps> = ({
  preview,
  isDarkMode,
  dedupAction,
  onChangeDedupAction,
  confirming,
  onConfirm,
  showRowsPreview,
  onToggleRowsPreview,
}) => {
  return (
    <View style={styles.previewSection}>
      <View style={styles.statsRow}>
        <View style={[styles.statBadge, isDarkMode && styles.darkCard]}>
          <Text style={styles.statBadgeNum}>{preview.total_rows}</Text>
          <Text style={styles.statBadgeLabel}>عدد الصفوف</Text>
        </View>
        <View style={[styles.statBadge, isDarkMode && styles.darkCard]}>
          <Text style={[styles.statBadgeNum, { color: '#0284c7' }]}>{preview.total_orders}</Text>
          <Text style={styles.statBadgeLabel}>إجمالي الطلبات</Text>
        </View>
        <View style={[styles.statBadge, isDarkMode && styles.darkCard]}>
          <Text style={styles.statBadgeNum}>{preview.identifiers_count}</Text>
          <Text style={styles.statBadgeLabel}>المعرفين</Text>
        </View>
        <View style={[styles.statBadge, isDarkMode && styles.darkCard]}>
          <Text style={styles.statBadgeNum}>{preview.drivers_count}</Text>
          <Text style={styles.statBadgeLabel}>المندوبين</Text>
        </View>
      </View>

      {preview.has_duplicates && (
        <View style={styles.dupWarningCard}>
          <View style={styles.dupWarningHeader}>
            <Ionicons name="warning-outline" size={22} color="#b45309" />
            <Text style={styles.dupWarningTitle}>
              تنبيه: تم اكتشاف {preview.duplicates_count} طلب مكرر لنفس التاريخ!
            </Text>
          </View>
          <Text style={styles.dupWarningSub}>يرجى تحديد الإجراء المطلوب للتعامل مع السجلات المكررة:</Text>

          <View style={styles.dupActionsRow}>
            <TouchableOpacity
              style={[styles.dupActionPill, dedupAction === 'IGNORE_DUPLICATES' && styles.dupActionActive]}
              onPress={() => onChangeDedupAction('IGNORE_DUPLICATES')}
            >
              <Text style={[styles.dupActionText, dedupAction === 'IGNORE_DUPLICATES' && styles.dupActionTextActive]}>
                تجاهل المكرر
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dupActionPill, dedupAction === 'REPLACE_DUPLICATES' && styles.dupActionActive]}
              onPress={() => onChangeDedupAction('REPLACE_DUPLICATES')}
            >
              <Text style={[styles.dupActionText, dedupAction === 'REPLACE_DUPLICATES' && styles.dupActionTextActive]}>
                استبدال البيانات
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dupActionPill, dedupAction === 'CANCEL' && styles.dupActionCancelActive]}
              onPress={() => onChangeDedupAction('CANCEL')}
            >
              <Text style={[styles.dupActionText, dedupAction === 'CANCEL' && styles.dupActionTextActive]}>
                إلغاء العملية
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {((preview.empty_identifiers_count ?? 0) > 0 || (preview.warnings && preview.warnings.length > 0)) && (
        <View style={styles.emptyIdentWarningCard}>
          <View style={styles.emptyIdentWarningHeader}>
            <Ionicons name="alert-circle-outline" size={22} color="#c2410c" />
            <Text style={styles.emptyIdentWarningTitle}>
              تنبيه: يوجد {preview.empty_identifiers_count || preview.warnings?.length} صف بدون اسم معرف!
            </Text>
          </View>
          <Text style={styles.emptyIdentWarningSub}>
            تم ترك المعرف فارغاً كما هو في ملف الإكسل دون استبداله باسم المندوب.
          </Text>
        </View>
      )}

      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity
          style={[styles.confirmBtn, confirming && styles.disabledBtn]}
          onPress={onConfirm}
          disabled={confirming}
          activeOpacity={0.8}
        >
          {confirming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#fff" />
              <Text style={styles.confirmBtnText}>حفظ في قاعدة البيانات</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.previewDropdownBtn,
            isDarkMode && styles.darkPreviewDropdownBtn,
            showRowsPreview && styles.previewDropdownBtnActive,
          ]}
          onPress={onToggleRowsPreview}
          activeOpacity={0.7}
        >
          <View style={styles.previewDropdownContent}>
            <View style={styles.previewDropdownLeft}>
              <Ionicons
                name={showRowsPreview ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={showRowsPreview ? '#0284c7' : isDarkMode ? '#94a3b8' : '#64748b'}
              />
              <Text style={[styles.previewDropdownHint, isDarkMode && styles.darkTextSecondary]}>
                {showRowsPreview ? 'إغلاق المعاينة' : 'اضغط للعرض'}
              </Text>
            </View>
            <View style={styles.previewDropdownRight}>
              <Ionicons
                name={showRowsPreview ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={showRowsPreview ? '#0284c7' : isDarkMode ? '#f8fafc' : '#1e293b'}
              />
              <Text style={[styles.previewDropdownTitle, isDarkMode && styles.darkText, showRowsPreview && { color: '#0284c7' }]}>
                معاينة تفاصيل البيانات ({preview.rows.length} صف)
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>

      {showRowsPreview && (
        <View style={styles.collapsibleRowsWrapper}>
          <Text style={[rStyles.tableSectionTitle, isDarkMode && styles.darkText]}>
            الصفوف المستخرجة من الإكسل:
          </Text>
          {preview.rows.map((row, idx) => {
            const isNinja = row.app?.includes('نينجا');
            const isKeeta = row.app?.includes('كيتا') || row.app?.includes('كينتا');
            const isToyo = row.app?.includes('تويو');
            const hasEmptyIdent = !row.identifier || row.identifier.trim() === '';

            return (
              <View
                key={idx}
                style={[
                  rStyles.rowCard,
                  isDarkMode && styles.darkCard,
                  row.is_duplicate && rStyles.dupRowCard,
                  hasEmptyIdent && rStyles.emptyIdentRowCard,
                ]}
              >
                <View style={rStyles.rowTop}>
                  <View style={rStyles.rowMeta}>
                    <Text style={[rStyles.rowIdent, isDarkMode && styles.darkText, hasEmptyIdent && rStyles.emptyIdentText]}>
                      {hasEmptyIdent ? '⚠️ المعرف: (فارغ)' : `المعرف: ${row.identifier}`}
                    </Text>
                    <Text style={rStyles.rowDriver}>المندوب: {row.driver_name}</Text>
                  </View>
                  <View style={rStyles.ordersBadge}>
                    <Text style={rStyles.ordersBadgeText}>{row.total_orders} طلب</Text>
                  </View>
                </View>

                <View style={rStyles.rowBottom}>
                  <View style={[rStyles.appBadge, isNinja && rStyles.appBadgeNinja, isKeeta && rStyles.appBadgeKeeta, isToyo && rStyles.appBadgeToyo]}>
                    <Text style={[rStyles.appBadgeText, isNinja && rStyles.appBadgeNinjaText, isKeeta && rStyles.appBadgeKeetaText, isToyo && rStyles.appBadgeToyoText]}>
                      {row.app || 'غير محدد'}
                    </Text>
                  </View>
                  {row.branch ? (
                    <View style={[rStyles.appBadge, { backgroundColor: '#e0f2fe' }]}>
                      <Text style={[rStyles.appBadgeText, { color: '#0369a1' }]}>فرع {row.branch}</Text>
                    </View>
                  ) : null}
                  {row.plate_number ? <Text style={rStyles.rowSub}>اللوحة: {row.plate_number}</Text> : null}
                  {row.notes ? <Text style={rStyles.rowSub}>ملاحظات: {row.notes}</Text> : null}
                  {row.is_duplicate ? <Text style={rStyles.dupTag}>⚠️ مكرر مسجل مسبقاً</Text> : null}
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.confirmBtn, { marginTop: 14, marginBottom: 16 }, confirming && styles.disabledBtn]}
            onPress={onConfirm}
            disabled={confirming}
            activeOpacity={0.8}
          >
            {confirming ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={20} color="#fff" />
                <Text style={styles.confirmBtnText}>حفظ في قاعدة البيانات</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
