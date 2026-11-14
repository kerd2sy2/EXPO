import React, { useEffect } from 'react';
import {
  BackHandler,
  Keyboard,
  KeyboardEvent,
  Platform,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStoredLanguage } from '../services/api';
import { analytics } from '../services/analytics';
import { Language, PreviewPhotoData, SuccessModalData, TabType } from '../types/delegate';

interface UseDelegateAppLifecycleParams {
  loading: boolean;
  markInteractive: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
  setLang: (lang: Language) => void;
  checkSession: (showLoading?: boolean) => Promise<void>;
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  previewPhoto: PreviewPhotoData | null;
  setPreviewPhoto: (photo: PreviewPhotoData | null) => void;
  showQrModal: boolean;
  setShowQrModal: (visible: boolean) => void;
  showLangModal: boolean;
  setShowLangModal: (visible: boolean) => void;
  successModalData: SuccessModalData | null;
  closeSuccessModal: (callback?: () => void) => void;
  setSelectedHistoryMonthKey: (key: string | null) => void;
  setSelectedHistoryMonthLabel: (label: string | null) => void;
  mainScrollRef: React.RefObject<ScrollView | null>;
  setKeyboardOffset: (height: number) => void;
}

export function useDelegateAppLifecycle({
  loading,
  markInteractive,
  setThemeMode,
  setLang,
  checkSession,
  currentTab,
  setCurrentTab,
  previewPhoto,
  setPreviewPhoto,
  showQrModal,
  setShowQrModal,
  showLangModal,
  setShowLangModal,
  successModalData,
  closeSuccessModal,
  setSelectedHistoryMonthKey,
  setSelectedHistoryMonthLabel,
  mainScrollRef,
  setKeyboardOffset,
}: UseDelegateAppLifecycleParams) {
  useEffect(() => {
    if (!loading) {
      markInteractive();
    }
  }, [loading, markInteractive]);

  // Initial Boot: Theme, Language, Camera Warmup & Session Restoration
  useEffect(() => {
    ImagePicker.getCameraPermissionsAsync()
      .then(({ granted }) => {
        if (!granted) {
          ImagePicker.requestCameraPermissionsAsync().catch(() => {});
        }
      })
      .catch(() => {});

    AsyncStorage.getItem('@aams_theme_mode')
      .then((savedTheme) => {
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setThemeMode(savedTheme);
        }
      })
      .catch(() => {});

    getStoredLanguage().then((l) => {
      if (l) setLang(l);
    });

    checkSession();
  }, []);

  // Hardware Back Button (Android)
  useEffect(() => {
    const onBackPress = () => {
      if (previewPhoto) {
        setPreviewPhoto(null);
        return true;
      }
      if (showQrModal) {
        setShowQrModal(false);
        return true;
      }
      if (showLangModal) {
        setShowLangModal(false);
        return true;
      }
      if (successModalData) {
        closeSuccessModal();
        return true;
      }
      if (currentTab !== 'home') {
        setSelectedHistoryMonthKey(null);
        setSelectedHistoryMonthLabel(null);
        setCurrentTab('home');
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [
    currentTab,
    previewPhoto,
    showQrModal,
    showLangModal,
    successModalData,
    closeSuccessModal,
    setPreviewPhoto,
    setShowQrModal,
    setShowLangModal,
    setSelectedHistoryMonthKey,
    setSelectedHistoryMonthLabel,
    setCurrentTab,
  ]);

  // Analytics Screen Tracking & Scroll Reset on Tab Change
  useEffect(() => {
    analytics.setScreen(`Tab_${currentTab}`);
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    const timer = setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 60);
    return () => clearTimeout(timer);
  }, [currentTab, mainScrollRef]);

  // Dynamic Keyboard Height Listener
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      if (e?.endCoordinates?.height) {
        setKeyboardOffset(e.endCoordinates.height);
      }
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [setKeyboardOffset]);
}
