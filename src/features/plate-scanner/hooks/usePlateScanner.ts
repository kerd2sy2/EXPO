import { useState, useRef, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { PlateResultData } from '../types/plateScanner.types';
import { executeAiScan } from '../services/plateOcrService';

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
}

export const usePlateScanner = ({
  visible,
  onClose,
  onScanned,
  isProcessing = false,
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

      // Minimum animation playback timer (1.2s)
      const minTimer = setTimeout(() => {
        isMinTimeElapsedRef.current = true;
        tryDismissIntroSplash();
      }, 1200);

      // Safety timeout: if camera hardware takes longer or doesn't fire, force dismiss splash after 2.5s
      const safetyTimer = setTimeout(() => {
        isCameraReadyRef.current = true;
        isMinTimeElapsedRef.current = true;
        tryDismissIntroSplash();
      }, 2500);

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
  const showResultPopup = async (data: PlateResultData, photoUri: string, b64: string) => {
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 640 } }],
        { compress: 0.25, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      const compressedB64 = manipulated.base64
        ? `data:image/jpeg;base64,${manipulated.base64}`
        : b64;
      setCapturedPhotoUri(manipulated.uri || photoUri);
      setCapturedBase64(compressedB64);
    } catch (compErr) {
      setCapturedPhotoUri(photoUri);
      setCapturedBase64(b64);
    }

    setDetectedResult(data);
    isFinishedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.spring(resultCardAnim, {
      toValue: 1,
      tension: 60,
      friction: 8,
      useNativeDriver: true,
    }).start();
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
          quality: 0.85,
          base64: true,
          skipProcessing: false,
          shutterSound: false,
        });

        if (photo && photo.uri) {
          const b64 = photo.base64 ? `data:image/jpeg;base64,${photo.base64}` : photo.uri;
          const detected = await executeAiScan(photo.uri, b64);
          if (detected && detected.digits && detected.digits.length >= 2) {
            showResultPopup(detected, photo.uri, b64);
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
          quality: 0.85,
          base64: true,
          cameraType: ImagePicker.CameraType.back,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          const b64 = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
          const detected = await executeAiScan(asset.uri, b64);
          if (detected && detected.digits && detected.digits.length >= 2) {
            showResultPopup(detected, asset.uri, b64);
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

  // Confirm and Apply Detected Result
  const handleConfirmResult = async () => {
    if (detectedResult && capturedPhotoUri && capturedBase64) {
      await onScanned(capturedPhotoUri, capturedBase64, detectedResult);
      onClose();
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
  };
};

