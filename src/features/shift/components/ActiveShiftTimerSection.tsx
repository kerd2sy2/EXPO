import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkSession, EmployeeProfile, ThemeColors } from '../../../types/delegate';
import { SaudiMotorcyclePlate } from '../../../components/ui/SaudiMotorcyclePlate';
import { parsePlateComponents } from '../../../utils/plateUtils';

interface ActiveShiftTimerSectionProps {
  activeSession: WorkSession;
  employee: EmployeeProfile | null;
  elapsedTime: string;
  startKmNum: number;
  formatTimeStr: (iso?: string) => string;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
}

export const ActiveShiftTimerSection: React.FC<ActiveShiftTimerSectionProps> = ({
  activeSession,
  employee,
  elapsedTime,
  startKmNum,
  formatTimeStr,
  colors,
  isDarkMode,
  isRTL,
}) => {
  const bikeNum = activeSession.motorcycle_number || employee?.motorcycle_number || '';
  const parsed = parsePlateComponents(bikeNum);

  return (
    <View style={[styles.activeShiftLiveCard, { backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc', borderColor: colors.border }]}>
      <View style={[styles.activeLiveHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.pulseDotWrap}>
          <View style={styles.pulseDot} />
          <Text style={[styles.liveStatusTitle, { color: '#22c55e' }]}>
            {isRTL ? 'الدوام قيد التنفيذ حالياً' : 'Shift is Active'}
          </Text>
        </View>
        <View style={[styles.timerBadge, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
          <Ionicons name="time-outline" size={14} color="#22c55e" />
          <Text style={styles.timerBadgeText}>{elapsedTime}</Text>
        </View>
      </View>

      <View style={{ alignItems: 'center', marginVertical: 6 }}>
        <SaudiMotorcyclePlate
          digits={parsed.digits}
          letters={parsed.letters}
          editable={false}
          isDarkMode={isDarkMode}
        />
      </View>

      <View style={[styles.liveSessionInfoGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.liveInfoItem}>
          <Text style={[styles.liveInfoLabel, { color: colors.textSecondary }]}>{isRTL ? 'رقم الدباب' : 'Bike'}</Text>
          <Text style={[styles.liveInfoValue, { color: colors.textPrimary }]}>
            {bikeNum || '-'}
          </Text>
        </View>

        <View style={styles.liveInfoDivider} />

        <View style={styles.liveInfoItem}>
          <Text style={[styles.liveInfoLabel, { color: colors.textSecondary }]}>{isRTL ? 'عداد البداية' : 'Start KM'}</Text>
          <Text style={[styles.liveInfoValue, { color: colors.textPrimary }]}>
            {startKmNum > 0 ? `${startKmNum} كم` : (isRTL ? 'معفى' : 'Exempt')}
          </Text>
        </View>

        <View style={styles.liveInfoDivider} />

        <View style={styles.liveInfoItem}>
          <Text style={[styles.liveInfoLabel, { color: colors.textSecondary }]}>{isRTL ? 'وقت البدء' : 'Started'}</Text>
          <Text style={[styles.liveInfoValue, { color: colors.textPrimary }]}>
            {formatTimeStr(activeSession.start_time)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  activeShiftLiveCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  activeLiveHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pulseDotWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22c55e',
  },
  liveStatusTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  timerBadgeText: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  liveSessionInfoGrid: {
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.12)',
  },
  liveInfoItem: {
    alignItems: 'center',
  },
  liveInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  liveInfoValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  liveInfoDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
  },
});
