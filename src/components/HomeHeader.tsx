import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { EmployeeProfile, ThemeColors } from '../types/delegate';

export interface HomeHeaderProps {
  employee: EmployeeProfile;
  empPhotoUrl: string | null;
  colors: ThemeColors;
  isRTL: boolean;
  onPressProfile: () => void;
  onLongPressProfile: () => void;
  onPressQr?: () => void;
  unreadCount?: number;
  onPressNotifications?: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  employee,
  empPhotoUrl,
  colors,
  isRTL,
  onPressProfile,
  onLongPressProfile,
  unreadCount = 0,
  onPressNotifications,
}) => {
  const [imgError, setImgError] = React.useState(false);

  // Extract first and second name cleanly without cutting off
  const getFirstTwoNames = (fullName?: string) => {
    if (!fullName) return '';
    const clean = fullName.trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) return parts[0] || '';
    return `${parts[0]} ${parts[1]}`;
  };

  const displayName = getFirstTwoNames(employee.name);

  return (
    <View style={[styles.headerContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <TouchableOpacity
        style={[styles.headerUserInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={onPressProfile}
        onLongPress={onLongPressProfile}
        activeOpacity={0.8}
      >
        <View style={[styles.headerAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          {empPhotoUrl && !imgError ? (
            <ExpoImage
              source={{ uri: empPhotoUrl }}
              style={styles.headerAvatarImg}
              contentFit="cover"
              transition={150}
              cachePolicy="memory-disk"
              onError={() => setImgError(true)}
            />
          ) : (
            <Ionicons name="person" size={20} color={colors.primary} />
          )}
        </View>
        <View style={[styles.headerUserText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.headerNameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
            <Text
              style={[styles.headerUserName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
            >
              {displayName}
            </Text>
          </View>
          <View style={[styles.headerIdBadgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="business-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.headerUserNationalId, { color: colors.textSecondary }]}>
              {employee.branch_name || 'مشرف ميداني'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={styles.headerBellBtn}
          onPress={onPressNotifications}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          {(unreadCount || 0) > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>
                {(unreadCount || 0) > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 72,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerUserInfo: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerUserText: {
    flex: 1,
    justifyContent: 'center',
    gap: 3,
  },
  headerNameRow: {
    alignItems: 'center',
    gap: 6,
    flexDirection: 'row',
  },
  headerUserName: {
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 1,
    paddingHorizontal: 2,
  },
  headerIdBadgeRow: {
    alignItems: 'center',
    gap: 5,
  },
  headerUserNationalId: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    alignItems: 'center',
    gap: 8,
  },
  headerBellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'transparent',
    borderWidth: 0,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900',
  },
  supervisorBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supervisorBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
