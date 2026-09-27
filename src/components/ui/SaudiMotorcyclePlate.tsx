import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
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

const AR_TO_EN_LETTERS: Record<string, string> = {
  'أ': 'A', 'ا': 'A', 'إ': 'A', 'آ': 'A',
  'ب': 'B',
  'ح': 'J',
  'د': 'D', 'ذ': 'D',
  'ر': 'R', 'ز': 'R',
  'س': 'S', 'ش': 'S',
  'ص': 'X', 'ض': 'X',
  'ط': 'T', 'ظ': 'T',
  'ع': 'E', 'غ': 'E',
  'ق': 'G', 'ف': 'G',
  'ك': 'K',
  'ل': 'L',
  'م': 'Z',
  'ن': 'N',
  'هـ': 'H', 'ه': 'H', 'ة': 'H',
  'و': 'U',
  'ى': 'V', 'ي': 'V', 'ئ': 'V',
};

const EN_TO_AR_LETTERS: Record<string, string> = {
  'A': 'أ',
  'B': 'ب',
  'J': 'ح',
  'D': 'د',
  'R': 'ر',
  'S': 'س',
  'X': 'ص',
  'T': 'ط',
  'E': 'ع',
  'G': 'ق',
  'K': 'ك',
  'L': 'ل',
  'Z': 'م',
  'M': 'م',
  'N': 'ن',
  'H': 'هـ',
  'U': 'و',
  'V': 'ى',
  'Y': 'ى',
};

export const toArabicDigits = (numStr: string): string => {
  const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return (numStr || '').replace(/[0-9]/g, (d) => ar[parseInt(d, 10)] || d);
};

export const toEnglishDigits = (numStr: string): string => {
  const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return (numStr || '').replace(/[٠-٩]/g, (w) => `${ar.indexOf(w)}`);
};

export const convertLettersToBoth = (input: string): { ar: string; en: string } => {
  const clean = (input || '').trim();
  if (!clean) return { ar: '', en: '' };

  const chars = clean.split('').filter((c) => c !== ' ');
  const isInputArabic = chars.some((c) => AR_TO_EN_LETTERS[c]);

  if (isInputArabic) {
    const arChars = chars.map((c) => (c === 'أ' || c === 'إ' || c === 'آ' ? 'ا' : c));
    const enChars = arChars.map((c) => AR_TO_EN_LETTERS[c] || c);

    let enFormatted = enChars.join(' ');
    if (arChars.length === 2) {
      enFormatted = `${enChars[1]} ${enChars[0]}`;
    }
    return {
      ar: arChars.join('  '),
      en: enFormatted,
    };
  } else {
    const enChars = chars.map((c) => c.toUpperCase());
    const arChars = enChars.map((c) => {
      const ar = EN_TO_AR_LETTERS[c] || c;
      return ar === 'أ' || ar === 'إ' ? 'ا' : ar;
    });

    let arFormatted = arChars.join('  ');
    if (enChars.length === 2) {
      arFormatted = `${arChars[1]}  ${arChars[0]}`;
    }
    return {
      ar: arFormatted,
      en: enChars.join(' '),
    };
  }
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

  const englishDigits = toEnglishDigits(digits);
  const arabicDigits = toArabicDigits(englishDigits);

  const { ar: arabicLetters, en: englishLetters } = convertLettersToBoth(letters);

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

      {/* Authentic Saudi Motorcycle Plate Body */}
      <View style={[styles.plateBody, scale !== 1 && { transform: [{ scale }] }]}>
        {/* Screw / Bolt Rivet simulations at top corners like real plates */}
        <View style={[styles.rivetDot, styles.rivetTopLeft]} />
        <View style={[styles.rivetDot, styles.rivetTopRight]} />

        {/* Main Grid Area (4 Quadrants) */}
        <View style={styles.mainGrid}>
          {/* Top Row: Arabic Numbers (Left) & Arabic Letters (Right) */}
          <View style={styles.gridRow}>
            {/* Top-Left: Arabic Numbers */}
            <TouchableOpacity
              activeOpacity={editable ? 0.7 : 1}
              onPress={() => editable && digitsInputRef.current?.focus()}
              style={[styles.quadrantCell, styles.topLeftCell]}
            >
              <Text style={[styles.arabicNumbersText, !arabicDigits && { opacity: 0.3 }]}>
                {arabicDigits || '٠٠٠٠'}
              </Text>
            </TouchableOpacity>

            {/* Top-Right: Arabic Letters */}
            <TouchableOpacity
              activeOpacity={editable ? 0.7 : 1}
              onPress={() => editable && lettersInputRef.current?.focus()}
              style={[styles.quadrantCell, styles.topRightCell]}
            >
              <Text style={[styles.arabicLettersText, !arabicLetters && { opacity: 0.3 }]}>
                {arabicLetters || 'ـ ـ'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Row: English Numbers (Left) & English Letters (Right) */}
          <View style={styles.gridRow}>
            {/* Bottom-Left: English Numbers */}
            <TouchableOpacity
              activeOpacity={editable ? 0.7 : 1}
              onPress={() => editable && digitsInputRef.current?.focus()}
              style={[styles.quadrantCell, styles.bottomLeftCell]}
            >
              <Text style={[styles.englishNumbersText, !englishDigits && { opacity: 0.3 }]}>
                {englishDigits || '0000'}
              </Text>
            </TouchableOpacity>

            {/* Bottom-Right: English Letters */}
            <TouchableOpacity
              activeOpacity={editable ? 0.7 : 1}
              onPress={() => editable && lettersInputRef.current?.focus()}
              style={[styles.quadrantCell, styles.bottomRightCell]}
            >
              <Text style={[styles.englishLettersText, !englishLetters && { opacity: 0.3 }]}>
                {englishLetters || '- -'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Sidebar: Emblem, 'السعودية', 'K S A' */}
        <View style={styles.sidebar}>
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
  topLeftCell: {
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 1.5,
    borderBottomWidth: 1.5,
    backgroundColor: '#f8fafc',
  },
  topRightCell: {
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 1.5,
    backgroundColor: '#f8fafc',
  },
  bottomLeftCell: {
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 1.5,
    borderTopWidth: 0,
    backgroundColor: '#ffffff',
  },
  bottomRightCell: {
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#ffffff',
  },
  arabicNumbersText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'android' ? 'sans-serif-medium' : undefined,
  },
  arabicLettersText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 6,
  },
  englishNumbersText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'android' ? 'monospace' : 'Courier',
  },
  englishLettersText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 6,
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
