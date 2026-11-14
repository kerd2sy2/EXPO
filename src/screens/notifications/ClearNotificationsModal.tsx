import React from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { notificationsStyles as styles } from './notificationsStyles';

interface ClearNotificationsModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onConfirmClear: () => void;
  onClose: () => void;
}

export const ClearNotificationsModal: React.FC<ClearNotificationsModalProps> = ({
  visible,
  colors,
  isDarkMode,
  isRTL,
  onConfirmClear,
  onClose,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onClose}>
        <View
          style={[
            styles.clearSheet,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.clearSheetHandle} />
          <View style={[styles.clearSheetIconCircle, { backgroundColor: '#ef444418' }]}>
            <Ionicons name="trash-outline" size={28} color="#ef4444" />
          </View>
          <Text style={[styles.clearSheetTitle, { color: colors.textPrimary }]}>
            حذف وتنظيف صفحة الإشعارات
          </Text>
          <Text style={[styles.clearSheetDesc, { color: colors.textSecondary }]}>
            هل تريد بالتأكيد تفريغ وحذف جميع التنبيهات المعروضة في صفحة الإشعارات؟
          </Text>

          <View style={[styles.clearSheetBtnRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={[styles.clearSheetConfirmBtn, { backgroundColor: '#ef4444' }]}
              onPress={onConfirmClear}
              activeOpacity={0.8}
            >
              <Ionicons name="trash" size={18} color="#ffffff" />
              <Text style={styles.clearSheetConfirmText}>تنظيف الكل</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.clearSheetCancelBtn,
                {
                  backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
                  borderColor: colors.border,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.clearSheetCancelText, { color: colors.textPrimary }]}>
                إلغاء
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};
