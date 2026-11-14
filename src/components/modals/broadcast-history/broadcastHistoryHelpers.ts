import { Language } from '../../../types/delegate';

/**
 * Formats an ISO timestamp string as a localized short date.
 */
export function formatBroadcastDate(iso: string | undefined, lang: Language): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/**
 * Formats an ISO timestamp string as a localized 2-digit hour:minute string.
 */
export function formatBroadcastTime(iso: string | undefined, lang: Language): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Returns localized labels for the broadcast history modal and its cards.
 */
export function getBroadcastHistoryTexts(lang: Language) {
  return {
    headerTitle:
      lang === 'bn'
        ? 'বিজ্ঞপ্তি ও নোটিশ কেন্দ্র'
        : lang === 'en'
        ? 'Notifications & Broadcasts'
        : 'مركز الإشعارات والتعاميم',
    loadingText:
      lang === 'bn'
        ? 'বিজ্ঞপ্তি লোড হচ্ছে...'
        : lang === 'en'
        ? 'Loading notifications...'
        : 'جاري تحميل الإشعارات...',
    emptyTitle:
      lang === 'bn'
        ? 'এখনো কোন বিজ্ঞপ্তি নেই'
        : lang === 'en'
        ? 'No notifications yet'
        : 'لا توجد إشعارات حالياً',
    emptySub:
      lang === 'bn'
        ? 'প্রশাসনিক নোটিশ বা জরিপ পাঠানো হলে এখানে দেখতে পাবেন'
        : lang === 'en'
        ? 'You will receive administrative broadcasts and polls here.'
        : 'سيتم تنبيهك هنا بأي تعاميم أو استبيانات إدارية جديدة فور إرسالها',
    agreeText: lang === 'bn' ? 'সম্মত' : lang === 'en' ? 'Agreed' : 'تمت الموافقة',
    disagreeText: lang === 'bn' ? 'অসম্মত' : lang === 'en' ? 'Disagreed' : 'معترض',
    pollText: lang === 'bn' ? 'ভোট / জরিপ' : lang === 'en' ? 'Poll' : 'استبيان رأي',
    newBadgeText: lang === 'bn' ? 'নতুন' : lang === 'en' ? 'NEW' : 'جديد',
    tapVoteText:
      lang === 'bn'
        ? 'ভোট দিতে চাপ দিন'
        : lang === 'en'
        ? 'Tap to cast your vote'
        : 'اضغط للمشاركة في التصويت',
    viewDetailsText:
      lang === 'bn'
        ? 'বিস্তারিত দেখুন'
        : lang === 'en'
        ? 'View details'
        : 'عرض التفاصيل الكاملة',
  };
}
