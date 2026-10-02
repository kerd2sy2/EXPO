import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Platform,
  StatusBar,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlateScannerModalProps } from './types/plateScanner.types';
import { usePlateScanner, CameraViewComponent } from './hooks/usePlateScanner';
import { CameraErrorBoundary } from './components/CameraErrorBoundary';
import { ScannerHeader } from './components/ScannerHeader';
import { ScannerHUD } from './components/ScannerHUD';
import { ShutterButton } from './components/ShutterButton';
import { PlateResultCard } from './components/PlateResultCard';
import { ScannerIntroSplash } from './components/ScannerIntroSplash';
import { ScannerErrorSheet } from './components/ScannerErrorSheet';

export const PlateScannerModal: React.FC<PlateScannerModalProps> = ({
  visible,
  onClose,
  onScanned,
  isProcessing = false,
  isDarkMode: propIsDarkMode,
}) => {
  const systemScheme = useColorScheme();
  const isDark = propIsDarkMode !== undefined ? propIsDarkMode : systemScheme === 'dark';

  const {
    cameraRef,
    torchOn,
    setTorchOn,
    cameraFailed,
    setCameraFailed,
    setIsCameraReady,
    hasNativeCamera,
    permission,
    hasPermission,
    cameraMounted,
    showIntroSplash,
    introFadeAnim,
    handleIntroComplete,
    pulseAnim,
    laserAnim,
    detectedResult,
    resultCardAnim,
    isBusy,
    showErrorSheet,
    errorMessage,
    errorSheetAnim,
    closeErrorSheet,
    handleManualScan,
    handleConfirmResult,
    handleRescan,
  } = usePlateScanner({
    visible,
    onClose,
    onScanned,
    isProcessing,
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar
        barStyle={showIntroSplash ? (isDark ? 'light-content' : 'dark-content') : 'light-content'}
        backgroundColor="transparent"
        translucent={true}
      />
      <View style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
        {/* Fullscreen Live Camera Stream */}
        {cameraMounted && hasNativeCamera && (permission?.granted || hasPermission) ? (
          <CameraErrorBoundary
            fallback={
              <View style={[StyleSheet.absoluteFill, styles.fallbackContainer, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
                <Ionicons name="scan-circle" size={72} color="#f97316" />
                <Text style={[styles.fallbackText, { color: isDark ? '#94a3b8' : '#64748b' }]}>كاميرا مسح اللوحات الذكية</Text>
              </View>
            }
          >
            <CameraViewComponent
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
              facing="back"
              mute={true}
              enableTorch={torchOn}
              flash={torchOn ? 'on' : 'off'}
              mode="picture"
              onCameraReady={() => setIsCameraReady(true)}
              onMountError={(e: any) => {
                console.warn('Camera mount error:', e);
                setCameraFailed(true);
              }}
            />
          </CameraErrorBoundary>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]} />
        )}

        {/* HUD Viewfinder Overlay (Shown after intro animation) */}
        {(cameraMounted || !showIntroSplash) && (
          <View style={styles.hudOverlay}>
            {/* Top Header Controls */}
            <ScannerHeader
              onClose={onClose}
              hasNativeCamera={hasNativeCamera}
              torchOn={torchOn}
              onToggleTorch={() => setTorchOn((prev) => !prev)}
            />

            {/* Centered Target Box */}
            <ScannerHUD
              pulseAnim={pulseAnim}
              laserAnim={laserAnim}
              detectedResult={detectedResult}
              isBusy={isBusy}
            />

            {/* Bottom Control / Result Popover */}
            <View style={styles.bottomSection}>
              {detectedResult ? (
                <PlateResultCard
                  resultCardAnim={resultCardAnim}
                  detectedResult={detectedResult}
                  onRescan={handleRescan}
                  onConfirm={handleConfirmResult}
                />
              ) : (
                <ShutterButton
                  onPress={handleManualScan}
                  isBusy={isBusy}
                />
              )}
            </View>
          </View>
        )}

        {/* Full-screen Intro Animation Splash */}
        {showIntroSplash && (
          <ScannerIntroSplash
            introFadeAnim={introFadeAnim}
            onAnimationFinish={handleIntroComplete}
            isDark={isDark}
          />
        )}

        {/* Modern Bottom Sheet Error Alert */}
        <ScannerErrorSheet
          visible={showErrorSheet}
          errorMessage={errorMessage}
          errorSheetAnim={errorSheetAnim}
          onClose={closeErrorSheet}
          isDark={isDark}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  fallbackContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d16',
    padding: 24,
  },
  fallbackText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 52 : 40,
    paddingBottom: Platform.OS === 'ios' ? 130 : 105,
  },
  bottomSection: {
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
});
