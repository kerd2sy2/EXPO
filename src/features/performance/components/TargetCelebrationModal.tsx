import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TargetCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  ordersCount: number;
  monthlyTarget?: number;
  isDarkMode?: boolean;
  isRTL?: boolean;
}

export const TargetCelebrationModal: React.FC<TargetCelebrationModalProps> = ({
  visible,
  onClose,
  ordersCount,
  monthlyTarget = 460,
  isDarkMode = false,
  isRTL = true,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 60,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.7);
      opacityAnim.setValue(0);
    }
  }, [visible, scaleAnim, opacityAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  if (!visible) return null;

  const bgColor = isDarkMode ? '#0f172a' : '#ffffff';
  const textColor = isDarkMode ? '#ffffff' : '#0f172a';
  const subTextColor = isDarkMode ? '#94a3b8' : '#64748b';
  const cardBorder = isDarkMode ? 'rgba(255, 215, 0, 0.35)' : 'rgba(234, 179, 8, 0.45)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleDismiss}
        />

        <Animated.View
          style={[
            styles.dialogContainer,
            {
              backgroundColor: bgColor,
              borderColor: cardBorder,
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Close button */}
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
            onPress={handleDismiss}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color={subTextColor} />
          </TouchableOpacity>

          {/* Lottie Trophy/Celebration Animation */}
          <View style={styles.lottieBox}>
            <LottieView
              source={require('../../../../assets/Lottie/lottie/GpI0uQYnKa.lottie')}
              autoPlay
              loop
              style={styles.lottieAnim}
              resizeMode="contain"
            />
          </View>

          {/* Congratulatory Tag */}
          <View style={styles.trophyPill}>
            <Ionicons name="sparkles" size={14} color="#f59e0b" />
            <Text style={styles.trophyPillText}>إنجاز التارجت الشهري بنجاح</Text>
            <Ionicons name="sparkles" size={14} color="#f59e0b" />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: textColor }]}>
            🎉 ألف مبروك يا بطل! 🎯
          </Text>

          {/* Stats Badge */}
          <View style={[styles.statsBadge, { backgroundColor: isDarkMode ? '#1e293b' : '#fef9c3' }]}>
            <Text style={styles.statsCount}>{ordersCount}</Text>
            <Text style={[styles.statsLabel, { color: isDarkMode ? '#fde047' : '#854d0e' }]}>
              طلب منجز هذا الشهر (المطلوب {monthlyTarget}+)
            </Text>
          </View>

          {/* Message Details */}
          <Text style={[styles.description, { color: subTextColor }]}>
            أنت في القمة! تم تفعيل أعلى شريحة لسعر الطلبات (6 ريال لكل طلب). شكراً لتفانيك المستمر ونتمنى لك دوام التوفيق والتميز.
          </Text>

          {/* Confirm / Continue Button */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleDismiss}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>استمرار إلى الرئيسية 🚀</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dialogContainer: {
    width: Math.min(SCREEN_WIDTH - 40, 360),
    borderRadius: 26,
    borderWidth: 2,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#eab308',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    left: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  lottieBox: {
    width: 170,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  lottieAnim: {
    width: '100%',
    height: '100%',
  },
  trophyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 10,
  },
  trophyPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#d97706',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  statsBadge: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  statsCount: {
    fontSize: 26,
    fontWeight: '900',
    color: '#eab308',
    marginBottom: 2,
  },
  statsLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  actionBtn: {
    width: '100%',
    backgroundColor: '#eab308',
    paddingVertical: 13,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ca8a04',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  actionBtnText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
  },
});
