import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '../types/delegate';

interface AhdaPdfExportCardProps {
  colors: ThemeColors;
  isDarkMode: boolean;
  onPress: () => void;
}

export const AhdaPdfExportCard: React.FC<AhdaPdfExportCardProps> = ({
  colors,
  isDarkMode,
  onPress,
}) => {
  const handlePress = () => {
    try {
      // Slight haptic vibration on tap as requested by user
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (_) {}
    onPress();
  };

  return (
    <TouchableOpacity
      style={[
        styles.cardContainer,
        {
          backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
          borderColor: isDarkMode ? '#334155' : '#e2e8f0',
        },
      ]}
      onPress={handlePress}
      activeOpacity={0.82}
    >
      <View style={styles.rightGroup}>
        <View
          style={[
            styles.iconCircle,
            {
              backgroundColor: isDarkMode ? '#450a0a' : '#fef2f2',
              borderColor: isDarkMode ? '#7f1d1d' : '#fecaca',
            },
          ]}
        >
          <Ionicons name="document-text" size={20} color="#dc2626" />
        </View>
        <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              تحميل ومشاركة تقرير العهدة
            </Text>
            <View style={styles.pdfBadge}>
              <Text style={styles.pdfBadgeText}>PDF</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            معاينة وتصدير تقرير اليوم
          </Text>
        </View>
      </View>

      <View style={[styles.chevronWrap, { backgroundColor: isDarkMode ? '#334155' : '#f1f5f9' }]}>
        <Ionicons name="chevron-back" size={16} color={colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  rightGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  pdfBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
  },
  pdfBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
});
