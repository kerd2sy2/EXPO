import React, { useState, useEffect, useRef } from 'react';
import {
  StatusBar,
  ScrollView,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  BackHandler,
  useColorScheme,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// Types & Constants
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

// Services
import { workApi } from '../services/work';
import { setAuthToken, getCachedUser, saveCachedUser } from '../services/api';
import {
  startGpsTracking,
  stopGpsTracking,
  getGpsShiftDistance,
  clearGpsShiftData,
} from '../services/gpsTrackingService';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ShiftScreen } from '../screens/ShiftScreen';
import { HistoryScreen } from '../screens/HistoryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

// Modals
import { SuccessShiftModal } from '../components/modals/SuccessShiftModal';
import { LanguageModal } from '../components/modals/LanguageModal';
import { QrCodeModal } from '../components/modals/QrCodeModal';
import { ImagePreviewModal } from '../components/modals/ImagePreviewModal';

export default function DelegateApp() {
  const systemColorScheme = useColorScheme();
  const isDarkMode = systemColorScheme === 'dark';

  // Navigation & Language
  const [currentTab, setCurrentTab] = useState<TabType>('home');
  const [lang, setLang] = useState<Language>('ar');
  const t = translations[lang];
  const isRTL = lang === 'ar';

  // Authentication State
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Work Session State
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [historySessions, setHistorySessions] = useState<WorkSession[]>([]);

  // Shift Inputs
  const [enteredMotorcycle, setEnteredMotorcycle] = useState('');
  const [startKm, setStartKm] = useState('');
  const [startKmImage, setStartKmImage] = useState<string | null>(null);
  const [startNotes, setStartNotes] = useState('');
  const [autoKmFetched, setAutoKmFetched] = useState(false);

  const [endKm, setEndKm] = useState('');
  const [endKmImage, setEndKmImage] = useState<string | null>(null);
  const [ordersCount, setOrdersCount] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [endNotes, setEndNotes] = useState('');

  // Modals & Popups
  const [showQrModal, setShowQrModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PreviewPhotoData | null>(null);
  const [successModalData, setSuccessModalData] = useState<SuccessModalData | null>(null);

  // Success Sheet Animations
  const sheetTranslateY = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Active Timer & Live GPS Distance
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [gpsDistance, setGpsDistance] = useState<number>(0);

  // Theme Colors
  const colors: ThemeColors = isDarkMode
    ? {
        bg: '#000000',
        card: '#16161a',
        cardHeader: '#202026',
        textPrimary: '#ffffff',
        textSecondary: '#9ca3af',
        border: '#27272e',
        primary: '#f97316',
        primaryLight: 'rgba(249, 115, 22, 0.16)',
        primaryText: '#fb923c',
        accent: '#38bdf8',
        accentLight: 'rgba(56, 189, 248, 0.16)',
        inputBg: '#1c1c22',
        inputBorder: '#2e2e38',
        warningBg: 'rgba(234, 179, 8, 0.15)',
        warningBorder: 'rgba(234, 179, 8, 0.3)',
        warningText: '#fef08a',
        errorBg: 'rgba(239, 68, 68, 0.15)',
        errorText: '#fca5a5',
      }
    : {
        bg: '#f8fafc',
        card: '#ffffff',
        cardHeader: '#f1f5f9',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        primary: '#ea580c',
        primaryLight: '#fff7ed',
        primaryText: '#ea580c',
        accent: '#0284c7',
        accentLight: '#f0f9ff',
        inputBg: '#ffffff',
        inputBorder: '#cbd5e1',
        warningBg: '#fef9c3',
        warningBorder: '#facc15',
        warningText: '#854d0e',
        errorBg: '#fee2e2',
        errorText: '#ef4444',
      };

  // Check Active Session & Employee on Mount
  useEffect(() => {
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
        setCurrentTab('home');
        return true; // Go back to home page without exiting
      }
      // On home page, return false to exit the app
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [currentTab, previewPhoto, showQrModal, showLangModal, successModalData]);

  // Update Elapsed Time Interval
  useEffect(() => {
    let interval: any = null;
    if (activeSession && activeSession.start_time) {
      const updateTimer = () => {
        const start = new Date(activeSession.start_time).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, now - start);

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        setElapsedTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSession]);

  // Live GPS Distance Tracking for Active Session
  useEffect(() => {
    let gpsInterval: any = null;
    if (activeSession && activeSession.id) {
      startGpsTracking(activeSession.id);

      const updateGpsDist = async () => {
        const recordedDist = await getGpsShiftDistance(activeSession.id);
        setGpsDistance(recordedDist);
      };

      updateGpsDist();
      gpsInterval = setInterval(updateGpsDist, 4000);
    } else {
      setGpsDistance(0);
    }

    return () => {
      if (gpsInterval) clearInterval(gpsInterval);
    };
  }, [activeSession]);

  // Auto-fetch Last End KM when bike changes
  useEffect(() => {
    const fetchLastKm = async () => {
      const bike = enteredMotorcycle.trim();
      if (!bike || activeSession || !employee) return;
      try {
        const res = await workApi.getLastKM(employee.id, bike);
        if (res && res.last_end_km > 0) {
          setStartKm(String(res.last_end_km));
          setAutoKmFetched(true);
        }
      } catch (err) {
        console.log('No prior KM found for bike:', bike);
      }
    };
    fetchLastKm();
  }, [enteredMotorcycle, activeSession, employee]);

  const checkSession = async () => {
    setLoading(true);
    try {
      // 1. Instant Cached User Restore
      const cached = await getCachedUser();
      if (cached && cached.id) {
        setEmployee(cached);
        if (cached.motorcycle_number) {
          setEnteredMotorcycle(cached.motorcycle_number);
        }
        // Background fetch active session and history immediately
        fetchActiveSession(cached.id);
        fetchHistory(cached.id);
      }

      // 2. Validate & Refresh Profile from Server without losing delegate fields
      const user = await workApi.getMe();
      if (user && user.id) {
        const merged: EmployeeProfile = {
          ...(cached || {}),
          ...user,
          motorcycle_number: user.motorcycle_number || cached?.motorcycle_number || '',
          key_number: user.key_number || cached?.key_number || '',
          national_id: user.national_id || cached?.national_id || '',
          personal_image: user.personal_image || cached?.personal_image || '',
          national_id_image: user.national_id_image || cached?.national_id_image || '',
          driving_license_image: user.driving_license_image || cached?.driving_license_image || '',
          passport_image: user.passport_image || cached?.passport_image || '',
          vehicle_registration_image: user.vehicle_registration_image || cached?.vehicle_registration_image || '',
          employee_number: user.employee_number || cached?.employee_number || '',
          phone: user.phone || cached?.phone || '',
          branch_name: user.branch_name || cached?.branch_name || '',
        } as EmployeeProfile;

        setEmployee(merged);
        if (merged.motorcycle_number) {
          setEnteredMotorcycle(merged.motorcycle_number);
        }
        await Promise.all([
          fetchActiveSession(merged.id),
          fetchHistory(merged.id),
        ]);
      } else if (!cached) {
        setEmployee(null);
      }
    } catch (err) {
      console.log('Session check notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveSession = async (employeeId: string) => {
    try {
      const active = await workApi.getActiveSession(employeeId);
      if (active && active.status === 'ACTIVE') {
        setActiveSession(active as WorkSession);
        setEndKm('');
        setOrdersCount(active.orders_count ? String(active.orders_count) : '');
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.log('Error fetching active session:', err);
      setActiveSession(null);
    }
  };

  const fetchHistory = async (employeeId: string) => {
    try {
      const history = await workApi.getMySessions(employeeId);
      if (Array.isArray(history)) {
        setHistorySessions(history as WorkSession[]);
      }
    } catch (err) {
      console.log('Error fetching shift history:', err);
    }
  };

  const [refreshing, setRefreshing] = useState(false);

  // Pull-to-refresh across all screens
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (employee && employee.id) {
        await Promise.all([
          workApi.getMe().then((u) => {
            if (u) {
              setEmployee((prev) => ({
                ...(prev || {}),
                ...u,
                motorcycle_number: u.motorcycle_number || prev?.motorcycle_number || '',
                key_number: u.key_number || prev?.key_number || '',
                national_id: u.national_id || prev?.national_id || '',
                personal_image: u.personal_image || prev?.personal_image || '',
                national_id_image: u.national_id_image || prev?.national_id_image || '',
                driving_license_image: u.driving_license_image || prev?.driving_license_image || '',
                passport_image: u.passport_image || prev?.passport_image || '',
                vehicle_registration_image: u.vehicle_registration_image || prev?.vehicle_registration_image || '',
                employee_number: u.employee_number || prev?.employee_number || '',
                phone: u.phone || prev?.phone || '',
                branch_name: u.branch_name || prev?.branch_name || '',
              } as EmployeeProfile));
            }
          }),
          fetchActiveSession(employee.id),
          fetchHistory(employee.id),
        ]);
      } else {
        await checkSession();
      }
    } catch (err) {
      console.log('Refresh error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  // Open Success Bottom Sheet
  const openSuccessModal = (data: SuccessModalData) => {
    setSuccessModalData(data);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0,
        bounciness: 4,
        speed: 12,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Close Success Bottom Sheet
  const closeSuccessModal = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 600,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSuccessModalData(null);
      if (callback) callback();
    });
  };

  // Login Handler
  const handleLogin = async (rawNatId?: string, rawPass?: string) => {
    const inputVal = (rawNatId || '').trim();
    if (!inputVal) {
      setLoginError(t.nationalIdLabel + ' ' + (lang === 'ar' ? 'مطلوب' : 'is required'));
      return;
    }

    const login = inputVal;
    const password = (rawPass || '').trim() || inputVal.slice(-6);

    setSubmitting(true);
    setLoginError('');
    try {
      const res = await workApi.login(login, password);
      if (res && res.employee) {
        setEmployee(res.employee);
        if (res.employee.motorcycle_number) {
          setEnteredMotorcycle(res.employee.motorcycle_number);
        }
        await Promise.all([
          fetchActiveSession(res.employee.id),
          fetchHistory(res.employee.id),
        ]);
        setCurrentTab('home');
      } else {
        setLoginError(t.passwordHint || 'بيانات الدخول غير صحيحة');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setLoginError(err?.message || 'تعذر تسجيل الدخول، تأكد من صحة البيانات');
    } finally {
      setSubmitting(false);
    }
  };

  // Logout Handler
  const handleLogout = async () => {
    Alert.alert(
      t.logout,
      lang === 'ar' ? 'هل أنت متأكد من رغبتك في تسجيل الخروج؟' : 'Are you sure you want to log out?',
      [
        { text: t.close, style: 'cancel' },
        {
          text: t.logout,
          style: 'destructive',
          onPress: async () => {
            try {
              await setAuthToken(null);
            } catch (e) {
              console.log('Logout error', e);
            }
            setEmployee(null);
            setActiveSession(null);
            setHistorySessions([]);
            setCurrentTab('home');
          },
        },
      ]
    );
  };

  // Camera Capture for Odometer
  const takeOdometerPhoto = async (type: 'start' | 'end') => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          lang === 'ar' ? 'إذن الكاميرا مطلوب' : 'Camera Permission Required',
          lang === 'ar' ? 'يرجى السماح للتطبيق باستخدام الكاميرا لتصوير العداد' : 'Please allow camera access to take odometer photos'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.35,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Uri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;

        if (type === 'start') {
          setStartKmImage(base64Uri);
        } else {
          setEndKmImage(base64Uri);
        }
      }
    } catch (err) {
      console.error('Camera capture error:', err);
      Alert.alert(
        lang === 'ar' ? 'خطأ في الكاميرا' : 'Camera Error',
        lang === 'ar' ? 'تعذر فتح الكاميرا، يرجى المحاولة مرة أخرى' : 'Could not launch camera'
      );
    }
  };

  // Start Shift Handler
  const handleStartShift = async () => {
    if (!employee) return;

    if (!enteredMotorcycle.trim()) {
      Alert.alert(t.actualBikeNumber, t.actualBikePlaceholder);
      return;
    }

    const startVal = Number(startKm);
    if (!startKm || isNaN(startVal) || startVal <= 0) {
      Alert.alert(t.startKmInputLabel, t.startKmPlaceholder);
      return;
    }

    if (!startKmImage) {
      Alert.alert(t.startKmPhotoLabel, t.odometerGuideSub);
      return;
    }

    setSubmitting(true);
    try {
      const savedMoto = enteredMotorcycle.trim();
      const savedStartKm = startVal;
      const savedPhoto = startKmImage;
      const savedNotes = startNotes;

      const newSession = await workApi.startShift({
        employee_id: employee.id,
        motorcycle_number: savedMoto,
        start_km: savedStartKm,
        start_km_image: savedPhoto,
        notes: savedNotes,
      });

      setActiveSession(newSession);
      setStartKm('');
      setStartKmImage(null);
      setStartNotes('');
      setAutoKmFetched(false);

      if (newSession && newSession.id) {
        startGpsTracking(newSession.id);
      }

      await fetchHistory(employee.id);

      openSuccessModal({
        type: 'start',
        motorcycleNumber: savedMoto,
        startKm: savedStartKm,
        startTime: newSession?.start_time || new Date().toISOString(),
        imageUri: savedPhoto,
        notes: savedNotes,
      });
    } catch (err: any) {
      console.error('Start shift error:', err);
      Alert.alert(
        lang === 'ar' ? 'خطأ' : 'Error',
        err?.message || (lang === 'ar' ? 'تعذر بدء الشفت، يرجى المحاولة ثانية' : 'Failed to start shift')
      );
    } finally {
      setSubmitting(false);
    }
  };

  // End Shift Handler
  const handleEndShift = async () => {
    if (!employee || !activeSession) return;

    const endVal = Number(endKm);
    const startVal = Number(activeSession.start_km || 0);

    if (!endKm || isNaN(endVal) || endVal <= 0) {
      Alert.alert(t.endKmInputLabel, `${t.startKmLabel}: ${startVal}`);
      return;
    }

    if (endVal < startVal) {
      Alert.alert(
        lang === 'ar' ? 'تنبيه في قراءة العداد' : 'Odometer Error',
        lang === 'ar'
          ? `عداد النهاية (${endVal}) لا يمكن أن يكون أقل من عداد البداية (${startVal})`
          : `End KM (${endVal}) cannot be less than Start KM (${startVal})`
      );
      return;
    }

    if (!endKmImage) {
      Alert.alert(t.endKmPhotoLabel, t.odometerGuideSub);
      return;
    }

    const countVal = Number(ordersCount) || 0;
    const fuelVal = Number(fuelCost) || 0;
    const distanceVal = endVal - startVal;

    setSubmitting(true);
    try {
      const savedEndKm = endVal;
      const savedDistance = distanceVal;
      const savedOrders = countVal;
      const savedFuel = fuelVal;
      const savedPhoto = endKmImage;
      const savedNotes = endNotes;
      const savedMoto = activeSession.motorcycle_number || employee.motorcycle_number;
      const savedStartKm = activeSession.start_km;
      const savedStartTime = activeSession.start_time;

      await workApi.endShift({
        employee_id: employee.id,
        end_km: savedEndKm,
        orders_count: savedOrders,
        fuel_cost: savedFuel,
        end_km_image: savedPhoto,
        notes: savedNotes,
      });

      if (activeSession && activeSession.id) {
        await stopGpsTracking(activeSession.id);
        await clearGpsShiftData(activeSession.id);
      }
      setGpsDistance(0);

      setActiveSession(null);
      setEndKm('');
      setEndKmImage(null);
      setOrdersCount('');
      setFuelCost('');
      setEndNotes('');

      await fetchHistory(employee.id);

      openSuccessModal({
        type: 'end',
        motorcycleNumber: savedMoto,
        startKm: savedStartKm,
        endKm: savedEndKm,
        distance: savedDistance,
        ordersCount: savedOrders,
        fuelCost: savedFuel,
        startTime: savedStartTime,
        endTime: new Date().toISOString(),
        imageUri: savedPhoto,
        notes: savedNotes,
      });
    } catch (err: any) {
      console.error('End shift error:', err);
      Alert.alert(
        lang === 'ar' ? 'خطأ' : 'Error',
        err?.message || (lang === 'ar' ? 'تعذر إنهاء الشفت، يرجى المحاولة ثانية' : 'Failed to end shift')
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Format Helper Functions
  const formatTimeStr = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return isoString;
    }
  };

  const formatDateStr = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch (e) {
      return isoString;
    }
  };

  // Performance & Target Calculations - strictly filter only supervisor-approved sessions
  const approvedSessions = historySessions.filter((s) => Boolean(s.is_reviewed));

  const totalApprovedOrdersCount = approvedSessions.reduce(
    (acc, s) => acc + (Number(s.orders_count) || 0),
    0
  );
  const totalApprovedDistance = approvedSessions.reduce(
    (acc, s) =>
      acc +
      (Number(s.distance) ||
        (s.end_km && s.start_km && Number(s.end_km) >= Number(s.start_km)
          ? Number(s.end_km) - Number(s.start_km)
          : 0)),
    0
  );
  const totalApprovedFuel = approvedSessions.reduce(
    (acc, s) => acc + (Number(s.fuel_cost) || 0),
    0
  );
  const totalApprovedShifts = approvedSessions.length;
  const monthlyTarget = 400;
  const isTargetAchieved = totalApprovedOrdersCount >= monthlyTarget;
  const currentRatePerOrder = isTargetAchieved ? 6 : 5;
  const expectedSalary = totalApprovedOrdersCount * currentRatePerOrder;
  const targetProgressPct = Math.min(100, Math.round((totalApprovedOrdersCount / monthlyTarget) * 100));
  const remainingOrdersToTarget = Math.max(0, monthlyTarget - totalApprovedOrdersCount);
  const calculatedDistance =
    endKm && activeSession?.start_km && Number(endKm) >= Number(activeSession.start_km)
      ? Number(endKm) - Number(activeSession.start_km)
      : 0;

  const empPhotoUrl = employee?.personal_image
    ? (employee.personal_image.startsWith('http') || employee.personal_image.startsWith('data:')
        ? employee.personal_image
        : `https://aams-backend-fxy7.onrender.com/uploads/${employee.personal_image.replace(/^\/+/, '')}`)
    : null;

  // Loading Screen
  if (loading) {
    return (
      <View style={[styles.loadingScreen, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Not Logged In -> Login Screen
  if (!employee) {
    return (
      <LoginScreen
        colors={colors}
        isDarkMode={isDarkMode}
        isRTL={isRTL}
        t={t}
        lang={lang}
        onSetLang={setLang}
        onLogin={handleLogin}
        loginError={loginError}
        submitting={submitting}
      />
    );
  }

  // Logged In Portal
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Dynamic Header (Seamless & Transparent) */}
      <View style={[styles.appHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {currentTab === 'home' ? (
          /* Home Header: Delegate Profile & Quick QR Trigger */
          <>
            <TouchableOpacity
              style={[styles.headerUserInfo, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => setCurrentTab('profile')}
            >
              <View style={[styles.headerAvatar, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                {empPhotoUrl ? (
                  <Image source={{ uri: empPhotoUrl }} style={styles.headerAvatarImg} />
                ) : (
                  <Ionicons name="person" size={18} color={colors.primary} />
                )}
              </View>
              <View style={[styles.headerUserText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                <Text style={[styles.headerUserName, { color: colors.textPrimary }]} numberOfLines={1}>
                  {employee.name}
                </Text>
                <Text style={[styles.headerUserRole, { color: colors.textSecondary }]}>
                  {employee.motorcycle_number ? `${employee.motorcycle_number}` : t.jobRole}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={[styles.headerActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <TouchableOpacity
                style={[styles.headerActionBtn, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                onPress={() => setShowQrModal(true)}
              >
                <Ionicons name="qr-code-outline" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          </>
        ) : (
          /* Sub-Page Header: Back Button + Start-Aligned Title with Orange Underline */
          <View style={[styles.subPageHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={() => setCurrentTab('home')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={isRTL ? 'arrow-forward' : 'arrow-back'}
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>

            <View style={[styles.subPageTitleContainer, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {currentTab === 'shift'
                  ? (activeSession ? t.endShiftTitle : t.startShiftTitle)
                  : currentTab === 'history'
                  ? t.historyTitle
                  : t.profileTitle}
              </Text>
              <View style={[styles.titleUnderlineBar, { backgroundColor: colors.primary }]} />
            </View>
          </View>
        )}
      </View>

      {/* Main Content Body */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.mainScrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {currentTab === 'home' && (
          <HomeScreen
            employee={employee}
            activeSession={activeSession}
            historySessions={historySessions}
            totalApprovedOrdersCount={totalApprovedOrdersCount}
            monthlyTarget={monthlyTarget}
            isTargetAchieved={isTargetAchieved}
            expectedSalary={expectedSalary}
            targetProgressPct={targetProgressPct}
            remainingOrdersToTarget={remainingOrdersToTarget}
            elapsedTime={elapsedTime}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            t={t}
            onNavigateToTab={setCurrentTab}
          />
        )}

        {currentTab === 'shift' && (
          <ShiftScreen
            employee={employee}
            activeSession={activeSession}
            enteredMotorcycle={enteredMotorcycle}
            setEnteredMotorcycle={setEnteredMotorcycle}
            startKm={startKm}
            setStartKm={setStartKm}
            autoKmFetched={autoKmFetched}
            startKmImage={startKmImage}
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
            elapsedTime={elapsedTime}
            gpsDistance={gpsDistance}
            submitting={submitting}
            onTakeOdometerPhoto={takeOdometerPhoto}
            onStartShift={handleStartShift}
            onEndShift={handleEndShift}
            onPreviewPhoto={setPreviewPhoto}
            formatTimeStr={formatTimeStr}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            t={t}
          />
        )}

        {currentTab === 'history' && (
          <HistoryScreen
            historySessions={historySessions}
            onPreviewPhoto={setPreviewPhoto}
            formatDateStr={formatDateStr}
            formatTimeStr={formatTimeStr}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            t={t}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileScreen
            employee={employee}
            empPhotoUrl={empPhotoUrl}
            lang={lang}
            onOpenQrModal={() => setShowQrModal(true)}
            onOpenLangModal={() => setShowLangModal(true)}
            onLogout={handleLogout}
            onPreviewPhoto={setPreviewPhoto}
            colors={colors}
            isDarkMode={isDarkMode}
            isRTL={isRTL}
            t={t}
          />
        )}
      </ScrollView>

      {/* Fullscreen QR Modal */}
      <QrCodeModal
        visible={showQrModal}
        employee={employee}
        colors={colors}
        isRTL={isRTL}
        t={t}
        onClose={() => setShowQrModal(false)}
      />

      {/* Language Selector Modal */}
      <LanguageModal
        visible={showLangModal}
        currentLang={lang}
        colors={colors}
        t={t}
        onSelectLang={(newLang) => {
          setLang(newLang);
          setShowLangModal(false);
        }}
        onClose={() => setShowLangModal(false)}
      />

      {/* Photo Preview Lightbox Modal */}
      <ImagePreviewModal
        previewPhoto={previewPhoto}
        colors={colors}
        isRTL={isRTL}
        onClose={() => setPreviewPhoto(null)}
      />

      {/* Simple Start & End Shift Success Bottom Sheet Modal */}
      {successModalData && (
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
          onNavigateToTab={setCurrentTab}
          onPreviewPhoto={setPreviewPhoto}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appHeader: {
    height: 60,
    borderBottomWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerUserInfo: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerAvatarImg: {
    width: '100%',
    height: '100%',
  },
  headerUserText: {
    flex: 1,
  },
  headerUserName: {
    fontSize: 14,
    fontWeight: '800',
  },
  headerUserRole: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    alignItems: 'center',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subPageHeaderRow: {
    flex: 1,
    alignItems: 'center',
    gap: 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  subPageTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  subPageHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  titleUnderlineBar: {
    width: 34,
    height: 3,
    borderRadius: 2,
    marginTop: 3,
  },
  mainScrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
});
