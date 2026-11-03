import React from 'react';
import { SaudiMotorcyclePlate } from '../../components/ui/SaudiMotorcyclePlate';

export interface SaudiPlateViewProps {
  digits: string;
  letters: string;
  onChangeDigits?: (val: string) => void;
  onChangeLetters?: (val: string) => void;
  editable?: boolean;
  isDarkMode?: boolean;
  scale?: number;
  onScanPlate?: () => void;
  isScanning?: boolean;
  showScanButton?: boolean;
  showInputsRow?: boolean;
}

export const SaudiPlateView: React.FC<SaudiPlateViewProps> = (props) => {
  return <SaudiMotorcyclePlate {...props} />;
};

export default SaudiPlateView;
