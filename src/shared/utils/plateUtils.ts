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
  middleAr?: string;
  rightAr: string;
  leftEn: string;
  middleEn?: string;
  rightEn: string;
  arSlots: string[];
  enSlots: string[];
  isThreeLetters: boolean;
}

export const getPlateLetterSlots = (input: string): PlateLetterSlots => {
  const clean = (input || '').trim();
  if (!clean) {
    return {
      leftAr: '',
      middleAr: '',
      rightAr: '',
      leftEn: '',
      middleEn: '',
      rightEn: '',
      arSlots: ['', ''],
      enSlots: ['', ''],
      isThreeLetters: false,
    };
  }

  // Normalize multi-char Arabic 'هـ' into single char 'ه' before splitting into characters
  const normalizedClean = clean.replace(/هـ/g, 'ه');
  const rawChars = normalizedClean.replace(/[\s\-_]/g, '').split('');
  if (rawChars.length === 0) {
    return {
      leftAr: '',
      middleAr: '',
      rightAr: '',
      leftEn: '',
      middleEn: '',
      rightEn: '',
      arSlots: ['', ''],
      enSlots: ['', ''],
      isThreeLetters: false,
    };
  }

  // Canonical pair handling ONLY for 2-letter motorcycle plates:
  if (rawChars.length === 2) {
    // 1. BE / ب ع (e.g. 7030, 8022): Left is ALWAYS B / ب, Right is ALWAYS E / ع
    if (
      (rawChars.includes('B') && rawChars.includes('E')) ||
      (rawChars.includes('ب') && rawChars.includes('ع')) ||
      /^(?:BE|EB|ب\s*ع|ع\s*ب)$/i.test(normalizedClean)
    ) {
      return {
        leftAr: 'ب',
        middleAr: '',
        rightAr: 'ع',
        leftEn: 'B',
        middleEn: '',
        rightEn: 'E',
        arSlots: ['ب', 'ع'],
        enSlots: ['B', 'E'],
        isThreeLetters: false,
      };
    }

    // 2. AJ / ا ح (e.g. 5443, 5442): Left is ALWAYS A / ا, Right is ALWAYS J / ح
    if (
      (rawChars.includes('A') && rawChars.includes('J')) ||
      ((rawChars.includes('ا') || rawChars.includes('أ')) && rawChars.includes('ح')) ||
      /^(?:AJ|JA|[اأ]\s*ح|ح\s*[اأ])$/i.test(normalizedClean)
    ) {
      return {
        leftAr: 'ا',
        middleAr: '',
        rightAr: 'ح',
        leftEn: 'A',
        middleEn: '',
        rightEn: 'J',
        arSlots: ['ا', 'ح'],
        enSlots: ['A', 'J'],
        isThreeLetters: false,
      };
    }

    // 3. AD / ا د (e.g. 6534, 6531): Left is ALWAYS A / ا, Right is ALWAYS D / د
    if (
      (rawChars.includes('A') && rawChars.includes('D')) ||
      ((rawChars.includes('ا') || rawChars.includes('أ')) && rawChars.includes('د')) ||
      /^(?:AD|DA|[اأ]\s*د|د\s*[اأ])$/i.test(normalizedClean)
    ) {
      return {
        leftAr: 'ا',
        middleAr: '',
        rightAr: 'د',
        leftEn: 'A',
        middleEn: '',
        rightEn: 'D',
        arSlots: ['ا', 'د'],
        enSlots: ['A', 'D'],
        isThreeLetters: false,
      };
    }

    // 4. BT / ب ط (e.g. 6241, 6238): Left is ALWAYS B / ب, Right is ALWAYS T / ط
    if (
      (rawChars.includes('B') && rawChars.includes('T')) ||
      (rawChars.includes('ب') && rawChars.includes('ط')) ||
      /^(?:BT|TB|ب\s*ط|ط\s*ب)$/i.test(normalizedClean)
    ) {
      return {
        leftAr: 'ب',
        middleAr: '',
        rightAr: 'ط',
        leftEn: 'B',
        middleEn: '',
        rightEn: 'T',
        arSlots: ['ب', 'ط'],
        enSlots: ['B', 'T'],
        isThreeLetters: false,
      };
    }

    // 5. RA / ر ع (e.g. 651): Left is ALWAYS R / ر, Right is ALWAYS A / ع
    if (
      (rawChars.includes('R') && (rawChars.includes('A') || rawChars.includes('E'))) || (rawChars.includes('ر') && rawChars.includes('ع')) || /^(?:RA|AR|RE|ER|ر\s*ع|ع\s*ر)$/i.test(normalizedClean)
    ) {
      return {
        leftAr: 'ر',
        middleAr: '',
        rightAr: 'ع',
        leftEn: 'R',
        middleEn: '',
        rightEn: 'A',
        arSlots: ['ر', 'ع'],
        enSlots: ['R', 'A'],
        isThreeLetters: false,
      };
    }
  }

  const isInputArabic = rawChars.some((c) => AR_TO_EN_LETTERS[c]);
  const normalizeArChar = (ch: string) => (ch === 'أ' || ch === 'إ' || ch === 'آ' ? 'ا' : ch);

  if (isInputArabic) {
    const ar1 = normalizeArChar(rawChars[0]);
    const ar2 = rawChars[1] ? normalizeArChar(rawChars[1]) : '';
    const ar3 = rawChars[2] ? normalizeArChar(rawChars[2]) : '';
    const en1 = AR_TO_EN_LETTERS[ar1] || ar1;
    const en2 = ar2 ? (AR_TO_EN_LETTERS[ar2] || ar2) : '';
    const en3 = ar3 ? (AR_TO_EN_LETTERS[ar3] || ar3) : '';

    if (ar3) {
      return {
        leftAr: ar1,
        middleAr: ar2,
        rightAr: ar3,
        leftEn: en1,
        middleEn: en2,
        rightEn: en3,
        arSlots: [ar1, ar2, ar3],
        enSlots: [en1, en2, en3],
        isThreeLetters: true,
      };
    }

    return {
      leftAr: ar1,
      middleAr: '',
      rightAr: ar2,
      leftEn: en1,
      middleEn: '',
      rightEn: en2,
      arSlots: [ar1, ar2],
      enSlots: [en1, en2],
      isThreeLetters: false,
    };
  } else {
    const en1 = rawChars[0].toUpperCase();
    const en2 = rawChars[1] ? rawChars[1].toUpperCase() : '';
    const en3 = rawChars[2] ? rawChars[2].toUpperCase() : '';
    const ar1 = normalizeArChar(EN_TO_AR_LETTERS[en1] || en1);
    const ar2 = en2 ? normalizeArChar(EN_TO_AR_LETTERS[en2] || en2) : '';
    const ar3 = en3 ? normalizeArChar(EN_TO_AR_LETTERS[en3] || en3) : '';

    if (en3) {
      return {
        leftAr: ar1,
        middleAr: ar2,
        rightAr: ar3,
        leftEn: en1,
        middleEn: en2,
        rightEn: en3,
        arSlots: [ar1, ar2, ar3],
        enSlots: [en1, en2, en3],
        isThreeLetters: true,
      };
    }

    return {
      leftAr: ar1,
      middleAr: '',
      rightAr: ar2,
      leftEn: en1,
      middleEn: '',
      rightEn: en2,
      arSlots: [ar1, ar2],
      enSlots: [en1, en2],
      isThreeLetters: false,
    };
  }
};

export const convertLettersToBoth = (input: string): { ar: string; en: string } => {
  const slots = getPlateLetterSlots(input);
  return {
    ar: slots.arSlots.filter(Boolean).join(' '),
    en: slots.enSlots.filter(Boolean).join(' '),
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
 * Format bike / motorcycle / car plate for display based on user language.
 * - Arabic ('ar'): displays Arabic plate format e.g. "7030 ب ع" or "2459 س ط ا"
 * - English / Urdu / Bengali ('en' | 'ur' | 'bn'): displays English plate format e.g. "7030 B E" or "2459 S T A"
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
    const arLetters = slots.arSlots.filter(Boolean).join(' ');
    if (digits && arLetters) {
      return `${digits} ${arLetters}`;
    }
    return clean;
  } else {
    // English, Urdu, Bengali: display in English digits and Latin letters (e.g. "7030 B E" or "2459 S T A")
    const enLetters = slots.enSlots.filter(Boolean).join(' ');
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
