import React, { useState, useRef, useEffect } from 'react';
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
import { PreviewPhotoData, ThemeColors } from '../../types/delegate';
import { profileStyles as styles } from './profileStyles';
import { ProfileDocumentItem } from './profileHelpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.22;

interface ProfileDocumentsDeckProps {
  documents: ProfileDocumentItem[];
  colors: ThemeColors;
  isRTL: boolean;
  t: any;
  setParentScrollEnabled?: (enabled: boolean) => void;
  onPreviewPhoto: (photo: PreviewPhotoData) => void;
}

export const ProfileDocumentsDeck: React.FC<ProfileDocumentsDeckProps> = ({
  documents,
  colors,
  isRTL,
  t,
  setParentScrollEnabled,
  onPreviewPhoto,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const position = useRef(new Animated.ValueXY()).current;
  const docsLengthRef = useRef(documents.length);
  docsLengthRef.current = documents.length;

  useEffect(() => {
    if (documents.length > 0 && currentIndex >= documents.length) {
      setCurrentIndex(0);
    }
  }, [documents.length, currentIndex]);

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
        const isHorizontal = Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2;
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

  const handleCardPress = (doc: ProfileDocumentItem) => {
    if (doc.url) {
      onPreviewPhoto({
        url: doc.url,
        title: doc.title,
        rotate: true,
      });
    }
  };

  return (
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
            {documents.length > 0 ? `${currentIndex + 1} / ${documents.length}` : '0 / 0'}
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
              const docIdx = (currentIndex + i) % total;
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
                    style={[
                      styles.flyingCard,
                      cardStyle,
                      {
                        backgroundColor: colors.card,
                        zIndex: 20,
                      },
                    ]}
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
                          style={[
                            styles.cardDocTitle,
                            { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                          ]}
                          numberOfLines={1}
                        >
                          {item.doc.title}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => handleCardPress(item.doc)}
                      style={styles.cardDirectImageTouch}
                    >
                      <Image
                        source={{ uri: item.doc.url! }}
                        style={styles.cardDirectImage}
                        resizeMode="cover"
                      />
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
                      style={[
                        styles.cardDocTitle,
                        { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' },
                      ]}
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
  );
};
