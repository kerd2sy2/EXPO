import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SplashScreen from 'expo-splash-screen';
import { workApi, EmployeeProfile, WorkSession } from '../services/work';
import { setAuthToken, getStoredToken } from '../services/api';

const { width } = Dimensions.get('window');

type TabType = 'home' | 'shift' | 'history' | 'profile';

export default function DelegateApp() {
  // Theme State (Default: Light Mode)
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Auth & Session State
  const [token, setToken] = useState<string | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [historySessions, setHistorySessions] = useState<WorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  // Login Form State
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Start Shift Form State
  const [enteredMotorcycle, setEnteredMotorcycle] = useState('');
  const [startKm, setStartKm] = useState('');
  const [autoFilledKm, setAutoFilledKm] = useState<number | null>(null);
  const [startKmImage, setStartKmImage] = useState<string | null>(null);
  const [startNotes, setStartNotes] = useState('');

  // End Shift Form State
  const [endKm, setEndKm] = useState('');
  const [endKmImage, setEndKmImage] = useState<string | null>(null);
  const [ordersCount, setOrdersCount] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [endNotes, setEndNotes] = useState('');

  // Elapsed Time State
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // Preview Modal State for Photos in History
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  // Check initial login state
  useEffect(() => {
    checkSession().finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

  // Fetch history when employee changes or tab changes
  useEffect(() => {
    if (employee?.id) {
      loadHistory();
    }
  }, [employee?.id, currentTab, activeSession]);

  const loadHistory = async () => {
    if (!employee?.id) return;
    try {
      const list = await workApi.getMySessions(employee.id, 20);
      setHistorySessions(list);
    } catch {
      // ignore
    }
  };

  // Automatically fetch last ending odometer when motorcycle is set or changed
  useEffect(() => {
    if (!employee || activeSession) return;
    const bike = enteredMotorcycle.trim();
    if (!bike) {
      setAutoFilledKm(null);
      return;
    }

    let isMounted = true;
    workApi.getLastKM(employee.id, bike).then((kmData) => {
      if (isMounted && kmData && kmData.last_end_km > 0) {
        setStartKm(String(kmData.last_end_km));
        setAutoFilledKm(kmData.last_end_km);
      } else if (isMounted) {
        setAutoFilledKm(null);
      }
    }).catch(() => {
      if (isMounted) setAutoFilledKm(null);
    });

    return () => {
      isMounted = false;
    };
  }, [enteredMotorcycle, employee?.id, activeSession]);

  const checkSession = async () => {
    setLoading(true);
    const existingToken = getStoredToken();
    if (existingToken) {
      setToken(existingToken);
      try {
        const me = await workApi.getMe();
        if (me?.employee || me?.admin) {
          const emp = me.employee || {
            id: me.admin.id,
            name: me.admin.name,
            national_id: me.admin.national_id || '',
            motorcycle_number: me.admin.motorcycle_number || '',
            key_number: me.admin.key_number || '',
            branch_name: me.admin.branch?.name || '',
          };
          setEmployee(emp);
          setEnteredMotorcycle(emp.motorcycle_number || '');
          const session = await workApi.getActiveSession(emp.id);
          setActiveSession(session);
        }
      } catch {
        handleLogout();
      }
    }
    setLoading(false);
  };

  // Timer for active shift
  useEffect(() => {
    if (!activeSession?.start_time) return;

    const updateTimer = () => {
      const start = new Date(activeSession.start_time).getTime();
      const now = new Date().getTime();
      const diffSecs = Math.max(0, Math.floor((now - start) / 1000));

      const hrs = Math.floor(diffSecs / 3600);
      const mins = Math.floor((diffSecs % 3600) / 60);
      const secs = diffSecs % 60;

      const pad = (n: number) => n.toString().padStart(2, '0');
      setElapsedTime(`${pad(hrs)}:${pad(mins)}:${pad(secs)}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleLogin = async () => {
    if (!loginInput.trim()) {
      setLoginError('يرجى إدخال رقم الهوية أو البريد الإلكتروني');
      return;
    }

    setSubmitting(true);
    setLoginError('');

    try {
      const res = await workApi.login(loginInput.trim(), passwordInput.trim() || undefined);
      setToken(res.access_token);

      const empData: EmployeeProfile = res.employee || {
        id: res.admin?.id || '',
        name: res.admin?.name || '',
        national_id: loginInput.split('@')[0],
        motorcycle_number: '',
        key_number: '',
        employee_number: '',
        job_role: 'DRIVER',
      };

      setEmployee(empData);
      setEnteredMotorcycle(empData.motorcycle_number || '');

      const session = await workApi.getActiveSession(empData.id);
      setActiveSession(session);
      setCurrentTab('home');
    } catch (err: any) {
      setLoginError(err.message || 'فشل تسجيل الدخول، تأكد من صحة البيانات');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    setAuthToken(null);
    setToken(null);
    setEmployee(null);
    setActiveSession(null);
    setLoginInput('');
    setPasswordInput('');
    setLoginError('');
    setCurrentTab('home');
  };

  // Image picking / capturing helper
  const pickOdometerImage = async (mode: 'camera' | 'gallery', target: 'start' | 'end') => {
    try {
      let result: ImagePicker.ImagePickerResult;
      if (mode === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('الإذن مطلوب', 'يرجى السماح للتطبيق باستخدام الكاميرا لالتقاط صورة العداد');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.5,
          base64: true,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('الإذن مطلوب', 'يرجى السماح للتطبيق بالوصول للصور لاختيار صورة العداد');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          quality: 0.5,
          base64: true,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        if (target === 'start') {
          setStartKmImage(base64Data);
        } else {
          setEndKmImage(base64Data);
        }
      }
    } catch (err: any) {
      Alert.alert('خطأ', 'تعذر التقاط أو اختيار الصورة: ' + (err.message || ''));
    }
  };

  const handleStartShift = async () => {
    if (!employee) return;

    if (!enteredMotorcycle.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة رقم الدباب الفعلي');
      return;
    }

    const kmNum = parseFloat(startKm);
    if (isNaN(kmNum) || kmNum <= 0) {
      Alert.alert('تنبيه', 'يرجى إدخال قراءة عداد البداية بشكل صحيح');
      return;
    }

    if (!startKmImage) {
      Alert.alert('صورة العداد مطلوبة 📸', 'يرجى التقاط أو رفع صورة واضحة لعداد البداية للتوثيق والمراجعة.');
      return;
    }

    setSubmitting(true);
    try {
      const session = await workApi.startShift({
        employee_id: employee.id,
        motorcycle_number: enteredMotorcycle.trim(),
        start_km: kmNum,
        start_km_image: startKmImage,
        notes: startNotes.trim() || undefined,
      });

      setActiveSession(session);
      setStartKm('');
      setStartKmImage(null);
      setStartNotes('');
      setCurrentTab('home');
      Alert.alert('تم بنجاح 🚀', 'تم بدء شفت العمل بنجاح وجرى إشعار المشرف.');
      loadHistory();
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'تعذر بدء شفت العمل');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndShift = async () => {
    if (!employee || !activeSession) return;

    const endKmNum = parseFloat(endKm);
    if (isNaN(endKmNum) || endKmNum <= activeSession.start_km) {
      Alert.alert(
        'خطأ في قراءة العداد',
        `قراءة عداد النهاية (${endKmNum || 0}) يجب أن تكون أكبر من قراءة البداية (${activeSession.start_km})`
      );
      return;
    }

    if (!endKmImage) {
      Alert.alert('صورة العداد مطلوبة 📸', 'يرجى التقاط أو رفع صورة واضحة لعداد النهاية لتأكيد إقفال الشفت.');
      return;
    }

    const orders = parseInt(ordersCount, 10);
    if (isNaN(orders) || orders < 0) {
      Alert.alert('تنبيه', 'يرجى إدخال عدد الطلبات بشكل صحيح (0 أو أكثر)');
      return;
    }

    const fuel = parseFloat(fuelCost) || 0;

    setSubmitting(true);
    try {
      await workApi.endShift({
        employee_id: employee.id,
        end_km: endKmNum,
        end_km_image: endKmImage,
        orders_count: orders,
        fuel_cost: fuel,
        notes: endNotes.trim() || undefined,
      });

      setActiveSession(null);
      setEndKm('');
      setEndKmImage(null);
      setOrdersCount('');
      setFuelCost('');
      setEndNotes('');
      setCurrentTab('home');
      Alert.alert('تم إنهاء الشفت بنجاح 🏁', 'تم إرسال قراءات الشفت والصور وبانتظار مصادقة المشرف.');
      loadHistory();
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'تعذر إنهاء الشفت');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if entered motorcycle matches assigned
  const isMotorcycleMatching = useMemo(() => {
    if (!employee?.motorcycle_number || !enteredMotorcycle.trim()) return true;
    return employee.motorcycle_number.trim().toLowerCase() === enteredMotorcycle.trim().toLowerCase();
  }, [employee?.motorcycle_number, enteredMotorcycle]);

  // Distance calculation helper
  const calculatedDistance = useMemo(() => {
    const end = parseFloat(endKm);
    const start = activeSession?.start_km || 0;
    if (isNaN(end) || end <= start) return 0;
    return (end - start).toFixed(1);
  }, [endKm, activeSession?.start_km]);

  // Theme Colors
  const colors = {
    bg: isDarkMode ? '#090d16' : '#f8fafc',
    card: isDarkMode ? '#131b2e' : '#ffffff',
    cardHeader: isDarkMode ? '#19243d' : '#f1f5f9',
    textPrimary: isDarkMode ? '#f8fafc' : '#0f172a',
    textSecondary: isDarkMode ? '#94a3b8' : '#64748b',
    border: isDarkMode ? '#222f4c' : '#e2e8f0',
    primary: '#059669',
    primaryLight: isDarkMode ? '#064e3b' : '#ecfdf5',
    primaryText: isDarkMode ? '#6ee7b7' : '#047857',
    accent: '#2563eb',
    accentLight: isDarkMode ? '#1e293b' : '#eff6ff',
    inputBg: isDarkMode ? '#0f172a' : '#f8fafc',
    inputBorder: isDarkMode ? '#334155' : '#cbd5e1',
    warningBg: isDarkMode ? '#451a03' : '#fffbeb',
    warningBorder: isDarkMode ? '#78350f' : '#fde68a',
    warningText: isDarkMode ? '#fbbf24' : '#b45309',
    errorBg: isDarkMode ? '#450a0a' : '#fef2f2',
    errorText: isDarkMode ? '#f87171' : '#dc2626',
    bottomNavBg: isDarkMode ? '#0f172a' : '#ffffff',
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>جاري تجهيز بوابة المندوب...</Text>
      </View>
    );
  }

  // =========================================================================
  // 1. LOGIN SCREEN
  // =========================================================================
  if (!token || !employee) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.loginScrollContent} showsVerticalScrollIndicator={false}>
            {/* Theme Toggle Top Right */}
            <View style={styles.topBarActions}>
              <TouchableOpacity
                style={[styles.themeToggleBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setIsDarkMode(!isDarkMode)}
              >
                <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={18} color={isDarkMode ? '#fbbf24' : '#64748b'} />
                <Text style={[styles.themeToggleText, { color: colors.textSecondary }]}>
                  {isDarkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* App Logo & Header */}
            <View style={styles.loginHeader}>
              <View style={[styles.logoIconCircle, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
                <MaterialCommunityIcons name="motorbike" size={44} color={colors.primary} />
              </View>
              <Text style={[styles.appTitle, { color: colors.textPrimary }]}>AAMS Logistics</Text>
              <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>بوابة المناديب الميدانية</Text>
            </View>

            {/* Login Card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.loginCardTitle, { color: colors.textPrimary }]}>تسجيل الدخول</Text>
              <Text style={[styles.loginCardSubtitle, { color: colors.textSecondary }]}>
                أدخل رقم الهوية الوطنية لتسجيل الدخول ومباشرة دوامك
              </Text>

              {loginError ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.errorBg }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.errorText} />
                  <Text style={[styles.errorBannerText, { color: colors.errorText }]}>{loginError}</Text>
                </View>
              ) : null}

              {/* National ID Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>رقم الهوية أو البريد</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <Feather name="user" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="مثال: 2569600022"
                    placeholderTextColor="#94a3b8"
                    value={loginInput}
                    onChangeText={setLoginInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary }]}>كلمة المرور (اختياري)</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.inputIcon}>
                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary }]}
                    placeholder="آخر 6 أرقام من الهوية افتراضياً"
                    placeholderTextColor="#94a3b8"
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    secureTextEntry={!showPassword}
                    textAlign="right"
                  />
                </View>
                <Text style={[styles.hintText, { color: colors.textSecondary }]}>
                  💡 كلمة المرور الافتراضية هي آخر 6 أرقام من رقم الهوية
                </Text>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleLogin}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.buttonContentRow}>
                    <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>دخول البوابة</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // 2. MAIN LOGGED-IN PORTAL
  // =========================================================================
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />

      {/* Top Header Bar */}
      <View style={[styles.headerBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRight}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primaryText }]}>
              {employee.name ? employee.name.charAt(0) : 'م'}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.delegateName, { color: colors.textPrimary }]} numberOfLines={1}>
              {employee.name || 'المندوب'}
            </Text>
            <View style={styles.headerBadgesRow}>
              <View style={[styles.pillBadge, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.pillBadgeText, { color: colors.accent }]}>
                  هوية: {employee.national_id}
                </Text>
              </View>
              {employee.key_number ? (
                <View style={[styles.pillBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.pillBadgeText, { color: colors.primaryText }]}>
                    مفتاح: {employee.key_number}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.headerLeftActions}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.bg, borderColor: colors.border }]}
            onPress={() => setIsDarkMode(!isDarkMode)}
          >
            <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={18} color={isDarkMode ? '#fbbf24' : '#64748b'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: colors.bg, borderColor: colors.border }]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Body Content by Tab */}
      <ScrollView contentContainerStyle={styles.mainScrollContent} showsVerticalScrollIndicator={false}>
        {/* ----------------- TAB 1: HOME DASHBOARD (الرئيسية) ----------------- */}
        {currentTab === 'home' && (
          <View style={styles.tabContainer}>
            {/* Shift Status Hero Card */}
            <View
              style={[
                styles.heroCard,
                activeSession
                  ? { backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5', borderColor: '#10b981' }
                  : { backgroundColor: isDarkMode ? '#1e293b' : '#f0fdf4', borderColor: colors.border },
              ]}
            >
              <View style={styles.heroCardTop}>
                <View
                  style={[
                    styles.statusPill,
                    activeSession ? { backgroundColor: '#10b981' } : { backgroundColor: '#64748b' },
                  ]}
                >
                  <View style={styles.pulsingDot} />
                  <Text style={styles.statusPillText}>
                    {activeSession ? 'شفت العمل قائم الآن 🟢' : 'جاهز لبدء الشفت 🚀'}
                  </Text>
                </View>

                {activeSession && (
                  <View style={styles.timerBadge}>
                    <Ionicons name="time-outline" size={16} color="#047857" />
                    <Text style={styles.timerBadgeText}>{elapsedTime}</Text>
                  </View>
                )}
              </View>

              {activeSession ? (
                <View style={styles.heroActiveDetails}>
                  <Text style={[styles.heroHeading, { color: isDarkMode ? '#ffffff' : '#065f46' }]}>
                    الدوام جاري على دباب [{activeSession.motorcycle_number}]
                  </Text>
                  <Text style={[styles.heroSub, { color: isDarkMode ? '#a7f3d0' : '#047857' }]}>
                    عداد البداية: {activeSession.start_km} كم | بدأ الساعة{' '}
                    {new Date(activeSession.start_time).toLocaleTimeString('ar-SA', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                  <TouchableOpacity
                    style={[styles.heroActionButton, { backgroundColor: '#dc2626' }]}
                    onPress={() => setCurrentTab('shift')}
                  >
                    <Ionicons name="stop-circle" size={20} color="#ffffff" />
                    <Text style={styles.heroActionButtonText}>إنهاء الشفت وتسجيل العداد 🏁</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.heroInactiveDetails}>
                  <Text style={[styles.heroHeading, { color: colors.textPrimary }]}>
                    لم تسجل بدء العمل اليوم بعد
                  </Text>
                  <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                    الدباب المربوط بك: {employee.motorcycle_number || 'غير محدد'} | فرع: {employee.branch_name || 'الفرع الأول'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.heroActionButton, { backgroundColor: colors.primary }]}
                    onPress={() => setCurrentTab('shift')}
                  >
                    <Ionicons name="play-circle" size={20} color="#ffffff" />
                    <Text style={styles.heroActionButtonText}>بدء دوام جديد الآن 🚀</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Quick KPI Stats */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>ملخص إنجازاتي</Text>
            </View>

            <View style={styles.statsGrid}>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <MaterialCommunityIcons name="bike" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {employee.motorcycle_number || '—'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>الدباب المربوط</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.accentLight }]}>
                  <MaterialCommunityIcons name="calendar-check" size={22} color={colors.accent} />
                </View>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{historySessions.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>الشفتات المسجلة</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <MaterialCommunityIcons name="map-marker-distance" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {historySessions.reduce((sum, s) => sum + (s.distance || 0), 0).toFixed(0)} كم
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>إجمالي المسافة</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.accentLight }]}>
                  <MaterialCommunityIcons name="package-variant-closed" size={22} color={colors.accent} />
                </View>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {historySessions.filter((s) => s.is_reviewed).reduce((sum, s) => sum + (s.orders_count || 0), 0)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>الطلبات المعتمدة</Text>
              </View>
            </View>

            {/* Quick Navigation Cards */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>الوصول السريع</Text>
            </View>

            <TouchableOpacity
              style={[styles.quickCardRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setCurrentTab('shift')}
            >
              <View style={[styles.quickCardIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="speedometer-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.quickCardTextCol}>
                <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>
                  {activeSession ? 'إقفال وتوثيق الشفت الحالي' : 'بدء شفت وتصوير العداد'}
                </Text>
                <Text style={[styles.quickCardSub, { color: colors.textSecondary }]}>
                  {activeSession ? 'تسجيل عداد النهاية والطلبات والوقود' : 'التقاط صورة العداد والتحقق من الدباب'}
                </Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickCardRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setCurrentTab('history')}
            >
              <View style={[styles.quickCardIconCircle, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="time-outline" size={24} color={colors.accent} />
              </View>
              <View style={styles.quickCardTextCol}>
                <Text style={[styles.quickCardTitle, { color: colors.textPrimary }]}>سجل الشفتات والتصديقات</Text>
                <Text style={[styles.quickCardSub, { color: colors.textSecondary }]}>
                  عرض حالة اعتماد المشرف للطلبات وصور العدادات
                </Text>
              </View>
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ----------------- TAB 2: SHIFT ACTIONS (الدوام) ----------------- */}
        {currentTab === 'shift' && (
          <View style={styles.tabContainer}>
            {!activeSession ? (
              /* START SHIFT FORM */
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="play" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>بدء شفت عمل جديد</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                      تأكد من رقم الدباب وقراءة عداد البداية والتقط صورة واضحة
                    </Text>
                  </View>
                </View>

                {/* Motorcycle Field */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    رقم الدباب الفعلي الذي ستقوده <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <MaterialCommunityIcons name="numeric" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder="اكتب رقم الدباب..."
                      placeholderTextColor="#94a3b8"
                      value={enteredMotorcycle}
                      onChangeText={setEnteredMotorcycle}
                      textAlign="right"
                    />
                  </View>

                  {/* Matching Indicator */}
                  {enteredMotorcycle.trim() ? (
                    isMotorcycleMatching ? (
                      <View style={[styles.matchBadgeSuccess, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                        <Text style={[styles.matchTextSuccess, { color: colors.primaryText }]}>
                          مطابق للدباب المربوط بك بالنظام ✅
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.matchBadgeWarning, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                        <Ionicons name="warning" size={16} color={colors.warningText} />
                        <Text style={[styles.matchTextWarning, { color: colors.warningText }]}>
                          ⚠️ تنبيه: الدباب مختلف عن المربوط بك ({employee.motorcycle_number}) — سيتم إرسال إشعار للمشرف!
                        </Text>
                      </View>
                    )
                  ) : null}
                </View>

                {/* Starting Odometer Input */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    قراءة عداد البداية (Start KM) <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <MaterialCommunityIcons name="gauge" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder="مثال: 15400"
                      placeholderTextColor="#94a3b8"
                      value={startKm}
                      onChangeText={(val) => {
                        setStartKm(val);
                        setAutoFilledKm(null);
                      }}
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>
                  {autoFilledKm !== null && (
                    <View style={[styles.matchBadgeSuccess, { backgroundColor: colors.primaryLight }]}>
                      <Ionicons name="sparkles" size={14} color={colors.primary} />
                      <Text style={[styles.matchTextSuccess, { color: colors.primaryText }]}>
                        تم جلب عداد نهاية الشفت السابق لهذا الدباب تلقائياً ({autoFilledKm} كم) 🛵
                      </Text>
                    </View>
                  )}
                </View>

                {/* Start Odometer Photo Capture */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    صورة عداد البداية <Text style={{ color: '#ef4444' }}>* (مطلوبة للتدقيق)</Text>
                  </Text>

                  {startKmImage ? (
                    <View style={[styles.imagePreviewContainer, { borderColor: colors.border }]}>
                      <Image source={{ uri: startKmImage }} style={styles.imagePreview} />
                      <View style={styles.imageOverlayBadge}>
                        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                        <Text style={styles.imageOverlayText}>تم التقاط صورة العداد</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => setStartKmImage(null)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.photoPickerRow}>
                      <TouchableOpacity
                        style={[styles.photoButton, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
                        onPress={() => pickOdometerImage('camera', 'start')}
                      >
                        <Ionicons name="camera" size={22} color={colors.primary} />
                        <Text style={[styles.photoButtonText, { color: colors.primaryText }]}>التقاط بالكاميرا 📸</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.photoButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                        onPress={() => pickOdometerImage('gallery', 'start')}
                      >
                        <Ionicons name="images-outline" size={22} color={colors.textSecondary} />
                        <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>من المعرض 🖼️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Start Notes */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>ملاحظات البداية (اختياري)</Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                    placeholder="أي ملاحظات حول حالة الدباب قبل الانطلاق..."
                    placeholderTextColor="#94a3b8"
                    value={startNotes}
                    onChangeText={setStartNotes}
                    multiline
                    numberOfLines={2}
                    textAlign="right"
                  />
                </View>

                {/* Submit Start */}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={handleStartShift}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={styles.buttonContentRow}>
                      <Ionicons name="play-circle-outline" size={22} color="#ffffff" />
                      <Text style={styles.primaryButtonText}>تأكيد وبدء الدوام الآن 🚀</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* END SHIFT FORM */
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.cardHeaderIcon, { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="stop" size={20} color="#ef4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>إنهاء شفت العمل</Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                      أدخل قراءة عداد النهاية وصورته وعدد الطلبات المنجزة
                    </Text>
                  </View>
                </View>

                {/* Active Session Info Box */}
                <View style={[styles.activeShiftSummaryBox, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>عداد البداية</Text>
                    <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{activeSession.start_km} كم</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>رقم الدباب</Text>
                    <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{activeSession.motorcycle_number}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>مدة العمل</Text>
                    <Text style={[styles.summaryVal, { color: colors.primary }]}>{elapsedTime}</Text>
                  </View>
                </View>

                {/* Ending Odometer Input */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    قراءة عداد النهاية (End KM) <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <MaterialCommunityIcons name="gauge" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary }]}
                      placeholder={`أكبر من ${activeSession.start_km}...`}
                      placeholderTextColor="#94a3b8"
                      value={endKm}
                      onChangeText={setEndKm}
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>

                  {Number(calculatedDistance) > 0 && (
                    <View style={[styles.matchBadgeSuccess, { backgroundColor: colors.accentLight }]}>
                      <Ionicons name="speedometer" size={14} color={colors.accent} />
                      <Text style={[styles.matchTextSuccess, { color: colors.accent }]}>
                        المسافة المقطوعة المحسوبة: {calculatedDistance} كم 🛵
                      </Text>
                    </View>
                  )}
                </View>

                {/* End Odometer Photo Capture */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>
                    صورة عداد النهاية <Text style={{ color: '#ef4444' }}>* (مطلوبة للإقفال)</Text>
                  </Text>

                  {endKmImage ? (
                    <View style={[styles.imagePreviewContainer, { borderColor: colors.border }]}>
                      <Image source={{ uri: endKmImage }} style={styles.imagePreview} />
                      <View style={styles.imageOverlayBadge}>
                        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                        <Text style={styles.imageOverlayText}>تم التقاط صورة عداد النهاية</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => setEndKmImage(null)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.photoPickerRow}>
                      <TouchableOpacity
                        style={[styles.photoButton, { backgroundColor: '#fef2f2', borderColor: '#ef4444' }]}
                        onPress={() => pickOdometerImage('camera', 'end')}
                      >
                        <Ionicons name="camera" size={22} color="#dc2626" />
                        <Text style={[styles.photoButtonText, { color: '#dc2626' }]}>التقاط بالكاميرا 📸</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.photoButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                        onPress={() => pickOdometerImage('gallery', 'end')}
                      >
                        <Ionicons name="images-outline" size={22} color={colors.textSecondary} />
                        <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>من المعرض 🖼️</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Orders Count & Fuel Cost Grid */}
                <View style={styles.twoColRow}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>
                      عدد الطلبات <Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                      <Feather name="package" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        placeholder="مثال: 15"
                        placeholderTextColor="#94a3b8"
                        value={ordersCount}
                        onChangeText={setOrdersCount}
                        keyboardType="numeric"
                        textAlign="right"
                      />
                    </View>
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.textPrimary }]}>تكلفة الوقود (ر.س)</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                      <MaterialCommunityIcons name="gas-station" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary }]}
                        placeholder="0.00"
                        placeholderTextColor="#94a3b8"
                        value={fuelCost}
                        onChangeText={setFuelCost}
                        keyboardType="numeric"
                        textAlign="right"
                      />
                    </View>
                  </View>
                </View>

                {/* End Notes */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>ملاحظات إنهاء الشفت (اختياري)</Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary }]}
                    placeholder="أي ملاحظات حول الطلبات أو الدباب..."
                    placeholderTextColor="#94a3b8"
                    value={endNotes}
                    onChangeText={setEndNotes}
                    multiline
                    numberOfLines={2}
                    textAlign="right"
                  />
                </View>

                {/* Submit End */}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: '#dc2626' }]}
                  onPress={handleEndShift}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <View style={styles.buttonContentRow}>
                      <Ionicons name="checkmark-done-circle-outline" size={22} color="#ffffff" />
                      <Text style={styles.primaryButtonText}>إنهاء الشفت وإرسال البيانات 🏁</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ----------------- TAB 3: MY SHIFTS HISTORY (سجل الشفتات) ----------------- */}
        {currentTab === 'history' && (
          <View style={styles.tabContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>سجل الشفتات والاعتمادات</Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
                عرض {historySessions.length} شفت سابق مع حالة تصديق المشرف
              </Text>
            </View>

            {historySessions.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyBoxText, { color: colors.textSecondary }]}>لا توجد شفتات سابقة مسجلة</Text>
              </View>
            ) : (
              historySessions.map((s) => (
                <View key={s.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.historyCardTop}>
                    <View>
                      <Text style={[styles.historyDate, { color: colors.textPrimary }]}>
                        {new Date(s.start_time).toLocaleDateString('ar-SA')}{' '}
                        {new Date(s.start_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={[styles.historyBike, { color: colors.textSecondary }]}>
                        دباب: {s.motorcycle_number || '—'}
                      </Text>
                    </View>

                    {s.is_reviewed ? (
                      <View style={[styles.badgeReviewed, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                        <Text style={[styles.badgeReviewedText, { color: colors.primaryText }]}>مصادق عليه ✅</Text>
                      </View>
                    ) : (
                      <View style={[styles.badgePending, { backgroundColor: colors.warningBg }]}>
                        <Ionicons name="time" size={14} color={colors.warningText} />
                        <Text style={[styles.badgePendingText, { color: colors.warningText }]}>بانتظار المشرف ⏳</Text>
                      </View>
                    )}
                  </View>

                  {/* Stats Row */}
                  <View style={[styles.historyStatsRow, { backgroundColor: colors.bg }]}>
                    <View style={styles.historyStatCol}>
                      <Text style={[styles.historyStatVal, { color: colors.primary }]}>{s.distance ? s.distance.toFixed(1) : 0} كم</Text>
                      <Text style={[styles.historyStatLbl, { color: colors.textSecondary }]}>المسافة</Text>
                    </View>
                    <View style={styles.historyStatCol}>
                      <Text style={[styles.historyStatVal, { color: colors.textPrimary }]}>{s.orders_count || 0}</Text>
                      <Text style={[styles.historyStatLbl, { color: colors.textSecondary }]}>الطلبات</Text>
                    </View>
                    <View style={styles.historyStatCol}>
                      <Text style={[styles.historyStatVal, { color: colors.textPrimary }]}>{s.fuel_cost || 0} ر.س</Text>
                      <Text style={[styles.historyStatLbl, { color: colors.textSecondary }]}>الوقود</Text>
                    </View>
                  </View>

                  {/* Photos Row */}
                  <View style={styles.historyPhotosRow}>
                    {s.start_km_image ? (
                      <TouchableOpacity
                        style={[styles.historyPhotoThumb, { borderColor: colors.border }]}
                        onPress={() => setPreviewPhoto({ url: s.start_km_image!, title: `صورة عداد البداية (${s.start_km} كم)` })}
                      >
                        <Image source={{ uri: s.start_km_image }} style={styles.thumbImg} />
                        <Text style={[styles.thumbLbl, { color: colors.textSecondary }]}>البداية: {s.start_km}</Text>
                      </TouchableOpacity>
                    ) : null}

                    {s.end_km_image ? (
                      <TouchableOpacity
                        style={[styles.historyPhotoThumb, { borderColor: colors.border }]}
                        onPress={() => setPreviewPhoto({ url: s.end_km_image!, title: `صورة عداد النهاية (${s.end_km} كم)` })}
                      >
                        <Image source={{ uri: s.end_km_image }} style={styles.thumbImg} />
                        <Text style={[styles.thumbLbl, { color: colors.textSecondary }]}>النهاية: {s.end_km}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Supervisor Edit Notice */}
                  {s.is_edited_by_supervisor && (
                    <View style={[styles.editedNoticeBox, { backgroundColor: colors.accentLight }]}>
                      <Feather name="edit-2" size={12} color={colors.accent} />
                      <Text style={[styles.editedNoticeText, { color: colors.accent }]}>
                        تم تدقيق وتعديل البيانات بواسطة {s.edited_by_name || 'المشرف'}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
        )}

        {/* ----------------- TAB 4: PROFILE (الملف الشخصي) ----------------- */}
        {currentTab === 'profile' && (
          <View style={styles.tabContainer}>
            <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.profileAvatarCircle, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.profileAvatarText, { color: colors.primaryText }]}>
                  {employee.name ? employee.name.charAt(0) : 'م'}
                </Text>
              </View>

              <Text style={[styles.profileName, { color: colors.textPrimary }]}>{employee.name}</Text>
              <Text style={[styles.profileJob, { color: colors.textSecondary }]}>مندوب توصيل معتمد</Text>

              <View style={styles.profileDivider} />

              <View style={styles.profileInfoList}>
                <View style={styles.profileInfoRow}>
                  <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>رقم الهوية الوطنية</Text>
                  <Text style={[styles.profileInfoValue, { color: colors.textPrimary }]}>{employee.national_id}</Text>
                </View>

                <View style={styles.profileInfoRow}>
                  <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>رقم المفتاح</Text>
                  <Text style={[styles.profileInfoValue, { color: colors.textPrimary }]}>{employee.key_number || '—'}</Text>
                </View>

                <View style={styles.profileInfoRow}>
                  <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>الدباب المربوط</Text>
                  <Text style={[styles.profileInfoValue, { color: colors.primary }]}>{employee.motorcycle_number || '—'}</Text>
                </View>

                <View style={styles.profileInfoRow}>
                  <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>الفرع</Text>
                  <Text style={[styles.profileInfoValue, { color: colors.textPrimary }]}>{employee.branch_name || 'الفرع الأول'}</Text>
                </View>
              </View>
            </View>

            {/* Settings & Theme Box */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 12 }]}>إعدادات التطبيق</Text>

              <TouchableOpacity
                style={[styles.settingRow, { borderBottomColor: colors.border }]}
                onPress={() => setIsDarkMode(!isDarkMode)}
              >
                <View style={styles.settingRowRight}>
                  <Ionicons name={isDarkMode ? 'sunny' : 'moon'} size={20} color={isDarkMode ? '#fbbf24' : '#64748b'} />
                  <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>
                    مظهر التطبيق ({isDarkMode ? 'الوضع الليلي' : 'الوضع النهاري'})
                  </Text>
                </View>
                <Text style={[styles.settingRowVal, { color: colors.primary }]}>تغيير</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingRow, { borderBottomWidth: 0 }]}
                onPress={handleLogout}
              >
                <View style={styles.settingRowRight}>
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                  <Text style={[styles.settingRowText, { color: '#ef4444' }]}>تسجيل الخروج من الحساب</Text>
                </View>
                <Ionicons name="chevron-back" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* =========================================================================
          BOTTOM NAVIGATION BAR
         ========================================================================= */}
      <View style={[styles.bottomNav, { backgroundColor: colors.bottomNavBg, borderColor: colors.border }]}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('home')}
        >
          <Ionicons
            name={currentTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={currentTab === 'home' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.navItemText,
              { color: currentTab === 'home' ? colors.primary : colors.textSecondary, fontWeight: currentTab === 'home' ? 'bold' : 'normal' },
            ]}
          >
            الرئيسية
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('shift')}
        >
          <View style={styles.shiftNavIconWrapper}>
            <Ionicons
              name={activeSession ? 'speedometer' : 'speedometer-outline'}
              size={22}
              color={currentTab === 'shift' ? colors.primary : colors.textSecondary}
            />
            {activeSession && <View style={styles.navActiveDot} />}
          </View>
          <Text
            style={[
              styles.navItemText,
              { color: currentTab === 'shift' ? colors.primary : colors.textSecondary, fontWeight: currentTab === 'shift' ? 'bold' : 'normal' },
            ]}
          >
            {activeSession ? 'الدوام الحالي' : 'بدء الدوام'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('history')}
        >
          <Ionicons
            name={currentTab === 'history' ? 'receipt' : 'receipt-outline'}
            size={22}
            color={currentTab === 'history' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.navItemText,
              { color: currentTab === 'history' ? colors.primary : colors.textSecondary, fontWeight: currentTab === 'history' ? 'bold' : 'normal' },
            ]}
          >
            سجل الشفتات
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setCurrentTab('profile')}
        >
          <Ionicons
            name={currentTab === 'profile' ? 'person' : 'person-outline'}
            size={22}
            color={currentTab === 'profile' ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.navItemText,
              { color: currentTab === 'profile' ? colors.primary : colors.textSecondary, fontWeight: currentTab === 'profile' ? 'bold' : 'normal' },
            ]}
          >
            حسابي
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================================
          IMAGE PREVIEW LIGHTBOX MODAL
         ========================================================================= */}
      {previewPhoto && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{previewPhoto.title}</Text>
              <TouchableOpacity onPress={() => setPreviewPhoto(null)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: previewPhoto.url }} style={styles.modalImg} resizeMode="contain" />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '500',
  },

  // Login Screen Styles
  loginScrollContent: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  topBarActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
  },
  appTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  loginCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 4,
  },
  loginCardSubtitle: {
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },

  // Header Bar
  headerBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  delegateName: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  headerBadgesRow: {
    flexDirection: 'row-reverse',
    gap: 6,
    marginTop: 3,
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Main Scroll & Tabs
  mainScrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  tabContainer: {
    gap: 16,
  },

  // Hero Card (Home)
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  heroCardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  statusPillText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timerBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#047857',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  heroActiveDetails: {
    gap: 8,
  },
  heroInactiveDetails: {
    gap: 8,
  },
  heroHeading: {
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  heroSub: {
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 18,
  },
  heroActionButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  heroActionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Stats Grid
  sectionHeader: {
    marginTop: 6,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  sectionSub: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
  },
  statBox: {
    width: (width - 42) / 2,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // Quick Cards
  quickCardRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  quickCardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickCardTextCol: {
    flex: 1,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  quickCardSub: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },

  // Cards
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  cardSubtitle: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },

  // Forms
  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    textAlign: 'right',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    height: 70,
  },
  hintText: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  matchBadgeSuccess: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  matchTextSuccess: {
    fontSize: 12,
    fontWeight: '600',
  },
  matchBadgeWarning: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 6,
  },
  matchTextWarning: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  photoPickerRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  photoButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  imagePreviewContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    height: 180,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  imageOverlayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#ffffff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  twoColRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },

  // Active shift summary box inside end shift
  activeShiftSummaryBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
  },
  summaryVal: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#cbd5e1',
  },

  // Primary Button
  primaryButton: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  buttonContentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // History Screen Styles
  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  historyCardTop: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  historyBike: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 2,
  },
  badgeReviewed: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeReviewedText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgePending: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePendingText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  historyStatsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    padding: 8,
    borderRadius: 8,
  },
  historyStatCol: {
    alignItems: 'center',
  },
  historyStatVal: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  historyStatLbl: {
    fontSize: 10,
    marginTop: 1,
  },
  historyPhotosRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 10,
  },
  historyPhotoThumb: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
  },
  thumbImg: {
    width: 32,
    height: 32,
    borderRadius: 6,
  },
  thumbLbl: {
    fontSize: 10,
    fontWeight: '600',
  },
  editedNoticeBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
  },
  editedNoticeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 14,
    borderWidth: 1,
  },
  emptyBoxText: {
    marginTop: 8,
    fontSize: 14,
  },

  // Profile Screen Styles
  profileCard: {
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  profileAvatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileJob: {
    fontSize: 13,
    marginTop: 2,
  },
  profileDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 16,
  },
  profileInfoList: {
    width: '100%',
    gap: 12,
  },
  profileInfoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileInfoLabel: {
    fontSize: 13,
  },
  profileInfoValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingRowRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  settingRowText: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingRowVal: {
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Bottom Navigation Bar
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    flex: 1,
  },
  navItemText: {
    fontSize: 11,
    marginTop: 3,
  },
  shiftNavIconWrapper: {
    position: 'relative',
  },
  navActiveDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },

  // Photo Preview Modal
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 999,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalImg: {
    width: '100%',
    height: 350,
    borderRadius: 10,
  },
});
