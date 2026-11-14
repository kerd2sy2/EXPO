import React from 'react';
import { ScrollView } from 'react-native';
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
import {
  getDistanceAlertMsg,
  getDistanceAlertTitle,
  getConfirmBtnText,
  getEditBtnText,
} from './shiftControllerHelpers';

export interface BuildShiftEndActionsParams {
  employee: EmployeeProfile | null;
  setEmployee: React.Dispatch<React.SetStateAction<EmployeeProfile | null>>;
  activeSession: WorkSession | null;
  setActiveSession: React.Dispatch<React.SetStateAction<WorkSession | null>>;
  setIsSessionSyncing: React.Dispatch<React.SetStateAction<boolean>>;
  setSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentTab: (tab: TabType) => void;
  mainScrollRef: React.RefObject<ScrollView | null>;
  setAlertConfig: (config: AlertModalConfig | null) => void;
  setSelectedHistoryMonthKey: (key: string | null) => void;
  setSelectedHistoryMonthLabel: (label: string | null) => void;
  fetchHistory: (employeeId: string) => Promise<void>;
  lang: Language;
  t: any;
  setEnteredMotorcycle: React.Dispatch<React.SetStateAction<string>>;
  isOdometerBroken: boolean;
  setActiveBikeRegistrationImage: React.Dispatch<React.SetStateAction<string | null>>;
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
  confirmedHighDistanceRef: React.MutableRefObject<number | null>;
}

export function buildShiftEndActions({
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
}: BuildShiftEndActionsParams) {
  const proceedEndShift = async (
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
        .getMe(true)
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

  const confirmOrProceedOrders = (
    endVal: number,
    distanceVal: number,
    countVal: number,
    fuelVal: number,
    photoUri: string | null,
    isExemptOdometer: boolean
  ) => {
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

  const handleCheckEndKmDistance = (rawEndKm?: string) => {
    const val = rawEndKm !== undefined ? Number(rawEndKm) : Number(endKm);
    const startVal = Number(activeSession?.start_km || 0);
    const isExempt = isOdometerBroken || (startVal === 0 && !activeSession?.start_km_image);
    if (isExempt || isNaN(val) || val <= startVal) return;

    const dist = val - startVal;
    if (dist > 600 && confirmedHighDistanceRef.current !== dist) {
      setAlertConfig({
        type: 'confirm',
        title: getDistanceAlertTitle(lang),
        message: getDistanceAlertMsg(lang, dist),
        primaryButtonText: getConfirmBtnText(lang, dist),
        secondaryButtonText: getEditBtnText(lang),
        onPrimaryPress: () => {
          confirmedHighDistanceRef.current = dist;
          setAlertConfig(null);
        },
        onSecondaryPress: () => {
          setAlertConfig(null);
        },
      });
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

      if (distanceVal > 600 && confirmedHighDistanceRef.current !== distanceVal) {
        setAlertConfig({
          type: 'confirm',
          title: getDistanceAlertTitle(lang),
          message: getDistanceAlertMsg(lang, distanceVal),
          primaryButtonText: getConfirmBtnText(lang, distanceVal),
          secondaryButtonText: getEditBtnText(lang),
          onPrimaryPress: () => {
            confirmedHighDistanceRef.current = distanceVal;
            confirmOrProceedOrders(endVal, distanceVal, countVal, fuelVal, photoUri, isExemptOdometer);
          },
          onSecondaryPress: () => {
            setAlertConfig(null);
          },
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

    confirmOrProceedOrders(endVal, distanceVal, countVal, fuelVal, photoUri, isExemptOdometer);
  };

  return {
    handleCheckEndKmDistance,
    handleEndShift,
  };
}
