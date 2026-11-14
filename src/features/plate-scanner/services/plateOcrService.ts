import * as ImageManipulator from 'expo-image-manipulator';
import { workApi } from '../../../services/work';
import { toArabicDigits } from '../../../utils/plateUtils';
import { PlateResultData } from '../types/plateScanner.types';
import {
  SAUDI_EN_TO_AR_MAP,
  SAUDI_AR_TO_EN_MAP,
  ARABIC_LETTER_COMBOS,
  FLEET_PLATES_REGISTRY,
  cleanAndNormalizeOcrLetters,
  parseArabicLetters,
  formatPlateLetters,
} from './plateOcrMaps';
import {
  getOcrSimilarityScore,
  findBestFleetPlateMatch,
  parseMLKitPlateText,
} from './plateFleetMatcher';

export {
  SAUDI_EN_TO_AR_MAP,
  SAUDI_AR_TO_EN_MAP,
  ARABIC_LETTER_COMBOS,
  FLEET_PLATES_REGISTRY,
  cleanAndNormalizeOcrLetters,
  parseArabicLetters,
  formatPlateLetters,
  getOcrSimilarityScore,
  findBestFleetPlateMatch,
  parseMLKitPlateText,
};

let MLKitTextRecognition: any = null;
try {
  const mlk = require('@react-native-ml-kit/text-recognition');
  MLKitTextRecognition = mlk.default || mlk;
} catch {
  // ML Kit native module not linked yet in current runtime
}

export const callPlateRecognizerApi = async (
  base64Data: string
): Promise<PlateResultData | null> => {
  try {
    const cleanB64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const formData = new FormData();
    formData.append('upload', cleanB64);
    formData.append('regions', 'sa');

    const response = await fetch('https://api.platerecognizer.com/v1/plate-reader/', {
      method: 'POST',
      headers: {
        Authorization: 'Token c5f4ab21abb4f96f54001a308483511df1b23a75',
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
          const finalArLetters = fleetHit && fleetHit.arLetters ? fleetHit.arLetters : formattedAr;

          return {
            digits,
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

export const executeAiScan = async (
  rawUri: string,
  rawB64?: string | null
): Promise<PlateResultData | null> => {
  try {
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

    const manipulated = await ImageManipulator.manipulateAsync(
      rawUri,
      [{ resize: { width: 900 } }],
      { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    );

    const base64Uri = manipulated.base64
      ? `data:image/jpeg;base64,${manipulated.base64}`
      : rawB64 || rawUri;

    if (base64Uri) {
      const prResult = await callPlateRecognizerApi(base64Uri);
      if (prResult && prResult.digits && prResult.digits.length >= 2) {
        return prResult;
      }
    }

    const res: any = await workApi.scanPlate(base64Uri);

    if (
      res &&
      res.digits &&
      res.digits.length >= 3 &&
      res.letters &&
      res.letters.trim().length > 0 &&
      res.letters !== '- -'
    ) {
      return {
        digits: res.digits || '',
        letters: res.letters || '',
        full_plate: res.full_plate || `${res.digits || ''} ${res.letters || ''}`.trim(),
        arabic_digits: res.arabic_digits || toArabicDigits(res.digits || ''),
        arabic_letters: res.arabic_letters || res.letters || '',
        english_letters: res.english_letters || '',
      };
    }
  } catch (err) {
    console.warn('executeAiScan error:', err);
  }
  return null;
};
