import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

interface ItemActionBottomSheetProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  itemTypeLabel?: string; // 'التقرير' | 'طلب السلفة'
}

export const ItemActionBottomSheet: React.FC<ItemActionBottomSheetProps> = ({
  visible,
  title,
  subtitle,
  onEdit,
  onDelete,
  onClose,
  colors,
  isDarkMode,
  isRTL,
  itemTypeLabel = 'التقرير',
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Drag Handle */}
              <View style={[styles.handleIndicator, { backgroundColor: isDarkMode ? '#3f3f46' : '#cbd5e1' }]} />

              {/* Header */}
              <View style={[styles.headerBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                {subtitle ? (
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
                ) : null}
              </View>

              {/* Actions Column */}
              <View style={styles.actionSheetBtnsCol}>
                {/* Edit Option */}
                <TouchableOpacity
                  style={[
                    styles.sheetOptionBtn,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    onEdit();
                  }}
                >
                  <View style={[styles.sheetOptionIconBox, { backgroundColor: '#0284c718' }]}>
                    <Feather name="edit-2" size={18} color="#0284c7" />
                  </View>
                  <Text style={[styles.sheetOptionText, { color: colors.textPrimary }]}>
                    تعديل بيانات {itemTypeLabel}
                  </Text>
                </TouchableOpacity>

                {/* Delete Option */}
                <TouchableOpacity
                  style={[
                    styles.sheetOptionBtn,
                    {
                      backgroundColor: isDarkMode ? '#450a0a20' : '#fef2f2',
                      borderColor: '#fecaca',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => {
                    onClose();
                    onDelete();
                  }}
                >
                  <View style={[styles.sheetOptionIconBox, { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </View>
                  <Text style={[styles.sheetOptionText, { color: '#ef4444' }]}>
                    حذف {itemTypeLabel} نهائياً
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
                onPress={onClose}
                activeOpacity={0.75}
              >
                <Text style={[styles.sheetCancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerBox: {
    marginBottom: 16,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
  },
  actionSheetBtnsCol: {
    gap: 10,
    marginBottom: 14,
  },
  sheetOptionBtn: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  sheetOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  sheetCancelBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
