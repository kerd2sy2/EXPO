import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors, Language } from '../../../types/delegate';
import { DelegateViolation } from '../../../services/api';
import { formatBikePlateForDisplay } from '../../../utils/plateUtils';
import { formatViolationDate, getViolationStatusBadge } from './violationsModalHelpers';
import { violationsModalStyles as styles } from './violationsModalStyles';

interface ViolationItemCardProps {
  item: DelegateViolation;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  lang: Language;
}

/** Card rendering a single traffic violation or penalty record. */
export const ViolationItemCard: React.FC<ViolationItemCardProps> = ({
  item,
  colors,
  isDarkMode,
  isRTL,
  t,
  lang,
}) => {
  const rowDir = isRTL ? 'row-reverse' : 'row';
  const badge = getViolationStatusBadge(item.status, isDarkMode, t);

  return (
    <View style={[styles.violationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.violationCardHeader, { flexDirection: rowDir }]}>
        <View style={[styles.numberGroup, { flexDirection: rowDir }]}>
          <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.violationNumber, { color: colors.textPrimary }]}>
            #{item.violation_number || item.id.substring(0, 8)}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border, flexDirection: rowDir }]}>
          <Ionicons name={badge.icon} size={13} color={badge.text} />
          <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>

      <View style={[styles.violationBodyRow, { flexDirection: rowDir }]}>
        <View style={styles.reasonCol}>
          <Text style={[styles.reasonTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            {item.reason || 'مخالفة مرورية'}
          </Text>
          <View style={[styles.metaRow, { flexDirection: rowDir }]}>
            {item.vehicle_plate ? (
              <View
                style={[
                  styles.platePill,
                  { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F3F4F6', flexDirection: rowDir },
                ]}
              >
                <MaterialCommunityIcons name="motorbike" size={14} color={colors.textSecondary} />
                <Text style={[styles.plateText, { color: colors.textPrimary }]}>
                  {formatBikePlateForDisplay(item.vehicle_plate, lang)}
                </Text>
              </View>
            ) : null}
            <View style={[styles.datePill, { flexDirection: rowDir }]}>
              <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
              <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                {formatViolationDate(item.violation_date, lang)}
              </Text>
            </View>
            {item.city ? (
              <View style={[styles.datePill, { flexDirection: rowDir }]}>
                <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
                <Text style={[styles.dateText, { color: colors.textSecondary }]}>{item.city}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={[styles.amountBox, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.12)' : '#FEF2F2' }]}>
          <Text style={styles.amountNumber}>{Number(item.amount || 0).toLocaleString()}</Text>
          <Text style={styles.amountCurrency}>{t.sar || 'ر.س'}</Text>
        </View>
      </View>

      {item.notes ? (
        <View
          style={[
            styles.notesContainer,
            { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.03)' : '#F9FAFB', borderColor: colors.border },
          ]}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.notesText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
            {item.notes}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
