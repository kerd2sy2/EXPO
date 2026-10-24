import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '../types/delegate';
import { CustodyDayData } from '../services/custodyService';
import { formatArabicNumber } from '../utils/formatters';

export interface CategoryDef {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
}

interface AhdaCategoryGridProps {
  categories: CategoryDef[];
  currentDay: CustodyDayData | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  onSelectCategory: (categoryKey: string) => void;
  onLongPressCategory: (categoryKey: string) => void;
}

const AhdaCategoryGridComponent: React.FC<AhdaCategoryGridProps> = ({
  categories,
  currentDay,
  colors,
  isDarkMode,
  onSelectCategory,
  onLongPressCategory,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.cardHeaderRow}>
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
          <Ionicons name="pie-chart-outline" size={17} color="#047857" />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>تفصيل المصاريف حسب الأقسام</Text>
        </View>
        <Text style={{ fontSize: 10, color: colors.textSecondary, fontWeight: '600' }}>
          مطوّل لعرض الفواتير
        </Text>
      </View>

      <View style={styles.categoryGrid}>
        {categories.map((cat) => {
          let val = 0;
          if (cat.key === 'fuel') val = currentDay?.totals?.fuel || 0;
          else if (cat.key === 'internet_advance') val = currentDay?.totals?.internet_advance || 0;
          else if (cat.key === 'advance') val = currentDay?.totals?.advance || 0;
          else if (cat.key === 'license') val = currentDay?.totals?.license || 0;
          else if (cat.key === 'spare_parts') val = currentDay?.totals?.spare_parts || 0;
          else if (cat.key === 'other') val = currentDay?.totals?.other || 0;

          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categoryCard,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                  borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                },
              ]}
              onPress={() => onSelectCategory(cat.key)}
              onLongPress={() => {
                try {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                } catch (_) {}
                onLongPressCategory(cat.key);
              }}
              activeOpacity={0.75}
            >
              <View style={styles.categoryCardTop}>
                <View style={[styles.categoryIconCircle, { backgroundColor: cat.bg }]}>
                  <Ionicons name={cat.icon as any} size={16} color={cat.color} />
                </View>
                <Text
                  style={[styles.categoryCardName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {cat.label}
                </Text>
              </View>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.categoryCardValue, { color: cat.color }]}>
                    {formatArabicNumber(val, 2)}
                  </Text>
                  <Image
                    source={require('../../assets/Saudi_Riyal_Symbol.svg.webp')}
                    style={{ width: 12, height: 12, tintColor: cat.color }}
                    resizeMode="contain"
                  />
                </View>
                <Ionicons name="chevron-back" size={13} color={colors.textSecondary} style={{ opacity: 0.5 }} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export const AhdaCategoryGrid = React.memo(AhdaCategoryGridComponent);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: 4,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  categoryGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '48.2%',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
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
  categoryIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryCardName: {
    fontSize: 11.5,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  categoryCardValue: {
    fontSize: 15,
    fontWeight: '900',
  },
  categoryCardUnit: {
    fontSize: 10,
    fontWeight: '600',
  },
});
