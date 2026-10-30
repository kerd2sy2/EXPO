import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

interface AssignedBikeBottomSheetProps {
  visible: boolean;
  assignedPlate: string;
  sheetAnim: Animated.Value;
  onConfirm: () => void;
  onClose: () => void;
  isDark?: boolean;
  isBusy?: boolean;
}

export const AssignedBikeBottomSheet: React.FC<AssignedBikeBottomSheetProps> = ({
  visible,
  assignedPlate,
  sheetAnim,
  onConfirm,
  onClose,
  isDark = true,
  isBusy = false,
}) => {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableWithoutFeedback onPress={onClose} disabled={isBusy}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.72)',
              opacity: sheetAnim,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: isDark ? '#0f172a' : '#ffffff',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            transform: [
              {
                translateY: sheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [460, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Top Handle Pill */}
        <View style={[styles.sheetPill, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]} />

        {/* Lottie Motorcycle Animation */}
        <View style={styles.lottieContainer}>
          <LottieView
            source={require('../../../../assets/Lottie/lottie/m8NEtAYYYJ.lottie')}
            autoPlay
            loop
            style={styles.lottieAnim}
            resizeMode="contain"
          />
        </View>

        {/* Title */}
        <Text style={[styles.sheetTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>
          تأكيد استخدام الدباب المسجل
        </Text>

        {/* Plate Highlight Badge */}
        <View style={styles.plateHighlightBadge}>
          <Ionicons name="bicycle" size={22} color="#f97316" style={{ marginHorizontal: 6 }} />
          <Text style={styles.plateHighlightText}>{assignedPlate}</Text>
        </View>

        {/* Question Subtitle */}
        <Text style={[styles.sheetSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          هل أنت تقود وتستخدم هذا الدباب بالفعل لبدء شفت العمل الآن؟
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.confirmBtn, isBusy && { opacity: 0.7 }]}
            onPress={onConfirm}
            activeOpacity={0.85}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="camera" size={20} color="#ffffff" style={{ marginHorizontal: 6 }} />
                <Text style={styles.confirmBtnText}>نعم، تأكيد والتقاط صورة اللوحة</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.cancelBtn,
              { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9' },
            ]}
            onPress={onClose}
            activeOpacity={0.7}
            disabled={isBusy}
          >
            <Text style={[styles.cancelBtnText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
              إلغاء والعودة لمسح الكاميرا
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderTopWidth: 1.5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 25,
  },
  sheetPill: {
    width: 44,
    height: 4,
    borderRadius: 2,
    marginBottom: 8,
  },
  lottieContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  lottieAnim: {
    width: 140,
    height: 140,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  plateHighlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderWidth: 1.5,
    borderColor: '#f97316',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    marginBottom: 10,
  },
  plateHighlightText: {
    color: '#f97316',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sheetSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  actionsRow: {
    width: '100%',
    gap: 10,
  },
  confirmBtn: {
    backgroundColor: '#f97316',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 46,
    borderRadius: 14,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
