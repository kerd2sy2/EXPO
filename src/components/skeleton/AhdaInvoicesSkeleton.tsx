import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemeColors } from '../../types/delegate';
import { SkeletonItem } from './SkeletonItem';

interface AhdaInvoicesSkeletonProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  count?: number;
}

export const AhdaInvoicesSkeleton: React.FC<AhdaInvoicesSkeletonProps> = ({
  colors,
  isDarkMode,
  count = 4,
}) => {
  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, idx) => (
        <View
          key={idx}
          style={[
            styles.invoiceCardBox,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Top: Category Icon + Title + Corner Thumbnail placeholder */}
          <View style={styles.cardTopRow}>
            <View style={styles.cardTopRight}>
              <SkeletonItem width={38} height={38} borderRadius={12} isDarkMode={isDarkMode} />
              <View style={{ gap: 5, alignItems: 'flex-end' }}>
                <SkeletonItem width={85} height={14} borderRadius={5} isDarkMode={isDarkMode} />
                <SkeletonItem width={75} height={10} borderRadius={4} isDarkMode={isDarkMode} />
              </View>
            </View>

            <SkeletonItem width={44} height={44} borderRadius={10} isDarkMode={isDarkMode} />
          </View>

          {/* Middle: Recipient row */}
          <View style={styles.cardMiddleRow}>
            <SkeletonItem width="65%" height={12} borderRadius={4} isDarkMode={isDarkMode} />
          </View>

          {/* Bottom: Amount pill + Attachment indicator */}
          <View style={[styles.cardBottomRow, { borderTopColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
            <SkeletonItem width={75} height={20} borderRadius={8} isDarkMode={isDarkMode} />
            <SkeletonItem width={60} height={12} borderRadius={4} isDarkMode={isDarkMode} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    gap: 12,
    width: '100%',
  },
  invoiceCardBox: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTopRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  cardMiddleRow: {
    marginBottom: 10,
    paddingVertical: 4,
    alignItems: 'flex-end',
  },
  cardBottomRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 8,
  },
});
