import React from 'react';
import { Animated } from 'react-native';
import {
  EmployeeProfile,
  WorkSession,
  SuccessModalData,
  PreviewPhotoData,
  TabType,
  Language,
  ThemeColors,
} from '../types/delegate';
import { translations } from '../constants/translations';
import { BroadcastNotificationItem } from '../services/notificationService';
import { AlertModalConfig } from './modals/ActionAlertBottomSheet';
import { DelegateWithStatus } from '../services/supervisor';

// Modals
import { SuccessShiftModal } from './modals/SuccessShiftModal';
import { LanguageModal } from './modals/LanguageModal';
import { QrCodeModal } from './modals/QrCodeModal';
import { ImagePreviewModal } from './modals/ImagePreviewModal';
import { ActionAlertBottomSheet } from './modals/ActionAlertBottomSheet';
import { AppUpdateBottomSheet } from './modals/AppUpdateBottomSheet';
import { DiagnosticsModal } from './modals/DiagnosticsModal';
import { BroadcastModal } from './modals/BroadcastModal';
import { BroadcastHistoryModal } from './modals/BroadcastHistoryModal';
import { OilChangeBottomSheet } from './modals/OilChangeBottomSheet';
import { PlateScannerModal } from '../features/plate-scanner';
import { AccidentAlertModal } from './modals/AccidentAlertModal';
import { ReportTypePickerModal } from './modals/ReportTypePickerModal';
import { OperationVideoModal } from './OperationVideoModal';
import { ModuleErrorBoundary } from './ModuleErrorBoundary';

export interface AppModalsContainerProps {
  // QR Modal
  showQrModal: boolean;
  setShowQrModal: (visible: boolean) => void;

  // Language Modal
  showLangModal: boolean;
  setShowLangModal: (visible: boolean) => void;
  lang: Language;
  onSelectLang: (newLang: Language) => Promise<void>;

  // Photo Preview
  previewPhoto: PreviewPhotoData | null;
  setPreviewPhoto: (photo: PreviewPhotoData | null) => void;

  // Shift Success Modal
  successModalData: SuccessModalData | null;
  backdropOpacity: Animated.Value;
  sheetTranslateY: Animated.Value;
  formatTimeStr: (val?: string) => string;
  onCloseSuccessModal: () => void;
  onNavigateToTab: (tab: TabType) => void;

  // Action Alert
  alertConfig: AlertModalConfig | null;
  setAlertConfig: (config: AlertModalConfig | null) => void;

  // Oil Change Alert
  oilChangeModalState: { visible: boolean; bikeNumber: string };
  setOilChangeModalState: React.Dispatch<React.SetStateAction<{ visible: boolean; bikeNumber: string }>>;

  // OTA App Update
  updateModalVisible: boolean;
  updateState: any;
  updateError?: string | null;
  onApplyUpdate: () => void;
  onCheckAgain: () => void;
  onCloseUpdateModal: () => void;

  // Diagnostics
  showDiagnosticsModal: boolean;
  setShowDiagnosticsModal: (visible: boolean) => void;

  // Broadcast
  showBroadcastModal: boolean;
  activeBroadcast: BroadcastNotificationItem | null;
  onCloseBroadcast: () => void;
  onVoteBroadcast: (broadcastId: string, response: 'AGREE' | 'DISAGREE') => Promise<void>;

  // Broadcast History
  showBroadcastHistory: boolean;
  setShowBroadcastHistory: (visible: boolean) => void;
  allBroadcasts: BroadcastNotificationItem[];
  loadingBroadcastHistory: boolean;
  onSelectBroadcastFromHistory: (item: BroadcastNotificationItem) => void;
  onRefreshBroadcastHistory: () => void;
  onMarkAllBroadcastsAsRead: () => void;

  // Plate Scanner
  showPlateScannerModal: boolean;
  onClosePlateScanner: () => void;
  onScannedPlate: (imageUri: string, base64Uri: string, plateData?: any) => Promise<void>;
  isScanningPlate: boolean;

  // Emergency Accident Modal
  showAccidentModal: boolean;
  setShowAccidentModal: (visible: boolean) => void;

  // Report & Advance Type Picker
  showReportModal: boolean;
  setShowReportModal: (visible: boolean) => void;
  onSelectReportAction: (action: string) => void;

  // Operation Video Modal
  showOperationVideoModal: boolean;
  setShowOperationVideoModal: (visible: boolean) => void;
  branchDelegates: DelegateWithStatus[];
  pendingSessions: WorkSession[];
  onRefreshSupervisorData: () => void;

  // Common Context
  employee: EmployeeProfile | null;
  activeSession: WorkSession | null;
  colors: ThemeColors;
  isDarkMode: boolean;
  isRTL: boolean;
  t: typeof translations.ar;
}

export const AppModalsContainer: React.FC<AppModalsContainerProps> = React.memo(({
  showQrModal,
  setShowQrModal,
  showLangModal,
  setShowLangModal,
  lang,
  onSelectLang,
  previewPhoto,
  setPreviewPhoto,
  successModalData,
  backdropOpacity,
  sheetTranslateY,
  formatTimeStr,
  onCloseSuccessModal,
  onNavigateToTab,
  alertConfig,
  setAlertConfig,
  oilChangeModalState,
  setOilChangeModalState,
  updateModalVisible,
  updateState,
  updateError,
  onApplyUpdate,
  onCheckAgain,
  onCloseUpdateModal,
  showDiagnosticsModal,
  setShowDiagnosticsModal,
  showBroadcastModal,
  activeBroadcast,
  onCloseBroadcast,
  onVoteBroadcast,
  showBroadcastHistory,
  setShowBroadcastHistory,
  allBroadcasts,
  loadingBroadcastHistory,
  onSelectBroadcastFromHistory,
  onRefreshBroadcastHistory,
  onMarkAllBroadcastsAsRead,
  showPlateScannerModal,
  onClosePlateScanner,
  onScannedPlate,
  isScanningPlate,
  showAccidentModal,
  setShowAccidentModal,
  showReportModal,
  setShowReportModal,
  onSelectReportAction,
  showOperationVideoModal,
  setShowOperationVideoModal,
  branchDelegates,
  pendingSessions,
  onRefreshSupervisorData,
  employee,
  activeSession,
  colors,
  isDarkMode,
  isRTL,
  t,
}) => {
  return (
    <>
      {/* Fullscreen QR Modal */}
      {showQrModal && (
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
      )}

      {/* Language Selector Modal */}
      {showLangModal && (
        <ModuleErrorBoundary moduleName="اختيار اللغة" fallback={null}>
          <LanguageModal
            visible={showLangModal}
            currentLang={lang}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            t={t}
            onSelectLang={onSelectLang}
            onClose={() => setShowLangModal(false)}
          />
        </ModuleErrorBoundary>
      )}

      {/* Photo Preview Lightbox Modal */}
      {previewPhoto && (
        <ModuleErrorBoundary moduleName="معاينة الصور" fallback={null}>
          <ImagePreviewModal
            previewPhoto={previewPhoto}
            colors={colors}
            isRTL={isRTL}
            onClose={() => setPreviewPhoto(null)}
          />
        </ModuleErrorBoundary>
      )}

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
            onClose={onCloseSuccessModal}
            onNavigateToTab={onNavigateToTab}
            onPreviewPhoto={setPreviewPhoto}
          />
        </ModuleErrorBoundary>
      )}

      {/* Unified Action Alert & Permissions Bottom Sheet */}
      {alertConfig && (
        <ModuleErrorBoundary moduleName="نافذة التنبيهات" fallback={null}>
          <ActionAlertBottomSheet
            config={alertConfig}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            onClose={() => setAlertConfig(null)}
          />
        </ModuleErrorBoundary>
      )}

      {/* Motorcycle Oil Change Alert Bottom Sheet */}
      {oilChangeModalState.visible && (
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
      )}

      {/* Modern OTA App Update Bottom Sheet */}
      {updateModalVisible && (
        <ModuleErrorBoundary moduleName="تحديثات التطبيق" fallback={null}>
          <AppUpdateBottomSheet
            visible={updateModalVisible}
            state={updateState}
            errorMessage={updateError}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            onApplyUpdate={onApplyUpdate}
            onCheckAgain={onCheckAgain}
            onClose={onCloseUpdateModal}
          />
        </ModuleErrorBoundary>
      )}

      {/* Real-time Diagnostics & Crash Tracing Modal */}
      {showDiagnosticsModal && (
        <ModuleErrorBoundary moduleName="نافذة التشخيص" fallback={null}>
          <DiagnosticsModal
            visible={showDiagnosticsModal}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            onClose={() => setShowDiagnosticsModal(false)}
          />
        </ModuleErrorBoundary>
      )}

      {/* Broadcast Announcement & Survey Poll Modal */}
      {showBroadcastModal && (
        <ModuleErrorBoundary moduleName="التعاميم والتصويت" fallback={null}>
          <BroadcastModal
            visible={showBroadcastModal}
            broadcast={activeBroadcast}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            lang={lang}
            onClose={onCloseBroadcast}
            onVote={onVoteBroadcast}
            onPreviewImage={(url) => {
              if (activeBroadcast) {
                setPreviewPhoto({ url, title: activeBroadcast.title });
              }
            }}
          />
        </ModuleErrorBoundary>
      )}

      {/* Broadcast History Modal (مركز الإشعارات) */}
      {showBroadcastHistory && (
        <ModuleErrorBoundary moduleName="سجل التعاميم" fallback={null}>
          <BroadcastHistoryModal
            visible={showBroadcastHistory}
            broadcasts={allBroadcasts}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            lang={lang}
            onClose={() => setShowBroadcastHistory(false)}
            onSelectBroadcast={onSelectBroadcastFromHistory}
            onPreviewImage={(url) => setPreviewPhoto({ url, title: 'معاينة صورة التعميم' })}
            onRefresh={onRefreshBroadcastHistory}
            onMarkAllAsRead={onMarkAllBroadcastsAsRead}
            loading={loadingBroadcastHistory}
          />
        </ModuleErrorBoundary>
      )}

      {/* Smart Saudi Plate Live Scanner Modal */}
      {showPlateScannerModal && (
        <ModuleErrorBoundary moduleName="ماسح اللوحات" fallback={null}>
          <PlateScannerModal
            visible={showPlateScannerModal}
            onClose={onClosePlateScanner}
            onScanned={onScannedPlate}
            isProcessing={isScanningPlate}
            isDarkMode={isDarkMode}
            lang={lang}
            t={t}
            isRTL={isRTL}
          />
        </ModuleErrorBoundary>
      )}

      {/* Emergency Accident Detection Modal (Shake to Report) */}
      {showAccidentModal && (
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
      )}

      {/* Report & Advance Type Picker BottomSheet Modal */}
      {showReportModal && (
        <ReportTypePickerModal
          visible={showReportModal}
          onClose={() => setShowReportModal(false)}
          onSelectAction={onSelectReportAction}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      )}

      {/* Operation Video Documentation Modal */}
      {showOperationVideoModal && (
        <OperationVideoModal
          visible={showOperationVideoModal}
          onClose={() => setShowOperationVideoModal(false)}
          branchDelegates={branchDelegates}
          pendingSessions={pendingSessions}
          onRefresh={onRefreshSupervisorData}
          colors={colors}
          isDarkMode={isDarkMode}
          isRTL={isRTL}
        />
      )}
    </>
  );
});
