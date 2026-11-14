import React from 'react';
import {
  KeyboardAvoidingView,
  ScrollView,
  RefreshControl,
  Platform,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import {
  EmployeeProfile,
  WorkSession,
  PreviewPhotoData,
  TabType,
  Language,
  ThemeColors,
} from '../types/delegate';
import { DelegateViolation } from '../services/api';
import { HomeScreen } from '../screens/HomeScreen';
import { ShiftScreen } from '../features/shift';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ViolationsScreen } from '../screens/ViolationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { OilChangeScreen } from '../screens/OilChangeScreen';
import { ModuleErrorBoundary } from './ModuleErrorBoundary';
import { HOME_HEADER_HEIGHT } from '../hooks/useCollapsibleHomeHeader';

interface DelegateTabContentRouterProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  employee: EmployeeProfile;
  empPhotoUrl: string | null;
  activeSession: WorkSession | null;
  isSessionSyncing: boolean;
  historySessions: WorkSession[];
  selectedHistorySession: WorkSession | null;
  setSelectedHistorySession: (session: WorkSession | null) => void;
  loadingHistory: boolean;
  selectedHistoryMonthKey: string | null;
  setSelectedHistoryMonthKey: (key: string | null) => void;
  setSelectedHistoryMonthLabel: (label: string | null) => void;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  checkSession: (showLoading?: boolean) => Promise<void>;
  fetchHistory: (employeeId: string, showSpinner?: boolean) => Promise<void>;
  fetchViolations: (employeeId: string) => void;
  violations: DelegateViolation[];
  violationsLoading: boolean;
  totalViolationsAmount: number;
  deductedViolationsAmount: number;
  monthlyTarget: number;
  totalApprovedOrdersCount: number;
  totalPendingOrdersCount: number;
  isTargetAchieved: boolean;
  expectedSalary: number;
  targetProgressPct: number;
  remainingOrdersToTarget: number;
  calculatedDistance: number;
  enteredMotorcycle: string;
  setEnteredMotorcycle: (val: string) => void;
  startKm: string;
  setStartKm: (val: string) => void;
  autoKmFetched: boolean;
  isOdometerBroken: boolean;
  startKmImage: string | null;
  startPlateImage: string | null;
  isPlateConfirmed: boolean;
  setIsPlateConfirmed: (val: boolean) => void;
  startNotes: string;
  setStartNotes: (val: string) => void;
  endKm: string;
  setEndKm: (val: string) => void;
  endKmImage: string | null;
  ordersCount: string;
  setOrdersCount: (val: string) => void;
  fuelCost: string;
  setFuelCost: (val: string) => void;
  endNotes: string;
  setEndNotes: (val: string) => void;
  submitting: boolean;
  isScanningPlate: boolean;
  takeOdometerPhoto: (type: 'start' | 'end') => Promise<void>;
  handleScanPlate: () => void;
  handleStartShift: () => Promise<void>;
  handleEndShift: () => Promise<void>;
  handleCheckEndKmDistance: (val?: string) => void;
  handleNavigateToTab: (tab: TabType) => void;
  handleStartShiftClick: () => void;
  handleRecheckOil: () => Promise<boolean | void>;
  activeBikeRegistrationImage: string | null;
  needsOilChange: boolean;
  setOilChangeModalState: React.Dispatch<
    React.SetStateAction<{ visible: boolean; bikeNumber: string }>
  >;
  setShowPlateScannerModal: (visible: boolean) => void;
  setShowTargetCelebrationModal: (visible: boolean) => void;
  setShowQrModal: (visible: boolean) => void;
  setShowLangModal: (visible: boolean) => void;
  toggleTheme: () => Promise<void>;
  handleCheckForUpdates: (manual?: boolean) => void;
  setShowDiagnosticsModal: (visible: boolean) => void;
  setMainScrollEnabled: (enabled: boolean) => void;
  handleLogout: () => void;
  setPreviewPhoto: (photo: PreviewPhotoData | null) => void;
  onUpdateEmployee: (updated: EmployeeProfile) => Promise<void>;
  mainScrollRef: React.RefObject<ScrollView | null>;
  mainScrollEnabled: boolean;
  handleHomeScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  topInset: number;
  keyboardOffset: number;
  formatTimeStr: (iso?: string) => string;
  formatDateStr: (iso?: string) => string;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  lang: Language;
  t: any;
}

export const DelegateTabContentRouter: React.FC<DelegateTabContentRouterProps> = React.memo(({
  currentTab,
  setCurrentTab,
  employee,
  empPhotoUrl,
  activeSession,
  isSessionSyncing,
  historySessions,
  selectedHistorySession,
  setSelectedHistorySession,
  loadingHistory,
  selectedHistoryMonthKey,
  setSelectedHistoryMonthKey,
  setSelectedHistoryMonthLabel,
  refreshing,
  onRefresh,
  checkSession,
  fetchHistory,
  fetchViolations,
  violations,
  violationsLoading,
  totalViolationsAmount,
  deductedViolationsAmount,
  monthlyTarget,
  totalApprovedOrdersCount,
  totalPendingOrdersCount,
  isTargetAchieved,
  expectedSalary,
  targetProgressPct,
  remainingOrdersToTarget,
  calculatedDistance,
  enteredMotorcycle,
  setEnteredMotorcycle,
  startKm,
  setStartKm,
  autoKmFetched,
  isOdometerBroken,
  startKmImage,
  startPlateImage,
  isPlateConfirmed,
  setIsPlateConfirmed,
  startNotes,
  setStartNotes,
  endKm,
  setEndKm,
  endKmImage,
  ordersCount,
  setOrdersCount,
  fuelCost,
  setFuelCost,
  endNotes,
  setEndNotes,
  submitting,
  isScanningPlate,
  takeOdometerPhoto,
  handleScanPlate,
  handleStartShift,
  handleEndShift,
  handleCheckEndKmDistance,
  handleNavigateToTab,
  handleStartShiftClick,
  handleRecheckOil,
  activeBikeRegistrationImage,
  needsOilChange,
  setOilChangeModalState,
  setShowPlateScannerModal,
  setShowTargetCelebrationModal,
  setShowQrModal,
  setShowLangModal,
  toggleTheme,
  handleCheckForUpdates,
  setShowDiagnosticsModal,
  setMainScrollEnabled,
  handleLogout,
  setPreviewPhoto,
  onUpdateEmployee,
  mainScrollRef,
  mainScrollEnabled,
  handleHomeScroll,
  topInset,
  keyboardOffset,
  formatTimeStr,
  formatDateStr,
  colors,
  isDarkMode,
  isRTL,
  lang,
  t,
}) => {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {currentTab === 'violations' ? (
        <ModuleErrorBoundary
          moduleName="المخالفات والجزاءات"
          colors={colors}
          onReset={() => {
            if (employee?.id) fetchViolations(employee.id);
          }}
        >
          <ViolationsScreen
            violations={violations}
            loading={violationsLoading}
            totalAmount={totalViolationsAmount}
            deductedAmount={deductedViolationsAmount}
            onRefresh={() => {
              if (employee?.id) fetchViolations(employee.id);
            }}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            t={t}
            lang={lang}
          />
        </ModuleErrorBoundary>
      ) : (
        <ScrollView
          ref={mainScrollRef}
          scrollEnabled={mainScrollEnabled}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScroll={handleHomeScroll}
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.mainScrollContent,
            {
              paddingTop: currentTab === 'home' ? topInset + HOME_HEADER_HEIGHT : 0,
              paddingBottom: 24 + (keyboardOffset > 0 ? keyboardOffset + 24 : 0),
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressViewOffset={topInset + (currentTab === 'home' ? HOME_HEADER_HEIGHT : 0)}
            />
          }
        >
          {currentTab === 'home' && (
            <ModuleErrorBoundary moduleName="الرئيسية" colors={colors} onReset={onRefresh}>
              <HomeScreen
                employee={employee}
                activeSession={activeSession}
                isSessionSyncing={isSessionSyncing}
                isHomeLoading={isSessionSyncing && !activeSession && historySessions.length === 0}
                historySessions={historySessions}
                totalApprovedOrdersCount={totalApprovedOrdersCount}
                pendingOrdersCount={totalPendingOrdersCount}
                monthlyTarget={monthlyTarget}
                isTargetAchieved={isTargetAchieved}
                expectedSalary={expectedSalary}
                targetProgressPct={targetProgressPct}
                remainingOrdersToTarget={remainingOrdersToTarget}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                t={t}
                lang={lang}
                violations={violations}
                totalViolationsAmount={totalViolationsAmount}
                deductedViolationsAmount={deductedViolationsAmount}
                onNavigateToTab={handleNavigateToTab}
                onStartShiftClick={handleStartShiftClick}
                onShowCelebration={() => setShowTargetCelebrationModal(true)}
              />
            </ModuleErrorBoundary>
          )}

          {currentTab === 'shift' && (
            <ModuleErrorBoundary moduleName="إدارة الشفت" colors={colors} onReset={() => checkSession(false)}>
              <ShiftScreen
                employee={employee}
                activeSession={activeSession}
                isSessionSyncing={isSessionSyncing}
                enteredMotorcycle={enteredMotorcycle}
                setEnteredMotorcycle={setEnteredMotorcycle}
                startKm={startKm}
                setStartKm={setStartKm}
                autoKmFetched={autoKmFetched}
                isOdometerBroken={isOdometerBroken}
                startKmImage={startKmImage}
                startPlateImage={startPlateImage}
                isPlateConfirmed={isPlateConfirmed}
                setIsPlateConfirmed={setIsPlateConfirmed}
                startNotes={startNotes}
                setStartNotes={setStartNotes}
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
                onScrollToInput={(y) => mainScrollRef.current?.scrollTo({ y, animated: true })}
                submitting={submitting}
                onTakeOdometerPhoto={takeOdometerPhoto}
                onScanPlate={handleScanPlate}
                isScanningPlate={isScanningPlate}
                onStartShift={handleStartShift}
                onEndShift={handleEndShift}
                onCheckHighDistance={handleCheckEndKmDistance}
                activeBikeRegistrationImage={activeBikeRegistrationImage}
                needsOilChange={needsOilChange}
                onOpenOilChangeModal={() =>
                  setOilChangeModalState({
                    visible: true,
                    bikeNumber: enteredMotorcycle,
                  })
                }
                onPreviewPhoto={setPreviewPhoto}
                formatTimeStr={formatTimeStr}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                t={t}
                lang={lang}
              />
            </ModuleErrorBoundary>
          )}

          {currentTab === 'history' && (
            <ModuleErrorBoundary
              moduleName="سجل الشفتات"
              colors={colors}
              onReset={() => {
                if (employee?.id) fetchHistory(employee.id);
              }}
            >
              <HistoryScreen
                historySessions={historySessions}
                loading={loadingHistory}
                selectedSession={selectedHistorySession}
                onSelectSession={setSelectedHistorySession}
                selectedMonthKey={selectedHistoryMonthKey}
                onSelectMonthKey={(key, label) => {
                  setSelectedHistoryMonthKey(key);
                  setSelectedHistoryMonthLabel(label);
                }}
                onPreviewPhoto={setPreviewPhoto}
                formatDateStr={formatDateStr}
                formatTimeStr={formatTimeStr}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                t={t}
                lang={lang}
                monthlyTarget={monthlyTarget}
              />
            </ModuleErrorBoundary>
          )}

          {currentTab === 'profile' && (
            <ModuleErrorBoundary moduleName="الملف الشخصي" colors={colors} onReset={() => checkSession(false)}>
              <ProfileScreen
                employee={employee}
                activeSession={activeSession}
                activeBikeRegistrationImage={activeBikeRegistrationImage}
                empPhotoUrl={empPhotoUrl}
                lang={lang}
                onOpenQrModal={() => setShowQrModal(true)}
                onOpenLangModal={() => setShowLangModal(true)}
                onToggleTheme={toggleTheme}
                onCheckForUpdates={() => handleCheckForUpdates(true)}
                onOpenDiagnostics={() => setShowDiagnosticsModal(true)}
                setParentScrollEnabled={setMainScrollEnabled}
                onLogout={handleLogout}
                onPreviewPhoto={setPreviewPhoto}
                onUpdateEmployee={onUpdateEmployee}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                t={t}
              />
            </ModuleErrorBoundary>
          )}

          {currentTab === 'oil-change' && (
            <ModuleErrorBoundary moduleName="صفحة تغيير الزيت" colors={colors} onReset={handleRecheckOil}>
              <OilChangeScreen
                motorcycleNumber={enteredMotorcycle}
                distanceSinceOil={Number(startKm) || 0}
                colors={colors}
                isDarkMode={isDarkMode}
                isRTL={isRTL}
                lang={lang}
                t={t}
                onRecheck={handleRecheckOil}
                onScanAnother={() => setShowPlateScannerModal(true)}
                onBackToHome={() => setCurrentTab('home')}
              />
            </ModuleErrorBoundary>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
});

const styles = StyleSheet.create({
  mainScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
});
