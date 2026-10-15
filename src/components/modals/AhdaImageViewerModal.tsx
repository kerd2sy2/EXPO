import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  if (!imageUrl) return null;
  const fullUri = formatImageUrl(imageUrl) || imageUrl;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.imageViewerBackdrop}>
        <TouchableOpacity style={styles.closeViewerBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Ionicons name="close-circle" size={34} color="#ffffff" />
        </TouchableOpacity>
        <Image source={{ uri: fullUri }} style={styles.fullscreenImage} resizeMode="contain" />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  imageViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeViewerBtn: {
    position: 'absolute',
    top: 50,
    right: 24,
    zIndex: 10,
  },
  fullscreenImage: {
    width: '94%',
    height: '80%',
  },
});
