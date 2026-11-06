import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const boneBg = isDarkMode ? '#272730' : '#e2e8f0';
  const heroBoneBg = isDarkMode ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.35)';

  const shortcuts = [
    { title: 'مركز الموافقات', icon: 'checkmark-done-circle-outline', color: '#f59e0b' },
    { title: 'مراجعة الطلبات', icon: 'list-circle-outline', color: '#0284c7' },
    { title: 'تغيير الزيت', icon: 'construct-outline', color: '#8b5cf6' },
    { title: 'التقارير والسلف', icon: 'document-text-outline', color: '#ec4899' },
    { title: 'المخزن', icon: 'cube-outline', color: '#10b981' },
    { title: 'إدارة الموظفين', icon: 'people-outline', color: '#6366f1' },
  ];

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
        {/* Top Row: Real Title + Speedometer Badge Skeleton */}
        <View style={[styles.heroTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center' }]}>
          <Text style={styles.heroTitle}>مؤشرات الأداء والتشغيل</Text>

          <View style={[styles.ratePill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="speedometer-outline" size={16} color="#38bdf8" />
            <Animated.View
              style={[
                styles.heroRateBone,
                { backgroundColor: heroBoneBg, opacity: pulseAnim },
              ]}
            />
          </View>
        </View>

        {/* Progress Bar Track */}
        <View style={styles.progressBarTrack}>
          <Animated.View
            style={[
              styles.progressBarFill,
              { backgroundColor: '#38bdf8', opacity: pulseAnim, width: '60%' },
            ]}
          />
        </View>

        {/* 4 Bottom Stats Row */}
        <View style={[styles.heroBottomStats, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.heroStatItem}>
            <Animated.View
              style={[
                styles.heroStatValBone,
                { backgroundColor: heroBoneBg, opacity: pulseAnim },
              ]}
            />
            <Text style={styles.heroStatLbl}>إجمالي المناديب</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStatItem}>
            <Animated.View
              style={[
                styles.heroStatValBone,
                { backgroundColor: '#38bdf8', opacity: pulseAnim },
              ]}
            />
            <Text style={styles.heroStatLbl}>مناديب اليوم</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStatItem}>
            <Animated.View
              style={[
                styles.heroStatValBone,
                { backgroundColor: '#4ade80', opacity: pulseAnim },
              ]}
            />
            <Text style={styles.heroStatLbl}>يعملون الآن</Text>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroStatItem}>
            <Animated.View
              style={[
                styles.heroStatValBone,
                { backgroundColor: '#fbbf24', opacity: pulseAnim },
              ]}
            />
            <Text style={styles.heroStatLbl}>أنهوا الشفت</Text>
          </View>
        </View>
      </View>

      {/* 2. Analytical KPI Header: مؤشرات اليوم للفرع والأسطول */}
      <Text style={[styles.sectionHeader, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
        مؤشرات اليوم للفرع والأسطول
      </Text>

      {/* 4 KPI Grid Cards Skeleton */}
      <View style={[styles.kpiGrid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        {/* 1. طلبات اليوم */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#10b98118' }]}>
            <Ionicons name="bag-check" size={22} color="#10b981" />
          </View>
          <Animated.View
            style={[
              styles.kpiNumBone,
              { backgroundColor: boneBg, opacity: pulseAnim },
            ]}
          />
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>طلبات اليوم</Text>
        </View>

        {/* 2. كيلومترات اليوم */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#0284c718' }]}>
            <Ionicons name="speedometer" size={22} color="#0284c7" />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Animated.View
              style={[
                styles.kpiNumBone,
                { backgroundColor: boneBg, opacity: pulseAnim, width: 44 },
              ]}
            />
            <Text style={[styles.kpiUnit, { color: colors.textSecondary }]}>كم</Text>
          </View>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>كيلومترات اليوم</Text>
        </View>

        {/* 3. بنزين اليوم */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#f59e0b18' }]}>
            <Ionicons name="flame" size={22} color="#f59e0b" />
          </View>
          <View style={[styles.riyalValueRow, { flexDirection: 'row', direction: 'ltr' }]}>
            <Image
              source={require('../../../assets/Saudi_Riyal_Symbol.svg.webp')}
              style={[styles.riyalSymbolImg, { tintColor: isDarkMode ? '#fbbf24' : '#d97706' }]}
              resizeMode="contain"
            />
            <Animated.View
              style={[
                styles.kpiNumBone,
                { backgroundColor: boneBg, opacity: pulseAnim, width: 48 },
              ]}
            />
          </View>
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>بنزين اليوم</Text>
        </View>

        {/* 4. تغيير زيت */}
        <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.kpiIconBox, { backgroundColor: '#ef444418' }]}>
            <Ionicons name="construct" size={22} color="#ef4444" />
          </View>
          <Animated.View
            style={[
              styles.kpiNumBone,
              { backgroundColor: boneBg, opacity: pulseAnim, width: 34 },
            ]}
          />
          <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>تغيير زيت</Text>
        </View>
      </View>

      {/* 3. Quick Access Section Header */}
      <Text style={[styles.sectionHeader, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
        الوصول السريع لأقسام الإشراف
      </Text>

      {/* 6 Quick Access Shortcuts Skeleton */}
      <View style={[styles.shortcutsGrid, { direction: isRTL ? 'rtl' : 'ltr' }]}>
        {shortcuts.map((item, i) => (
          <View
            key={i}
            style={[
              styles.shortcutCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
              <Text style={[styles.shortcutTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Animated.View
                style={[
                  styles.shortcutSubBone,
                  { backgroundColor: boneBg, opacity: pulseAnim },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  heroCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    marginBottom: 14,
  },
  heroTopRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  heroTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  ratePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    alignItems: 'center',
    gap: 6,
  },
  heroRateBone: {
    width: 32,
    height: 16,
    borderRadius: 8,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  heroBottomStats: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 14,
    paddingVertical: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  heroStatItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  heroStatValBone: {
    width: 34,
    height: 18,
    borderRadius: 6,
  },
  heroStatLbl: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  heroDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  kpiCard: {
    width: '48.3%',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
  },
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiNumBone: {
    width: 50,
    height: 20,
    borderRadius: 6,
  },
  kpiUnit: {
    fontSize: 12,
    fontWeight: '700',
  },
  riyalValueRow: {
    alignItems: 'center',
    gap: 5,
  },
  riyalSymbolImg: {
    width: 15,
    height: 15,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  shortcutCard: {
    width: '48.3%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
  },
  shortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  shortcutTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  shortcutSubBone: {
    width: 65,
    height: 10,
    borderRadius: 5,
  },
});
