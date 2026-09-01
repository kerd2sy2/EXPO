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
  useColorScheme,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SplashScreen from 'expo-splash-screen';
import { workApi, EmployeeProfile, WorkSession } from '../services/work';
import { setAuthToken, getStoredToken } from '../services/api';

const { width } = Dimensions.get('window');

type TabType = 'home' | 'shift' | 'history' | 'profile';
type Language = 'ar' | 'en' | 'bn';

const translations = {
  ar: {
    appName: 'AAMS Logistics',
    appSubtitle: 'بوابة المناديب الميدانية',
    loginTitle: 'تسجيل الدخول',
    loginSubtitle: 'أدخل رقم الهوية الوطنية لتسجيل الدخول ومباشرة دوامك',
    nationalIdLabel: 'رقم الهوية أو البريد',
    nationalIdPlaceholder: 'مثال: 2569600022',
    passwordLabel: 'كلمة المرور (اختياري)',
    passwordPlaceholder: 'آخر 6 أرقام من الهوية افتراضياً',
    passwordHint: '💡 كلمة المرور الافتراضية هي آخر 6 أرقام من رقم الهوية',
    loginBtn: 'دخول البوابة',
    demoLoginBtn: '⚡ تجربة سريعة: دلوار اوسين شيبون (2569600022)',
    readyToStart: 'جاهز لبدء الشفت 🚀',
    shiftActive: 'شفت العمل قائم الآن 🟢',
    startShiftNow: 'بدء دوام جديد الآن 🚀',
    endShiftNow: 'إنهاء الشفت وتسجيل العداد 🏁',
    shiftInProgressOn: 'الدوام جاري على دباب',
    startKmLabel: 'عداد البداية',
    endKmLabel: 'عداد النهاية',
    durationLabel: 'مدة العمل',
    notStartedToday: 'لم تسجل بدء العمل اليوم بعد',
    assignedBike: 'الدباب المربوط',
    branch: 'الفرع',
    myAchievements: 'ملخص إنجازاتي',
    totalShifts: 'الشفتات المسجلة',
    totalDistance: 'إجمالي المسافة',
    approvedOrders: 'الطلبات المعتمدة',
    quickAccess: 'الوصول السريع',
    quickShiftTitle: 'بدء أو إقفال شفت العمل',
    quickShiftSub: 'تسجيل قراءات العدادات والتقاط الصور',
    quickHistoryTitle: 'سجل الشفتات والتصديقات',
    quickHistorySub: 'متابعة حالة اعتماد المشرف للطلبات',
    startShiftTitle: 'بدء شفت عمل جديد',
    startShiftSub: 'تأكد من رقم الدباب وقراءة عداد البداية والتقط صورة واضحة',
    actualBikeNumber: 'رقم الدباب الفعلي الذي ستقوده',
    actualBikePlaceholder: 'اكتب رقم الدباب...',
    bikeMatchingSuccess: 'مطابق للدباب المربوط بك بالنظام ✅',
    bikeMismatchWarning: '⚠️ تنبيه: الدباب مختلف عن المربوط بك — سيتم إرسال إشعار للمشرف!',
    startKmInputLabel: 'قراءة عداد البداية (Start KM)',
    startKmPlaceholder: 'مثال: 15400',
    autoKmFetched: 'تم جلب عداد نهاية الشفت السابق لهذا الدباب تلقائياً',
    startKmPhotoLabel: 'صورة عداد البداية (مطلوبة للتدقيق)',
    captureCamera: 'التقاط بالكاميرا 📸',
    pickGallery: 'من المعرض 🖼️',
    photoCapturedSuccess: 'تم التقاط صورة العداد',
    startNotesLabel: 'ملاحظات البداية (اختياري)',
    startNotesPlaceholder: 'أي ملاحظات حول حالة الدباب قبل الانطلاق...',
    confirmStartBtn: 'تأكيد وبدء الدوام الآن 🚀',
    endShiftTitle: 'إنهاء شفت العمل',
    endShiftSub: 'أدخل قراءة عداد النهاية وصورته وعدد الطلبات المنجزة',
    endKmInputLabel: 'قراءة عداد النهاية (End KM)',
    calculatedDistLabel: 'المسافة المقطوعة المحسوبة',
    endKmPhotoLabel: 'صورة عداد النهاية (مطلوبة للإقفال)',
    ordersCountLabel: 'عدد الطلبات المنجزة',
    ordersCountPlaceholder: 'مثال: 15',
    fuelCostLabel: 'تكلفة الوقود (ر.س)',
    fuelCostPlaceholder: '0.00',
    endNotesLabel: 'ملاحظات إنهاء الشفت (اختياري)',
    endNotesPlaceholder: 'أي ملاحظات حول الطلبات أو الدباب...',
    confirmEndBtn: 'إنهاء الشفت وإرسال البيانات 🏁',
    historyTitle: 'سجل الشفتات والاعتمادات',
    noHistory: 'لا توجد شفتات سابقة مسجلة',
    reviewedBadge: 'مصادق عليه ✅',
    pendingBadge: 'بانتظار المشرف ⏳',
    editedBySupervisor: 'تم تدقيق وتعديل البيانات بواسطة المشرف',
    profileTitle: 'الملف الشخصي',
    jobRole: 'مندوب توصيل معتمد',
    nationalId: 'رقم الهوية الوطنية',
    keyNumber: 'رقم المفتاح',
    appSettings: 'إعدادات التطبيق',
    language: 'لغة التطبيق',
    logout: 'تسجيل الخروج من الحساب',
    tabHome: 'الرئيسية',
    tabShift: 'الدوام',
    tabHistory: 'سجل الشفتات',
    tabProfile: 'حسابي',
    km: 'كم',
    sar: 'ر.س',
    delegate: 'المندوب',
    idAbbr: 'هوية',
    keyAbbr: 'مفتاح',
    selectLang: 'اختر لغة التطبيق',
  },
  en: {
    appName: 'AAMS Logistics',
    appSubtitle: 'Field Delegate Portal',
    loginTitle: 'Sign In',
    loginSubtitle: 'Enter your National ID to sign in and start your shift',
    nationalIdLabel: 'National ID or Email',
    nationalIdPlaceholder: 'e.g. 2569600022',
    passwordLabel: 'Password (Optional)',
    passwordPlaceholder: 'Last 6 digits of ID by default',
    passwordHint: '💡 Default password is the last 6 digits of your National ID',
    loginBtn: 'Sign In',
    demoLoginBtn: '⚡ Quick Demo: Delwar Hossain (2569600022)',
    readyToStart: 'Ready to start shift 🚀',
    shiftActive: 'Shift in progress 🟢',
    startShiftNow: 'Start New Shift Now 🚀',
    endShiftNow: 'End Shift & Record Odometer 🏁',
    shiftInProgressOn: 'Shift in progress on bike',
    startKmLabel: 'Start KM',
    endKmLabel: 'End KM',
    durationLabel: 'Duration',
    notStartedToday: 'Shift has not started yet today',
    assignedBike: 'Assigned Bike',
    branch: 'Branch',
    myAchievements: 'My Performance Summary',
    totalShifts: 'Total Shifts',
    totalDistance: 'Total Distance',
    approvedOrders: 'Approved Orders',
    quickAccess: 'Quick Access',
    quickShiftTitle: 'Start or End Shift',
    quickShiftSub: 'Record odometer readings & take photos',
    quickHistoryTitle: 'Shift History & Approvals',
    quickHistorySub: 'Track supervisor review and order approvals',
    startShiftTitle: 'Start New Shift',
    startShiftSub: 'Verify bike plate, enter start KM, and take odometer photo',
    actualBikeNumber: 'Actual Bike Plate you are riding',
    actualBikePlaceholder: 'Enter bike plate...',
    bikeMatchingSuccess: 'Matches assigned motorcycle in system ✅',
    bikeMismatchWarning: '⚠️ Warning: Bike is different from assigned! Supervisor will be notified.',
    startKmInputLabel: 'Start Odometer (Start KM)',
    startKmPlaceholder: 'e.g. 15400',
    autoKmFetched: 'Previous end odometer auto-filled for this bike',
    startKmPhotoLabel: 'Start Odometer Photo (Required)',
    captureCamera: 'Take Photo 📸',
    pickGallery: 'From Gallery 🖼️',
    photoCapturedSuccess: 'Odometer photo captured',
    startNotesLabel: 'Start Notes (Optional)',
    startNotesPlaceholder: 'Any notes regarding bike condition...',
    confirmStartBtn: 'Confirm & Start Shift 🚀',
    endShiftTitle: 'End Work Shift',
    endShiftSub: 'Enter end odometer, photo, and completed orders count',
    endKmInputLabel: 'End Odometer (End KM)',
    calculatedDistLabel: 'Calculated Distance',
    endKmPhotoLabel: 'End Odometer Photo (Required)',
    ordersCountLabel: 'Delivered Orders Count',
    ordersCountPlaceholder: 'e.g. 15',
    fuelCostLabel: 'Fuel Cost (SAR)',
    fuelCostPlaceholder: '0.00',
    endNotesLabel: 'End Shift Notes (Optional)',
    endNotesPlaceholder: 'Any notes regarding shift or orders...',
    confirmEndBtn: 'End Shift & Submit Data 🏁',
    historyTitle: 'Shift History & Approvals',
    noHistory: 'No previous shifts recorded',
    reviewedBadge: 'Approved ✅',
    pendingBadge: 'Pending Review ⏳',
    editedBySupervisor: 'Values were audited & adjusted by supervisor',
    profileTitle: 'My Profile',
    jobRole: 'Certified Delivery Delegate',
    nationalId: 'National ID',
    keyNumber: 'Key Number',
    appSettings: 'App Settings',
    language: 'App Language',
    logout: 'Log Out',
    tabHome: 'Home',
    tabShift: 'Shift',
    tabHistory: 'History',
    tabProfile: 'Profile',
    km: 'KM',
    sar: 'SAR',
    delegate: 'Delegate',
    idAbbr: 'ID',
    keyAbbr: 'Key',
    selectLang: 'Select Language',
  },
  bn: {
    appName: 'AAMS লজিস্টিকস',
    appSubtitle: 'ফিল্ড ডেলিভারি পোর্টাল',
    loginTitle: 'লগইন করুন',
    loginSubtitle: 'আপনার শিফট শুরু করতে জাতীয় পরিচয়পত্র নম্বর দিন',
    nationalIdLabel: 'আইডি নম্বর বা ইমেইল',
    nationalIdPlaceholder: 'যেমন: 2569600022',
    passwordLabel: 'পাসওয়ার্ড (ঐচ্ছিক)',
    passwordPlaceholder: 'আইডির শেষ ৬ ডিজিট ডিফল্ট',
    passwordHint: '💡 ডিফল্ট পাসওয়ার্ড হল আপনার আইডি নম্বরের শেষ ৬ ডিজিট',
    loginBtn: 'প্রবেশ করুন',
    demoLoginBtn: '⚡ ডেমো লগইন: দেলোয়ার হোসেন (2569600022)',
    readyToStart: 'শিফট শুরু করতে প্রস্তুত 🚀',
    shiftActive: 'শিফট বর্তমানে চলছে 🟢',
    startShiftNow: 'নতুন শিফট শুরু করুন 🚀',
    endShiftNow: 'শিফট শেষ ও মিটার জমা দিন 🏁',
    shiftInProgressOn: 'বাইকে কাজ চলছে',
    startKmLabel: 'শুরুর মিটার',
    endKmLabel: 'শেষের মিটার',
    durationLabel: 'কাজের সময়',
    notStartedToday: 'আজ এখনও শিফট শুরু করা হয়নি',
    assignedBike: 'নির্ধারিত বাইক',
    branch: 'শাখা',
    myAchievements: 'আমার কাজের সারাংশ',
    totalShifts: 'মোট শিফট',
    totalDistance: 'মোট দূরত্ব',
    approvedOrders: 'অনুমোদিত অর্ডার',
    quickAccess: 'দ্রুত অ্যাক্সেস',
    quickShiftTitle: 'শিফট শুরু বা শেষ করুন',
    quickShiftSub: 'মিটার রিডিং রেকর্ড এবং ছবি তুলুন',
    quickHistoryTitle: 'শিফট ইতিহাস ও অনুমোদন',
    quickHistorySub: 'সুপারভাইজার অনুমোদন ট্র্যাক করুন',
    startShiftTitle: 'নতুন শিফট শুরু',
    startShiftSub: 'বাইকের নম্বর এবং শুরুর মিটার নিশ্চিত করে ছবি তুলুন',
    actualBikeNumber: 'আপনি যে বাইকটি চালাচ্ছেন তার নম্বর',
    actualBikePlaceholder: 'বাইক নম্বর লিখুন...',
    bikeMatchingSuccess: 'সিস্টেমে নির্ধারিত বাইকের সাথে মিলেছে ✅',
    bikeMismatchWarning: '⚠️ সতর্কতা: নির্ধারিত বাইকের সাথে মিলেনি! সুপারভাইজারকে জানানো হবে।',
    startKmInputLabel: 'শুরুর মিটার রিডিং (Start KM)',
    startKmPlaceholder: 'যেমন: 15400',
    autoKmFetched: 'এই বাইকের পূর্ববর্তী শেষ মিটার স্বয়ংক্রিয়ভাবে যুক্ত হয়েছে',
    startKmPhotoLabel: 'শুরুর মিটারের ছবি (বাধ্যতামূলক)',
    captureCamera: 'ক্যামেরা দিয়ে ছবি 📸',
    pickGallery: 'গ্যালারি থেকে 🖼️',
    photoCapturedSuccess: 'মিটারের ছবি তোলা হয়েছে',
    startNotesLabel: 'শুরুর মন্তব্য (ঐচ্ছিক)',
    startNotesPlaceholder: 'বাইক সম্পর্কিত কোনো মন্তব্য...',
    confirmStartBtn: 'নিশ্চিত ও শুরু করুন 🚀',
    endShiftTitle: 'শিফট সমাপ্তি',
    endShiftSub: 'শেষের মিটার, ছবি এবং অর্ডারের সংখ্যা দিন',
    endKmInputLabel: 'শেষের মিটার রিডিং (End KM)',
    calculatedDistLabel: 'মোট অতিক্রান্ত দূরত্ব',
    endKmPhotoLabel: 'শেষের মিটারের ছবি (বাধ্যতামূলক)',
    ordersCountLabel: 'সম্পন্ন অর্ডারের সংখ্যা',
    ordersCountPlaceholder: 'যেমন: 15',
    fuelCostLabel: 'জ্বালানি খরচ (SAR)',
    fuelCostPlaceholder: '0.00',
    endNotesLabel: 'সমাপ্তির মন্তব্য (ঐচ্ছিক)',
    endNotesPlaceholder: 'অর্ডার বা বাইক সম্পর্কে মন্তব্য...',
    confirmEndBtn: 'শিফট শেষ ও জমা দিন 🏁',
    historyTitle: 'শিফট ইতিহাস ও অনুমোদন',
    noHistory: 'কোনো পূর্ববর্তী শিফট পাওয়া যায়নি',
    reviewedBadge: 'অনুমোদিত ✅',
    pendingBadge: 'অপেক্ষমাণ ⏳',
    editedBySupervisor: 'সুপারভাইজার দ্বারা সংশোধিত হয়েছে',
    profileTitle: 'প্রোফাইল',
    jobRole: 'অনুমোদিত ডেলিভারি প্রতিনিধি',
    nationalId: 'জাতীয় পরিচয়পত্র',
    keyNumber: 'চাবি নম্বর',
    appSettings: 'অ্যাপ সেটিংস',
    language: 'ভাষা পরিবর্তন',
    logout: 'লগআউট',
    tabHome: 'হোম',
    tabShift: 'শিফট',
    tabHistory: 'ইতিহাস',
    tabProfile: 'প্রোফাইল',
    km: 'কিমি',
    sar: 'রিয়াল',
    delegate: 'প্রতিনিধি',
    idAbbr: 'আইডি',
    keyAbbr: 'চাবি',
    selectLang: 'ভাষা নির্বাচন করুন',
  }
};

export default function DelegateApp() {
  // System Theme Hook (Automatic Phone Default)
  const systemColorScheme = useColorScheme();
  const isDarkMode = systemColorScheme === 'dark';

  // Language State (Default: Arabic 'ar')
  const [lang, setLang] = useState<Language>('ar');
  const [showLangModal, setShowLangModal] = useState(false);
  const t = translations[lang];
  const isRTL = lang === 'ar';

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

  const handleLogin = async (overrideLogin?: string, overridePass?: string) => {
    const inputVal = overrideLogin || loginInput;
    const passVal = overridePass || passwordInput;

    if (!inputVal.trim()) {
      setLoginError(t.nationalIdPlaceholder);
      return;
    }

    setSubmitting(true);
    setLoginError('');

    try {
      const res = await workApi.login(inputVal.trim(), passVal.trim() || undefined);
      setToken(res.access_token);

      const empData: EmployeeProfile = res.employee || {
        id: res.admin?.id || '',
        name: res.admin?.name || '',
        national_id: inputVal.split('@')[0],
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

  const fillDelwarDemo = () => {
    setLoginInput('2569600022');
    setPasswordInput('9600022');
    handleLogin('2569600022', '9600022');
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
          Alert.alert('Permission required', 'Please grant camera permissions to take odometer photo');
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
          Alert.alert('Permission required', 'Please grant gallery permissions to select odometer photo');
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
      Alert.alert('Error', 'Image picker error: ' + (err.message || ''));
    }
  };

  const handleStartShift = async () => {
    if (!employee) return;

    if (!enteredMotorcycle.trim()) {
      Alert.alert('تنبيه', t.actualBikePlaceholder);
      return;
    }

    const kmNum = parseFloat(startKm);
    if (isNaN(kmNum) || kmNum <= 0) {
      Alert.alert('تنبيه', t.startKmPlaceholder);
      return;
    }

    if (!startKmImage) {
      Alert.alert('📸', t.startKmPhotoLabel);
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
      Alert.alert('OK 🚀', t.shiftActive);
      loadHistory();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error starting shift');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndShift = async () => {
    if (!employee || !activeSession) return;

    const endKmNum = parseFloat(endKm);
    if (isNaN(endKmNum) || endKmNum <= activeSession.start_km) {
      Alert.alert(
        'Odometer Error',
        `End KM (${endKmNum || 0}) must be greater than Start KM (${activeSession.start_km})`
      );
      return;
    }

    if (!endKmImage) {
      Alert.alert('📸', t.endKmPhotoLabel);
      return;
    }

    const orders = parseInt(ordersCount, 10);
    if (isNaN(orders) || orders < 0) {
      Alert.alert('تنبيه', t.ordersCountPlaceholder);
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
      Alert.alert('🏁', t.endShiftTitle);
      loadHistory();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Error ending shift');
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
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
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
            {/* Language Switcher Button Top */}
            <View style={styles.topBarActions}>
              <TouchableOpacity
                style={[styles.langSwitchBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setShowLangModal(true)}
              >
                <Ionicons name="globe-outline" size={16} color={colors.primary} />
                <Text style={[styles.langSwitchText, { color: colors.textPrimary }]}>
                  {lang === 'ar' ? 'العربية 🇸🇦' : lang === 'en' ? 'English 🇺🇸' : 'বাংলা 🇧🇩'}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* App Logo & Header */}
            <View style={styles.loginHeader}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <Text style={[styles.appTitle, { color: colors.textPrimary }]}>{t.appName}</Text>
              <Text style={[styles.appSubtitle, { color: colors.textSecondary }]}>{t.appSubtitle}</Text>
            </View>

            {/* Login Card */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.loginCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.loginTitle}
              </Text>
              <Text style={[styles.loginCardSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.loginSubtitle}
              </Text>

              {loginError ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.errorBg }]}>
                  <Ionicons name="alert-circle" size={18} color={colors.errorText} />
                  <Text style={[styles.errorBannerText, { color: colors.errorText, textAlign: isRTL ? 'right' : 'left' }]}>
                    {loginError}
                  </Text>
                </View>
              ) : null}

              {/* National ID Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.nationalIdLabel}
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <Feather name="user" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={t.nationalIdPlaceholder}
                    placeholderTextColor="#94a3b8"
                    value={loginInput}
                    onChangeText={setLoginInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.passwordLabel}
                </Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.inputIcon}>
                    <Feather name={showPassword ? 'eye' : 'eye-off'} size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={t.passwordPlaceholder}
                    placeholderTextColor="#94a3b8"
                    value={passwordInput}
                    onChangeText={setPasswordInput}
                    secureTextEntry={!showPassword}
                  />
                </View>
                <Text style={[styles.hintText, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.passwordHint}
                </Text>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={() => handleLogin()}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={styles.buttonContentRow}>
                    <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>{t.loginBtn}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* ⚡ Quick Demo Test Button */}
              <TouchableOpacity
                style={[styles.demoButton, { backgroundColor: colors.accentLight, borderColor: colors.accent }]}
                onPress={fillDelwarDemo}
                disabled={submitting}
              >
                <Ionicons name="flash" size={16} color={colors.accent} />
                <Text style={[styles.demoButtonText, { color: colors.accent }]}>
                  {t.demoLoginBtn}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Language Modal */}
        {showLangModal && (
          <View style={styles.modalBackdrop}>
            <View style={[styles.langModalCard, { backgroundColor: colors.card }]}>
              <Text style={[styles.langModalTitle, { color: colors.textPrimary }]}>{t.selectLang}</Text>

              <TouchableOpacity
                style={[styles.langOptionRow, lang === 'ar' && { backgroundColor: colors.primaryLight }]}
                onPress={() => {
                  setLang('ar');
                  setShowLangModal(false);
                }}
              >
                <Text style={styles.langFlag}>🇸🇦</Text>
                <Text style={[styles.langOptionText, { color: colors.textPrimary }]}>العربية (Arabic)</Text>
                {lang === 'ar' && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.langOptionRow, lang === 'en' && { backgroundColor: colors.primaryLight }]}
                onPress={() => {
                  setLang('en');
                  setShowLangModal(false);
                }}
              >
                <Text style={styles.langFlag}>🇺🇸</Text>
                <Text style={[styles.langOptionText, { color: colors.textPrimary }]}>English</Text>
                {lang === 'en' && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.langOptionRow, lang === 'bn' && { backgroundColor: colors.primaryLight }]}
                onPress={() => {
                  setLang('bn');
                  setShowLangModal(false);
                }}
              >
                <Text style={styles.langFlag}>🇧🇩</Text>
                <Text style={[styles.langOptionText, { color: colors.textPrimary }]}>বাংলা (Bengali)</Text>
                {lang === 'bn' && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.cancelModalBtn, { backgroundColor: colors.inputBg }]}
                onPress={() => setShowLangModal(false)}
              >
                <Text style={[styles.cancelModalText, { color: colors.textSecondary }]}>إلغاء / Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
      <View style={[styles.headerBar, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarText, { color: colors.primaryText }]}>
              {employee.name ? employee.name.charAt(0) : 'D'}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.delegateName, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={1}>
              {employee.name || t.delegate}
            </Text>
            <View style={[styles.headerBadgesRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.pillBadge, { backgroundColor: colors.accentLight }]}>
                <Text style={[styles.pillBadgeText, { color: colors.accent }]}>
                  {t.idAbbr}: {employee.national_id}
                </Text>
              </View>
              {employee.key_number ? (
                <View style={[styles.pillBadge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.pillBadgeText, { color: colors.primaryText }]}>
                    {t.keyAbbr}: {employee.key_number}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.headerLeftActions}>
          <TouchableOpacity
            style={[styles.langSmallBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
            onPress={() => setShowLangModal(true)}
          >
            <Ionicons name="globe-outline" size={14} color={colors.primary} />
            <Text style={[styles.langSmallText, { color: colors.textPrimary }]}>
              {lang.toUpperCase()}
            </Text>
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
              <View style={[styles.heroCardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View
                  style={[
                    styles.statusPill,
                    activeSession ? { backgroundColor: '#10b981' } : { backgroundColor: '#64748b' },
                    { flexDirection: isRTL ? 'row-reverse' : 'row' },
                  ]}
                >
                  <View style={styles.pulsingDot} />
                  <Text style={styles.statusPillText}>
                    {activeSession ? t.shiftActive : t.readyToStart}
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
                  <Text style={[styles.heroHeading, { color: isDarkMode ? '#ffffff' : '#065f46', textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.shiftInProgressOn} [{activeSession.motorcycle_number}]
                  </Text>
                  <Text style={[styles.heroSub, { color: isDarkMode ? '#a7f3d0' : '#047857', textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.startKmLabel}: {activeSession.start_km} {t.km}
                  </Text>
                  <TouchableOpacity
                    style={[styles.heroActionButton, { backgroundColor: '#dc2626' }]}
                    onPress={() => setCurrentTab('shift')}
                  >
                    <Ionicons name="stop-circle" size={20} color="#ffffff" />
                    <Text style={styles.heroActionButtonText}>{t.endShiftNow}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.heroInactiveDetails}>
                  <Text style={[styles.heroHeading, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.notStartedToday}
                  </Text>
                  <Text style={[styles.heroSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.assignedBike}: {employee.motorcycle_number || '—'} | {t.branch}: {employee.branch_name || '—'}
                  </Text>
                  <TouchableOpacity
                    style={[styles.heroActionButton, { backgroundColor: colors.primary }]}
                    onPress={() => setCurrentTab('shift')}
                  >
                    <Ionicons name="play-circle" size={20} color="#ffffff" />
                    <Text style={styles.heroActionButtonText}>{t.startShiftNow}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Quick KPI Stats */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.myAchievements}
              </Text>
            </View>

            <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <MaterialCommunityIcons name="bike" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {employee.motorcycle_number || '—'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.assignedBike}</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.accentLight }]}>
                  <MaterialCommunityIcons name="calendar-check" size={22} color={colors.accent} />
                </View>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{historySessions.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.totalShifts}</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <MaterialCommunityIcons name="map-marker-distance" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {historySessions.reduce((sum, s) => sum + (s.distance || 0), 0).toFixed(0)} {t.km}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.totalDistance}</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.accentLight }]}>
                  <MaterialCommunityIcons name="package-variant-closed" size={22} color={colors.accent} />
                </View>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {historySessions.filter((s) => s.is_reviewed).reduce((sum, s) => sum + (s.orders_count || 0), 0)}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.approvedOrders}</Text>
              </View>
            </View>

            {/* Quick Navigation Cards */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.quickAccess}
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.quickCardRow, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => setCurrentTab('shift')}
            >
              <View style={[styles.quickCardIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="speedometer-outline" size={24} color={colors.primary} />
              </View>
              <View style={styles.quickCardTextCol}>
                <Text style={[styles.quickCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.quickShiftTitle}
                </Text>
                <Text style={[styles.quickCardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.quickShiftSub}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickCardRow, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => setCurrentTab('history')}
            >
              <View style={[styles.quickCardIconCircle, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="time-outline" size={24} color={colors.accent} />
              </View>
              <View style={styles.quickCardTextCol}>
                <Text style={[styles.quickCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.quickHistoryTitle}
                </Text>
                <Text style={[styles.quickCardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {t.quickHistorySub}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* ----------------- TAB 2: SHIFT ACTIONS (الدوام) ----------------- */}
        {currentTab === 'shift' && (
          <View style={styles.tabContainer}>
            {!activeSession ? (
              /* START SHIFT FORM */
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.cardHeaderIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="play" size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t.startShiftTitle}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t.startShiftSub}
                    </Text>
                  </View>
                </View>

                {/* Motorcycle Field */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.actualBikeNumber} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <MaterialCommunityIcons name="numeric" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                      placeholder={t.actualBikePlaceholder}
                      placeholderTextColor="#94a3b8"
                      value={enteredMotorcycle}
                      onChangeText={setEnteredMotorcycle}
                    />
                  </View>

                  {/* Matching Indicator */}
                  {enteredMotorcycle.trim() ? (
                    isMotorcycleMatching ? (
                      <View style={[styles.matchBadgeSuccess, { backgroundColor: colors.primaryLight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                        <Text style={[styles.matchTextSuccess, { color: colors.primaryText }]}>
                          {t.bikeMatchingSuccess}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.matchBadgeWarning, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="warning" size={16} color={colors.warningText} />
                        <Text style={[styles.matchTextWarning, { color: colors.warningText, textAlign: isRTL ? 'right' : 'left' }]}>
                          {t.bikeMismatchWarning}
                        </Text>
                      </View>
                    )
                  ) : null}
                </View>

                {/* Starting Odometer Input */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.startKmInputLabel} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <MaterialCommunityIcons name="gauge" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                      placeholder={t.startKmPlaceholder}
                      placeholderTextColor="#94a3b8"
                      value={startKm}
                      onChangeText={(val) => {
                        setStartKm(val);
                        setAutoFilledKm(null);
                      }}
                      keyboardType="numeric"
                    />
                  </View>
                  {autoFilledKm !== null && (
                    <View style={[styles.matchBadgeSuccess, { backgroundColor: colors.primaryLight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="sparkles" size={14} color={colors.primary} />
                      <Text style={[styles.matchTextSuccess, { color: colors.primaryText }]}>
                        {t.autoKmFetched} ({autoFilledKm} {t.km}) 🛵
                      </Text>
                    </View>
                  )}
                </View>

                {/* Start Odometer Photo Capture */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.startKmPhotoLabel} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>

                  {startKmImage ? (
                    <View style={[styles.imagePreviewContainer, { borderColor: colors.border }]}>
                      <Image source={{ uri: startKmImage }} style={styles.imagePreview} />
                      <View style={[styles.imageOverlayBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                        <Text style={styles.imageOverlayText}>{t.photoCapturedSuccess}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => setStartKmImage(null)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.photoPickerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity
                        style={[styles.photoButton, { backgroundColor: colors.primaryLight, borderColor: colors.primary, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        onPress={() => pickOdometerImage('camera', 'start')}
                      >
                        <Ionicons name="camera" size={22} color={colors.primary} />
                        <Text style={[styles.photoButtonText, { color: colors.primaryText }]}>{t.captureCamera}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.photoButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        onPress={() => pickOdometerImage('gallery', 'start')}
                      >
                        <Ionicons name="images-outline" size={22} color={colors.textSecondary} />
                        <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>{t.pickGallery}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Start Notes */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.startNotesLabel}
                  </Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={t.startNotesPlaceholder}
                    placeholderTextColor="#94a3b8"
                    value={startNotes}
                    onChangeText={setStartNotes}
                    multiline
                    numberOfLines={2}
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
                    <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="play-circle-outline" size={22} color="#ffffff" />
                      <Text style={styles.primaryButtonText}>{t.confirmStartBtn}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* END SHIFT FORM */
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.cardHeaderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.cardHeaderIcon, { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="stop" size={20} color="#ef4444" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t.endShiftTitle}
                    </Text>
                    <Text style={[styles.cardSubtitle, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t.endShiftSub}
                    </Text>
                  </View>
                </View>

                {/* Active Session Info Box */}
                <View style={[styles.activeShiftSummaryBox, { backgroundColor: colors.bg, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t.startKmLabel}</Text>
                    <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{activeSession.start_km} {t.km}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t.assignedBike}</Text>
                    <Text style={[styles.summaryVal, { color: colors.textPrimary }]}>{activeSession.motorcycle_number}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryItem}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{t.durationLabel}</Text>
                    <Text style={[styles.summaryVal, { color: colors.primary }]}>{elapsedTime}</Text>
                  </View>
                </View>

                {/* Ending Odometer Input */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.endKmInputLabel} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>
                  <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                    <MaterialCommunityIcons name="gauge" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                      placeholder={`> ${activeSession.start_km}`}
                      placeholderTextColor="#94a3b8"
                      value={endKm}
                      onChangeText={setEndKm}
                      keyboardType="numeric"
                    />
                  </View>

                  {Number(calculatedDistance) > 0 && (
                    <View style={[styles.matchBadgeSuccess, { backgroundColor: colors.accentLight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="speedometer" size={14} color={colors.accent} />
                      <Text style={[styles.matchTextSuccess, { color: colors.accent }]}>
                        {t.calculatedDistLabel}: {calculatedDistance} {t.km} 🛵
                      </Text>
                    </View>
                  )}
                </View>

                {/* End Odometer Photo Capture */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.endKmPhotoLabel} <Text style={{ color: '#ef4444' }}>*</Text>
                  </Text>

                  {endKmImage ? (
                    <View style={[styles.imagePreviewContainer, { borderColor: colors.border }]}>
                      <Image source={{ uri: endKmImage }} style={styles.imagePreview} />
                      <View style={[styles.imageOverlayBadge, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                        <Text style={styles.imageOverlayText}>{t.photoCapturedSuccess}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeImageBtn}
                        onPress={() => setEndKmImage(null)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.photoPickerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <TouchableOpacity
                        style={[styles.photoButton, { backgroundColor: '#fef2f2', borderColor: '#ef4444', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        onPress={() => pickOdometerImage('camera', 'end')}
                      >
                        <Ionicons name="camera" size={22} color="#dc2626" />
                        <Text style={[styles.photoButtonText, { color: '#dc2626' }]}>{t.captureCamera}</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.photoButton, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        onPress={() => pickOdometerImage('gallery', 'end')}
                      >
                        <Ionicons name="images-outline" size={22} color={colors.textSecondary} />
                        <Text style={[styles.photoButtonText, { color: colors.textSecondary }]}>{t.pickGallery}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Orders Count & Fuel Cost Grid */}
                <View style={[styles.twoColRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t.ordersCountLabel} <Text style={{ color: '#ef4444' }}>*</Text>
                    </Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                      <Feather name="package" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                        placeholder={t.ordersCountPlaceholder}
                        placeholderTextColor="#94a3b8"
                        value={ordersCount}
                        onChangeText={setOrdersCount}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={[styles.formGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                      {t.fuelCostLabel}
                    </Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                      <MaterialCommunityIcons name="gas-station" size={18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                        placeholder={t.fuelCostPlaceholder}
                        placeholderTextColor="#94a3b8"
                        value={fuelCost}
                        onChangeText={setFuelCost}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>

                {/* End Notes */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                    {t.endNotesLabel}
                  </Text>
                  <TextInput
                    style={[styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}
                    placeholder={t.endNotesPlaceholder}
                    placeholderTextColor="#94a3b8"
                    value={endNotes}
                    onChangeText={setEndNotes}
                    multiline
                    numberOfLines={2}
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
                    <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Ionicons name="checkmark-done-circle-outline" size={22} color="#ffffff" />
                      <Text style={styles.primaryButtonText}>{t.confirmEndBtn}</Text>
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
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.historyTitle}
              </Text>
              <Text style={[styles.sectionSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {historySessions.length} {t.totalShifts}
              </Text>
            </View>

            {historySessions.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="document-text-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyBoxText, { color: colors.textSecondary }]}>{t.noHistory}</Text>
              </View>
            ) : (
              historySessions.map((s) => (
                <View key={s.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.historyCardTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View>
                      <Text style={[styles.historyDate, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {new Date(s.start_time).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US')}{' '}
                        {new Date(s.start_time).toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <Text style={[styles.historyBike, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                        {t.assignedBike}: {s.motorcycle_number || '—'}
                      </Text>
                    </View>

                    {s.is_reviewed ? (
                      <View style={[styles.badgeReviewed, { backgroundColor: colors.primaryLight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                        <Text style={[styles.badgeReviewedText, { color: colors.primaryText }]}>{t.reviewedBadge}</Text>
                      </View>
                    ) : (
                      <View style={[styles.badgePending, { backgroundColor: colors.warningBg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                        <Ionicons name="time" size={14} color={colors.warningText} />
                        <Text style={[styles.badgePendingText, { color: colors.warningText }]}>{t.pendingBadge}</Text>
                      </View>
                    )}
                  </View>

                  {/* Stats Row */}
                  <View style={[styles.historyStatsRow, { backgroundColor: colors.bg, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <View style={styles.historyStatCol}>
                      <Text style={[styles.historyStatVal, { color: colors.primary }]}>{s.distance ? s.distance.toFixed(1) : 0} {t.km}</Text>
                      <Text style={[styles.historyStatLbl, { color: colors.textSecondary }]}>{t.totalDistance}</Text>
                    </View>
                    <View style={styles.historyStatCol}>
                      <Text style={[styles.historyStatVal, { color: colors.textPrimary }]}>{s.orders_count || 0}</Text>
                      <Text style={[styles.historyStatLbl, { color: colors.textSecondary }]}>{t.approvedOrders}</Text>
                    </View>
                    <View style={styles.historyStatCol}>
                      <Text style={[styles.historyStatVal, { color: colors.textPrimary }]}>{s.fuel_cost || 0} {t.sar}</Text>
                      <Text style={[styles.historyStatLbl, { color: colors.textSecondary }]}>{t.fuelCostLabel}</Text>
                    </View>
                  </View>

                  {/* Photos Row */}
                  <View style={[styles.historyPhotosRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {s.start_km_image ? (
                      <TouchableOpacity
                        style={[styles.historyPhotoThumb, { borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        onPress={() => setPreviewPhoto({ url: s.start_km_image!, title: `${t.startKmLabel} (${s.start_km} ${t.km})` })}
                      >
                        <Image source={{ uri: s.start_km_image }} style={styles.thumbImg} />
                        <Text style={[styles.thumbLbl, { color: colors.textSecondary }]}>{t.startKmLabel}: {s.start_km}</Text>
                      </TouchableOpacity>
                    ) : null}

                    {s.end_km_image ? (
                      <TouchableOpacity
                        style={[styles.historyPhotoThumb, { borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                        onPress={() => setPreviewPhoto({ url: s.end_km_image!, title: `${t.endKmLabel} (${s.end_km} ${t.km})` })}
                      >
                        <Image source={{ uri: s.end_km_image }} style={styles.thumbImg} />
                        <Text style={[styles.thumbLbl, { color: colors.textSecondary }]}>{t.endKmLabel}: {s.end_km}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Supervisor Edit Notice */}
                  {s.is_edited_by_supervisor && (
                    <View style={[styles.editedNoticeBox, { backgroundColor: colors.accentLight, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Feather name="edit-2" size={12} color={colors.accent} />
                      <Text style={[styles.editedNoticeText, { color: colors.accent }]}>
                        {t.editedBySupervisor} ({s.edited_by_name || 'Supervisor'})
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
                  {employee.name ? employee.name.charAt(0) : 'D'}
                </Text>
              </View>

              <Text style={[styles.profileName, { color: colors.textPrimary }]}>{employee.name}</Text>
              <Text style={[styles.profileJob, { color: colors.textSecondary }]}>{t.jobRole}</Text>

              <View style={styles.profileDivider} />

              <View style={styles.profileInfoList}>
                <View style={[styles.profileInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>{t.nationalId}</Text>
                  <Text style={[styles.profileInfoValue, { color: colors.textPrimary }]}>{employee.national_id}</Text>
                </View>

                <View style={[styles.profileInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>{t.keyNumber}</Text>
                  <Text style={[styles.profileInfoValue, { color: colors.textPrimary }]}>{employee.key_number || '—'}</Text>
                </View>

                <View style={[styles.profileInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>{t.assignedBike}</Text>
                  <Text style={[styles.profileInfoValue, { color: colors.primary }]}>{employee.motorcycle_number || '—'}</Text>
                </View>

                <View style={[styles.profileInfoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>{t.branch}</Text>
                  <Text style={[styles.profileInfoValue, { color: colors.textPrimary }]}>{employee.branch_name || '—'}</Text>
                </View>
              </View>
            </View>

            {/* Language & Settings Box */}
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 12, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.appSettings}
              </Text>

              <TouchableOpacity
                style={[styles.settingRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => setShowLangModal(true)}
              >
                <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="globe-outline" size={20} color={colors.primary} />
                  <Text style={[styles.settingRowText, { color: colors.textPrimary }]}>
                    {t.language}
                  </Text>
                </View>
                <Text style={[styles.settingRowVal, { color: colors.primary }]}>
                  {lang === 'ar' ? 'العربية 🇸🇦' : lang === 'en' ? 'English 🇺🇸' : 'বাংলা 🇧🇩'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.settingRow, { borderBottomWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={handleLogout}
              >
                <View style={[styles.settingRowRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="log-out-outline" size={20} color="#ef4444" />
                  <Text style={[styles.settingRowText, { color: '#ef4444' }]}>{t.logout}</Text>
                </View>
                <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* =========================================================================
          BOTTOM NAVIGATION BAR
         ========================================================================= */}
      <View style={[styles.bottomNav, { backgroundColor: colors.bottomNavBg, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
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
            {t.tabHome}
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
            {t.tabShift}
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
            {t.tabHistory}
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
            {t.tabProfile}
          </Text>
        </TouchableOpacity>
      </View>

      {/* =========================================================================
          LANGUAGE SELECTOR MODAL
         ========================================================================= */}
      {showLangModal && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.langModalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.langModalTitle, { color: colors.textPrimary }]}>{t.selectLang}</Text>

            <TouchableOpacity
              style={[styles.langOptionRow, lang === 'ar' && { backgroundColor: colors.primaryLight }]}
              onPress={() => {
                setLang('ar');
                setShowLangModal(false);
              }}
            >
              <Text style={styles.langFlag}>🇸🇦</Text>
              <Text style={[styles.langOptionText, { color: colors.textPrimary }]}>العربية (Arabic)</Text>
              {lang === 'ar' && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOptionRow, lang === 'en' && { backgroundColor: colors.primaryLight }]}
              onPress={() => {
                setLang('en');
                setShowLangModal(false);
              }}
            >
              <Text style={styles.langFlag}>🇺🇸</Text>
              <Text style={[styles.langOptionText, { color: colors.textPrimary }]}>English</Text>
              {lang === 'en' && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.langOptionRow, lang === 'bn' && { backgroundColor: colors.primaryLight }]}
              onPress={() => {
                setLang('bn');
                setShowLangModal(false);
              }}
            >
              <Text style={styles.langFlag}>🇧🇩</Text>
              <Text style={[styles.langOptionText, { color: colors.textPrimary }]}>বাংলা (Bengali)</Text>
              {lang === 'bn' && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelModalBtn, { backgroundColor: colors.inputBg }]}
              onPress={() => setShowLangModal(false)}
            >
              <Text style={[styles.cancelModalText, { color: colors.textSecondary }]}>إلغاء / Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* =========================================================================
          IMAGE PREVIEW LIGHTBOX MODAL
         ========================================================================= */}
      {previewPhoto && (
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {previewPhoto.title}
              </Text>
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
    justifyContent: 'center',
    marginBottom: 20,
  },
  langSwitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  langSwitchText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  loginHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 90,
    height: 90,
    marginBottom: 12,
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
    marginBottom: 4,
  },
  loginCardSubtitle: {
    fontSize: 13,
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
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
  },

  // Header Bar
  headerBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerRight: {
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
  },
  headerBadgesRow: {
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
  langSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  langSmallText: {
    fontSize: 11,
    fontWeight: 'bold',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusPill: {
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
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  heroActionButton: {
    flexDirection: 'row',
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
  },
  sectionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  statsGrid: {
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
  },
  quickCardSub: {
    fontSize: 12,
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
  },
  cardSubtitle: {
    fontSize: 12,
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
  },
  matchBadgeSuccess: {
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
  },
  photoPickerRow: {
    gap: 10,
  },
  photoButton: {
    flex: 1,
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
    gap: 10,
  },

  // Active shift summary box inside end shift
  activeShiftSummaryBox: {
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
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },

  // Quick Demo Button
  demoButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  demoButtonText: {
    fontSize: 13,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyDate: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  historyBike: {
    fontSize: 11,
    marginTop: 2,
  },
  badgeReviewed: {
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
    gap: 8,
    marginTop: 10,
  },
  historyPhotoThumb: {
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingRowRight: {
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

  // Language Modal
  langModalCard: {
    width: '90%',
    borderRadius: 18,
    padding: 20,
    gap: 12,
  },
  langModalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  langOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  langFlag: {
    fontSize: 22,
  },
  langOptionText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  cancelModalBtn: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelModalText: {
    fontSize: 14,
    fontWeight: '500',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
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
