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
  onPreview: () => void;
  onExportAndShare: () => void;
  onClose: () => void;
}

export const AhdaShakeExcelModal: React.FC<AhdaShakeExcelModalProps> = ({
  visible,
  selectedDate,
  colors,
  isDarkMode,
  loading,
  onPreview,
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

          {/* Lottie Animation / PDF Icon + Title */}
          <View style={styles.headerGroup}>
            <View style={styles.lottieContainer}>
              <LottieView
                source={require('../../../assets/Lottie/json/pdf.json')}
                autoPlay
                loop
                style={{ width: 100, height: 100 }}
              />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              تقرير عهدة ومصاريف اليوم (PDF)
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              تاريخ العهدة: {toArabicDigits(selectedDate)}
            </Text>
          </View>

          {/* Features Highlights Box */}
          <View
            style={[
              styles.featuresBox,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
              },
            ]}
          >
            <View style={styles.featureRow}>
              <Ionicons name="images-outline" size={16} color="#ea580c" />
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                عرض صور الفواتير واضحة بدقة عالية
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="layers-outline" size={16} color="#0284c7" />
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                ترتيب وتجميع كل قسم وفواتيره تحت بعضها
              </Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="document-text-outline" size={16} color="#16a34a" />
              <Text style={[styles.featureText, { color: colors.textPrimary }]}>
                تقرير رسمي بالأرقام العربية معتمد للطباعة
              </Text>
            </View>
          </View>

          {/* Actions List */}
          <View style={styles.actionButtonsCol}>
            {/* 1. Preview PDF Button (معاينة قبل الإرسال) */}
            <TouchableOpacity
              style={[
                styles.actionBtnSecondary,
                {
                  backgroundColor: isDarkMode ? '#334155' : '#f1f5f9',
                  borderColor: isDarkMode ? '#475569' : '#cbd5e1',
                  opacity: loading ? 0.7 : 1,
                },
              ]}
              onPress={onPreview}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                <Ionicons name="eye-outline" size={20} color={isDarkMode ? '#38bdf8' : '#0f172a'} />
                <Text style={[styles.actionBtnSecondaryText, { color: isDarkMode ? '#f8fafc' : '#0f172a' }]}>
                  معاينة الملف قبل الإرسال (PDF)
                </Text>
              </View>
            </TouchableOpacity>

            {/* 2. Share / Send PDF Button */}
            <TouchableOpacity
              style={[
                styles.actionBtnPrimary,
                {
                  backgroundColor: '#ea580c',
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
                  <Text style={styles.actionBtnPrimaryText}>جاري إنشاء ملف الـ PDF وتجهيزه...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
                  <Ionicons name="share-social-outline" size={20} color="#ffffff" />
                  <Text style={styles.actionBtnPrimaryText}>
                    مشاركة وإرسال ملف الـ PDF
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
    shadowRadius: 16,
    elevation: 20,
  },
  handleBar: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 10,
  },
  shakeBadgeRow: {
    alignItems: 'center',
    marginBottom: 6,
  },
  shakeBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffedd5',
  },
  shakeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ea580c',
  },
  headerGroup: {
    alignItems: 'center',
    marginBottom: 14,
  },
  lottieContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  featuresBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 8,
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionButtonsCol: {
    gap: 10,
  },
  actionBtnSecondary: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '800',
  },
  actionBtnPrimary: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
