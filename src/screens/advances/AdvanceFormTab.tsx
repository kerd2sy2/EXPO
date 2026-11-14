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
import { advanceStyles as styles } from './advanceStyles';

interface AdvanceFormTabProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  editingId: string | null;
  advanceType: 'advance' | 'internet_advance';
  searchQuery: string;
  selectedDelegate: DelegateWithStatus | null;
  filteredDelegates: DelegateWithStatus[];
  amount: string;
  deductionMonth: string;
  reason: string;
  isSubmitting: boolean;
  isAiRewriting: boolean;
  aiSuccessBadge: boolean;
  onSelectType: (type: 'advance' | 'internet_advance') => void;
  onChangeSearch: (q: string) => void;
  onSelectDelegate: (del: DelegateWithStatus | null) => void;
  onChangeAmount: (val: string) => void;
  onOpenMonthPicker: () => void;
  onChangeReason: (text: string) => void;
  onPolishText: () => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
}

export const AdvanceFormTab: React.FC<AdvanceFormTabProps> = ({
  colors,
  isDarkMode,
  isRTL,
  editingId,
  advanceType,
  searchQuery,
  selectedDelegate,
  filteredDelegates,
  amount,
  deductionMonth,
  reason,
  isSubmitting,
  isAiRewriting,
  aiSuccessBadge,
  onSelectType,
  onChangeSearch,
  onSelectDelegate,
  onChangeAmount,
  onOpenMonthPicker,
  onChangeReason,
  onPolishText,
  onSubmit,
  onCancelEdit,
}) => (
  <View style={styles.formWrapper}>
    {/* Advance Type Toggle */}
    <View style={styles.sectionCard}>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
        نوع السلفة المطلوبة *
      </Text>
      <View style={[styles.typeSegmentRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.typeSegmentItem,
            advanceType === 'advance' && { backgroundColor: '#10b981' },
          ]}
          onPress={() => onSelectType('advance')}
        >
          <Ionicons
            name="cash-outline"
            size={16}
            color={advanceType === 'advance' ? '#fff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.typeSegmentText,
              { color: advanceType === 'advance' ? '#fff' : colors.textPrimary },
            ]}
          >
            سلفة نقدية / شخصية
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.typeSegmentItem,
            advanceType === 'internet_advance' && { backgroundColor: '#0284c7' },
          ]}
          onPress={() => onSelectType('internet_advance')}
        >
          <Ionicons
            name="wifi-outline"
            size={16}
            color={advanceType === 'internet_advance' ? '#fff' : colors.textSecondary}
          />
          <Text
            style={[
              styles.typeSegmentText,
              { color: advanceType === 'internet_advance' ? '#fff' : colors.textPrimary },
            ]}
          >
            سلفة باقة إنترنت
          </Text>
        </TouchableOpacity>
      </View>
    </View>

    {/* Delegate Search Section */}
    <View style={styles.sectionCard}>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
        اختيار المندوب المستفيد من السلفة *
      </Text>

      {selectedDelegate ? (
        <View
          style={[
            styles.selectedCard,
            { backgroundColor: isDarkMode ? '#064e3b25' : '#ecfdf5', borderColor: '#10b981' },
          ]}
        >
          <View style={[styles.selectedAvatar, { backgroundColor: '#10b981' }]}>
            <Ionicons name="person" size={20} color="#fff" />
          </View>
          <View style={[styles.selectedInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.selectedName, { color: colors.textPrimary }]}>{selectedDelegate.name}</Text>
            <Text style={[styles.selectedMeta, { color: colors.textSecondary }]}>
              رقم المندوب: {selectedDelegate.employee_number || '---'} | الفرع: {selectedDelegate.branch_name || 'الفرع'}
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
              onChangeText={onChangeSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => onChangeSearch('')}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {searchQuery.trim().length >= 2 && (
            <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                      onChangeSearch('');
                    }}
                  >
                    <View style={[styles.avatarMini, { backgroundColor: '#10b98120' }]}>
                      <Text style={[styles.avatarMiniText, { color: '#10b981' }]}>
                        {del.name.charAt(0)}
                      </Text>
                    </View>
                    <View style={[styles.delegateRowInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                      <Text style={[styles.delName, { color: colors.textPrimary }]}>{del.name}</Text>
                      <Text style={[styles.delMeta, { color: colors.textSecondary }]}>
                        {del.employee_number ? `كود: ${del.employee_number}` : (del.phone || '')}
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

    {/* Amount Section */}
    <View style={styles.sectionCard}>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
        مبلغ السلفة المطلوب (ريال سعودي) *
      </Text>
      <View
        style={[
          styles.amountInputRow,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <Text style={[styles.currencyLabel, { color: colors.textSecondary }]}>ر.س</Text>
        <TextInput
          style={[
            styles.amountInput,
            { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
          ]}
          placeholder="مثال: 500"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numeric"
          value={amount}
          onChangeText={onChangeAmount}
        />
      </View>

      <View style={[styles.chipsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {(advanceType === 'internet_advance'
          ? ['50', '80', '100', '120', '150']
          : ['200', '300', '500', '800', '1000']
        ).map((val) => (
          <TouchableOpacity
            key={val}
            style={[
              styles.chip,
              {
                backgroundColor: amount === val ? '#10b98125' : colors.card,
                borderColor: amount === val ? '#10b981' : colors.border,
              },
            ]}
            onPress={() => onChangeAmount(val)}
          >
            <Text
              style={[
                styles.chipText,
                { color: amount === val ? '#10b981' : colors.textPrimary, fontWeight: amount === val ? '800' : '600' },
              ]}
            >
              {val} ر.س
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>

    {/* Deduction Month */}
    <View style={styles.sectionCard}>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
        شهر الاستقطاع المستهدف (اضغط للاختيار بدون كتابة) *
      </Text>
      <TouchableOpacity
        style={[
          styles.searchBox,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            justifyContent: 'space-between',
          },
        ]}
        activeOpacity={0.8}
        onPress={onOpenMonthPicker}
      >
        <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="calendar" size={20} color="#10b981" />
          <Text style={[styles.selectedMonthText, { color: colors.textPrimary }]}>
            {deductionMonth || 'اختر الشهر'}
          </Text>
        </View>
        <View style={styles.pickMonthBadge}>
          <Text style={styles.pickMonthBadgeText}>تحديد الشهر</Text>
        </View>
      </TouchableOpacity>
    </View>

    {/* Reason Section */}
    <View style={styles.sectionCard}>
      <View style={[styles.labelWithActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
          سبب السلفة وتفاصيل الحاجة *
        </Text>

        <TouchableOpacity
          style={[styles.aiBtn, { backgroundColor: '#10b98115', borderColor: '#10b981' }]}
          onPress={onPolishText}
          disabled={isAiRewriting}
          activeOpacity={0.8}
        >
          {isAiRewriting ? (
            <ActivityIndicator size="small" color="#10b981" />
          ) : (
            <>
              <Ionicons name="sparkles" size={14} color="#10b981" />
              <Text style={[styles.aiBtnText, { color: '#10b981' }]}>تحسين الصياغة واللهجة</Text>
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
        numberOfLines={5}
        placeholder="اكتب سبب طلب السلفة (سريعاً أو بالعامية)، واضغط على تحسين الصياغة لضبط اللهجة واللغة فصحى ومباشرة..."
        placeholderTextColor={colors.textSecondary}
        value={reason}
        onChangeText={onChangeReason}
      />

      {aiSuccessBadge && (
        <View style={[styles.aiBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
          <Text style={styles.aiBadgeText}>تم تحسين الصياغة وتعديل اللهجة فصحى ومباشرة</Text>
        </View>
      )}
    </View>

    <TouchableOpacity
      style={[styles.submitBtn, { backgroundColor: '#10b981' }]}
      onPress={onSubmit}
      disabled={isSubmitting}
      activeOpacity={0.85}
    >
      {isSubmitting ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Ionicons name={editingId ? 'save' : 'cash'} size={18} color="#fff" />
          <Text style={styles.submitBtnText}>
            {editingId ? 'حفظ تعديلات السلفة' : 'إرسال طلب السلفة للإدارة والمالية'}
          </Text>
        </>
      )}
    </TouchableOpacity>

    {editingId && (
      <TouchableOpacity
        style={[styles.cancelEditBtn, { borderColor: colors.border }]}
        onPress={onCancelEdit}
      >
        <Text style={[styles.cancelEditBtnText, { color: colors.textSecondary }]}>إلغاء التعديل</Text>
      </TouchableOpacity>
    )}
  </View>
);
