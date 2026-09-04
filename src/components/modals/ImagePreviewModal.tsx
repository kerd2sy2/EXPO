import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PreviewPhotoData, ThemeColors } from '../../types/delegate';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImagePreviewModalProps {
  previewPhoto: PreviewPhotoData | null;
  colors: ThemeColors;
  isRTL: boolean;
  onClose: () => void;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  previewPhoto,
  colors,
  isRTL,
  onClose,
}) => {
  if (!previewPhoto) return null;

  const [rotation, setRotation] = useState<number>(previewPhoto?.rotate ? 90 : 0);

  useEffect(() => {
    setRotation(previewPhoto?.rotate ? 90 : 0);
  }, [previewPhoto]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const isRotated = rotation % 180 !== 0;

  return (
    <Modal
      visible={!!previewPhoto}
      transparent={false}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <SafeAreaView style={styles.fullScreenContainer}>
        {/* Floating Top Controls */}
        <View style={[styles.floatingControls, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* Rotate Button */}
          <TouchableOpacity
            onPress={handleRotate}
            style={styles.floatingActionBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="refresh" size={22} color="#ffffff" />
          </TouchableOpacity>

          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.floatingActionBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Full-bleed Vertical Document Viewer Area */}
        <View style={styles.documentViewerArea}>
          <Image
            source={{ uri: previewPhoto.url }}
            style={[
              styles.fullDocumentImage,
              isRotated
                ? {
                    width: SCREEN_HEIGHT,
                    height: SCREEN_WIDTH,
                  }
                : {
                    width: SCREEN_WIDTH,
                    height: SCREEN_HEIGHT,
                  },
              {
                transform: [{ rotate: `${rotation}deg` }],
              },
            ]}
            resizeMode="contain"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  floatingControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 12 : 50,
    justifyContent: 'space-between',
    alignItems: 'center',
    pointerEvents: 'box-none',
  },
  floatingActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  documentViewerArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  fullDocumentImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
});
