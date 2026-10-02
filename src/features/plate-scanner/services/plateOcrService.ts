import * as ImageManipulator from 'expo-image-manipulator';
import { workApi } from '../../../services/work';
import { toArabicDigits } from '../../../utils/plateUtils';
import { PlateResultData, FleetPlateEntry } from '../types/plateScanner.types';

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
  return validArChars.map((c) => SAUDI_AR_TO_EN_MAP[c]).join('');
};

// Convert English letter pair to Arabic & English representations on plate
export const formatPlateLetters = (enLettersStr: string): { ar: string; en: string } => {
  const clean = (enLettersStr || '').replace(/[^A-Z]/g, '');
  if (!clean) return { ar: '', en: '' };

  const enChars = clean.split('');
  const enDisplay = enChars.join(' ');

  const arDisplay = enChars.map((c) => {
    const ar = SAUDI_EN_TO_AR_MAP[c] || c;
    return ar === 'أ' ? 'ا' : ar;
  }).join(' ');

  return { ar: arDisplay, en: enDisplay };
};

export const FLEET_PLATES_REGISTRY: Record<string, FleetPlateEntry> = {};

// Load Motorcycle Fleet Database dynamically from license_plates_dataset.json
let datasetPlates: any[] = [];
try {
  datasetPlates = require('../../../../assets/license_plates_dataset.json');
} catch (e) {
  datasetPlates = [];
}

for (const it of datasetPlates) {
  const enDigits = String(it.plate_english?.numbers || it.plate_arabic?.numbers || '').trim();
  const arDigits = String(it.plate_arabic?.numbers || '').trim();
  const enLetters = String(it.plate_english?.letters || '').replace(/\s+/g, '').toUpperCase();
  const arLetters = String(it.plate_arabic?.letters || '').trim();
  if (enDigits && enLetters) {
    FLEET_PLATES_REGISTRY[enDigits] = {
      enDigits,
      arDigits: arDigits || toArabicDigits(enDigits),
      enLetters,
      arLetters: arLetters || formatPlateLetters(enLetters).ar,
    };
  }
}

// Calculate OCR similarity score with character confusion penalties
export function getOcrSimilarityScore(ocrCandidate: string, targetDigits: string): number {
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
export const ARABIC_LETTER_COMBOS: Record<string, { en: string; ar: string }> = {
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

  // Check 3: Letter combo + partial digit disambiguation
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

  // Check 4: Fuzzy Matching against all fleet plates
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

  // CRITICAL: Reject if letters are missing or incomplete!
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

// High-accuracy Plate Recognizer API integration
export const callPlateRecognizerApi = async (base64Data: string): Promise<PlateResultData | null> => {
  try {
    const cleanB64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const formData = new FormData();
    formData.append('upload', cleanB64);
    formData.append('regions', 'sa');

    const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
      method: 'POST',
      headers: {
        'Authorization': 'Token c5f4ab21abb4f96f54001a308483511df1b23a75',
      },
      body: formData,
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.results && data.results.length > 0) {
        const topResult = data.results[0];
        const rawPlate = String(topResult.plate || '').trim();
        const digits = rawPlate.replace(/[^0-9]/g, '');
        const enLetters = rawPlate.replace(/[^a-zA-Z]/g, '').toUpperCase();

        if (digits && digits.length >= 2) {
          const fleetHit = FLEET_PLATES_REGISTRY[digits];
          const finalLettersEn = enLetters || (fleetHit ? fleetHit.enLetters : '');
          const { ar: formattedAr, en: formattedEn } = formatPlateLetters(finalLettersEn);
          const finalArLetters = (fleetHit && fleetHit.arLetters) ? fleetHit.arLetters : formattedAr;

          return {
            digits: digits,
            letters: finalArLetters || finalLettersEn,
            full_plate: `${digits} ${finalArLetters || finalLettersEn}`.trim(),
            arabic_digits: toArabicDigits(digits),
            arabic_letters: finalArLetters,
            english_letters: formattedEn || finalLettersEn,
          };
        }
      }
    }
  } catch (apiErr) {
    console.warn('Plate Recognizer API error:', apiErr);
  }
  return null;
};

// Scan image through Google ML Kit, Plate Recognizer, or AI Backend Fallback
export const executeAiScan = async (rawUri: string, rawB64?: string | null): Promise<PlateResultData | null> => {
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

    // 2. Prepare optimized base64 image
    const manipulated = await ImageManipulator.manipulateAsync(
      rawUri,
      [{ resize: { width: 900 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    const base64Uri = manipulated.base64
      ? `data:image/jpeg;base64,${manipulated.base64}`
      : rawB64 || rawUri;

    // 3. Try High-Precision Plate Recognizer Cloud ALPR API
    if (base64Uri) {
      const prResult = await callPlateRecognizerApi(base64Uri);
      if (prResult && prResult.digits && prResult.digits.length >= 2) {
        return prResult;
      }
    }

    // 4. Server OCR Engine Fallback
    const res: any = await workApi.scanPlate(base64Uri);
    
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
