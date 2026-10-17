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

export interface AhdaHeaderProps {
  user: any;
  colors: ThemeColors;
  isDarkMode: boolean;
  activeBranchName?: string | null;
  canSwitchBranch?: boolean;
  onPressProfile: () => void;
  onPressDatePicker?: () => void;
  onPressBranchSelector?: () => void;
}

export const AhdaHeader: React.FC<AhdaHeaderProps> = ({
  user,
  colors,
  isDarkMode,
  activeBranchName,
  canSwitchBranch = false,
  onPressProfile,
  onPressDatePicker,
  onPressBranchSelector,
}) => {
  const avatarUrl = user?.google_avatar || user?.avatar || null;

  return (
    <View style={[styles.headerContainer, { borderBottomColor: 'transparent' }]}>
      {/* Right Side: Photo only (Clickable for Profile) */}
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

      {/* Center: Branch Selector Pill (Only visible for users with multi-branch / all-branch access) */}
      {canSwitchBranch && activeBranchName ? (
        <TouchableOpacity
          style={[
            styles.branchPill,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f0fdf4',
              borderColor: isDarkMode ? '#334155' : '#bbf7d0',
            },
          ]}
          onPress={onPressBranchSelector}
          activeOpacity={0.75}
        >
          <Ionicons name="business" size={15} color="#047857" />
          <Text style={[styles.branchPillText, { color: colors.textPrimary }]} numberOfLines={1}>
            {activeBranchName}
          </Text>
          <Ionicons name="chevron-down" size={14} color="#047857" style={{ marginRight: -2 }} />
        </TouchableOpacity>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* Left Side: Header Actions (Date/Calendar Modal Icon) */}
      <View style={styles.headerActions}>
        {onPressDatePicker && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onPressDatePicker}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="calendar-outline" size={25} color="#047857" />
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
    paddingVertical: 10,
    backgroundColor: 'transparent',
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
  branchPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.2,
    maxWidth: '55%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  branchPillText: {
    fontSize: 13,
    fontWeight: '700',
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
