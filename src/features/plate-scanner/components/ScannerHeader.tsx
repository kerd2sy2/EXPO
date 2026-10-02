import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ScannerHeaderProps {
  onClose: () => void;
  hasNativeCamera: boolean;
  torchOn: boolean;
  onToggleTorch: () => void;
}

export const ScannerHeader: React.FC<ScannerHeaderProps> = ({
  onClose,
  hasNativeCamera,
  torchOn,
  onToggleTorch,
}) => {
  return (
    <View style={styles.headerRow}>
      <TouchableOpacity
        style={styles.headerGlassBtn}
        onPress={onClose}
        activeOpacity={0.7}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Ionicons name="close" size={28} color="#ffffff" />
      </TouchableOpacity>

      <View style={styles.headerBadge}>
        <View style={styles.radarDot} />
        <Text style={styles.headerBadgeText}>ماسح اللوحات الذكي</Text>
      </View>

      {hasNativeCamera ? (
        <TouchableOpacity
          style={[styles.headerGlassBtn, torchOn && styles.headerBtnActive]}
          onPress={onToggleTorch}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons
            name={torchOn ? 'flashlight' : 'flashlight-outline'}
            size={24}
            color={torchOn ? '#f97316' : '#ffffff'}
          />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 44 }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerGlassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnActive: {
    backgroundColor: 'rgba(249, 115, 22, 0.45)',
  },
  headerBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  radarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  headerBadgeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
