import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmployeeProfile, ThemeColors } from '../../types/delegate';

interface QrCodeModalProps {
  visible: boolean;
  employee: EmployeeProfile | null;
  colors: ThemeColors;
  isRTL: boolean;
  t: any;
  onClose: () => void;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  visible,
  employee,
  colors,
  isRTL,
  t,
  onClose,
}) => {
  if (!visible || !employee) return null;

  return (
    <View style={[styles.qrFullScreenModal, { backgroundColor: colors.bg }]}>
      {/* Center: QR Code with zero background container, and large centered logo with square white background */}
      <View style={styles.qrFullScreenCenter}>
        <View style={styles.qrCodeWrapperNoBg}>
          <Image
            source={{
              uri: `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(
                employee.id
              )}&margin=2&ecc=H`,
            }}
            style={styles.qrCodeImageLarge}
            resizeMode="contain"
          />
          {/* Centered Large Logo with Square White Background */}
          <View style={styles.qrSquareWhiteBacking}>
            <Image
              source={require('../../../assets/images/logo.png')}
              style={styles.qrLargeLogo}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      {/* Bottom Prominent Close Button */}
      <View style={styles.qrBottomActionArea}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary, width: '100%' }]}
          onPress={onClose}
        >
          <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="close-circle-outline" size={22} color="#ffffff" />
            <Text style={styles.primaryButtonText}>{t.close}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  qrFullScreenModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    zIndex: 99999,
  },
  qrFullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  qrCodeWrapperNoBg: {
    width: 290,
    height: 290,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodeImageLarge: {
    width: 290,
    height: 290,
  },
  qrSquareWhiteBacking: {
    position: 'absolute',
    width: 68,
    height: 68,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  qrLargeLogo: {
    width: 52,
    height: 52,
  },
  qrBottomActionArea: {
    width: '100%',
    paddingHorizontal: 8,
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
});
