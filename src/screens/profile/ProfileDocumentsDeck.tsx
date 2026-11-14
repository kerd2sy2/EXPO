import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { EmployeeProfile, ThemeColors, PreviewPhotoData } from '../../types/delegate';
import { API_BASE_URL } from '../../services/api';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { profileScreenStyles as styles } from './profileScreenStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.22;

const formatDocUrl = (url?: string): string | null => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const cleanUrl = url.replace(/^\/+/, '');
  if (cleanUrl.startsWith('uploads/')) {
    return `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/${cleanUrl}`;
  }
  return `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/uploads/${cleanUrl}`;
};

interface ProfileDocumentsDeckProps {
  employee: EmployeeProfile;
  activeBikeNumber: string;
  currentVehicleRegImage?: string | null;
  colors: ThemeColors;
  isRTL: boolean;
  t: any;
  setParentScrollEnabled?: (enabled: boolean) => void;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
}

export const ProfileDocumentsDeck: React.FC<ProfileDocumentsDeckProps> = React.memo(({
  employee,
  activeBikeNumber,
  currentVehicleRegImage,
  colors,
  isRTL,
  t,
  setParentScrollEnabled,
  onPreviewPhoto,
}) => {
  const documents = useMemo(() => {
    const allDocs = [
      {
        id: 'national_id',
        title: t.idAndIqamaPhoto || 'صورة الهوية / الإقامة',
        icon: 'card-outline' as const,
        iconFamily: 'ion',
        accentColor: '#3b82f6',
        badgeColor: 'rgba(59, 130, 246, 0.15)',
        url: formatDocUrl(employee.national_id_image),
      },
      {
        id: 'driving_license',
        title: t.drivingLicensePhoto || 'صورة رخصة القيادة',
        icon: 'card-account-details-outline' as const,
        iconFamily: 'material',
        accentColor: '#10b981',
        badgeColor: 'rgba(16, 185, 129, 0.15)',
        url: formatDocUrl(employee.driving_license_image),
      },
      {
        id: 'vehicle_registration',
        title: activeBikeNumber
          ? `${t.vehicleRegistrationPhoto || 'صورة استمارة الدباب'} (${activeBikeNumber})`
          : t.vehicleRegistrationPhoto || 'صورة رخصة الدباب (الاستمارة)',
        icon: 'file-document-outline' as const,
        iconFamily: 'material',
        accentColor: '#f59e0b',
        badgeColor: 'rgba(245, 158, 11, 0.15)',
        url: formatDocUrl(currentVehicleRegImage || undefined),
      },
      {
        id: 'passport',
        title: t.passportPhoto || 'صورة جواز السفر',
        icon: 'passport' as const,
        iconFamily: 'material',
        accentColor: '#8b5cf6',
        badgeColor: 'rgba(139, 92, 246, 0.15)',
        url: formatDocUrl(employee.passport_image),
      },
    ];
    return allDocs.filter((doc) => Boolean(doc.url));
  }, [
    employee.national_id_image,
    employee.driving_license_image,
    employee.passport_image,
    currentVehicleRegImage,
    activeBikeNumber,
    t,
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const docsLengthRef = useRef(documents.length);
  docsLengthRef.current = documents.length;

  const position = useRef(new Animated.ValueXY()).current;

  const onSwipeComplete = (direction: 'right' | 'left') => {
    position.setValue({ x: 0, y: 0 });
    const len = docsLengthRef.current;
    if (len > 0) {
      if (direction === 'left') {
        setCurrentIndex((prev) => (prev + 1) % len);
      } else {
        setCurrentIndex((prev) => (prev - 1 + len) % len);
      }
    }
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 6,
      tension: 45,
      useNativeDriver: false,
    }).start(() => {
      setParentScrollEnabled?.(true);
    });
  };

  const forceSwipe = (direction: 'right' | 'left') => {
    const x = direction === 'right' ? SCREEN_WIDTH + 80 : -SCREEN_WIDTH - 80;
    Animated.timing(position, {
      toValue: { x, y: 15 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      setParentScrollEnabled?.(true);
      onSwipeComplete(direction);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        const isHorizontal = Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy);
        if (isHorizontal) {
          setParentScrollEnabled?.(false);
        }
        return isHorizontal;
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        const isHorizontal =
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2;
        if (isHorizontal) {
          setParentScrollEnabled?.(false);
        }
        return isHorizontal;
      },
      onPanResponderGrant: () => {
        setParentScrollEnabled?.(false);
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy * 0.08 });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {
        setParentScrollEnabled?.(true);
        resetPosition();
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
    outputRange: ['-22deg', '0deg', '22deg'],
  });

  const cardStyle: any = {
    transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }],
  };

  const safeIdx = documents.length > 0 ? currentIndex % documents.length : 0;

  return (
    <ModuleErrorBoundary moduleName="الوثائق والمستندات" colors={colors}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.sectionHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.titleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="documents-outline" size={20} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {t.officialDocuments || 'الوثائق والمستندات الرسمية'}
            </Text>
          </View>

          <View style={[styles.counterBadge, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Text style={[styles.counterBadgeText, { color: colors.primaryText }]}>
              {documents.length > 0 ? `${safeIdx + 1} / ${documents.length}` : '0 / 0'}
            </Text>
          </View>
        </View>

        {documents.length > 0 ? (
          <View style={styles.deckContainer}>
            {(() => {
              const deckItems = [];
              const total = documents.length;
              const maxStack = Math.min(total, 3);
              for (let i = 0; i < maxStack; i++) {
                const docIdx = (safeIdx + i) % total;
                deckItems.push({
                  doc: documents[docIdx],
                  depthIndex: i,
                  isFront: i === 0,
                });
              }
              return deckItems.reverse().map((item) => {
                if (item.isFront) {
                  return (
                    <Animated.View
                      key={`front-${item.doc.id}`}
                      {...panResponder.panHandlers}
                      style={[styles.flyingCard, cardStyle, { backgroundColor: colors.card, zIndex: 20 }]}
                    >
                      <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <View style={[styles.cardIconBadge, { backgroundColor: item.doc.badgeColor }]}>
                          {item.doc.iconFamily === 'ion' ? (
                            <Ionicons name={item.doc.icon as any} size={20} color={item.doc.accentColor} />
                          ) : (
                            <MaterialCommunityIcons name={item.doc.icon as any} size={20} color={item.doc.accentColor} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.cardDocTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                            numberOfLines={1}
                          >
                            {item.doc.title}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.9}
                        onPress={() => {
                          if (item.doc.url) {
                            onPreviewPhoto({ url: item.doc.url, title: item.doc.title, rotate: true });
                          }
                        }}
                        style={styles.cardDirectImageTouch}
                      >
                        <Image source={{ uri: item.doc.url! }} style={styles.cardDirectImage} resizeMode="cover" />
                      </TouchableOpacity>
                    </Animated.View>
                  );
                }

                const scale = 1 - item.depthIndex * 0.04;
                const translateY = item.depthIndex * 12;
                const opacity = 1 - item.depthIndex * 0.22;
                return (
                  <View
                    key={`stack-${item.doc.id}-${item.depthIndex}`}
                    style={[
                      styles.flyingCard,
                      styles.backgroundDeckCard,
                      {
                        backgroundColor: colors.card,
                        transform: [{ translateY }, { scale }],
                        opacity,
                        zIndex: 10 - item.depthIndex,
                      },
                    ]}
                  >
                    <View style={[styles.cardAccentBar, { backgroundColor: item.doc.accentColor }]} />
                    <View style={[styles.cardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[styles.cardIconBadge, { backgroundColor: item.doc.badgeColor }]}>
                        {item.doc.iconFamily === 'ion' ? (
                          <Ionicons name={item.doc.icon as any} size={18} color={item.doc.accentColor} />
                        ) : (
                          <MaterialCommunityIcons name={item.doc.icon as any} size={18} color={item.doc.accentColor} />
                        )}
                      </View>
                      <Text
                        style={[styles.cardDocTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                        numberOfLines={1}
                      >
                        {item.doc.title}
                      </Text>
                    </View>
                  </View>
                );
              });
            })()}
          </View>
        ) : (
          <View style={[styles.cardEmptyPlaceholder, { borderColor: colors.border, height: 140, marginTop: 8 }]}>
            <Ionicons name="document-text-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              {t.noDocumentPhoto || 'لا توجد وثائق مرفقة حالياً'}
            </Text>
          </View>
        )}
      </View>
    </ModuleErrorBoundary>
  );
});
