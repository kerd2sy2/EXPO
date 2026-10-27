import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { ThemeColors } from '../../types/delegate';
import { CustodyExpenseItem } from '../../services/custodyService';
import { formatImageUrl } from '../../services/api';
import { toArabicDigits, formatArabicNumber, getFirstTwoNames } from '../../utils/formatters';

interface ExpenseDetailsModalProps {
  visible: boolean;
  expense: CustodyExpenseItem | null;
  selectedDate: string;
  categories: Array<{ key: string; label: string; icon: string; color: string; bg: string }>;
  colors: ThemeColors;
  isDarkMode: boolean;
  authorName?: string;
  onClose: () => void;
  onPreviewImage: (url: string) => void;
}

export const ExpenseDetailsModal: React.FC<ExpenseDetailsModalProps> = ({
  visible,
  expense,
  selectedDate,
  categories,
  colors,
  isDarkMode,
  authorName,
  onClose,
  onPreviewImage,
}) => {
  if (!expense || !visible) return null;

  const resolvedAuthor =
    authorName ||
    getFirstTwoNames(expense.created_by_name || expense.created_by_username);

  const catObj = categories.find((c) => c.key === expense.category) || categories[categories.length - 1];
  const detailsImg = formatImageUrl(expense.image_url);
  const dateObj = expense.created_at ? new Date(expense.created_at) : null;
  const timeStr = dateObj
    ? dateObj.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
    : '—';
  const dateStr = dateObj
    ? dateObj.toLocaleDateString('ar-SA', { year: 'numeric', month: 'numeric', day: 'numeric' })
    : selectedDate;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={[styles.detailsSheetBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sheetHandle} />

          {/* Header: Category Badge + Close button */}
          <View style={styles.detailsHeaderRow}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle-outline" size={26} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
              <View style={[styles.catBadge, { backgroundColor: catObj.bg }]}>
                <Ionicons name={catObj.icon as any} size={20} color={catObj.color} />
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.detailsCatTitle, { color: colors.textPrimary }]}>
                  فاتورة {catObj.label}
                </Text>
                <Text style={[styles.detailsTimeSub, { color: colors.textSecondary }]}>
                  {timeStr} • {toArabicDigits(dateStr)}
                </Text>
              </View>
            </View>
          </View>

          {/* Main Amount Card */}
          <View
            style={[
              styles.detailsAmountCard,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#ecfdf5',
                borderColor: '#fed7aa',
              },
            ]}
          >
            <Text style={styles.detailsAmountLabel}>المبلغ المسجل للفاتورة</Text>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Text style={styles.detailsAmountValue}>
                {formatArabicNumber(expense.amount, 2)}
              </Text>
              <Image
                source={require('../../../assets/Saudi_Riyal_Symbol.svg.webp')}
                style={{ width: 20, height: 20, tintColor: '#047857' }}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Statement / Description Row */}
          <View
            style={[
              styles.detailsInfoRow,
              { borderColor: colors.border, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc' },
            ]}
          >
            <Text style={[styles.detailsInfoLabel, { color: colors.textSecondary }]}>البيان:</Text>
            <Text style={[styles.detailsInfoValue, { color: colors.textPrimary }]} numberOfLines={3}>
              {expense.recipient_name || '—'}
            </Text>
          </View>

          {/* Author Row if present */}
          {resolvedAuthor ? (
            <View
              style={[
                styles.detailsInfoRow,
                { borderColor: colors.border, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', marginTop: 8 },
              ]}
            >
              <Text style={[styles.detailsInfoLabel, { color: colors.textSecondary }]}>الكاتب:</Text>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <Ionicons name="person-outline" size={15} color="#047857" />
                <Text style={[styles.detailsInfoValue, { color: colors.textPrimary, fontWeight: '700' }]}>
                  {resolvedAuthor}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Incoming Number Row if present */}
          {expense.export_number ? (
            <View
              style={[
                styles.detailsInfoRow,
                { borderColor: colors.border, backgroundColor: isDarkMode ? '#0f172a' : '#f8fafc', marginTop: 8 },
              ]}
            >
              <Text style={[styles.detailsInfoLabel, { color: colors.textSecondary }]}>رقم الوارد:</Text>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <Ionicons name="barcode-outline" size={16} color="#047857" />
                <Text style={[styles.detailsInfoValue, { color: '#047857', fontWeight: '800', fontSize: 15 }]}>
                  {expense.export_number}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Attached Picture Section */}
          <View style={{ width: '100%', marginVertical: 14 }}>
            <Text style={[styles.detailsSectionTitle, { color: colors.textPrimary }]}>
              صورة الفاتورة المرفقة:
            </Text>

            {detailsImg ? (
              <TouchableOpacity
                style={styles.detailsImageContainer}
                activeOpacity={0.85}
                onPress={() => {
                  onClose();
                  onPreviewImage(detailsImg);
                }}
              >
                <ExpoImage
                  source={{ uri: detailsImg }}
                  style={styles.detailsFullImage}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  priority="high"
                />
                <View style={styles.detailsImageZoomBadge}>
                  <Ionicons name="expand" size={14} color="#ffffff" />
                  <Text style={styles.detailsImageZoomText}>اضغط للتكبير الكامل</Text>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={[styles.detailsNoImageBox, { borderColor: colors.border }]}>
                <Ionicons
                  name="image-outline"
                  size={32}
                  color={colors.textSecondary}
                  style={{ opacity: 0.4 }}
                />
                <Text style={[styles.detailsNoImageText, { color: colors.textSecondary }]}>
                  لا توجد صورة مرفقة مع هذه الفاتورة
                </Text>
              </View>
            )}
          </View>

          {/* Long press Hint */}
          <View style={styles.detailsHintBox}>
            <Ionicons name="information-circle-outline" size={15} color="#047857" />
            <Text style={styles.detailsHintText}>
              للتعديل أو الحذف، اضغط مطولاً على كرت الفاتورة من القائمة
            </Text>
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={[styles.sheetCancelBtn, { borderColor: colors.border, marginTop: 10 }]}
            onPress={onClose}
          >
            <Text style={[styles.sheetCancelBtnText, { color: colors.textSecondary }]}>إغلاق</Text>
          </TouchableOpacity>
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
  detailsSheetBox: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 16,
  },
  detailsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  catBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsCatTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  detailsTimeSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  detailsAmountCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  detailsAmountLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  detailsAmountValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#047857',
  },
  detailsInfoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailsInfoLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  detailsInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'left',
  },
  detailsSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 8,
  },
  detailsImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  detailsFullImage: {
    width: '100%',
    height: '100%',
  },
  detailsImageZoomBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailsImageZoomText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  detailsNoImageBox: {
    width: '100%',
    height: 90,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  detailsNoImageText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailsHintBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  detailsHintText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#047857',
  },
  sheetCancelBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
