import React from 'react';
import { ScrollView } from 'react-native';
import {
  EmployeeProfile,
  WorkSession,
  TabType,
  Language,
} from '../../../types/delegate';
import { AlertModalConfig } from '../../../components/modals/ActionAlertBottomSheet';

export interface UseShiftControllerParams {
  employee: EmployeeProfile | null;
  setEmployee: React.Dispatch<React.SetStateAction<EmployeeProfile | null>>;
  activeSession: WorkSession | null;
  setActiveSession: React.Dispatch<React.SetStateAction<WorkSession | null>>;
  setIsSessionSyncing: React.Dispatch<React.SetStateAction<boolean>>;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentTab: (tab: TabType) => void;
  mainScrollRef: React.RefObject<ScrollView | null>;
  setAlertConfig: (config: AlertModalConfig | null) => void;
  setShowPlateScannerModal: (visible: boolean) => void;
  setOilChangeModalState: React.Dispatch<
    React.SetStateAction<{ visible: boolean; bikeNumber: string }>
  >;
  setSelectedHistoryMonthKey: (key: string | null) => void;
  setSelectedHistoryMonthLabel: (label: string | null) => void;
  fetchHistory: (employeeId: string) => Promise<void>;
  lang: Language;
  isRTL: boolean;
  t: any;
  enteredMotorcycle: string;
  setEnteredMotorcycle: React.Dispatch<React.SetStateAction<string>>;
  startKm: string;
  setStartKm: React.Dispatch<React.SetStateAction<string>>;
  startKmImage: string | null;
  setStartKmImage: React.Dispatch<React.SetStateAction<string | null>>;
  startKmImageRef: React.MutableRefObject<string | null>;
  startPlateImage: string | null;
  setStartPlateImage: React.Dispatch<React.SetStateAction<string | null>>;
  startPlateImageRef: React.MutableRefObject<string | null>;
  isPlateConfirmed: boolean;
  setIsPlateConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
  startNotes: string;
  setStartNotes: React.Dispatch<React.SetStateAction<string>>;
  setAutoKmFetched: React.Dispatch<React.SetStateAction<boolean>>;
  isOdometerBroken: boolean;
  setActiveBikeRegistrationImage: React.Dispatch<React.SetStateAction<string | null>>;
  setNeedsOilChange: React.Dispatch<React.SetStateAction<boolean>>;
  isTakingPhotoRef: React.MutableRefObject<boolean>;
  endKm: string;
  setEndKm: React.Dispatch<React.SetStateAction<string>>;
  endKmImage: string | null;
  setEndKmImage: React.Dispatch<React.SetStateAction<string | null>>;
  endKmImageRef: React.MutableRefObject<string | null>;
  ordersCount: string;
  setOrdersCount: React.Dispatch<React.SetStateAction<string>>;
  fuelCost: string;
  setFuelCost: React.Dispatch<React.SetStateAction<string>>;
  endNotes: string;
  setEndNotes: React.Dispatch<React.SetStateAction<string>>;
}

export const isBrokenOdometerBike = (
  isOdometerBroken?: boolean,
  bikeNumber?: string
): boolean =>
  Boolean(isOdometerBroken) ||
  Boolean(bikeNumber && (bikeNumber.includes('7569') || bikeNumber.includes('8043')));

export const getDistanceAlertMsg = (lang: Language, dist: number): string => {
  switch (lang) {
    case 'en':
      return `You entered the odometer reading incorrectly, did you really travel ${dist} km?`;
    case 'ur':
      return `آپ نے اوڈومیٹر غلط درج کیا ہے، کیا آپ نے واقعی ${dist} کلومیٹر کا فاصلہ طے کیا ہے؟`;
    case 'bn':
      return `আপনি ওডোমিটার ভুল লিখেছেন, আপনি কি সত্যিই ${dist} কিমি পথ অতিক্রম করেছেন?`;
    default:
      return `لقد كتبت العداد خطأ، هل أنت قطعت ${dist} كم؟`;
  }
};

export const getDistanceAlertTitle = (lang: Language): string => {
  switch (lang) {
    case 'en':
      return 'Odometer Reading Alert';
    case 'ur':
      return 'اوڈومیٹر ریڈنگ الرٹ';
    case 'bn':
      return 'ওডোমিটার সতর্কতা';
    default:
      return 'تنبيه في قراءة العداد';
  }
};

export const getConfirmBtnText = (lang: Language, dist: number): string => {
  switch (lang) {
    case 'en':
      return `Yes, traveled ${dist} km`;
    case 'ur':
      return `ہاں، میں نے ${dist} کلومیٹر سفر کیا`;
    case 'bn':
      return `হ্যাঁ, ${dist} কিমি গিয়েছি`;
    default:
      return `نعم، قطعت ${dist} كم`;
  }
};

export const getEditBtnText = (lang: Language): string => {
  switch (lang) {
    case 'en':
      return 'Edit Odometer';
    case 'ur':
      return 'اوڈومیٹر تبدیل کریں';
    case 'bn':
      return 'ওডোমিটার সংশোধন করুন';
    default:
      return 'تعديل العداد';
  }
};
