import React from 'react';
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../../types/delegate';
import { TargetRulesScreen } from '../../screens/target/TargetRulesScreen';

interface TargetRulesModalProps {
  visible: boolean;
  onClose: () => void;
  colors: ThemeColors;
  isDarkMode?: boolean;
  isRTL?: boolean;
  onOpenTargetSettings?: () => void;
}

export const TargetRulesModal: React.FC<TargetRulesModalProps> = ({
  visible,
  onClose,
  colors,
  isDarkMode = false,
  isRTL = true,
  onOpenTargetSettings,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          <View style={[styles.headerBar, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : '#f1f5f9' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TargetRulesScreen
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            onOpenTargetSettings={onOpenTargetSettings}
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
