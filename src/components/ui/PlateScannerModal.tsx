/**
 * Backward compatibility re-export
 * Re-exports from modular feature: src/features/plate-scanner
 */

import { PlateScannerModal } from '../../features/plate-scanner';

export {
  PlateScannerModal,
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
  usePlateScanner,
} from '../../features/plate-scanner';

export type {
  PlateResultData,
  PlateScannerModalProps,
  FleetPlateEntry,
} from '../../features/plate-scanner';

export default PlateScannerModal;
