import { toArabicDigits } from '../../../utils/plateUtils';
import { PlateResultData, FleetPlateEntry } from '../types/plateScanner.types';
import { cleanAndNormalizeOcrLetters, formatPlateLetters } from './plateOcrMaps';
import {
  FLEET_PLATES_REGISTRY,
  registerVehicleInLocalFleet,
  getOcrSimilarityScore,
} from './plateFleetRegistry';

// Arabic letter combo signatures on Saudi motorcycle plates (2-letter combos)
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

// Detect if the raw OCR text explicitly contains a 3-letter car plate sequence (e.g., "STA" or "S T A")
export const detectExplicitThreeLetterCarPlate = (rawText: string): string => {
  if (!rawText) return '';
  const textWithAsciiDigits = rawText.replace(/[٠-٩]/g, (w) => {
    const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return `${ar.indexOf(w)}`;
  });

  const lines = textWithAsciiDigits.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const cleanLine = line
      .replace(/KSA|SAUDI|ARABIA|السعودية|المملكة/gi, ' ')
      .replace(/\b\d{1,4}\b/g, ' ')
      .trim();
    const tokens = cleanLine.split(/\s+/).filter(Boolean);
    let lineLetters = '';
    for (const tok of tokens) {
      if (/^\d+$/.test(tok)) continue;
      lineLetters += cleanAndNormalizeOcrLetters(tok);
    }
    if (lineLetters.length === 3) {
      return lineLetters;
    }
  }
  return '';
};

// Clean OCR text by completely stripping vertical/horizontal country identifier: "السعودية", "K S A", "KSA"
export const cleanOcrTextOfCountryStrip = (text: string): string => {
  if (!text) return '';
  let str = text;
  // 1. Remove Saudi / country headings
  str = str.replace(/السعودية|المملكة|العربية|SAUDI|ARABIA/gi, ' ');
  // 2. Remove horizontal KSA variations
  str = str.replace(/\bK\.?S\.?A\.?\b/gi, ' ');
  str = str.replace(/K\s*S\s*A/gi, ' ');
  // 3. Remove vertical isolated K, S, A lines from right strip
  const rawLines = str.split(/\r?\n/).map(l => l.trim()).filter(line => {
    const trimmed = line.toUpperCase();
    if (!trimmed) return false;
    if (['K', 'S', 'A', 'KSA', 'K S A', 'KS', 'SA'].includes(trimmed)) return false;
    if (/^[KSA\s\.\-_*]+$/i.test(trimmed)) return false;
    return true;
  });

  // 4. Clean trailing K or Arabic ك appended from the adjacent vertical KSA strip
  const cleanedLines = rawLines.map(l => {
    return l.replace(/(\b[A-Z]{2})\s+K$/i, '$1')
            .replace(/(\b[A-Z]{2})K$/i, '$1')
            .replace(/([\u0621-\u064A]{2})\s+ك$/i, '$1')
            .replace(/([\u0621-\u064A]{2})ك$/i, '$1');
  });

  return cleanedLines.join('\n');
};

// Disambiguate Old Classic Saudi Motorcycle Plates (3 digits + "ر ع")
export const matchOldSaudiMotorcyclePlate = (rawText: string, textWithAsciiDigits: string): PlateResultData | null => {
  if (!rawText) return null;

  // STRICT GUARD: If a 4-digit number is found, it is a modern plate, NEVER an old 3-digit plate!
  const hasFourDigits = /\b\d{4}\b/.test(textWithAsciiDigits) || /[٠-٩]{4}/.test(rawText);
  if (hasFourDigits) {
    return null;
  }

  const oldFleetDigits = ['602', '603', '605', '608', '651', '652', '653', '654'];
  const hasSaudiHeading = /السعودية|سعودية|المملكة/i.test(rawText);
  const hasRaCombo = /ر\s*ع|ع\s*ر|رع|عر/i.test(rawText) || /\b(RA|RE)\b/i.test(rawText);

  // 1. Direct search for exact 3-digit number
  for (const dig of oldFleetDigits) {
    const arDig = toArabicDigits(dig);
    const regexExact = new RegExp(`(^|\\D)${dig}(\\D|$)`);
    if (
      rawText.includes(arDig) ||
      regexExact.test(textWithAsciiDigits) ||
      (textWithAsciiDigits.includes(dig) && (hasSaudiHeading || hasRaCombo))
    ) {
      const entry = FLEET_PLATES_REGISTRY[dig] || {
        enDigits: dig,
        arDigits: arDig,
        enLetters: 'RA',
        arLetters: 'ر ع',
      };
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

  // 2. Standalone 3-digit shape confusion tokens ONLY (never substrings)
  const confusionMap: Record<string, string[]> = {
    '651': ['751', 'T51', '151'],
    '652': ['752', 'T52', '152'],
    '653': ['753', 'T53', '153'],
    '602': ['702', 'T02', '102'],
    '603': ['703', 'T03', '103'],
    '605': ['705', 'T05', '105'],
    '608': ['708', 'T08', '108'],
    '654': ['754', 'T54', '154'],
  };

  for (const [realDigit, patterns] of Object.entries(confusionMap)) {
    for (const pat of patterns) {
      const patRegex = new RegExp(`(^|\\D)${pat}(\\D|$)`);
      if (patRegex.test(textWithAsciiDigits)) {
        if (hasSaudiHeading || hasRaCombo || textWithAsciiDigits.length <= 10) {
          const entry = FLEET_PLATES_REGISTRY[realDigit];
          if (entry) {
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
  }

  return null;
};

// Helper to parse assigned motorcycle string e.g. "6541 ا د", "6541 AD", "6541"
export const parseAssignedPlateInfo = (
  assignedStr?: string
): { digits: string; arLetters: string; enLetters: string } | null => {
  if (!assignedStr || typeof assignedStr !== 'string') return null;
  const clean = assignedStr.trim();
  if (!clean) return null;

  const ascii = clean.replace(/[٠-٩]/g, (w) => `${['٠','١','٢','٣','٤','٥','٦','٧','٨','٩'].indexOf(w)}`);
  const digitsMatch = ascii.match(/\b\d{3,4}\b/) || ascii.match(/\d{3,4}/);
  const digits = digitsMatch ? digitsMatch[0] : '';
  if (!digits) return null;

  let arLetters = '';
  let enLetters = '';

  for (const combo in ARABIC_LETTER_COMBOS) {
    if (clean.includes(combo)) {
      arLetters = ARABIC_LETTER_COMBOS[combo].ar;
      enLetters = ARABIC_LETTER_COMBOS[combo].en;
      break;
    }
  }

  if (!enLetters) {
    const rawLatin = clean.replace(/[^a-zA-Z]/g, '').toUpperCase();
    if (rawLatin.length >= 2) {
      enLetters = rawLatin.slice(0, 2);
      arLetters = formatPlateLetters(enLetters).ar;
    }
  }

  return { digits, arLetters: arLetters || 'ا د', enLetters: enLetters || 'AD' };
};

// Find matching fleet plate from OCR text with exact + fuzzy matching, prioritizing the courier's assigned bike
export const findBestFleetPlateMatch = (rawText: string, assignedPlate?: string): PlateResultData | null => {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) return null;

  const cleanedText = cleanOcrTextOfCountryStrip(rawText);

  // Convert Arabic numerals to standard 0-9
  const textWithAsciiDigits = cleanedText.replace(/[٠-٩]/g, (w) => {
    const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return `${ar.indexOf(w)}`;
  });

  // Priority 0: Prioritize the courier's assigned motorcycle plate if provided
  const assignedInfo = parseAssignedPlateInfo(assignedPlate);
  if (assignedInfo && assignedInfo.digits) {
    const targetDig = assignedInfo.digits;
    if (!FLEET_PLATES_REGISTRY[targetDig]) {
      registerVehicleInLocalFleet(targetDig, assignedInfo.enLetters);
    }
    const assignedEntry = FLEET_PLATES_REGISTRY[targetDig];

    if (assignedEntry) {
      // 0a: Exact digits found in OCR text or spaced (e.g. "6541" or "6 5 4 1")
      const exactRegex = new RegExp(`(^|\\D)${targetDig}(\\D|$)`);
      const spacedRegex = new RegExp(targetDig.split('').join('\\s+'));
      if (
        exactRegex.test(textWithAsciiDigits) ||
        textWithAsciiDigits.includes(targetDig) ||
        spacedRegex.test(textWithAsciiDigits)
      ) {
        return {
          digits: assignedEntry.enDigits,
          letters: assignedEntry.arLetters,
          full_plate: `${assignedEntry.enDigits} ${assignedEntry.arLetters}`,
          arabic_digits: assignedEntry.arDigits,
          arabic_letters: assignedEntry.arLetters,
          english_letters: assignedEntry.enLetters,
        };
      }

      // 0b: Lookalike/fuzzy match for assigned digits (e.g. 6541 vs 6547/654I due to glare/scratch on the 1)
      const allTokens = textWithAsciiDigits.split(/[\s\r\n\t]+/).map((w) => w.trim()).filter(Boolean);
      for (const tok of allTokens) {
        const cleanTok = tok.replace(/[^A-Za-z0-9]/g, '');
        if (cleanTok.length >= 3 && cleanTok.length <= 5) {
          const sim = getOcrSimilarityScore(cleanTok, targetDig);
          if (sim >= 0.75 || (cleanTok.length === 4 && cleanTok.startsWith(targetDig.slice(0, 3)))) {
            return {
              digits: assignedEntry.enDigits,
              letters: assignedEntry.arLetters,
              full_plate: `${assignedEntry.enDigits} ${assignedEntry.arLetters}`,
              arabic_digits: assignedEntry.arDigits,
              arabic_letters: assignedEntry.arLetters,
              english_letters: assignedEntry.enLetters,
            };
          }
        }
      }
    }
  }

  // Extract detected Arabic letter combo if present
  let detectedCombo: { en: string; ar: string } | null = null;
  for (const combo in ARABIC_LETTER_COMBOS) {
    if (cleanedText.includes(combo)) {
      detectedCombo = ARABIC_LETTER_COMBOS[combo];
      break;
    }
  }

  // Check 1: Direct exact digit tokens in text against fleet
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

  // Check 3: Old Classic Saudi Motorcycle Plate Recognition (602, 603, 605, 608, 651, 652, 653, 654)
  const oldPlateMatch = matchOldSaudiMotorcyclePlate(cleanedText, textWithAsciiDigits);
  if (oldPlateMatch) {
    return oldPlateMatch;
  }

  // Check 4: Letter combo + partial digit disambiguation
  if (detectedCombo) {
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
