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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { workApi, EmployeeProfile, WorkSession } from '../services/work';
import { setAuthToken, getStoredToken } from '../services/api';
import * as SplashScreen from 'expo-splash-screen';

export default function DelegateApp() {
  const [token, setToken] = useState<string | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfile | null>(null);
  const [activeSession, setActiveSession] = useState<WorkSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Login Form State
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Start Shift Form State
  const [enteredMotorcycle, setEnteredMotorcycle] = useState('');
  const [startKm, setStartKm] = useState('');
  const [startNotes, setStartNotes] = useState('');

  // End Shift Form State
  const [endKm, setEndKm] = useState('');
  const [ordersCount, setOrdersCount] = useState('');
  const [fuelCost, setFuelCost] = useState('');
  const [endNotes, setEndNotes] = useState('');

  // Elapsed Time State
  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  // Check initial login state
  useEffect(() => {
    checkSession().finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

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
          // Check active session
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

      // Check active shift
      const session = await workApi.getActiveSession(empData.id);
      setActiveSession(session);
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

    setSubmitting(true);
    try {
      const session = await workApi.startShift({
        employee_id: employee.id,
        motorcycle_number: enteredMotorcycle.trim(),
        start_km: kmNum,
        notes: startNotes.trim() || undefined,
      });

      setActiveSession(session);
      setStartKm('');
      setStartNotes('');
      Alert.alert('تم بنجاح', 'تم بدء شفت العمل بنجاح!');
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'تعذر بدء الشفت');
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

    setSubmitting(true);
    try {
      await workApi.endShift({
        employee_id: employee.id,
        end_km: endKmNum,
        orders_count: parseInt(ordersCount) || 0,
        fuel_cost: parseFloat(fuelCost) || 0,
        notes: endNotes.trim() || undefined,
      });

      setActiveSession(null);
      setEndKm('');
      setOrdersCount('');
      setFuelCost('');
      setEndNotes('');
      Alert.alert('تم الإقفال بنجاح', 'تم إقفال شفت العمل وتوثيق البيانات بنجاح!');
    } catch (err: any) {
      Alert.alert('خطأ', err.message || 'تعذر إنهاء الشفت');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if entered motorcycle matches assigned
  const isMotorcycleMatching = useMemo(() => {
    if (!employee?.motorcycle_number || !enteredMotorcycle) return true;
    return employee.motorcycle_number.trim() === enteredMotorcycle.trim();
  }, [employee?.motorcycle_number, enteredMotorcycle]);

  // Distance calculated during shift end
  const calculatedDistance = useMemo(() => {
    const end = parseFloat(endKm);
    const start = activeSession?.start_km || 0;
    if (isNaN(end) || end <= start) return '0';
    return (end - start).toFixed(1);
  }, [endKm, activeSession?.start_km]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
        <Text style={styles.loadingText}>جاري التحميل...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {token && (
              <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                <Text style={styles.logoutText}>خروج</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.headerRight}>
            <View>
              <Text style={styles.headerTitle}>أماس للخدمات اللوجستية</Text>
              <Text style={styles.headerSubtitle}>
                {employee?.branch_name ? `فرع: ${employee.branch_name}` : 'تطبيق المندوب الميداني'}
              </Text>
            </View>
            <View style={styles.logoIcon}>
              <MaterialCommunityIcons name="motorbike" size={24} color="#ffffff" />
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* ================= VIEW 1: LOGIN SCREEN ================= */}
          {!token && (
            <View style={styles.card}>
              <View style={styles.loginHero}>
                <View style={styles.heroIconBadge}>
                  <FontAwesome5 name="id-card" size={32} color="#1d4ed8" />
                </View>
                <Text style={styles.loginTitle}>تسجيل دخول المندوب</Text>
                <Text style={styles.loginSubtitle}>
                  أدخل رقم الهوية المسجل أو البريد الإلكتروني لبدء الشفت
                </Text>
              </View>

              {loginError ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color="#ef4444" />
                  <Text style={styles.errorBannerText}>{loginError}</Text>
                </View>
              ) : null}

              <View style={styles.formGroup}>
                <Text style={styles.label}>رقم الهوية الوطنية / البريد الإلكتروني</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="مثال: 2569600022 أو 2569600022@aams-logistics.com"
                    placeholderTextColor="#94a3b8"
                    value={loginInput}
                    onChangeText={setLoginInput}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    textAlign="right"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  كلمة المرور{' '}
                  <Text style={styles.labelHint}>(الافتراضية: آخر 6 أرقام من الهوية)</Text>
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••"
                    placeholderTextColor="#94a3b8"
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    secureTextEntry
                    textAlign="right"
                  />
                </View>
              </View>

              {/* Quick Demo Fill Button */}
              <TouchableOpacity
                style={styles.quickFillButton}
                onPress={() => {
                  setLoginInput('2569600022@aams-logistics.com');
                  setPasswordInput('600022');
                }}
              >
                <Ionicons name="sparkles-outline" size={16} color="#3b82f6" />
                <Text style={styles.quickFillText}>تجربة حساب المندوب (دلوار - 2569600022)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryButton, submitting && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>تسجيل الدخول</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ================= VIEW 2: START SHIFT SCREEN ================= */}
          {token && !activeSession && (
            <View style={styles.spaceGap}>
              {/* Delegate Profile Card */}
              <View style={styles.card}>
                <View style={styles.profileHeader}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{employee?.name?.charAt(0) || 'م'}</Text>
                  </View>
                  <View style={styles.profileDetails}>
                    <Text style={styles.profileName}>{employee?.name || 'مندوب التوصيل'}</Text>
                    <Text style={styles.profileMeta}>
                      هوية: {employee?.national_id || '—'} | مفتاح: #{employee?.key_number || '—'}
                    </Text>
                  </View>
                </View>

                {/* Assigned Motorcycle Banner */}
                <View style={styles.assignedBikeBanner}>
                  <View style={styles.bikeIconBox}>
                    <MaterialCommunityIcons name="motorbike" size={22} color="#1d4ed8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.assignedBikeLabel}>الدباب المربوط بك في النظام:</Text>
                    <Text style={styles.assignedBikeValue}>
                      {employee?.motorcycle_number ? `دباب رقم: ${employee.motorcycle_number}` : 'لم يتم ربط دباب محدد'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Start Shift Form */}
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <MaterialCommunityIcons name="timer-outline" size={20} color="#1d4ed8" />
                  <Text style={styles.cardTitle}>بدء شفت عمل جديد</Text>
                </View>

                {/* Motorcycle Plate Input */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    رقم الدباب الفعلي الذي ستقوده <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="numeric" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="اكتب رقم الدباب الفعلي..."
                      placeholderTextColor="#94a3b8"
                      value={enteredMotorcycle}
                      onChangeText={setEnteredMotorcycle}
                      textAlign="right"
                    />
                  </View>

                  {/* Matching Indicator */}
                  {enteredMotorcycle.trim() ? (
                    isMotorcycleMatching ? (
                      <View style={styles.matchBadgeSuccess}>
                        <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                        <Text style={styles.matchTextSuccess}>مطابق للدباب المربوط بك في النظام ✅</Text>
                      </View>
                    ) : (
                      <View style={styles.matchBadgeWarning}>
                        <Ionicons name="warning" size={16} color="#d97706" />
                        <Text style={styles.matchTextWarning}>
                          ⚠️ تنبيه: الدباب مختلف عن المربوط بك ({employee?.motorcycle_number}) — سيتم إرسال إشعار فوري للمشرف!
                        </Text>
                      </View>
                    )
                  ) : null}
                </View>

                {/* Starting Odometer Input */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    قراءة عداد البداية (Start KM) <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="gauge" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="مثال: 15400"
                      placeholderTextColor="#94a3b8"
                      value={startKm}
                      onChangeText={setStartKm}
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>
                </View>

                {/* Notes Input */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>ملاحظات (اختياري)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="أي ملاحظات حول الدباب أو الشفت..."
                    placeholderTextColor="#94a3b8"
                    value={startNotes}
                    onChangeText={setStartNotes}
                    multiline
                    numberOfLines={2}
                    textAlign="right"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, submitting && styles.buttonDisabled]}
                  onPress={handleStartShift}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="play-circle-outline" size={22} color="#ffffff" />
                      <Text style={styles.primaryButtonText}>تأكيد وبدء الشفت</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= VIEW 3: ACTIVE SHIFT SCREEN ================= */}
          {token && activeSession && (
            <View style={styles.spaceGap}>
              {/* Active Timer Card */}
              <View style={[styles.card, styles.activeShiftCard]}>
                <View style={styles.activeBadgeRow}>
                  <View style={styles.livePill}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>الدوام قائم الآن</Text>
                  </View>
                  <Text style={styles.activeShiftEmpName}>{employee?.name}</Text>
                </View>

                {/* Big Timer */}
                <Text style={styles.timerDisplay}>{elapsedTime}</Text>
                <Text style={styles.timerSub}>مدة العمل المنقضية</Text>

                {/* Quick Info Grid */}
                <View style={styles.activeInfoGrid}>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxLabel}>عداد البداية</Text>
                    <Text style={styles.infoBoxVal}>{activeSession.start_km} كم</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxLabel}>رقم الدباب الحالي</Text>
                    <Text style={styles.infoBoxVal}>{activeSession.motorcycle_number || '—'}</Text>
                  </View>
                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxLabel}>وقت البدء</Text>
                    <Text style={styles.infoBoxVal}>
                      {activeSession.start_time ? new Date(activeSession.start_time).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* End Shift Form */}
              <View style={styles.card}>
                <View style={styles.cardTitleRow}>
                  <MaterialCommunityIcons name="stop-circle-outline" size={22} color="#ef4444" />
                  <Text style={styles.cardTitle}>إنهاء وإقفال الدوام</Text>
                </View>

                {/* End Odometer */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    قراءة عداد النهاية (End KM) <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={styles.inputContainer}>
                    <MaterialCommunityIcons name="gauge" size={20} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={`أكبر من ${activeSession.start_km}...`}
                      placeholderTextColor="#94a3b8"
                      value={endKm}
                      onChangeText={setEndKm}
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>
                  {parseFloat(calculatedDistance) > 0 ? (
                    <Text style={styles.distanceText}>
                      المسافة المقطوعة: <Text style={{ fontWeight: 'bold' }}>{calculatedDistance} كم</Text>
                    </Text>
                  ) : null}
                </View>

                {/* Orders Count & Fuel Cost Row */}
                <View style={styles.rowInputs}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>تكلفة الوقود (ر.س)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      placeholderTextColor="#94a3b8"
                      value={fuelCost}
                      onChangeText={setFuelCost}
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={styles.label}>عدد الطلبات المنجزة</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                      value={ordersCount}
                      onChangeText={setOrdersCount}
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>
                </View>

                {/* End Notes */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>ملاحظات الإقفال</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="ملاحظات نهاية الشفت..."
                    placeholderTextColor="#94a3b8"
                    value={endNotes}
                    onChangeText={setEndNotes}
                    multiline
                    numberOfLines={2}
                    textAlign="right"
                  />
                </View>

                <TouchableOpacity
                  style={[styles.dangerButton, submitting && styles.buttonDisabled]}
                  onPress={handleEndShift}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle-outline" size={22} color="#ffffff" />
                      <Text style={styles.dangerButtonText}>تأكيد وإنهاء الشفت</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'right',
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#ef444415',
    borderWidth: 1,
    borderColor: '#ef444430',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 16,
    backgroundColor: '#0f172a',
  },
  spaceGap: {
    gap: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  loginHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#1d4ed820',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1d4ed840',
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 6,
  },
  loginSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  errorBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ef444415',
    borderWidth: 1,
    borderColor: '#ef444440',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  errorBannerText: {
    color: '#ef4444',
    fontSize: 13,
    flex: 1,
    textAlign: 'right',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'right',
  },
  labelHint: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'normal',
  },
  inputContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginLeft: 8,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  quickFillButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginBottom: 16,
    backgroundColor: '#3b82f610',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3b82f630',
  },
  quickFillText: {
    color: '#3b82f6',
    fontSize: 12,
    fontWeight: 'bold',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 6,
  },
  dangerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  profileHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  profileMeta: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'right',
  },
  assignedBikeBanner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1d4ed815',
    borderWidth: 1,
    borderColor: '#1d4ed830',
    borderRadius: 12,
    padding: 12,
  },
  bikeIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1d4ed825',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignedBikeLabel: {
    color: '#94a3b8',
    fontSize: 11,
    textAlign: 'right',
  },
  assignedBikeValue: {
    color: '#60a5fa',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 2,
  },
  cardTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  matchBadgeSuccess: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a15',
    borderWidth: 1,
    borderColor: '#16a34a30',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  matchTextSuccess: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '600',
  },
  matchBadgeWarning: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d9770615',
    borderWidth: 1,
    borderColor: '#d9770630',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  matchTextWarning: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  activeShiftCard: {
    backgroundColor: '#1e1b4b',
    borderColor: '#4338ca',
    alignItems: 'center',
  },
  activeBadgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 16,
  },
  livePill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a25',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  liveText: {
    color: '#4ade80',
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeShiftEmpName: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timerDisplay: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
    marginVertical: 4,
  },
  timerSub: {
    color: '#a5b4fc',
    fontSize: 12,
    marginBottom: 18,
  },
  activeInfoGrid: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
    gap: 8,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#0f172a80',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoBoxLabel: {
    color: '#94a3b8',
    fontSize: 10,
    marginBottom: 4,
  },
  infoBoxVal: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  rowInputs: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  distanceText: {
    color: '#60a5fa',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'right',
  },
});
