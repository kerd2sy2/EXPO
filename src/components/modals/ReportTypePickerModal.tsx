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

export type ReportPickerAction =
  | 'supervisor-reports-list'
  | 'supervisor-report-create'
  | 'advances-list'
  | 'advance-create';

interface ReportTypePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAction: (action: ReportPickerAction) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

export const ReportTypePickerModal: React.FC<ReportTypePickerModalProps> = ({
  visible,
  onClose,
  onSelectAction,
  colors,
  isDarkMode,
  isRTL,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Drag Handle */}
              <View style={[styles.handleIndicator, { backgroundColor: isDarkMode ? '#3f3f46' : '#cbd5e1' }]} />

              {/* Title & Instructions */}
              <View style={[styles.headerBox, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>التقارير الميدانية</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  اضغط ضغطة عادية لعرض السجل، أو ضغطة مطولة لإنشاء طلب جديد
                </Text>
              </View>

              {/* Options Column - Styled cleanly like Ohda */}
              <View style={styles.actionSheetBtnsCol}>
                {/* Option 1: تقرير مشرف */}
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
                    onSelectAction('supervisor-reports-list');
                  }}
                  onLongPress={() => {
                    onClose();
                    onSelectAction('supervisor-report-create');
                  }}
                  delayLongPress={400}
                >
                  <View style={[styles.sheetOptionIconBox, { backgroundColor: '#8b5cf618' }]}>
                    <Ionicons name="document-text-outline" size={20} color="#8b5cf6" />
                  </View>
                  <View style={[styles.textCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <View style={[styles.rowTitleBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>تقرير مشرف</Text>
                      <View style={styles.hintBadge}>
                        <Text style={styles.hintBadgeText}>سجل التقارير</Text>
                      </View>
                    </View>
                    <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                      عرض تقارير الفرع (أو اضغط مطولاً لإنشاء تقرير)
                    </Text>
                  </View>
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={18}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {/* Option 2: سلفة */}
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
                    onSelectAction('advances-list');
                  }}
                  onLongPress={() => {
                    onClose();
                    onSelectAction('advance-create');
                  }}
                  delayLongPress={400}
                >
                  <View style={[styles.sheetOptionIconBox, { backgroundColor: '#10b98118' }]}>
                    <Ionicons name="cash-outline" size={20} color="#10b981" />
                  </View>
                  <View style={[styles.textCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <View style={[styles.rowTitleBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.sheetOptionTitle, { color: colors.textPrimary }]}>سلفة</Text>
                      <View style={[styles.hintBadge, { backgroundColor: '#10b98115' }]}>
                        <Text style={[styles.hintBadgeText, { color: '#059669' }]}>سجل السلف</Text>
                      </View>
                    </View>
                    <Text style={[styles.sheetOptionSub, { color: colors.textSecondary }]}>
                      عرض جميع السلف (أو اضغط مطولاً لطلب سلفة جديدة)
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
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
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
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  rowTitleBadge: {
    alignItems: 'center',
    gap: 8,
  },
  sheetOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  hintBadge: {
    backgroundColor: '#8b5cf615',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hintBadgeText: {
    color: '#8b5cf6',
    fontSize: 10,
    fontWeight: '700',
  },
  sheetOptionSub: {
    fontSize: 12,
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
