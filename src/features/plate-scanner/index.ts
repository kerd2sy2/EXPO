/**
 * Plate Scanner Feature Module Entry Point
 * Exports Public API for Plate Scanner
 */

export { PlateScannerModal } from './PlateScannerModal';
export type { PlateResultData, PlateScannerModalProps, FleetPlateEntry } from './types/plateScanner.types';
export {
  executeAiScan,
  parseMLKitPlateText,
  callPlateRecognizerApi,
  findBestFleetPlateMatch,
  cleanAndNormalizeOcrLetters,
  parseArabicLetters,
  formatPlateLetters,
  FLEET_PLATES_REGISTRY,
  SAUDI_EN_TO_AR_MAP,
  SAUDI_AR_TO_EN_MAP,
} from './services/plateOcrService';
export { usePlateScanner } from './hooks/usePlateScanner';
