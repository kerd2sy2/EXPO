import React from 'react';
import { Animated, ScrollView } from 'react-native';
import {
  EmployeeProfile,
  WorkSession,
  SuccessModalData,
  PreviewPhotoData,
  TabType,
  Language,
  ThemeColors,
} from '../../types/delegate';
import { ModuleErrorBoundary } from '../ModuleErrorBoundary';
import { SuccessShiftModal } from './SuccessShiftModal';
import { LanguageModal } from './LanguageModal';
import { QrCodeModal } from './QrCodeModal';
import { ImagePreviewModal } from './ImagePreviewModal';
import { ActionAlertBottomSheet, AlertModalConfig } from './ActionAlertBottomSheet';
import { AppUpdateBottomSheet } from './AppUpdateBottomSheet';
import { DiagnosticsModal } from './DiagnosticsModal';
import { BroadcastModal } from './BroadcastModal';
import { BroadcastHistoryModal } from './BroadcastHistoryModal';
import { OilChangeBottomSheet } from './OilChangeBottomSheet';
import { PlateScannerModal } from '../../features/plate-scanner';
import { AccidentAlertModal } from './AccidentAlertModal';
import { getCurrentMonthInfo } from '../../screens/HistoryScreen';

interface DelegateModalsPortalProps {
  employee: EmployeeProfile;
  activeSession: WorkSession | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  lang: Language;
  t: any;
  mainScrollRef: React.RefObject<ScrollView | null>;
  setCurrentTab: (tab: TabType) => void;
  setSelectedHistoryMonthKey: (key: string | null) => void;
  setSelectedHistoryMonthLabel: (label: string | null) => void;
  // QR Modal
  showQrModal: boolean;
  setShowQrModal: (visible: boolean) => void;
  // Language Modal
  showLangModal: boolean;
  setShowLangModal: (visible: boolean) => void;
  handleSetLanguage: (newLang: Language) => Promise<void>;
  // Image Preview Modal
  previewPhoto: PreviewPhotoData | null;
  setPreviewPhoto: (photo: PreviewPhotoData | null) => void;
  // Success Shift Modal
  successModalData: SuccessModalData | null;
  backdropOpacity: Animated.Value;
  sheetTranslateY: Animated.Value;
  formatTimeStr: (iso?: string) => string;
  closeSuccessModal: (cb?: () => void) => void;
  // Alert Modal
  alertConfig: AlertModalConfig | null;
  setAlertConfig: (config: AlertModalConfig | null) => void;
  // Oil Change Modal
  oilChangeModalState: { visible: boolean; bikeNumber: string };
  setOilChangeModalState: React.Dispatch<
    React.SetStateAction<{ visible: boolean; bikeNumber: string }>
  >;
  // App Update Modal
  updateModalVisible: boolean;
  setUpdateModalVisible: (visible: boolean) => void;
  updateState: any;
  updateError: string;
  handleApplyUpdate: () => void;
  handleCheckForUpdates: (manual?: boolean) => void;
  // Diagnostics Modal
  showDiagnosticsModal: boolean;
  setShowDiagnosticsModal: (visible: boolean) => void;
  // Broadcast Modals
  activeBroadcast: any;
  setActiveBroadcast: (b: any) => void;
  showBroadcastModal: boolean;
  setShowBroadcastModal: (visible: boolean) => void;
  showBroadcastHistory: boolean;
  setShowBroadcastHistory: (visible: boolean) => void;
  allBroadcasts: any[];
  loadingBroadcastHistory: boolean;
  handleCloseBroadcast: () => void;
  handleVoteBroadcast: (broadcastId: string, response: 'AGREE' | 'DISAGREE') => Promise<void>;
  handleRefreshNotificationsHistory: () => void;
  handleMarkAllAsRead: () => void;
  // Plate Scanner Modal
  showPlateScannerModal: boolean;
  handleClosePlateScanner: () => void;
  handleProcessPlateScan: (imageUri: string, base64Uri: string, plateData?: any) => Promise<void>;
  isScanningPlate: boolean;
  // Accident Modal
  showAccidentModal: boolean;
  setShowAccidentModal: (visible: boolean) => void;
}

export const DelegateModalsPortal: React.FC<DelegateModalsPortalProps> = ({
  employee,
  activeSession,
  colors,
  isDarkMode,
  isRTL,
  lang,
  t,
  mainScrollRef,
  setCurrentTab,
  setSelectedHistoryMonthKey,
  setSelectedHistoryMonthLabel,
  showQrModal,
  setShowQrModal,
  showLangModal,
  setShowLangModal,
  handleSetLanguage,
  previewPhoto,
  setPreviewPhoto,
  successModalData,
  backdropOpacity,
  sheetTranslateY,
  formatTimeStr,
  closeSuccessModal,
  alertConfig,
  setAlertConfig,
  oilChangeModalState,
  setOilChangeModalState,
  updateModalVisible,
  setUpdateModalVisible,
  updateState,
  updateError,
  handleApplyUpdate,
  handleCheckForUpdates,
  showDiagnosticsModal,
  setShowDiagnosticsModal,
  activeBroadcast,
  setActiveBroadcast,
  showBroadcastModal,
  setShowBroadcastModal,
  showBroadcastHistory,
  setShowBroadcastHistory,
  allBroadcasts,
  loadingBroadcastHistory,
  handleCloseBroadcast,
  handleVoteBroadcast,
  handleRefreshNotificationsHistory,
  handleMarkAllAsRead,
  showPlateScannerModal,
  handleClosePlateScanner,
  handleProcessPlateScan,
  isScanningPlate,
  showAccidentModal,
  setShowAccidentModal,
}) => {
  return (
    <>
      {/* Fullscreen QR Modal */}
      <ModuleErrorBoundary moduleName="رمز الاستجابة السريعة (QR)" fallback={null}>
        <QrCodeModal
          visible={showQrModal}
          employee={employee}
          colors={colors}
          isRTL={isRTL}
          t={t}
          onClose={() => setShowQrModal(false)}
        />
      </ModuleErrorBoundary>

      {/* Language Selector Modal */}
      <ModuleErrorBoundary moduleName="اختيار اللغة" fallback={null}>
        <LanguageModal
          visible={showLangModal}
          currentLang={lang}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          t={t}
          onSelectLang={async (newLang) => {
            await handleSetLanguage(newLang);
            setShowLangModal(false);
          }}
          onClose={() => setShowLangModal(false)}
        />
      </ModuleErrorBoundary>

      {/* Photo Preview Lightbox Modal */}
      <ModuleErrorBoundary moduleName="معاينة الصور" fallback={null}>
        <ImagePreviewModal
          previewPhoto={previewPhoto}
          colors={colors}
          isRTL={isRTL}
          onClose={() => setPreviewPhoto(null)}
        />
      </ModuleErrorBoundary>

      {/* Simple Start & End Shift Success Bottom Sheet Modal */}
      {successModalData && (
        <ModuleErrorBoundary moduleName="تأكيد الشفت" fallback={null}>
          <SuccessShiftModal
            data={successModalData}
            employee={employee}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            t={t}
            backdropOpacity={backdropOpacity}
            sheetTranslateY={sheetTranslateY}
            formatTimeStr={formatTimeStr}
            onClose={closeSuccessModal}
            onNavigateToTab={(tab) => {
              if (tab === 'history') {
                const currentMonth = getCurrentMonthInfo(lang);
                setSelectedHistoryMonthKey(currentMonth.key);
                setSelectedHistoryMonthLabel(currentMonth.label);
              }
              mainScrollRef.current?.scrollTo({ y: 0, animated: false });
              setCurrentTab(tab);
            }}
            onPreviewPhoto={setPreviewPhoto}
          />
        </ModuleErrorBoundary>
      )}

      {/* Unified Action Alert & Permissions Bottom Sheet */}
      <ModuleErrorBoundary moduleName="نافذة التنبيهات" fallback={null}>
        <ActionAlertBottomSheet
          config={alertConfig}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onClose={() => setAlertConfig(null)}
        />
      </ModuleErrorBoundary>

      {/* Motorcycle Oil Change Alert Bottom Sheet */}
      <ModuleErrorBoundary moduleName="تنبيه تغيير الزيت" fallback={null}>
        <OilChangeBottomSheet
          visible={oilChangeModalState.visible}
          motorcycleNumber={oilChangeModalState.bikeNumber}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          title={t.oilChangeAlertTitle}
          message={t.oilChangeAlertMessage}
          buttonText={t.oilChangeAlertBtn}
          onClose={() => setOilChangeModalState((prev) => ({ ...prev, visible: false }))}
        />
      </ModuleErrorBoundary>

      {/* Modern OTA App Update Bottom Sheet */}
      <ModuleErrorBoundary moduleName="تحديثات التطبيق" fallback={null}>
        <AppUpdateBottomSheet
          visible={updateModalVisible}
          state={updateState}
          errorMessage={updateError}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onApplyUpdate={handleApplyUpdate}
          onCheckAgain={() => handleCheckForUpdates(true)}
          onClose={() => setUpdateModalVisible(false)}
        />
      </ModuleErrorBoundary>

      {/* Real-time Diagnostics & Crash Tracing Modal */}
      <ModuleErrorBoundary moduleName="نافذة التشخيص" fallback={null}>
        <DiagnosticsModal
          visible={showDiagnosticsModal}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          onClose={() => setShowDiagnosticsModal(false)}
        />
      </ModuleErrorBoundary>

      {/* Broadcast Announcement & Survey Poll Modal */}
      <ModuleErrorBoundary moduleName="التعاميم والتصويت" fallback={null}>
        <BroadcastModal
          visible={showBroadcastModal}
          broadcast={activeBroadcast}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          lang={lang}
          onClose={handleCloseBroadcast}
          onVote={handleVoteBroadcast}
          onPreviewImage={(url) => {
            if (activeBroadcast) {
              setPreviewPhoto({ url, title: activeBroadcast.title });
            }
          }}
        />
      </ModuleErrorBoundary>

      {/* Broadcast History Modal (مركز الإشعارات) */}
      <ModuleErrorBoundary moduleName="سجل التعاميم" fallback={null}>
        <BroadcastHistoryModal
          visible={showBroadcastHistory}
          broadcasts={allBroadcasts}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          lang={lang}
          onClose={() => setShowBroadcastHistory(false)}
          onSelectBroadcast={(item) => {
            setActiveBroadcast(item);
            setShowBroadcastHistory(false);
            setShowBroadcastModal(true);
          }}
          onPreviewImage={(url) => setPreviewPhoto({ url, title: 'معاينة صورة التعميم' })}
          onRefresh={handleRefreshNotificationsHistory}
          onMarkAllAsRead={handleMarkAllAsRead}
          loading={loadingBroadcastHistory}
        />
      </ModuleErrorBoundary>

      {/* Smart Saudi Plate Live Scanner Modal */}
      <ModuleErrorBoundary moduleName="ماسح اللوحات" fallback={null}>
        <PlateScannerModal
          visible={showPlateScannerModal}
          onClose={handleClosePlateScanner}
          onScanned={handleProcessPlateScan}
          isProcessing={isScanningPlate}
          isDarkMode={isDarkMode}
          lang={lang}
          t={t}
          isRTL={isRTL}
        />
      </ModuleErrorBoundary>

      {/* Emergency Accident Detection Modal (Shake to Report) */}
      <ModuleErrorBoundary moduleName="تنبيه الحوادث الطارئة" fallback={null}>
        <AccidentAlertModal
          visible={showAccidentModal}
          onClose={() => setShowAccidentModal(false)}
          employee={employee}
          activeSession={activeSession}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
          lang={lang}
        />
      </ModuleErrorBoundary>
    </>
  );
};
