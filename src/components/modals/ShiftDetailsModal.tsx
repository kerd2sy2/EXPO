import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WorkSession, PreviewPhotoData, ThemeColors } from '../../types/delegate';

interface ShiftDetailsModalProps {
  session: WorkSession | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  onClose: () => void;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  formatDateStr: (iso?: string) => string;
  formatTimeStr: (iso?: string) => string;
}

export const ShiftDetailsModal: React.FC<ShiftDetailsModalProps> = ({
  session,
  colors,
  isDarkMode,
  isRTL,
  t,
  onClose,
  onPreviewPhoto,
  formatDateStr,
  formatTimeStr,
}) => {
  if (!session) return null;

  const distance =
    session.distance ||
    (session.end_km && session.start_km ? session.end_km - session.start_km : 0);

  return (
    <Modal
      visible={!!session}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.bottomModalBackdrop}>
        {/* Backdrop dismiss */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            styles.bottomSheetCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Drag Handle */}
          <View
            style={[
              styles.bottomDragIndicator,
              { backgroundColor: isDarkMode ? '#334155' : '#cbd5e1' },
            ]}
          />

          {/* Close Icon */}
          <TouchableOpacity
            onPress={onClose}
            style={[
              styles.bottomModalCloseBtn,
              isRTL ? { left: 16 } : { right: 16 },
            ]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {/* Header Title */}
            <View style={styles.modalHeaderSection}>
              <View
                style={[
                  styles.headerIconCircle,
                  { backgroundColor: colors.primaryLight },
                ]}
              >
                <MaterialCommunityIcons
                  name="calendar-clock"
                  size={30}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {formatDateStr(session.start_time)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: '#dcfce7' },
                ]}
              >
                <Ionicons
                  name="checkmark-done-circle"
                  size={14}
                  color="#16a34a"
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: '#15803d' },
                  ]}
                >
                  {t.reviewedBadge || 'معتمد وموثق'}
                </Text>
              </View>
            </View>

            {/* Quick 3 Metrics Grid */}
            <View
              style={[
                styles.metricsGrid,
                { flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="navigate-outline" size={18} color="#10b981" />
                <Text style={[styles.metricValue, { color: '#10b981' }]}>
                  {distance} {t.km}
                </Text>
                <Text
                  style={[
                    styles.metricLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.distanceTraveled}
                </Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="package-variant-closed"
                  size={18}
                  color={colors.primary}
                />
                <Text style={[styles.metricValue, { color: colors.primary }]}>
                  {session.orders_count || 0} {t.ordersUnit}
                </Text>
                <Text
                  style={[
                    styles.metricLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.approvedOrders}
                </Text>
              </View>

              <View
                style={[
                  styles.metricCard,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name="gas-station"
                  size={18}
                  color="#eab308"
                />
                <Text
                  style={[styles.metricValue, { color: colors.textPrimary }]}
                >
                  {session.fuel_cost || 0} {t.sar}
                </Text>
                <Text
                  style={[
                    styles.metricLabel,
                    { color: colors.textSecondary },
                  ]}
                >
                  {t.fuelCostLabel}
                </Text>
              </View>
            </View>

            {/* Shift Comprehensive Breakdown */}
            <View
              style={[
                styles.detailsBox,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Motorcycle Plate */}
              <View
                style={[
                  styles.detailRow,
                  {
                    borderBottomColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View
                  style={[
                    styles.detailLabelGroup,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="bike"
                    size={17}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.assignedBike}
                  </Text>
                </View>
                <Text
                  style={[styles.detailValue, { color: colors.textPrimary }]}
                >
                  {session.motorcycle_number || '—'}
                </Text>
              </View>

              {/* Time Span */}
              <View
                style={[
                  styles.detailRow,
                  {
                    borderBottomColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View
                  style={[
                    styles.detailLabelGroup,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={17}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.durationLabel}
                  </Text>
                </View>
                <Text
                  style={[styles.detailValue, { color: colors.textPrimary }]}
                >
                  {formatTimeStr(session.start_time)} -{' '}
                  {session.end_time ? formatTimeStr(session.end_time) : '—'}
                </Text>
              </View>

              {/* Start KM */}
              <View
                style={[
                  styles.detailRow,
                  {
                    borderBottomColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View
                  style={[
                    styles.detailLabelGroup,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={17}
                    color="#10b981"
                  />
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.startKmLabel}
                  </Text>
                </View>
                <Text
                  style={[styles.detailValue, { color: colors.textPrimary }]}
                >
                  {session.start_km?.toLocaleString()} {t.km}
                </Text>
              </View>

              {/* End KM */}
              <View
                style={[
                  styles.detailRow,
                  {
                    borderBottomWidth: 0,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View
                  style={[
                    styles.detailLabelGroup,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Ionicons
                    name="speedometer-outline"
                    size={17}
                    color="#ef4444"
                  />
                  <Text
                    style={[
                      styles.detailLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.endKmLabel}
                  </Text>
                </View>
                <Text
                  style={[styles.detailValue, { color: colors.textPrimary }]}
                >
                  {session.end_km
                    ? `${session.end_km?.toLocaleString()} ${t.km}`
                    : '—'}
                </Text>
              </View>
            </View>

            {/* Odometer Photos Section */}
            {(session.start_km_image || session.end_km_image) && (
              <View style={styles.photosSection}>
                <Text
                  style={[
                    styles.sectionHeading,
                    {
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                >
                  {t.odometerPhotoBadge}
                </Text>

                <View
                  style={[
                    styles.photosGrid,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  {session.start_km_image && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[
                        styles.photoCard,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() =>
                        onPreviewPhoto({
                          url: session.start_km_image!,
                          title: `${t.startKmPhotoLabel} (${session.start_km} ${t.km})`,
                        })
                      }
                    >
                      <Image
                        source={{ uri: session.start_km_image }}
                        style={styles.photoImg}
                        resizeMode="cover"
                      />
                      <View style={styles.photoOverlay}>
                        <Text style={styles.photoTag}>{t.startKmLabel}</Text>
                        <Ionicons name="expand" size={14} color="#ffffff" />
                      </View>
                    </TouchableOpacity>
                  )}

                  {session.end_km_image && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={[
                        styles.photoCard,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: colors.border,
                        },
                      ]}
                      onPress={() =>
                        onPreviewPhoto({
                          url: session.end_km_image!,
                          title: `${t.endKmPhotoLabel} (${session.end_km} ${t.km})`,
                        })
                      }
                    >
                      <Image
                        source={{ uri: session.end_km_image }}
                        style={styles.photoImg}
                        resizeMode="cover"
                      />
                      <View style={styles.photoOverlay}>
                        <Text style={styles.photoTag}>{t.endKmLabel}</Text>
                        <Ionicons name="expand" size={14} color="#ffffff" />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Start Notes */}
            {session.notes ? (
              <View
                style={[
                  styles.notesBox,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.notesHeader,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.notesLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t.startNotesLabel}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.notesText,
                    {
                      color: colors.textPrimary,
                      textAlign: isRTL ? 'right' : 'left',
                    },
                  ]}
                >
                  {session.notes}
                </Text>
              </View>
            ) : null}

            {/* Supervisor Review Notice */}
            {session.is_edited_by_supervisor && (
              <View
                style={[
                  styles.supervisorBox,
                  { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
                ]}
              >
                <View
                  style={[
                    styles.notesHeader,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="shield-account-outline"
                    size={16}
                    color="#d97706"
                  />
                  <Text
                    style={[styles.supervisorLabel, { color: '#92400e' }]}
                  >
                    {t.editedBySupervisor}
                  </Text>
                </View>
                {session.review_notes ? (
                  <Text
                    style={[
                      styles.notesText,
                      {
                        color: '#92400e',
                        textAlign: isRTL ? 'right' : 'left',
                      },
                    ]}
                  >
                    {session.review_notes}
                  </Text>
                ) : null}
              </View>
            )}

            {/* Close Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
              onPress={onClose}
            >
              <Text
                style={[styles.closeBtnText, { color: colors.textPrimary }]}
              >
                {t.close}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '88%',
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 24,
  },
  bottomDragIndicator: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  bottomModalCloseBtn: {
    position: 'absolute',
    top: 14,
    zIndex: 10,
    padding: 4,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  modalHeaderSection: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  headerIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricsGrid: {
    gap: 10,
    marginBottom: 14,
  },
  metricCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailsBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
  },
  detailRow: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabelGroup: {
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  photosSection: {
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  photosGrid: {
    gap: 10,
  },
  photoCard: {
    flex: 1,
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoTag: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  notesBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  notesHeader: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 13,
    lineHeight: 18,
  },
  supervisorBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  supervisorLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
