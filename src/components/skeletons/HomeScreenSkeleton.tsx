import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { ThemeColors } from '../../types/delegate';

interface HomeScreenSkeletonProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  includeHeader?: boolean;
  topInset?: number;
}

export const HomeScreenSkeleton: React.FC<HomeScreenSkeletonProps> = ({
  colors,
  isDarkMode,
  isRTL,
  includeHeader = false,
  topInset = 0,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.42)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.42,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const boneBg = isDarkMode ? '#272730' : '#e2e8f0';
  const softBoneBg = isDarkMode ? '#1f2028' : '#f1f5f9';
  const primaryBoneBg = isDarkMode ? 'rgba(249, 115, 22, 0.22)' : '#ffedd5';
  const accentBoneBg = isDarkMode ? 'rgba(56, 189, 248, 0.2)' : '#e0f2fe';
  const greenBoneBg = isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5';

  const rowDir = isRTL ? 'row-reverse' : 'row';
  const alignEdge = isRTL ? 'flex-end' : 'flex-start';

  return (
    <View style={ includeHeader ? [styles.fullScreenWrap, { backgroundColor: colors.bg, paddingTop: topInset }] : undefined }>
      {/* Optional Header Skeleton when full screen is booting */}
      {includeHeader && (
        <View style={[styles.headerRow, { flexDirection: rowDir }]}>
          <View style={[styles.headerUserGroup, { flexDirection: rowDir }]}>
            <Animated.View
              style={[
                styles.avatarBone,
                { backgroundColor: boneBg, opacity: pulseAnim },
              ]}
            />
            <View style={{ alignItems: alignEdge, gap: 6 }}>
              <Animated.View
                style={[
                  styles.headerNameBone,
                  { backgroundColor: boneBg, opacity: pulseAnim },
                ]}
              />
              <Animated.View
                style={[
                  styles.headerSubBone,
                  { backgroundColor: softBoneBg, opacity: pulseAnim },
                ]}
              />
            </View>
          </View>
          <Animated.View
            style={[
              styles.qrBtnBone,
              { backgroundColor: softBoneBg, borderColor: colors.border, opacity: pulseAnim },
            ]}
          />
        </View>
      )}

      <View style={styles.tabContainer}>
        {/* 1. Monthly Target Card Skeleton */}
        <View
          style={[
            styles.targetCardContainer,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={[styles.targetCardHeader, { flexDirection: rowDir }]}>
            <View style={[styles.targetTitleGroup, { flexDirection: rowDir }]}>
              <Animated.View
                style={[
                  styles.smallIconBone,
                  { backgroundColor: primaryBoneBg, opacity: pulseAnim },
                ]}
              />
              <Animated.View
                style={[
                  styles.targetTitleBone,
                  { backgroundColor: boneBg, opacity: pulseAnim },
                ]}
              />
            </View>
            <Animated.View
              style={[
                styles.targetRatioBone,
                { backgroundColor: boneBg, opacity: pulseAnim },
              ]}
            />
          </View>

          <View style={styles.targetProgressContainer}>
            <View style={[styles.progressBarTrack, { backgroundColor: softBoneBg }]}>
              <Animated.View
                style={[
                  styles.progressBarFillBone,
                  { backgroundColor: primaryBoneBg, opacity: pulseAnim },
                ]}
              />
            </View>
          </View>

          <View style={[styles.targetFooterRow, { flexDirection: rowDir }]}>
            <Animated.View
              style={[
                styles.targetFooterNoticeBone,
                { backgroundColor: boneBg, opacity: pulseAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.targetFooterPctBone,
                { backgroundColor: primaryBoneBg, opacity: pulseAnim },
              ]}
            />
          </View>
        </View>

        {/* 2. KPI Stats Section Header Skeleton */}
        <View style={[styles.sectionHeader, { alignItems: alignEdge }]}>
          <Animated.View
            style={[
              styles.sectionTitleBone,
              { backgroundColor: boneBg, opacity: pulseAnim },
            ]}
          />
        </View>

        {/* 4 KPI Stat Boxes Grid Skeleton */}
        <View style={[styles.statsGrid, { flexDirection: rowDir }]}>
          {[0, 1, 2, 3].map((idx) => (
            <View
              key={idx}
              style={[
                styles.statBox,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Animated.View
                style={[
                  styles.statIconCircle,
                  {
                    backgroundColor: idx === 3 ? greenBoneBg : primaryBoneBg,
                    opacity: pulseAnim,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.statNumberBone,
                  { backgroundColor: boneBg, opacity: pulseAnim },
                ]}
              />
              <Animated.View
                style={[
                  styles.statLabelBone,
                  { backgroundColor: softBoneBg, opacity: pulseAnim },
                ]}
              />
            </View>
          ))}
        </View>

        {/* 3. Quick Access Section Header Skeleton */}
        <View style={[styles.sectionHeader, { alignItems: alignEdge }]}>
          <Animated.View
            style={[
              styles.sectionTitleBone,
              { width: 115, backgroundColor: boneBg, opacity: pulseAnim },
            ]}
          />
        </View>

        {/* 3 Quick Access Cards Skeleton (Shift, History, Violations) */}
        {[primaryBoneBg, accentBoneBg, greenBoneBg].map((circleBg, idx) => (
          <View
            key={idx}
            style={[
              styles.quickCardRow,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                flexDirection: rowDir,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.quickCardIconCircle,
                { backgroundColor: circleBg, opacity: pulseAnim },
              ]}
            />
            <View style={[styles.quickCardTextCol, { alignItems: alignEdge }]}>
              <Animated.View
                style={[
                  styles.quickTitleBone,
                  {
                    width: idx === 0 ? '52%' : idx === 1 ? '46%' : '58%',
                    backgroundColor: boneBg,
                    opacity: pulseAnim,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.quickSubBone,
                  {
                    width: idx === 0 ? '76%' : idx === 1 ? '68%' : '82%',
                    backgroundColor: softBoneBg,
                    opacity: pulseAnim,
                  },
                ]}
              />
            </View>
            <Animated.View
              style={[
                styles.chevronBone,
                { backgroundColor: boneBg, opacity: pulseAnim },
              ]}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullScreenWrap: {
    flex: 1,
  },
  headerRow: {
    height: 72,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerUserGroup: {
    alignItems: 'center',
    gap: 12,
  },
  avatarBone: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  headerNameBone: {
    width: 120,
    height: 15,
    borderRadius: 7,
  },
  headerSubBone: {
    width: 85,
    height: 11,
    borderRadius: 5,
  },
  qrBtnBone: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  tabContainer: {
    padding: 16,
  },
  targetCardContainer: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  targetCardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  targetTitleGroup: {
    alignItems: 'center',
    gap: 8,
  },
  smallIconBone: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  targetTitleBone: {
    width: 95,
    height: 15,
    borderRadius: 7,
  },
  targetRatioBone: {
    width: 80,
    height: 14,
    borderRadius: 7,
  },
  targetProgressContainer: {
    marginBottom: 12,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFillBone: {
    width: '45%',
    height: '100%',
    borderRadius: 4,
  },
  targetFooterRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetFooterNoticeBone: {
    width: '62%',
    height: 12,
    borderRadius: 6,
  },
  targetFooterPctBone: {
    width: 36,
    height: 14,
    borderRadius: 6,
  },
  sectionHeader: {
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitleBone: {
    width: 95,
    height: 16,
    borderRadius: 8,
  },
  statsGrid: {
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    width: '48%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 92,
    gap: 7,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  statNumberBone: {
    width: '54%',
    height: 16,
    borderRadius: 7,
  },
  statLabelBone: {
    width: '68%',
    height: 11,
    borderRadius: 5,
  },
  quickCardRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    minHeight: 74,
  },
  quickCardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  quickCardTextCol: {
    flex: 1,
    gap: 8,
  },
  quickTitleBone: {
    height: 15,
    borderRadius: 7,
  },
  quickSubBone: {
    height: 12,
    borderRadius: 6,
  },
  chevronBone: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
});

