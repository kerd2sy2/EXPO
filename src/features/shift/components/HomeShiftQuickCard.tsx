import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkSession, TabType, ThemeColors } from '../../../types/delegate';
import { ModuleErrorBoundary } from '../../../components/ModuleErrorBoundary';
import { ShiftCardSkeleton } from './ShiftCardSkeleton';
import { formatSessionElapsed } from '../../../hooks/useSessionTimer';

interface HomeShiftQuickCardProps {
  activeSession: WorkSession | null;
  isSessionSyncing?: boolean;
  elapsedTime: string;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  onNavigateToTab: (tab: TabType) => void;
  onStartShiftClick?: () => void;
}

export const HomeShiftQuickCard: React.FC<HomeShiftQuickCardProps> = ({
  activeSession,
  isSessionSyncing = false,
  elapsedTime,
  colors,
  isDarkMode,
  isRTL,
  t,
  onNavigateToTab,
  onStartShiftClick,
}) => {
  // Show skeleton while verifying active shift status if no session is loaded yet
  // This prevents flashing "Start Shift" (بدء الدوام) when the courier is actually on an active shift
  if (isSessionSyncing && !activeSession) {
    return (
      <ShiftCardSkeleton
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
      />
    );
  }

  const displayTimer =
    elapsedTime && elapsedTime !== '00:00:00'
      ? elapsedTime
      : formatSessionElapsed(activeSession?.start_time);

  return (
    <ModuleErrorBoundary moduleName="كرت إدارة الدوام" colors={colors}>
      <TouchableOpacity
        style={[
          styles.quickCardRow,
          {
            backgroundColor: colors.card,
            borderColor: activeSession ? (isDarkMode ? 'rgba(239, 68, 68, 0.35)' : '#fecaca') : colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
        activeOpacity={0.8}
        onPress={() => {
          if (!activeSession && onStartShiftClick) {
            onStartShiftClick();
          } else {
            onNavigateToTab('shift');
          }
        }}
      >
        <View
          style={[
            styles.quickCardIconCircle,
            {
              backgroundColor: activeSession
                ? isDarkMode
                  ? 'rgba(239, 68, 68, 0.18)'
                  : '#fee2e2'
                : colors.primaryLight,
            },
          ]}
        >
          <Ionicons
            name={activeSession ? 'stop-circle-outline' : 'play-circle-outline'}
            size={24}
            color={activeSession ? '#ef4444' : colors.primary}
          />
        </View>
        <View style={styles.quickCardTextCol}>
          <Text
            style={[
              styles.quickCardTitle,
              {
                color: colors.textPrimary,
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          >
            {activeSession ? t.endShiftNow : t.quickShiftTitle}
          </Text>
          <Text
            style={[
              styles.quickCardSub,
              {
                color: activeSession ? (isDarkMode ? '#fca5a5' : '#dc2626') : colors.textSecondary,
                fontWeight: activeSession ? '700' : '400',
                textAlign: isRTL ? 'right' : 'left',
              },
            ]}
          >
            {activeSession
              ? `${t.durationLabel}: ${displayTimer}`
              : t.quickShiftSub}
          </Text>
        </View>
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>
    </ModuleErrorBoundary>
  );
};

const styles = StyleSheet.create({
  quickCardRow: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  quickCardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCardTextCol: {
    flex: 1,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickCardSub: {
    fontSize: 12,
  },
});

