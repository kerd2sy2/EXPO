import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { ThemeColors } from '../../types/delegate';
import { CustodyExpenseItem } from '../../services/custodyService';
import { formatImageUrl } from '../../services/api';
import { toArabicDigits, formatArabicNumber } from '../../utils/formatters';

export interface ExpenseCardProps {
  item: CustodyExpenseItem;
  idx: number;
  totalCount: number;
  catObj: { key: string; label: string; icon: string; color: string; bg: string };
  fullImg: string | null;
  timeStr: string;
  dateStr: string;
  isReorderMode: boolean;
  colors: ThemeColors;
  isDarkMode: boolean;
  onPressDetails: () => void;
  onLongPressAction: () => void;
  onPreviewImage: (url: string) => void;
  onOpenReorderModal: (item: CustodyExpenseItem, idx: number) => void;
}

const ExpenseCardComponent: React.FC<ExpenseCardProps> = ({
  item,
  idx,
  totalCount,
  catObj,
  fullImg,
  timeStr,
  dateStr,
  isReorderMode,
  colors,
  isDarkMode,
  onPressDetails,
  onLongPressAction,
  onPreviewImage,
  onOpenReorderModal,
}) => {
  return (
    <View
      style={[
        styles.invoiceCard,
        {
          backgroundColor: isReorderMode
            ? isDarkMode
              ? '#064e3b18'
              : '#ecfdf5'
            : colors.card,
          borderColor: isReorderMode ? '#059669' : colors.border,
          borderWidth: isReorderMode ? 1.5 : 1,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => {
          if (isReorderMode) {
            onOpenReorderModal(item, idx);
          } else {
            onPressDetails();
          }
        }}
        onLongPress={() => {
          if (!isReorderMode) {
            onLongPressAction();
          }
        }}
      >
        {/* Top: Icon + Category + Date & Time Stamp + (Optional Reorder Button in Reorder Mode) + Thumbnail */}
        <View style={styles.invoiceCardTop}>
          <View style={styles.invoiceLeftInfo}>
            <View style={[styles.catBadge, { backgroundColor: catObj.bg }]}>
              <Ionicons name={catObj.icon as any} size={18} color={catObj.color} />
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.invoiceCategory, { color: colors.textPrimary }]}>
                {catObj.label}
              </Text>
              <View style={styles.timestampRow}>
                <Ionicons name="time-outline" size={11} color={colors.textSecondary} />
                <Text style={[styles.invoiceTime, { color: colors.textSecondary }]}>
                  {timeStr} • {toArabicDigits(dateStr)}
                </Text>
              </View>
            </View>
          </View>

          {/* Right side: Reorder Button (Only in Reorder Mode) OR Thumbnail */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 8 }}>
            {isReorderMode ? (
              <TouchableOpacity
                style={[
                  styles.reorderCardPillBtn,
                  {
                    backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
                    borderColor: '#059669',
                  },
                ]}
                onPress={() => onOpenReorderModal(item, idx)}
                activeOpacity={0.8}
              >
                <Feather name="edit-3" size={13} color="#047857" style={{ marginLeft: 4 }} />
                <Text style={[styles.reorderCardPillText, { color: '#047857' }]}>
                  الكرت #{toArabicDigits(idx + 1)}
                </Text>
              </TouchableOpacity>
            ) : null}

            {/* Thumbnail in corner if attached */}
            {fullImg ? (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onPreviewImage(fullImg);
                }}
                style={styles.cardHeaderThumbBtn}
                activeOpacity={0.8}
                disabled={isReorderMode}
              >
                <ExpoImage
                  source={{ uri: fullImg }}
                  style={styles.cardHeaderThumbImg}
                  cachePolicy="memory-disk"
                />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Middle: Recipient & Note */}
        <View style={styles.invoiceCardMiddle}>
          <View style={styles.invoiceRecipientRow}>
            <Ionicons name="person-outline" size={13} color="#047857" />
            <Text style={[styles.invoiceRecipientText, { color: colors.textPrimary }]} numberOfLines={2}>
              المستلم / البيان: {item.recipient_name || '—'}
            </Text>
          </View>
          {item.export_number ? (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <Ionicons name="barcode-outline" size={13} color="#0284c7" />
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#0284c7' }}>
                رقم الوارد: {item.export_number}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bottom: Amount Badge + Attachment indicator / Reorder Action Prompt */}
        <View style={styles.invoiceCardBottom}>
          <View style={styles.amountPill}>
            <Text style={styles.amountPillVal}>
              {formatArabicNumber(item.amount, 2)}
            </Text>
            <Image
              source={require('../../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={{ width: 13, height: 13, tintColor: '#047857', marginLeft: 4 }}
              resizeMode="contain"
            />
          </View>

          {isReorderMode ? (
            <TouchableOpacity
              style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}
              onPress={() => onOpenReorderModal(item, idx)}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={14} color="#047857" />
              <Text style={{ fontSize: 11, color: '#047857', fontWeight: '800' }}>
                اضغط لتحديد رقم الترتيب
              </Text>
            </TouchableOpacity>
          ) : fullImg ? (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <Ionicons name="image" size={13} color="#047857" />
              <Text style={{ fontSize: 11, color: '#047857', fontWeight: '700' }}>مرفق فاتورة</Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
              <Ionicons name="receipt-outline" size={12} color={colors.textSecondary} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>لا يوجد مرفق لهذا الإيصال</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
};

export const ExpenseCard = React.memo(ExpenseCardComponent);

const styles = StyleSheet.create({
  invoiceCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  invoiceCardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  invoiceLeftInfo: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  catBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  invoiceCategory: {
    fontSize: 13,
    fontWeight: '800',
  },
  timestampRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  invoiceTime: {
    fontSize: 10,
    fontWeight: '600',
  },
  reorderCardPillBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  reorderCardPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardHeaderThumbBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#059669',
  },
  cardHeaderThumbImg: {
    width: '100%',
    height: '100%',
  },
  invoiceCardMiddle: {
    marginBottom: 10,
  },
  invoiceRecipientRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  invoiceRecipientText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  invoiceCardBottom: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.08)',
    paddingTop: 8,
  },
  amountPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  amountPillVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#047857',
  },
});
