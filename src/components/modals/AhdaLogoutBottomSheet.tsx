import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

interface AhdaLogoutBottomSheetProps {
  visible: boolean;
  user?: any;
  colors: ThemeColors;
  isDarkMode?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const AhdaLogoutBottomSheet: React.FC<AhdaLogoutBottomSheetProps> = ({
  visible,
  user,
  colors,
  isDarkMode = false,
  onConfirm,
  onClose,
}) => {
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          bounciness: 4,
          speed: 14,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(sheetTranslateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      if (callback) callback();
    });
  };

  const handleConfirm = () => {
    handleClose(() => {
      onConfirm();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => handleClose()}
    >
      <View style={styles.container}>
        {/* Backdrop overlay (tapping outside closes modal) */}
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => handleClose()}
          />
        </Animated.View>

        {/* Sliding Sheet Card from bottom */}
        <Animated.View
          style={[
            styles.sheetCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Handle Indicator */}
          <View style={styles.handleWrap}>
            <View
              style={[
                styles.handleBar,
                { backgroundColor: isDarkMode ? '#3f3f46' : '#cbd5e1' },
              ]}
            />
          </View>

          {/* Icon Circle */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(239, 68, 68, 0.16)'
                  : '#fee2e2',
              },
            ]}
          >
            <Ionicons name="log-out-outline" size={30} color="#ef4444" />
          </View>

          {/* Title and Description */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            تسجيل الخروج من الحساب
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            هل أنت متأكد من رغبتك في تسجيل الخروج من نظام العهدة؟
            {'\n'}
            ستحتاج لإدخال بيانات الدخول مجدداً لمتابعة العمليات.
          </Text>

          {/* User Preview Box if user exists */}
          {user && (
            <View
              style={[
                styles.userBox,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.userAvatarCircle,
                  { backgroundColor: `${colors.primary}18` },
                ]}
              >
                <Ionicons name="person" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>
                  {user?.name || 'المستخدم'}
                </Text>
                <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                  {user?.branch_name ? `فرع: ${user.branch_name}` : 'إدارة العهد والمصروفات'}
                </Text>
              </View>
            </View>
          )}

          {/* Buttons Row */}
          <View style={styles.buttonsRow}>
            {/* Confirm Logout Button */}
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: '#ef4444' }]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color="#ffffff" />
              <Text style={styles.confirmBtnText}>تسجيل الخروج</Text>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleClose()}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: colors.textPrimary }]}>
                إلغاء
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  handleWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  userBox: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  userAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 11,
    fontWeight: '500',
  },
  buttonsRow: {
    flexDirection: 'row-reverse',
    width: '100%',
    gap: 12,
  },
  confirmBtn: {
    flex: 1.2,
    height: 50,
    borderRadius: 14,
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
