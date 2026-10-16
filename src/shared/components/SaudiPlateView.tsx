import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  toEnglishDigits,
  getPlateLetterSlots,
  getAlignedDigits,
} from '../utils/plateUtils';

export interface SaudiPlateViewProps {
  digits: string;
  letters: string;
  onChangeDigits?: (val: string) => void;
  onChangeLetters?: (val: string) => void;
  editable?: boolean;
  isDarkMode?: boolean;
  scale?: number;
  onScanPlate?: () => void;
  isScanning?: boolean;
  showScanButton?: boolean;
  showInputsRow?: boolean;
}

export const SaudiPlateView: React.FC<SaudiPlateViewProps> = ({
  digits,
  letters,
  onChangeDigits,
  onChangeLetters,
  editable = true,
  isDarkMode = false,
  scale = 1,
  onScanPlate,
  isScanning = false,
  showScanButton = false,
  showInputsRow = false,
}) => {
  const digitsInputRef = useRef<TextInput>(null);
  const lettersInputRef = useRef<TextInput>(null);

  const englishDigits = toEnglishDigits(digits);
  const { enArray: enDigitsArray, arArray: arDigitsArray } = getAlignedDigits(englishDigits);
  const { leftAr, rightAr, leftEn, rightEn } = getPlateLetterSlots(letters);

  const plateBg = isDarkMode ? '#1e293b' : '#ffffff';
  const borderColor = isDarkMode ? '#64748b' : '#1e293b';
  const textColor = isDarkMode ? '#f8fafc' : '#0f172a';
  const dividerColor = isDarkMode ? '#475569' : '#0f172a';

  return (
    <View style={styles.container}>
      {/* Plate Card */}
      <View
        style={[
          styles.plateCard,
          {
            backgroundColor: plateBg,
            borderColor,
            transform: [{ scale }],
          },
        ]}
      >
        {/* Header Ribbon / Emblem */}
        <View style={[styles.plateHeader, { borderBottomColor: dividerColor }]}>
          <Text style={[styles.headerText, { color: textColor }]}>KSA</Text>
          <View style={styles.headerEmblem}>
            <Text style={[styles.emblemText, { color: textColor }]}>🇸🇦 السعودية</Text>
          </View>
        </View>

        {/* Plate Body: Digits & Letters */}
        <View style={styles.plateBody}>
          {/* Digits Section */}
          <View style={[styles.digitsColumn, { borderRightColor: dividerColor }]}>
            <View style={styles.digitRow}>
              {arDigitsArray.map((d, idx) => (
                <Text key={`ar-${idx}`} style={[styles.digitCellText, { color: textColor }]}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={[styles.innerDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.digitRow}>
              {enDigitsArray.map((d, idx) => (
                <Text key={`en-${idx}`} style={[styles.digitCellTextEn, { color: textColor }]}>
                  {d}
                </Text>
              ))}
            </View>
          </View>

          {/* Letters Section */}
          <View style={styles.lettersColumn}>
            <View style={styles.letterRow}>
              <Text style={[styles.letterText, { color: textColor }]}>{rightAr || '-'}</Text>
              <Text style={[styles.letterText, { color: textColor }]}>{leftAr || '-'}</Text>
            </View>
            <View style={[styles.innerDivider, { backgroundColor: dividerColor }]} />
            <View style={styles.letterRow}>
              <Text style={[styles.letterTextEn, { color: textColor }]}>{rightEn || '-'}</Text>
              <Text style={[styles.letterTextEn, { color: textColor }]}>{leftEn || '-'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Optional Interactive Input Fields */}
      {showInputsRow && editable && (
        <View style={styles.inputsRow}>
          <TextInput
            ref={digitsInputRef}
            style={[styles.inputField, { color: textColor, borderColor }]}
            placeholder="الأرقام (مثال: 1234)"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            value={digits}
            onChangeText={onChangeDigits}
            maxLength={4}
          />
          <TextInput
            ref={lettersInputRef}
            style={[styles.inputField, { color: textColor, borderColor }]}
            placeholder="الحروف (مثال: أ ب)"
            placeholderTextColor="#94a3b8"
            value={letters}
            onChangeText={onChangeLetters}
            maxLength={6}
          />
        </View>
      )}

      {/* Optional OCR Scan Button */}
      {showScanButton && onScanPlate && (
        <TouchableOpacity
          onPress={onScanPlate}
          disabled={isScanning}
          style={styles.scanBtn}
        >
          <Ionicons name="camera-outline" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
          <Text style={styles.scanBtnText}>
            {isScanning ? 'جارٍ مسح اللوحة...' : 'مسح اللوحة بالكاميرا'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  plateCard: {
    width: 280,
    borderWidth: 3,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  plateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomWidth: 1.5,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerEmblem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emblemText: {
    fontSize: 11,
    fontWeight: '700',
  },
  plateBody: {
    flexDirection: 'row',
    height: 72,
  },
  digitsColumn: {
    flex: 1.2,
    borderRightWidth: 1.5,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
  },
  digitRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 6,
  },
  digitCellText: {
    fontSize: 18,
    fontWeight: '800',
  },
  digitCellTextEn: {
    fontSize: 16,
    fontWeight: '800',
  },
  lettersColumn: {
    flex: 1.2,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 4,
  },
  letterRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 12,
  },
  letterText: {
    fontSize: 16,
    fontWeight: '800',
  },
  letterTextEn: {
    fontSize: 15,
    fontWeight: '800',
  },
  innerDivider: {
    width: '85%',
    height: 1,
    opacity: 0.5,
  },
  inputsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 280,
    marginTop: 10,
    gap: 8,
  },
  inputField: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  scanBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
