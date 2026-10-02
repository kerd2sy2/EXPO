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
  onPressQr: () => void;
}

export const HomeHeader: React.FC<HomeHeaderProps> = ({
  employee,
  empPhotoUrl,
  colors,
  isRTL,
  onPressProfile,
  onLongPressProfile,
  onPressQr,
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
            <Ionicons name="person-outline" size={13} color={colors.primary} />
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
            <Ionicons name="card-outline" size={13} color={colors.primary} />
            <Text style={[styles.headerUserNationalId, { color: colors.textSecondary }]}>
              {employee.national_id || '—'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <TouchableOpacity
          style={styles.headerQrBtn}
          onPress={onPressQr}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="qr-code-outline" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    minHeight: 68,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  headerQrBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
