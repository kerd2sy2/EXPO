import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { BranchItem } from '../../services/api';

interface AhdaBranchSelectorModalProps {
  visible: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  branches: BranchItem[];
  selectedBranchId: string | null;
  mustSelect?: boolean;
  onSelectBranch: (branch: BranchItem) => void;
  onClose: () => void;
}

export const AhdaBranchSelectorModal: React.FC<AhdaBranchSelectorModalProps> = ({
  visible,
  colors,
  isDarkMode,
  branches,
  selectedBranchId,
  mustSelect = false,
  onSelectBranch,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        if (!mustSelect) {
          onClose();
        }
      }}
    >
      <View style={styles.bottomSheetBackdrop}>
        {!mustSelect && (
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={onClose}
          />
        )}
        <View
          style={[
            styles.bottomSheetBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              zIndex: 10,
            },
          ]}
        >
          {/* Handle bar indicator */}
          <View style={styles.sheetIndicator} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.titleGroup}>
              <View style={[styles.headerIconCircle, { backgroundColor: isDarkMode ? '#1e293b' : '#ecfdf5' }]}>
                <Ionicons name="business" size={20} color="#047857" />
              </View>
              <View>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                  {mustSelect ? 'اختر الفرع للبدء' : 'تغيير فرع العهدة'}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                  {mustSelect
                    ? 'يرجى تحديد الفرع أولاً لعزل حركات العهدة والمصروفات بدقة'
                    : 'التبديل بين فروع المؤسسة المسجلة بالنظام'}
                </Text>
              </View>
            </View>

            {!mustSelect && (
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle-outline" size={26} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Strict Isolation Notice Card */}
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#f0fdf4',
                borderColor: isDarkMode ? '#065f46' : '#bbf7d0',
              },
            ]}
          >
            <Ionicons name="shield-checkmark" size={18} color="#047857" style={{ marginTop: 2 }} />
            <Text style={[styles.noticeText, { color: isDarkMode ? '#86efac' : '#166534' }]}>
              🔒 نظام العزل المالي التام: لن تختلط مبالغ ولا فواتير الفرع الأول مع الفرع الثاني تحت أي ظرف.
            </Text>
          </View>

          {/* Branches List */}
          <ScrollView
            style={styles.branchesList}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {branches.map((branch) => {
              const isSelected = selectedBranchId === branch.id;
              return (
                <TouchableOpacity
                  key={branch.id}
                  style={[
                    styles.branchCard,
                    {
                      backgroundColor: isSelected
                        ? isDarkMode
                          ? '#064e3b'
                          : '#ecfdf5'
                        : isDarkMode
                        ? '#1e293b'
                        : '#ffffff',
                      borderColor: isSelected ? '#047857' : colors.border,
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => onSelectBranch(branch)}
                >
                  <View style={styles.branchCardRight}>
                    <View
                      style={[
                        styles.branchIconWrapper,
                        {
                          backgroundColor: isSelected
                            ? '#047857'
                            : isDarkMode
                            ? '#334155'
                            : '#f1f5f9',
                        },
                      ]}
                    >
                      <Ionicons
                        name="storefront-outline"
                        size={20}
                        color={isSelected ? '#ffffff' : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.branchInfo}>
                      <Text
                        style={[
                          styles.branchName,
                          {
                            color: isSelected ? '#047857' : colors.textPrimary,
                            fontWeight: isSelected ? '800' : '700',
                          },
                        ]}
                      >
                        {branch.name}
                      </Text>
                      <Text style={[styles.branchDesc, { color: colors.textSecondary }]}>
                        سجلات العهدة، المصروفات، وباقي الأمس الخاص بالفرع
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? '#047857' : colors.border,
                        backgroundColor: isSelected ? '#047857' : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheetBox: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetIndicator: {
    width: 44,
    height: 5,
    backgroundColor: '#cbd5e1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'right',
  },
  sheetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'right',
  },
  noticeCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    flex: 1,
    textAlign: 'right',
  },
  branchesList: {
    marginTop: 4,
  },
  branchCard: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  branchCardRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  branchIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  branchName: {
    fontSize: 15,
    marginBottom: 3,
    textAlign: 'right',
  },
  branchDesc: {
    fontSize: 11,
    textAlign: 'right',
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
