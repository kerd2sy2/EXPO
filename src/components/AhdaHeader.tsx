import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../types/delegate';
import { formatImageUrl } from '../services/api';

export interface AhdaHeaderProps {
  user: any;
  colors: ThemeColors;
  isDarkMode: boolean;
  activeBranchName?: string | null;
  canSwitchBranch?: boolean;
  onPressProfile: () => void;
  onPressDatePicker?: () => void;
  onPressBranchSelector?: () => void;
  onPressSearch?: () => void;
}

const getFirstTwoNames = (fullName?: string | null): string => {
  if (!fullName || typeof fullName !== 'string') return 'مسؤول العهدة';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'مسؤول العهدة';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[1]}`;
};

export const AhdaHeader: React.FC<AhdaHeaderProps> = ({
  user,
  colors,
  isDarkMode,
  activeBranchName,
  canSwitchBranch = false,
  onPressProfile,
  onPressDatePicker,
  onPressBranchSelector,
  onPressSearch,
}) => {
  const rawAvatar =
    user?.avatar ||
    user?.google_avatar ||
    user?.personal_image ||
    user?.photo ||
    user?.image ||
    user?.picture ||
    user?.employee?.personal_image ||
    user?.employee?.avatar ||
    user?.admin?.google_avatar ||
    user?.admin?.avatar ||
    null;
  const avatarUrl = formatImageUrl(rawAvatar);
  const rawName =
    user?.name ||
    user?.full_name ||
    user?.username ||
    user?.employee?.name ||
    user?.admin?.name ||
    'مسؤول العهدة';
  const employeeDisplayName = getFirstTwoNames(rawName);
  const branchDisplayName = activeBranchName || 'الفرع الأول';

  return (
    <View style={[styles.headerContainer, { borderBottomColor: 'transparent' }]}>
      {/* Right Side: Avatar + Employee Name (First & Second) + Branch Name (No Background) */}
      <View style={styles.headerRightGroup}>
        <TouchableOpacity
          style={styles.headerAvatarTouch}
          onPress={onPressProfile}
          activeOpacity={0.8}
        >
          <View style={[styles.headerAvatar, { backgroundColor: '#ecfdf5', borderColor: '#047857' }]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.headerAvatarImg} />
            ) : (
              <Ionicons name="person" size={20} color="#047857" />
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.headerUserInfoCol}>
          {/* Employee Name (First & Second Name) */}
          <TouchableOpacity onPress={onPressProfile} activeOpacity={0.7}>
            <Text
              style={[styles.employeeNameText, { color: colors.textPrimary }]}
              numberOfLines={1}
            >
              {employeeDisplayName}
            </Text>
          </TouchableOpacity>

          {/* Branch Name without background */}
          {canSwitchBranch && onPressBranchSelector ? (
            <TouchableOpacity
              style={styles.branchRowNoBg}
              onPress={onPressBranchSelector}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="business-outline" size={13} color="#047857" />
              <Text
                style={[styles.branchTextNoBg, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {branchDisplayName}
              </Text>
              <Ionicons name="chevron-down" size={12} color="#047857" />
            </TouchableOpacity>
          ) : (
            <View style={styles.branchRowNoBg}>
              <Ionicons name="business-outline" size={13} color="#047857" />
              <Text
                style={[styles.branchTextNoBg, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {branchDisplayName}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Left Side: Header Actions (Search Icon + Date/Calendar Modal Icon) */}
      <View style={styles.headerActions}>
        {onPressSearch && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onPressSearch}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="search-outline" size={23} color="#047857" />
          </TouchableOpacity>
        )}
        {onPressDatePicker && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onPressDatePicker}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="calendar-outline" size={24} color="#047857" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 64,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'transparent',
  },
  headerRightGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerAvatarTouch: {
    padding: 2,
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
  headerUserInfoCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
    flexShrink: 1,
  },
  employeeNameText: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  branchRowNoBg: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  branchTextNoBg: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
});
