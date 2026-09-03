import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SuccessModalData, EmployeeProfile, ThemeColors, PreviewPhotoData } from '../../types/delegate';

interface SuccessShiftModalProps {
  data: SuccessModalData;
  employee: EmployeeProfile | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: any;
  backdropOpacity: Animated.Value;
  sheetTranslateY: Animated.Value;
  formatTimeStr: (iso?: string) => string;
  onClose: (callback?: () => void) => void;
  onNavigateToTab: (tab: 'home' | 'shift' | 'history' | 'profile') => void;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
}

export const SuccessShiftModal: React.FC<SuccessShiftModalProps> = ({
  data,
  employee,
  colors,
  isDarkMode,
  isRTL,
  t,
  backdropOpacity,
  sheetTranslateY,
  formatTimeStr,
  onClose,
  onNavigateToTab,
  onPreviewPhoto,
}) => {
  return (
    <Animated.View style={[styles.bottomModalBackdrop, { opacity: backdropOpacity }]}>
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        activeOpacity={1}
        onPress={() => onClose()}
      />
      <Animated.View
        style={[
          styles.bottomSuccessModalCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            transform: [{ translateY: sheetTranslateY }],
          },
        ]}
      >
        {/* Drag Handle Indicator */}
        <View style={[styles.bottomDragIndicator, { backgroundColor: isDarkMode ? '#334155' : '#cbd5e1' }]} />

        {/* Close Button at Corner */}
        <TouchableOpacity
          onPress={() => onClose()}
          style={[styles.bottomModalCloseBtn, isRTL ? { left: 16 } : { right: 16 }]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bottomModalScrollContent}
        >
          {/* Clean Icon & Title */}
          <View style={styles.bottomHeaderSection}>
            <View
              style={[
                styles.simpleSuccessIconCircle,
                {
                  backgroundColor:
                    data.type === 'start'
                      ? isDarkMode
                        ? 'rgba(16, 185, 129, 0.15)'
                        : '#ecfdf5'
                      : isDarkMode
                      ? 'rgba(234, 88, 12, 0.15)'
                      : '#fff7ed',
                },
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={44}
                color={data.type === 'start' ? '#10b981' : colors.primary}
              />
            </View>

            {/* Modal Title & Subtitle */}
            <Text style={[styles.bottomModalTitle, { color: colors.textPrimary }]}>
              {data.type === 'start' ? t.shiftStartedSuccessTitle : t.shiftEndedSuccessTitle}
            </Text>
            <Text style={[styles.bottomModalSub, { color: colors.textSecondary }]}>
              {data.type === 'start' ? t.shiftStartedSuccessSub : t.shiftEndedSuccessSub}
            </Text>
          </View>

          {/* Clean Details Container */}
          <View
            style={[
              styles.simpleDetailsBox,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
            ]}
          >
            {/* Employee Name */}
            <View
              style={[
                styles.simpleDetailRow,
                { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View style={[styles.simpleDetailLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="person-outline" size={17} color={colors.primary} />
                <Text style={[styles.simpleDetailLabel, { color: colors.textSecondary }]}>{t.delegate}</Text>
              </View>
              <Text style={[styles.simpleDetailValue, { color: colors.textPrimary }]}>
                {employee?.name || ''}
              </Text>
            </View>

            {/* Motorcycle Plate */}
            <View
              style={[
                styles.simpleDetailRow,
                { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
              ]}
            >
              <View style={[styles.simpleDetailLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <MaterialCommunityIcons name="bike" size={17} color={colors.primary} />
                <Text style={[styles.simpleDetailLabel, { color: colors.textSecondary }]}>{t.assignedBike}</Text>
              </View>
              <Text style={[styles.simpleDetailValue, { color: colors.textPrimary }]}>
                {data.motorcycleNumber || employee?.motorcycle_number || '-'}
              </Text>
            </View>

            {data.type === 'start' ? (
              <>
                {/* Start KM */}
                <View
                  style={[
                    styles.simpleDetailRow,
                    { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={[styles.simpleDetailLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="speedometer-outline" size={17} color="#10b981" />
                    <Text style={[styles.simpleDetailLabel, { color: colors.textSecondary }]}>{t.startKmLabel}</Text>
                  </View>
                  <Text style={[styles.simpleDetailValue, { color: colors.textPrimary }]}>
                    {data.startKm?.toLocaleString() ?? 0} {t.km}
                  </Text>
                </View>

                {/* Start Time */}
                <View
                  style={[
                    styles.simpleDetailRow,
                    { borderBottomWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={[styles.simpleDetailLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="time-outline" size={17} color={colors.primary} />
                    <Text style={[styles.simpleDetailLabel, { color: colors.textSecondary }]}>{t.startTimeLabel}</Text>
                  </View>
                  <Text style={[styles.simpleDetailValue, { color: colors.textPrimary }]}>
                    {formatTimeStr(data.startTime) || 'الآن'}
                  </Text>
                </View>
              </>
            ) : (
              <>
                {/* Distance Traveled */}
                <View
                  style={[
                    styles.simpleDetailRow,
                    { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={[styles.simpleDetailLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="navigate-outline" size={17} color="#10b981" />
                    <Text style={[styles.simpleDetailLabel, { color: colors.textSecondary }]}>{t.distanceTraveled}</Text>
                  </View>
                  <Text style={[styles.simpleDetailValue, { color: '#10b981', fontWeight: '700' }]}>
                    {data.distance ?? 0} {t.km}
                  </Text>
                </View>

                {/* Completed Orders */}
                <View
                  style={[
                    styles.simpleDetailRow,
                    { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={[styles.simpleDetailLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <MaterialCommunityIcons name="package-variant-closed" size={17} color={colors.primary} />
                    <Text style={[styles.simpleDetailLabel, { color: colors.textSecondary }]}>{t.approvedOrders}</Text>
                  </View>
                  <Text style={[styles.simpleDetailValue, { color: colors.primary, fontWeight: '700' }]}>
                    {data.ordersCount ?? 0} {t.ordersUnit}
                  </Text>
                </View>

                {/* Odometer Range */}
                <View
                  style={[
                    styles.simpleDetailRow,
                    { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={[styles.simpleDetailLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="speedometer-outline" size={17} color={colors.textSecondary} />
                    <Text style={[styles.simpleDetailLabel, { color: colors.textSecondary }]}>{t.odometerRange}</Text>
                  </View>
                  <Text style={[styles.simpleDetailValue, { color: colors.textPrimary }]}>
                    {data.startKm} - {data.endKm} {t.km}
                  </Text>
                </View>

                {/* Fuel Cost if any */}
                <View
                  style={[
                    styles.simpleDetailRow,
                    { borderBottomWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={[styles.simpleDetailLabelGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <MaterialCommunityIcons name="gas-station" size={17} color="#eab308" />
                    <Text style={[styles.simpleDetailLabel, { color: colors.textSecondary }]}>{t.fuelCostLabel}</Text>
                  </View>
                  <Text style={[styles.simpleDetailValue, { color: colors.textPrimary }]}>
                    {data.fuelCost ?? 0} {t.sar}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Photo Thumbnail if available */}
          {data.imageUri && (
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.simplePhotoRow,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                  flexDirection: isRTL ? 'row-reverse' : 'row',
                },
              ]}
              onPress={() => {
                if (data.imageUri) {
                  onPreviewPhoto({
                    url: data.imageUri,
                    title:
                      data.type === 'start'
                        ? t.startKmPhotoLabel
                        : t.endKmPhotoLabel,
                  });
                }
              }}
            >
              <Image
                source={{ uri: data.imageUri }}
                style={styles.simplePhotoThumbnail}
                resizeMode="cover"
              />
              <View style={[styles.simplePhotoInfo, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.simplePhotoTitle, { color: colors.textPrimary }]}>
                  {t.odometerPhotoBadge}
                </Text>
                <Text style={[styles.simplePhotoSub, { color: colors.primary }]}>
                  {t.tapToViewPhoto}
                </Text>
              </View>
              <Ionicons name="expand-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}

          {/* Action Buttons */}
          <View style={styles.bottomActionButtonsCol}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={[styles.primaryButton, { backgroundColor: colors.primary, width: '100%' }]}
              onPress={() => {
                onClose(() => {
                  if (data.type === 'start') {
                    onNavigateToTab('home');
                  } else {
                    onNavigateToTab('history');
                  }
                });
              }}
            >
              <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons
                  name={data.type === 'start' ? 'home-outline' : 'list-outline'}
                  size={20}
                  color="#ffffff"
                />
                <Text style={styles.primaryButtonText}>
                  {data.type === 'start' ? t.goToHomeBtn : t.viewHistoryBtn}
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.secondaryOutlineBtn,
                { borderColor: colors.border, width: '100%' },
              ]}
              onPress={() => {
                onClose(() => {
                  if (data.type === 'start') {
                    onNavigateToTab('history');
                  } else {
                    onNavigateToTab('home');
                  }
                });
              }}
            >
              <Text style={[styles.secondaryOutlineBtnText, { color: colors.textPrimary }]}>
                {data.type === 'start' ? t.viewHistoryBtn : t.goToHomeBtn}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bottomModalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  bottomSuccessModalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '90%',
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
  bottomModalScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  bottomHeaderSection: {
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  simpleSuccessIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  bottomModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  bottomModalSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 10,
  },
  simpleDetailsBox: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 14,
  },
  simpleDetailRow: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  simpleDetailLabelGroup: {
    alignItems: 'center',
    gap: 8,
  },
  simpleDetailLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  simpleDetailValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  simplePhotoRow: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  simplePhotoThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#000000',
  },
  simplePhotoInfo: {
    flex: 1,
  },
  simplePhotoTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  simplePhotoSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  bottomActionButtonsCol: {
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonContentRow: {
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryOutlineBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryOutlineBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
