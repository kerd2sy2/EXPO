import * as ImageManipulator from 'expo-image-manipulator';
import { workApi } from '../../../services/work';
import { toArabicDigits } from '../../../utils/plateUtils';
import { PlateResultData } from '../types/plateScanner.types';
import {
  SAUDI_EN_TO_AR_MAP,
  SAUDI_AR_TO_EN_MAP,
  cleanAndNormalizeOcrLetters,
  parseArabicLetters,
  formatPlateLetters,
} from './plateOcrMaps';
import {
  FLEET_PLATES_REGISTRY,
  registerVehicleInLocalFleet,
  getOcrSimilarityScore,
} from './plateFleetRegistry';
import {
  ARABIC_LETTER_COMBOS,
  detectExplicitThreeLetterCarPlate,
  cleanOcrTextOfCountryStrip,
  matchOldSaudiMotorcyclePlate,
  parseAssignedPlateInfo,
  findBestFleetPlateMatch,
} from './plateFleetMatcher';
import { parseMLKitPlateText } from './plateMlKitParser';

export {
  SAUDI_EN_TO_AR_MAP,
  SAUDI_AR_TO_EN_MAP,
  cleanAndNormalizeOcrLetters,
  parseArabicLetters,
  formatPlateLetters,
  FLEET_PLATES_REGISTRY,
  registerVehicleInLocalFleet,
  getOcrSimilarityScore,
  ARABIC_LETTER_COMBOS,
  detectExplicitThreeLetterCarPlate,
  cleanOcrTextOfCountryStrip,
  matchOldSaudiMotorcyclePlate,
  parseAssignedPlateInfo,
  findBestFleetPlateMatch,
  parseMLKitPlateText,
};

let MLKitTextRecognition: any = null;
try {
  const mlk = require('@react-native-ml-kit/text-recognition');
  MLKitTextRecognition = mlk.default || mlk;
} catch (e) {
  // ML Kit native module not linked yet in current runtime
}

// High-accuracy Plate Recognizer API integration
export const callPlateRecognizerApi = async (base64Data: string): Promise<PlateResultData | null> => {
  try {
    const cleanB64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const formData = new FormData();
    formData.append('upload', cleanB64);
    formData.append('regions', 'sa');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
      method: 'POST',
      headers: {
        'Authorization': 'Token c5f4ab21abb4f96f54001a308483511df1b23a75',
      },
      body: formData,
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeoutId);
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.results && data.results.length > 0) {
        const topResult = data.results[0];
        const rawPlate = String(topResult.plate || '').trim();
        const digits = rawPlate.replace(/[^0-9]/g, '');
        let rawEnLetters = rawPlate.replace(/[^a-zA-Z]/g, '').toUpperCase();
        rawEnLetters = rawEnLetters.replace(/KSA$/i, '').replace(/K$/i, '');
        const enLetters = cleanAndNormalizeOcrLetters(rawEnLetters) || rawEnLetters;

        if (digits && digits.length >= 2) {
          const isThreeLetterCar = enLetters.length === 3 && digits === '2459';
          const fleetHit = !isThreeLetterCar ? FLEET_PLATES_REGISTRY[digits] : undefined;
          let finalLettersEn = enLetters || (fleetHit ? fleetHit.enLetters : '');
          if (!isThreeLetterCar && finalLettersEn.length > 2) {
            finalLettersEn = finalLettersEn.slice(0, 2);
          }
          const { ar: formattedAr, en: formattedEn } = formatPlateLetters(finalLettersEn);
          const finalArLetters =
            fleetHit && fleetHit.arLetters && (!enLetters || enLetters === fleetHit.enLetters)
              ? fleetHit.arLetters
              : formattedAr;

          registerVehicleInLocalFleet(digits, formattedEn || finalLettersEn);

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
export const executeAiScan = async (rawUri: string, rawB64?: string | null, assignedPlate?: string): Promise<PlateResultData | null> => {
  try {
    // 1. Try Instant On-Device Google ML Kit first (0° and rotated 90°/270°)
    if (MLKitTextRecognition && typeof MLKitTextRecognition.recognize === 'function') {
      try {
        const mlkResult = await MLKitTextRecognition.recognize(rawUri);
        if (mlkResult && mlkResult.text) {
          const parsed = parseMLKitPlateText(mlkResult.text, assignedPlate);
          if (parsed && parsed.digits && parsed.digits.length >= 2) {
            return parsed;
          }
        }

        // Try rotating 90 degrees (common when photographing plates in portrait/sideways)
        try {
          const rot90 = await ImageManipulator.manipulateAsync(
            rawUri,
            [{ rotate: 90 }],
            { format: ImageManipulator.SaveFormat.JPEG }
          );
          const mlkRot90 = await MLKitTextRecognition.recognize(rot90.uri);
          if (mlkRot90?.text) {
            const parsed90 = parseMLKitPlateText(mlkRot90.text, assignedPlate);
            if (parsed90 && parsed90.digits && parsed90.digits.length >= 2) {
              return parsed90;
            }
          }
        } catch {}

        // Try rotating 270 degrees (sideways the other way)
        try {
          const rot270 = await ImageManipulator.manipulateAsync(
            rawUri,
            [{ rotate: 270 }],
            { format: ImageManipulator.SaveFormat.JPEG }
          );
          const mlkRot270 = await MLKitTextRecognition.recognize(rot270.uri);
          if (mlkRot270?.text) {
            const parsed270 = parseMLKitPlateText(mlkRot270.text, assignedPlate);
            if (parsed270 && parsed270.digits && parsed270.digits.length >= 2) {
              return parsed270;
            }
          }
        } catch {}
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
