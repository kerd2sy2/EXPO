import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

interface MonthPickerBottomSheetProps {
  visible: boolean;
  selectedMonth: string; // "YYYY-MM"
  onSelect: (monthStr: string) => void;
  onClose: () => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export const MonthPickerBottomSheet: React.FC<MonthPickerBottomSheetProps> = ({
  visible,
  selectedMonth,
  onSelect,
  onClose,
  colors,
  isDarkMode,
  isRTL,
}) => {
  // Generate list of 12 months starting from current month
  const monthsList = React.useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const year = d.getFullYear();
      const monthIdx = d.getMonth();
      const key = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
      const label = `${ARABIC_MONTHS[monthIdx]} ${year}`;
      list.push({ key, label });
    }
    return list;
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.bottomSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Drag Handle */}
              <View style={[styles.handle, { backgroundColor: isDarkMode ? '#3f3f46' : '#cbd5e1' }]} />

              {/* Header */}
              <View style={[styles.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Text style={[styles.title, { color: colors.textPrimary }]}>اختر شهر الاستقطاع</Text>
                  <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                    حدد الشهر المستهدف لخصم السلفة
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
                  onPress={onClose}
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Months Grid / List */}
              <ScrollView style={styles.scrollList} showsVerticalScrollIndicator={false}>
                <View style={styles.grid}>
                  {monthsList.map((m) => {
                    const isSelected = selectedMonth === m.key;
                    return (
                      <TouchableOpacity
                        key={m.key}
                        style={[
                          styles.monthItem,
                          {
                            backgroundColor: isSelected
                              ? '#10b981'
                              : isDarkMode
                              ? '#1e293b'
                              : '#f8fafc',
                            borderColor: isSelected ? '#10b981' : colors.border,
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                          },
                        ]}
                        activeOpacity={0.75}
                        onPress={() => {
                          onSelect(m.key);
                          onClose();
                        }}
                      >
                        <Ionicons
                          name={isSelected ? 'checkmark-circle' : 'calendar-outline'}
                          size={18}
                          color={isSelected ? '#ffffff' : colors.textSecondary}
                        />
                        <Text
                          style={[
                            styles.monthText,
                            {
                              color: isSelected ? '#ffffff' : colors.textPrimary,
                              fontWeight: isSelected ? '800' : '600',
                            },
                          ]}
                        >
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 22,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
  },
  subtitle: {
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
  scrollList: {
    maxHeight: 340,
    marginBottom: 14,
  },
  grid: {
    gap: 8,
  },
  monthItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  monthText: {
    fontSize: 14,
  },
  cancelBtn: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
