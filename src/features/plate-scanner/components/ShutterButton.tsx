import React from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ShutterButtonProps {
  onPress: () => void;
  isBusy: boolean;
}

export const ShutterButton: React.FC<ShutterButtonProps> = ({ onPress, isBusy }) => {
  return (
    <View style={styles.shutterRow}>
      <TouchableOpacity
        style={[styles.shutterBtn, isBusy && styles.shutterBtnBusy]}
        onPress={onPress}
        disabled={isBusy}
        activeOpacity={0.85}
      >
        {isBusy ? (
          <ActivityIndicator color="#ffffff" size="small" />
        ) : (
          <View style={styles.shutterInnerCircle}>
            <Ionicons name="scan" size={28} color="#ffffff" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  shutterRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  shutterBtn: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    borderWidth: 3,
    borderColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 8,
  },
  shutterBtnBusy: {
    borderColor: '#ea580c',
    backgroundColor: 'rgba(234, 88, 12, 0.2)',
  },
  shutterInnerCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
