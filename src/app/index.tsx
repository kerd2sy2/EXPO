import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  useColorScheme,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SplashScreen from 'expo-splash-screen';
import { workApi, EmployeeProfile, WorkSession } from '../services/work';
import { setAuthToken, getStoredToken } from '../services/api';

const { width } = Dimensions.get('window');

type TabType = 'home' | 'shift' | 'history' | 'profile';
type Language = 'ar' | 'en' | 'bn';

const MONTHLY_TARGET = 460;

// Helper to resolve full image URLs for backend uploads / personal images
export const getFullImageUrl = (imagePath?: string): string | null => {
  if (!imagePath || !imagePath.trim()) return null;
  const path = imagePath.trim();
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:image')) {
    return path;
  }
  const cleanBase = 'https://aams-backend-fxy7.onrender.com';
  return `${cleanBase}${path.startsWith('/') ? path : `/${path}`}`;
};

const translations = {
  ar: {
    appName: 'AAMS Logistics',
    appSubtitle: 'بوابة المناديب الميدانية',
    loginTitle: 'تسجيل الدخول',
    loginSubtitle: 'أدخل رقم الهوية الوطنية لتسجيل الدخول ومباشرة دوامك',
    nationalIdLabel: 'رقم الهوية أو البريد',
    nationalIdPlaceholder: 'مثال: 2569600022',
    passwordLabel: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    passwordHint: '',
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
    approvedOrders: 'الطلبات المنجزة',
    monthlyTarget: 'الهدف الشهري (التارجت)',
    expectedSalary: 'متوقع الراتب المكتسب',
    ratePerOrder: 'سعر الطلب الحالي',
    targetAchievedBadge: 'تم كسر التارجت والبونص 🏆 (شريحة 6 ر.س/طلب)',
    targetRemainingNotice: 'متبقي {n} طلب للانتقال لشريحة 6 ر.س/طلب 🚀',
    qrTitle: 'بطاقة المندوب الرقمية (QR Code)',
    qrSub: 'أظهر هذا الرمز للمشرف أو الفرع للمسح والتحقق السريع',
    close: 'إغلاق',
    quickAccess: 'الوصول السريع',
    quickShiftTitle: 'بدء أو إقفال شفت العمل',
    quickShiftSub: 'تسجيل قراءات العدادات والتقاط الصور',
    quickHistoryTitle: 'سجل الشفتات والتصديقات',
    quickHistorySub: 'متابعة حالة اعتماد المشرف للطلبات',
    quickProfileTitle: 'الملف الشخصي وإعدادات الحساب',
    quickProfileSub: 'عرض بيانات المندوب والدباب ولغة التطبيق',
    backToHome: 'العودة للرئيسية',
    ordersUnit: 'طلب',
    shiftsUnit: 'شفت',
    shiftStatus: 'حالة الدوام',
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
    captureCamera: 'فتح الكاميرا وتصوير العداد 📸',
    odometerGuideTitle: 'وضع شاشة العداد داخل هذا الإطار',
    odometerGuideSub: 'وجّه الكاميرا نحو شاشة العداد وتأكد من وضوح الأرقام',
    photoCapturedSuccess: 'تم التقاط صورة العداد بنجاح',
    retakePhoto: 'إعادة التصوير 🔄',
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
    phoneNumber: 'رقم الهاتف',
    selectLang: 'اختر لغة التطبيق',
  },
  en: {
    appName: 'AAMS Logistics',
    appSubtitle: 'Field Delegate Portal',
    loginTitle: 'Sign In',
    loginSubtitle: 'Enter your National ID to sign in and start your shift',
    nationalIdLabel: 'National ID or Email',
    nationalIdPlaceholder: 'e.g. 2569600022',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    passwordHint: '',
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
    approvedOrders: 'Completed Orders',
    monthlyTarget: 'Monthly Target',
    expectedSalary: 'Estimated Earnings',
    ratePerOrder: 'Order Rate',
    targetAchievedBadge: 'Target Achieved & Bonus Unlocked 🏆 (6 SAR/order)',
    targetRemainingNotice: '{n} orders left to reach 6 SAR/order tier 🚀',
    qrTitle: 'Delegate Digital Badge (QR Code)',
    qrSub: 'Present this code to supervisor or branch for scanning',
    close: 'Close',
    quickAccess: 'Quick Access',
    quickShiftTitle: 'Start or End Shift',
    quickShiftSub: 'Record odometer readings & take photos',
    quickHistoryTitle: 'Shift History & Approvals',
    quickHistorySub: 'Track supervisor review and order approvals',
    quickProfileTitle: 'Profile & Account Settings',
    quickProfileSub: 'View delegate details, bike info, and app language',
    backToHome: 'Back to Home',
    ordersUnit: 'Orders',
    shiftsUnit: 'Shifts',
    shiftStatus: 'Shift Status',
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
    captureCamera: 'Open Camera & Snap Odometer 📸',
    odometerGuideTitle: 'Align Odometer Inside Box',
    odometerGuideSub: 'Point camera at the odometer display clearly',
    photoCapturedSuccess: 'Odometer photo captured successfully',
    retakePhoto: 'Retake Photo 🔄',
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
    phoneNumber: 'Phone Number',
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
    approvedOrders: 'সম্পন্ন অর্ডার',
    monthlyTarget: 'মাসিক টার্গেট',
    expectedSalary: 'আনুমানিক মোট আয়',
    ratePerOrder: 'প্রতি অর্ডারের রেট',
    targetAchievedBadge: 'টার্গেট সম্পন্ন ও বোনাস অর্জিত 🏆 (৬ রিয়াল/অর্ডার)',
    targetRemainingNotice: '৬ রিয়াল স্তরে পৌঁছাতে বাকি {n} অর্ডার 🚀',
    qrTitle: 'প্রতিনিধি ডিজিটাল আইডি (QR কোড)',
    qrSub: 'যাচাইয়ের জন্য সুপারভাইজারকে এই কোডটি দেখান',
    close: 'বন্ধ করুন',
    quickAccess: 'দ্রুত অ্যাক্সেস',
    quickShiftTitle: 'শিফট শুরু বা শেষ করুন',
    quickShiftSub: 'মিটার রিডিং রেকর্ড এবং ছবি তুলুন',
    quickHistoryTitle: 'শিফট ইতিহাস ও অনুমোদন',
    quickHistorySub: 'সুপারভাইজার অনুমোদন ট্র্যাক করুন',
    quickProfileTitle: 'প্রোফাইল ও অ্যাকাউন্ট সেটিংস',
    quickProfileSub: 'প্রতিনিধির তথ্য, বাইক এবং অ্যাপের ভাষা',
    backToHome: 'হোমে ফিরে যান',
    ordersUnit: 'অর্ডার',
    shiftsUnit: 'শিফট',
    shiftStatus: 'শিফট স্ট্যাটাস',
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
    captureCamera: 'ক্যামেরা খুলে মিটারের ছবি তুলুন 📸',
    odometerGuideTitle: 'মিটারে ক্যামেরা সঠিকভাবে ফোকাস করুন',
    odometerGuideSub: 'মিটারের সংখ্যাগুলো যেন পরিষ্কার দেখা যায়',
    photoCapturedSuccess: 'মিটারে ছবি সফলভাবে তোলা হয়েছে',
    retakePhoto: 'আবার ছবি তুলুন 🔄',
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
    phoneNumber: 'ফোন নম্বর',
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
  const [showQrModal, setShowQrModal] = useState(false);
  const t = translations[lang];
  const isRTL = lang === 'ar';

  // Scroll View Ref for scrolling to top on navigation
  const mainScrollRef = useRef<ScrollView>(null);

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

  // Navigate to tab and scroll to top
  const navigateToTab = (tab: TabType) => {
    setCurrentTab(tab);
    setTimeout(() => {
      mainScrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 50);
  };

  // Handle Hardware Back Button (Go to Home from subpages, exit app if on Home)
  useEffect(() => {
    const onBackPress = () => {
      // 1. If photo preview lightbox is open, close it
      if (previewPhoto) {
        setPreviewPhoto(null);
        return true;
      }

      // 2. If QR modal is open, close it
      if (showQrModal) {
        setShowQrModal(false);
        return true;
      }

      // 3. If language modal is open, close it
      if (showLangModal) {
        setShowLangModal(false);
        return true;
      }

      // 4. If in a sub-page (Shift, History, Profile), return back to Home
      if (currentTab !== 'home') {
        navigateToTab('home');
        return true; // prevent exit and go to home
      }

      // 5. If already on Home (or login screen), allow default exit app behavior
      return false;
    };

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSubscription.remove();
  }, [currentTab, previewPhoto, showLangModal, showQrModal]);

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
            personal_image: me.admin.personal_image || '',
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
        personal_image: '',
      };

      setEmployee(empData);
      setEnteredMotorcycle(empData.motorcycle_number || '');

      const session = await workApi.getActiveSession(empData.id);
      setActiveSession(session);
      navigateToTab('home');
    } catch (err: any) {
      setLoginError(err.message || 'فشل تسجيل الدخول، تأكد من صحة البيانات');
    } finally {
      setSubmitting(false);
    }
  };

  const fillDelwarDemo = () => {
    setLoginInput('2569600022');
    setPasswordInput('600022');
    handleLogin('2569600022', '600022');
  };

  const handleLogout = () => {
    setAuthToken(null);
    setToken(null);
    setEmployee(null);
    setActiveSession(null);
    setLoginInput('');
    setPasswordInput('');
    setLoginError('');
    navigateToTab('home');
  };

  // Direct camera capture without cropping (live field verification)
  const takeOdometerPhoto = async (target: 'start' | 'end') => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('الإذن مطلوب', 'يرجى السماح للتطبيق باستخدام الكاميرا لتصوير العداد مباشرة');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false, // لا يوجد قص — موافق مباشرة
        quality: 0.8,
        base64: true,
      });

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
      Alert.alert('خطأ', 'تعذر فتح الكاميرا: ' + (err.message || ''));
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
      navigateToTab('home');
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
      navigateToTab('home');
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

  // Delegate Personal Photo URL
  const empPhotoUrl = useMemo(() => {
    return getFullImageUrl(employee?.personal_image);
  }, [employee?.personal_image]);

  // Total completed approved orders
  const totalApprovedOrdersCount = useMemo(() => {
    return historySessions
      .filter((s) => s.is_reviewed)
      .reduce((sum, s) => sum + (s.orders_count || 0), 0);
  }, [historySessions]);

  // Target & Salary Metrics (Target = 460 orders: < 460 => 5 SAR, >= 460 => 6 SAR)
  const isTargetAchieved = totalApprovedOrdersCount >= MONTHLY_TARGET;
  const currentRatePerOrder = isTargetAchieved ? 6 : 5;
  const expectedSalary = totalApprovedOrdersCount * currentRatePerOrder;
  const targetProgressPct = Math.min(100, Math.round((totalApprovedOrdersCount / MONTHLY_TARGET) * 100));
  const remainingOrdersToTarget = Math.max(0, MONTHLY_TARGET - totalApprovedOrdersCount);

  // Theme Colors (Brand Orange & Black)
  const colors = {
    bg: isDarkMode ? '#090a0f' : '#f8f9fa',
    card: isDarkMode ? '#12141c' : '#ffffff',
    cardHeader: isDarkMode ? '#191c26' : '#f4f4f5',
    textPrimary: isDarkMode ? '#ffffff' : '#0f172a',
    textSecondary: isDarkMode ? '#9ca3af' : '#64748b',
    border: isDarkMode ? '#232738' : '#e2e8f0',
    primary: '#ea580c', // Pure Brand Orange
    primaryLight: isDarkMode ? 'rgba(234, 88, 12, 0.16)' : '#fff7ed',
    primaryText: isDarkMode ? '#fb923c' : '#c2410c',
    accent: '#f97316',
    accentLight: isDarkMode ? 'rgba(249, 115, 22, 0.12)' : '#ffedd5',
    inputBg: isDarkMode ? '#0d0f15' : '#f8fafc',
    inputBorder: isDarkMode ? '#2a3044' : '#cbd5e1',
    warningBg: isDarkMode ? '#381e05' : '#fffbeb',
    warningBorder: isDarkMode ? '#78350f' : '#fde68a',
    warningText: isDarkMode ? '#fbbf24' : '#b45309',
    errorBg: isDarkMode ? '#3b0d0c' : '#fef2f2',
    errorText: isDarkMode ? '#f87171' : '#dc2626',
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
            <View style={styles.loginWrapper}>
              {/* Official Horizontal Brand Lockup (Logo on the Right) */}
              <View style={[styles.brandHorizontalLockup, { flexDirection: 'row-reverse' }]}>
              <Image
                source={require('../../assets/images/logo.png')}
                style={styles.brandLogoMark}
                resizeMode="contain"
              />
              <View style={[styles.brandTextCol, { alignItems: 'flex-end' }]}>
                <Text style={[styles.brandMainTitle, { color: isDarkMode ? '#ffffff' : '#090a0f' }]}>
                  AAMS
                </Text>
                <Text style={[styles.brandSubTitle, { color: isDarkMode ? '#94a3b8' : '#475569' }]}>
                  LOGISTICS
                </Text>
              </View>
            </View>

            {/* Login Card */}
            <View style={[styles.loginCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                    keyboardType="number-pad"
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
                    keyboardType="number-pad"
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 8 }]}
                onPress={() => handleLogin()}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Ionicons name="log-in-outline" size={20} color="#ffffff" />
                    <Text style={styles.primaryButtonText}>{t.loginBtn}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* ⚡ Quick Demo Test Button */}
              <TouchableOpacity
                style={[styles.demoButton, { borderColor: colors.primary }]}
                onPress={fillDelwarDemo}
                disabled={submitting}
              >
                <View style={styles.demoButtonInner}>
                  <View style={[styles.demoButtonIconWrap, { backgroundColor: colors.primary }]}>
                    <Ionicons name="flash" size={16} color="#ffffff" />
                  </View>
                  <Text style={[styles.demoButtonText, { color: colors.textPrimary }]}>
                    {t.demoLoginBtn}
                  </Text>
                </View>
              </TouchableOpacity>
              </View>
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

      {/* Top Header Bar — only on Home tab */}
      {currentTab === 'home' && (
        <View style={[styles.headerBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <TouchableOpacity
            style={[styles.headerRight, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => navigateToTab('profile')}
            activeOpacity={0.75}
          >
            {/* Delegate Avatar / Personal Image */}
            {empPhotoUrl ? (
              <Image source={{ uri: empPhotoUrl }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarCircle, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.avatarText, { color: colors.primaryText }]}>
                  {employee.name ? employee.name.charAt(0) : 'D'}
                </Text>
              </View>
            )}

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
              </View>
            </View>
          </TouchableOpacity>

          {/* QR Code Button on the Opposite Side */}
          <TouchableOpacity
            style={[styles.qrHeaderBtn, { backgroundColor: colors.accentLight, borderColor: colors.primary }]}
            onPress={() => setShowQrModal(true)}
          >
            <Ionicons name="qr-code" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Sticky Title Bar — Shift Tab */}
      {currentTab === 'shift' && (
        <View style={[styles.subPageHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.subPageHeaderIcon, { backgroundColor: activeSession ? '#fee2e2' : colors.primaryLight }]}>
            <Ionicons
              name={activeSession ? 'stop-circle-outline' : 'play-circle-outline'}
              size={22}
              color={activeSession ? '#ef4444' : colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
              {activeSession ? t.endShiftNow : t.tabShift}
            </Text>
            {activeSession && (
              <Text style={[styles.subPageHeaderSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.durationLabel}: {elapsedTime}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Sticky Title Bar — History Tab */}
      {currentTab === 'history' && (
        <View style={[styles.subPageHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.subPageHeaderIcon, { backgroundColor: colors.accentLight }]}>
            <Ionicons name="receipt-outline" size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.subPageHeaderTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
              {t.historyTitle}
            </Text>
            <Text style={[styles.subPageHeaderSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
              {historySessions.length} {t.totalShifts}
            </Text>
          </View>
        </View>
      )}

      {/* Body Content with ScrollRef */}
      <ScrollView
        ref={mainScrollRef}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ----------------- TAB 1: HOME DASHBOARD (الرئيسية) ----------------- */}
        {currentTab === 'home' && (
          <View style={styles.tabContainer}>
            {/* Clean, Human-Designed Monthly Target & Earnings Card */}
            <View style={[styles.targetCardContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Header: Title + Orders Completed / Target Ratio */}
              <View style={[styles.targetCardHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.targetTitleGroup, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="flag-outline" size={17} color={colors.primary} />
                  <Text style={[styles.targetCardTitle, { color: colors.textPrimary }]}>
                    {t.monthlyTarget}
                  </Text>
                </View>
                <Text style={[styles.targetRatioText, { color: colors.textSecondary }]}>
                  <Text style={[styles.targetRatioBold, { color: colors.textPrimary }]}>{totalApprovedOrdersCount}</Text> / {MONTHLY_TARGET} {t.ordersUnit}
                </Text>
              </View>

              {/* Smooth Progress Bar */}
              <View style={styles.targetProgressContainer}>
                <View style={[styles.progressBarTrack, { backgroundColor: isDarkMode ? '#1f2433' : '#f1f5f9' }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.max(2, targetProgressPct)}%`,
                        backgroundColor: isTargetAchieved ? '#22c55e' : colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Footer: Target Notice & Percentage */}
              <View style={[styles.targetFooterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Text
                  style={[
                    styles.targetFooterNotice,
                    { color: isTargetAchieved ? '#22c55e' : colors.textSecondary, textAlign: isRTL ? 'right' : 'left' },
                  ]}
                  numberOfLines={1}
                >
                  {isTargetAchieved
                    ? t.targetAchievedBadge
                    : t.targetRemainingNotice.replace('{n}', String(remainingOrdersToTarget))}
                </Text>
                <Text style={[styles.targetFooterPct, { color: isTargetAchieved ? '#22c55e' : colors.primary }]}>
                  {targetProgressPct}%
                </Text>
              </View>
            </View>

            {/* Quick KPI Stats */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.myAchievements}
              </Text>
            </View>

            <View style={[styles.statsGrid, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Row 1: Bike & Key */}
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
                  <MaterialCommunityIcons name="key-variant" size={22} color={colors.accent} />
                </View>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>
                  {employee.key_number || '—'}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.keyNumber}</Text>
              </View>

              {/* Row 2: Shifts & Expected Salary */}
              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <MaterialCommunityIcons name="calendar-check" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: colors.textPrimary }]}>{historySessions.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.totalShifts}</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.statIconCircle, { backgroundColor: isTargetAchieved ? 'rgba(34,197,94,0.12)' : colors.primaryLight }]}>
                  <Ionicons name="wallet-outline" size={22} color={isTargetAchieved ? '#22c55e' : colors.primary} />
                </View>
                <Text style={[styles.statNumber, { color: isTargetAchieved ? '#22c55e' : colors.textPrimary }]}>
                  {expectedSalary.toLocaleString()}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t.expectedSalary}</Text>
              </View>
            </View>

            {/* Quick Navigation Cards */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                {t.quickAccess}
              </Text>
            </View>

            {/* 1. Shift Quick Access */}
            <TouchableOpacity
              style={[styles.quickCardRow, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => navigateToTab('shift')}
            >
              <View style={[styles.quickCardIconCircle, { backgroundColor: activeSession ? '#fee2e2' : colors.primaryLight }]}>
                <Ionicons
                  name={activeSession ? 'stop-circle-outline' : 'play-circle-outline'}
                  size={24}
                  color={activeSession ? '#ef4444' : colors.primary}
                />
              </View>
              <View style={styles.quickCardTextCol}>
                <Text style={[styles.quickCardTitle, { color: colors.textPrimary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {activeSession ? t.endShiftNow : t.quickShiftTitle}
                </Text>
                <Text style={[styles.quickCardSub, { color: colors.textSecondary, textAlign: isRTL ? 'right' : 'left' }]}>
                  {activeSession ? `${t.durationLabel}: ${elapsedTime}` : t.quickShiftSub}
                </Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* 2. History Quick Access */}
            <TouchableOpacity
              style={[styles.quickCardRow, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => navigateToTab('history')}
            >
              <View style={[styles.quickCardIconCircle, { backgroundColor: colors.accentLight }]}>
                <Ionicons name="receipt-outline" size={24} color={colors.accent} />
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

                {/* Start Odometer Live Camera Target Guide Box */}
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
                        style={styles.retakeButton}
                        onPress={() => takeOdometerPhoto('start')}
                      >
                        <Ionicons name="camera-reverse" size={16} color="#ffffff" />
                        <Text style={styles.retakeButtonText}>{t.retakePhoto}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.odometerGuideBox, { backgroundColor: colors.inputBg, borderColor: colors.primary }]}>
                      {/* Viewfinder corner brackets */}
                      <View style={[styles.cornerBracket, styles.cornerTopLeft, { borderColor: colors.primary }]} />
                      <View style={[styles.cornerBracket, styles.cornerTopRight, { borderColor: colors.primary }]} />
                      <View style={[styles.cornerBracket, styles.cornerBottomLeft, { borderColor: colors.primary }]} />
                      <View style={[styles.cornerBracket, styles.cornerBottomRight, { borderColor: colors.primary }]} />

                      <MaterialCommunityIcons name="gauge" size={38} color={colors.primary} style={{ marginBottom: 6 }} />
                      <Text style={[styles.odometerGuideText, { color: colors.textPrimary }]}>
                        {t.odometerGuideTitle}
                      </Text>
                      <Text style={[styles.odometerGuideSub, { color: colors.textSecondary }]}>
                        {t.odometerGuideSub}
                      </Text>

                      <TouchableOpacity
                        style={[styles.cameraCaptureBtn, { backgroundColor: colors.primary }]}
                        onPress={() => takeOdometerPhoto('start')}
                      >
                        <Ionicons name="camera" size={20} color="#ffffff" />
                        <Text style={styles.cameraCaptureBtnText}>{t.captureCamera}</Text>
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

                {/* End Odometer Live Camera Target Guide Box */}
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
                        style={styles.retakeButton}
                        onPress={() => takeOdometerPhoto('end')}
                      >
                        <Ionicons name="camera-reverse" size={16} color="#ffffff" />
                        <Text style={styles.retakeButtonText}>{t.retakePhoto}</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[styles.odometerGuideBox, { backgroundColor: colors.inputBg, borderColor: '#ef4444' }]}>
                      {/* Viewfinder corner brackets */}
                      <View style={[styles.cornerBracket, styles.cornerTopLeft, { borderColor: '#ef4444' }]} />
                      <View style={[styles.cornerBracket, styles.cornerTopRight, { borderColor: '#ef4444' }]} />
                      <View style={[styles.cornerBracket, styles.cornerBottomLeft, { borderColor: '#ef4444' }]} />
                      <View style={[styles.cornerBracket, styles.cornerBottomRight, { borderColor: '#ef4444' }]} />

                      <MaterialCommunityIcons name="gauge" size={38} color="#ef4444" style={{ marginBottom: 6 }} />
                      <Text style={[styles.odometerGuideText, { color: colors.textPrimary }]}>
                        {t.odometerGuideTitle}
                      </Text>
                      <Text style={[styles.odometerGuideSub, { color: colors.textSecondary }]}>
                        {t.odometerGuideSub}
                      </Text>

                      <TouchableOpacity
                        style={[styles.cameraCaptureBtn, { backgroundColor: '#dc2626' }]}
                        onPress={() => takeOdometerPhoto('end')}
                      >
                        <Ionicons name="camera" size={20} color="#ffffff" />
                        <Text style={styles.cameraCaptureBtnText}>{t.captureCamera}</Text>
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

            {/* Avatar + Name Card */}
            <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Avatar */}
              <View style={styles.profileAvatarWrap}>
                {empPhotoUrl ? (
                  <Image source={{ uri: empPhotoUrl }} style={styles.profileAvatarImg} />
                ) : (
                  <View style={[styles.profileAvatarCircle, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.profileAvatarText, { color: colors.primaryText }]}>
                      {employee.name ? employee.name.charAt(0).toUpperCase() : 'D'}
                    </Text>
                  </View>
                )}
                <View style={[styles.profileAvatarBadge, { backgroundColor: colors.primary }]}>
                  <Ionicons name="person" size={10} color="#fff" />
                </View>
              </View>

              <Text style={[styles.profileName, { color: colors.textPrimary }]}>{employee.name}</Text>
              <Text style={[styles.profileJob, { color: colors.textSecondary }]}>{t.jobRole}</Text>
            </View>

            {/* Info Rows Card */}
            <View style={[styles.profileInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* National ID */}
              <View style={[styles.profileInfoRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.profileInfoIconWrap, { backgroundColor: isDarkMode ? '#1e2233' : '#f8fafc' }]}>
                  <Feather name="credit-card" size={16} color={colors.primary} />
                </View>
                <View style={[styles.profileInfoTexts, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>{t.nationalId}</Text>
                  <Text style={[styles.profileInfoValue, { color: colors.textPrimary }]}>{employee.national_id}</Text>
                </View>
              </View>

              {/* Key Number */}
              <View style={[styles.profileInfoRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.profileInfoIconWrap, { backgroundColor: isDarkMode ? '#1e2233' : '#f8fafc' }]}>
                  <Ionicons name="key-outline" size={16} color={colors.primary} />
                </View>
                <View style={[styles.profileInfoTexts, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>{t.keyNumber}</Text>
                  <Text style={[styles.profileInfoValue, { color: colors.textPrimary }]}>{employee.key_number || '—'}</Text>
                </View>
              </View>

              {/* Phone */}
              <View style={[styles.profileInfoRow, { borderBottomColor: colors.border, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.profileInfoIconWrap, { backgroundColor: isDarkMode ? '#1e2233' : '#f8fafc' }]}>
                  <Feather name="phone" size={16} color={colors.primary} />
                </View>
                <View style={[styles.profileInfoTexts, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                  <Text style={[styles.profileInfoLabel, { color: colors.textSecondary }]}>{t.phoneNumber || 'رقم الهاتف'}</Text>
                  <Text style={[styles.profileInfoValue, { color: colors.textPrimary }]}>{employee.phone || '—'}</Text>
                </View>
              </View>

              {/* Branch */}
              <View style={[styles.profileInfoRow, { borderBottomWidth: 0, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={[styles.profileInfoIconWrap, { backgroundColor: isDarkMode ? '#1e2233' : '#f8fafc' }]}>
                  <Ionicons name="business-outline" size={16} color={colors.primary} />
                </View>
                <View style={[styles.profileInfoTexts, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
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
                  {lang === 'ar' ? 'العربية' : lang === 'en' ? 'English' : 'বাংলা'}
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
          FULLSCREEN QR CODE SCREEN (ONLY QR CODE & CLOSE BUTTON)
         ========================================================================= */}
      {showQrModal && employee && (
        <View style={[styles.qrFullScreenModal, { backgroundColor: colors.bg }]}>
          {/* Center: QR Code with zero background container, and large centered logo with square white background */}
          <View style={styles.qrFullScreenCenter}>
            <View style={styles.qrCodeWrapperNoBg}>
              <Image
                source={{
                  uri: `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(
                    employee.id
                  )}&margin=2&ecc=H`,
                }}
                style={styles.qrCodeImageLarge}
                resizeMode="contain"
              />
              {/* Centered Large Logo with Square White Background */}
              <View style={styles.qrSquareWhiteBacking}>
                <Image
                  source={require('../../assets/images/logo.png')}
                  style={styles.qrLargeLogo}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          {/* Bottom Prominent Close Button */}
          <View style={styles.qrBottomActionArea}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary, width: '100%' }]}
              onPress={() => setShowQrModal(false)}
            >
              <View style={[styles.buttonContentRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Ionicons name="close-circle-outline" size={22} color="#ffffff" />
                <Text style={styles.primaryButtonText}>{t.close}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      )}

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
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
  },
  loginWrapper: {
    width: '100%',
    maxWidth: 400,
  },
  brandHorizontalLockup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 28,
  },
  brandLogoMark: {
    width: 44,
    height: 44,
  },
  brandTextCol: {
    justifyContent: 'center',
  },
  brandMainTitle: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 2,
    lineHeight: 26,
  },
  brandSubTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    marginTop: -2,
  },
  loginCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
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

  // Header Bar (Taller & More Spacious)
  headerBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 72,
  },
  headerRight: {
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ea580c',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    marginTop: 2,
  },
  pillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  pillBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  qrHeaderBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Main Scroll & Tabs
  mainScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContainer: {
    gap: 14,
  },

  // Sub-Page Sticky Header (Shift & History)
  subPageHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    minHeight: 60,
  },
  subPageHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subPageHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subPageHeaderSub: {
    fontSize: 12,
    marginTop: 1,
  },

  // Back to home button at top of tabs
  backToHomeBtn: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  backToHomeText: {
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Clean, Natural Target Widget Styles
  targetCardContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  targetCardHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetTitleGroup: {
    alignItems: 'center',
    gap: 6,
  },
  targetCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  targetRatioText: {
    fontSize: 13,
    fontWeight: '500',
  },
  targetRatioBold: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  targetEarningsHero: {
    marginTop: 2,
    marginBottom: 2,
  },
  targetEarningsLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  targetEarningsRow: {
    alignItems: 'baseline',
    gap: 6,
  },
  targetEarningsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: -0.5,
  },
  targetEarningsCurrency: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  targetProgressContainer: {
    width: '100%',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  targetFooterRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  targetFooterNotice: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  targetFooterPct: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 8,
  },

  // Stats Grid
  sectionHeader: {
    marginTop: 4,
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 15,
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
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 11,
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
    width: 42,
    height: 42,
    borderRadius: 21,
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
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderRow: {
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },

  // Forms
  formGroup: {
    marginBottom: 12,
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
    height: 65,
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

  // Odometer Live Viewfinder Frame Guide Box
  odometerGuideBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cornerBracket: {
    position: 'absolute',
    width: 20,
    height: 20,
  },
  cornerTopLeft: {
    top: 8,
    left: 8,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTopRight: {
    top: 8,
    right: 8,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBottomLeft: {
    bottom: 8,
    left: 8,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBottomRight: {
    bottom: 8,
    right: 8,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  odometerGuideText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },
  odometerGuideSub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  cameraCaptureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cameraCaptureBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Image Preview & Retake
  imagePreviewContainer: {
    borderRadius: 14,
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
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  imageOverlayText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  retakeButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  retakeButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
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
    marginBottom: 14,
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
    borderRadius: 14,
    borderWidth: 1.5,
    marginTop: 16,
    overflow: 'hidden',
  },
  demoButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
  },
  demoButtonIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
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
    paddingVertical: 24,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
  },
  profileAvatarWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  profileAvatarImg: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#ea580c',
  },
  profileAvatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 30,
    fontWeight: 'bold',
  },
  profileAvatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  profileJob: {
    fontSize: 13,
    marginTop: 2,
  },
  profileInfoCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  profileInfoRow: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
  },
  profileInfoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfoTexts: {
    flex: 1,
    gap: 1,
  },
  profileInfoLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  profileInfoValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileDivider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 14,
  },
  profileInfoList: {
    width: '100%',
    gap: 10,
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

  // QR Modal Styles
  // Fullscreen QR Modal Styles
  qrFullScreenModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 50,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  qrTopCloseBtn: {
    alignSelf: 'flex-end',
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  qrFullScreenCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  qrCodeWrapperNoBg: {
    width: 280,
    height: 280,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  qrCodeImageLarge: {
    width: 280,
    height: 280,
  },
  qrSquareWhiteBacking: {
    position: 'absolute',
    width: 68,
    height: 68,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  qrLargeLogo: {
    width: 58,
    height: 58,
  },
  qrBottomActionArea: {
    width: '100%',
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
