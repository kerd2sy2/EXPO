import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ShiftScreenProps } from './types/shift.types';
import { StartShiftSection } from './components/StartShiftSection';
import { EndShiftSection } from './components/EndShiftSection';
import { ShiftCardSkeleton } from './components/ShiftCardSkeleton';
import { ModuleErrorBoundary } from '../../components/ModuleErrorBoundary';
import { parsePlateComponents, getPlateLetterSlots } from '../../utils/plateUtils';

export const ShiftScreen: React.FC<ShiftScreenProps> = ({
  employee,
  activeSession,
  isSessionSyncing = false,
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
  needsOilChange,
  onOpenOilChangeModal,
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

  // Verification matching against assigned motorcycle / vehicle (supports 2-letter motorcycles & 3-letter cars)
  const assignedBike = employee?.motorcycle_number || '';
  const assignedParsed = parsePlateComponents(assignedBike);
  const normalizeLettersKey = (str: string) =>
    getPlateLetterSlots(str)
      .enSlots.filter(Boolean)
      .sort()
      .join('');
  const isBikeMatching =
    Boolean(plateDigits) &&
    (assignedParsed.digits ? plateDigits === assignedParsed.digits : true) &&
    (assignedParsed.letters && plateLetters
      ? normalizeLettersKey(plateLetters) === normalizeLettersKey(assignedParsed.letters)
      : true);

  if (isSessionSyncing && !activeSession) {
    return (
      <View style={styles.tabContainer}>
        <ShiftCardSkeleton colors={colors} isDarkMode={isDarkMode} isRTL={isRTL} />
      </View>
    );
  }

  return (
    <View style={styles.tabContainer}>
      {!activeSession ? (
        /* =========================================================================
            START SHIFT FORM
           ========================================================================= */
        <ModuleErrorBoundary moduleName="نموذج بدء الدوام" colors={colors}>
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
            needsOilChange={needsOilChange}
            onOpenOilChangeModal={onOpenOilChangeModal}
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
        </ModuleErrorBoundary>
      ) : (
        /* =========================================================================
            END SHIFT FORM (Active Shift in Progress)
           ========================================================================= */
        <ModuleErrorBoundary moduleName="نموذج إنهاء الدوام" colors={colors}>
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
        </ModuleErrorBoundary>
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
