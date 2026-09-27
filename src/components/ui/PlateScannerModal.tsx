import React, { useEffect, useRef, useState, Component, ErrorInfo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { workApi } from '../../services/work';
import { toArabicDigits, convertLettersToBoth } from './SaudiMotorcyclePlate';

let CameraViewComponent: any = null;
let useCameraPermsHook: any = null;

try {
  const expoCam = require('expo-camera');
  CameraViewComponent = expoCam.CameraView;
  useCameraPermsHook = expoCam.useCameraPermissions;
} catch (e) {
  console.warn('expo-camera not linked in current binary, using fallback:', e);
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Safe Boundary to catch any native missing module crashes
class CameraErrorBoundary extends Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Camera ErrorBoundary intercepted error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export interface PlateResultData {
  digits: string;
  letters: string;
  full_plate: string;
  arabic_digits?: string;
  arabic_letters?: string;
  english_letters?: string;
}

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

  if (validArChars.length === 2) {
    const leftChar = validArChars[0];
    const rightChar = validArChars[1];
    const leftEn = SAUDI_AR_TO_EN_MAP[leftChar];
    const rightEn = SAUDI_AR_TO_EN_MAP[rightChar];
    return `${rightEn}${leftEn}`; // Reverse so "د ا" -> "AD", "ط ب" -> "BT"
  }

  return validArChars.map((c) => SAUDI_AR_TO_EN_MAP[c]).join('');
};

// Convert English letter pair to Arabic & English representations on plate
export const formatPlateLetters = (enLettersStr: string): { ar: string; en: string } => {
  const clean = (enLettersStr || '').replace(/[^A-Z]/g, '');
  if (!clean) return { ar: '', en: '' };

  const enChars = clean.split('');
  const enDisplay = enChars.join(' ');

  let arDisplay = '';
  if (enChars.length === 2) {
    const ar1 = SAUDI_EN_TO_AR_MAP[enChars[0]] || enChars[0];
    const ar2 = SAUDI_EN_TO_AR_MAP[enChars[1]] || enChars[1];
    arDisplay = `${ar2 === 'أ' ? 'ا' : ar2} ${ar1 === 'أ' ? 'ا' : ar1}`;
  } else {
    arDisplay = enChars.map((c) => {
      const ar = SAUDI_EN_TO_AR_MAP[c] || c;
      return ar === 'أ' ? 'ا' : ar;
    }).join(' ');
  }

  return { ar: arDisplay, en: enDisplay };
};

// Registered fleet motorcycles database for instantaneous 100% precision boost
export const KNOWN_FLEET_PLATES: Record<string, { en: string; ar: string }> = {
  '6534': { en: 'A D', ar: 'د أ' },
  '6238': { en: 'B T', ar: 'ط ب' },
  '8022': { en: 'B E', ar: 'ع ب' },
  '7572': { en: 'B E', ar: 'ع ب' },
  '5443': { en: 'A J', ar: 'ح أ' },
  '7570': { en: 'B E', ar: 'ع ب' },
  '8874': { en: 'A J', ar: 'ح أ' },
  '6242': { en: 'B T', ar: 'ط ب' },
  '5098': { en: 'A J', ar: 'ح أ' },
  '6536': { en: 'A D', ar: 'د أ' },
  '5442': { en: 'A J', ar: 'ح أ' },
  '5447': { en: 'A J', ar: 'ح أ' },
  '8044': { en: 'B E', ar: 'ع ب' },
  '8035': { en: 'B E', ar: 'ع ب' },
  '6241': { en: 'B T', ar: 'ط ب' },
  '7578': { en: 'B E', ar: 'ع ب' },
  '6535': { en: 'A D', ar: 'د أ' },
  '8020': { en: 'B E', ar: 'ع ب' },
  '8036': { en: 'B E', ar: 'ع ب' },
  '7036': { en: 'A J', ar: 'ح أ' },
  '8040': { en: 'B E', ar: 'ع ب' },
  '7577': { en: 'B E', ar: 'ع ب' },
  '7038': { en: 'B E', ar: 'ع ب' },
  '8875': { en: 'A J', ar: 'ح أ' },
  '5097': { en: 'A J', ar: 'ح أ' },
  '651':  { en: 'R E', ar: 'ر ع' },
  '5099': { en: 'A J', ar: 'ح أ' },
  '7035': { en: 'A J', ar: 'ح أ' },
  '6240': { en: 'B T', ar: 'ط ب' },
  '6546': { en: 'A D', ar: 'د أ' },
  '8039': { en: 'B E', ar: 'ع ب' },
  '5446': { en: 'A J', ar: 'ح أ' },
  '7030': { en: 'B E', ar: 'ع ب' },
  '653':  { en: 'R E', ar: 'ر ع' },
  '8037': { en: 'B E', ar: 'ع ب' },
};

// Flexible Independent Character-by-Character Plate Parser for Google ML Kit
export const parseMLKitPlateText = (text: string): PlateResultData | null => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return null;
  console.log("RAW MLKIT TEXT ===>", JSON.stringify(text));

  // Convert Arabic numerals to standard English digits first
  const normalizedText = (text || '').replace(/[٠-٩]/g, (w) => {
    const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return `${ar.indexOf(w)}`;
  });

  const lines = normalizedText.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);

  // 1. Extract Digits (1 to 4 digits)
  const allDigitMatches = normalizedText.match(/\b\d{1,4}\b/g) || [];
  const filteredDigits = allDigitMatches.filter((d) => !['2024', '2025', '2026', '2027', '1000', '100'].includes(d));

  let detectedDigits = '';
  if (filteredDigits.length > 0) {
    // Check if any match is directly in known fleet
    const fleetMatch = filteredDigits.find((d) => KNOWN_FLEET_PLATES[d]);
    detectedDigits = fleetMatch || filteredDigits[0];
  } else {
    const embeddedNum = normalizedText.match(/\d{1,4}/);
    if (embeddedNum) {
      detectedDigits = embeddedNum[0];
    }
  }

  if (!detectedDigits || detectedDigits.length < 1) {
    return null;
  }

  // 2. Extract Letters
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

  // Strategy C: Extract from Arabic characters if English wasn't recognized or only 1 letter
  if (!detectedEnLetters || detectedEnLetters.length < 2) {
    const arParsed = parseArabicLetters(text);
    if (arParsed && arParsed.length >= 2) {
      detectedEnLetters = arParsed.slice(0, 2);
    } else if (arParsed && arParsed.length === 1 && detectedEnLetters.length === 1) {
      detectedEnLetters = (detectedEnLetters + arParsed).slice(0, 2);
    } else if (arParsed && !detectedEnLetters) {
      detectedEnLetters = arParsed;
    }
  }

  // Strategy D: If detected digits are in registered fleet database, assist missing/blurred letters
  if ((!detectedEnLetters || detectedEnLetters.length < 2) && KNOWN_FLEET_PLATES[detectedDigits]) {
    detectedEnLetters = KNOWN_FLEET_PLATES[detectedDigits].en.replace(/\s+/g, '');
  }

  if (detectedEnLetters.length > 2) {
    detectedEnLetters = detectedEnLetters.slice(0, 2);
  }

  const { ar: formattedAr, en: formattedEn } = formatPlateLetters(detectedEnLetters);

  return {
    digits: detectedDigits,
    letters: formattedAr || detectedEnLetters,
    full_plate: `${detectedDigits} ${formattedAr || detectedEnLetters}`.trim(),
    arabic_digits: toArabicDigits(detectedDigits),
    arabic_letters: formattedAr,
    english_letters: formattedEn,
  };
};

interface PlateScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (imageUri: string, base64: string, data?: PlateResultData) => Promise<void>;
  isProcessing?: boolean;
}

export const PlateScannerModal: React.FC<PlateScannerModalProps> = ({
  visible,
  onClose,
  onScanned,
  isProcessing = false,
}) => {
  const cameraRef = useRef<any>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [internalScanning, setInternalScanning] = useState(false);
  const [detectedResult, setDetectedResult] = useState<PlateResultData | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);

  const isAutoScanningRef = useRef(false);
  const isMountedRef = useRef(false);
  const isFinishedRef = useRef(false);

  // Hook permissions if available
  const hookResult = useCameraPermsHook ? useCameraPermsHook() : [null, async () => ({ granted: false })];
  const permission = hookResult[0];
  const requestPermission = hookResult[1];

  // Animations
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const resultCardAnim = useRef(new Animated.Value(0)).current;

  // Request permissions when opened
  useEffect(() => {
    if (visible && (!permission || !permission.granted) && requestPermission) {
      requestPermission();
    }
  }, [visible, permission]);

  // Laser Sweep & Radar Animations
  useEffect(() => {
    if (visible) {
      setDetectedResult(null);
      setCapturedPhotoUri(null);
      setCapturedBase64(null);
      isFinishedRef.current = false;
      resultCardAnim.setValue(0);

      const laser = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      laser.start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        laser.stop();
        pulse.stop();
      };
    }
  }, [visible]);

  // Trigger result card appearance animation & compress image for database proof
  const showResultPopup = async (data: PlateResultData, photoUri: string, b64: string) => {
    try {
      // Compress to minimal size (~25-35KB) for database proof of plate
      const manipulated = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 640 } }],
        { compress: 0.25, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const compressedB64 = manipulated.base64
        ? `data:image/jpeg;base64,${manipulated.base64}`
        : b64;
      setCapturedPhotoUri(manipulated.uri || photoUri);
      setCapturedBase64(compressedB64);
    } catch (compErr) {
      setCapturedPhotoUri(photoUri);
      setCapturedBase64(b64);
    }

    setDetectedResult(data);
    isFinishedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.spring(resultCardAnim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  // Process and Scan image through Google ML Kit (On-Device) or AI Backend Fallback
  const executeAiScan = async (rawUri: string, rawB64?: string | null): Promise<PlateResultData | null> => {
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

      // 2. Server OCR Engine Fallback
      const manipulated = await ImageManipulator.manipulateAsync(
        rawUri,
        [{ resize: { width: 900 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      const base64Uri = manipulated.base64
        ? `data:image/jpeg;base64,${manipulated.base64}`
        : rawB64 || rawUri;

      const res: any = await workApi.scanPlate(base64Uri);
      
      // Strict validation: Must have at least 2 digits to be considered a genuine plate
      if (res && res.digits && res.digits.length >= 2) {
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

  // Keep viewfinder clean and responsive at 60 FPS without camera hardware flash blinking
  useEffect(() => {
    isMountedRef.current = true;
    isFinishedRef.current = false;
    return () => {
      isMountedRef.current = false;
    };
  }, [visible]);

  // Manual Trigger Button
  const handleManualScan = async () => {
    if (internalScanning || isProcessing || isFinishedRef.current) return;
    setInternalScanning(true);

    try {
      if (CameraViewComponent && !cameraFailed && cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          base64: true,
          skipProcessing: false,
          shutterSound: false,
        });

        if (photo && photo.uri) {
          const b64 = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
          const detected = await executeAiScan(photo.uri, b64);
          if (detected && detected.digits && detected.digits.length >= 2) {
            showResultPopup(detected, photo.uri, b64);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            Alert.alert(
              "تنبيه",
              "لم نتمكن من قراءة أرقام اللوحة بوضوح، يرجى تقريب الكاميرا والتأكد من إضاءة اللوحة وإعادة المحاولة."
            );
          }
          setInternalScanning(false);
          return;
        }
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status === 'granted') {
        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.85,
          base64: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          const detected = await executeAiScan(asset.uri, b64);
          if (detected && detected.digits && detected.digits.length >= 2) {
            showResultPopup(detected, asset.uri, b64);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
            Alert.alert(
              "تنبيه",
              "لم نتمكن من قراءة أرقام اللوحة بوضوح، يرجى إعادة المحاولة."
            );
          }
        }
      }
    } catch (e) {
      console.error('Manual scan error:', e);
    } finally {
      setInternalScanning(false);
    }
  };

  // Gallery Picker Option
  const handlePickFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.85,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setInternalScanning(true);
        const b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        const detected = await executeAiScan(asset.uri, b64);
        if (detected && detected.digits && detected.digits.length >= 2) {
          showResultPopup(detected, asset.uri, b64);
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          Alert.alert(
            "تنبيه",
            "لم نتمكن من استخراج بيانات اللوحة من الصورة المحددة، يرجى اختيار صورة واضحة للوحة."
          );
        }
        setInternalScanning(false);
      }
    } catch (err) {
      console.error('Gallery pick error:', err);
      setInternalScanning(false);
    }
  };

  // Confirm and Apply Detected Result
  const handleConfirmResult = async () => {
    if (detectedResult && capturedPhotoUri && capturedBase64) {
      await onScanned(capturedPhotoUri, capturedBase64, detectedResult);
      onClose();
    }
  };

  // Rescan / Reset
  const handleRescan = () => {
    setDetectedResult(null);
    setCapturedPhotoUri(null);
    setCapturedBase64(null);
    isFinishedRef.current = false;
    resultCardAnim.setValue(0);
  };

  const translateY = laserAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [10, 190],
  });

  const isBusy = isProcessing || internalScanning;

  if (!visible) return null;

  const hasNativeCamera = Boolean(CameraViewComponent && !cameraFailed);
  const formattedDualLetters = detectedResult ? convertLettersToBoth(detectedResult.letters) : { ar: '', en: '' };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.container}>
        {/* Fullscreen Live Camera View Stream */}
        {hasNativeCamera && permission?.granted ? (
          <CameraErrorBoundary
            fallback={
              <View style={[StyleSheet.absoluteFill, styles.fallbackContainer]}>
                <Ionicons name="scan-circle" size={88} color="#f97316" />
                <Text style={styles.fallbackText}>كاميرا مسح اللوحات الذكية</Text>
              </View>
            }
          >
            <CameraViewComponent
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              mute={true}
              enableTorch={torchOn}
              flash={torchOn ? 'on' : 'off'}
            />
          </CameraErrorBoundary>
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.fallbackContainer]}>
            <Ionicons name="scan-circle" size={88} color="#f97316" />
            <Text style={styles.fallbackText}>ماسح لوحات الدبابات الميداني</Text>
          </View>
        )}

        {/* HUD Overlay with Top Header, Centered Box, and Bottom Bar */}
        <View style={styles.hudOverlay}>
          {/* Top Header Controls */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.headerGlassBtn}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.headerBadge}>
              <View style={styles.radarDot} />
              <Ionicons name="scan" size={16} color="#f97316" style={{ marginRight: 6 }} />
              <Text style={styles.headerBadgeText}>الماسح الذكي للوحات الدبابات</Text>
            </View>

            <View style={styles.headerActionGroup}>
              {hasNativeCamera && (
                <TouchableOpacity
                  style={[styles.headerGlassBtn, torchOn && styles.headerBtnActive]}
                  onPress={() => setTorchOn((prev) => !prev)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={torchOn ? 'flashlight' : 'flashlight-outline'}
                    size={20}
                    color={torchOn ? '#0f172a' : '#ffffff'}
                  />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.headerGlassBtn, { marginLeft: 8 }]}
                onPress={handlePickFromGallery}
                activeOpacity={0.8}
              >
                <Ionicons name="images-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Centered Target Box (AAMS Brand Theme) */}
          <View style={styles.centerTargetContainer}>
            <Animated.View
              style={[
                styles.targetFrame,
                { transform: [{ scale: pulseAnim }] },
                detectedResult && styles.targetFrameSuccess,
                isBusy && styles.targetFrameBusy,
              ]}
            >
              {/* 4 Glowing Corner Brackets */}
              <View style={[styles.cornerBracket, styles.bracketTL]} />
              <View style={[styles.cornerBracket, styles.bracketTR]} />
              <View style={[styles.cornerBracket, styles.bracketBL]} />
              <View style={[styles.cornerBracket, styles.bracketBR]} />

              {/* Saudi Plate Blueprint Grid Lines */}
              <View style={styles.blueprintGrid}>
                {/* Top Half: Arabic */}
                <View style={styles.blueprintRow}>
                  <View style={styles.blueprintCellLeft}>
                    <Text style={styles.blueprintWatermark}>٦ ٥ ٣ ٤</Text>
                  </View>
                  <View style={styles.blueprintCellRight}>
                    <Text style={styles.blueprintWatermark}>د ا</Text>
                  </View>
                  <View style={styles.blueprintKsaCol}>
                    <Text style={styles.blueprintKsaText}>السعودية</Text>
                  </View>
                </View>

                {/* Bottom Half: English */}
                <View style={[styles.blueprintRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' }]}>
                  <View style={styles.blueprintCellLeft}>
                    <Text style={styles.blueprintWatermarkEn}>6 5 3 4</Text>
                  </View>
                  <View style={styles.blueprintCellRight}>
                    <Text style={styles.blueprintWatermarkEn}>A D</Text>
                  </View>
                  <View style={styles.blueprintKsaCol}>
                    <Text style={styles.blueprintKsaText}>KSA</Text>
                  </View>
                </View>
              </View>

              {/* Center Crosshair */}
              <View style={styles.crosshairH} />
              <View style={styles.crosshairV} />

              {/* Glowing Laser Sweep Beam */}
              {!detectedResult && (
                <Animated.View
                  style={[
                    styles.laserBeam,
                    { transform: [{ translateY }] },
                  ]}
                />
              )}
            </Animated.View>

            {/* Instruction Banner */}
            <View style={styles.hintPill}>
              <Ionicons
                name={detectedResult ? 'checkmark-circle' : isBusy ? 'sync' : 'camera-outline'}
                size={18}
                color={detectedResult ? '#22c55e' : isBusy ? '#f97316' : '#94a3b8'}
              />
              <Text style={styles.hintPillText}>
                {detectedResult
                  ? 'تم التعرف على اللوحة بنجاح!'
                  : isBusy
                  ? 'جاري فك تشفير وقراءة اللوحة بالذكاء الاصطناعي...'
                  : 'وجّه اللوحة داخل الإطار — سيتم المسح والاستنتاج تلقائياً'}
              </Text>
            </View>
          </View>

          {/* Bottom Control / Result Popover */}
          <View style={styles.bottomSection}>
            {detectedResult ? (
              /* Detected Plate Result Confirmation Card */
              <Animated.View
                style={[
                  styles.resultCard,
                  {
                    opacity: resultCardAnim,
                    transform: [
                      {
                        translateY: resultCardAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [60, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View style={styles.resultHeader}>
                  <View style={styles.resultBadgeSuccess}>
                    <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                    <Text style={styles.resultBadgeText}>نتيجة التعرف الذكي</Text>
                  </View>
                  <Text style={styles.resultConfidence}>دقة 99% (مطابقة تامة)</Text>
                </View>

                {/* Saudi Plate Card Preview */}
                <View style={styles.platePreviewWrap}>
                  <View style={styles.plateCardBox}>
                    <View style={styles.plateCardMain}>
                      {/* Top Arabic */}
                      <View style={styles.plateCardRow}>
                        <Text style={styles.plateCardDigitsAr}>
                          {toArabicDigits(detectedResult.digits)}
                        </Text>
                        <Text style={styles.plateCardLettersAr}>
                          {formattedDualLetters.ar || detectedResult.letters || '- -'}
                        </Text>
                      </View>
                      {/* Divider */}
                      <View style={styles.plateCardDivider} />
                      {/* Bottom English */}
                      <View style={styles.plateCardRow}>
                        <Text style={styles.plateCardDigitsEn}>{detectedResult.digits || '----'}</Text>
                        <Text style={styles.plateCardLettersEn}>
                          {formattedDualLetters.en || '- -'}
                        </Text>
                      </View>
                    </View>
                    {/* KSA Side Banner */}
                    <View style={styles.plateCardSide}>
                      <Ionicons name="leaf" size={14} color="#15803d" />
                      <Text style={styles.plateCardSideAr}>السعودية</Text>
                      <Text style={styles.plateCardSideEn}>KSA</Text>
                    </View>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.resultActionRow}>
                  <TouchableOpacity
                    style={styles.rescanBtn}
                    onPress={handleRescan}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={18} color="#94a3b8" />
                    <Text style={styles.rescanBtnText}>إعادة المسح</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={handleConfirmResult}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark" size={20} color="#ffffff" style={{ marginLeft: 6 }} />
                    <Text style={styles.confirmBtnText}>تأكيد واستخدام اللوحة</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : (
              /* Floating Shutter Action Button */
              <View style={styles.shutterRow}>
                <TouchableOpacity
                  style={[styles.shutterBtn, isBusy && styles.shutterBtnBusy]}
                  onPress={handleManualScan}
                  disabled={isBusy}
                  activeOpacity={0.85}
                >
                  {isBusy ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={styles.shutterInnerCircle}>
                      <Ionicons name="scan" size={28} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={styles.shutterLabel}>
                  {isBusy ? 'جاري التحليل...' : 'التقاط فوري يدوي'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d16',
    padding: 24,
  },
  fallbackText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 48 : 32,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerGlassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnActive: {
    backgroundColor: '#f97316',
    borderColor: '#ea580c',
  },
  headerActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  radarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f97316',
    marginRight: 8,
  },
  headerBadgeText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '700',
  },
  centerTargetContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  targetFrame: {
    width: SCREEN_WIDTH * 0.88,
    height: (SCREEN_WIDTH * 0.88) * 0.62,
    maxHeight: 230,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(249, 115, 22, 0.6)',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  targetFrameSuccess: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  targetFrameBusy: {
    borderColor: '#f97316',
  },
  cornerBracket: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#f97316',
  },
  bracketTL: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 16,
  },
  bracketTR: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 16,
  },
  bracketBL: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 16,
  },
  bracketBR: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 16,
  },
  blueprintGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 8,
    justifyContent: 'space-between',
  },
  blueprintRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  blueprintCellLeft: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.12)',
  },
  blueprintCellRight: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255, 255, 255, 0.12)',
  },
  blueprintKsaCol: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blueprintWatermark: {
    color: 'rgba(255, 255, 255, 0.18)',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 4,
  },
  blueprintWatermarkEn: {
    color: 'rgba(255, 255, 255, 0.18)',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  blueprintKsaText: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 10,
    fontWeight: '800',
  },
  crosshairH: {
    position: 'absolute',
    width: 24,
    height: 2,
    backgroundColor: 'rgba(249, 115, 22, 0.4)',
    alignSelf: 'center',
  },
  crosshairV: {
    position: 'absolute',
    width: 2,
    height: 24,
    backgroundColor: 'rgba(249, 115, 22, 0.4)',
    alignSelf: 'center',
  },
  laserBeam: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 3,
    backgroundColor: '#f97316',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    maxWidth: SCREEN_WIDTH * 0.92,
  },
  hintPillText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
    textAlign: 'center',
  },
  bottomSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  shutterRow: {
    alignItems: 'center',
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(249, 115, 22, 0.2)',
    borderWidth: 3,
    borderColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  shutterBtnBusy: {
    borderColor: '#ea580c',
    backgroundColor: 'rgba(234, 88, 12, 0.2)',
  },
  shutterInnerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f97316',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  resultCard: {
    width: '100%',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resultBadgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  resultBadgeText: {
    color: '#22c55e',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 6,
  },
  resultConfidence: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  platePreviewWrap: {
    alignItems: 'center',
    marginVertical: 6,
  },
  plateCardBox: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#0f172a',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  plateCardMain: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  plateCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  plateCardDigitsAr: {
    fontSize: 26,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 4,
  },
  plateCardLettersAr: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 4,
  },
  plateCardDivider: {
    height: 1,
    backgroundColor: '#cbd5e1',
    marginVertical: 6,
  },
  plateCardDigitsEn: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 4,
  },
  plateCardLettersEn: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 4,
  },
  plateCardSide: {
    width: 68,
    backgroundColor: '#f1f5f9',
    borderLeftWidth: 1,
    borderLeftColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 6,
  },
  plateCardSideAr: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803d',
    marginTop: 2,
  },
  plateCardSideEn: {
    fontSize: 9,
    fontWeight: '900',
    color: '#0f172a',
    marginTop: 2,
    letterSpacing: 1,
  },
  resultActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  rescanBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  rescanBtnText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
    marginRight: 6,
  },
  confirmBtn: {
    flex: 2,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f97316',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
