import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

interface BranchFilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedBranch: 'all' | '1' | '2';
  onSelectBranch: (branch: 'all' | '1' | '2') => void;
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
}

const BRANCH_OPTIONS: { id: 'all' | '1' | '2'; title: string; subtitle: string; icon: keyof typeof Ionicons.glyphMap; badgeColor: string }[] = [
  {
    id: 'all',
    title: 'الكل (جميع الفروع)',
    subtitle: 'عرض إجمالي الطلبات والمعرفين لجميع الفروع',
    icon: 'business-outline',
    badgeColor: '#f97316',
  },
  {
    id: '1',
    title: 'الفرع الأول (فرع 1)',
    subtitle: 'تصفية البيانات وعرض الفرع الأول فقط',
    icon: 'location-outline',
    badgeColor: '#3b82f6',
  },
  {
    id: '2',
    title: 'الفرع الثاني (فرع 2)',
    subtitle: 'تصفية البيانات وعرض الفرع الثاني فقط',
    icon: 'location-outline',
    badgeColor: '#10b981',
  },
];

export const BranchFilterModal: React.FC<BranchFilterModalProps> = ({
  visible,
  onClose,
  selectedBranch,
  onSelectBranch,
  colors,
  isDarkMode = false,
  isRTL = true,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Modal Header */}
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
                ]}
              >
                <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.headerIconCircle, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="git-branch-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                      تحديد فرع العمل
                    </Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                      اختر الفرع لعرض البيانات والتقارير المرتبطة به
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: colors.inputBg }]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Branch Options List */}
              <View style={styles.optionsList}>
                {BRANCH_OPTIONS.map((opt) => {
                  const isSelected = selectedBranch === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.optionCard,
                        {
                          backgroundColor: isSelected
                            ? isDarkMode
                              ? 'rgba(249, 115, 22, 0.12)'
                              : '#fff7ed'
                            : colors.inputBg,
                          borderColor: isSelected ? colors.primary : colors.border,
                          flexDirection: isRTL ? 'row-reverse' : 'row',
                        },
                      ]}
                      onPress={() => {
                        onSelectBranch(opt.id);
                        onClose();
                      }}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.optionIconCircle,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : isDarkMode
                              ? '#27272e'
                              : '#e2e8f0',
                          },
                        ]}
                      >
                        <Ionicons
                          name={opt.icon}
                          size={20}
                          color={isSelected ? '#ffffff' : colors.textSecondary}
                        />
                      </View>

                      <View style={[styles.optionTextCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                        <View style={[styles.optionTitleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                          <Text
                            style={[
                              styles.optionTitle,
                              {
                                color: isSelected ? colors.primary : colors.textPrimary,
                                fontWeight: isSelected ? '700' : '600',
                              },
                            ]}
                          >
                            {opt.title}
                          </Text>
                          {opt.id !== 'all' && (
                            <View
                              style={[
                                styles.branchPill,
                                { backgroundColor: opt.badgeColor + '20', borderColor: opt.badgeColor },
                              ]}
                            >
                              <Text style={[styles.branchPillText, { color: opt.badgeColor }]}>
                                فرع {opt.id}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.optionSubtitle,
                            { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                          ]}
                        >
                          {opt.subtitle}
                        </Text>
                      </View>

                      {/* Selected Indicator */}
                      <View
                        style={[
                          styles.radioCircle,
                          {
                            borderColor: isSelected ? colors.primary : colors.border,
                            backgroundColor: isSelected ? colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {isSelected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsList: {
    padding: 16,
    gap: 12,
  },
  optionCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 12,
  },
  optionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitleRow: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 3,
  },
  optionTitle: {
    fontSize: 15,
  },
  optionSubtitle: {
    fontSize: 12,
  },
  branchPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  branchPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
