import { toArabicDigits } from '../../../utils/plateUtils';
import { FleetPlateEntry } from '../types/plateScanner.types';
import { formatPlateLetters } from './plateOcrMaps';

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
  let enLetters = String(it.plate_english?.letters || '').replace(/\s+/g, '').toUpperCase();
  const arLetters = String(it.plate_arabic?.letters || '').trim();
  if (!enLetters && arLetters) {
    if (arLetters === 'ر ع' || arLetters === 'رع') enLetters = 'RA';
    else if (arLetters === 'ط ب' || arLetters === 'طب') enLetters = 'BT';
    else if (arLetters === 'د ا' || arLetters === 'دا' || arLetters === 'ا د' || arLetters === 'اد') enLetters = 'AD';
    else if (arLetters === 'ا ح' || arLetters === 'اح' || arLetters === 'أ ح' || arLetters === 'أح') enLetters = 'AJ';
    else if (arLetters === 'ع ب' || arLetters === 'عب') enLetters = 'BE';
  }
  if (enDigits && (enLetters || arLetters)) {
    FLEET_PLATES_REGISTRY[enDigits] = {
      enDigits,
      arDigits: arDigits || toArabicDigits(enDigits),
      enLetters: enLetters || 'RA',
      arLetters: arLetters || (enLetters ? formatPlateLetters(enLetters).ar : 'ر ع'),
    };
  }
}

// Dynamically register a newly discovered or scanned vehicle into local memory
export const registerVehicleInLocalFleet = (digits: string, letters: string) => {
  if (!digits) return;
  const cleanDigits = String(digits).trim();
  const { ar: formattedAr, en: formattedEn } = formatPlateLetters(letters);
  FLEET_PLATES_REGISTRY[cleanDigits] = {
    enDigits: cleanDigits,
    arDigits: toArabicDigits(cleanDigits),
    enLetters: formattedEn || letters,
    arLetters: formattedAr || letters,
  };
};

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
