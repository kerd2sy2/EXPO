import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors } from '../types/delegate';

export interface AhdaHeaderProps {
  user: any;
  colors: ThemeColors;
  isDarkMode: boolean;
  onPressProfile: () => void;
  onPressDatePicker?: () => void;
}

export const AhdaHeader: React.FC<AhdaHeaderProps> = ({
  user,
  colors,
  isDarkMode,
  onPressProfile,
  onPressDatePicker,
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
        <View style={[styles.headerAvatar, { backgroundColor: '#fff7ed', borderColor: '#ea580c' }]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.headerAvatarImg} />
          ) : (
            <Ionicons name="person" size={20} color="#ea580c" />
          )}
        </View>
      </TouchableOpacity>

      {/* Left Side: Header Actions (Date/Calendar Modal Icon) */}
      <View style={styles.headerActions}>
        {onPressDatePicker && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onPressDatePicker}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="calendar-outline" size={25} color="#ea580c" />
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
