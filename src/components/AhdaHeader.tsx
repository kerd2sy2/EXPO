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
  onPressExportExcel?: () => void;
  exportingExcel?: boolean;
}

export const AhdaHeader: React.FC<AhdaHeaderProps> = ({
  user,
  colors,
  isDarkMode,
  onPressProfile,
  onPressDatePicker,
  onPressExportExcel,
  exportingExcel = false,
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

      {/* Left Side: Header Actions (Date/Calendar Modal & Excel Icon) */}
      <View style={styles.headerActions}>
        {/* Calendar Picker Icon -> Opens Date Picker Bottom Sheet Modal */}
        {onPressDatePicker && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}
            onPress={onPressDatePicker}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="calendar-outline" size={20} color="#ea580c" />
          </TouchableOpacity>
        )}

        {/* Excel Export Icon */}
        {onPressExportExcel && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}
            onPress={onPressExportExcel}
            activeOpacity={0.7}
            disabled={exportingExcel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {exportingExcel ? (
              <ActivityIndicator size="small" color="#16a34a" />
            ) : (
              <MaterialCommunityIcons name="file-excel-box" size={22} color="#16a34a" />
            )}
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
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
