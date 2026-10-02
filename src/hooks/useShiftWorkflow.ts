import { useState, useEffect, useRef } from 'react';
import { workApi } from '../services/work';
import { EmployeeProfile, WorkSession } from '../types/delegate';

export function useShiftWorkflow(
  employee: EmployeeProfile | null,
  activeSession: WorkSession | null
) {
  // Shift Inputs (Start)
  const [enteredMotorcycle, setEnteredMotorcycle] = useState('');
  const [startKm, setStartKm] = useState('');
  const [startKmImage, setStartKmImage] = useState<string | null>(null);
  const startKmImageRef = useRef<string | null>(null);
  const [startNotes, setStartNotes] = useState('');
  const [autoKmFetched, setAutoKmFetched] = useState(false);
  const [isOdometerBroken, setIsOdometerBroken] = useState(false);
  const [activeBikeRegistrationImage, setActiveBikeRegistrationImage] = useState<string | null>(null);

  // Plate Photo & OCR State
  const [startPlateImage, setStartPlateImage] = useState<string | null>(null);
  const startPlateImageRef = useRef<string | null>(null);
  const [isPlateConfirmed, setIsPlateConfirmed] = useState(false);
  const [isScanningPlate, setIsScanningPlate] = useState(false);

  const isTakingPhotoRef = useRef(false);
  const lastFetchedBikeRef = useRef<string>('');
  const bikeFetchSeqRef = useRef(0);

  // Shift Inputs (End)
  const [endKm, setEndKm] = useState('');
  const [endKmImage, setEndKmImage] = useState<string | null>(null);
  const endKmImageRef = useRef<string | null>(null);
  const [ordersCount, setOrdersCount] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [endNotes, setEndNotes] = useState('');

  // Auto-fetch last KM and registration photo when motorcycle number is typed (Start Shift)
  useEffect(() => {
    if (activeSession || !employee) return;
    const rawBike = enteredMotorcycle.trim();
    const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const bike = rawBike.replace(/[٠-٩]/g, (w) => `${arabicDigits.indexOf(w)}`).trim();

    if (!bike) {
      lastFetchedBikeRef.current = '';
      setStartKm('');
      setAutoKmFetched(false);
      setIsOdometerBroken(false);
      setActiveBikeRegistrationImage(null);
      return;
    }

    const currentSeq = ++bikeFetchSeqRef.current;
    const timer = setTimeout(async () => {
      try {
        const res = await workApi.getLastKM(employee.id, bike);
        if (bikeFetchSeqRef.current !== currentSeq) return;

        lastFetchedBikeRef.current = bike;

        if (res?.registration_image) {
          setActiveBikeRegistrationImage(res.registration_image);
        } else {
          setActiveBikeRegistrationImage(null);
        }

        if (res?.is_odometer_broken) {
          setIsOdometerBroken(true);
          setStartKm('0');
          setAutoKmFetched(false);
        } else {
          setIsOdometerBroken(false);
          if (res && res.last_end_km > 0) {
            setStartKm(String(res.last_end_km));
            setAutoKmFetched(true);
          } else {
            setStartKm('');
            setAutoKmFetched(false);
          }
        }
      } catch (err) {
        if (bikeFetchSeqRef.current !== currentSeq) return;
        setIsOdometerBroken(false);
        console.log('[useShiftWorkflow] No prior KM found for bike:', bike);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [enteredMotorcycle, activeSession, employee?.id]);

  // Check broken odometer and registration image for active session (End Shift)
  useEffect(() => {
    if (activeSession && employee) {
      const bike = activeSession.motorcycle_number || employee.motorcycle_number;
      if (bike) {
        workApi
          .getLastKM(employee.id, bike)
          .then((res) => {
            if (res?.is_odometer_broken || (activeSession.start_km === 0 && !activeSession.start_km_image)) {
              setIsOdometerBroken(true);
            } else {
              setIsOdometerBroken(false);
            }
            if (res && res.registration_image) {
              setActiveBikeRegistrationImage(res.registration_image);
            } else {
              setActiveBikeRegistrationImage(null);
            }
          })
          .catch(() => {
            if (activeSession.start_km === 0 && !activeSession.start_km_image) {
              setIsOdometerBroken(true);
            }
            setActiveBikeRegistrationImage(null);
          });
      } else {
        setActiveBikeRegistrationImage(null);
      }
    } else {
      setActiveBikeRegistrationImage(null);
    }
  }, [activeSession?.id, activeSession?.motorcycle_number, employee?.id]);

  const resetStartInputs = () => {
    setStartKm('');
    setStartKmImage(null);
    startKmImageRef.current = null;
    setStartPlateImage(null);
    startPlateImageRef.current = null;
    setIsPlateConfirmed(false);
    setStartNotes('');
    setAutoKmFetched(false);
  };

  const resetEndInputs = () => {
    setEndKm('');
    setEndKmImage(null);
    endKmImageRef.current = null;
    setOrdersCount('');
    setFuelCost('');
    setEndNotes('');
  };

  return {
    // Start Inputs
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
    isScanningPlate,
    setIsScanningPlate,
    startNotes,
    setStartNotes,
    autoKmFetched,
    setAutoKmFetched,
    isOdometerBroken,
    setIsOdometerBroken,
    activeBikeRegistrationImage,
    setActiveBikeRegistrationImage,
    isTakingPhotoRef,
    resetStartInputs,
    // End Inputs
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
    resetEndInputs,
  };
}
