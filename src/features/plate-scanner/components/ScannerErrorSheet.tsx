import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

interface ScannerErrorSheetProps {
  visible: boolean;
  errorMessage: string;
  errorSheetAnim: Animated.Value;
  onClose: () => void;
  isDark: boolean;
  t?: any;
  isRTL?: boolean;
}

export const ScannerErrorSheet: React.FC<ScannerErrorSheetProps> = ({
  visible,
  errorMessage,
  errorSheetAnim,
  onClose,
  isDark,
  t,
  isRTL = true,
}) => {
  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              opacity: errorSheetAnim,
            },
          ]}
        />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.errorSheetContainer,
          {
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
            transform: [
              {
                translateY: errorSheetAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [380, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={[styles.errorSheetPill, { backgroundColor: isDark ? '#475569' : '#cbd5e1' }]} />

        <View style={styles.errorIconCircle}>
          <LottieView
            source={require('../../../../assets/Lottie/json/Alerts/Attention.json')}
            autoPlay
            loop={false}
            style={{ width: 62, height: 62 }}
          />
        </View>

        <Text style={[styles.errorSheetTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>{t?.scannerErrorTitle || 'لم نتمكن من قراءة أرقام اللوحة'}</Text>
        <Text style={[styles.errorSheetMessage, { color: isDark ? '#94a3b8' : '#64748b' }]}>
          {errorMessage || (t?.scannerAimGuide || 'يرجى تقريب الكاميرا والتأكد من وضوح وإضاءة أرقام وحروف اللوحة ثم إعادة المحاولة.')}
        </Text>

        <View style={[styles.errorTipsCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0' }]}>
          <View style={[styles.errorTipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="flash-outline" size={16} color="#f97316" />
            <Text style={[styles.errorTipText, { color: isDark ? '#cbd5e1' : '#334155', marginHorizontal: 8 }]}>{t?.scannerErrorTipFlash || 'شغّل إضاءة الفلاش إذا كان المكان مظلماً'}</Text>
          </View>
          <View style={[styles.errorTipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="scan-outline" size={16} color="#f97316" />
            <Text style={[styles.errorTipText, { color: isDark ? '#cbd5e1' : '#334155', marginHorizontal: 8 }]}>{t?.scannerErrorTipFrame || 'اجعل اللوحة داخل إطار المسح البرتقالي'}</Text>
          </View>
        </View>

        <View style={styles.errorSheetActions}>
          <TouchableOpacity
            style={styles.errorRetryBtn}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={18} color="#ffffff" style={{ marginHorizontal: 6 }} />
            <Text style={styles.errorRetryBtnText}>{t?.retryNowBtn || 'إعادة المحاولة الآن'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.errorDismissBtn, { backgroundColor: isDark ? 'transparent' : '#f1f5f9', borderRadius: 12 }]}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={[styles.errorDismissBtnText, { color: isDark ? '#94a3b8' : '#64748b' }]}>{t?.close || 'إغلاق'}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  errorSheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  errorSheetPill: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    marginBottom: 16,
  },
  errorIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  errorSheetTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSheetMessage: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorTipsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  errorTipRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  errorTipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  errorSheetActions: {
    width: '100%',
    gap: 10,
  },
  errorRetryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f97316',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorRetryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  errorDismissBtn: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorDismissBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});
