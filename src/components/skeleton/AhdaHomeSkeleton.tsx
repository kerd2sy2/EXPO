import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemeColors } from '../../types/delegate';
import { SkeletonItem } from './SkeletonItem';

interface SkeletonProps {
  colors: ThemeColors;
  isDarkMode: boolean;
}

// ── 1. Net Custody Card Skeleton (Matches AhdaNetCustodyCard 1:1) ──
export const AhdaNetCustodyCardSkeleton: React.FC<SkeletonProps> = ({
  colors,
  isDarkMode,
}) => {
  return (
    <View
      style={[
        styles.custodyCardBox,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Top: Wallet Icon + Title on right, Net Balance on left */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.headerRight}>
          <SkeletonItem
            width={38}
            height={38}
            borderRadius={12}
            isDarkMode={isDarkMode}
          />
          <SkeletonItem
            width={115}
            height={16}
            borderRadius={5}
            isDarkMode={isDarkMode}
          />
        </View>

        <View style={{ alignItems: 'flex-start', gap: 4 }}>
          <SkeletonItem
            width={95}
            height={24}
            borderRadius={6}
            isDarkMode={isDarkMode}
          />
          <SkeletonItem
            width={80}
            height={10}
            borderRadius={4}
            isDarkMode={isDarkMode}
          />
        </View>
      </View>

      {/* Progress Bar Track */}
      <View style={styles.targetProgressContainer}>
        <View
          style={[
            styles.progressBarTrack,
            { backgroundColor: isDarkMode ? '#1f2433' : '#f1f5f9' },
          ]}
        >
          <SkeletonItem
            width="35%"
            height={7}
            borderRadius={4}
            isDarkMode={isDarkMode}
            color="#047857"
          />
        </View>
      </View>

      {/* Footer 3-Stats Row */}
      <View
        style={[
          styles.footerDetailsRow,
          { borderTopColor: isDarkMode ? '#334155' : '#f1f5f9' },
        ]}
      >
        {/* Stat 1: باقي أمس */}
        <View style={styles.statCol}>
          <SkeletonItem
            width={48}
            height={11}
            borderRadius={4}
            isDarkMode={isDarkMode}
            style={{ marginBottom: 4 }}
          />
          <SkeletonItem
            width={60}
            height={14}
            borderRadius={5}
            isDarkMode={isDarkMode}
          />
        </View>

        <View
          style={[
            styles.statDivider,
            { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' },
          ]}
        />

        {/* Stat 2: العهدة المضافة */}
        <View style={styles.statCol}>
          <SkeletonItem
            width={62}
            height={11}
            borderRadius={4}
            isDarkMode={isDarkMode}
            style={{ marginBottom: 4 }}
          />
          <SkeletonItem
            width={50}
            height={14}
            borderRadius={5}
            isDarkMode={isDarkMode}
          />
        </View>

        <View
          style={[
            styles.statDivider,
            { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' },
          ]}
        />

        {/* Stat 3: إجمالي المصاريف */}
        <View style={styles.statCol}>
          <SkeletonItem
            width={65}
            height={11}
            borderRadius={4}
            isDarkMode={isDarkMode}
            style={{ marginBottom: 4 }}
          />
          <SkeletonItem
            width={50}
            height={14}
            borderRadius={5}
            isDarkMode={isDarkMode}
          />
        </View>
      </View>
    </View>
  );
};

// ── 2. Category Breakdown Grid Skeleton (Matches AhdaCategoryGrid 1:1) ──
export const AhdaCategoryGridSkeleton: React.FC<SkeletonProps> = ({
  colors,
  isDarkMode,
}) => {
  return (
    <View style={styles.categoryGridSection}>
      {/* Header: Title only on right with icon placeholder */}
      <View style={styles.categoryGridHeader}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <SkeletonItem
            width={18}
            height={18}
            borderRadius={9}
            isDarkMode={isDarkMode}
            color="#047857"
          />
          <SkeletonItem
            width={145}
            height={15}
            borderRadius={5}
            isDarkMode={isDarkMode}
          />
        </View>
      </View>

      {/* 6 Cards in 2 Columns */}
      <View style={styles.categoryCardsGrid}>
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <View
            key={idx}
            style={[
              styles.categoryCardSkeleton,
              {
                backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                borderColor: isDarkMode ? '#334155' : '#e2e8f0',
              },
            ]}
          >
            {/* Top row: Circle right, Name left */}
            <View style={styles.categoryCardTop}>
              <SkeletonItem
                width={26}
                height={26}
                borderRadius={13}
                isDarkMode={isDarkMode}
              />
              <SkeletonItem
                width={52}
                height={12}
                borderRadius={4}
                isDarkMode={isDarkMode}
              />
            </View>

            {/* Bottom row: Value right, Chevron left */}
            <View style={styles.categoryCardBottom}>
              <SkeletonItem
                width={45}
                height={15}
                borderRadius={5}
                isDarkMode={isDarkMode}
              />
              <SkeletonItem
                width={12}
                height={12}
                borderRadius={6}
                isDarkMode={isDarkMode}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

// ── 3. Day Expenses Summary Card Skeleton (Matches AhdaDayExpensesSummaryCard 1:1) ──
export const AhdaDayExpensesSummaryCardSkeleton: React.FC<SkeletonProps> = () => {
  return (
    <View style={styles.summaryBannerOrangeCard}>
      <View style={styles.summaryBannerRight}>
        <SkeletonItem
          width={38}
          height={38}
          borderRadius={12}
          color="rgba(255, 255, 255, 0.22)"
        />
        <View style={{ gap: 4, alignItems: 'center', justifyContent: 'center' }}>
          <SkeletonItem
            width={150}
            height={14}
            borderRadius={5}
            color="rgba(255, 255, 255, 0.35)"
          />
          <SkeletonItem
            width={130}
            height={11}
            borderRadius={4}
            color="rgba(255, 255, 255, 0.25)"
          />
        </View>
      </View>
      <SkeletonItem
        width={14}
        height={14}
        borderRadius={7}
        color="rgba(255, 255, 255, 0.3)"
      />
    </View>
  );
};

// ── Combined Home Skeleton (as Fragment of the 3 separate children) ──
export const AhdaHomeSkeleton: React.FC<SkeletonProps> = ({
  colors,
  isDarkMode,
}) => {
  return (
    <>
      <AhdaNetCustodyCardSkeleton colors={colors} isDarkMode={isDarkMode} />
      <AhdaCategoryGridSkeleton colors={colors} isDarkMode={isDarkMode} />
      <AhdaDayExpensesSummaryCardSkeleton colors={colors} isDarkMode={isDarkMode} />
    </>
  );
};

const styles = StyleSheet.create({
  custodyCardBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  targetProgressContainer: {
    marginBottom: 14,
  },
  progressBarTrack: {
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  footerDetailsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  categoryGridSection: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 4,
    marginBottom: 20,
  },
  categoryGridHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  categoryCardsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCardSkeleton: {
    width: '48.2%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    height: 82,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  categoryCardTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    width: '100%',
  },
  categoryCardBottom: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  summaryBannerOrangeCard: {
    backgroundColor: '#047857',
    borderRadius: 16,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryBannerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
});
