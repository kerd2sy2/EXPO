import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
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
  const insets = useSafeAreaInsets();

  const handleSelect = (branch: BranchItem) => {
    try {
      Haptics.selectionAsync();
    } catch (_) {}
    onSelectBranch(branch);
  };

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
              paddingBottom: Math.max(insets.bottom, 20) + 12,
            },
          ]}
        >
          {/* Drag Handle Indicator */}
          <View style={[styles.sheetIndicator, { backgroundColor: isDarkMode ? '#475569' : '#cbd5e1' }]} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.titleGroup}>
              <View
                style={[
                  styles.headerIconCircle,
                  { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5' },
                ]}
              >
                <Ionicons name="business" size={20} color="#047857" />
              </View>
              <View style={styles.titleTextCol}>
                <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
                  {mustSelect ? 'اختر الفرع للبدء' : 'تبديل فرع العهدة'}
                </Text>
                <Text style={[styles.sheetSubtitle, { color: colors.textSecondary }]}>
                  {mustSelect
                    ? 'يرجى تحديد الفرع لبدء إدارة حركات العهدة'
                    : 'حدد الفرع لعرض وتسجيل حركات العهدة والمصروفات'}
                </Text>
              </View>
            </View>

            {!mustSelect && (
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.7}
                style={[
                  styles.closeBtn,
                  { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Branches List */}
          <ScrollView
            style={styles.branchesList}
            contentContainerStyle={styles.branchesContent}
            showsVerticalScrollIndicator={false}
          >
            {branches.map((branch) => {
              const isSelected = selectedBranchId?.toLowerCase() === branch.id.toLowerCase();
              return (
                <TouchableOpacity
                  key={branch.id}
                  style={[
                    styles.branchCard,
                    {
                      backgroundColor: isSelected
                        ? isDarkMode
                          ? '#064e3b'
                          : '#f0fdf4'
                        : isDarkMode
                        ? '#1e293b'
                        : '#f8fafc',
                      borderColor: isSelected
                        ? '#047857'
                        : isDarkMode
                        ? '#334155'
                        : '#e2e8f0',
                      borderWidth: isSelected ? 2 : 1,
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => handleSelect(branch)}
                >
                  {/* Left: Radio checkmark circle */}
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor: isSelected ? '#047857' : isDarkMode ? '#64748b' : '#cbd5e1',
                        backgroundColor: isSelected ? '#047857' : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={14} color="#ffffff" />}
                  </View>

                  {/* Center: Branch Info */}
                  <View style={styles.branchInfo}>
                    <View style={styles.branchNameRow}>
                      <Text
                        style={[
                          styles.branchName,
                          {
                            color: isSelected ? (isDarkMode ? '#6ee7b7' : '#047857') : colors.textPrimary,
                            fontWeight: isSelected ? '800' : '700',
                          },
                        ]}
                      >
                        {branch.name}
                      </Text>
                      {isSelected && (
                        <View style={[styles.activeBadge, { backgroundColor: isDarkMode ? '#065f46' : '#dcfce7' }]}>
                          <Text style={[styles.activeBadgeText, { color: isDarkMode ? '#a7f3d0' : '#15803d' }]}>
                            الفرع الحالي
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.branchDesc, { color: colors.textSecondary }]}>
                      {isSelected
                        ? 'يتم عرض وإدارة سجلات ومصروفات هذا الفرع الآن'
                        : 'اضغط للتبديل والاطلاع على عهدة هذا الفرع'}
                    </Text>
                  </View>

                  {/* Right: Branch Icon */}
                  <View
                    style={[
                      styles.branchIconWrapper,
                      {
                        backgroundColor: isSelected
                          ? '#047857'
                          : isDarkMode
                          ? '#334155'
                          : '#e2e8f0',
                      },
                    ]}
                  >
                    <Ionicons
                      name="storefront"
                      size={20}
                      color={isSelected ? '#ffffff' : colors.textSecondary}
                    />
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
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 12,
  },
  sheetIndicator: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  titleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleTextCol: {
    flex: 1,
    alignItems: 'flex-end',
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
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  branchesList: {
    marginTop: 2,
  },
  branchesContent: {
    paddingBottom: 8,
  },
  branchCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 12,
  },
  branchIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  branchInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 12,
  },
  branchNameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  branchName: {
    fontSize: 16,
    textAlign: 'right',
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  branchDesc: {
    fontSize: 11,
    textAlign: 'right',
    lineHeight: 16,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
