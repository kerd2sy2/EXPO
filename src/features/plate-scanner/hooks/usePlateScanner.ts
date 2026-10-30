import { useState, useRef, useEffect, useCallback } from 'react';
import { Animated, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { PlateResultData } from '../types/plateScanner.types';
import { executeAiScan, parseAssignedPlateInfo } from '../services/plateOcrService';
import { toArabicDigits } from '../../../utils/plateUtils';

let CameraViewComponent: any = null;
let useCameraPermsHook: any = null;

try {
  const expoCam = require('expo-camera');
  CameraViewComponent = expoCam.CameraView;
  useCameraPermsHook = expoCam.useCameraPermissions;
} catch (e) {
  console.warn('expo-camera not linked in current binary, using fallback:', e);
}

export { CameraViewComponent };

interface UsePlateScannerProps {
  visible: boolean;
  onClose: () => void;
  onScanned: (imageUri: string, base64: string, data?: PlateResultData) => Promise<void>;
  isProcessing?: boolean;
  assignedPlate?: string;
}

export const usePlateScanner = ({
  visible,
  onClose,
  onScanned,
  isProcessing = false,
  assignedPlate,
}: UsePlateScannerProps) => {
  const cameraRef = useRef<any>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [internalScanning, setInternalScanning] = useState(false);
  const [detectedResult, setDetectedResult] = useState<PlateResultData | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);

  // Dedicated Intro Splash Animation state
  const [showIntroSplash, setShowIntroSplash] = useState(true);
  const [cameraMounted, setCameraMounted] = useState(true);
  const introFadeAnim = useRef(new Animated.Value(1)).current;

  const isCameraReadyRef = useRef(false);
  const isMinTimeElapsedRef = useRef(false);
  const isSplashDismissedRef = useRef(false);

  const isMountedRef = useRef(false);
  const isFinishedRef = useRef(false);

  // Hook permissions if available
  const hookResult = useCameraPermsHook ? useCameraPermsHook() : [null, async () => ({ granted: false })];
  const permission = hookResult[0];
  const requestPermission = hookResult[1];
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);

  // Check camera permissions immediately on mount so it is ready before opening
  useEffect(() => {
    ImagePicker.getCameraPermissionsAsync()
      .then(({ granted }) => {
        setHasPermission(granted);
        if (!granted) {
          ImagePicker.requestCameraPermissionsAsync()
            .then((r) => setHasPermission(r.granted))
            .catch(() => {});
        }
      })
      .catch(() => setHasPermission(true));
  }, []);

  // Animations
  const laserAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const resultCardAnim = useRef(new Animated.Value(0)).current;

  // Modern Bottom Sheet Error Alert
  const [showErrorSheet, setShowErrorSheet] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const errorSheetAnim = useRef(new Animated.Value(0)).current;

  const triggerErrorSheet = useCallback((msg: string) => {
    setErrorMessage(msg);
    setShowErrorSheet(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Animated.spring(errorSheetAnim, {
      toValue: 1,
      friction: 8,
      tension: 65,
      useNativeDriver: true,
    }).start();
  }, [errorSheetAnim]);

  const closeErrorSheet = useCallback(() => {
    Animated.timing(errorSheetAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setShowErrorSheet(false);
    });
  }, [errorSheetAnim]);

  // Request permissions when opened
  useEffect(() => {
    if (visible && (!permission || !permission.granted) && requestPermission) {
      requestPermission();
    }
  }, [visible, permission, requestPermission]);

  // Transition from Intro Animation to Live Camera ONLY when camera is confirmed ready
  const tryDismissIntroSplash = useCallback(() => {
    if (isSplashDismissedRef.current) return;
    if (isCameraReadyRef.current && isMinTimeElapsedRef.current) {
      isSplashDismissedRef.current = true;
      Animated.timing(introFadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setShowIntroSplash(false);
      });
    }
  }, [introFadeAnim]);

  const onCameraReady = useCallback(() => {
    setIsCameraReady(true);
    isCameraReadyRef.current = true;
    tryDismissIntroSplash();
  }, [tryDismissIntroSplash]);

  const onAnimationFinish = useCallback(() => {
    isMinTimeElapsedRef.current = true;
    tryDismissIntroSplash();
  }, [tryDismissIntroSplash]);

  // Intro Splash & Laser Sweep & Radar Animations lifecycle
  useEffect(() => {
    if (visible) {
      setShowIntroSplash(true);
      setCameraMounted(true); // Mount camera IMMEDIATELY so it prepares in background behind splash
      introFadeAnim.setValue(1);
      setIsCameraReady(false);
      isCameraReadyRef.current = false;
      isMinTimeElapsedRef.current = false;
      isSplashDismissedRef.current = false;
      setDetectedResult(null);
      setCapturedPhotoUri(null);
      setShowErrorSheet(false);
      errorSheetAnim.setValue(0);
      isFinishedRef.current = false;
      resultCardAnim.setValue(0);

      // Fast animation playback timer (300ms for instant opening)
      const minTimer = setTimeout(() => {
        isMinTimeElapsedRef.current = true;
        tryDismissIntroSplash();
      }, 300);

      // Safety timeout: ensure camera viewfinder is interactive in at most 700ms
      const safetyTimer = setTimeout(() => {
        isCameraReadyRef.current = true;
        isMinTimeElapsedRef.current = true;
        tryDismissIntroSplash();
      }, 700);

      const laser = Animated.loop(
        Animated.sequence([
          Animated.timing(laserAnim, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(laserAnim, {
            toValue: 0,
            duration: 1400,
            useNativeDriver: true,
          }),
        ])
      );
      laser.start();

      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.025,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => {
        clearTimeout(minTimer);
        clearTimeout(safetyTimer);
        laser.stop();
        pulse.stop();
      };
    } else {
      setCameraMounted(false);
      setShowIntroSplash(true);
      setIsCameraReady(false);
      isCameraReadyRef.current = false;
      isMinTimeElapsedRef.current = false;
      isSplashDismissedRef.current = false;
    }
  }, [visible, errorSheetAnim, introFadeAnim, laserAnim, pulseAnim, resultCardAnim, tryDismissIntroSplash]);


  // Trigger result card appearance animation & compress image for database proof
  const showResultPopup = (data: PlateResultData, photoUri: string, b64: string) => {
    setCapturedPhotoUri(photoUri);
    setCapturedBase64(b64);
    setDetectedResult(data);
    isFinishedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.spring(resultCardAnim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Compress in background for storage proof without blocking the UI
    ImageManipulator.manipulateAsync(
      photoUri,
      [{ resize: { width: 640 } }],
      { compress: 0.25, format: ImageManipulator.SaveFormat.JPEG, base64: true }
    ).then((manipulated) => {
      const compressedB64 = manipulated.base64
        ? `data:image/jpeg;base64,${manipulated.base64}`
        : b64;
      setCapturedPhotoUri(manipulated.uri || photoUri);
      setCapturedBase64(compressedB64);
    }).catch(() => {});
  };

  // Lifecycle management
  useEffect(() => {
    isMountedRef.current = true;
    isFinishedRef.current = false;

    return () => {
      isMountedRef.current = false;
    };
  }, [visible, showIntroSplash]);

  // Manual Trigger Button
  const handleManualScan = async () => {
    if (internalScanning || isProcessing || isFinishedRef.current) return;
    setInternalScanning(true);

    try {
      if (CameraViewComponent && !cameraFailed && cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          skipProcessing: false,
          shutterSound: false,
        });

        if (photo && photo.uri) {
          // Pass full-res photo directly to on-device ML Kit with assignedPlate priority
          const detected = await executeAiScan(photo.uri, null, assignedPlate);
          if (detected && detected.digits && detected.digits.length >= 2) {
            showResultPopup(detected, photo.uri, '');
            setInternalScanning(false);
            return;
          }

          // Fallback: optimize image for cloud / server ALPR
          const manipulated = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ resize: { width: 1200 } }],
            { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          const b64 = manipulated.base64 ? `data:image/jpeg;base64,${manipulated.base64}` : photo.uri;
          const retryDetected = await executeAiScan(manipulated.uri, b64, assignedPlate);
          if (retryDetected && retryDetected.digits && retryDetected.digits.length >= 2) {
            showResultPopup(retryDetected, manipulated.uri, b64);
          } else {
            triggerErrorSheet(
              "لم نتمكن من قراءة أرقام اللوحة بوضوح، يرجى تقريب الكاميرا والتأكد من إضاءة اللوحة وإعادة المحاولة."
            );
          }
          setInternalScanning(false);
          return;
        }
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status === 'granted') {
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
            [{ resize: { width: 900 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          const b64 = manipulated.base64 ? `data:image/jpeg;base64,${manipulated.base64}` : manipulated.uri;
          const detected = await executeAiScan(manipulated.uri, b64, assignedPlate);
          if (detected && detected.digits && detected.digits.length >= 2) {
            showResultPopup(detected, manipulated.uri, b64);
          } else {
            triggerErrorSheet(
              "لم نتمكن من قراءة أرقام اللوحة بوضوح، يرجى تقريب الكاميرا وإعادة المحاولة."
            );
          }
        }
      }
    } catch (e) {
      console.error('Manual scan error:', e);
    } finally {
      setInternalScanning(false);
    }
  };

  // Bottom Sheet state for Confirming Registered Motorcycle
  const [showAssignedModal, setShowAssignedModal] = useState(false);
  const assignedSheetAnim = useRef(new Animated.Value(0)).current;

  const openAssignedModal = useCallback(() => {
    if (!assignedPlate) return;
    setShowAssignedModal(true);
    Animated.spring(assignedSheetAnim, {
      toValue: 1,
      tension: 65,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [assignedPlate, assignedSheetAnim]);

  const closeAssignedModal = useCallback(() => {
    Animated.timing(assignedSheetAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setShowAssignedModal(false);
    });
  }, [assignedSheetAnim]);

  const handleConfirmAssignedModal = useCallback(async () => {
    if (!assignedPlate) return;
    closeAssignedModal();

    const assignedInfo = parseAssignedPlateInfo(assignedPlate);
    if (!assignedInfo || !assignedInfo.digits) return;

    const assignedResult: PlateResultData = {
      digits: assignedInfo.digits,
      letters: assignedInfo.arLetters,
      full_plate: `${assignedInfo.digits} ${assignedInfo.arLetters}`.trim(),
      arabic_digits: toArabicDigits(assignedInfo.digits),
      arabic_letters: assignedInfo.arLetters,
      english_letters: assignedInfo.enLetters,
    };

    setInternalScanning(true);
    let photoUri = '';
    let b64 = '';

    try {
      if (CameraViewComponent && !cameraFailed && cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          skipProcessing: true,
          shutterSound: false,
        });
        if (photo && photo.uri) {
          photoUri = photo.uri;
          const manipulated = await ImageManipulator.manipulateAsync(
            photo.uri,
            [{ resize: { width: 900 } }],
            { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
          );
          b64 = manipulated.base64 ? `data:image/jpeg;base64,${manipulated.base64}` : photo.uri;
        }
      }
    } catch (err) {
      console.warn('Snap for assigned plate error:', err);
    } finally {
      setInternalScanning(false);
    }

    // Immediately display success result card with the captured photo proof as if scanned!
    showResultPopup(assignedResult, photoUri || 'assigned_bike', b64);
  }, [assignedPlate, closeAssignedModal, cameraFailed]);

  // Confirm and Apply Detected Result
  const handleConfirmResult = () => {
    if (detectedResult && capturedPhotoUri && capturedBase64) {
      const uri = capturedPhotoUri;
      const b64 = capturedBase64;
      const res = detectedResult;
      onClose();
      onScanned(uri, b64, res).catch((err) => {
        console.error('onScanned error:', err);
      });
    }
  };

  // Rescan / Reset
  const handleRescan = () => {
    setDetectedResult(null);
    setCapturedPhotoUri(null);
    setCapturedBase64(null);
    isFinishedRef.current = false;
    resultCardAnim.setValue(0);
  };

  const isBusy = isProcessing || internalScanning;
  const hasNativeCamera = Boolean(CameraViewComponent && !cameraFailed);

  return {
    cameraRef,
    torchOn,
    setTorchOn,
    cameraFailed,
    setCameraFailed,
    isCameraReady,
    setIsCameraReady,
    hasNativeCamera,
    permission,
    hasPermission,
    cameraMounted,
    showIntroSplash,
    introFadeAnim,
    onCameraReady,
    onAnimationFinish,
    handleIntroComplete: onAnimationFinish,
    pulseAnim,
    laserAnim,
    detectedResult,
    resultCardAnim,
    isBusy,
    showErrorSheet,
    errorMessage,
    errorSheetAnim,
    triggerErrorSheet,
    closeErrorSheet,
    handleManualScan,
    handleConfirmResult,
    handleRescan,
    showAssignedModal,
    assignedSheetAnim,
    openAssignedModal,
    closeAssignedModal,
    handleConfirmAssignedModal,
  };
};

