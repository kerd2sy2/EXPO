import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WorkSession, PreviewPhotoData, ThemeColors } from '../../types/delegate';
import { API_BASE_URL } from '../../services/api';

export interface ShiftDetailsModalProps {
  visible: boolean;
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
  visible,
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

  const formatDocUrl = (url?: string) => {
    if (!url) return null;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const cleanUrl = url.replace(/^\/+/, '');
    if (cleanUrl.startsWith('uploads/')) {
      return `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/${cleanUrl}`;
    }
    return `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/uploads/${cleanUrl}`;
  };

  const startKmPhotoUrl = formatDocUrl(session.start_km_image);
  const endKmPhotoUrl = formatDocUrl(session.end_km_image);

  const isApproved = Boolean(session.is_reviewed);
  const distance =
    session.distance ||
    (session.end_km && session.start_km ? session.end_km - session.start_km : 0);

  const supervisorName = session.edited_by_name || 'المشرف';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalBackdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Top Handle Bar */}
              <View style={styles.handleContainer}>
                <View
                  style={[
                    styles.handleBar,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(255,255,255,0.2)'
                        : 'rgba(0,0,0,0.15)',
                    },
                  ]}
                />
              </View>

              {/* Header: Date, Time & Status Badge */}
              <View
                style={[
                  styles.sheetHeader,
                  {
                    borderBottomColor: colors.border,
                    flexDirection: isRTL ? 'row-reverse' : 'row',
                  },
                ]}
              >
                <View
                  style={[
                    styles.headerInfoLeft,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View
                    style={[
                      styles.headerIconCircle,
                      { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="calendar-clock"
                      size={20}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                    <Text
                      style={[styles.headerDateTitle, { color: colors.textPrimary }]}
                    >
                      {formatDateStr(session.start_time)}
                    </Text>
                    <Text
                      style={[
                        styles.headerTimeSubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {formatTimeStr(session.start_time)}
                      {session.end_time ? `  ←  ${formatTimeStr(session.end_time)}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Status Badge */}
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: isApproved
                        ? (isDarkMode ? 'rgba(34, 197, 94, 0.16)' : '#dcfce7')
                        : (isDarkMode ? 'rgba(245, 158, 11, 0.16)' : '#fef3c7'),
                      borderColor: isApproved
                        ? (isDarkMode ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0')
                        : (isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#fde68a'),
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                    },
                  ]}
                >
                  <Ionicons
                    name={isApproved ? 'checkmark-circle' : 'time-outline'}
                    size={13}
                    color={isApproved ? '#16a34a' : '#d97706'}
                  />
                  <Text
                    style={[
                      styles.statusPillText,
                      { color: isApproved ? '#15803d' : '#b45309' },
                    ]}
                  >
                    {isApproved
                      ? (t.reviewedBadge || 'مصادق عليه')
                      : (t.pendingBadge || 'بانتظار المشرف')}
                  </Text>
                </View>
              </View>

              {/* Scrollable Dynamic Body (takes size of content up to 2/3 screen) */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {/* 3 KPI Summary Boxes */}
                <View
                  style={[
                    styles.kpiRow,
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  {/* Orders */}
                  <View
                    style={[
                      styles.kpiCard,
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
                    <Text style={[styles.kpiValue, { color: colors.primary }]}>
                      {session.orders_count || 0}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
                      {isApproved ? (t.approvedOrders || 'الطلبات المعتمدة') : (t.ordersUnit || 'الطلبات')}
                    </Text>
                  </View>

                  {/* Distance */}
                  <View
                    style={[
                      styles.kpiCard,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons name="navigate" size={18} color="#16a34a" />
                    <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
                      {distance}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
                      {t.distanceTraveled || 'المسافة (كم)'}
                    </Text>
                  </View>

                  {/* Fuel */}
                  <View
                    style={[
                      styles.kpiCard,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name="gas-station"
                      size={18}
                      color="#d97706"
                    />
                    <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>
                      {session.fuel_cost || 0}
                    </Text>
                    <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
                      {t.fuelCostLabel || 'البنزين (ر.س)'}
                    </Text>
                  </View>
                </View>

                {/* Shift Details Box */}
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
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        {t.assignedBike || 'لوحة الدراجة'}
                      </Text>
                    </View>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {session.motorcycle_number || '—'}
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
                        color="#16a34a"
                      />
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        {t.startKmLabel || 'عداد البداية'}
                      </Text>
                    </View>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {session.start_km?.toLocaleString()} {t.km || 'كم'}
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
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        {t.endKmLabel || 'عداد النهاية'}
                      </Text>
                    </View>
                    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
                      {session.end_km
                        ? `${session.end_km?.toLocaleString()} ${t.km || 'كم'}`
                        : '—'}
                    </Text>
                  </View>
                </View>

                {/* Supervisor Edit & Notes Box */}
                {(session.is_edited_by_supervisor || session.review_notes) && (
                  <View
                    style={[
                      styles.supervisorBox,
                      {
                        backgroundColor: isDarkMode
                          ? 'rgba(245, 158, 11, 0.12)'
                          : '#fef3c7',
                        borderColor: isDarkMode
                          ? 'rgba(245, 158, 11, 0.3)'
                          : '#fcd34d',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.supervisorHeader,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="shield-account"
                        size={18}
                        color="#d97706"
                      />
                      <Text
                        style={[
                          styles.supervisorTitle,
                          { color: isDarkMode ? '#fbbf24' : '#92400e' },
                        ]}
                      >
                        {isRTL
                          ? `تم التعديل بواسطة المشرف (${supervisorName})`
                          : `Edited by Supervisor (${supervisorName})`}
                      </Text>
                    </View>

                    {session.original_orders_count ? (
                      <Text
                        style={[
                          styles.supervisorSubText,
                          {
                            color: isDarkMode ? '#fde68a' : '#b45309',
                            textAlign: isRTL ? 'right' : 'left',
                          },
                        ]}
                      >
                        {isRTL
                          ? `الطلبات المدخلة: ${session.original_orders_count}  ←  المعتمدة: ${session.orders_count}`
                          : `Original: ${session.original_orders_count}  →  Approved: ${session.orders_count}`}
                      </Text>
                    ) : null}

                    {session.review_notes ? (
                      <Text
                        style={[
                          styles.supervisorNotes,
                          {
                            color: isDarkMode ? '#fef3c7' : '#78350f',
                            textAlign: isRTL ? 'right' : 'left',
                          },
                        ]}
                      >
                        {session.review_notes}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Odometer Photos */}
                {(startKmPhotoUrl || endKmPhotoUrl) && (
                  <View style={styles.photosSection}>
                    <View
                      style={[
                        styles.photosRow,
                        { flexDirection: isRTL ? 'row-reverse' : 'row' },
                      ]}
                    >
                      {startKmPhotoUrl && (
                        <TouchableOpacity
                          style={[
                            styles.photoBox,
                            {
                              backgroundColor: colors.inputBg,
                              borderColor: colors.border,
                            },
                          ]}
                          activeOpacity={0.85}
                          onPress={() =>
                            onPreviewPhoto({
                              url: startKmPhotoUrl,
                              title: `${t.startKmPhotoLabel || 'عداد البداية'} (${session.start_km} ${t.km})`,
                            })
                          }
                        >
                          <Image
                            source={{ uri: startKmPhotoUrl }}
                            style={styles.photoImg}
                            resizeMode="cover"
                          />
                          <View style={styles.photoOverlay}>
                            <Text style={styles.photoTag}>
                              {t.startKmLabel || 'البداية'}
                            </Text>
                            <Ionicons name="expand" size={13} color="#ffffff" />
                          </View>
                        </TouchableOpacity>
                      )}

                      {endKmPhotoUrl && (
                        <TouchableOpacity
                          style={[
                            styles.photoBox,
                            {
                              backgroundColor: colors.inputBg,
                              borderColor: colors.border,
                            },
                          ]}
                          activeOpacity={0.85}
                          onPress={() =>
                            onPreviewPhoto({
                              url: endKmPhotoUrl,
                              title: `${t.endKmPhotoLabel || 'عداد النهاية'} (${session.end_km} ${t.km})`,
                            })
                          }
                        >
                          <Image
                            source={{ uri: endKmPhotoUrl }}
                            style={styles.photoImg}
                            resizeMode="cover"
                          />
                          <View style={styles.photoOverlay}>
                            <Text style={styles.photoTag}>
                              {t.endKmLabel || 'النهاية'}
                            </Text>
                            <Ionicons name="expand" size={13} color="#ffffff" />
                          </View>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}

                {/* Delegate Notes */}
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
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Backwards compatibility alias
export const ShiftDetailsView = ShiftDetailsModal;

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    maxHeight: '68%', // Takes ~2/3 of the screen dynamically fitting data size
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  headerInfoLeft: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerDateTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerTimeSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  statusPill: {
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    paddingVertical: 12,
    gap: 12,
  },
  kpiRow: {
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  detailsBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 2,
  },
  detailRow: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  detailLabelGroup: {
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  supervisorBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  supervisorHeader: {
    alignItems: 'center',
    gap: 6,
  },
  supervisorTitle: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  supervisorSubText: {
    fontSize: 11,
    fontWeight: '600',
  },
  supervisorNotes: {
    fontSize: 11,
    lineHeight: 16,
  },
  photosSection: {
    marginTop: 2,
  },
  photosRow: {
    gap: 10,
  },
  photoBox: {
    flex: 1,
    height: 105,
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
    paddingVertical: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoTag: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  notesBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  notesText: {
    fontSize: 12,
    lineHeight: 16,
  },
});
