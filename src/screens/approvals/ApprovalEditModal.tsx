import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, WorkSession } from '../../types/delegate';
import { DelegateWithStatus } from '../../services/supervisor';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { DatePickerBottomSheet } from '../../components/modals/DatePickerBottomSheet';
import { approvalsModalStyles as styles } from './approvalsModalStyles';
import { IdentifierDropdownItem } from './approvalsHelpers';
import { IdentifierPickerOverlay } from './IdentifierPickerOverlay';

interface ApprovalEditModalProps {
  selectedSession: WorkSession | null;
  employeeMap: Map<string, DelegateWithStatus>;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  editedStartDate: string;
  editedStartTime: string;
  editedStartKm: string;
  editedEndDate: string;
  editedEndTime: string;
  editedEndKm: string;
  editedOrders: string;
  editedFuel: string;
  editedAppId: string;
  reviewNotes: string;
  submitting: boolean;
  datePickerTarget: 'START' | 'END' | null;
  isIdentifierPickerOpen: boolean;
  loadingIdentifiers: boolean;
  filteredIdentifiers: IdentifierDropdownItem[];
  identifierAppFilter: string;
  identifierSearchText: string;
  manualIdInput: string;
  onChangeStartTime: (val: string) => void;
  onChangeStartKm: (val: string) => void;
  onChangeEndTime: (val: string) => void;
  onChangeEndKm: (val: string) => void;
  onChangeOrders: (val: string) => void;
  onChangeFuel: (val: string) => void;
  onChangeAppId: (val: string) => void;
  onChangeReviewNotes: (val: string) => void;
  onOpenDatePicker: (target: 'START' | 'END') => void;
  onSelectDate: (dateStr: string) => void;
  onCloseDatePicker: () => void;
  onOpenIdentifierPicker: () => void;
  onCloseIdentifierPicker: () => void;
  onChangeAppFilter: (appKey: string) => void;
  onChangeSearchText: (text: string) => void;
  onChangeManualInput: (text: string) => void;
  onConfirmSession: () => void;
  onClose: () => void;
}

export const ApprovalEditModal: React.FC<ApprovalEditModalProps> = ({
  selectedSession,
  employeeMap,
  colors,
  isDarkMode,
  isRTL,
  editedStartDate,
  editedStartTime,
  editedStartKm,
  editedEndDate,
  editedEndTime,
  editedEndKm,
  editedOrders,
  editedFuel,
  editedAppId,
  reviewNotes,
  submitting,
  datePickerTarget,
  isIdentifierPickerOpen,
  loadingIdentifiers,
  filteredIdentifiers,
  identifierAppFilter,
  identifierSearchText,
  manualIdInput,
  onChangeStartTime,
  onChangeStartKm,
  onChangeEndTime,
  onChangeEndKm,
  onChangeOrders,
  onChangeFuel,
  onChangeAppId,
  onChangeReviewNotes,
  onOpenDatePicker,
  onSelectDate,
  onCloseDatePicker,
  onOpenIdentifierPicker,
  onCloseIdentifierPicker,
  onChangeAppFilter,
  onChangeSearchText,
  onChangeManualInput,
  onConfirmSession,
  onClose,
}) => (
  <>
    <Modal
      visible={Boolean(selectedSession)}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (isIdentifierPickerOpen) {
          onCloseIdentifierPicker();
        } else {
          onClose();
        }
      }}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                مراجعة وتعديل بيانات الشفت
              </Text>
              <Text style={[styles.modalSubMeta, { color: colors.textSecondary }]}>
                المندوب: {selectedSession?.employee_name || selectedSession?.employee?.name || employeeMap.get(String(selectedSession?.employee_id))?.name || 'المندوب'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeIconBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {selectedSession && (
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* 1. Start Details (تاريخ، وقت، وكيلو البدء) */}
              <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="play-circle-outline" size={16} color="#0284c7" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>بيانات البداية (Start)</Text>
              </View>

              <View style={[styles.modalDualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1.2 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    تاريخ البدء
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.datePickerBtn,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                    onPress={() => onOpenDatePicker('START')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={17} color={colors.primary} />
                    <Text style={[styles.datePickerBtnText, { color: colors.textPrimary }]}>
                      {editedStartDate || 'اختر التاريخ'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 0.9 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    وقت البدء (س:د)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        color: colors.textPrimary,
                        textAlign: 'center',
                        fontWeight: '700',
                      },
                    ]}
                    placeholder="08:00"
                    placeholderTextColor={colors.textSecondary}
                    value={editedStartTime}
                    onChangeText={(v) => onChangeStartTime(toEnglishDigits(v))}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    كيلو البدء
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        color: colors.textPrimary,
                        textAlign: 'center',
                        fontWeight: '700',
                      },
                    ]}
                    keyboardType="numeric"
                    value={editedStartKm}
                    onChangeText={(v) => onChangeStartKm(toEnglishDigits(v))}
                  />
                </View>
              </View>

              {/* 2. End Details (تاريخ، وقت، وكيلو الانتهاء) */}
              <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="stop-circle-outline" size={16} color="#6366f1" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>بيانات النهاية (End)</Text>
              </View>

              <View style={[styles.modalDualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1.2 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    تاريخ الانهاء
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.datePickerBtn,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        flexDirection: isRTL ? 'row-reverse' : 'row',
                      },
                    ]}
                    onPress={() => onOpenDatePicker('END')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calendar-outline" size={17} color={colors.primary} />
                    <Text style={[styles.datePickerBtnText, { color: colors.textPrimary }]}>
                      {editedEndDate || 'اختر التاريخ'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flex: 0.9 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    وقت الانهاء (س:د)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        color: colors.textPrimary,
                        textAlign: 'center',
                        fontWeight: '700',
                      },
                    ]}
                    placeholder="16:00"
                    placeholderTextColor={colors.textSecondary}
                    value={editedEndTime}
                    onChangeText={(v) => onChangeEndTime(toEnglishDigits(v))}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    كيلو النهاية
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        color: colors.textPrimary,
                        textAlign: 'center',
                        fontWeight: '700',
                      },
                    ]}
                    keyboardType="numeric"
                    value={editedEndKm}
                    onChangeText={(v) => onChangeEndKm(toEnglishDigits(v))}
                  />
                </View>
              </View>

              {/* 3. Performance & Courier ID */}
              <View style={[styles.sectionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="analytics-outline" size={16} color="#10b981" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>الطلبات، البنزين والمعرف</Text>
              </View>

              <View style={[styles.modalDualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    عدد الطلبات
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.primary,
                        color: colors.textPrimary,
                        textAlign: 'center',
                        fontWeight: '800',
                      },
                    ]}
                    keyboardType="numeric"
                    value={editedOrders}
                    onChangeText={(v) => onChangeOrders(toEnglishDigits(v))}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    قيمة البنزين (ر.س)
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        color: colors.textPrimary,
                        textAlign: 'center',
                        fontWeight: '700',
                      },
                    ]}
                    keyboardType="numeric"
                    value={editedFuel}
                    onChangeText={(v) => onChangeFuel(toEnglishDigits(v))}
                  />
                </View>
              </View>

              {/* المعرف (Application ID) - Dropdown Selector Trigger */}
              <View style={{ marginTop: 6 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  المعرف (كود التطبيق / Application ID)
                </Text>
                <TouchableOpacity
                  style={[
                    styles.selectorTriggerBtn,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: editedAppId ? '#10b981' : colors.inputBorder,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  onPress={onOpenIdentifierPicker}
                  activeOpacity={0.8}
                >
                  <View style={[styles.selectorTriggerContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons
                      name="id-card-outline"
                      size={18}
                      color={editedAppId ? '#10b981' : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.selectorTriggerValue,
                        {
                          color: editedAppId ? colors.textPrimary : colors.textSecondary,
                          fontWeight: editedAppId ? '800' : '600',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {editedAppId || 'اختر المعرف من القائمة...'}
                    </Text>
                  </View>
                  <View style={[styles.selectorTriggerBadge, { backgroundColor: '#10b98118' }]}>
                    <Text style={[styles.selectorTriggerBadgeText, { color: '#10b981' }]}>
                      {editedAppId ? 'تغيير' : 'اختيار'}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color="#10b981" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* ملاحظات المشرف */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left', marginTop: 12 }]}>
                ملاحظات المشرف
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.textPrimary,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
                placeholder="أضف ملاحظة (اختياري)..."
                placeholderTextColor={colors.textSecondary}
                value={reviewNotes}
                onChangeText={onChangeReviewNotes}
              />

              <TouchableOpacity
                style={[styles.confirmModalBtn, { backgroundColor: '#10b981' }]}
                onPress={onConfirmSession}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-circle" size={20} color="#ffffff" />
                    <Text style={styles.confirmModalBtnText}>حفظ واعتماد الشفت</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}

          {isIdentifierPickerOpen && (
            <IdentifierPickerOverlay
              colors={colors}
              isDarkMode={isDarkMode}
              isRTL={isRTL}
              loadingIdentifiers={loadingIdentifiers}
              filteredIdentifiers={filteredIdentifiers}
              editedAppId={editedAppId}
              identifierAppFilter={identifierAppFilter}
              identifierSearchText={identifierSearchText}
              manualIdInput={manualIdInput}
              onChangeAppFilter={onChangeAppFilter}
              onChangeSearchText={onChangeSearchText}
              onChangeManualInput={onChangeManualInput}
              onSelectAppId={onChangeAppId}
              onClose={onCloseIdentifierPicker}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>

    <DatePickerBottomSheet
      visible={Boolean(datePickerTarget)}
      selectedDate={datePickerTarget === 'START' ? editedStartDate : editedEndDate}
      onSelectDate={onSelectDate}
      onClose={onCloseDatePicker}
      colors={colors}
      isDarkMode={isDarkMode}
      isRTL={isRTL}
    />
  </>
);
