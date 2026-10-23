import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';

import { formatImageUrl } from '../../services/api';

interface AhdaImageViewerModalProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

export const AhdaImageViewerModal: React.FC<AhdaImageViewerModalProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);

  if (!imageUrl) return null;
  const fullUri = formatImageUrl(imageUrl) || imageUrl;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.imageViewerBackdrop}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeViewerBtn}
          onPress={onClose}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          activeOpacity={0.8}
        >
          <Ionicons name="close-circle" size={36} color="#ffffff" />
        </TouchableOpacity>

        {/* Loading Indicator */}
        {loading && !loadError && (
          <View style={styles.loaderWrap} pointerEvents="none">
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>جاري تحميل صورة الفاتورة...</Text>
          </View>
        )}

        {/* Error Fallback */}
        {loadError && (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={styles.errorText}>تعذر تحميل صورة الفاتورة</Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setLoadError(false);
                setLoading(true);
              }}
            >
              <Text style={styles.retryBtnText}>إعادة المحاولة</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Fullscreen Image with Hardware Acceleration & Instant Cache */}
        <ExpoImage
          source={{ uri: fullUri }}
          style={[styles.fullscreenImage, loadError && { display: 'none' }]}
          contentFit="contain"
          cachePolicy="memory-disk"
          priority="high"
          transition={150}
          onLoadStart={() => {
            setLoading(true);
            setLoadError(false);
          }}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setLoadError(true);
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeViewerBtn: {
    position: 'absolute',
    top: 50,
    right: 24,
    zIndex: 20,
  },
  loaderWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  loadingText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  errorWrap: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
  },
  errorText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#047857',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  fullscreenImage: {
    width: '95%',
    height: '84%',
  },
});
