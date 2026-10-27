import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { CategoryItem } from './AhdaAddExpenseModal';
import { toArabicDigits } from '../../utils/formatters';
import { CustodyDayData } from '../../services/custodyService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AhdaEditExpenseModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  categories: CategoryItem[];
  editCategory: string;
  setEditCategory: (cat: string) => void;
  editAmount: string;
  setEditAmount: (amt: string) => void;
  editRecipient: string;
  setEditRecipient: (rec: string) => void;
  editDate: string;
  setEditDate: (date: string) => void;
  days?: CustodyDayData[];
  editExportNumber?: string;
  setEditExportNumber?: (val: string) => void;
  editImageUri: string | null;
  setEditImageUri: (uri: string | null) => void;
  onPickImage: (fromCamera: boolean) => void;
  loading: boolean;
  onSave: () => void;
  onDelete?: () => void;
  onClose: () => void;
}

export const AhdaEditExpenseModal: React.FC<AhdaEditExpenseModalProps> = ({
  visible,
  colors,
  isDarkMode,
  categories,
  editCategory,
  setEditCategory,
  editAmount,
  setEditAmount,
  editRecipient,
  setEditRecipient,
  editDate,
  setEditDate,
  days = [],
  editExportNumber = '',
  setEditExportNumber,
  editImageUri,
  setEditImageUri,
  onPickImage,
  loading,
  onSave,
  onDelete,
  onClose,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [pickerYear, setPickerYear] = useState<number>(() => {
    const parts = editDate ? editDate.split('-') : [];
    return parts.length === 3 ? parseInt(parts[0], 10) : new Date().getFullYear();
  });
  const [pickerMonth, setPickerMonth] = useState<number>(() => {
    const parts = editDate ? editDate.split('-') : [];
    return parts.length === 3 ? parseInt(parts[1], 10) : new Date().getMonth() + 1;
  });

  // Keep picker in sync when editDate changes
  React.useEffect(() => {
    if (editDate) {
      const parts = editDate.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        if (!isNaN(y) && !isNaN(m)) {
          setPickerYear(y);
          setPickerMonth(m);
        }
      }
    }
  }, [editDate]);

  const getTodayStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getYesterdayStr = () => {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const todayStr = getTodayStr();
  const yesterdayStr = getYesterdayStr();

  const firstDayIndex = new Date(pickerYear, pickerMonth - 1, 1).getDay();
  const totalDaysInMonth = new Date(pickerYear, pickerMonth, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    cells.push(d);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const weekDayNames = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      try {
        return dt.toLocaleDateString('ar-SA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch {
        return dateStr;
      }
    }
    return dateStr;
  };

  const currentCat = categories.find((c) => c.key === editCategory) || categories[0];
  const isAdvanceCategory = editCategory === 'internet_advance' || editCategory === 'advance';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        style={styles.keyboardModalWrapper}
      >
        <View style={styles.bottomSheetBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
          <View style={[styles.bottomSheetBox, { backgroundColor: colors.card, borderColor: colors.border, zIndex: 10 }]}>
            <View style={styles.sheetIndicator} />

            {/* Header: Exact Title requested "تعديل الفاتورة" */}
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>تعديل الفاتورة</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: SCREEN_HEIGHT * 0.72 }}
            >
              {/* Category Dropdown (شريط منسدل) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>نوع المصروف (القسم)</Text>
                <TouchableOpacity
                  style={[
                    styles.dropdownBar,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: dropdownOpen ? '#047857' : colors.border,
                    },
                  ]}
                  onPress={() => setDropdownOpen(!dropdownOpen)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dropdownSelectedRow}>
                    <View style={[styles.dropdownCatIcon, { backgroundColor: currentCat.bg }]}>
                      <Ionicons name={currentCat.icon as any} size={16} color={currentCat.color} />
                    </View>
                    <Text style={[styles.dropdownBarText, { color: colors.textPrimary }]}>
                      {currentCat.label}
                    </Text>
                  </View>
                  <Ionicons
                    name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Collapsible Dropdown Options */}
                {dropdownOpen && (
                  <View
                    style={[
                      styles.dropdownList,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {categories.map((c) => {
                      const isSelected = editCategory === c.key;
                      return (
                        <TouchableOpacity
                          key={c.key}
                          style={[
                            styles.dropdownItem,
                            isSelected && {
                              backgroundColor: isDarkMode ? '#334155' : '#ecfdf5',
                            },
                          ]}
                          onPress={() => {
                            setEditCategory(c.key);
                            setDropdownOpen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.dropdownItemRight}>
                            <View style={[styles.dropdownCatIcon, { backgroundColor: c.bg }]}>
                              <Ionicons name={c.icon as any} size={15} color={c.color} />
                            </View>
                            <Text
                              style={[
                                styles.dropdownItemText,
                                {
                                  color: isSelected ? '#047857' : colors.textPrimary,
                                  fontWeight: isSelected ? '800' : '600',
                                },
                              ]}
                            >
                              {c.label}
                            </Text>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={18} color="#047857" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Invoice Date & Calendar (تاريخ الفاتورة والتقويم) */}
              <View style={styles.inputGroup}>
                <View style={styles.dateHeaderRow}>
                  <Text style={[styles.sheetLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
                    تاريخ الفاتورة (التقويم) *
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.calendarToggleBadge,
                      {
                        backgroundColor: calendarOpen
                          ? '#047857'
                          : isDarkMode
                          ? '#064e3b'
                          : '#ecfdf5',
                        borderColor: '#059669',
                      },
                    ]}
                    onPress={() => setCalendarOpen(!calendarOpen)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={calendarOpen ? 'chevron-up' : 'calendar'}
                      size={12}
                      color={calendarOpen ? '#ffffff' : '#047857'}
                    />
                    <Text
                      style={[
                        styles.calendarToggleBadgeText,
                        { color: calendarOpen ? '#ffffff' : '#047857' },
                      ]}
                    >
                      {calendarOpen ? 'إغلاق التقويم' : 'تغيير التاريخ'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Date Display Bar */}
                <TouchableOpacity
                  style={[
                    styles.dateBar,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: calendarOpen ? '#047857' : colors.border,
                    },
                  ]}
                  onPress={() => setCalendarOpen(!calendarOpen)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dateBarRight}>
                    <View
                      style={[
                        styles.calendarIconBox,
                        { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5' },
                      ]}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#047857" />
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.dateBarMainText, { color: colors.textPrimary }]}>
                        {formatDisplayDate(editDate) || editDate}
                      </Text>
                      <Text style={[styles.dateBarSubText, { color: colors.textSecondary }]}>
                        {toArabicDigits(editDate)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={calendarOpen ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Quick Date Chips (اليوم - أمس) */}
                <View style={styles.quickDateRow}>
                  <TouchableOpacity
                    style={[
                      styles.quickDateChip,
                      editDate === todayStr && styles.quickDateChipActive,
                      {
                        backgroundColor:
                          editDate === todayStr
                            ? isDarkMode
                              ? '#064e3b'
                              : '#ecfdf5'
                            : isDarkMode
                            ? '#1e293b'
                            : '#f8fafc',
                        borderColor: editDate === todayStr ? '#047857' : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setEditDate(todayStr);
                      const parts = todayStr.split('-');
                      setPickerYear(parseInt(parts[0], 10));
                      setPickerMonth(parseInt(parts[1], 10));
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickDateChipText,
                        {
                          color: editDate === todayStr ? '#047857' : colors.textSecondary,
                          fontWeight: editDate === todayStr ? '800' : '600',
                        },
                      ]}
                    >
                      اليوم
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.quickDateChip,
                      editDate === yesterdayStr && styles.quickDateChipActive,
                      {
                        backgroundColor:
                          editDate === yesterdayStr
                            ? isDarkMode
                              ? '#064e3b'
                              : '#ecfdf5'
                            : isDarkMode
                            ? '#1e293b'
                            : '#f8fafc',
                        borderColor: editDate === yesterdayStr ? '#047857' : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setEditDate(yesterdayStr);
                      const parts = yesterdayStr.split('-');
                      setPickerYear(parseInt(parts[0], 10));
                      setPickerMonth(parseInt(parts[1], 10));
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickDateChipText,
                        {
                          color: editDate === yesterdayStr ? '#047857' : colors.textSecondary,
                          fontWeight: editDate === yesterdayStr ? '800' : '600',
                        },
                      ]}
                    >
                      أمس
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Interactive Expandable Calendar */}
                {calendarOpen && (
                  <View
                    style={[
                      styles.inlineCalendarContainer,
                      {
                        backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
                        borderColor: isDarkMode ? '#334155' : '#cbd5e1',
                      },
                    ]}
                  >
                    {/* Month Nav */}
                    <View
                      style={[
                        styles.calendarMonthRow,
                        {
                          borderColor: colors.border,
                          backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.monthNavBtn}
                        onPress={() => {
                          if (pickerMonth === 1) {
                            setPickerMonth(12);
                            setPickerYear(pickerYear - 1);
                          } else {
                            setPickerMonth(pickerMonth - 1);
                          }
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="chevron-forward" size={18} color={colors.textPrimary} />
                      </TouchableOpacity>

                      <View style={{ alignItems: 'center' }}>
                        <Text style={[styles.calendarMonthTitle, { color: colors.textPrimary }]}>
                          {new Date(pickerYear, pickerMonth - 1, 1).toLocaleDateString('ar-SA', {
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: colors.textSecondary,
                            fontWeight: '700',
                            marginTop: 1,
                          }}
                        >
                          {toArabicDigits(pickerYear)} /{' '}
                          {toArabicDigits(String(pickerMonth).padStart(2, '0'))}
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.monthNavBtn}
                        onPress={() => {
                          if (pickerMonth === 12) {
                            setPickerMonth(1);
                            setPickerYear(pickerYear + 1);
                          } else {
                            setPickerMonth(pickerMonth + 1);
                          }
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="chevron-back" size={18} color={colors.textPrimary} />
                      </TouchableOpacity>
                    </View>

                    {/* Week Header */}
                    <View style={[styles.calendarHeaderWeekRow, { borderBottomColor: colors.border }]}>
                      {weekDayNames.map((w, idx) => (
                        <Text key={idx} style={[styles.calendarHeaderWeekDay, { color: colors.textSecondary }]}>
                          {w}
                        </Text>
                      ))}
                    </View>

                    {/* Calendar Weeks */}
                    <View style={styles.calendarWeeksContainer}>
                      {weeks.map((week, wIdx) => (
                        <View key={`week-${wIdx}`} style={styles.calendarWeekRow}>
                          {week.map((d, dIdx) => {
                            if (d === null) {
                              return <View key={`blank-${dIdx}`} style={styles.calendarDayCellWrapper} />;
                            }

                            const dateFormatted = `${pickerYear}-${String(pickerMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                            const isSelected = dateFormatted === editDate;
                            const isToday = dateFormatted === todayStr;
                            const hasCustodyData = days?.some((dayItem) => dayItem.date === dateFormatted);

                            return (
                              <View key={`day-${d}`} style={styles.calendarDayCellWrapper}>
                                <TouchableOpacity
                                  style={[
                                    styles.calendarDayBtn,
                                    { borderColor: colors.border },
                                    isSelected && { backgroundColor: '#047857', borderColor: '#047857' },
                                    !isSelected && isToday && {
                                      borderColor: '#047857',
                                      borderWidth: 1.5,
                                      backgroundColor: isDarkMode ? '#064e3b33' : '#ecfdf5',
                                    },
                                    !isSelected && !isToday && {
                                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                                    },
                                  ]}
                                  onPress={() => {
                                    setEditDate(dateFormatted);
                                  }}
                                  activeOpacity={0.7}
                                >
                                  <Text
                                    style={[
                                      styles.calendarDayNum,
                                      { color: isSelected ? '#ffffff' : colors.textPrimary },
                                      isToday && !isSelected && { color: '#047857', fontWeight: '800' },
                                    ]}
                                  >
                                    {toArabicDigits(d)}
                                  </Text>
                                  {hasCustodyData && (
                                    <View
                                      style={[
                                        styles.calendarDayDot,
                                        { backgroundColor: isSelected ? '#ffffff' : '#16a34a' },
                                      ]}
                                    />
                                  )}
                                </TouchableOpacity>
                              </View>
                            );
                          })}
                        </View>
                      ))}
                    </View>

                    {/* Quick Button inside calendar: Select Today */}
                    <TouchableOpacity
                      style={[styles.todayQuickBtn, { borderTopColor: colors.border }]}
                      onPress={() => {
                        const parts = todayStr.split('-');
                        setPickerYear(parseInt(parts[0], 10));
                        setPickerMonth(parseInt(parts[1], 10));
                        setEditDate(todayStr);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="today-outline" size={13} color="#047857" style={{ marginLeft: 4 }} />
                      <Text style={styles.todayQuickBtnText}>
                        الانتقال إلى اليوم الحالي ({toArabicDigits(todayStr)})
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Amount */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المبلغ المصروف (ريال) *</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  value={editAmount}
                  onChangeText={setEditAmount}
                />
              </View>

              {/* Statement */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>البيان التفصيلي</Text>
                <TextInput
                  style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                  placeholder="البيان التفصيلي للفاتورة"
                  placeholderTextColor="#94a3b8"
                  value={editRecipient}
                  onChangeText={setEditRecipient}
                />
              </View>

              {/* Outgoing Sequence Number Input (رقم الوارد) for Internet & Personal Advances */}
              {isAdvanceCategory && (
                <View style={styles.inputGroup}>
                  <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={[styles.sheetLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
                      رقم الوارد *
                    </Text>
                    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                      <Ionicons name="barcode-outline" size={12} color="#047857" />
                      <Text style={{ fontSize: 11, color: '#047857', fontWeight: '700' }}>رقم الوارد</Text>
                    </View>
                  </View>
                  <TextInput
                    style={[
                      styles.inputBox,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#f0fdf4',
                        borderColor: '#059669',
                        color: colors.textPrimary,
                        fontWeight: '700',
                        fontSize: 15,
                        textAlign: 'right',
                      },
                    ]}
                    placeholder="مثال: 1/أ"
                    placeholderTextColor="#94a3b8"
                    value={editExportNumber}
                    onChangeText={(val) => setEditExportNumber && setEditExportNumber(val)}
                  />
                  <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4, textAlign: 'right' }}>
                    تسلسل رقم الوارد (مثل 1/أ، 2/أ) مع إمكانية تعديل الرقم أو الحرف
                  </Text>
                </View>
              )}

              {/* Image Upload / Change Section */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>صورة الفاتورة المرفقة</Text>
                {editImageUri ? (
                  <View style={styles.previewContainer}>
                    <Image source={{ uri: editImageUri }} style={styles.previewImage} resizeMode="cover" />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setEditImageUri(null)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={15} color="#ffffff" style={{ marginLeft: 4 }} />
                      <Text style={styles.removeImageText}>حذف الصورة</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imagePickRow}>
                    <TouchableOpacity
                      style={[styles.pickBtn, { backgroundColor: isDarkMode ? '#334155' : '#ecfdf5', borderColor: '#fed7aa' }]}
                      onPress={() => onPickImage(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="camera-outline" size={20} color="#047857" />
                      <Text style={styles.pickBtnText}>تصوير بالكاميرا</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.pickBtn, { backgroundColor: isDarkMode ? '#334155' : '#f0f9ff', borderColor: '#bae6fd' }]}
                      onPress={() => onPickImage(false)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="images-outline" size={20} color="#0284c7" />
                      <Text style={styles.pickBtnText}>من المعرض</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Actions: Save & Cancel Buttons ("حفظ أو إلغاء") */}
              <View style={styles.sheetActions}>
                {/* Cancel Button */}
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: colors.border }]}
                  disabled={loading}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
                </TouchableOpacity>

                {/* Edit / Save Button (Primary) */}
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: '#047857' }]}
                  disabled={loading}
                  onPress={onSave}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <View style={styles.btnInnerRow}>
                      <Ionicons name="checkmark-done-outline" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
                      <Text style={styles.saveBtnText}>حفظ التعديل</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardModalWrapper: {
    flex: 1,
  },
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  dropdownBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dropdownSelectedRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  dropdownBarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownCatIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  dropdownItem: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f033',
  },
  dropdownItemRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  dropdownItemText: {
    fontSize: 13,
  },
  previewContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    height: 140,
    backgroundColor: '#f1f5f9',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  removeImageText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  imagePickRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  pickBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  pickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  sheetActions: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginTop: 10,
  },
  saveBtn: {
    flex: 1.2,
    paddingVertical: 13,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnInnerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 13,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dateHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  calendarToggleBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  calendarToggleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dateBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateBarRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  calendarIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBarMainText: {
    fontSize: 13,
    fontWeight: '700',
  },
  dateBarSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  quickDateRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 8,
  },
  quickDateChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickDateChipActive: {},
  quickDateChipText: {
    fontSize: 11,
  },
  inlineCalendarContainer: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  calendarMonthRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  monthNavBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  calendarHeaderWeekRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  calendarHeaderWeekDay: {
    fontSize: 11,
    fontWeight: '700',
    width: 34,
    textAlign: 'center',
  },
  calendarWeeksContainer: {
    gap: 4,
  },
  calendarWeekRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  calendarDayCellWrapper: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDayBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  calendarDayNum: {
    fontSize: 12,
    fontWeight: '700',
  },
  calendarDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 2,
  },
  todayQuickBtn: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayQuickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
});
