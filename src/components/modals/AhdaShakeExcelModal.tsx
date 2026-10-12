import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { ThemeColors } from '../../types/delegate';
import { toArabicDigits } from '../../utils/formatters';

interface AhdaShakeExcelModalProps {
  visible: boolean;
  selectedDate: string;
  colors: ThemeColors;
  isDarkMode: boolean;
  loading: boolean;
  onExportAndShare: () => void;
  onClose: () => void;
}

export const AhdaShakeExcelModal: React.FC<AhdaShakeExcelModalProps> = ({
  visible,
  selectedDate,
  colors,
  isDarkMode,
  loading,
  onExportAndShare,
  onClose,
}) => {
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
          {/* Top handle bar */}
          <View style={styles.handleBar} />

          {/* Shake trigger badge */}
          <View style={styles.shakeBadgeRow}>
            <View style={styles.shakeBadge}>
              <MaterialCommunityIcons name="cellphone-sound" size={16} color="#ea580c" />
              <Text style={styles.shakeBadgeText}>تم الاستشعار بحركة الهاتف</Text>
            </View>
          </View>

          {/* Lottie Animation + Title */}
          <View style={styles.headerGroup}>
            <View style={styles.lottieContainer}>
              <LottieView
                source={require('../../../assets/excel.json')}
                autoPlay
                loop
                style={{ width: 100, height: 100 }}
              />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              تصدير وإرسال تقرير الإكسل
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              تقرير عهدة ومصاريف يوم: {toArabicDigits(selectedDate)}
            </Text>
          </View>

          {/* Actions List */}
          <View style={styles.actionButtonsCol}>
            {/* 1. Share / Send Excel */}
            <TouchableOpacity
              style={[
                styles.actionBtnPrimary,
                {
                  backgroundColor: '#16a34a',
                  opacity: loading ? 0.7 : 1,
                },
              ]}
              onPress={onExportAndShare}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.actionBtnPrimaryText}>جاري تجهيز وتصدير التقرير...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="share-social-outline" size={20} color="#ffffff" />
                  <Text style={styles.actionBtnPrimaryText}>
                    إرسال ومشاركة ملف الإكسل (واتساب / بريد)
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border }]}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                إلغاء
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
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
    marginBottom: 12,
  },
  shakeBadgeRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  shakeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(234, 88, 12, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  shakeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ea580c',
  },
  headerGroup: {
    alignItems: 'center',
    marginBottom: 16,
  },
  lottieContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionButtonsCol: {
    gap: 10,
  },
  actionBtnPrimary: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  actionBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
