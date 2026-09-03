import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TabType, ThemeColors, WorkSession } from '../../types/delegate';

interface BottomTabBarProps {
  currentTab: TabType;
  activeSession: WorkSession | null;
  colors: ThemeColors;
  isRTL: boolean;
  t: any;
  onSelectTab: (tab: TabType) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentTab,
  activeSession,
  colors,
  isRTL,
  t,
  onSelectTab,
}) => {
  return (
    <View style={[styles.bottomTabBar, { backgroundColor: colors.card, borderTopColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      {/* 1. Home Tab */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => onSelectTab('home')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={currentTab === 'home' ? 'home' : 'home-outline'}
          size={22}
          color={currentTab === 'home' ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.tabBtnLabel, { color: currentTab === 'home' ? colors.primary : colors.textSecondary, fontWeight: currentTab === 'home' ? '700' : '500' }]}>
          {t.tabHome}
        </Text>
      </TouchableOpacity>

      {/* 2. Shift Tab */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => onSelectTab('shift')}
        activeOpacity={0.7}
      >
        <View>
          <Ionicons
            name={activeSession ? 'speedometer' : (currentTab === 'shift' ? 'play-circle' : 'play-circle-outline')}
            size={22}
            color={activeSession ? '#ef4444' : (currentTab === 'shift' ? colors.primary : colors.textSecondary)}
          />
          {activeSession && (
            <View style={styles.activeShiftDot} />
          )}
        </View>
        <Text style={[styles.tabBtnLabel, { color: activeSession ? '#ef4444' : (currentTab === 'shift' ? colors.primary : colors.textSecondary), fontWeight: currentTab === 'shift' ? '700' : '500' }]}>
          {t.tabShift}
        </Text>
      </TouchableOpacity>

      {/* 3. History Tab */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => onSelectTab('history')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={currentTab === 'history' ? 'receipt' : 'receipt-outline'}
          size={22}
          color={currentTab === 'history' ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.tabBtnLabel, { color: currentTab === 'history' ? colors.primary : colors.textSecondary, fontWeight: currentTab === 'history' ? '700' : '500' }]}>
          {t.tabHistory}
        </Text>
      </TouchableOpacity>

      {/* 4. Profile Tab */}
      <TouchableOpacity
        style={styles.tabBtn}
        onPress={() => onSelectTab('profile')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={currentTab === 'profile' ? 'person' : 'person-outline'}
          size={22}
          color={currentTab === 'profile' ? colors.primary : colors.textSecondary}
        />
        <Text style={[styles.tabBtnLabel, { color: currentTab === 'profile' ? colors.primary : colors.textSecondary, fontWeight: currentTab === 'profile' ? '700' : '500' }]}>
          {t.tabProfile}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomTabBar: {
    height: 64,
    borderTopWidth: 1,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  tabBtn: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  tabBtnLabel: {
    fontSize: 11,
  },
  activeShiftDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
  },
});
