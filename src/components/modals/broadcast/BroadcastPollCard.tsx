import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BroadcastNotificationItem } from '../../../services/notificationService';
import { ThemeColors } from '../../../types/delegate';
import { ModuleErrorBoundary } from '../../ModuleErrorBoundary';
import { BroadcastUiStrings } from './broadcastHelpers';
import { broadcastStyles as styles } from './broadcastStyles';

interface BroadcastPollCardProps {
  broadcast: BroadcastNotificationItem;
  locTitle: string;
  locPollQuestion?: string;
  ui: BroadcastUiStrings;
  voting: 'AGREE' | 'DISAGREE' | null;
  onVote: (response: 'AGREE' | 'DISAGREE') => void;
  colors: ThemeColors;
  isDarkMode: boolean;
}

/** Interactive poll and voting card embedded inside the BroadcastModal sheet. */
export const BroadcastPollCard: React.FC<BroadcastPollCardProps> = ({
  broadcast,
  locTitle,
  locPollQuestion,
  ui,
  voting,
  onVote,
  colors,
  isDarkMode,
}) => {
  const rowDir = ui.currentIsRTL ? 'row-reverse' : 'row';

  return (
    <ModuleErrorBoundary moduleName="BroadcastPollCard" colors={colors}>
      <View
        style={[
          styles.pollCard,
          {
            backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.08)' : '#f0f9ff',
            borderColor: isDarkMode ? 'rgba(56, 189, 248, 0.25)' : '#bae6fd',
          },
        ]}
      >
        <View style={[styles.pollHeaderRow, { flexDirection: rowDir }]}>
          <Ionicons name="help-circle-outline" size={20} color="#0284c7" />
          <Text style={[styles.pollCardTitle, { color: isDarkMode ? '#7dd3fc' : '#0369a1' }]}>{ui.pollHeader}</Text>
        </View>

        <Text style={[styles.pollQuestionText, { color: colors.textPrimary, textAlign: ui.currentIsRTL ? 'right' : 'left' }]}>
          {locPollQuestion || locTitle}
        </Text>

        {broadcast.user_vote ? (
          <View
            style={[
              styles.votedStatusBadge,
              {
                backgroundColor: broadcast.user_vote === 'AGREE' ? '#dcfce7' : '#fee2e2',
                borderColor: broadcast.user_vote === 'AGREE' ? '#bbf7d0' : '#fecaca',
              },
            ]}
          >
            <Ionicons
              name={broadcast.user_vote === 'AGREE' ? 'checkmark-circle' : 'close-circle'}
              size={18}
              color={broadcast.user_vote === 'AGREE' ? '#16a34a' : '#ef4444'}
            />
            <Text style={[styles.votedStatusText, { color: broadcast.user_vote === 'AGREE' ? '#15803d' : '#b91c1c' }]}>
              {broadcast.user_vote === 'AGREE' ? ui.votedAgreeText : ui.votedDisagreeText}
            </Text>
          </View>
        ) : null}

        <View style={[styles.voteButtonsRow, { flexDirection: rowDir }]}>
          <TouchableOpacity
            style={[styles.voteBtn, styles.agreeBtn, broadcast.user_vote === 'AGREE' && styles.selectedAgreeBtn]}
            onPress={() => onVote('AGREE')}
            disabled={voting !== null}
            activeOpacity={0.8}
          >
            {voting === 'AGREE' ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <View style={[styles.btnInnerRow, { flexDirection: rowDir }]}>
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                <Text style={styles.voteBtnText}>{ui.agreeBtnText}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteBtn, styles.disagreeBtn, broadcast.user_vote === 'DISAGREE' && styles.selectedDisagreeBtn]}
            onPress={() => onVote('DISAGREE')}
            disabled={voting !== null}
            activeOpacity={0.8}
          >
            {voting === 'DISAGREE' ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <View style={[styles.btnInnerRow, { flexDirection: rowDir }]}>
                <Ionicons name="close-circle" size={18} color="#ffffff" />
                <Text style={styles.voteBtnText}>{ui.disagreeBtnText}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ModuleErrorBoundary>
  );
};
