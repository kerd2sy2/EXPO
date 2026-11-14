import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { WorkSession, PreviewPhotoData, ThemeColors, Language } from '../../../types/delegate';
import { formatBikePlateForDisplay } from '../../../utils/plateUtils';
import { ModuleErrorBoundary } from '../../ModuleErrorBoundary';
import { shiftDetailsStyles as styles } from './shiftDetailsStyles';

interface ShiftDetailsBodyProps {
  session: WorkSession;
  distance: number;
  isApproved: boolean;
  supervisorName: string;
  startKmPhotoUrl: string | null;
  endKmPhotoUrl: string | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  lang: Language;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
}

/** Scrollable details body displaying KPI metrics, bike plate, supervisor notes, and odometer photos. */
export const ShiftDetailsBody: React.FC<ShiftDetailsBodyProps> = ({
  session,
  distance,
  isApproved,
  supervisorName,
  startKmPhotoUrl,
  endKmPhotoUrl,
  colors,
  isDarkMode,
  isRTL,
  t,
  lang,
  onPreviewPhoto,
}) => {
  const rowDir = isRTL ? 'row-reverse' : 'row';

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <ModuleErrorBoundary moduleName="ShiftDetailsKpis" colors={colors}>
        <View style={[styles.kpiRow, { flexDirection: rowDir }]}>
          <View style={[styles.kpiCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="package-variant-closed" size={18} color={colors.primary} />
            <Text style={[styles.kpiValue, { color: colors.primary }]}>{session.orders_count || 0}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>
              {isApproved ? t.approvedOrders || 'الطلبات المعتمدة' : t.ordersUnit || 'الطلبات'}
            </Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Ionicons name="navigate" size={18} color="#16a34a" />
            <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{distance}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{t.distanceTraveled || 'المسافة (كم)'}</Text>
          </View>

          <View style={[styles.kpiCard, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="gas-station" size={18} color="#d97706" />
            <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{Math.round(Number(session.fuel_cost || 0))}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>{t.fuelCostLabel || 'البنزين (ر.س)'}</Text>
          </View>
        </View>
      </ModuleErrorBoundary>

      <ModuleErrorBoundary moduleName="ShiftDetailsMetrics" colors={colors}>
        <View style={[styles.detailsBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <View style={[styles.detailRow, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
            <View style={[styles.detailLabelGroup, { flexDirection: rowDir }]}>
              <MaterialCommunityIcons name="bike" size={17} color={colors.primary} />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t.assignedBike || 'لوحة الدراجة'}</Text>
            </View>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>{formatBikePlateForDisplay(session.motorcycle_number, lang)}</Text>
          </View>

          <View style={[styles.detailRow, { borderBottomColor: colors.border, flexDirection: rowDir }]}>
            <View style={[styles.detailLabelGroup, { flexDirection: rowDir }]}>
              <Ionicons name="speedometer-outline" size={17} color="#16a34a" />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t.startKmLabel || 'عداد البداية'}</Text>
            </View>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {session.start_km?.toLocaleString()} {t.km || 'كم'}
            </Text>
          </View>

          <View style={[styles.detailRow, { borderBottomWidth: 0, flexDirection: rowDir }]}>
            <View style={[styles.detailLabelGroup, { flexDirection: rowDir }]}>
              <Ionicons name="speedometer-outline" size={17} color="#ef4444" />
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{t.endKmLabel || 'عداد النهاية'}</Text>
            </View>
            <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
              {session.end_km ? `${session.end_km?.toLocaleString()} ${t.km || 'كم'}` : '—'}
            </Text>
          </View>
        </View>
      </ModuleErrorBoundary>

      {(session.is_edited_by_supervisor || session.review_notes) && (
        <View
          style={[
            styles.supervisorBox,
            {
              backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.12)' : '#fef3c7',
              borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#fcd34d',
            },
          ]}
        >
          <View style={[styles.supervisorHeader, { flexDirection: rowDir }]}>
            <MaterialCommunityIcons name="shield-account" size={18} color="#d97706" />
            <Text style={[styles.supervisorTitle, { color: isDarkMode ? '#fbbf24' : '#92400e' }]}>
              {(t.supervisorModifiedNotice || 'تم التعديل بواسطة المشرف ({name})').replace('{name}', supervisorName)}
            </Text>
          </View>

          {session.original_orders_count ? (
            <Text style={[styles.supervisorSubText, { color: isDarkMode ? '#fde68a' : '#b45309', textAlign: isRTL ? 'right' : 'left' }]}>
              {`${t.originalOrdersLabel || 'الطلبات المدخلة'}: ${session.original_orders_count}  ${isRTL ? '←' : '→'}  ${t.approvedOrders || 'المعتمدة'}: ${session.orders_count}`}
            </Text>
          ) : null}

          {session.review_notes ? (
            <Text style={[styles.supervisorNotes, { color: isDarkMode ? '#fef3c7' : '#78350f', textAlign: isRTL ? 'right' : 'left' }]}>
              {session.review_notes}
            </Text>
          ) : null}
        </View>
      )}

      {(startKmPhotoUrl || endKmPhotoUrl) && (
        <ModuleErrorBoundary moduleName="ShiftDetailsPhotos" colors={colors}>
          <View style={styles.photosSection}>
            <View style={[styles.photosRow, { flexDirection: rowDir }]}>
              {startKmPhotoUrl && (
                <TouchableOpacity
                  style={[styles.photoBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={() =>
                    onPreviewPhoto({
                      url: startKmPhotoUrl,
                      title: `${t.startKmPhotoLabel || 'عداد البداية'} (${session.start_km} ${t.km})`,
                    })
                  }
                >
                  <Image source={{ uri: startKmPhotoUrl }} style={styles.photoImg} resizeMode="cover" />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoTag}>{t.startKmLabel || 'البداية'}</Text>
                    <Ionicons name="expand" size={13} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              )}

              {endKmPhotoUrl && (
                <TouchableOpacity
                  style={[styles.photoBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  activeOpacity={0.85}
                  onPress={() =>
                    onPreviewPhoto({
                      url: endKmPhotoUrl,
                      title: `${t.endKmPhotoLabel || 'عداد النهاية'} (${session.end_km} ${t.km})`,
                    })
                  }
                >
                  <Image source={{ uri: endKmPhotoUrl }} style={styles.photoImg} resizeMode="cover" />
                  <View style={styles.photoOverlay}>
                    <Text style={styles.photoTag}>{t.endKmLabel || 'النهاية'}</Text>
                    <Ionicons name="expand" size={13} color="#ffffff" />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ModuleErrorBoundary>
      )}

      {session.notes ? (
        <View style={[styles.notesBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Text style={[styles.notesText, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
            {session.notes}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
};
