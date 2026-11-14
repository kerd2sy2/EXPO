import { BroadcastNotificationItem } from '../../../services/notificationService';
import { Language } from '../../../types/delegate';

export interface BroadcastUiStrings {
  currentIsRTL: boolean;
  sheetHeaderTitle: string;
  targetSubTitle: string;
  zoomText: string;
  pollHeader: string;
  agreeBtnText: string;
  disagreeBtnText: string;
  votedAgreeText: string;
  votedDisagreeText: string;
  closeBtnText: string;
}

/** Computes localized labels and RTL direction for the active broadcast language tab. */
export function getBroadcastUiStrings(
  activeLang: Language,
  broadcast: BroadcastNotificationItem | null
): BroadcastUiStrings {
  const currentIsRTL = activeLang === 'ar';

  const sheetHeaderTitle = broadcast?.has_poll
    ? activeLang === 'bn'
      ? 'মতামত ও জরিপ'
      : activeLang === 'en'
      ? 'Poll & Opinion Survey'
      : 'استبيان واستطلاع رأي'
    : activeLang === 'bn'
    ? 'জরুরি নোظيف / বিজ্ঞপ্তি'
    : activeLang === 'en'
    ? 'Official Broadcast'
    : 'تعميم وإشعار هام';

  const targetSubTitle =
    broadcast?.target === 'ALL'
      ? activeLang === 'bn'
        ? 'সকল কর্মীদের জন্য'
        : activeLang === 'en'
        ? 'All Delegates'
        : 'موجه لجميع المناديب'
      : activeLang === 'bn'
      ? `শাখা: (${broadcast?.branch_name || ''})`
      : activeLang === 'en'
      ? `Branch: (${broadcast?.branch_name || ''})`
      : `خاص بفرعك (${broadcast?.branch_name || ''})`;

  const zoomText = activeLang === 'bn' ? 'বড় করে দেখুন' : activeLang === 'en' ? 'Tap to zoom' : 'اضغط للتكبير';
  const pollHeader = activeLang === 'bn' ? 'জরিপের প্রশ্ন:' : activeLang === 'en' ? 'Poll Question:' : 'سؤال الاستبيان:';
  const agreeBtnText = activeLang === 'bn' ? 'সম্মত' : activeLang === 'en' ? 'Agree' : 'موافق';
  const disagreeBtnText = activeLang === 'bn' ? 'অসম্মত' : activeLang === 'en' ? 'Disagree' : 'معترض';
  const votedAgreeText = activeLang === 'bn' ? 'আপনার ভোট: সম্মত' : activeLang === 'en' ? 'You voted: Agreed' : 'تم تسجيل صوتك: موافق';
  const votedDisagreeText =
    activeLang === 'bn' ? 'আপনার ভোট: অসম্মত' : activeLang === 'en' ? 'You voted: Disagreed' : 'تم تسجيل صوتك: معترض';
  const closeBtnText = activeLang === 'bn' ? 'ঠিক আছে / বন্ধ করুন' : activeLang === 'en' ? 'Acknowledge & Close' : 'تم الاطلاع / إغلاق';

  return {
    currentIsRTL,
    sheetHeaderTitle,
    targetSubTitle,
    zoomText,
    pollHeader,
    agreeBtnText,
    disagreeBtnText,
    votedAgreeText,
    votedDisagreeText,
    closeBtnText,
  };
}
