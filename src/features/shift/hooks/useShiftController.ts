import React from 'react';
import { ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import {
  EmployeeProfile,
  WorkSession,
  TabType,
  Language,
} from '../../../types/delegate';
import { workApi } from '../../../services/work';
import { saveCachedUser } from '../../../services/api';
import { AlertModalConfig } from '../../../components/modals/ActionAlertBottomSheet';
import { getCurrentMonthInfo } from '../../../screens/HistoryScreen';
import { shiftSessionService } from '../services/shiftSessionService';

interface UseShiftControllerParams {
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
  // Workflow state from useShiftWorkflow
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

export function useShiftController({
  employee,
  setEmployee,
  activeSession,
  setActiveSession,
  setIsSessionSyncing,
  setSubmitting,
  setCurrentTab,
  mainScrollRef,
  setAlertConfig,
  setShowPlateScannerModal,
  setOilChangeModalState,
  setSelectedHistoryMonthKey,
  setSelectedHistoryMonthLabel,
  fetchHistory,
  lang,
  isRTL,
  t,
  enteredMotorcycle,
  setEnteredMotorcycle,
  startKm,
  setStartKm,
  startKmImage,
  setStartKmImage,
  startKmImageRef,
  startPlateImage,
  setStartPlateImage,
  startPlateImageRef,
  isPlateConfirmed,
  setIsPlateConfirmed,
  startNotes,
  setStartNotes,
  setAutoKmFetched,
  isOdometerBroken,
  setActiveBikeRegistrationImage,
  setNeedsOilChange,
  isTakingPhotoRef,
  endKm,
  setEndKm,
  endKmImage,
  setEndKmImage,
  endKmImageRef,
  ordersCount,
  setOrdersCount,
  fuelCost,
  setFuelCost,
  endNotes,
  setEndNotes,
}: UseShiftControllerParams) {
  const takeOdometerPhoto = async (type: 'start' | 'end') => {
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
        quality: 0.6,
        base64: false,
        cameraType: (ImagePicker.CameraType?.back ?? 'back') as ImagePicker.CameraType,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const rawAsset = result.assets[0];
        const manipulated = await ImageManipulator.manipulateAsync(
          rawAsset.uri,
          [{ resize: { width: 900 } }],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        const base64Uri = manipulated.base64
          ? `data:image/jpeg;base64,${manipulated.base64}`
          : manipulated.uri;

        if (type === 'start') {
          startKmImageRef.current = base64Uri;
          setStartKmImage(manipulated.uri);
        } else {
          endKmImageRef.current = base64Uri;
          setEndKmImage(manipulated.uri);
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
  };

  const handleScanPlate = () => {
    setShowPlateScannerModal(true);
  };

  const handleClosePlateScanner = () => {
    setShowPlateScannerModal(false);
  };

  const handleStartShiftClick = () => {
    if (!activeSession && !isPlateConfirmed) {
      setShowPlateScannerModal(true);
    } else {
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
      setCurrentTab('shift');
    }
  };

  const handleNavigateToTab = (tab: TabType) => {
    if (tab === 'shift' && !activeSession && !isPlateConfirmed) {
      setShowPlateScannerModal(true);
      return;
    }
    if (tab === 'history') {
      const currentMonth = getCurrentMonthInfo(lang);
      setSelectedHistoryMonthKey(currentMonth.key);
      setSelectedHistoryMonthLabel(currentMonth.label);
      if (employee?.id) {
        fetchHistory(employee.id).catch(() => {});
      }
    }
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    setCurrentTab(tab);
  };

  const handleRecheckOil = async () => {
    if (!employee) return;
    const bikeToCheck = enteredMotorcycle || employee.motorcycle_number;
    if (!bikeToCheck) return;

    try {
      const res = await workApi.getLastKM(employee.id, bikeToCheck);
      setNeedsOilChange(Boolean(res?.needs_oil_change));
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
        if (res?.registration_image) {
          setActiveBikeRegistrationImage(res.registration_image);
        }
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
        message:
          lang === 'ar'
            ? 'تعذر التحقق من حالة الزيت، يرجى المحاولة مرة أخرى'
            : 'Could not check oil status, please try again.',
      });
    }
  };

  const handleProcessPlateScan = async (imageUri: string, base64Uri: string, plateData?: any) => {
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

    if (combined) {
      setEnteredMotorcycle(combined);
    }

    const bikeNumber = combined || enteredMotorcycle;
    if (bikeNumber && employee) {
      try {
        const res = await workApi.getLastKM(employee.id, bikeNumber);
        if (res?.registration_image) {
          setActiveBikeRegistrationImage(res.registration_image);
        }
        if (res && res.last_end_km > 0) {
          setStartKm(String(res.last_end_km));
          setAutoKmFetched(true);
        }

        setNeedsOilChange(Boolean(res?.needs_oil_change));

        if (res?.needs_oil_change) {
          setIsPlateConfirmed(false);
          setOilChangeModalState({
            visible: false,
            bikeNumber,
          });
          setCurrentTab('oil-change');
          mainScrollRef.current?.scrollTo({ y: 0, animated: true });
        }
      } catch (err) {
        console.log('Error checking bike oil/km after scan:', err);
      }
    }
  };

  const proceedStartShift = async (
    startVal: number,
    photoUri: string,
    platePhotoUri?: string | null
  ) => {
    if (!employee) return;

    const savedMoto = enteredMotorcycle.trim();
    const savedStartKm = startVal;
    const savedPhoto = photoUri;
    const savedPlatePhoto = platePhotoUri || startPlateImageRef.current || startPlateImage;
    const savedNotes = startNotes;

    setSubmitting(true);

    try {
      const newSession = await workApi.startShift({
        employee_id: employee.id,
        motorcycle_number: savedMoto,
        start_km: savedStartKm,
        start_km_image: savedPhoto || undefined,
        start_plate_image: savedPlatePhoto || undefined,
        notes: savedNotes,
      });

      if (newSession && newSession.id) {
        // 1. Lock in activeSession and persist to cache BEFORE navigating to Home
        // This guarantees HomeScreen renders "End Shift" + Timer immediately on frame 1
        const confirmedSession = await shiftSessionService.confirmShiftStarted(
          newSession,
          employee.id,
          savedMoto,
          savedStartKm
        );
        setActiveSession(confirmedSession);
        setIsSessionSyncing(true);
        setTimeout(() => {
          setIsSessionSyncing(false);
        }, 450);

        // 2. Clean start shift inputs
        setStartKm('');
        startKmImageRef.current = null;
        setStartKmImage(null);
        startPlateImageRef.current = null;
        setStartPlateImage(null);
        setIsPlateConfirmed(false);
        setStartNotes('');
        setAutoKmFetched(false);

        // 3. Navigate to Home screen seamlessly
        mainScrollRef.current?.scrollTo({ y: 0, animated: false });
        setCurrentTab('home');

        fetchHistory(employee.id).catch(() => {});
        workApi
          .getMe()
          .then((me) => {
            if (me) setEmployee(me);
          })
          .catch(() => {});
      } else {
        throw new Error(
          lang === 'ar'
            ? 'تعذر بدء الشفت، لم يتم استلام بيانات الجلسة من الخادم'
            : 'Failed to start shift, invalid server response'
        );
      }
    } catch (err: any) {
      console.error('Start shift error:', err);
      setAlertConfig({
        type: 'error',
        title: lang === 'ar' ? 'خطأ في بدء الدوام' : 'Shift Error',
        message:
          err?.message ||
          (lang === 'ar' ? 'تعذر بدء الشفت، يرجى المحاولة ثانية' : 'Failed to start shift'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartShift = async () => {
    if (!employee) return;

    if (!enteredMotorcycle.trim()) {
      setAlertConfig({
        type: 'warning',
        title: t.actualBikeNumber,
        message: t.actualBikePlaceholder,
      });
      return;
    }

    const platePhoto = startPlateImageRef.current || startPlateImage;
    if (!platePhoto) {
      setAlertConfig({
        type: 'warning',
        title: lang === 'ar' ? 'تصوير اللوحة إلزامي' : 'Plate Photo Required',
        message:
          lang === 'ar'
            ? 'يجب مسح وتصوير لوحة الدباب بالكاميرا لتوثيق اللوحة وإثبات وجودها قبل بدء الدوام.'
            : 'You must scan/capture the motorcycle plate photo before starting your shift.',
      });
      setIsPlateConfirmed(false);
      return;
    }

    let startVal = Number(startKm);
    let photoUri = startKmImageRef.current || startKmImage;

    if (!isOdometerBroken) {
      if (!startKm || isNaN(startVal) || startVal <= 0) {
        setAlertConfig({
          type: 'warning',
          title: t.startKmInputLabel,
          message: t.startKmPlaceholder,
        });
        return;
      }

      if (!photoUri) {
        setAlertConfig({
          type: 'warning',
          title: t.startKmPhotoLabel,
          message: t.odometerGuideSub,
        });
        return;
      }
    } else {
      startVal = 0;
      photoUri = '';
    }

    proceedStartShift(startVal, photoUri, platePhoto);
  };

  const proceedEndShift = async (
    endVal: number,
    distanceVal: number,
    countVal: number,
    fuelVal: number,
    photoUri: string | null,
    isExemptOdometer: boolean
  ) => {
    if (!employee || !activeSession) return;

    setSubmitting(true);
    try {
      const savedEndKm = endVal;
      const savedOrders = countVal;
      const savedFuel = fuelVal;
      const savedPhoto = isExemptOdometer ? undefined : photoUri || undefined;
      const savedNotes = endNotes;

      await workApi.endShift({
        employee_id: employee.id,
        end_km: savedEndKm,
        orders_count: savedOrders,
        fuel_cost: savedFuel,
        end_km_image: savedPhoto,
        notes: savedNotes,
      });

      await shiftSessionService.confirmShiftEnded();
      setActiveSession(null);
      setIsSessionSyncing(false);

      const currentMonth = getCurrentMonthInfo(lang);
      setSelectedHistoryMonthKey(currentMonth.key);
      setSelectedHistoryMonthLabel(currentMonth.label);
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
      setCurrentTab('history');

      setActiveBikeRegistrationImage(null);
      setEndKm('');
      endKmImageRef.current = null;
      setEndKmImage(null);
      setOrdersCount('');
      setFuelCost('');
      setEndNotes('');

      workApi
        .getMe()
        .then(async (fresh) => {
          if (fresh && fresh.id) {
            setEmployee(fresh);
            if (fresh.motorcycle_number) {
              setEnteredMotorcycle(fresh.motorcycle_number);
            }
            await saveCachedUser(fresh);
          }
        })
        .catch((e) => console.log('Notice refreshing profile on End Shift:', e));

      fetchHistory(employee.id);
    } catch (err: any) {
      console.error('End shift error:', err);
      setAlertConfig({
        type: 'error',
        title: lang === 'ar' ? 'خطأ' : 'Error',
        message:
          err?.message ||
          (lang === 'ar' ? 'تعذر إنهاء الشفت، يرجى المحاولة ثانية' : 'Failed to end shift'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndShift = async () => {
    if (!employee || !activeSession) return;

    let endVal = Number(endKm);
    const startVal = Number(activeSession.start_km || 0);
    const isExemptOdometer = isOdometerBroken || (startVal === 0 && !activeSession.start_km_image);

    const countVal = Number(ordersCount) || 0;
    const fuelVal = Number(fuelCost) || 0;
    const distanceVal = isExemptOdometer ? 0 : Math.max(0, endVal - startVal);
    const photoUri = endKmImageRef.current || endKmImage;

    if (!isExemptOdometer) {
      if (!endKm || isNaN(endVal) || endVal <= 0) {
        setAlertConfig({
          type: 'warning',
          title: t.endKmInputLabel,
          message: `${t.startKmLabel}: ${startVal} ${t.km}`,
        });
        return;
      }

      if (endVal < startVal) {
        setAlertConfig({
          type: 'warning',
          title: lang === 'ar' ? 'تنبيه في قراءة العداد' : 'Odometer Error',
          message:
            lang === 'ar'
              ? `عداد النهاية (${endVal}) لا يمكن أن يكون أقل من عداد البداية (${startVal})`
              : `End KM (${endVal}) cannot be less than Start KM (${startVal})`,
        });
        return;
      }

      if (!photoUri) {
        setAlertConfig({
          type: 'warning',
          title: t.endKmPhotoLabel,
          message: t.odometerGuideSub,
        });
        return;
      }
    } else {
      endVal = 0;
    }

    if (countVal < 1) {
      setAlertConfig({
        type: 'confirm',
        title: lang === 'ar' ? 'تأكيد عدد الطلبات' : 'Confirm Orders Count',
        message:
          lang === 'ar'
            ? 'هل أنت متأكد أن عدد الطلبات هو 0؟'
            : 'Are you sure the orders count is 0?',
        primaryButtonText: lang === 'ar' ? 'نعم، تأكيد إنهاء الدوام' : 'Yes, End Shift',
        secondaryButtonText: lang === 'ar' ? 'تعديل عدد الطلبات' : 'Edit Orders',
        onPrimaryPress: () => {
          proceedEndShift(endVal, distanceVal, countVal, fuelVal, photoUri, isExemptOdometer);
        },
      });
      return;
    }

    proceedEndShift(endVal, distanceVal, countVal, fuelVal, photoUri, isExemptOdometer);
  };

  return {
    takeOdometerPhoto,
    handleScanPlate,
    handleClosePlateScanner,
    handleStartShiftClick,
    handleNavigateToTab,
    handleRecheckOil,
    handleProcessPlateScan,
    handleStartShift,
    handleEndShift,
  };
}

