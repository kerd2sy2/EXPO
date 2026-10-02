import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlateResultData } from '../types/plateScanner.types';
import { SaudiMotorcyclePlate } from '../../../components/ui/SaudiMotorcyclePlate';

interface PlateResultCardProps {
  resultCardAnim: Animated.Value;
  detectedResult: PlateResultData;
  onRescan: () => void;
  onConfirm: () => void;
  t?: any;
  isRTL?: boolean;
}

export const PlateResultCard: React.FC<PlateResultCardProps> = ({
  resultCardAnim,
  detectedResult,
  onRescan,
  onConfirm,
  t,
  isRTL = true,
}) => {
  return (
    <Animated.View
      style={[
        styles.resultCard,
        {
          opacity: resultCardAnim,
          transform: [
            {
              translateY: resultCardAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [60, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.resultHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.resultBadgeSuccess, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
          <Text style={styles.resultBadgeText}>{t?.plateDetectedSuccess || 'تم التعرف على اللوحة بنجاح'}</Text>
        </View>
        <Text style={styles.resultConfidence}>{t?.accuracyMatch || 'دقة 99% (مطابقة تامة)'}</Text>
      </View>

      {/* Authentic Saudi Motorcycle Plate Preview */}
      <View style={styles.platePreviewWrap}>
        <SaudiMotorcyclePlate
          digits={detectedResult.digits}
          letters={detectedResult.letters}
          editable={false}
          isDarkMode={false}
          scale={0.94}
        />
      </View>

      {/* Action Buttons */}
      <View style={[styles.resultActionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={[styles.rescanBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={onRescan}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh" size={18} color="#94a3b8" />
          <Text style={[styles.rescanBtnText, { marginHorizontal: 4 }]}>{t?.rescanBtn || 'إعادة المسح'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmBtn, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          onPress={onConfirm}
          activeOpacity={0.85}
        >
          <Ionicons name="checkmark" size={20} color="#ffffff" style={{ marginHorizontal: 4 }} />
          <Text style={styles.confirmBtnText}>{t?.confirmUsePlateBtn || 'تأكيد واستخدام اللوحة'}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  resultCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  resultHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultBadgeSuccess: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    gap: 6,
  },
  resultBadgeText: {
    color: '#16a34a',
    fontSize: 12,
    fontWeight: '800',
  },
  resultConfidence: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  platePreviewWrap: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 4,
  },
  resultActionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  rescanBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#cbd5e1',
    gap: 6,
  },
  rescanBtnText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#f97316',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
    gap: 6,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
