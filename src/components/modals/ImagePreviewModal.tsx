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

  return (
    <Modal
      visible={!!previewPhoto}
      transparent={false}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.fullScreenContainer}>
        {/* Top Floating App Bar */}
        <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.headerTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="document-text" size={18} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.topBarTitle,
                  { textAlign: isRTL ? 'right' : 'left' },
                ]}
                numberOfLines={1}
              >
                {previewPhoto.title}
              </Text>
              <Text
                style={[
                  styles.topBarSubtitle,
                  { textAlign: isRTL ? 'right' : 'left' },
                ]}
              >
                {isRTL ? 'معاينة أفقية كاملة للوثيقة الرسمية' : 'Full Document View'}
              </Text>
            </View>
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeIconButton}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Main Document Viewer (Fills the entire 4 quarters of screen) */}
        <View style={styles.documentViewerArea}>
          <Image
            source={{ uri: previewPhoto.url }}
            style={styles.fullDocumentImage}
            resizeMode="contain"
          />
        </View>

        {/* Bottom Floating Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.bottomCloseButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
            <Text style={styles.bottomCloseButtonText}>
              {isRTL ? 'إغلاق المعاينة' : 'Close Preview'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#07090e',
    justifyContent: 'space-between',
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 14,
    backgroundColor: 'rgba(15, 20, 30, 0.94)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 50,
  },
  headerTitleGroup: {
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  topBarSubtitle: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  closeIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
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
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  fullDocumentImage: {
    width: SCREEN_WIDTH - 16,
    height: SCREEN_HEIGHT * 0.72,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: 'rgba(15, 20, 30, 0.94)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
  },
  bottomCloseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 16,
    backgroundColor: '#2563eb',
    gap: 8,
  },
  bottomCloseButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
