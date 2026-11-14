import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeColors, Language } from '../../types/delegate';
import { DelegateViolation } from '../../services/api';
import { formatBikePlateForDisplay } from '../../utils/plateUtils';
import {
  formatViolationDate,
  getViolationStatusBadge,
  isPenaltyViolation,
} from './violationsHelpers';
import { violationsStyles as styles } from './violationsStyles';

interface ViolationCardProps {
  item: DelegateViolation;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  lang: Language;
}

export const ViolationCard: React.FC<ViolationCardProps> = ({
  item,
  colors,
  isDarkMode,
  isRTL,
  t,
  lang,
}) => {
  const badge = getViolationStatusBadge(item.status, isDarkMode, t);
  const paid =
    item.paid_amount !== undefined
      ? item.paid_amount
      : item.status === 'DEDUCTED' || item.status === 'PAID'
      ? item.amount
      : 0;
  const remaining = Math.max(0, item.amount - paid);
  const progressPct =
    item.amount > 0 ? Math.min(100, Math.round((paid / item.amount) * 100)) : 0;
  const isPenalty = isPenaltyViolation(item.reason);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isPenalty
            ? isDarkMode
              ? 'rgba(245, 158, 11, 0.3)'
              : '#FDE68A'
            : colors.border,
        },
      ]}
    >
      {/* Header: Reason & Status */}
      <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.reasonWrap, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons
            name={isPenalty ? 'alert-circle' : 'warning-outline'}
            size={18}
            color={isPenalty ? '#F59E0B' : '#EF4444'}
            style={{ marginHorizontal: 2 }}
          />
          <Text
            style={[
              styles.reasonText,
              { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
            ]}
            numberOfLines={1}
          >
            {item.reason || (isPenalty ? 'جزاء إداري' : 'مخالفة مرورية')}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: badge.bg,
              borderColor: badge.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name={badge.icon} size={12} color={badge.text} />
          <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Sub Row: Plate & Date */}
      <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {item.vehicle_plate ? (
          <View
            style={[
              styles.platePill,
              {
                backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                flexDirection: isRTL ? 'row-reverse' : 'row',
              },
            ]}
          >
            <MaterialCommunityIcons name="motorbike" size={13} color={colors.textSecondary} />
            <Text style={[styles.plateText, { color: colors.textPrimary }]}>
              {formatBikePlateForDisplay(item.vehicle_plate, lang)}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.metaDate, { color: colors.textSecondary }]}>
          {formatViolationDate(item.violation_date, lang)}
        </Text>

        {item.violation_number ? (
          <Text style={[styles.violationRef, { color: colors.textSecondary }]}>
            #{item.violation_number}
          </Text>
        ) : null}
      </View>

      {/* Amount Details Box */}
      <View
        style={[
          styles.amountBox,
          {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.025)' : '#F8FAFC',
            borderColor: colors.border,
          },
        ]}
      >
        <View style={[styles.amountRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.amountCol}>
            <Text style={[styles.amountLabel, { color: colors.textSecondary }]}>
              {t.violationAmountLabel || 'المبلغ'}
            </Text>
            <Text style={[styles.amountVal, { color: colors.textPrimary }]}>
              {Number(item.amount || 0).toLocaleString()} {t.sar || 'ر.س'}
            </Text>
          </View>

          <View style={styles.amountCol}>
            <Text style={[styles.amountLabel, { color: '#10B981' }]}>
              {t.violationDeductedLabel || 'المخصوم'}
            </Text>
            <Text style={[styles.amountVal, { color: '#10B981' }]}>
              {Number(paid).toLocaleString()} {t.sar || 'ر.س'}
            </Text>
          </View>

          <View style={styles.amountCol}>
            <Text
              style={[
                styles.amountLabel,
                { color: remaining > 0 ? '#F59E0B' : '#10B981' },
              ]}
            >
              {t.violationRemainingLabel || 'المتبقي'}
            </Text>
            <Text
              style={[
                styles.amountVal,
                { color: remaining > 0 ? '#F59E0B' : '#10B981' },
              ]}
            >
              {Number(remaining).toLocaleString()} {t.sar || 'ر.س'}
            </Text>
          </View>
        </View>

        {item.amount > 0 && remaining > 0 && paid > 0 ? (
          <View style={styles.progressWrap}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#E2E8F0' },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPct}%`, backgroundColor: '#10B981' },
                ]}
              />
            </View>
          </View>
        ) : null}
      </View>

      {item.notes ? (
        <View
          style={[
            styles.notesBox,
            {
              backgroundColor: isDarkMode ? 'rgba(255,255,255,0.02)' : '#F8FAFC',
              borderColor: colors.border,
              flexDirection: isRTL ? 'row-reverse' : 'row',
            },
          ]}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={colors.textSecondary} />
          <Text
            style={[
              styles.notesText,
              { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
            ]}
            numberOfLines={2}
          >
            {item.notes}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
