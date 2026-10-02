/**
 * Central Plate Utilities & Conversion Maps
 * Adheres to Clean Architecture and DRY principles.
 */

export const AR_TO_EN_LETTERS: Record<string, string> = {
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

export const EN_TO_AR_LETTERS: Record<string, string> = {
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

export interface PlateLetterSlots {
  leftAr: string;
  rightAr: string;
  leftEn: string;
  rightEn: string;
}

export const getPlateLetterSlots = (input: string): PlateLetterSlots => {
  const clean = (input || '').trim();
  if (!clean) return { leftAr: '', rightAr: '', leftEn: '', rightEn: '' };

  const rawChars = clean.replace(/[\s\-_]/g, '').split('');
  if (rawChars.length === 0) return { leftAr: '', rightAr: '', leftEn: '', rightEn: '' };

  // Canonical pair handling for 100% flawless letter positioning on physical plate:
  // 1. BE / ب ع (e.g. 7030, 8022): Left is ALWAYS B / ب, Right is ALWAYS E / ع
  if (
    (rawChars.includes('B') && rawChars.includes('E')) ||
    (rawChars.includes('ب') && rawChars.includes('ع')) ||
    /BE|EB|ب ع|ع ب|بع|عب/i.test(clean)
  ) {
    return { leftAr: 'ب', rightAr: 'ع', leftEn: 'B', rightEn: 'E' };
  }

  // 2. AJ / ا ح (e.g. 5443, 5442): Left is ALWAYS A / ا, Right is ALWAYS J / ح
  if (
    (rawChars.includes('A') && rawChars.includes('J')) ||
    ((rawChars.includes('ا') || rawChars.includes('أ')) && rawChars.includes('ح')) ||
    /AJ|JA|ا ح|ح ا|اح|حا|أ ح|ح أ/i.test(clean)
  ) {
    return { leftAr: 'ا', rightAr: 'ح', leftEn: 'A', rightEn: 'J' };
  }

  // 3. AD / ا د (e.g. 6534, 6531): Left is ALWAYS A / ا, Right is ALWAYS D / د
  if (
    (rawChars.includes('A') && rawChars.includes('D')) ||
    ((rawChars.includes('ا') || rawChars.includes('أ')) && rawChars.includes('د')) ||
    /AD|DA|ا د|د ا|اد|دا|أ د|د أ/i.test(clean)
  ) {
    return { leftAr: 'ا', rightAr: 'د', leftEn: 'A', rightEn: 'D' };
  }

  // 4. BT / ب ط (e.g. 6241, 6238): Left is ALWAYS B / ب, Right is ALWAYS T / ط
  if (
    (rawChars.includes('B') && rawChars.includes('T')) ||
    (rawChars.includes('ب') && rawChars.includes('ط')) ||
    /BT|TB|ب ط|ط ب|بط|طب/i.test(clean)
  ) {
    return { leftAr: 'ب', rightAr: 'ط', leftEn: 'B', rightEn: 'T' };
  }

  // 5. RA / ر ع (e.g. 651): Left is ALWAYS R / ر, Right is ALWAYS A / ع
  if (
    (rawChars.includes('R') && rawChars.includes('A')) ||
    (rawChars.includes('ر') && rawChars.includes('ع')) ||
    /RA|AR|ر ع|ع ر|رع|عر/i.test(clean)
  ) {
    return { leftAr: 'ر', rightAr: 'ع', leftEn: 'R', rightEn: 'A' };
  }

  const isInputArabic = rawChars.some((c) => AR_TO_EN_LETTERS[c]);

  if (isInputArabic) {
    const ar1 = rawChars[0] === 'أ' || rawChars[0] === 'إ' ? 'ا' : rawChars[0];
    const ar2 = rawChars[1] ? (rawChars[1] === 'أ' || rawChars[1] === 'إ' ? 'ا' : rawChars[1]) : '';
    const en1 = AR_TO_EN_LETTERS[ar1] || ar1;
    const en2 = ar2 ? (AR_TO_EN_LETTERS[ar2] || ar2) : '';
    return { leftAr: ar1, rightAr: ar2, leftEn: en1, rightEn: en2 };
  } else {
    const en1 = rawChars[0].toUpperCase();
    const en2 = rawChars[1] ? rawChars[1].toUpperCase() : '';
    const ar1 = EN_TO_AR_LETTERS[en1] || en1;
    const ar2 = en2 ? (EN_TO_AR_LETTERS[en2] || en2) : '';
    return {
      leftAr: ar1 === 'أ' || ar1 === 'إ' ? 'ا' : ar1,
      rightAr: ar2 === 'أ' || ar2 === 'إ' ? 'ا' : ar2,
      leftEn: en1,
      rightEn: en2,
    };
  }
};

export const convertLettersToBoth = (input: string): { ar: string; en: string } => {
  const slots = getPlateLetterSlots(input);
  return {
    ar: [slots.leftAr, slots.rightAr].filter(Boolean).join(' '),
    en: [slots.leftEn, slots.rightEn].filter(Boolean).join(' '),
  };
};

export const parsePlateComponents = (raw: string): { digits: string; letters: string } => {
  const normalized = toEnglishDigits(raw || '');
  const digitsMatch = normalized.match(/\d+/g);
  const digits = digitsMatch ? digitsMatch.join('') : '';
  const letters = normalized.replace(/[0-9٠-٩\-_/]/g, ' ').replace(/\s+/g, ' ').trim();
  return { digits, letters };
};

export const getAlignedDigits = (englishDigits: string) => {
  const clean = (englishDigits || '').replace(/\D/g, '');
  const padded = clean.padEnd(4, ' ');
  const enArray = padded.split('').slice(0, 4);
  const arArray = enArray.map((d) => (d === ' ' ? ' ' : toArabicDigits(d)));
  return { enArray, arArray, isEmptyDigits: !clean };
};

/**
 * Format bike / motorcycle plate for display based on user language.
 * - Arabic ('ar'): displays Arabic plate format e.g. "7030 ب ع"
 * - English / Urdu / Bengali ('en' | 'ur' | 'bn'): displays English plate format e.g. "7030 BE"
 */
export const formatBikePlateForDisplay = (
  raw: string | undefined | null,
  lang: string = 'ar'
): string => {
  if (!raw) return '—';
  const clean = raw.trim();
  if (!clean || clean === '—') return '—';

  const { digits, letters } = parsePlateComponents(clean);
  const slots = getPlateLetterSlots(letters);

  if (lang === 'ar') {
    const arLetters = [slots.leftAr, slots.rightAr].filter(Boolean).join(' ');
    if (digits && arLetters) {
      return `${digits} ${arLetters}`;
    }
    return clean;
  } else {
    // English, Urdu, Bengali: display in English digits and Latin letters (e.g. "7030 BE")
    const enLetters = [slots.leftEn, slots.rightEn].filter(Boolean).join(' ');
    if (digits && enLetters) {
      return `${digits} ${enLetters}`;
    }
    const enConverted = clean
      .split('')
      .map((char) => AR_TO_EN_LETTERS[char] || char)
      .join('');
    return toEnglishDigits(enConverted);
  }
};

