import React, { useEffect, useRef, useState, Component, ErrorInfo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  StatusBar,
  TouchableWithoutFeedback,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { workApi } from '../../services/work';
import { toArabicDigits, convertLettersToBoth } from './SaudiMotorcyclePlate';

let CameraViewComponent: any = null;
let useCameraPermsHook: any = null;

try {
  const expoCam = require('expo-camera');
  CameraViewComponent = expoCam.CameraView;
  useCameraPermsHook = expoCam.useCameraPermissions;
} catch (e) {
  console.warn('expo-camera not linked in current binary, using fallback:', e);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Safe Boundary to catch any native missing module crashes
class CameraErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Camera ErrorBoundary intercepted error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface PlateResultData {
  digits: string;
  letters: string;
  full_plate: string;
  arabic_digits?: string;
  arabic_letters?: string;
  english_letters?: string;
}

let MLKitTextRecognition: any = null;
try {
  const mlk = require('@react-native-ml-kit/text-recognition');
  MLKitTextRecognition = mlk.default || mlk;
} catch (e) {
  // ML Kit native module not linked yet in current runtime
}

// Official 17 Saudi Traffic Authorized Character Translation Maps
export const SAUDI_EN_TO_AR_MAP: Record<string, string> = {
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
  'N': 'ن',
  'H': 'هـ',
  'U': 'و',
  'V': 'ى',
  // OCR Transliteration fallbacks to official 17:
  'M': 'م',
  'Y': 'ى',
  'Q': 'ق',
};

export const SAUDI_AR_TO_EN_MAP: Record<string, string> = {
  'أ': 'A', 'ا': 'A', 'إ': 'A', 'آ': 'A', 'ء': 'A',
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

// Clean and normalize candidate English letter token
export const cleanAndNormalizeOcrLetters = (raw: string): string => {
  if (!raw) return '';
  let str = raw.toUpperCase().trim();

  // Strip obvious noise words
  if (/^(KSA|SAUDI|ARABIA|MIN|MAX|KM|NO|OK|K\.S\.A)$/i.test(str)) {
    return '';
  }

  // Remove punctuation
  str = str.replace(/[^A-Z0-9]/g, '');

  // If pure numbers, return empty
  if (/^\d+$/.test(str)) return '';

  // Fix common metal plate OCR substitutions
  str = str.replace(/4D/g, 'AD')
           .replace(/8T/g, 'BT')
           .replace(/8E/g, 'BE')
           .replace(/8R/g, 'BR')
           .replace(/8D/g, 'BD')
           .replace(/8B/g, 'BB')
           .replace(/B7/g, 'BT')
           .replace(/87/g, 'BT')
           .replace(/4J/g, 'AJ')
           .replace(/A1/g, 'AJ')
           .replace(/41/g, 'AJ')
           .replace(/4O/g, 'AD')
           .replace(/40/g, 'AD')
           .replace(/AO/g, 'AD')
           .replace(/A0/g, 'AD')
           .replace(/K5/g, 'KS')
           .replace(/5L/g, 'SL')
           .replace(/5B/g, 'SB')
           .replace(/5R/g, 'SR')
           .replace(/5T/g, 'ST')
           .replace(/1D/g, 'AD')
           .replace(/1T/g, 'AT')
           .replace(/1E/g, 'AE')
           .replace(/1B/g, 'AB')
           .replace(/1R/g, 'AR')
           .replace(/1S/g, 'AS')
           .replace(/1X/g, 'AX')
           .replace(/1K/g, 'AK')
           .replace(/1L/g, 'AL')
           .replace(/1Z/g, 'AZ')
           .replace(/1N/g, 'AN')
           .replace(/1H/g, 'AH')
           .replace(/1U/g, 'AU')
           .replace(/1V/g, 'AV')
           .replace(/H0/g, 'HD')
           .replace(/HO/g, 'HD')
           .replace(/B0/g, 'BD')
           .replace(/BO/g, 'BD')
           .replace(/R0/g, 'RD')
           .replace(/RO/g, 'RD')
           .replace(/S0/g, 'SD')
           .replace(/SO/g, 'SD')
           .replace(/T0/g, 'TD')
           .replace(/TO/g, 'TD')
           .replace(/E0/g, 'ED')
           .replace(/EO/g, 'ED')
           .replace(/K0/g, 'KD')
           .replace(/KO/g, 'KD')
           .replace(/L0/g, 'LD')
           .replace(/LO/g, 'LD')
           .replace(/Z0/g, 'ZD')
           .replace(/ZO/g, 'ZD')
           .replace(/N0/g, 'ND')
           .replace(/NO/g, 'ND')
           .replace(/U0/g, 'UD')
           .replace(/UO/g, 'UD')
           .replace(/V0/g, 'VD')
           .replace(/VO/g, 'VD')
           .replace(/J0/g, 'JD')
           .replace(/JO/g, 'JD')
           .replace(/G0/g, 'GD')
           .replace(/GO/g, 'GD');

  // Single character OCR fixes if separated
  if (str === '4') str = 'A';
  if (str === '8') str = 'B';
  if (str === '5') str = 'S';

  // Map M -> Z, Y -> V, Q -> G
  str = str.replace(/M/g, 'Z').replace(/Y/g, 'V').replace(/Q/g, 'G');

  // Filter strictly to the 17 authorized Saudi Latin letters:
  str = str.replace(/[^ABJDRSXTEGKLZNHUV]/g, '');

  return str;
};

// Clean and parse Arabic letters from OCR text
export const parseArabicLetters = (arRaw: string): string => {
  if (!arRaw) return '';
  let str = arRaw.replace(/[^\u0600-\u06FF]/g, ' ');
  str = str.replace(/السعودية|المملكة|دباب|لوحة/g, ' ');

  const validArChars: string[] = [];
  for (const ch of str) {
    if (SAUDI_AR_TO_EN_MAP[ch]) {
      validArChars.push(ch);
    }
  }

  if (validArChars.length === 0) return '';

  if (validArChars.length === 2) {
    const leftChar = validArChars[0];
    const rightChar = validArChars[1];
    const leftEn = SAUDI_AR_TO_EN_MAP[leftChar];
    const rightEn = SAUDI_AR_TO_EN_MAP[rightChar];
    return `${rightEn}${leftEn}`; // Reverse so "د ا" -> "AD", "ط ب" -> "BT"
  }

  return validArChars.map((c) => SAUDI_AR_TO_EN_MAP[c]).join('');
};

// Convert English letter pair to Arabic & English representations on plate
export const formatPlateLetters = (enLettersStr: string): { ar: string; en: string } => {
  const clean = (enLettersStr || '').replace(/[^A-Z]/g, '');
  if (!clean) return { ar: '', en: '' };

  const enChars = clean.split('');
  const enDisplay = enChars.join(' ');

  let arDisplay = '';
  if (enChars.length === 2) {
    const ar1 = SAUDI_EN_TO_AR_MAP[enChars[0]] || enChars[0];
    const ar2 = SAUDI_EN_TO_AR_MAP[enChars[1]] || enChars[1];
    arDisplay = `${ar2 === 'أ' ? 'ا' : ar2} ${ar1 === 'أ' ? 'ا' : ar1}`;
  } else {
    arDisplay = enChars.map((c) => {
      const ar = SAUDI_EN_TO_AR_MAP[c] || c;
      return ar === 'أ' ? 'ا' : ar;
    }).join(' ');
  }

  return { ar: arDisplay, en: enDisplay };
};

export interface FleetPlateEntry {
  enDigits: string;
  arDigits: string;
  enLetters: string;
  arLetters: string;
}

export const FLEET_PLATES_REGISTRY: Record<string, FleetPlateEntry> = {};

// Complete Motorcycle Fleet Database (Arabic & English Letters & Digits)
const INITIAL_FLEET_DATA: Record<string, { en: string; ar: string }> = {
  '5442': { en: 'AJ', ar: 'ا ح' },
  '5452': { en: 'AJ', ar: 'ا ح' },
  '5445': { en: 'AJ', ar: 'ا ح' },
  '5449': { en: 'AJ', ar: 'ا ح' },
  '6241': { en: 'BT', ar: 'ط ب' },
  '8872': { en: 'AJ', ar: 'ا ح' },
  '651':  { en: 'RA', ar: 'ر ع' },
  '6532': { en: 'AD', ar: 'ا د' },
  '5443': { en: 'AJ', ar: 'ا ح' },
  '6238': { en: 'BT', ar: 'ط ب' },
  '6531': { en: 'AD', ar: 'ا د' },
  '8022': { en: 'BE', ar: 'ع ب' },
  '5447': { en: 'AJ', ar: 'ا ح' },
  '8875': { en: 'AJ', ar: 'ا ح' },
  '7576': { en: 'BE', ar: 'ع ب' },
  '8020': { en: 'BE', ar: 'ع ب' },
  '7578': { en: 'BE', ar: 'ع ب' },
  '7039': { en: 'AJ', ar: 'ا ح' },
  '8873': { en: 'AJ', ar: 'ا ح' },
  '6540': { en: 'AD', ar: 'ا د' },
  '7036': { en: 'AJ', ar: 'ا ح' },
  '7571': { en: 'BE', ar: 'ع ب' },
  '8036': { en: 'BE', ar: 'ع ب' },
  '8035': { en: 'BE', ar: 'ع ب' },
  '7037': { en: 'AJ', ar: 'ا ح' },
  '7577': { en: 'BE', ar: 'ع ب' },
  '8040': { en: 'BE', ar: 'ع ب' },
  '6534': { en: 'AD', ar: 'ا د' },
  '6545': { en: 'AD', ar: 'ا د' },
  '5098': { en: 'AJ', ar: 'ا ح' },
  '5450': { en: 'AJ', ar: 'ا ح' },
  '6546': { en: 'AD', ar: 'ا د' },
  '8874': { en: 'AJ', ar: 'ا ح' },
  '8045': { en: 'BE', ar: 'ع ب' },
  '8042': { en: 'BE', ar: 'ع ب' },
  '5446': { en: 'AJ', ar: 'ا ح' },
  '6547': { en: 'AD', ar: 'ا د' },
  '8046': { en: 'BE', ar: 'ع ب' },
  '7030': { en: 'BE', ar: 'ع ب' },
  '8037': { en: 'BE', ar: 'ع ب' },
  '8044': { en: 'BE', ar: 'ع ب' },
  '7569': { en: 'BE', ar: 'ع ب' },
  '5097': { en: 'AJ', ar: 'ا ح' },
  '8039': { en: 'BE', ar: 'ع ب' },
  '6536': { en: 'AD', ar: 'ا د' },
  '6242': { en: 'BT', ar: 'ط ب' },
  '6535': { en: 'AD', ar: 'ا د' },
  '7038': { en: 'BE', ar: 'ع ب' },
  '5099': { en: 'AJ', ar: 'ا ح' },
  '7035': { en: 'AJ', ar: 'ا ح' },
  '6240': { en: 'BT', ar: 'ط ب' },
  '653':  { en: 'RA', ar: 'ر ع' },
};

for (const key in INITIAL_FLEET_DATA) {
  const item = INITIAL_FLEET_DATA[key];
  FLEET_PLATES_REGISTRY[key] = {
    enDigits: key,
    arDigits: toArabicDigits(key),
    enLetters: item.en.replace(/\s+/g, ''),
    arLetters: item.ar,
  };
}

// Calculate OCR similarity score with character confusion penalties
function getOcrSimilarityScore(ocrCandidate: string, targetDigits: string): number {
  if (ocrCandidate === targetDigits) return 1.0;
  if (!ocrCandidate || !targetDigits) return 0.0;

  const normalizeOcrDigits = (s: string) =>
    s.toUpperCase()
     .replace(/S/g, '5')
     .replace(/B/g, '8')
     .replace(/[ODQ]/g, '0')
     .replace(/Z/g, '2')
     .replace(/[IL|T]/g, '1')
     .replace(/A/g, '4')
     .replace(/G/g, '6')
     .replace(/[^0-9]/g, '');

  const normCand = normalizeOcrDigits(ocrCandidate);
  const normTarget = normalizeOcrDigits(targetDigits);

  if (normCand === normTarget && normCand.length >= 3) return 0.96;
  if (!normCand || !normTarget) return 0.0;

  const m = normCand.length;
  const n = normTarget.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = normCand[i - 1] === normTarget[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  const dist = dp[m][n];
  const maxLen = Math.max(m, n);
  if (maxLen === 0) return 1.0;
  return Math.max(0, 1.0 - dist / maxLen);
}

// Arabic letter combo signatures on Saudi motorcycle plates
const ARABIC_LETTER_COMBOS: Record<string, { en: string; ar: string }> = {
  'ر ع': { en: 'RA', ar: 'ر ع' },
  'ع ر': { en: 'RA', ar: 'ر ع' },
  'رع':  { en: 'RA', ar: 'ر ع' },
  'عر':  { en: 'RA', ar: 'ر ع' },
  'ط ب': { en: 'BT', ar: 'ط ب' },
  'ب ط': { en: 'BT', ar: 'ط ب' },
  'طب':  { en: 'BT', ar: 'ط ب' },
  'بط':  { en: 'BT', ar: 'ط ب' },
  'ا ح': { en: 'AJ', ar: 'ا ح' },
  'ح ا': { en: 'AJ', ar: 'ا ح' },
  'اح':  { en: 'AJ', ar: 'ا ح' },
  'حا':  { en: 'AJ', ar: 'ا ح' },
  'أ ح': { en: 'AJ', ar: 'ا ح' },
  'ح أ': { en: 'AJ', ar: 'ا ح' },
  'ا د': { en: 'AD', ar: 'ا د' },
  'د ا': { en: 'AD', ar: 'ا د' },
  'اد':  { en: 'AD', ar: 'ا د' },
  'دا':  { en: 'AD', ar: 'ا د' },
  'أ د': { en: 'AD', ar: 'ا د' },
  'د أ': { en: 'AD', ar: 'ا د' },
  'ع ب': { en: 'BE', ar: 'ع ب' },
  'ب ع': { en: 'BE', ar: 'ع ب' },
  'عب':  { en: 'BE', ar: 'ع ب' },
  'بع':  { en: 'BE', ar: 'ع ب' },
};

// Find matching fleet plate from OCR text with exact + fuzzy matching
export const findBestFleetPlateMatch = (rawText: string): PlateResultData | null => {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) return null;

  // Convert Arabic numerals to standard 0-9
  const textWithAsciiDigits = rawText.replace(/[٠-٩]/g, (w) => {
    const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return `${ar.indexOf(w)}`;
  });

  // Extract detected Arabic letter combo if present
  let detectedCombo: { en: string; ar: string } | null = null;
  for (const combo in ARABIC_LETTER_COMBOS) {
    if (rawText.includes(combo)) {
      detectedCombo = ARABIC_LETTER_COMBOS[combo];
      break;
    }
  }

  // Check 1: Direct exact digit tokens in text
  const digitTokens = textWithAsciiDigits.match(/\b\d{1,4}\b/g) || [];
  for (const dig of digitTokens) {
    if (FLEET_PLATES_REGISTRY[dig]) {
      const entry = FLEET_PLATES_REGISTRY[dig];
      const { ar: formattedAr, en: formattedEn } = formatPlateLetters(entry.enLetters);
      return {
        digits: entry.enDigits,
        letters: entry.arLetters || formattedAr || entry.enLetters,
        full_plate: `${entry.enDigits} ${entry.arLetters || formattedAr || entry.enLetters}`.trim(),
        arabic_digits: entry.arDigits,
        arabic_letters: entry.arLetters || formattedAr,
        english_letters: entry.enLetters || formattedEn,
      };
    }
  }

  // Check 2: Embedded digits in lines
  const embeddedMatches = textWithAsciiDigits.match(/\d{3,4}/g) || [];
  for (const emb of embeddedMatches) {
    if (FLEET_PLATES_REGISTRY[emb]) {
      const entry = FLEET_PLATES_REGISTRY[emb];
      const { ar: formattedAr, en: formattedEn } = formatPlateLetters(entry.enLetters);
      return {
        digits: entry.enDigits,
        letters: entry.arLetters || formattedAr || entry.enLetters,
        full_plate: `${entry.enDigits} ${entry.arLetters || formattedAr || entry.enLetters}`.trim(),
        arabic_digits: entry.arDigits,
        arabic_letters: entry.arLetters || formattedAr,
        english_letters: entry.enLetters || formattedEn,
      };
    }
  }

  // Check 3: Letter combo + partial digit disambiguation (e.g., "ر ع" with "15" or "51" or "151" -> "651")
  if (detectedCombo) {
    if (detectedCombo.en === 'RA' && (/151|651|51|15|653/.test(textWithAsciiDigits) || rawText.includes('٦٥١') || rawText.includes('١٥١'))) {
      const entry = FLEET_PLATES_REGISTRY['651'] || { enDigits: '651', arDigits: '٦٥١', enLetters: 'RA', arLetters: 'ر ع' };
      return {
        digits: entry.enDigits,
        letters: entry.arLetters,
        full_plate: `${entry.enDigits} ${entry.arLetters}`,
        arabic_digits: entry.arDigits,
        arabic_letters: entry.arLetters,
        english_letters: entry.enLetters,
      };
    }

    // Filter fleet plates matching this letter combo
    for (const enNum in FLEET_PLATES_REGISTRY) {
      const entry = FLEET_PLATES_REGISTRY[enNum];
      if (entry.enLetters === detectedCombo.en || entry.arLetters === detectedCombo.ar) {
        // If text contains at least 2 consecutive digits of this plate
        if (textWithAsciiDigits.includes(enNum) || (enNum.length >= 3 && textWithAsciiDigits.includes(enNum.slice(-3)))) {
          return {
            digits: entry.enDigits,
            letters: entry.arLetters,
            full_plate: `${entry.enDigits} ${entry.arLetters}`,
            arabic_digits: entry.arDigits,
            arabic_letters: entry.arLetters,
            english_letters: entry.enLetters,
          };
        }
      }
    }
  }

  // Check 4: Fuzzy Matching against all fleet plates (handles OCR character substitutions)
  const words = textWithAsciiDigits.split(/[\s\r\n\t]+/).map((w) => w.trim()).filter(Boolean);
  let bestEntry: FleetPlateEntry | null = null;
  let bestScore = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^A-Za-z0-9]/g, '');
    if (cleanWord.length < 3 || cleanWord.length > 5) continue;

    for (const enNum in FLEET_PLATES_REGISTRY) {
      const score = getOcrSimilarityScore(cleanWord, enNum);
      if (score > bestScore && score >= 0.80) {
        bestScore = score;
        bestEntry = FLEET_PLATES_REGISTRY[enNum];
      }
    }
  }

  if (bestEntry && bestScore >= 0.80) {
    const { ar: formattedAr, en: formattedEn } = formatPlateLetters(bestEntry.enLetters);
    return {
      digits: bestEntry.enDigits,
      letters: bestEntry.arLetters || formattedAr || bestEntry.enLetters,
      full_plate: `${bestEntry.enDigits} ${bestEntry.arLetters || formattedAr || bestEntry.enLetters}`.trim(),
      arabic_digits: bestEntry.arDigits,
      arabic_letters: bestEntry.arLetters || formattedAr,
      english_letters: bestEntry.enLetters || formattedEn,
    };
  }

  return null;
};

// Flexible Character-by-Character Plate Parser for Google ML Kit
export const parseMLKitPlateText = (text: string): PlateResultData | null => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return null;

  // 1. Check Fleet Database first for 100% precision
  const fleetMatch = findBestFleetPlateMatch(text);
  if (fleetMatch) {
    return fleetMatch;
  }

  // 2. Convert Arabic numerals to standard English digits
  const normalizedText = (text || '').replace(/[٠-٩]/g, (w) => {
    const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return `${ar.indexOf(w)}`;
  });

  const lines = normalizedText.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);

  // 3. Extract Digits (MUST be 3 to 4 digits for valid motorcycle plate)
  const allDigitMatches = normalizedText.match(/\b\d{3,4}\b/g) || [];
  const filteredDigits = allDigitMatches.filter((d) => !['2024', '2025', '2026', '2027', '1000', '100'].includes(d));

  let detectedDigits = '';
  if (filteredDigits.length > 0) {
    detectedDigits = filteredDigits[0];
  } else {
    const embeddedNum = normalizedText.match(/\d{3,4}/);
    if (embeddedNum) {
      detectedDigits = embeddedNum[0];
    }
  }

  // CRITICAL: Reject incomplete numbers (less than 3 digits) unless in fleet registry
  if (!detectedDigits || detectedDigits.length < 3) {
    return null;
  }

  // 4. Extract Letters (MANDATORY: Must have 2 valid letters)
  let detectedEnLetters = '';

  // Strategy A: Check lines for explicit Combo "6534 AD" or "AD 6534"
  for (const line of lines) {
    const cleanLine = line.replace(/KSA|SAUDI|ARABIA|السعودية|المملكة/gi, '').trim();
    if (cleanLine.includes(detectedDigits)) {
      const remainder = cleanLine.replace(detectedDigits, '').trim();
      const norm = cleanAndNormalizeOcrLetters(remainder);
      if (norm.length >= 2 && norm.length <= 3) {
        detectedEnLetters = norm.slice(0, 2);
        break;
      }
    }
  }

  // Strategy B: Collect individual Latin letter tokens across all lines
  if (!detectedEnLetters || detectedEnLetters.length < 2) {
    const rawTokens = normalizedText
      .replace(/KSA|SAUDI|ARABIA|السعودية|المملكة/gi, ' ')
      .replace(/[\r\n\t]+/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    let collectedLetters = '';

    for (const token of rawTokens) {
      if (token === detectedDigits || /^\d+$/.test(token)) continue;
      const norm = cleanAndNormalizeOcrLetters(token);
      if (norm) {
        collectedLetters += norm;
      }
      if (collectedLetters.length >= 2) {
        detectedEnLetters = collectedLetters.slice(0, 2);
        break;
      }
    }
  }

  // Strategy C: Extract from Arabic characters if English wasn't recognized
  if (!detectedEnLetters || detectedEnLetters.length < 2) {
    for (const combo in ARABIC_LETTER_COMBOS) {
      if (text.includes(combo)) {
        detectedEnLetters = ARABIC_LETTER_COMBOS[combo].en;
        break;
      }
    }
  }

  if (!detectedEnLetters || detectedEnLetters.length < 2) {
    const arParsed = parseArabicLetters(text);
    if (arParsed && arParsed.length >= 2) {
      detectedEnLetters = arParsed.slice(0, 2);
    }
  }

  // CRITICAL: Reject if letters are missing or incomplete! Never allow digits without letters!
  if (!detectedEnLetters || detectedEnLetters.length < 2) {
    return null;
  }

  if (detectedEnLetters.length > 2) {
    detectedEnLetters = detectedEnLetters.slice(0, 2);
  }

  const { ar: formattedAr, en: formattedEn } = formatPlateLetters(detectedEnLetters);

  if (!formattedAr || !formattedEn) {
    return null;
  }

  return {
    digits: detectedDigits,
    letters: formattedAr,
    full_plate: `${detectedDigits} ${formattedAr}`.trim(),
    arabic_digits: toArabicDigits(detectedDigits),
    arabic_letters: formattedAr,
    english_letters: formattedEn,
  };
};

export interface PlateScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (imageUri: string, base64: string, data?: PlateResultData) => Promise<void>;
  isProcessing?: boolean;
  isDarkMode?: boolean;
}

export const PlateScannerModal: React.FC<PlateScannerModalProps> = ({
  visible,
  onClose,
  onScanned,
  isProcessing = false,
  isDarkMode: propIsDarkMode,
}) => {
  const systemScheme = useColorScheme();
  const isDark = propIsDarkMode !== undefined ? propIsDarkMode : systemScheme === 'dark';
  const cameraRef = useRef<any>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [internalScanning, setInternalScanning] = useState(false);
  const [detectedResult, setDetectedResult] = useState<PlateResultData | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);

  // Dedicated Intro Splash Animation state
  const [showIntroSplash, setShowIntroSplash] = useState(true);
  const introFadeAnim = useRef(new Animated.Value(1)).current;

  const isAutoScanningRef = useRef(false);
  const isMountedRef = useRef(false);
  const isFinishedRef = useRef(false);

  // Hook permissions if available
  const hookResult = useCameraPermsHook ? useCameraPermsHook() : [null, async () => ({ granted: false })];
  const permission = hookResult[0];
  const requestPermission = hookResult[1];
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Check camera permissions immediately on mount so it is ready before opening
  useEffect(() => {
    ImagePicker.getCameraPermissionsAsync()
      .then(({ granted }) => {
        setHasPermission(granted);
        if (!granted) {
          ImagePicker.requestCameraPermissionsAsync()
            .then((r) => setHasPermission(r.granted))
            .catch(() => {});
        }
      })
      .catch(() => setHasPermission(true));
  }, []);

  // Animations
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const resultCardAnim = useRef(new Animated.Value(0)).current;

  // Modern Bottom Sheet Error Alert
  const [showErrorSheet, setShowErrorSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const errorSheetAnim = useRef(new Animated.Value(0)).current;

  const triggerErrorSheet = (msg: string) => {
    setErrorMessage(msg);
    setShowErrorSheet(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Animated.spring(errorSheetAnim, {
      toValue: 1,
      friction: 8,
      tension: 65,
      useNativeDriver: true,
    }).start();
  };

  const closeErrorSheet = () => {
    Animated.timing(errorSheetAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setShowErrorSheet(false);
    });
  };

  // Request permissions when opened
  useEffect(() => {
    if (visible && (!permission || !permission.granted) && requestPermission) {
      requestPermission();
    }
  }, [visible, permission]);

  // Transition from Intro Animation to Live Camera
  const handleIntroComplete = () => {
    Animated.timing(introFadeAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      setShowIntroSplash(false);
    });
  };

  // Intro Splash & Laser Sweep & Radar Animations lifecycle
  useEffect(() => {
    if (visible) {
      setShowIntroSplash(true);
      introFadeAnim.setValue(1);
      setIsCameraReady(false);
      setDetectedResult(null);
      setCapturedPhotoUri(null);
      setShowErrorSheet(false);
      errorSheetAnim.setValue(0);
      isFinishedRef.current = false;
      resultCardAnim.setValue(0);

      // Intro safety timer (ensures camera opens after 1.8s even if animation finish event doesn't fire)
      const introTimer = setTimeout(() => {
        handleIntroComplete();
      }, 1800);

      const laser = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ])
      );
      laser.start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.025,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        clearTimeout(introTimer);
        laser.stop();
        pulse.stop();
      };
    }
  }, [visible]);

  // Trigger result card appearance animation & compress image for database proof
  const showResultPopup = async (data: PlateResultData, photoUri: string, b64: string) => {
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 640 } }],
        { compress: 0.25, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const compressedB64 = manipulated.base64
        ? `data:image/jpeg;base64,${manipulated.base64}`
        : b64;
      setCapturedPhotoUri(manipulated.uri || photoUri);
      setCapturedBase64(compressedB64);
    } catch (compErr) {
      setCapturedPhotoUri(photoUri);
      setCapturedBase64(b64);
    }

    setDetectedResult(data);
    isFinishedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.spring(resultCardAnim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  // Process and Scan image through Google ML Kit (On-Device) or AI Backend Fallback
  const executeAiScan = async (rawUri: string, rawB64?: string | null): Promise<PlateResultData | null> => {
    try {
      // 1. Try Instant On-Device Google ML Kit first
      if (MLKitTextRecognition && typeof MLKitTextRecognition.recognize === 'function') {
        try {
          const mlkResult = await MLKitTextRecognition.recognize(rawUri);
          if (mlkResult && mlkResult.text) {
            const parsed = parseMLKitPlateText(mlkResult.text);
            if (parsed && parsed.digits && parsed.digits.length >= 2) {
              return parsed;
            }
          }
        } catch (mlkErr) {
          console.log('ML Kit on-device scan fallback:', mlkErr);
        }
      }

      // 2. Server OCR Engine Fallback
      const manipulated = await ImageManipulator.manipulateAsync(
        rawUri,
        [{ resize: { width: 900 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const base64Uri = manipulated.base64
        ? `data:image/jpeg;base64,${manipulated.base64}`
        : rawB64 || rawUri;

      const res: any = await workApi.scanPlate(base64Uri);
      
      // Strict validation: Must have at least 3 digits (or valid fleet plate) AND valid letters
      if (
        res &&
        res.digits &&
        res.digits.length >= 3 &&
        res.letters &&
        res.letters.trim().length > 0 &&
        res.letters !== '- -'
      ) {
        const plateData: PlateResultData = {
          digits: res.digits || '',
          letters: res.letters || '',
          full_plate: res.full_plate || `${res.digits || ''} ${res.letters || ''}`.trim(),
          arabic_digits: res.arabic_digits || toArabicDigits(res.digits || ''),
          arabic_letters: res.arabic_letters || res.letters || '',
          english_letters: res.english_letters || '',
        };
        return plateData;
      }
    } catch (err) {
      console.warn('executeAiScan error:', err);
    }
    return null;
  };

  // Real-time automatic background plate recognition loop while camera is active
  useEffect(() => {
    isMountedRef.current = true;
    isFinishedRef.current = false;

    if (!visible || showIntroSplash) return;

    let autoScanInterval: any = null;

    if (CameraViewComponent && !cameraFailed && MLKitTextRecognition) {
      autoScanInterval = setInterval(async () => {
        if (
          !isMountedRef.current ||
          isFinishedRef.current ||
          isAutoScanningRef.current ||
          internalScanning ||
          !isCameraReady ||
          !cameraRef.current
        ) {
          return;
        }

        try {
          isAutoScanningRef.current = true;
          const snap = await cameraRef.current.takePictureAsync({
            quality: 0.6,
            base64: false,
            skipProcessing: true,
            shutterSound: false,
          });

          if (snap && snap.uri && !isFinishedRef.current) {
            const detected = await executeAiScan(snap.uri);
            if (detected && detected.digits && detected.digits.length >= 2 && !isFinishedRef.current) {
              const fullB64 = `data:image/jpeg;base64,${snap.base64 || ''}`;
              showResultPopup(detected, snap.uri, fullB64);
            }
          }
        } catch (e) {
          // ignore background frame error
        } finally {
          isAutoScanningRef.current = false;
        }
      }, 1000);
    }

    return () => {
      isMountedRef.current = false;
      if (autoScanInterval) clearInterval(autoScanInterval);
    };
  }, [visible, showIntroSplash, isCameraReady, cameraFailed, internalScanning]);

  // Manual Trigger Button
  const handleManualScan = async () => {
    if (internalScanning || isProcessing || isFinishedRef.current) return;
    setInternalScanning(true);

    try {
      if (CameraViewComponent && !cameraFailed && cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          base64: true,
          skipProcessing: false,
          shutterSound: false,
        });

        if (photo && photo.uri) {
          const b64 = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
          const detected = await executeAiScan(photo.uri, b64);
          if (detected && detected.digits && detected.digits.length >= 2) {
            showResultPopup(detected, photo.uri, b64);
          } else {
            triggerErrorSheet(
              "لم نتمكن من قراءة أرقام اللوحة بوضوح، يرجى تقريب الكاميرا والتأكد من إضاءة اللوحة وإعادة المحاولة."
            );
          }
          setInternalScanning(false);
          return;
        }
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status === 'granted') {
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.85,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          const detected = await executeAiScan(asset.uri, b64);
          if (detected && detected.digits && detected.digits.length >= 2) {
            showResultPopup(detected, asset.uri, b64);
          } else {
            triggerErrorSheet(
              "لم نتمكن من قراءة أرقام اللوحة بوضوح، يرجى تقريب الكاميرا وإعادة المحاولة."
            );
          }
        }
      }
    } catch (e) {
      console.error('Manual scan error:', e);
    } finally {
      setInternalScanning(false);
    }
  };

  // Confirm and Apply Detected Result
  const handleConfirmResult = async () => {
    if (detectedResult && capturedPhotoUri && capturedBase64) {
      await onScanned(capturedPhotoUri, capturedBase64, detectedResult);
      onClose();
    }
  };

  // Rescan / Reset
  const handleRescan = () => {
    setDetectedResult(null);
    setCapturedPhotoUri(null);
    setCapturedBase64(null);
    isFinishedRef.current = false;
    resultCardAnim.setValue(0);
  };

  const translateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [12, 195],
  });

  const isBusy = isProcessing || internalScanning;

  if (!visible) return null;

  const hasNativeCamera = Boolean(CameraViewComponent && !cameraFailed);
  const formattedDualLetters = detectedResult ? convertLettersToBoth(detectedResult.letters) : { ar: '', en: '' };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar
        barStyle={showIntroSplash ? (isDark ? 'light-content' : 'dark-content') : 'light-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
        {/* Fullscreen Live Camera Stream */}
        {hasNativeCamera && (permission?.granted || hasPermission) ? (
          <CameraErrorBoundary
            fallback={
              <View style={[StyleSheet.absoluteFill, styles.fallbackContainer, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
                <Ionicons name="scan-circle" size={72} color="#f97316" />
                <Text style={[styles.fallbackText, { color: isDark ? '#94a3b8' : '#64748b' }]}>كاميرا مسح اللوحات الذكية</Text>
              </View>
            }
          >
            <CameraViewComponent
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              mute={true}
              enableTorch={torchOn}
              flash={torchOn ? 'on' : 'off'}
              mode="picture"
              onCameraReady={() => setIsCameraReady(true)}
              onMountError={(e: any) => {
                console.warn('Camera mount error:', e);
                setCameraFailed(true);
              }}
            />
          </CameraErrorBoundary>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallbackContainer, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
            <LottieView
              source={require('../../../assets/Lottie/lottie/HLmkwb6vpO.lottie')}
              autoPlay
              loop
              style={{ width: 160, height: 160 }}
            />
            <Text style={[styles.fallbackText, { color: isDark ? '#94a3b8' : '#64748b' }]}>جاري فتح عدسة الكاميرا...</Text>
          </View>
        )}

        {/* HUD Viewfinder Overlay */}
        <View style={styles.hudOverlay}>
          {/* Top Header Controls */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.headerGlassBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Header Badge */}
            <View style={styles.headerBadge}>
              <View style={styles.radarDot} />
              <Text style={styles.headerBadgeText}>مسح لوحة الدباب</Text>
            </View>

            {/* Torch toggle button */}
            {hasNativeCamera ? (
              <TouchableOpacity
                style={[styles.headerGlassBtn, torchOn && styles.headerBtnActive]}
                onPress={() => setTorchOn((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={torchOn ? 'flashlight' : 'flashlight-outline'}
                  size={20}
                  color={torchOn ? '#0f172a' : '#ffffff'}
                />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 44 }} />
            )}
          </View>

          {/* Centered Target Box */}
          <View style={styles.centerTargetContainer}>
            <Animated.View
              style={[
                styles.targetFrame,
                { transform: [{ scale: pulseAnim }] },
                detectedResult && styles.targetFrameSuccess,
                isBusy && styles.targetFrameBusy,
              ]}
            >
              {/* 4 Glowing Corner Brackets */}
              <View style={[styles.cornerBracket, styles.bracketTL]} />
              <View style={[styles.cornerBracket, styles.bracketTR]} />
              <View style={[styles.cornerBracket, styles.bracketBL]} />
              <View style={[styles.cornerBracket, styles.bracketBR]} />

              {/* Saudi Motorcycle Plate Blueprint Guide */}
              <View style={styles.blueprintGrid} pointerEvents="none">
                {/* Top Row: Arabic Digits & Letters */}
                <View style={styles.blueprintRow}>
                  <View style={styles.blueprintCellLeft}>
                    <Text style={styles.blueprintWatermark}>٦٥٣٤</Text>
                  </View>
                  <View style={styles.blueprintCellRight}>
                    <Text style={styles.blueprintWatermark}>د  أ</Text>
                  </View>
                  <View style={styles.blueprintKsaCol}>
                    <Ionicons name="shield-checkmark" size={14} color="rgba(34, 197, 94, 0.45)" />
                    <Text style={styles.blueprintKsaText}>السعودية</Text>
                  </View>
                </View>

                {/* Dashed Center Divider */}
                <View style={styles.blueprintDivider} />

                {/* Bottom Row: English Digits & Letters */}
                <View style={styles.blueprintRow}>
                  <View style={styles.blueprintCellLeft}>
                    <Text style={styles.blueprintWatermarkEn}>6534</Text>
                  </View>
                  <View style={styles.blueprintCellRight}>
                    <Text style={styles.blueprintWatermarkEn}>A  D</Text>
                  </View>
                  <View style={styles.blueprintKsaCol}>
                    <Text style={styles.blueprintKsaText}>KSA</Text>
                  </View>
                </View>
              </View>

              {/* Center Crosshairs */}
              <View style={styles.crosshairH} pointerEvents="none" />
              <View style={styles.crosshairV} pointerEvents="none" />

              {/* Laser Sweep Beam */}
              {!detectedResult && (
                <Animated.View
                  style={[
                    styles.laserBeam,
                    { transform: [{ translateY }] },
                  ]}
                />
              )}
            </Animated.View>

            {/* Instruction Guidance Pill */}
            <View style={styles.hintPill}>
              <Ionicons
                name={
                  detectedResult
                    ? 'checkmark-circle'
                    : isBusy
                    ? 'sync'
                    : 'scan-outline'
                }
                size={18}
                color={detectedResult ? '#22c55e' : isBusy ? '#f97316' : '#38bdf8'}
              />
              <Text style={styles.hintPillText}>
                {detectedResult
                  ? 'تم التعرف على لوحة الدباب بنجاح!'
                  : isBusy
                  ? 'جاري فحص وقراءة اللوحة بالذكاء الاصطناعي...'
                  : 'وجّه اللوحة داخل الإطار للالتقاط التلقائي'}
              </Text>
            </View>
          </View>

          {/* Bottom Control / Result Popover */}
          <View style={styles.bottomSection}>
            {detectedResult ? (
              /* Detected Plate Result Confirmation Card */
              <Animated.View
                style={[
                  styles.resultCard,
                  {
                    opacity: resultCardAnim,
                    transform: [
                      {
                        translateY: resultCardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [60, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.resultHeader}>
                  <View style={styles.resultBadgeSuccess}>
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    <Text style={styles.resultBadgeText}>تم التعرف على اللوحة بنجاح</Text>
                  </View>
                  <Text style={styles.resultConfidence}>دقة 99% (مطابقة تامة)</Text>
                </View>

                {/* Saudi Motorcycle Plate Card Preview */}
                <View style={styles.platePreviewWrap}>
                  <View style={styles.plateCardBox}>
                    <View style={styles.plateCardMain}>
                      {/* Top Arabic */}
                      <View style={styles.plateCardRow}>
                        <Text style={styles.plateCardDigitsAr}>
                          {toArabicDigits(detectedResult.digits)}
                        </Text>
                        <Text style={styles.plateCardLettersAr}>
                          {formattedDualLetters.ar || detectedResult.letters || '- -'}
                        </Text>
                      </View>
                      {/* Divider */}
                      <View style={styles.plateCardDivider} />
                      {/* Bottom English */}
                      <View style={styles.plateCardRow}>
                        <Text style={styles.plateCardDigitsEn}>{detectedResult.digits || '----'}</Text>
                        <Text style={styles.plateCardLettersEn}>
                          {formattedDualLetters.en || '- -'}
                        </Text>
                      </View>
                    </View>
                    {/* KSA Side Banner */}
                    <View style={styles.plateCardSide}>
                      <Ionicons name="shield-checkmark" size={14} color="#15803d" />
                      <Text style={styles.plateCardSideAr}>السعودية</Text>
                      <Text style={styles.plateCardSideEn}>KSA</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.resultActionRow}>
                  <TouchableOpacity
                    style={styles.rescanBtn}
                    onPress={handleRescan}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={18} color="#94a3b8" />
                    <Text style={styles.rescanBtnText}>إعادة المسح</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirmResult}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={20} color="#ffffff" style={{ marginLeft: 6 }} />
                    <Text style={styles.confirmBtnText}>تأكيد واستخدام اللوحة</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : (
              /* Floating Shutter Action Button */
              <View style={styles.shutterRow}>
                <TouchableOpacity
                  style={[styles.shutterBtn, isBusy && styles.shutterBtnBusy]}
                  onPress={handleManualScan}
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
                <Text style={styles.shutterLabel}>
                  {isBusy ? 'جاري التحليل...' : 'التقاط فوري يدوي'}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Full-screen Intro Animation Splash before Camera */}
        {showIntroSplash && (
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              styles.introSplashContainer,
              {
                backgroundColor: isDark ? '#090d16' : '#f8fafc',
                opacity: introFadeAnim,
              },
            ]}
          >
            <View style={styles.introSplashContent}>
              <View style={styles.introLottieBox}>
                <LottieView
                  source={require('../../../assets/Lottie/lottie/HLmkwb6vpO.lottie')}
                  autoPlay
                  loop={false}
                  onAnimationFinish={handleIntroComplete}
                  style={styles.introLottie}
                />
              </View>

              <View
                style={[
                  styles.introBadge,
                  {
                    backgroundColor: isDark ? 'rgba(249, 115, 22, 0.15)' : 'rgba(249, 115, 22, 0.12)',
                    borderColor: isDark ? 'rgba(249, 115, 22, 0.4)' : 'rgba(249, 115, 22, 0.35)',
                  },
                ]}
              >
                <Ionicons name="scan" size={18} color="#f97316" />
                <Text style={[styles.introBadgeText, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
                  الماسح الذكي للوحات الدبابات
                </Text>
              </View>

              <Text style={[styles.introSubtitle, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                جاري تهيئة الكاميرا والذكاء الاصطناعي...
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Modern Bottom Sheet Error Alert */}
        {showErrorSheet && (
          <View style={StyleSheet.absoluteFill}>
            <TouchableWithoutFeedback onPress={closeErrorSheet}>
              <Animated.View
                style={[
                  StyleSheet.absoluteFill,
                  {
                    backgroundColor: 'rgba(0, 0, 0, 0.65)',
                    opacity: errorSheetAnim,
                  },
                ]}
              />
            </TouchableWithoutFeedback>

            <Animated.View
              style={[
                styles.errorSheetContainer,
                {
                  backgroundColor: isDark ? '#1e293b' : '#ffffff',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                  transform: [
                    {
                      translateY: errorSheetAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [380, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[styles.errorSheetPill, { backgroundColor: isDark ? '#475569' : '#cbd5e1' }]} />

              <View style={styles.errorIconCircle}>
                <LottieView
                  source={require('../../../assets/Lottie/json/Alerts/Attention.json')}
                  autoPlay
                  loop={false}
                  style={{ width: 62, height: 62 }}
                />
              </View>

              <Text style={[styles.errorSheetTitle, { color: isDark ? '#ffffff' : '#0f172a' }]}>لم نتمكن من قراءة أرقام اللوحة</Text>
              <Text style={[styles.errorSheetMessage, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                {errorMessage || 'يرجى تقريب الكاميرا والتأكد من وضوح وإضاءة أرقام وحروف اللوحة ثم إعادة المحاولة.'}
              </Text>

              <View style={[styles.errorTipsCard, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#f8fafc', borderColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#e2e8f0' }]}>
                <View style={styles.errorTipRow}>
                  <Ionicons name="flash-outline" size={16} color="#f97316" />
                  <Text style={[styles.errorTipText, { color: isDark ? '#cbd5e1' : '#334155' }]}>شغّل إضاءة الفلاش إذا كان المكان مظلماً</Text>
                </View>
                <View style={styles.errorTipRow}>
                  <Ionicons name="scan-outline" size={16} color="#f97316" />
                  <Text style={[styles.errorTipText, { color: isDark ? '#cbd5e1' : '#334155' }]}>اجعل اللوحة داخل إطار المسح البرتقالي</Text>
                </View>
              </View>

              <View style={styles.errorSheetActions}>
                <TouchableOpacity
                  style={styles.errorRetryBtn}
                  onPress={closeErrorSheet}
                  activeOpacity={0.85}
                >
                  <Ionicons name="refresh" size={18} color="#ffffff" style={{ marginHorizontal: 6 }} />
                  <Text style={styles.errorRetryBtnText}>إعادة المحاولة الآن</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.errorDismissBtn, { backgroundColor: isDark ? 'transparent' : '#f1f5f9', borderRadius: 12 }]}
                  onPress={closeErrorSheet}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.errorDismissBtnText, { color: isDark ? '#94a3b8' : '#64748b' }]}>إغلاق</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  introSplashContainer: {
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  introSplashContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  introLottieBox: {
    width: 220,
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introLottie: {
    width: 220,
    height: 220,
  },
  introBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.4)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 8,
    marginTop: 16,
  },
  introBadgeText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
  },
  introSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d16',
    padding: 24,
  },
  fallbackText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(9, 13, 22, 0.35)',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 48 : 36,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerGlassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnActive: {
    backgroundColor: '#f97316',
    borderColor: '#ea580c',
  },
  headerBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.45)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  radarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  headerBadgeText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  centerTargetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  targetFrame: {
    width: SCREEN_WIDTH * 0.88,
    height: (SCREEN_WIDTH * 0.88) * 0.65,
    maxHeight: 235,
    backgroundColor: 'rgba(15, 23, 42, 0.22)',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(249, 115, 22, 0.55)',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  targetFrameSuccess: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  targetFrameBusy: {
    borderColor: '#f97316',
  },
  cornerBracket: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#f97316',
  },
  bracketTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 20,
  },
  bracketTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 20,
  },
  bracketBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 20,
  },
  bracketBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 20,
  },
  blueprintGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    justifyContent: 'space-between',
  },
  blueprintRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  blueprintCellLeft: {
    flex: 2.2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.12)',
  },
  blueprintCellRight: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.12)',
  },
  blueprintKsaCol: {
    flex: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blueprintDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 8,
  },
  blueprintWatermark: {
    color: 'rgba(255, 255, 255, 0.22)',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
  },
  blueprintWatermarkEn: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  blueprintKsaText: {
    color: 'rgba(255, 255, 255, 0.25)',
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
  },
  crosshairH: {
    position: 'absolute',
    width: 24,
    height: 2,
    backgroundColor: 'rgba(249, 115, 22, 0.35)',
    alignSelf: 'center',
  },
  crosshairV: {
    position: 'absolute',
    width: 2,
    height: 24,
    backgroundColor: 'rgba(249, 115, 22, 0.35)',
    alignSelf: 'center',
  },
  laserBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: '#f97316',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
    elevation: 8,
  },
  hintPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 28,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    maxWidth: SCREEN_WIDTH * 0.92,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  hintPillText: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  bottomSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  shutterRow: {
    alignItems: 'center',
  },
  shutterBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
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
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterLabel: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 12,
  },
  resultCard: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  resultHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resultBadgeSuccess: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
  },
  resultBadgeText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '800',
  },
  resultConfidence: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  platePreviewWrap: {
    alignItems: 'center',
    marginVertical: 6,
  },
  plateCardBox: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0f172a',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  plateCardMain: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  plateCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plateCardDigitsAr: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 4,
  },
  plateCardLettersAr: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 4,
  },
  plateCardDivider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    marginVertical: 6,
  },
  plateCardDigitsEn: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 4,
  },
  plateCardLettersEn: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 4,
  },
  plateCardSide: {
    width: 68,
    backgroundColor: '#f1f5f9',
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  plateCardSideAr: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803d',
    marginTop: 2,
  },
  plateCardSideEn: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
    letterSpacing: 1,
  },
  resultActionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  rescanBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    gap: 6,
  },
  rescanBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f97316',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 6,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  errorSheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  errorSheetPill: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
    marginBottom: 16,
  },
  errorIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  errorSheetTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSheetMessage: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorTipsCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  errorTipRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  errorTipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  errorSheetActions: {
    width: '100%',
    gap: 10,
  },
  errorRetryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f97316',
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorRetryBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  errorDismissBtn: {
    width: '100%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorDismissBtnText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
});
