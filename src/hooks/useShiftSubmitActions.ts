import { useCallback } from 'react';
import { WorkSession } from '../types/delegate';
import { workApi } from '../services/work';
import { saveCachedUser } from '../services/api';
import { getCurrentMonthInfo } from '../screens/HistoryScreen';
import { ShiftActionsDeps } from './useShiftMediaHandlers';

export function useShiftSubmitActions(deps: ShiftActionsDeps) {
  const {
    employee,
    setEmployee,
    activeSession,
    setActiveSession,
    setSubmitting,
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
    setIsPlateConfirmed,
    startNotes,
    setStartNotes,
    setAutoKmFetched,
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
    setCurrentTab,
    setAlertConfig,
    setSelectedHistoryMonthKey,
    setSelectedHistoryMonthLabel,
    mainScrollRef,
    fetchHistory,
    lang,
    t,
  } = deps;

  const proceedStartShift = useCallback(
    async (startVal: number, photoUri: string, platePhotoUri?: string | null) => {
      if (!employee) return;

      const savedMoto = enteredMotorcycle.trim();
      const savedPlatePhoto = platePhotoUri || startPlateImageRef.current || startPlateImage;
      const savedNotes = startNotes;

      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
      setCurrentTab('home');

      setStartKm('');
      startKmImageRef.current = null;
      setStartKmImage(null);
      startPlateImageRef.current = null;
      setStartPlateImage(null);
      setIsPlateConfirmed(false);
      setStartNotes('');
      setAutoKmFetched(false);

      const optimisticSession: WorkSession = {
        id: 'temp-' + Date.now(),
        employee_id: employee.id,
        motorcycle_number: savedMoto,
        start_km: startVal,
        start_km_image: photoUri || undefined,
        start_plate_image: savedPlatePhoto || undefined,
        notes: savedNotes,
        start_time: new Date().toISOString(),
        end_time: null,
        end_km: 0,
        distance: 0,
        orders_count: 0,
        fuel_cost: 0,
        status: 'ACTIVE',
      };
      setActiveSession(optimisticSession);
      setSubmitting(true);

      try {
        const newSession = await workApi.startShift({
          employee_id: employee.id,
          motorcycle_number: savedMoto,
          start_km: startVal,
          start_km_image: photoUri || undefined,
          start_plate_image: savedPlatePhoto || undefined,
          notes: savedNotes,
        });

        if (newSession && newSession.id) {
          setActiveSession({
            ...newSession,
            start_time: optimisticSession.start_time || newSession.start_time,
          });
          fetchHistory(employee.id).catch(() => {});
          workApi
            .getMe()
            .then((me) => {
              if (me) setEmployee(me);
            })
            .catch(() => {});
        }
      } catch (err: any) {
        console.error('Start shift error:', err);
        setActiveSession(null);
        setCurrentTab('shift');
        setStartKm(String(startVal));
        setStartNotes(savedNotes);
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
    },
    [employee, enteredMotorcycle, fetchHistory, lang, mainScrollRef, setActiveSession, setAlertConfig, setAutoKmFetched, setCurrentTab, setEmployee, setIsPlateConfirmed, setStartKm, setStartKmImage, setStartNotes, setStartPlateImage, setSubmitting, startKmImageRef, startNotes, startPlateImage, startPlateImageRef]
  );

  const handleStartShift = useCallback(async () => {
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
  }, [employee, enteredMotorcycle, isOdometerBroken, lang, proceedStartShift, setAlertConfig, setIsPlateConfirmed, startKm, startKmImage, startKmImageRef, startPlateImage, startPlateImageRef, t]);

  const proceedEndShift = useCallback(
    async (
      endVal: number,
      _distanceVal: number,
      countVal: number,
      fuelVal: number,
      photoUri: string | null,
      isExemptOdometer: boolean
    ) => {
      if (!employee || !activeSession) return;

      setSubmitting(true);
      try {
        const savedPhoto = isExemptOdometer ? undefined : photoUri || undefined;
        await workApi.endShift({
          employee_id: employee.id,
          end_km: endVal,
          orders_count: countVal,
          fuel_cost: fuelVal,
          end_km_image: savedPhoto,
          notes: endNotes,
        });

        const currentMonth = getCurrentMonthInfo(lang);
        setSelectedHistoryMonthKey(currentMonth.key);
        setSelectedHistoryMonthLabel(currentMonth.label);
        mainScrollRef.current?.scrollTo({ y: 0, animated: false });
        setCurrentTab('history');

        setActiveSession(null);
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
              if (fresh.motorcycle_number) setEnteredMotorcycle(fresh.motorcycle_number);
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
    },
    [activeSession, employee, endKmImageRef, endNotes, fetchHistory, lang, mainScrollRef, setActiveBikeRegistrationImage, setActiveSession, setAlertConfig, setCurrentTab, setEmployee, setEndKm, setEndKmImage, setEndNotes, setEnteredMotorcycle, setFuelCost, setOrdersCount, setSelectedHistoryMonthKey, setSelectedHistoryMonthLabel, setSubmitting]
  );

  const handleEndShift = useCallback(async () => {
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
        message: lang === 'ar' ? 'هل أنت متأكد أن عدد الطلبات هو 0؟' : 'Are you sure the orders count is 0?',
        primaryButtonText: lang === 'ar' ? 'نعم، تأكيد إنهاء الدوام' : 'Yes, End Shift',
        secondaryButtonText: lang === 'ar' ? 'تعديل عدد الطلبات' : 'Edit Orders',
        onPrimaryPress: () => proceedEndShift(endVal, distanceVal, countVal, fuelVal, photoUri, isExemptOdometer),
      });
      return;
    }

    proceedEndShift(endVal, distanceVal, countVal, fuelVal, photoUri, isExemptOdometer);
  }, [activeSession, employee, endKm, endKmImage, endKmImageRef, fuelCost, isOdometerBroken, lang, ordersCount, proceedEndShift, setAlertConfig, t]);

  return { handleStartShift, handleEndShift };
}
