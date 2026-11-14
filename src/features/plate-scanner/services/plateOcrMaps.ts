import { toArabicDigits } from '../../../utils/plateUtils';
import { FleetPlateEntry } from '../types/plateScanner.types';

export const SAUDI_EN_TO_AR_MAP: Record<string, string> = {
  A: 'أ',
  B: 'ب',
  J: 'ح',
  D: 'د',
  R: 'ر',
  S: 'س',
  X: 'ص',
  T: 'ط',
  E: 'ع',
  G: 'ق',
  K: 'ك',
  L: 'ل',
  Z: 'م',
  N: 'ن',
  H: 'هـ',
  U: 'و',
  V: 'ى',
  M: 'م',
  Y: 'ى',
  Q: 'ق',
};

export const SAUDI_AR_TO_EN_MAP: Record<string, string> = {
  أ: 'A', ا: 'A', إ: 'A', آ: 'A', ء: 'A',
  ب: 'B',
  ح: 'J',
  د: 'D', ذ: 'D',
  ر: 'R', ز: 'R',
  س: 'S', ش: 'S',
  ص: 'X', ض: 'X',
  ط: 'T', ظ: 'T',
  ع: 'E', غ: 'E',
  ق: 'G', ف: 'G',
  ك: 'K',
  ل: 'L',
  م: 'Z',
  ن: 'N',
  هـ: 'H', ه: 'H', ة: 'H',
  و: 'U',
  ى: 'V', ي: 'V', ئ: 'V',
};

export const ARABIC_LETTER_COMBOS: Record<string, { en: string; ar: string }> = {
  'ر ع': { en: 'RA', ar: 'ر ع' },
  'ع ر': { en: 'RA', ar: 'ر ع' },
  'رع': { en: 'RA', ar: 'ر ع' },
  'عر': { en: 'RA', ar: 'ر ع' },
  'ط ب': { en: 'BT', ar: 'ط ب' },
  'ب ط': { en: 'BT', ar: 'ط ب' },
  'طب': { en: 'BT', ar: 'ط ب' },
  'بط': { en: 'BT', ar: 'ط ب' },
  'ا ح': { en: 'AJ', ar: 'ا ح' },
  'ح ا': { en: 'AJ', ar: 'ا ح' },
  'اح': { en: 'AJ', ar: 'ا ح' },
  'حا': { en: 'AJ', ar: 'ا ح' },
  'أ ح': { en: 'AJ', ar: 'ا ح' },
  'ح أ': { en: 'AJ', ar: 'ا ح' },
  'ا د': { en: 'AD', ar: 'ا د' },
  'د ا': { en: 'AD', ar: 'ا د' },
  'اد': { en: 'AD', ar: 'ا د' },
  'دا': { en: 'AD', ar: 'ا د' },
  'أ د': { en: 'AD', ar: 'ا د' },
  'د أ': { en: 'AD', ar: 'ا د' },
  'ع ب': { en: 'BE', ar: 'ع ب' },
  'ب ع': { en: 'BE', ar: 'ع ب' },
  'عب': { en: 'BE', ar: 'ع ب' },
  'بع': { en: 'BE', ar: 'ع ب' },
};

const METAL_SUBSTITUTIONS: [RegExp, string][] = [
  [/4D/g, 'AD'], [/8T/g, 'BT'], [/8E/g, 'BE'], [/8R/g, 'BR'],
  [/8D/g, 'BD'], [/8B/g, 'BB'], [/B7/g, 'BT'], [/87/g, 'BT'],
  [/4J/g, 'AJ'], [/A1/g, 'AJ'], [/41/g, 'AJ'], [/4O/g, 'AD'],
  [/40/g, 'AD'], [/AO/g, 'AD'], [/A0/g, 'AD'], [/K5/g, 'KS'],
  [/5L/g, 'SL'], [/5B/g, 'SB'], [/5R/g, 'SR'], [/5T/g, 'ST'],
  [/1D/g, 'AD'], [/1T/g, 'AT'], [/1E/g, 'AE'], [/1B/g, 'AB'],
  [/1R/g, 'AR'], [/1S/g, 'AS'], [/1X/g, 'AX'], [/1K/g, 'AK'],
  [/1L/g, 'AL'], [/1Z/g, 'AZ'], [/1N/g, 'AN'], [/1H/g, 'AH'],
  [/1U/g, 'AU'], [/1V/g, 'AV'], [/H0/g, 'HD'], [/HO/g, 'HD'],
  [/B0/g, 'BD'], [/BO/g, 'BD'], [/R0/g, 'RD'], [/RO/g, 'RD'],
  [/S0/g, 'SD'], [/SO/g, 'SD'], [/T0/g, 'TD'], [/TO/g, 'TD'],
  [/E0/g, 'ED'], [/EO/g, 'ED'], [/K0/g, 'KD'], [/KO/g, 'KD'],
  [/L0/g, 'LD'], [/LO/g, 'LD'], [/Z0/g, 'ZD'], [/ZO/g, 'ZD'],
  [/N0/g, 'ND'], [/NO/g, 'ND'], [/U0/g, 'UD'], [/UO/g, 'UD'],
  [/V0/g, 'VD'], [/VO/g, 'VD'], [/J0/g, 'JD'], [/JO/g, 'JD'],
  [/G0/g, 'GD'], [/GO/g, 'GD'],
];

export const cleanAndNormalizeOcrLetters = (raw: string): string => {
  if (!raw) return '';
  let str = raw.toUpperCase().trim();

  if (/^(KSA|SAUDI|ARABIA|MIN|MAX|KM|NO|OK|K\.S\.A)$/i.test(str)) {
    return '';
  }

  str = str.replace(/[^A-Z0-9]/g, '');
  if (/^\d+$/.test(str)) return '';

  for (const [pattern, replacement] of METAL_SUBSTITUTIONS) {
    str = str.replace(pattern, replacement);
  }

  if (str === '4') str = 'A';
  if (str === '8') str = 'B';
  if (str === '5') str = 'S';

  str = str.replace(/M/g, 'Z').replace(/Y/g, 'V').replace(/Q/g, 'G');
  str = str.replace(/[^ABJDRSXTEGKLZNHUV]/g, '');

  return str;
};

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

export const formatPlateLetters = (enLettersStr: string): { ar: string; en: string } => {
  const clean = (enLettersStr || '').replace(/[^A-Z]/g, '');
  if (!clean) return { ar: '', en: '' };

  const enChars = clean.split('');
  const enDisplay = enChars.join(' ');
  const arDisplay = enChars
    .map((c) => {
      const ar = SAUDI_EN_TO_AR_MAP[c] || c;
      return ar === 'أ' ? 'ا' : ar;
    })
    .join(' ');

  return { ar: arDisplay, en: enDisplay };
};

export const FLEET_PLATES_REGISTRY: Record<string, FleetPlateEntry> = {};

let datasetPlates: any[] = [];
try {
  datasetPlates = require('../../../../assets/license_plates_dataset.json');
} catch {
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
