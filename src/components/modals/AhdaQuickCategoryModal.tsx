import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '../../types/delegate';

export interface CategoryItem {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

interface AhdaQuickCategoryModalProps {
  visible: boolean;
  categories: CategoryItem[];
  colors: ThemeColors;
  isDarkMode: boolean;
  onSelectCategory: (categoryKey: string) => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AhdaQuickCategoryModal: React.FC<AhdaQuickCategoryModalProps> = ({
  visible,
  categories,
  colors,
  isDarkMode,
  onSelectCategory,
  onClose,
}) => {
  if (!visible) return null;

  const handleSelect = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onSelectCategory(key);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalBox,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Top Row: Title, Subtitle, and Close X Button */}
              <View style={styles.headerRow}>
                <TouchableOpacity
                  onPress={onClose}
                  style={[
                    styles.closeBtn,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9',
                      borderColor: colors.border,
                    },
                  ]}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>
                    إضافة مصروف جديد
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    اختر القسم لبدء تسجيل الفاتورة
                  </Text>
                </View>
              </View>

              {/* Categories Grid (2 Columns) */}
              <View style={styles.gridContainer}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryCard,
                      {
                        backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                      },
                    ]}
                    onPress={() => handleSelect(cat.key)}
                    activeOpacity={0.75}
                  >
                    <View
                      style={[
                        styles.iconCircle,
                        {
                          backgroundColor: isDarkMode ? `${cat.color}25` : cat.bg,
                        },
                      ]}
                    >
                      <Ionicons name={cat.icon as any} size={24} color={cat.color} />
                    </View>
                    <Text
                      style={[
                        styles.categoryLabel,
                        { color: colors.textPrimary },
                      ]}
                      numberOfLines={1}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryCard: {
    width: (SCREEN_WIDTH - 42) / 2,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
});
