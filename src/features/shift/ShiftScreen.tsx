import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ShiftScreenProps } from './types/shift.types';
import { StartShiftSection } from './components/StartShiftSection';
import { EndShiftSection } from './components/EndShiftSection';
import { parsePlateComponents } from '../../utils/plateUtils';


export const ShiftScreen: React.FC<ShiftScreenProps> = ({
  employee,
  activeSession,
  enteredMotorcycle,
  setEnteredMotorcycle,
  startKm,
  setStartKm,
  autoKmFetched,
  isOdometerBroken = false,
  startKmImage,
  startPlateImage,
  isPlateConfirmed = false,
  endKm,
  setEndKm,
  endKmImage,
  ordersCount,
  setOrdersCount,
  fuelCost,
  setFuelCost,
  endNotes,
  setEndNotes,
  calculatedDistance,
  elapsedTime,
  onScrollToInput,
  submitting,
  onTakeOdometerPhoto,
  onScanPlate,
  onStartShift,
  onEndShift,
  activeBikeRegistrationImage,
  onPreviewPhoto,
  formatTimeStr,
  colors,
  isDarkMode,
  isRTL,
  t,
  lang = 'ar',
}) => {
  const startKmNum = Number(activeSession?.start_km) || 0;

  // Dual Plate Fields State (Digits & Letters) - only populated when plate photo is captured/confirmed
  const hasCapturedPhoto = Boolean(startPlateImage || isPlateConfirmed);
  const initialParsed = parsePlateComponents(hasCapturedPhoto ? (enteredMotorcycle || '') : '');
  const [plateDigits, setPlateDigits] = useState(initialParsed.digits);
  const [plateLetters, setPlateLetters] = useState(initialParsed.letters);

  // Synchronize internal plate fields when external enteredMotorcycle or startPlateImage changes
  useEffect(() => {
    if (startPlateImage || isPlateConfirmed) {
      const parsed = parsePlateComponents(enteredMotorcycle);
      setPlateDigits(parsed.digits);
      setPlateLetters(parsed.letters);
    } else {
      setPlateDigits('');
      setPlateLetters('');
    }
  }, [enteredMotorcycle, startPlateImage, isPlateConfirmed]);

  const isExemptOdometer = isOdometerBroken || (startKmNum === 0 && !activeSession?.start_km_image);
  const hasBikeNumber = Boolean(plateDigits.trim() || enteredMotorcycle.trim());

  const canStartShift = isOdometerBroken
    ? hasBikeNumber
    : Boolean(
        hasBikeNumber &&
        startKm.trim() &&
        Number(startKm) > 0 &&
        startKmImage
      );

  const canEndShift = isExemptOdometer
    ? true
    : Boolean(
        endKm.trim() &&
        Number(endKm) >= startKmNum &&
        Number(endKm) > 0 &&
        endKmImage
      );

  // Verification matching against assigned motorcycle
  const assignedBike = employee?.motorcycle_number || '';
  const assignedParsed = parsePlateComponents(assignedBike);
  const isBikeMatching =
    Boolean(plateDigits) &&
    (assignedParsed.digits ? plateDigits === assignedParsed.digits : true) &&
    (assignedParsed.letters && plateLetters ? plateLetters === assignedParsed.letters : true);

  return (
    <View style={styles.tabContainer}>
      {!activeSession ? (
        /* =========================================================================
            START SHIFT FORM
           ========================================================================= */
        <StartShiftSection
          enteredMotorcycle={enteredMotorcycle}
          plateDigits={plateDigits}
          plateLetters={plateLetters}
          assignedBike={assignedBike}
          isBikeMatching={isBikeMatching}
          isOdometerBroken={isOdometerBroken}
          startKm={startKm}
          setStartKm={setStartKm}
          autoKmFetched={autoKmFetched}
          startKmImage={startKmImage}
          canStartShift={canStartShift}
          submitting={submitting}
          activeBikeRegistrationImage={activeBikeRegistrationImage}
          onScanPlate={onScanPlate}
          onTakeOdometerPhoto={onTakeOdometerPhoto}
          onStartShift={onStartShift}
          onPreviewPhoto={onPreviewPhoto}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          t={t}
          lang={lang}
        />
      ) : (
        /* =========================================================================
            END SHIFT FORM (Active Shift in Progress)
           ========================================================================= */
        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <EndShiftSection
            isExemptOdometer={isExemptOdometer}
            startKmNum={startKmNum}
            endKm={endKm}
            setEndKm={setEndKm}
            endKmImage={endKmImage}
            ordersCount={ordersCount}
            setOrdersCount={setOrdersCount}
            fuelCost={fuelCost}
            setFuelCost={setFuelCost}
            endNotes={endNotes}
            setEndNotes={setEndNotes}
            calculatedDistance={calculatedDistance}
            canEndShift={canEndShift}
            submitting={submitting}
            onTakeOdometerPhoto={onTakeOdometerPhoto}
            onEndShift={onEndShift}
            onPreviewPhoto={onPreviewPhoto}
            onScrollToInput={onScrollToInput}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            t={t}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    padding: 16,
  },
  mainCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
  },
});
