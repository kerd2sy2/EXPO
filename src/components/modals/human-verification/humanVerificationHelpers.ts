export type VerificationLanguage = 'ar' | 'en' | 'ur' | 'bn';

export const TRACK_WIDTH = 270;
export const KNOB_SIZE = 48;
export const MAX_SLIDE = TRACK_WIDTH - KNOB_SIZE - 8;

export const modalTranslations: Record<
  VerificationLanguage,
  {
    badge: string;
    title: string;
    subtitle: (appName: string) => string;
    slideAction: string;
    verified: string;
    footerNote: string;
  }
> = {
  ar: {
    badge: 'حماية أمنية ذكية',
    title: 'تأكيد أمان تسجيل الدخول',
    subtitle: (appName: string) => `يرجى سحب المؤشر لتأكيد هويتك وحماية ${appName} من الوصول المؤتمت`,
    slideAction: 'اسحب المؤشر لليمين للتحقق 👉',
    verified: 'تم التحقق بنجاح ✓',
    footerNote: 'اتصال مشفر ومحمي بواسطة جدار الحماية',
  },
  en: {
    badge: 'Smart Security Shield',
    title: 'Confirm Login Security',
    subtitle: (appName: string) => `Please slide to confirm your identity and protect ${appName} from bots`,
    slideAction: 'Slide to verify 👉',
    verified: 'Verified successfully ✓',
    footerNote: 'Encrypted connection protected by firewall',
  },
  ur: {
    badge: 'سمارٹ سیکیورٹی شیلڈ',
    title: 'لاگ ان سیکیورٹی کی تصدیق',
    subtitle: (appName: string) => `براہ کرم اپنی شناخت کی تصدیق اور ${appName} کو خودکار بوٹس سے بچانے کیلئے سلائیڈ کریں`,
    slideAction: 'تصدیق کے لیے سلائیڈ کریں 👉',
    verified: 'کامیابی سے تصدیق ہو گئی ✓',
    footerNote: 'فائر وال کے ذریعے محفوظ اور انکرپٹڈ کنکشن',
  },
  bn: {
    badge: 'স্মার্ট নিরাপত্তা সুরক্ষা',
    title: 'লগইন নিরাপত্তা নিশ্চিত করুন',
    subtitle: (appName: string) => `আপনার পরিচয় নিশ্চিত করতে এবং ${appName}-কে বট থেকে রক্ষা করতে স্লাইড করুন`,
    slideAction: 'যাচাই করতে স্লাইড করুন 👉',
    verified: 'সফলভাবে যাচাই করা হয়েছে ✓',
    footerNote: 'ফায়ারওয়াল দ্বারা সুরক্ষিত এনক্রিপ্ট করা সংযোগ',
  },
};

/**
 * Returns the localized display name for known platform modules in the security prompt.
 */
export function getLocalizedAppName(rawName: string, lang: VerificationLanguage): string {
  const normalized = (rawName || '').trim().toLowerCase();
  if (normalized.includes('إشراف') || normalized.includes('اشراف') || normalized.includes('supervis')) {
    switch (lang) {
      case 'en': return 'Supervision';
      case 'ur': return 'نگرانی';
      case 'bn': return 'তত্ত্বাবধান';
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
  if (normalized.includes('عهدة') || normalized.includes('عهده') || normalized.includes('custody') || normalized.includes('ahda')) {
    switch (lang) {
      case 'en': return 'Custody';
      case 'ur': return 'تحویل';
      case 'bn': return 'হেফাজত';
      default: return 'العهدة';
    }
  }
  if (normalized.includes('إدارة') || normalized.includes('ادارة') || normalized.includes('manag') || normalized.includes('admin')) {
    switch (lang) {
      case 'en': return 'Management';
      case 'ur': return 'انتظامیہ';
      case 'bn': return 'প্রশাসন';
      default: return 'الإدارة';
    }
  }
  return rawName;
}
