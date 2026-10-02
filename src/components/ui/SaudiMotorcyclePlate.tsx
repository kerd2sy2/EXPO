import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  I18nManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SaudiMotorcyclePlateProps {
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

import {
  AR_TO_EN_LETTERS,
  EN_TO_AR_LETTERS,
  toArabicDigits,
  toEnglishDigits,
  getPlateLetterSlots,
  convertLettersToBoth,
  getAlignedDigits,
} from '../../utils/plateUtils';

export {
  AR_TO_EN_LETTERS,
  EN_TO_AR_LETTERS,
  toArabicDigits,
  toEnglishDigits,
  getPlateLetterSlots,
  convertLettersToBoth,
  getAlignedDigits,
};


export const SaudiMotorcyclePlate: React.FC<SaudiMotorcyclePlateProps> = ({
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

  const isRTL = I18nManager.isRTL;
  const rowFlexDir = isRTL ? 'row-reverse' : 'row';

  const englishDigits = toEnglishDigits(digits);
  const { enArray: enDigitsArray, arArray: arDigitsArray, isEmptyDigits } = getAlignedDigits(englishDigits);
  const { leftAr, rightAr, leftEn, rightEn } = getPlateLetterSlots(letters);

  return (
    <View style={[styles.plateOuterContainer, isDarkMode && styles.plateDarkShadow]}>
      {/* Hidden inputs to allow direct tapping on the plate to type if editable */}
      <TextInput
        ref={digitsInputRef}
        style={styles.hiddenInput}
        value={englishDigits}
        keyboardType="numeric"
        maxLength={4}
        onChangeText={(val) => {
          const clean = toEnglishDigits(val).replace(/\D/g, '');
          onChangeDigits?.(clean);
          if (clean.length >= 4) {
            lettersInputRef.current?.focus();
          }
        }}
      />
      <TextInput
        ref={lettersInputRef}
        style={styles.hiddenInput}
        value={letters}
        autoCapitalize="characters"
        maxLength={6}
        onChangeText={(val) => {
          onChangeLetters?.(val);
        }}
      />

      {/* Smart Plate Camera Scan Action Bar (Opt-in) */}
      {showScanButton && editable && onScanPlate && (
        <TouchableOpacity
          style={[
            styles.scanButton,
            {
              backgroundColor: isDarkMode ? '#1e293b' : '#f0fdf4',
              borderColor: isDarkMode ? '#334155' : '#86efac',
            },
          ]}
          onPress={onScanPlate}
          disabled={isScanning}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isScanning ? 'hourglass-outline' : 'scan-outline'}
            size={18}
            color={isDarkMode ? '#4ade80' : '#16a34a'}
          />
          <Text
            style={[
              styles.scanButtonText,
              { color: isDarkMode ? '#4ade80' : '#16a34a' },
            ]}
          >
            {isScanning ? 'جاري قراءة اللوحة والتعرف عليها...' : 'مسح لوحة الدباب بالكاميرا (Scan Plate)'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Authentic Saudi Motorcycle Plate Body (Clean without hole rivets) */}
      <View style={[styles.plateBody, { flexDirection: rowFlexDir }, scale !== 1 && { transform: [{ scale }] }]}>
        {/* Main Grid Area (4 Quadrants with 1:1 Aligned Columns) */}
        <View style={styles.mainGrid}>
          {/* Top Row: Arabic Numbers (Left) & Arabic Letters (Right) */}
          <View style={[styles.gridRow, { flexDirection: rowFlexDir }]}>
            {/* Top-Left: Arabic Numbers */}
            <TouchableOpacity
              activeOpacity={editable ? 0.7 : 1}
              onPress={() => editable && digitsInputRef.current?.focus()}
              style={[
                styles.quadrantCell,
                styles.numbersQuadrant,
                styles.topCellBorder,
                isRTL ? { borderLeftWidth: 1.5, borderRightWidth: 0 } : { borderRightWidth: 1.5, borderLeftWidth: 0 },
              ]}
            >
              <View style={[styles.alignedRow, { flexDirection: rowFlexDir }]}>
                {arDigitsArray.map((d, i) => (
                  <View key={`ar-dig-${i}`} style={styles.alignedDigitSlot}>
                    <Text style={[styles.arabicNumbersText, isEmptyDigits && { opacity: 0.3 }]}>
                      {isEmptyDigits ? '٠' : d}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            {/* Top-Right: Arabic Letters */}
            <TouchableOpacity
              activeOpacity={editable ? 0.7 : 1}
              onPress={() => editable && lettersInputRef.current?.focus()}
              style={[styles.quadrantCell, styles.lettersQuadrant, styles.topCellBorder]}
            >
              <View style={[styles.alignedRow, { flexDirection: rowFlexDir }]}>
                <View style={styles.alignedLetterSlot}>
                  <Text style={[styles.arabicLettersText, !leftAr && { opacity: 0.3 }]}>
                    {leftAr || 'ـ'}
                  </Text>
                </View>
                <View style={styles.alignedLetterSlot}>
                  <Text style={[styles.arabicLettersText, !rightAr && { opacity: 0.3 }]}>
                    {rightAr || 'ـ'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* Bottom Row: English Numbers (Left) & English Letters (Right) */}
          <View style={[styles.gridRow, { flexDirection: rowFlexDir }]}>
            {/* Bottom-Left: English Numbers */}
            <TouchableOpacity
              activeOpacity={editable ? 0.7 : 1}
              onPress={() => editable && digitsInputRef.current?.focus()}
              style={[
                styles.quadrantCell,
                styles.numbersQuadrant,
                styles.bottomCellBorder,
                isRTL ? { borderLeftWidth: 1.5, borderRightWidth: 0 } : { borderRightWidth: 1.5, borderLeftWidth: 0 },
              ]}
            >
              <View style={[styles.alignedRow, { flexDirection: rowFlexDir }]}>
                {enDigitsArray.map((d, i) => (
                  <View key={`en-dig-${i}`} style={styles.alignedDigitSlot}>
                    <Text style={[styles.englishNumbersText, isEmptyDigits && { opacity: 0.3 }]}>
                      {isEmptyDigits ? '0' : d}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>

            {/* Bottom-Right: English Letters */}
            <TouchableOpacity
              activeOpacity={editable ? 0.7 : 1}
              onPress={() => editable && lettersInputRef.current?.focus()}
              style={[styles.quadrantCell, styles.lettersQuadrant, styles.bottomCellBorder]}
            >
              <View style={[styles.alignedRow, { flexDirection: rowFlexDir }]}>
                <View style={styles.alignedLetterSlot}>
                  <Text style={[styles.englishLettersText, !leftEn && { opacity: 0.3 }]}>
                    {leftEn || '-'}
                  </Text>
                </View>
                <View style={styles.alignedLetterSlot}>
                  <Text style={[styles.englishLettersText, !rightEn && { opacity: 0.3 }]}>
                    {rightEn || '-'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Sidebar: Emblem, 'السعودية', 'K S A' */}
        <View
          style={[
            styles.sidebar,
            isRTL
              ? { borderRightWidth: 2.5, borderRightColor: '#1e293b', borderLeftWidth: 0 }
              : { borderLeftWidth: 2.5, borderLeftColor: '#1e293b', borderRightWidth: 0 },
          ]}
        >
          {/* Saudi Palm & Crossed Swords Emblem */}
          <View style={styles.emblemWrap}>
            <Ionicons name="leaf" size={13} color="#1e3a29" style={{ transform: [{ rotate: '45deg' }] }} />
            <View style={styles.swordsLine} />
          </View>

          {/* Arabic Country Text */}
          <Text style={styles.sidebarCountryAr}>السعودية</Text>

          {/* Vertical K S A */}
          <View style={styles.verticalKSA}>
            <Text style={styles.ksaLetter}>K</Text>
            <Text style={styles.ksaLetter}>S</Text>
            <Text style={styles.ksaLetter}>A</Text>
          </View>
        </View>
      </View>

      {/* Dual Inputs Row below plate (Only when explicit showInputsRow is true) */}
      {showInputsRow && editable && (
        <View style={styles.inputsRow}>
          <View style={styles.inputItem}>
            <Text style={[styles.inputHelperLabel, { color: isDarkMode ? '#cbd5e1' : '#475569' }]}>
              أرقام اللوحة (Numbers):
            </Text>
            <TextInput
              ref={digitsInputRef}
              style={[
                styles.nativeTextInput,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  color: isDarkMode ? '#ffffff' : '#0f172a',
                  borderColor: isDarkMode ? '#475569' : '#cbd5e1',
                },
              ]}
              value={englishDigits}
              placeholder="مثال: 6534"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              maxLength={4}
              onChangeText={(val) => {
                const clean = toEnglishDigits(val).replace(/\D/g, '');
                onChangeDigits?.(clean);
                if (clean.length >= 4) {
                  lettersInputRef.current?.focus();
                }
              }}
              returnKeyType="next"
              onSubmitEditing={() => lettersInputRef.current?.focus()}
            />
          </View>

          <View style={styles.inputItem}>
            <Text style={[styles.inputHelperLabel, { color: isDarkMode ? '#cbd5e1' : '#475569' }]}>
              حروف اللوحة (Letters):
            </Text>
            <TextInput
              ref={lettersInputRef}
              style={[
                styles.nativeTextInput,
                {
                  backgroundColor: isDarkMode ? '#1e293b' : '#f8fafc',
                  color: isDarkMode ? '#ffffff' : '#0f172a',
                  borderColor: isDarkMode ? '#475569' : '#cbd5e1',
                },
              ]}
              value={letters}
              placeholder="مثال: د ا أو AD"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              maxLength={6}
              onChangeText={(val) => {
                onChangeLetters?.(val);
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  plateOuterContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 8,
  },
  plateDarkShadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
  },
  plateBody: {
    width: '100%',
    maxWidth: 340,
    height: 155,
    backgroundColor: '#fdfdfd',
    borderRadius: 14,
    borderWidth: 3.5,
    borderColor: '#1e293b',
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  rivetDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#cbd5e1',
    borderWidth: 1.2,
    borderColor: '#64748b',
    zIndex: 10,
  },
  rivetTopLeft: {
    top: 6,
    left: 8,
  },
  rivetTopRight: {
    top: 6,
    right: 54,
  },
  mainGrid: {
    flex: 1,
    flexDirection: 'column',
  },
  gridRow: {
    flex: 1,
    flexDirection: 'row',
  },
  quadrantCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  numbersQuadrant: {
    flex: 1.35,
  },
  lettersQuadrant: {
    flex: 1,
  },
  topCellBorder: {
    borderTopWidth: 0,
    borderBottomWidth: 1.5,
    backgroundColor: '#f8fafc',
  },
  bottomCellBorder: {
    borderTopWidth: 0,
    borderBottomWidth: 0,
    backgroundColor: '#ffffff',
  },
  alignedRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  alignedDigitSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alignedLetterSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arabicNumbersText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
  },
  arabicLettersText: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
  },
  englishNumbersText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  englishLettersText: {
    fontSize: 27,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  /* Right Sidebar (KSA) */
  sidebar: {
    width: 48,
    borderLeftWidth: 2.5,
    borderLeftColor: '#1e293b',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  emblemWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  swordsLine: {
    width: 14,
    height: 1.5,
    backgroundColor: '#1e3a29',
    marginTop: -2,
  },
  sidebarCountryAr: {
    fontSize: 9.5,
    fontWeight: '900',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  verticalKSA: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  ksaLetter: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
    lineHeight: 15,
  },
  /* Inputs Row below plate */
  inputsRow: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 10,
  },
  inputItem: {
    flex: 1,
  },
  inputHelperLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 5,
    textAlign: 'right',
  },
  nativeTextInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  scanButton: {
    width: '100%',
    maxWidth: 340,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.2,
    marginBottom: 10,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
