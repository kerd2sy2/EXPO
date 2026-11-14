import { Language } from '../../../types/delegate';

export interface LanguageOptionItem {
  code: Language;
  badge: string;
  name: string;
  subName: string;
}

export const CANCEL_LABELS: Record<Language, string> = {
  ar: 'إلغاء',
  en: 'Cancel',
  bn: 'বাতিল',
  ur: 'منسوخ کریں',
};

export const LANGUAGE_OPTIONS: LanguageOptionItem[] = [
  {
    code: 'ar',
    badge: 'AR',
    name: 'العربية',
    subName: 'Arabic',
  },
  {
    code: 'en',
    badge: 'EN',
    name: 'English',
    subName: 'الإنجليزية',
  },
  {
    code: 'bn',
    badge: 'BN',
    name: 'বাংলা',
    subName: 'Bengali (বাংলাদেশ)',
  },
  {
    code: 'ur',
    badge: 'UR',
    name: 'اردو',
    subName: 'Urdu (پاکستان)',
  },
];

/**
 * Returns the localized subtitle prompt for selecting the application language.
 */
export function getLanguageModalSubtitle(lang: Language): string {
  switch (lang) {
    case 'ar':
      return 'حدد لغة العرض المفضلة لواجهة التطبيق';
    case 'ur':
      return 'ایپ کے انٹرفیس کے لیے اپنی پسندیدہ زبان منتخب کریں';
    case 'bn':
      return 'অ্যাপের জন্য আপনার পছন্দের ভাষা নির্বাচন করুন';
    default:
      return 'Choose your preferred display language';
  }
}
