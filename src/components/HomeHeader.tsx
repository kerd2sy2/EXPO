import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
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
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  employee,
  empPhotoUrl,
  colors,
  isRTL,
  onPressProfile,
  onLongPressProfile,
}) => {
  return (
    <View style={[styles.headerContainer, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <TouchableOpacity
        style={[styles.headerUserInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        onPress={onPressProfile}
        onLongPress={onLongPressProfile}
        activeOpacity={0.8}
      >
        <View style={[styles.headerAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
          {empPhotoUrl ? (
            <Image source={{ uri: empPhotoUrl }} style={styles.headerAvatarImg} />
          ) : (
            <Ionicons name="person" size={20} color={colors.primary} />
          )}
        </View>
        <View style={[styles.headerUserText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <View style={[styles.headerNameRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="shield-checkmark" size={14} color={colors.primary} />
            <Text
              style={[styles.headerUserName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              minimumFontScale={0.75}
            >
              {employee.name}
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

      <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} />
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
    gap: 5,
  },
  headerUserName: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
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
