import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DelegateWithStatus } from '../../services/supervisor';
import { ThemeColors } from '../../types/delegate';
import { supervisorReportStyles as styles } from './supervisorReportStyles';

interface SupervisorReportFormTabProps {
  editingId: string | null;
  searchQuery: string;
  onChangeSearchQuery: (q: string) => void;
  filteredDelegates: DelegateWithStatus[];
  selectedDelegate: DelegateWithStatus | null;
  onSelectDelegate: (del: DelegateWithStatus | null) => void;
  reportText: string;
  onChangeReportText: (text: string) => void;
  isAiRewriting: boolean;
  aiSuccessBadge: boolean;
  isSubmitting: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onPolishText: () => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
}

export const SupervisorReportFormTab: React.FC<SupervisorReportFormTabProps> = ({
  editingId,
  searchQuery,
  onChangeSearchQuery,
  filteredDelegates,
  selectedDelegate,
  onSelectDelegate,
  reportText,
  onChangeReportText,
  isAiRewriting,
  aiSuccessBadge,
  isSubmitting,
  colors,
  isDarkMode,
  isRTL,
  onPolishText,
  onSubmit,
  onCancelEdit,
}) => {
  return (
    <View style={styles.formWrapper}>
      {/* Delegate Search Section */}
      <View style={styles.sectionCard}>
        <Text
          style={[
            styles.fieldLabel,
            { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
          ]}
        >
          اختيار المندوب المعني بالتقرير *
        </Text>

        {selectedDelegate ? (
          <View
            style={[
              styles.selectedCard,
              {
                backgroundColor: isDarkMode ? '#1e1b4b30' : '#f5f3ff',
                borderColor: '#8b5cf6',
              },
            ]}
          >
            <View style={[styles.selectedAvatar, { backgroundColor: '#8b5cf6' }]}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
            <View style={[styles.selectedInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.selectedName, { color: colors.textPrimary }]}>
                {selectedDelegate.name}
              </Text>
              <Text style={[styles.selectedMeta, { color: colors.textSecondary }]}>
                رقم المندوب: {selectedDelegate.employee_number || '---'} | الفرع:{' '}
                {selectedDelegate.branch_name || 'الفرع'}
              </Text>
            </View>
            {!editingId && (
              <TouchableOpacity
                onPress={() => onSelectDelegate(null)}
                style={styles.changeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.changeBtnText}>تغيير</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <Ionicons name="search" size={18} color={colors.textSecondary} />
              <TextInput
                style={[
                  styles.searchInput,
                  { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                ]}
                placeholder="اكتب أول حرفين من اسم أو رقم المندوب..."
                placeholderTextColor={colors.textSecondary}
                value={searchQuery}
                onChangeText={onChangeSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => onChangeSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* Autocomplete Dropdown */}
            {searchQuery.trim().length >= 2 && (
              <View
                style={[
                  styles.dropdownList,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {filteredDelegates.length === 0 ? (
                  <View style={styles.emptySearchRow}>
                    <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
                      لا يوجد مندوب مطابق لبحثك في الفرع
                    </Text>
                  </View>
                ) : (
                  filteredDelegates.slice(0, 6).map((del) => (
                    <TouchableOpacity
                      key={del.id}
                      style={[
                        styles.delegateRow,
                        {
                          borderBottomColor: colors.border,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                      onPress={() => {
                        onSelectDelegate(del);
                        onChangeSearchQuery('');
                      }}
                    >
                      <View style={[styles.avatarMini, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.avatarMiniText, { color: colors.primary }]}>
                          {del.name.charAt(0)}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.delegateRowInfo,
                          { alignItems: isRTL ? 'flex-end' : 'flex-start' },
                        ]}
                      >
                        <Text style={[styles.delName, { color: colors.textPrimary }]}>
                          {del.name}
                        </Text>
                        <Text style={[styles.delMeta, { color: colors.textSecondary }]}>
                          {del.employee_number ? `كود: ${del.employee_number}` : del.phone || ''}
                        </Text>
                      </View>
                      <Ionicons
                        name={isRTL ? 'chevron-back' : 'chevron-forward'}
                        size={18}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Report Text Section */}
      <View style={styles.sectionCard}>
        <View
          style={[
            styles.labelWithActionRow,
            { flexDirection: isRTL ? 'row-reverse' : 'row' },
          ]}
        >
          <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
            تفاصيل التقرير أو الشكوى الإدارية *
          </Text>

          <TouchableOpacity
            style={[
              styles.aiBtn,
              { backgroundColor: colors.primaryLight, borderColor: colors.primary },
            ]}
            onPress={onPolishText}
            disabled={isAiRewriting}
            activeOpacity={0.8}
          >
            {isAiRewriting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="sparkles" size={14} color={colors.primary} />
                <Text style={[styles.aiBtnText, { color: colors.primary }]}>
                  تحسين الصياغة واللهجة
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          style={[
            styles.textArea,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.textPrimary,
              textAlign: isRTL ? 'right' : 'left',
            },
          ]}
          multiline
          numberOfLines={6}
          placeholder="اكتب الملاحظات أو الشكوى (سريعة أو بالعامية)، واضغط على تحسين الصياغة لضبط اللهجة واللغة فصحى ومباشرة بدون إطالة..."
          placeholderTextColor={colors.textSecondary}
          value={reportText}
          onChangeText={onChangeReportText}
        />

        {aiSuccessBadge && (
          <View style={[styles.aiBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="checkmark-circle" size={14} color="#10B981" />
            <Text style={styles.aiBadgeText}>
              تم تحسين الصياغة وتعديل اللهجة فصحى ومباشرة
            </Text>
          </View>
        )}
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, { backgroundColor: '#8b5cf6' }]}
        onPress={onSubmit}
        disabled={isSubmitting}
        activeOpacity={0.85}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name={editingId ? 'save' : 'paper-plane'} size={18} color="#fff" />
            <Text style={styles.submitBtnText}>
              {editingId ? 'حفظ تعديلات التقرير' : 'اعتماد وإرسال التقرير للإدارة'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {editingId && (
        <TouchableOpacity
          style={[styles.cancelEditBtn, { borderColor: colors.border }]}
          onPress={onCancelEdit}
        >
          <Text style={[styles.cancelEditBtnText, { color: colors.textSecondary }]}>
            إلغاء التعديل
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
