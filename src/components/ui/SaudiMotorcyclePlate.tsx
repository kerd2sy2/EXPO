import React, { useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import {
  AR_TO_EN_LETTERS,
  EN_TO_AR_LETTERS,
  toArabicDigits,
  toEnglishDigits,
  getPlateLetterSlots,
  convertLettersToBoth,
  getAlignedDigits,
} from '../../shared/utils/plateUtils';
import { saudiMotorcyclePlateStyles as styles } from './saudiMotorcyclePlateStyles';

export {
  AR_TO_EN_LETTERS,
  EN_TO_AR_LETTERS,
  toArabicDigits,
  toEnglishDigits,
  getPlateLetterSlots,
  convertLettersToBoth,
  getAlignedDigits,
};

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

  const englishDigits = toEnglishDigits(digits);
  const { enArray: enDigitsArray, arArray: arDigitsArray, isEmptyDigits } =
    getAlignedDigits(englishDigits);
  const { arSlots, enSlots, isThreeLetters } = getPlateLetterSlots(letters);

  return (
    <View
      style={[
        styles.plateOuterContainer,
        scale !== 1 && { width: 'auto', marginVertical: 2 },
        isDarkMode && styles.plateDarkShadow,
      ]}
    >
      {editable && (
        <>
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
            maxLength={8}
            onChangeText={(val) => {
              onChangeLetters?.(val);
            }}
          />
        </>
      )}

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
            {isScanning
              ? 'جاري قراءة اللوحة والتعرف عليها...'
              : 'مسح لوحة الدباب بالكاميرا (Scan Plate)'}
          </Text>
        </TouchableOpacity>
      )}

      <View
        style={
          scale !== 1
            ? {
                width: Math.round(340 * scale),
                height: Math.round(155 * scale),
                justifyContent: 'center',
                alignItems: 'center',
              }
            : { width: '100%', alignItems: 'center' }
        }
      >
        <View
          style={[
            styles.plateBody,
            scale !== 1 && { width: 340, transform: [{ scale }] },
          ]}
        >
          <View style={[styles.rivetDot, styles.rivetTopLeft]} />
          <View style={[styles.rivetDot, styles.rivetTopRight]} />

          <View style={styles.mainGrid}>
            <View style={styles.gridRow}>
              <TouchableOpacity
                activeOpacity={editable ? 0.7 : 1}
                onPress={() => editable && digitsInputRef.current?.focus()}
                style={[
                  styles.quadrantCell,
                  styles.numbersQuadrant,
                  styles.topCellBorder,
                  styles.verticalDivider,
                ]}
              >
                <View style={styles.alignedRow}>
                  {arDigitsArray.map((d, i) => (
                    <View key={`ar-dig-${i}`} style={styles.alignedDigitSlot}>
                      <Text style={[styles.arabicNumbersText, isEmptyDigits && { opacity: 0.3 }]}>
                        {isEmptyDigits ? '٠' : d}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={editable ? 0.7 : 1}
                onPress={() => editable && lettersInputRef.current?.focus()}
                style={[
                  styles.quadrantCell,
                  styles.lettersQuadrant,
                  isThreeLetters && styles.lettersQuadrantThree,
                  styles.topCellBorder,
                ]}
              >
                <View style={styles.alignedRow}>
                  {arSlots.map((arChar, idx) => (
                    <View key={`ar-let-${idx}`} style={styles.alignedLetterSlot}>
                      <Text
                        style={[
                          styles.arabicLettersText,
                          isThreeLetters && styles.arabicLettersTextThree,
                          !arChar && { opacity: 0.3 },
                        ]}
                      >
                        {arChar || 'ـ'}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.gridRow}>
              <TouchableOpacity
                activeOpacity={editable ? 0.7 : 1}
                onPress={() => editable && digitsInputRef.current?.focus()}
                style={[
                  styles.quadrantCell,
                  styles.numbersQuadrant,
                  styles.bottomCellBorder,
                  styles.verticalDivider,
                ]}
              >
                <View style={styles.alignedRow}>
                  {enDigitsArray.map((d, i) => (
                    <View key={`en-dig-${i}`} style={styles.alignedDigitSlot}>
                      <Text style={[styles.englishNumbersText, isEmptyDigits && { opacity: 0.3 }]}>
                        {isEmptyDigits ? '0' : d}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={editable ? 0.7 : 1}
                onPress={() => editable && lettersInputRef.current?.focus()}
                style={[
                  styles.quadrantCell,
                  styles.lettersQuadrant,
                  isThreeLetters && styles.lettersQuadrantThree,
                  styles.bottomCellBorder,
                ]}
              >
                <View style={styles.alignedRow}>
                  {enSlots.map((enChar, idx) => (
                    <View key={`en-let-${idx}`} style={styles.alignedLetterSlot}>
                      <Text
                        style={[
                          styles.englishLettersText,
                          isThreeLetters && styles.englishLettersTextThree,
                          !enChar && { opacity: 0.3 },
                        ]}
                      >
                        {enChar || '-'}
                      </Text>
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sidebar}>
            <View style={styles.sidebarInnerFrame}>
              <View style={styles.emblemWrap}>
                <ExpoImage
                  source={require('../../../assets/images/saudi_plate_emblem.svg')}
                  style={styles.emblemImage}
                  contentFit="contain"
                />
              </View>

              <Text style={styles.sidebarCountryAr}>السعودية</Text>

              <View style={styles.verticalKSA}>
                <Text style={styles.ksaLetter}>K</Text>
                <Text style={styles.ksaLetter}>S</Text>
                <Text style={styles.ksaLetter}>A</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

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
              placeholder="مثال: د ا أو STA"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              maxLength={8}
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
