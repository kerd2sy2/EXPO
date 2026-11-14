import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { OperationVideo } from '../../services/supervisor';
import { formatVideoRelativeTime } from './operationVideoHelpers';
import { operationVideoStyles as styles } from './operationVideoStyles';

interface OperationVideoCardProps {
  video: OperationVideo;
  onPlay: (url?: string) => void;
  onEdit: (video: OperationVideo) => void;
  onDelete: (video: OperationVideo) => void;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

/** Displays a single archived operation video card with play, edit, and delete controls. */
export const OperationVideoCard: React.FC<OperationVideoCardProps> = ({
  video,
  onPlay,
  onEdit,
  onDelete,
  colors,
  isDarkMode,
  isRTL,
}) => {
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <View style={[styles.videoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.cardHeaderRow, { flexDirection: rowDir }]}>
        <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '18' }]}>
          <Ionicons name="person" size={16} color={colors.primary} />
        </View>

        <View style={[styles.cardHeaderCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[styles.cardDelegateName, { color: colors.textPrimary }]}>
            {video.employee_name || 'توثيق عام للفرع'}
          </Text>
          <Text style={[styles.cardTimeText, { color: colors.textSecondary }]}>
            {formatVideoRelativeTime(video.recorded_at)}
          </Text>
        </View>

        {!!video.order_number && (
          <View style={[styles.orderPill, { backgroundColor: '#0284c718' }]}>
            <Text style={styles.orderPillText}>طلب #{video.order_number}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.previewBox} activeOpacity={0.88} onPress={() => onPlay(video.video_url)}>
        <View style={styles.previewBackdrop}>
          <View style={styles.bigPlayButton}>
            <Ionicons name="play" size={30} color="#ffffff" style={{ marginLeft: 3 }} />
          </View>
          <Text style={styles.previewTapText}>اضغط لتشغيل الفيديو</Text>
        </View>
      </TouchableOpacity>

      {!!video.notes && (
        <Text style={[styles.cardNotes, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
          {video.notes}
        </Text>
      )}

      <View style={[styles.cardActionsRow, { flexDirection: rowDir }]}>
        <TouchableOpacity
          style={[styles.primaryPlayBtn, { backgroundColor: colors.primary, flexDirection: rowDir }]}
          onPress={() => onPlay(video.video_url)}
        >
          <Ionicons name="play" size={16} color="#ffffff" />
          <Text style={styles.primaryPlayBtnText}>مشاهدة الفيديو</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionIconBtn, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9', borderColor: colors.border }]}
          onPress={() => onEdit(video)}
        >
          <Ionicons name="create-outline" size={17} color={colors.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionIconBtn, { backgroundColor: '#ef444415', borderColor: '#ef444430' }]}
          onPress={() => onDelete(video)}
        >
          <Ionicons name="trash-outline" size={17} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
};
