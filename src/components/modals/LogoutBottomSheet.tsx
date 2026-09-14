import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';

interface LogoutBottomSheetProps {
  visible: boolean;
  user?: any;
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LogoutBottomSheet: React.FC<LogoutBottomSheetProps> = ({
  visible,
  user,
  colors,
  isDarkMode = false,
  isRTL = true,
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

  const roleLabel =
    user?.role === 'SUPERVISOR'
      ? 'مشرف التوصيل'
      : user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
      ? 'مدير النظام'
      : 'المستخدم';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => handleClose()}
    >
      <View style={styles.container}>
        {/* Backdrop overlay */}
        <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => handleClose()}
          />
        </Animated.View>

        {/* Sliding Sheet Card */}
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

          {/* Icon Circle with Glow */}
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
            <Ionicons name="log-out" size={32} color="#ef4444" />
          </View>

          {/* Title and Description */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            تسجيل الخروج من الحساب
          </Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            هل أنت متأكد من رغبتك في تسجيل الخروج من لوحة التحكم؟
            {'\n'}
            ستحتاج لإدخال بيانات الدخول مجدداً للوصول إلى النظام.
          </Text>

          {/* User Preview Box */}
          {user && (
            <View
              style={[
                styles.userBox,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  borderColor: colors.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
            >
              <View
                style={[
                  styles.userAvatarCircle,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <Ionicons name="person" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                <Text style={[styles.userName, { color: colors.textPrimary }]}>
                  {user?.name || 'مدير النظام'}
                </Text>
                <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                  {roleLabel} {user?.username ? `(@${user.username})` : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Buttons Row */}
          <View
            style={[
              styles.buttonsRow,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
            ]}
          >
            {/* Confirm Logout Button */}
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: '#ef4444' }]}
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out-outline" size={18} color="#ffffff" />
              <Text style={styles.confirmBtnText}>تأكيد الخروج</Text>
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
                تراجع
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
    ...StyleSheet.absoluteFill as any,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  sheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 38 : 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
  },
  handleWrap: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  handleBar: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  userBox: {
    width: '100%',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  userAvatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 13,
    fontWeight: '800',
  },
  userRole: {
    fontSize: 11,
    marginTop: 1,
  },
  buttonsRow: {
    width: '100%',
    gap: 10,
  },
  confirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
