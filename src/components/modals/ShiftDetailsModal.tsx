import React from 'react';
import { Modal, View, Text, TouchableWithoutFeedback } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WorkSession, PreviewPhotoData, ThemeColors, Language } from '../../types/delegate';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { formatShiftDocUrl } from './shift-details/shiftDetailsHelpers';
import { shiftDetailsStyles as styles } from './shift-details/shiftDetailsStyles';
import { ShiftDetailsBody } from './shift-details/ShiftDetailsBody';

export interface ShiftDetailsModalProps {
  visible: boolean;
  session: WorkSession | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  lang?: Language;
  onClose: () => void;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  formatDateStr: (iso?: string) => string;
  formatTimeStr: (iso?: string) => string;
}

/** Bottom-sheet modal showing complete details and photos for a work shift. */
export const ShiftDetailsModal: React.FC<ShiftDetailsModalProps> = ({
  visible,
  session,
  colors,
  isDarkMode,
  isRTL,
  t,
  lang = 'ar',
  onClose,
  onPreviewPhoto,
  formatDateStr,
  formatTimeStr,
}) => {
  if (!session) return null;

  const startKmPhotoUrl = formatShiftDocUrl(session.start_km_image);
  const endKmPhotoUrl = formatShiftDocUrl(session.end_km_image);
  const isApproved = Boolean(session.is_reviewed);
  const distance = session.distance || (session.end_km && session.start_km ? session.end_km - session.start_km : 0);
  const supervisorName = session.edited_by_name || 'المشرف';
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <View style={[styles.sheetContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.handleContainer}>
                <View style={[styles.handleBar, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
              </View>

              <View style={[styles.sheetHeader, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
                <View style={[styles.headerInfoLeft, { flexDirection: rowDir }]}>
                  <View style={[styles.headerIconCircle, { backgroundColor: colors.primaryLight }]}>
                    <MaterialCommunityIcons name="calendar-clock" size={20} color={colors.primary} />
                  </View>
                  <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text style={[styles.headerDateTitle, { color: colors.textPrimary }]}>{formatDateStr(session.start_time)}</Text>
                    <Text style={[styles.headerTimeSubtitle, { color: colors.textSecondary }]}>
                      {formatTimeStr(session.start_time)}
                      {session.end_time ? `  ←  ${formatTimeStr(session.end_time)}` : ''}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: isApproved
                        ? isDarkMode
                          ? 'rgba(34, 197, 94, 0.16)'
                          : '#dcfce7'
                        : isDarkMode
                        ? 'rgba(245, 158, 11, 0.16)'
                        : '#fef3c7',
                      borderColor: isApproved
                        ? isDarkMode
                          ? 'rgba(34, 197, 94, 0.3)'
                          : '#bbf7d0'
                        : isDarkMode
                        ? 'rgba(245, 158, 11, 0.3)'
                        : '#fde68a',
                      flexDirection: rowDir,
                    },
                  ]}
                >
                  <Ionicons name={isApproved ? 'checkmark-circle' : 'time-outline'} size={13} color={isApproved ? '#16a34a' : '#d97706'} />
                  <Text style={[styles.statusPillText, { color: isApproved ? '#15803d' : '#b45309' }]}>
                    {isApproved ? t.reviewedBadge || 'مصادق عليه' : t.pendingBadge || 'بانتظار المشرف'}
                  </Text>
                </View>
              </View>

              <ModuleErrorBoundary moduleName="ShiftDetailsBody" colors={colors}>
                <ShiftDetailsBody
                  session={session}
                  distance={distance}
                  isApproved={isApproved}
                  supervisorName={supervisorName}
                  startKmPhotoUrl={startKmPhotoUrl}
                  endKmPhotoUrl={endKmPhotoUrl}
                  colors={colors}
                  isDarkMode={isDarkMode}
                  isRTL={isRTL}
                  t={t}
                  lang={lang}
                  onPreviewPhoto={onPreviewPhoto}
                />
              </ModuleErrorBoundary>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Backwards compatibility alias
export const ShiftDetailsView = ShiftDetailsModal;
