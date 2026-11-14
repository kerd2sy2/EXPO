import React, { useState, useEffect } from 'react';
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
import { ThemeColors } from '../../types/delegate';
import { DelegateWithStatus, supervisorApi } from '../../services/supervisor';
import { toEnglishDigits } from '@shared/utils/plateUtils';
import { showBottomAlert } from '../../components/modals/ActionAlertBottomSheet';
import { fieldStyles as styles } from './fieldStyles';

interface FieldOverrideModalProps {
  delegate: DelegateWithStatus | null;
  mode: 'start' | 'end' | null;
  colors: ThemeColors;
  isRTL: boolean;
  onClose: () => void;
  onSuccess: (employeeId: string, dName: string, wasStart: boolean) => void;
}

export const FieldOverrideModal: React.FC<FieldOverrideModalProps> = ({
  delegate,
  mode,
  colors,
  isRTL,
  onClose,
  onSuccess,
}) => {
  const [bikeNum, setBikeNum] = useState('');
  const [kmValue, setKmValue] = useState('');
  const [ordersValue, setOrdersValue] = useState('');
  const [notesValue, setNotesValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!delegate || !mode) return;
    setBikeNum(delegate.active_motorcycle || delegate.motorcycle_number || '');
    setKmValue(delegate.start_km ? String(delegate.start_km) : '');
    setOrdersValue('');
    setNotesValue('');
  }, [delegate, mode]);

  const handleSubmitOverride = async () => {
    if (!delegate || !mode) return;

    if (mode === 'start' && !bikeNum.trim()) {
      showBottomAlert({
        type: 'warning',
        title: 'بيانات مطلوبة',
        message: 'يرجى إدخال رقم لوحة الدباب لبدء الوردية.',
      });
      return;
    }
    if (!kmValue.trim() || isNaN(Number(toEnglishDigits(kmValue)))) {
      showBottomAlert({
        type: 'warning',
        title: 'بيانات مطلوبة',
        message: 'يرجى إدخال قراءة العداد (الكيلومتر) بشكل صحيح.',
      });
      return;
    }

    try {
      setSubmitting(true);
      const numericKm = Number(toEnglishDigits(kmValue));

      if (mode === 'start') {
        await supervisorApi.startShiftOverride({
          employeeId: delegate.id,
          motorcycleNumber: bikeNum.trim(),
          startKm: numericKm,
          overrideReason: 'بدء وردية بواسطة المشرف',
          notes: notesValue.trim(),
        });
      } else {
        await supervisorApi.endShiftOverride({
          employeeId: delegate.id,
          endKm: numericKm,
          ordersCount: Number(toEnglishDigits(ordersValue)) || 0,
          fuelCost: 0,
          overrideReason: 'إنهاء وردية بواسطة المشرف',
          notes: notesValue.trim(),
        });
      }

      const targetEmpId = String(delegate.id);
      const dName = delegate.name;
      const wasStart = mode === 'start';

      onSuccess(targetEmpId, dName, wasStart);

      setTimeout(() => {
        showBottomAlert({
          type: 'success',
          title: wasStart ? 'تم بدء الوردية' : 'تم إنهاء الوردية',
          message: wasStart
            ? `تم فتح وردية عمل للمندوب (${dName}) بنجاح.`
            : `تم إنهاء وردية المندوب (${dName}) بنجاح.`,
        });
      }, 150);
    } catch (e: any) {
      showBottomAlert({
        type: 'error',
        title: 'تعذر تنفيذ العملية',
        message: e?.message || 'حدث خطأ أثناء تنفيذ العملية.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={Boolean(delegate && mode)}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {mode === 'start'
                ? `بدء وردية: ${delegate?.name}`
                : `إنهاء وردية: ${delegate?.name}`}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close-circle" size={26} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {mode === 'start' && (
              <>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  رقم لوحة الدباب
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
                  placeholder="أدخل رقم اللوحة..."
                  placeholderTextColor={colors.textSecondary}
                  value={bikeNum}
                  onChangeText={setBikeNum}
                />
              </>
            )}

            <Text
              style={[
                styles.inputLabel,
                { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
              {mode === 'start' ? 'كيلو البداية (كم)' : 'كيلو النهاية (كم)'}
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
              placeholder="0"
              placeholderTextColor={colors.textSecondary}
              keyboardType="numeric"
              value={kmValue}
              onChangeText={(v) => setKmValue(toEnglishDigits(v))}
            />

            {mode === 'end' && (
              <>
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                  ]}
                >
                  عدد الطلبات المنجزة
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
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                  value={ordersValue}
                  onChangeText={(v) => setOrdersValue(toEnglishDigits(v))}
                />
              </>
            )}

            <Text
              style={[
                styles.inputLabel,
                { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
              ]}
            >
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
              placeholder="سبب التدخل الإداري..."
              placeholderTextColor={colors.textSecondary}
              value={notesValue}
              onChangeText={setNotesValue}
            />

            <TouchableOpacity
              style={[
                styles.submitOverrideBtn,
                { backgroundColor: mode === 'start' ? '#10b981' : '#ef4444' },
              ]}
              onPress={handleSubmitOverride}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitOverrideBtnText}>
                  {mode === 'start' ? 'تأكيد بدء الوردية' : 'تأكيد إنهاء الوردية'}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
