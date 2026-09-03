import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WorkSession, PreviewPhotoData, ThemeColors } from '../types/delegate';
import { ShiftDetailsModal } from '../components/modals/ShiftDetailsModal';

interface HistoryScreenProps {
  historySessions: WorkSession[];
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
  formatDateStr: (iso?: string) => string;
  formatTimeStr: (iso?: string) => string;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  historySessions,
  onPreviewPhoto,
  formatDateStr,
  formatTimeStr,
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  const [selectedSession, setSelectedSession] = useState<WorkSession | null>(null);

  return (
    <View style={styles.tabContainer}>
      {historySessions.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="receipt-outline" size={44} color={colors.textSecondary} />
          <Text style={[styles.emptyCardText, { color: colors.textSecondary }]}>
            {t.noHistory || 'لا يوجد شفتات مسجلة حتى الآن'}
          </Text>
        </View>
      ) : (
        historySessions.map((session, index) => {
          const isApproved = Boolean(session.is_reviewed);
          const distance =
            session.distance ||
            (session.end_km && session.start_km ? session.end_km - session.start_km : 0);

          return (
            <TouchableOpacity
              key={session.id || index}
              activeOpacity={isApproved ? 0.8 : 1}
              style={[
                styles.premiumHistoryCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isApproved ? colors.border : (isDarkMode ? '#334155' : '#e2e8f0'),
                  opacity: isApproved ? 1 : 0.92,
                },
              ]}
              onPress={() => {
                if (isApproved) {
                  setSelectedSession(session);
                }
              }}
            >
              {/* Card Header: Date + Status Badge + Arrow (if approved) */}
              <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* Date */}
                <View style={[styles.dateGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.dateIconCircle, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="calendar" size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.dateText, { color: colors.textPrimary }]}>
                    {formatDateStr(session.start_time)}
                  </Text>
                </View>

                {/* Right: Approval Status Badge */}
                <View style={[styles.headerRightActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View
                    style={[
                      styles.approvalBadge,
                      {
                        backgroundColor: isApproved ? '#dcfce7' : (isDarkMode ? '#2d2305' : '#fef3c7'),
                        borderColor: isApproved ? '#bbf7d0' : (isDarkMode ? '#543c08' : '#fde68a'),
                      },
                    ]}
                  >
                    <Ionicons
                      name={isApproved ? 'checkmark-done-circle' : 'time-outline'}
                      size={13}
                      color={isApproved ? '#16a34a' : '#d97706'}
                    />
                    <Text
                      style={[
                        styles.approvalBadgeText,
                        { color: isApproved ? '#15803d' : '#b45309' },
                      ]}
                    >
                      {isApproved ? (t.reviewedBadge || 'معتمد') : (t.pendingBadge || 'قيد المراجعة')}
                    </Text>
                  </View>

                  {/* Arrow Indicator only for Approved Clickable Cards */}
                  {isApproved && (
                    <View style={[styles.arrowCircle, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <Ionicons
                        name={isRTL ? 'chevron-back' : 'chevron-forward'}
                        size={15}
                        color={colors.primary}
                      />
                    </View>
                  )}
                </View>
              </View>

              {/* 3 Metric Columns: Distance, Orders, Fuel */}
              <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                {/* 1. Distance Metric */}
                <View style={[styles.statBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <View style={[styles.statIconBadge, { backgroundColor: '#dcfce7' }]}>
                    <Ionicons name="navigate" size={14} color="#16a34a" />
                  </View>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {distance} <Text style={[styles.statUnit, { color: colors.textSecondary }]}>{t.km}</Text>
                  </Text>
                  <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
                    {t.distanceTraveled}
                  </Text>
                </View>

                {/* 2. Orders Metric */}
                <View style={[styles.statBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <View style={[styles.statIconBadge, { backgroundColor: colors.primaryLight }]}>
                    <MaterialCommunityIcons name="package-variant-closed" size={14} color={colors.primary} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {session.orders_count || 0} <Text style={[styles.statUnit, { color: colors.textSecondary }]}>{t.ordersUnit}</Text>
                  </Text>
                  <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
                    {t.approvedOrders}
                  </Text>
                </View>

                {/* 3. Fuel Metric */}
                <View style={[styles.statBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <View style={[styles.statIconBadge, { backgroundColor: '#fef3c7' }]}>
                    <MaterialCommunityIcons name="gas-station" size={14} color="#d97706" />
                  </View>
                  <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                    {session.fuel_cost || 0} <Text style={[styles.statUnit, { color: colors.textSecondary }]}>{t.sar}</Text>
                  </Text>
                  <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
                    {t.fuelCostLabel}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })
      )}

      {/* Full Shift Details Bottom Sheet Modal (Only triggered for approved shifts) */}
      <ShiftDetailsModal
        session={selectedSession}
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        t={t}
        onClose={() => setSelectedSession(null)}
        onPreviewPhoto={onPreviewPhoto}
        formatDateStr={formatDateStr}
        formatTimeStr={formatTimeStr}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    padding: 16,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 36,
    alignItems: 'center',
    gap: 12,
  },
  emptyCardText: {
    fontSize: 14,
    fontWeight: '600',
  },
  premiumHistoryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  dateGroup: {
    alignItems: 'center',
    gap: 8,
  },
  dateIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '800',
  },
  headerRightActions: {
    alignItems: 'center',
    gap: 8,
  },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  approvalBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsGrid: {
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  statIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  statUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  statTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
});
