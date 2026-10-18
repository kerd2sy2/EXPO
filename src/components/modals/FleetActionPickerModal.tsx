import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

export type FleetActionType = 'oil-change' | 'add-vehicle' | 'accident-report';

interface FleetActionPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: FleetActionType) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

export const FleetActionPickerModal: React.FC<FleetActionPickerModalProps> = ({
  visible,
  onClose,
  onSelectAction,
  colors,
  isDarkMode,
  isRTL,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Drag Handle */}
              <View style={[styles.handleIndicator, { backgroundColor: isDarkMode ? '#3f3f46' : '#cbd5e1' }]} />

              {/* Title & Instructions */}
              <View style={[styles.headerBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>إدارة الأسطول والدبابات</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  اختر الإجراء المطلوب للانتقال لصفحته المخصصة
                </Text>
              </View>

              {/* Options Column */}
              <View style={styles.actionSheetBtnsCol}>
                {/* Option 1: تغيير زيت */}
                <TouchableOpacity
                  style={[
                    styles.sheetOptionBtn,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => {
                    onClose();
                    onSelectAction('oil-change');
                  }}
                >
                  <View style={[styles.sheetOptionIconBox, { backgroundColor: '#0284c718' }]}>
                    <Ionicons name="water-outline" size={22} color="#0284c7" />
                  </View>
                  <View style={[styles.textCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>تغيير زيت</Text>
                    <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                      صرف زيت دوري لدبابات الفرع وتحديث قراءة العداد
                    </Text>
                  </View>
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Option 2: إضافة مركبة جديدة */}
                <TouchableOpacity
                  style={[
                    styles.sheetOptionBtn,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => {
                    onClose();
                    onSelectAction('add-vehicle');
                  }}
                >
                  <View style={[styles.sheetOptionIconBox, { backgroundColor: '#10b98118' }]}>
                    <Ionicons name="add-circle-outline" size={22} color="#10b981" />
                  </View>
                  <View style={[styles.textCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>إضافة مركبة جديدة</Text>
                    <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                      تسجيل دباب جديد في أسطول الفرع وتحديد بيانات اللوحة
                    </Text>
                  </View>
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Option 3: بلاغ عن حادث */}
                <TouchableOpacity
                  style={[
                    styles.sheetOptionBtn,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                      borderColor: colors.border,
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => {
                    onClose();
                    onSelectAction('accident-report');
                  }}
                >
                  <View style={[styles.sheetOptionIconBox, { backgroundColor: '#ef444418' }]}>
                    <Ionicons name="warning-outline" size={22} color="#ef4444" />
                  </View>
                  <View style={[styles.textCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>بلاغ عن حادث</Text>
                    <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                      تسجيل بلاغ صدمة أو حادث لدباب وتحويله للصيانة الطارئة
                    </Text>
                  </View>
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Cancel Button */}
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>إلغاء</Text>
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
    paddingTop: 12,
    paddingBottom: 28,
    paddingHorizontal: 18,
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
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  actionSheetBtnsCol: {
    gap: 10,
    marginBottom: 14,
  },
  sheetOptionBtn: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  sheetOptionIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sheetOptionSub: {
    fontSize: 11,
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
