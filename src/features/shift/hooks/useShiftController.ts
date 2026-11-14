import { useRef, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { TabType } from '../../../types/delegate';
import { workApi } from '../../../services/work';
import { getCurrentMonthInfo } from '../../../screens/HistoryScreen';
import { shiftSessionService } from '../services/shiftSessionService';
import {
  UseShiftControllerParams,
  isBrokenOdometerBike,
} from './shiftControllerHelpers';
import { buildShiftEndActions } from './shiftEndActions';

export function useShiftController(params: UseShiftControllerParams) {
  const {
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
  } = params;

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
          [{ resize: { width: 720 } }],
          { compress: 0.4, format: ImageManipulator.SaveFormat.JPEG, base64: true }
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
        const broken = isBrokenOdometerBike(res?.is_odometer_broken, bikeToCheck);
        if (broken) {
          setStartKm('0');
          setAutoKmFetched(false);
        } else if (res && res.last_end_km > 0) {
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
        const broken = isBrokenOdometerBike(res?.is_odometer_broken, bikeNumber);
        if (broken) {
          setStartKm('0');
          setAutoKmFetched(false);
        } else if (res && res.last_end_km > 0) {
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
    const savedPlatePhoto = platePhotoUri || startPlateImageRef.current || startPlateImage;

    setSubmitting(true);
    try {
      const newSession = await workApi.startShift({
        employee_id: employee.id,
        motorcycle_number: savedMoto,
        start_km: startVal,
        start_km_image: photoUri || undefined,
        start_plate_image: savedPlatePhoto || undefined,
        notes: startNotes,
      });

      if (newSession && newSession.id) {
        const confirmedSession = await shiftSessionService.confirmShiftStarted(
          newSession,
          employee.id,
          savedMoto,
          startVal
        );
        setActiveSession(confirmedSession);
        setIsSessionSyncing(true);
        setTimeout(() => {
          setIsSessionSyncing(false);
        }, 450);

        setStartKm('');
        startKmImageRef.current = null;
        setStartKmImage(null);
        startPlateImageRef.current = null;
        setStartPlateImage(null);
        setIsPlateConfirmed(false);
        setStartNotes('');
        setAutoKmFetched(false);

        mainScrollRef.current?.scrollTo({ y: 0, animated: false });
        setCurrentTab('home');

        fetchHistory(employee.id).catch(() => {});
        workApi
          .getMe(true)
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

    const isAssignedBikeConfirmed =
      Boolean(employee?.motorcycle_number) &&
      Boolean(enteredMotorcycle) &&
      (enteredMotorcycle.trim().toLowerCase() === employee?.motorcycle_number?.trim().toLowerCase() ||
        enteredMotorcycle.trim().replace(/\s+/g, '').toLowerCase() ===
          employee?.motorcycle_number?.trim().replace(/\s+/g, '').toLowerCase());

    const platePhoto = startPlateImageRef.current || startPlateImage;
    if (!platePhoto && !isAssignedBikeConfirmed) {
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

  const confirmedHighDistanceRef = useRef<number | null>(null);
  useEffect(() => {
    confirmedHighDistanceRef.current = null;
  }, [endKm]);

  const { handleCheckEndKmDistance, handleEndShift } = buildShiftEndActions({
    employee,
    setEmployee,
    activeSession,
    setActiveSession,
    setIsSessionSyncing,
    setSubmitting,
    setCurrentTab,
    mainScrollRef,
    setAlertConfig,
    setSelectedHistoryMonthKey,
    setSelectedHistoryMonthLabel,
    fetchHistory,
    lang,
    t,
    setEnteredMotorcycle,
    isOdometerBroken,
    setActiveBikeRegistrationImage,
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
    confirmedHighDistanceRef,
  });

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
    handleCheckEndKmDistance,
  };
}
