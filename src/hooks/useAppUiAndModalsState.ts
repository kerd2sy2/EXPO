import { useState, useRef, useCallback } from 'react';
import { Animated, ScrollView } from 'react-native';
import { PreviewPhotoData, SuccessModalData } from '../types/delegate';
import { AlertModalConfig } from '../components/modals/ActionAlertBottomSheet';

export function useAppUiAndModalsState(mainScrollRef: React.RefObject<ScrollView | null>) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportInitialMode, setReportInitialMode] = useState<'list' | 'create'>('list');
  const [advanceInitialMode, setAdvanceInitialMode] = useState<'list' | 'create'>('list');
  const [showOperationVideoModal, setShowOperationVideoModal] = useState(false);
  const [ordersDatePickerOpen, setOrdersDatePickerOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState<Set<string>>(new Set());
  const notifHeaderActionsRef = useRef<{ markAll: () => void; openClearModal: () => void } | null>(null);

  const [showQrModal, setShowQrModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhotoData | null>(null);
  const [successModalData, setSuccessModalData] = useState<SuccessModalData | null>(null);
  const [alertConfig, setAlertConfig] = useState<AlertModalConfig | null>(null);
  const [showDiagnosticsModal, setShowDiagnosticsModal] = useState(false);
  const [showPlateScannerModal, setShowPlateScannerModal] = useState(false);
  const [showAccidentModal, setShowAccidentModal] = useState(false);
  const [targetApprovalSessionId, setTargetApprovalSessionId] = useState<string | null>(null);
  const [targetApprovalEmployeeId, setTargetApprovalEmployeeId] = useState<string | null>(null);
  const [oilChangeModalState, setOilChangeModalState] = useState<{ visible: boolean; bikeNumber: string }>({
    visible: false,
    bikeNumber: '',
  });
  const [selectedHistoryMonthKey, setSelectedHistoryMonthKey] = useState<string | null>(null);
  const [selectedHistoryMonthLabel, setSelectedHistoryMonthLabel] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);
  const [mainScrollEnabled, setMainScrollEnabled] = useState(true);

  const sheetTranslateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const closeSuccessModal = useCallback(
    (callback?: () => void) => {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(sheetTranslateY, { toValue: 600, duration: 220, useNativeDriver: true }),
      ]).start(() => {
        setSuccessModalData(null);
        if (callback) callback();
        setTimeout(() => mainScrollRef.current?.scrollTo({ y: 0, animated: false }), 60);
      });
    },
    [backdropOpacity, mainScrollRef, sheetTranslateY]
  );

  return {
    showReportModal,
    setShowReportModal,
    reportInitialMode,
    setReportInitialMode,
    advanceInitialMode,
    setAdvanceInitialMode,
    showOperationVideoModal,
    setShowOperationVideoModal,
    ordersDatePickerOpen,
    setOrdersDatePickerOpen,
    readNotifIds,
    setReadNotifIds,
    notifHeaderActionsRef,
    showQrModal,
    setShowQrModal,
    showLangModal,
    setShowLangModal,
    previewPhoto,
    setPreviewPhoto,
    successModalData,
    alertConfig,
    setAlertConfig,
    showDiagnosticsModal,
    setShowDiagnosticsModal,
    showPlateScannerModal,
    setShowPlateScannerModal,
    showAccidentModal,
    setShowAccidentModal,
    targetApprovalSessionId,
    setTargetApprovalSessionId,
    targetApprovalEmployeeId,
    setTargetApprovalEmployeeId,
    oilChangeModalState,
    setOilChangeModalState,
    selectedHistoryMonthKey,
    setSelectedHistoryMonthKey,
    selectedHistoryMonthLabel,
    setSelectedHistoryMonthLabel,
    keyboardOffset,
    setKeyboardOffset,
    mainScrollEnabled,
    setMainScrollEnabled,
    sheetTranslateY,
    backdropOpacity,
    closeSuccessModal,
  };
}
