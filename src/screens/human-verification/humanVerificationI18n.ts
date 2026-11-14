export type VerificationLanguage = 'ar' | 'en' | 'ur' | 'bn';

export const verificationTranslations: Record<
  VerificationLanguage,
  {
    title: string;
    subtitle: (appName: string) => string;
    slideAction: string;
    verifying: string;
    verified: string;
    trustFooter: string;
    timeoutError: string;
    genericError: string;
    permissionError: string;
  }
> = {
  ar: {
    title: 'التأكد أنك إنسان',
    subtitle: (appName: string) => `اسحب المؤشر أدناه لإثبات هويتك والمتابعة إلى ${appName}`,
    slideAction: 'اسحب المؤشر للمتابعة',
    verifying: 'جاري التحقق وتسجيل الدخول...',
    verified: 'تم التحقق بنجاح',
    trustFooter: 'نظام حماية أمني مشفر ومحمي ضد برامج التخمين الآلية',
    timeoutError: 'انتهت مهلة الاتصال بالخادم، يرجى المحاولة مجدداً',
    genericError: 'فشل تسجيل الدخول، يرجى التأكد من صحة البيانات',
    permissionError: 'ليس لديك صلاحية الدخول إلى التطبيق، يرجى مراجعة الإدارة',
  },
  en: {
    title: 'Human Verification',
    subtitle: (appName: string) =>
      `Slide the slider below to verify you are human and proceed to ${appName}`,
    slideAction: 'Slide to verify',
    verifying: 'Verifying and signing in...',
    verified: 'Verified successfully',
    trustFooter: 'Encrypted security system protected against automated bots',
    timeoutError: 'Server connection timed out, please try again',
    genericError: 'Sign in failed, please check your credentials',
    permissionError: 'You do not have access permission for this app, please contact administration',
  },
  ur: {
    title: 'انسانی تصدیق',
    subtitle: (appName: string) =>
      `اپنی شناخت کی تصدیق اور ${appName} پر جاری رکھنے کے لیے سلائیڈر کو سلائیڈ کریں`,
    slideAction: 'جاری رکھنے کے لیے سلائیڈ کریں',
    verifying: 'تصدیق اور لاگ ان ہو رہا ہے...',
    verified: 'کامیابی سے تصدیق ہو گئی',
    trustFooter: 'خودکار بوٹس کے خلاف محفوظ اور انکرپٹڈ سیکیورٹی سسٹم',
    timeoutError: 'سرور کنکشن کا وقت ختم ہو گیا، براہ کرم دوبارہ کوشش کریں',
    genericError: 'لاگ ان ناکام رہا، براہ کرم معلومات کی درستگی چیک کریں',
    permissionError: 'آپ کے پاس اس ایپ تک رسائی کی اجازت نہیں ہے، براہ کرم انتظامیہ سے رابطہ کریں',
  },
  bn: {
    title: 'মানুষ যাচাইকরণ',
    subtitle: (appName: string) =>
      `আপনি মানুষ তা নিশ্চিত করতে এবং ${appName}-এ প্রবেশ করতে নিচের স্লাইডারটি টানুন`,
    slideAction: 'এগিয়ে যেতে স্লাইড করুন',
    verifying: 'যাচাই এবং সাইন ইন করা হচ্ছে...',
    verified: 'সফলভাবে যাচাই করা হয়েছে',
    trustFooter: 'স্বয়ংক্রিয় বট থেকে সুরক্ষিত এনক্রিপ্ট করা নিরাপত্তা ব্যবস্থা',
    timeoutError: 'সার্ভার সংযোগের সময় শেষ, অনুগ্রহ করে আবার চেষ্টা করুন',
    genericError: 'সাইন ইন ব্যর্থ হয়েছে, অনুগ্রহ করে তথ্য সঠিক কিনা পরীক্ষা করুন',
    permissionError: 'আপনার এই অ্যাপে প্রবেশের অনুমতি নেই, অনুগ্রহ করে প্রশাসনের সাথে যোগাযোগ করুন',
  },
};

export const getLocalizedAppName = (rawName: string, lang: VerificationLanguage): string => {
  const normalized = (rawName || '').trim().toLowerCase();
  if (normalized.includes('إشراف') || normalized.includes('اشراف') || normalized.includes('supervis')) {
    switch (lang) {
      case 'en': return 'Supervision';
      case 'ur': return 'نگرانی';
      case 'bn': return 'তত্ত্বابধান';
      default: return 'الإشراف';
    }
  }
  if (normalized.includes('مناديب') || normalized.includes('مندوب') || normalized.includes('delegat')) {
    switch (lang) {
      case 'en': return 'Delegates';
      case 'ur': return 'ڈیلیگیٹس';
      case 'bn': return 'প্রতিনিধিরা';
      default: return 'المناديب';
    }
  }
  if (
    normalized.includes('عهدة') ||
    normalized.includes('عهده') ||
    normalized.includes('custody') ||
    normalized.includes('ahda')
  ) {
    switch (lang) {
      case 'en': return 'Custody';
      case 'ur': return 'تحویل';
      case 'bn': return 'হেফাজত';
      default: return 'العهدة';
    }
  }
  if (
    normalized.includes('إدارة') ||
    normalized.includes('ادارة') ||
    normalized.includes('manag') ||
    normalized.includes('admin')
  ) {
    switch (lang) {
      case 'en': return 'Management';
      case 'ur': return 'انتظامیہ';
      case 'bn': return 'প্রশাসন';
      default: return 'الإدارة';
    }
  }
  return rawName;
};
