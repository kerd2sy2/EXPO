import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, WorkSession } from '../../types/delegate';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { ordersReviewStyles as styles } from './ordersReviewStyles';
import { formatReviewDateTimeFull } from './ordersReviewHelpers';

interface OrderReviewEditModalProps {
  selectedSession: WorkSession | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  editedStartKm: string;
  editedEndKm: string;
  editedOrders: string;
  editedFuel: string;
  reviewNotes: string;
  submitting: boolean;
  onChangeStartKm: (v: string) => void;
  onChangeEndKm: (v: string) => void;
  onChangeOrders: (v: string) => void;
  onChangeFuel: (v: string) => void;
  onChangeReviewNotes: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export const OrderReviewEditModal: React.FC<OrderReviewEditModalProps> = ({
  selectedSession,
  colors,
  isDarkMode,
  isRTL,
  editedStartKm,
  editedEndKm,
  editedOrders,
  editedFuel,
  reviewNotes,
  submitting,
  onChangeStartKm,
  onChangeEndKm,
  onChangeOrders,
  onChangeFuel,
  onChangeReviewNotes,
  onSave,
  onClose,
}) => (
  <Modal
    visible={Boolean(selectedSession)}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <KeyboardAvoidingView
      style={styles.modalBackdrop}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
        <View style={[styles.modalHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
            مراجعة وتعديل الشفت المنتهي
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
          >
            <Ionicons name="close" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {selectedSession && (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View
              style={[
                styles.modalBanner,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.modalEmpName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {selectedSession.employee_name || selectedSession.employee?.name || 'مندوب'}
              </Text>
              <Text style={[styles.modalMetaText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                البداية: {formatReviewDateTimeFull(selectedSession.start_time)}
              </Text>
              <Text style={[styles.modalMetaText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                النهاية: {formatReviewDateTimeFull(selectedSession.end_time)}
              </Text>
            </View>

            <View style={[styles.dualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  كيلو البداية
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.textPrimary,
                      textAlign: 'center',
                    },
                  ]}
                  keyboardType="numeric"
                  value={editedStartKm}
                  onChangeText={(v) => onChangeStartKm(toEnglishDigits(v))}
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
                    },
                  ]}
                  keyboardType="numeric"
                  value={editedEndKm}
                  onChangeText={(v) => onChangeEndKm(toEnglishDigits(v))}
                />
              </View>
            </View>

            <View style={[styles.dualRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
                    },
                  ]}
                  keyboardType="numeric"
                  value={editedOrders}
                  onChangeText={(v) => onChangeOrders(toEnglishDigits(v))}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  بنزين (ر.س)
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.inputBg,
                      borderColor: colors.inputBorder,
                      color: colors.textPrimary,
                      textAlign: 'center',
                    },
                  ]}
                  keyboardType="numeric"
                  value={editedFuel}
                  onChangeText={(v) => onChangeFuel(toEnglishDigits(v))}
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              ملاحظات المراجعة
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
              placeholder="ملاحظات المشرف..."
              placeholderTextColor={colors.textSecondary}
              value={reviewNotes}
              onChangeText={onChangeReviewNotes}
            />

            <TouchableOpacity
              style={[styles.saveReviewBtn, { backgroundColor: '#10b981' }]}
              onPress={onSave}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done-circle" size={20} color="#ffffff" />
                  <Text style={styles.saveReviewBtnText}>حفظ واعتماد البيانات</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </KeyboardAvoidingView>
  </Modal>
);
