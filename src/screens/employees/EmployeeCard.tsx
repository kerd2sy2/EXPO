import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@shared/theme';
import { SaudiPlateView } from '@shared/components';
import { parsePlateComponents } from '@shared/utils/plateUtils';
import { DelegateWithStatus } from '../../services/supervisor';
import { employeesStyles as styles } from './employeesStyles';

interface EmployeeCardProps {
  employee: DelegateWithStatus;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  onSelect: (emp: DelegateWithStatus) => void;
  onCall: (phone?: string) => void;
  onWhatsApp: (phone?: string) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee: emp,
  colors,
  isDarkMode,
  isRTL,
  onSelect,
  onCall,
  onWhatsApp,
}) => {
  const hasPlate = Boolean(emp.motorcycle_number && emp.motorcycle_number.trim());
  const hasKey = Boolean(emp.key_number && emp.key_number.trim());
  const plateComponents = hasPlate
    ? parsePlateComponents(emp.motorcycle_number || '')
    : { digits: '', letters: '' };

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={() => onSelect(emp)}
      style={[
        styles.employeeCard,
        {
          backgroundColor: colors.card,
          borderColor: emp.is_working ? '#10b98160' : colors.border,
        },
      ]}
    >
      {/* Card Top Row */}
      <View style={[styles.cardTopRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View
          style={[
            styles.keyRankBox,
            {
              backgroundColor: hasKey
                ? isDarkMode
                  ? 'rgba(245, 158, 11, 0.16)'
                  : '#fffbeb'
                : isDarkMode
                ? '#1e293b'
                : '#f1f5f9',
              borderColor: hasKey ? '#f59e0b60' : colors.border,
            },
          ]}
        >
          <Ionicons name="key" size={13} color={hasKey ? '#d97706' : colors.textSecondary} />
          <Text
            style={[
              styles.keyRankNumber,
              { color: hasKey ? '#d97706' : colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {hasKey ? emp.key_number : '--'}
          </Text>
        </View>

        <View style={[styles.empInfoCol, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text
            style={[
              styles.empName,
              { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
            ]}
            numberOfLines={1}
          >
            {emp.name}
          </Text>

          <View style={[styles.badgeRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={[styles.roleBadge, { backgroundColor: '#0284c718' }]}>
              <Text style={[styles.roleBadgeText, { color: '#0284c7' }]}>مندوب</Text>
            </View>

            {emp.is_working && (
              <View
                style={[styles.workingBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <View style={styles.workingDot} />
                <Text style={styles.workingBadgeText}>في الميدان</Text>
              </View>
            )}

            {(!!emp.application_id || !!emp.application_type) && (
              <View
                style={[styles.appBadge, { backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }]}
              >
                <Text style={[styles.appBadgeText, { color: colors.textSecondary }]}>
                  {emp.application_type ? `${emp.application_type} ` : ''}
                  {emp.application_id ? `(${emp.application_id})` : ''}
                </Text>
              </View>
            )}

            {!!emp.branch_name && (
              <View style={[styles.appBadge, { backgroundColor: '#0284c718' }]}>
                <Text style={[styles.appBadgeText, { color: '#0284c7', fontWeight: '700' }]}>
                  {emp.branch_name}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.quickActionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {!!emp.phone && (
            <>
              <TouchableOpacity
                style={[styles.iconActionBtn, { backgroundColor: '#10b98115' }]}
                onPress={() => onCall(emp.phone)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="call" size={15} color="#10b981" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.iconActionBtn, { backgroundColor: '#25D36615' }]}
                onPress={() => onWhatsApp(emp.phone)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="logo-whatsapp" size={15} color="#25D366" />
              </TouchableOpacity>
            </>
          )}
          <View style={[styles.openPagePill, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={16}
              color={colors.primary}
            />
          </View>
        </View>
      </View>

      {/* Compact Footer Strip */}
      <View
        style={[
          styles.cardBottomStrip,
          {
            backgroundColor: isDarkMode ? '#1e293b90' : '#f8fafc',
            borderColor: colors.border,
            flexDirection: isRTL ? 'row-reverse' : 'row',
          },
        ]}
      >
        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start', gap: 4 }}>
          <View style={[styles.metaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="card-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              الهوية:{' '}
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {emp.national_id || '---'}
              </Text>
            </Text>
          </View>
          <View style={[styles.metaItem, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="call-outline" size={13} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>
              الجوال:{' '}
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                {emp.phone || '---'}
              </Text>
            </Text>
          </View>
        </View>

        {hasPlate ? (
          <SaudiPlateView
            digits={plateComponents.digits}
            letters={plateComponents.letters}
            editable={false}
            scale={0.42}
            isDarkMode={isDarkMode}
          />
        ) : (
          <View style={[styles.noPlatePill, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
            <Text style={styles.noPlateText}>بدون لوحة</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};
