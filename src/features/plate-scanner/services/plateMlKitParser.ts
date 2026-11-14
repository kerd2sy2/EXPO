import { toArabicDigits } from '../../../utils/plateUtils';
import { PlateResultData } from '../types/plateScanner.types';
import {
  cleanAndNormalizeOcrLetters,
  parseArabicLetters,
  formatPlateLetters,
} from './plateOcrMaps';
import { registerVehicleInLocalFleet } from './plateFleetRegistry';
import {
  ARABIC_LETTER_COMBOS,
  cleanOcrTextOfCountryStrip,
  findBestFleetPlateMatch,
} from './plateFleetMatcher';

// Flexible Character-by-Character Plate Parser for Google ML Kit (Supports 2-letter Motorcycle & 3-letter Car plates)
export const parseMLKitPlateText = (text: string, assignedPlate?: string): PlateResultData | null => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return null;

  // Pre-clean text of all vertical/horizontal country markings (K S A, السعودية)
  const cleanedText = cleanOcrTextOfCountryStrip(text);

  // 1. Check Fleet Database first (with assigned plate priority!)
  const fleetMatch = findBestFleetPlateMatch(cleanedText, assignedPlate);
  if (fleetMatch) {
    return fleetMatch;
  }

  // 2. Convert Arabic numerals to standard English digits and collapse spaced digits (e.g. "6 5 4 7" -> "6547")
  const textWithAsciiDigits = cleanedText
    .replace(/[٠-٩]/g, (w) => {
      const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
      return `${ar.indexOf(w)}`;
    })
    .replace(/(?<=\b\d)\s+(?=\d\b)/g, '');

  const lines = textWithAsciiDigits.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);

  // 3. Extract Digits (4 digits for modern motorcycles/cars, or 3 digits for old plates)
  const all4Matches = textWithAsciiDigits.match(/\b\d{4}\b/g) || [];
  const filtered4 = all4Matches.filter((d) => !['2024', '2025', '2026', '2027', '1000'].includes(d));

  let detectedDigits = '';
  if (filtered4.length > 0) {
    detectedDigits = filtered4[0];
  } else {
    const all3Matches = textWithAsciiDigits.match(/\b\d{3}\b/g) || [];
    const filtered3 = all3Matches.filter((d) => !['100'].includes(d));
    if (filtered3.length > 0) {
      detectedDigits = filtered3[0];
    } else {
      const embeddedNum = textWithAsciiDigits.match(/\d{3,4}/);
      if (embeddedNum) {
        detectedDigits = embeddedNum[0];
      }
    }
  }

  // Reject incomplete numbers (less than 3 digits)
  if (!detectedDigits || detectedDigits.length < 3) {
    return null;
  }

  // Check if car (the only 3-letter plate in system is 2459 STA)
  const isCar = detectedDigits === '2459' || /STA|س\s*ط\s*ا/i.test(cleanedText);

  // 4. Extract Letters (Motorcycles = STRICTLY 2 letters, Cars = 3 letters)
  let detectedEnLetters = '';

  // Priority 1: Check known 2-letter motorcycle combos in Arabic
  for (const combo in ARABIC_LETTER_COMBOS) {
    if (cleanedText.includes(combo)) {
      detectedEnLetters = ARABIC_LETTER_COMBOS[combo].en;
      break;
    }
  }

  // Strategy A: Check lines containing the detected digits e.g. "6547 AD"
  if (!detectedEnLetters || detectedEnLetters.length < 2) {
    for (const line of lines) {
      const cleanLine = line.replace(/KSA|SAUDI|ARABIA|السعودية|المملكة|العربية/gi, '').trim();
      if (cleanLine.includes(detectedDigits)) {
        const remainder = cleanLine.replace(detectedDigits, '').trim();
        const norm = cleanAndNormalizeOcrLetters(remainder);
        if (!isCar) {
          if (norm.length >= 2) {
            const cand = norm.slice(0, 2);
            if (!['KS', 'SA', 'KA'].includes(cand)) {
              detectedEnLetters = cand;
              break;
            }
          }
        } else {
          if (norm.length >= 3) {
            detectedEnLetters = norm.slice(0, 3);
            break;
          }
        }
      }
    }
  }

  // Strategy A2: Check each line for a clean 2-letter block (for motorcycles) or 3-letter (for car)
  if (!detectedEnLetters || detectedEnLetters.length < 2) {
    for (const line of lines) {
      const cleanLine = line
        .replace(/KSA|SAUDI|ARABIA|السعودية|المملكة|العربية/gi, ' ')
        .replace(detectedDigits, ' ')
        .replace(/\b\d+\b/g, ' ')
        .trim();
      if (!cleanLine) continue;

      const lineTokens = cleanLine.split(/\s+/).filter(Boolean);
      let lineCollected = '';
      for (const tok of lineTokens) {
        lineCollected += cleanAndNormalizeOcrLetters(tok);
      }
      if (!isCar) {
        // Motorcycle: MUST BE EXACTLY 2 LETTERS
        if (lineCollected.length >= 2) {
          const cand = lineCollected.slice(0, 2);
          if (!['KS', 'SA', 'KA'].includes(cand)) {
            detectedEnLetters = cand;
            break; // Stop immediately! Never take a 3rd letter for a motorcycle!
          }
        }
      } else {
        if (lineCollected.length >= 3) {
          detectedEnLetters = lineCollected.slice(0, 3);
          break;
        }
      }
    }
  }

  // Strategy B: Collect individual Latin letter tokens across lines
  if (!detectedEnLetters || detectedEnLetters.length < 2) {
    const rawTokens = textWithAsciiDigits
      .replace(/KSA|SAUDI|ARABIA|السعودية|المملكة|العربية/gi, ' ')
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
      if (!isCar && collectedLetters.length >= 2) {
        const cand = collectedLetters.slice(0, 2);
        if (!['KS', 'SA', 'KA'].includes(cand)) {
          detectedEnLetters = cand;
          break;
        }
      } else if (isCar && collectedLetters.length >= 3) {
        detectedEnLetters = collectedLetters.slice(0, 3);
        break;
      }
    }

    if (!detectedEnLetters && collectedLetters.length >= 2) {
      const cand = collectedLetters.slice(0, isCar ? 3 : 2);
      if (!['KS', 'SA', 'KA'].includes(cand)) {
        detectedEnLetters = cand;
      }
    }
  }

  // Strategy C: Extract from Arabic characters if English was not clear
  if (!detectedEnLetters || detectedEnLetters.length < 2) {
    const arParsed = parseArabicLetters(cleanedText);
    if (!isCar && arParsed && arParsed.length >= 2) {
      detectedEnLetters = arParsed.slice(0, 2);
    } else if (isCar && arParsed && arParsed.length >= 3) {
      detectedEnLetters = arParsed.slice(0, 3);
    }
  }

  // Final check: reject missing or noisy letters
  if (!detectedEnLetters || detectedEnLetters.length < 2) {
    return null;
  }

  if (!isCar && detectedEnLetters.length > 2) {
    detectedEnLetters = detectedEnLetters.slice(0, 2);
  } else if (isCar && detectedEnLetters.length > 3) {
    detectedEnLetters = detectedEnLetters.slice(0, 3);
  }

  if (['KS', 'SA', 'KA', 'KSA'].includes(detectedEnLetters)) {
    return null; // Noise from country code strip
  }

  const { ar: formattedAr, en: formattedEn } = formatPlateLetters(detectedEnLetters);

  if (!formattedAr || !formattedEn) {
    return null;
  }

  // Register in local fleet registry for instant recognition in subsequent frames
  registerVehicleInLocalFleet(detectedDigits, formattedEn);

  return {
    digits: detectedDigits,
    letters: formattedAr,
    full_plate: `${detectedDigits} ${formattedAr}`.trim(),
    arabic_digits: toArabicDigits(detectedDigits),
    arabic_letters: formattedAr,
    english_letters: formattedEn,
  };
};
