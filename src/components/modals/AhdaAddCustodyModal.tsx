import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

interface AhdaAddCustodyModalProps {
  visible: boolean;
  colors: ThemeColors;
  selectedDate: string;
  custodyTotalAvailable: number;
  addCustodyAmount: string;
  setAddCustodyAmount: (val: string) => void;
  loading: boolean;
  onSave: () => void;
  onClose: () => void;
}

export const AhdaAddCustodyModal: React.FC<AhdaAddCustodyModalProps> = ({
  visible,
  colors,
  selectedDate,
  custodyTotalAvailable,
  addCustodyAmount,
  setAddCustodyAmount,
  loading,
  onSave,
  onClose,
}) => {
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
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>إضافة مبالغ للعهدة</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close-circle-outline" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginBottom: 14 }}>
              <Text style={[styles.sheetDesc, { color: colors.textSecondary, marginBottom: 0 }]}>
                التاريخ: {selectedDate} • الرصيد المتاح الحالي: {custodyTotalAvailable.toLocaleString()}
              </Text>
              <Image
                source={require('../../../assets/Saudi_Riyal_Symbol.svg.webp')}
                style={{ width: 11, height: 11, tintColor: colors.textSecondary }}
                resizeMode="contain"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.sheetLabel, { color: colors.textPrimary }]}>المبلغ المراد إضافته للعهدة (ريال) *</Text>
              <TextInput
                style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                placeholder="مثال: 500"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={addCustodyAmount}
                onChangeText={setAddCustodyAmount}
                autoFocus
              />
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity style={[styles.cancelBtn, { borderColor: colors.border }]} onPress={onClose}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: '#047857' }]}
                disabled={loading}
                onPress={onSave}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>تأكيد الإضافة للعهدة</Text>
                )}
              </TouchableOpacity>
            </View>
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
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  sheetDesc: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'right',
  },
  inputGroup: {
    marginBottom: 18,
  },
  sheetLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'right',
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  sheetActions: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    justifyContent: 'center',
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
});
