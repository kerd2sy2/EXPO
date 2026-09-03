import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Language, ThemeColors } from '../../types/delegate';

interface LanguageModalProps {
  visible: boolean;
  currentLang: Language;
  colors: ThemeColors;
  t: any;
  onSelectLang: (lang: Language) => void;
  onClose: () => void;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({
  visible,
  currentLang,
  colors,
  t,
  onSelectLang,
  onClose,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.modalBackdrop}>
      <View style={[styles.langModalCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.langModalTitle, { color: colors.textPrimary }]}>{t.selectLang}</Text>

        <TouchableOpacity
          style={[styles.langOptionRow, currentLang === 'ar' && { backgroundColor: colors.primaryLight }]}
          onPress={() => onSelectLang('ar')}
        >
          <View style={[styles.langCodeBadge, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.langCodeBadgeText, { color: colors.textPrimary }]}>AR</Text>
          </View>
          <Text style={[styles.langOptionText, { color: colors.textPrimary }]}>العربية (Arabic)</Text>
          {currentLang === 'ar' && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.langOptionRow, currentLang === 'en' && { backgroundColor: colors.primaryLight }]}
          onPress={() => onSelectLang('en')}
        >
          <View style={[styles.langCodeBadge, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.langCodeBadgeText, { color: colors.textPrimary }]}>EN</Text>
          </View>
          <Text style={[styles.langOptionText, { color: colors.textPrimary }]}>English</Text>
          {currentLang === 'en' && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.langOptionRow, currentLang === 'bn' && { backgroundColor: colors.primaryLight }]}
          onPress={() => onSelectLang('bn')}
        >
          <View style={[styles.langCodeBadge, { backgroundColor: colors.inputBg }]}>
            <Text style={[styles.langCodeBadgeText, { color: colors.textPrimary }]}>BN</Text>
          </View>
          <Text style={[styles.langOptionText, { color: colors.textPrimary }]}>বাংলা (Bengali)</Text>
          {currentLang === 'bn' && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelModalBtn, { backgroundColor: colors.inputBg }]}
          onPress={onClose}
        >
          <Text style={[styles.cancelModalText, { color: colors.textSecondary }]}>إلغاء / Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 9999,
  },
  langModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  langModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  langOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  langCodeBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  langCodeBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  langOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'left',
  },
  cancelModalBtn: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelModalText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
