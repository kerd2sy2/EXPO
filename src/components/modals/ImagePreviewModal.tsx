import React from 'react';
import {
  Modal,
  View,
  Text,
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

  // Ensure any attached employee name or hyphen is removed from header
  const cleanTitle = previewPhoto.title ? previewPhoto.title.split(' - ')[0].trim() : '';

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
        {/* Floating Top App Bar (Does not occupy layout space, allowing full vertical image expansion) */}
        <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.headerTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="document-text" size={18} color="#ffffff" />
            </View>
            {cleanTitle ? (
              <Text
                style={[
                  styles.topBarTitle,
                  { textAlign: isRTL ? 'right' : 'left' },
                ]}
                numberOfLines={1}
              >
                {cleanTitle}
              </Text>
            ) : null}
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeIconButton}
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
            style={styles.fullDocumentImage}
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
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 12 : 50,
    paddingBottom: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleGroup: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.6)',
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  closeIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
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
