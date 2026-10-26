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
import LottieView from 'lottie-react-native';
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
      <View style={styles.modalBackdrop}>
        {/* Clickable Backdrop to close */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.modalBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Top Control Row: Close X Button + Handle Bar */}
          <View style={styles.topControlRow}>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.modalCloseXBtn,
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
            <View style={styles.handleBar} />
            <View style={{ width: 30 }} />
          </View>

          {/* Header Row: Animated Coins Lottie + Title & Subtitle */}
          <View style={styles.headerRow}>
            <View style={styles.lottieBox}>
              <LottieView
                source={require('../../../assets/Lottie/lottie/LqUUJPnzBe.lottie')}
                autoPlay
                loop
                style={{ width: 62, height: 62 }}
              />
            </View>

            <View style={{ flex: 1, alignItems: 'flex-end', paddingRight: 10 }}>
              <View style={styles.badgeRow}>
                <Ionicons name="sparkles" size={12} color="#047857" />
                <Text style={styles.badgeText}>تسجيل مصروف جديد</Text>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                اختر قسم الفاتورة
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                حدد القسم للمتابعة وإدخال المبلغ والبيانات
              </Text>
            </View>
          </View>

          {/* Categories Grid (Identical to in-app modal: row-reverse, 2 columns, width 48.3%) */}
          <View style={styles.categoriesGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.key}
                style={[
                  styles.categoryBtn,
                  {
                    backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                    borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                  },
                ]}
                onPress={() => handleSelect(cat.key)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconCircle, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                </View>
                <Text
                  style={[styles.categoryLabel, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel button */}
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
              إلغاء
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  topControlRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalCloseXBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  lottieBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  categoriesGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoryBtn: {
    width: '48.3%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
    textAlign: 'right',
  },
  cancelBtn: {
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
