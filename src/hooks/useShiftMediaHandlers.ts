import { useCallback } from 'react';
import { ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { EmployeeProfile, WorkSession, TabType, Language } from '../types/delegate';
import { workApi } from '../services/work';
import { getCurrentMonthInfo } from '../screens/HistoryScreen';
import { AlertModalConfig } from '../components/modals/ActionAlertBottomSheet';

export interface ShiftActionsDeps {
  employee: EmployeeProfile | null;
  setEmployee: React.Dispatch<React.SetStateAction<EmployeeProfile | null>>;
  activeSession: WorkSession | null;
  setActiveSession: React.Dispatch<React.SetStateAction<WorkSession | null>>;
  setSubmitting: (v: boolean) => void;
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
  setCurrentTab: (tab: TabType) => void;
  setAlertConfig: (cfg: AlertModalConfig | null) => void;
  setShowPlateScannerModal: (v: boolean) => void;
  setOilChangeModalState: (s: { visible: boolean; bikeNumber: string }) => void;
  setSelectedHistoryMonthKey: (k: string | null) => void;
  setSelectedHistoryMonthLabel: (l: string | null) => void;
  mainScrollRef: React.RefObject<ScrollView | null>;
  fetchHistory: (employeeId: string) => Promise<void>;
  lang: Language;
  isRTL: boolean;
  t: any;
}

export function useShiftMediaHandlers(deps: ShiftActionsDeps) {
  const {
    employee,
    activeSession,
    enteredMotorcycle,
    setEnteredMotorcycle,
    setStartKm,
    setStartKmImage,
    startKmImageRef,
    setStartPlateImage,
    startPlateImageRef,
    isPlateConfirmed,
    setIsPlateConfirmed,
    setAutoKmFetched,
    setActiveBikeRegistrationImage,
    isTakingPhotoRef,
    setEndKmImage,
    endKmImageRef,
    setCurrentTab,
    setAlertConfig,
    setShowPlateScannerModal,
    setOilChangeModalState,
    setSelectedHistoryMonthKey,
    setSelectedHistoryMonthLabel,
    mainScrollRef,
    lang,
    isRTL,
  } = deps;

  const takeOdometerPhoto = useCallback(
    async (type: 'start' | 'end') => {
      isTakingPhotoRef.current = true;
      try {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          setAlertConfig({
            type: 'camera_permission',
            title: lang === 'ar' ? 'إذن استخدام الكاميرا مطلوب' : 'Camera Access Required',
            message:
              lang === 'ar'
                ? 'يرجى السماح للتطبيق باستخدام الكاميرا لالتقاط صورة واضحة لعداد الدراجة.'
                : 'Please allow camera access to take odometer photos for your shift records.',
            primaryButtonText: lang === 'ar' ? 'فتح إعدادات الهاتف' : 'Open Settings',
            secondaryButtonText: isRTL ? 'لاحقاً' : 'Later',
          });
          return;
        }

        const result = await ImagePicker.launchCameraAsync({
          allowsEditing: false,
          quality: 0.3,
          base64: true,
          cameraType: (ImagePicker.CameraType?.back ?? 'back') as ImagePicker.CameraType,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const base64Uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          if (type === 'start') {
            startKmImageRef.current = base64Uri;
            setStartKmImage(asset.uri);
          } else {
            endKmImageRef.current = base64Uri;
            setEndKmImage(asset.uri);
          }
        }
      } catch (err) {
        console.error('Camera capture error:', err);
        setAlertConfig({
          type: 'error',
          title: lang === 'ar' ? 'خطأ في الكاميرا' : 'Camera Error',
          message:
            lang === 'ar'
              ? 'تعذر فتح الكاميرا، يرجى المحاولة مرة أخرى'
              : 'Could not launch camera, please try again.',
        });
      } finally {
        setTimeout(() => {
          isTakingPhotoRef.current = false;
        }, 1000);
      }
    },
    [endKmImageRef, isRTL, isTakingPhotoRef, lang, setAlertConfig, setEndKmImage, setStartKmImage, startKmImageRef]
  );

  const handleScanPlate = useCallback(() => setShowPlateScannerModal(true), [setShowPlateScannerModal]);
  const handleClosePlateScanner = useCallback(() => setShowPlateScannerModal(false), [setShowPlateScannerModal]);

  const handleNavigateToTab = useCallback(
    (tab: TabType) => {
      if (tab === 'shift' && !activeSession && !isPlateConfirmed) {
        setShowPlateScannerModal(true);
        return;
      }
      if (tab === 'history') {
        const currentMonth = getCurrentMonthInfo(lang);
        setSelectedHistoryMonthKey(currentMonth.key);
        setSelectedHistoryMonthLabel(currentMonth.label);
      }
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
      setCurrentTab(tab);
    },
    [activeSession, isPlateConfirmed, lang, mainScrollRef, setCurrentTab, setSelectedHistoryMonthKey, setSelectedHistoryMonthLabel, setShowPlateScannerModal]
  );

  const handleRecheckOil = useCallback(async () => {
    if (!employee) return;
    const bikeToCheck = enteredMotorcycle || employee.motorcycle_number;
    if (!bikeToCheck) return;

    try {
      const res = await workApi.getLastKM(employee.id, bikeToCheck);
      if (res?.needs_oil_change) {
        setAlertConfig({
          type: 'warning',
          title: lang === 'ar' ? 'ما زال تغيير الزيت مطلوباً' : 'Oil Change Still Required',
          message:
            lang === 'ar'
              ? 'الدباب يحتاج الى تغير زيت ارجع لى المشرف لصرف زيت للدباب'
              : 'Motorcycle requires an oil change. Please return to supervisor to dispense oil.',
        });
      } else {
        setIsPlateConfirmed(true);
        if (res?.registration_image) setActiveBikeRegistrationImage(res.registration_image);
        if (res && res.last_end_km > 0) {
          setStartKm(String(res.last_end_km));
          setAutoKmFetched(true);
        }
        setAlertConfig({
          type: 'success',
          title: lang === 'ar' ? 'تم التحقق بنجاح' : 'Oil Status Verified',
          message:
            lang === 'ar'
              ? 'تم التحقق من جاهزية الدباب وصرف الزيت بنجاح. يمكنك الآن بدء الدوام.'
              : 'Oil change has been verified successfully. You can now start your shift.',
        });
        setCurrentTab('shift');
        mainScrollRef.current?.scrollTo({ y: 0, animated: false });
      }
    } catch (err) {
      console.error('Error rechecking oil status:', err);
      setAlertConfig({
        type: 'error',
        title: lang === 'ar' ? 'خطأ في الاتصال' : 'Connection Error',
        message: lang === 'ar' ? 'تعذر التحقق من حالة الزيت، يرجى المحاولة مرة أخرى' : 'Could not check oil status, please try again.',
      });
    }
  }, [employee, enteredMotorcycle, lang, mainScrollRef, setActiveBikeRegistrationImage, setAlertConfig, setAutoKmFetched, setCurrentTab, setIsPlateConfirmed, setStartKm]);

  const handleProcessPlateScan = useCallback(
    async (imageUri: string, base64Uri: string, plateData?: any) => {
      setShowPlateScannerModal(false);
      setIsPlateConfirmed(true);
      setCurrentTab('shift');
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });

      startPlateImageRef.current = base64Uri;
      setStartPlateImage(imageUri);

      const combined =
        plateData &&
        (plateData.full_plate ||
          (plateData.letters ? `${plateData.digits} ${plateData.letters}` : plateData.digits));
      if (combined) setEnteredMotorcycle(combined);

      const bikeNumber = combined || enteredMotorcycle;
      if (bikeNumber && employee) {
        try {
          const res = await workApi.getLastKM(employee.id, bikeNumber);
          if (res?.registration_image) setActiveBikeRegistrationImage(res.registration_image);
          if (res && res.last_end_km > 0) {
            setStartKm(String(res.last_end_km));
            setAutoKmFetched(true);
          }
          if (res?.needs_oil_change) {
            setIsPlateConfirmed(false);
            setOilChangeModalState({ visible: false, bikeNumber });
            setCurrentTab('oil-change');
            mainScrollRef.current?.scrollTo({ y: 0, animated: false });
          }
        } catch (err) {
          console.log('Error checking bike oil/km after scan:', err);
        }
      }
    },
    [employee, enteredMotorcycle, mainScrollRef, setActiveBikeRegistrationImage, setAutoKmFetched, setCurrentTab, setEnteredMotorcycle, setIsPlateConfirmed, setOilChangeModalState, setShowPlateScannerModal, setStartKm, setStartPlateImage, startPlateImageRef]
  );

  const formatTimeStr = useCallback(
    (isoString?: string) => {
      if (!isoString) return '';
      try {
        return new Date(isoString).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } catch {
        return isoString;
      }
    },
    [lang]
  );

  const formatDateStr = useCallback(
    (isoString?: string) => {
      if (!isoString) return '';
      try {
        return new Date(isoString).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      } catch {
        return isoString;
      }
    },
    [lang]
  );

  return {
    takeOdometerPhoto,
    handleScanPlate,
    handleClosePlateScanner,
    handleNavigateToTab,
    handleRecheckOil,
    handleProcessPlateScan,
    formatTimeStr,
    formatDateStr,
  };
}
