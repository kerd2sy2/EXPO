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
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

interface ReportTypePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: 'supervisor-report' | 'advance-request') => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

export const ReportTypePickerModal: React.FC<ReportTypePickerModalProps> = ({
  visible,
  onClose,
  onSelect,
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
              {/* Top Drag Handle Indicator */}
              <View style={[styles.handleIndicator, { backgroundColor: colors.border }]} />

              {/* Header */}
              <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.headerTitles, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>التقارير الميدانية</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    اختر نوع الإجراء المطلوب تسجيله للمندوب
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}
                  onPress={onClose}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* 2 Options Cards */}
              <View style={styles.cardsContainer}>
                {/* Option 1: تقرير مشرف */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isDarkMode ? '#1e1b4b25' : '#f5f3ff',
                      borderColor: '#8b5cf6',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    onClose();
                    onSelect('supervisor-report');
                  }}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: '#8b5cf618' }]}>
                    <Ionicons name="document-text" size={28} color="#8b5cf6" />
                  </View>
                  <View style={[styles.optionInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>تقرير مشرف</Text>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      تسجيل ملاحظة، إفادة، أو مخالفة تشغيلية على مندوب وإرسالها للإدارة
                    </Text>
                  </View>
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={22}
                    color="#8b5cf6"
                  />
                </TouchableOpacity>

                {/* Option 2: سلفة */}
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isDarkMode ? '#064e3b25' : '#ecfdf5',
                      borderColor: '#10b981',
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    onClose();
                    onSelect('advance-request');
                  }}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: '#10b98118' }]}>
                    <Ionicons name="cash" size={28} color="#10b981" />
                  </View>
                  <View style={[styles.optionInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <View style={[styles.badgeTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>سلفة</Text>
                      <View style={styles.approvalNoticeBadge}>
                        <Text style={styles.approvalNoticeText}>اعتماد الإدارة والمالية</Text>
                      </View>
                    </View>
                    <Text style={[styles.optionDesc, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      رفع طلب سلفة مالية لمندوب ليتم اعتمادها من الإدارة والحسابات المالية
                    </Text>
                  </View>
                  <Ionicons
                    name={isRTL ? 'chevron-back' : 'chevron-forward'}
                    size={22}
                    color="#10b981"
                  />
                </TouchableOpacity>
              </View>
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  handleIndicator: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardsContainer: {
    gap: 12,
  },
  optionCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 14,
  },
  iconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionInfo: {
    flex: 1,
    gap: 4,
  },
  badgeTitleRow: {
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  approvalNoticeBadge: {
    backgroundColor: '#10b98122',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  approvalNoticeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
});
