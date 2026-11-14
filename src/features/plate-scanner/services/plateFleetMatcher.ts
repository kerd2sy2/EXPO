import { toArabicDigits } from '../../../utils/plateUtils';
import { PlateResultData, FleetPlateEntry } from '../types/plateScanner.types';
import {
  ARABIC_LETTER_COMBOS,
  FLEET_PLATES_REGISTRY,
  cleanAndNormalizeOcrLetters,
  formatPlateLetters,
  parseArabicLetters,
} from './plateOcrMaps';

export function getOcrSimilarityScore(ocrCandidate: string, targetDigits: string): number {
  if (ocrCandidate === targetDigits) return 1.0;
  if (!ocrCandidate || !targetDigits) return 0.0;

  const normalizeOcrDigits = (s: string) =>
    s
      .toUpperCase()
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
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  const dist = dp[m][n];
  const maxLen = Math.max(m, n);
  if (maxLen === 0) return 1.0;
  return Math.max(0, 1.0 - dist / maxLen);
}

function buildPlateResultFromEntry(entry: FleetPlateEntry): PlateResultData {
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

export const findBestFleetPlateMatch = (rawText: string): PlateResultData | null => {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length === 0) return null;

  const textWithAsciiDigits = rawText.replace(/[٠-٩]/g, (w) => {
    const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return `${ar.indexOf(w)}`;
  });

  let detectedCombo: { en: string; ar: string } | null = null;
  for (const combo in ARABIC_LETTER_COMBOS) {
    if (rawText.includes(combo)) {
      detectedCombo = ARABIC_LETTER_COMBOS[combo];
      break;
    }
  }

  const digitTokens = textWithAsciiDigits.match(/\b\d{1,4}\b/g) || [];
  for (const dig of digitTokens) {
    if (FLEET_PLATES_REGISTRY[dig]) {
      return buildPlateResultFromEntry(FLEET_PLATES_REGISTRY[dig]);
    }
  }

  const embeddedMatches = textWithAsciiDigits.match(/\d{3,4}/g) || [];
  for (const emb of embeddedMatches) {
    if (FLEET_PLATES_REGISTRY[emb]) {
      return buildPlateResultFromEntry(FLEET_PLATES_REGISTRY[emb]);
    }
  }

  if (detectedCombo) {
    if (
      detectedCombo.en === 'RA' &&
      (/151|651|51|15|653/.test(textWithAsciiDigits) ||
        rawText.includes('٦٥١') ||
        rawText.includes('١٥١'))
    ) {
      const entry = FLEET_PLATES_REGISTRY['651'] || {
        enDigits: '651',
        arDigits: '٦٥١',
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

    for (const enNum in FLEET_PLATES_REGISTRY) {
      const entry = FLEET_PLATES_REGISTRY[enNum];
      if (entry.enLetters === detectedCombo.en || entry.arLetters === detectedCombo.ar) {
        if (
          textWithAsciiDigits.includes(enNum) ||
          (enNum.length >= 3 && textWithAsciiDigits.includes(enNum.slice(-3)))
        ) {
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

  const words = textWithAsciiDigits
    .split(/[\s\r\n\t]+/)
    .map((w) => w.trim())
    .filter(Boolean);
  let bestEntry: FleetPlateEntry | null = null;
  let bestScore = 0;

  for (const word of words) {
    const cleanWord = word.replace(/[^A-Za-z0-9]/g, '');
    if (cleanWord.length < 3 || cleanWord.length > 5) continue;

    for (const enNum in FLEET_PLATES_REGISTRY) {
      const score = getOcrSimilarityScore(cleanWord, enNum);
      if (score > bestScore && score >= 0.8) {
        bestScore = score;
        bestEntry = FLEET_PLATES_REGISTRY[enNum];
      }
    }
  }

  if (bestEntry && bestScore >= 0.8) {
    return buildPlateResultFromEntry(bestEntry);
  }

  return null;
};

export const parseMLKitPlateText = (text: string): PlateResultData | null => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return null;

  const fleetMatch = findBestFleetPlateMatch(text);
  if (fleetMatch) {
    return fleetMatch;
  }

  const normalizedText = (text || '').replace(/[٠-٩]/g, (w) => {
    const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return `${ar.indexOf(w)}`;
  });

  const lines = normalizedText
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const allDigitMatches = normalizedText.match(/\b\d{3,4}\b/g) || [];
  const filteredDigits = allDigitMatches.filter(
    (d) => !['2024', '2025', '2026', '2027', '1000', '100'].includes(d)
  );

  let detectedDigits = '';
  if (filteredDigits.length > 0) {
    detectedDigits = filteredDigits[0];
  } else {
    const embeddedNum = normalizedText.match(/\d{3,4}/);
    if (embeddedNum) {
      detectedDigits = embeddedNum[0];
    }
  }

  if (!detectedDigits || detectedDigits.length < 3) {
    return null;
  }

  let detectedEnLetters = '';

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
      if (norm) collectedLetters += norm;
      if (collectedLetters.length >= 2) {
        detectedEnLetters = collectedLetters.slice(0, 2);
        break;
      }
    }
  }

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
