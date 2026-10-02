import { Language } from '../../../types/delegate';

export interface PlateResultData {
  digits: string;
  letters: string;
  full_plate: string;
  arabic_digits?: string;
  arabic_letters?: string;
  english_letters?: string;
}

export interface PlateScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (imageUri: string, base64: string, data?: PlateResultData) => Promise<void>;
  isProcessing?: boolean;
  isDarkMode?: boolean;
  lang?: Language;
  t?: any;
  isRTL?: boolean;
}

export interface FleetPlateEntry {
  enDigits: string;
  arDigits: string;
  enLetters: string;
  arLetters: string;
}
