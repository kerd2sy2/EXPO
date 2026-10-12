import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

interface CategoryItem {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

interface AhdaSharedImageCategoryModalProps {
  visible: boolean;
  imageUri: string | null;
  categories: CategoryItem[];
  colors: ThemeColors;
  isDarkMode: boolean;
  onSelectCategory: (categoryKey: string) => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AhdaSharedImageCategoryModal: React.FC<AhdaSharedImageCategoryModalProps> = ({
  visible,
  imageUri,
  categories,
  colors,
  isDarkMode,
  onSelectCategory,
  onClose,
}) => {
  if (!visible || !imageUri) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View
          style={[
            styles.modalBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Top Handle */}
          <View style={styles.handleBar} />

          {/* Header Row: Received image thumb + Title */}
          <View style={styles.headerRow}>
            <View style={styles.imageThumbBox}>
              <Image source={{ uri: imageUri }} style={styles.imageThumb} resizeMode="cover" />
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
              </View>
            </View>

            <View style={{ flex: 1, alignItems: 'flex-end', paddingRight: 10 }}>
              <View style={styles.sharedBadge}>
                <Ionicons name="share-social" size={12} color="#ea580c" />
                <Text style={styles.sharedBadgeText}>صورة مشاركة من الهاتف</Text>
              </View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                اختر قسم الفاتورة
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                حدد القسم المناسب لإكمال تسجيل المبلغ والمستلم
              </Text>
            </View>
          </View>

          {/* Categories Grid */}
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
                onPress={() => onSelectCategory(cat.key)}
                activeOpacity={0.75}
              >
                <View style={[styles.iconCircle, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                </View>
                <Text style={[styles.categoryLabel, { color: colors.textPrimary }]}>
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
              إلغاء وتجاهل الصورة
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
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  imageThumbBox: {
    position: 'relative',
    width: 68,
    height: 68,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#ea580c',
  },
  imageThumb: {
    width: '100%',
    height: '100%',
  },
  checkBadge: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  sharedBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 4,
  },
  sharedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
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
