import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Platform } from 'react-native';
import { ThemeColors } from '../../types/delegate';

interface DashboardSkeletonProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  colors,
  isDarkMode,
  isRTL,
}) => {
  const pulseAnim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.35,
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
  const heroBoneBg = isDarkMode ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.25)';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <View style={styles.container}>
      {/* 1. Hero Performance Card Skeleton */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: isDarkMode ? '#0f172a' : '#0369a1',
            borderColor: isDarkMode ? '#1e293b' : '#0284c7',
          },
        ]}
      >
        {/* Top Row: Title + Rate Pill */}
        <View style={[styles.heroTopRow, { flexDirection: rowDir }]}>
          <Animated.View
            style={[
              styles.heroTitleBone,
              { backgroundColor: heroBoneBg, opacity: pulseAnim },
            ]}
          />
          <Animated.View
            style={[
              styles.heroPillBone,
              { backgroundColor: heroBoneBg, opacity: pulseAnim },
            ]}
          />
        </View>

        {/* Progress Bar */}
        <Animated.View
          style={[
            styles.heroProgressBone,
            { backgroundColor: heroBoneBg, opacity: pulseAnim },
          ]}
        />

        {/* 4 Bottom Stats */}
        <View style={[styles.heroStatsRow, { flexDirection: rowDir }]}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.heroStatItem}>
              <Animated.View
                style={[
                  styles.heroStatValBone,
                  { backgroundColor: heroBoneBg, opacity: pulseAnim },
                ]}
              />
              <Animated.View
                style={[
                  styles.heroStatLblBone,
                  { backgroundColor: heroBoneBg, opacity: pulseAnim },
                ]}
              />
            </View>
          ))}
        </View>
      </View>

      {/* 2. Analytical KPI Header Skeleton */}
      <View style={[styles.sectionHeaderRow, { flexDirection: rowDir }]}>
        <Animated.View
          style={[
            styles.sectionTitleBone,
            { backgroundColor: boneBg, opacity: pulseAnim },
          ]}
        />
      </View>

      {/* 4 KPI Grid Cards Skeleton */}
      <View style={[styles.kpiGrid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        {[1, 2, 3, 4].map((k) => (
          <View
            key={k}
            style={[
              styles.kpiCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Animated.View
              style={[
                styles.kpiIconBone,
                { backgroundColor: softBoneBg, opacity: pulseAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.kpiNumBone,
                { backgroundColor: boneBg, opacity: pulseAnim },
              ]}
            />
            <Animated.View
              style={[
                styles.kpiLblBone,
                { backgroundColor: softBoneBg, opacity: pulseAnim },
              ]}
            />
          </View>
        ))}
      </View>

      {/* 3. Quick Access Section Header Skeleton */}
      <View style={[styles.sectionHeaderRow, { flexDirection: rowDir }]}>
        <Animated.View
          style={[
            styles.sectionTitleBone,
            { backgroundColor: boneBg, opacity: pulseAnim },
          ]}
        />
      </View>

      {/* 6 Quick Access Shortcuts Skeleton */}
      <View style={[styles.shortcutsGrid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <View
            key={s}
            style={[
              styles.shortcutCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.shortcutRow, { flexDirection: rowDir }]}>
              <Animated.View
                style={[
                  styles.shortcutIconBone,
                  { backgroundColor: softBoneBg, opacity: pulseAnim },
                ]}
              />
              <View style={styles.shortcutTextCol}>
                <Animated.View
                  style={[
                    styles.shortcutTitleBone,
                    { backgroundColor: boneBg, opacity: pulseAnim },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.shortcutSubBone,
                    { backgroundColor: softBoneBg, opacity: pulseAnim },
                  ]}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 48,
    gap: 14,
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 4,
  },
  heroTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitleBone: {
    width: 140,
    height: 20,
    borderRadius: 10,
  },
  heroPillBone: {
    width: 55,
    height: 26,
    borderRadius: 14,
  },
  heroProgressBone: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 18,
  },
  heroStatsRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroStatItem: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  heroStatValBone: {
    width: 38,
    height: 18,
    borderRadius: 8,
  },
  heroStatLblBone: {
    width: 55,
    height: 12,
    borderRadius: 6,
  },
  sectionHeaderRow: {
    paddingHorizontal: 4,
    marginTop: 4,
  },
  sectionTitleBone: {
    width: 160,
    height: 18,
    borderRadius: 9,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  kpiCard: {
    width: '48.5%',
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  kpiIconBone: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  kpiNumBone: {
    width: 60,
    height: 22,
    borderRadius: 8,
  },
  kpiLblBone: {
    width: 75,
    height: 12,
    borderRadius: 6,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  shortcutCard: {
    width: '48.5%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  shortcutRow: {
    alignItems: 'center',
    gap: 10,
  },
  shortcutIconBone: {
    width: 38,
    height: 38,
    borderRadius: 12,
  },
  shortcutTextCol: {
    flex: 1,
    gap: 6,
  },
  shortcutTitleBone: {
    width: '80%',
    height: 14,
    borderRadius: 7,
  },
  shortcutSubBone: {
    width: '60%',
    height: 10,
    borderRadius: 5,
  },
});
