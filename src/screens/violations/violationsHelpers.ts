import { Language } from '../../types/delegate';

export function getViolationStatusBadge(status: string, isDarkMode: boolean, t: any) {
  switch (status) {
    case 'RECORDED':
      return {
        label: t.violationStatusRecorded || 'مسجلة',
        bg: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
        text: isDarkMode ? '#F87171' : '#DC2626',
        border: isDarkMode ? 'rgba(239, 68, 68, 0.3)' : '#FCA5A5',
        icon: 'alert-circle-outline' as const,
      };
    case 'PARTIAL':
      return {
        label: t.violationStatusPartial || 'مخصومة جزئياً',
        bg: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
        text: isDarkMode ? '#FBBF24' : '#D97706',
        border: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : '#FDE68A',
        icon: 'hourglass-outline' as const,
      };
    case 'DEDUCTED':
      return {
        label: t.violationStatusDeducted || 'تم الخصم',
        bg: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
        text: isDarkMode ? '#34D399' : '#059669',
        border: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
        icon: 'checkmark-circle-outline' as const,
      };
    case 'DISPUTED':
      return {
        label: t.violationStatusDisputed || 'معترض عليها',
        bg: isDarkMode ? 'rgba(139, 92, 246, 0.15)' : '#EDE9FE',
        text: isDarkMode ? '#C4B5FD' : '#7C3AED',
        border: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : '#DDD6FE',
        icon: 'help-circle-outline' as const,
      };
    case 'PAID':
      return {
        label: t.violationStatusPaid || 'مسددة',
        bg: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
        text: isDarkMode ? '#34D399' : '#059669',
        border: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#A7F3D0',
        icon: 'checkmark-circle-outline' as const,
      };
    default:
      return {
        label: status,
        bg: isDarkMode ? 'rgba(107, 114, 128, 0.15)' : '#F3F4F6',
        text: isDarkMode ? '#9CA3AF' : '#4B5563',
        border: isDarkMode ? 'rgba(107, 114, 128, 0.3)' : '#E5E7EB',
        icon: 'information-circle-outline' as const,
      };
  }
}

export function formatViolationDate(dateStr?: string, lang: Language = 'ar'): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.split('T')[0];
    const locale =
      lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : lang === 'ur' ? 'ur-PK' : 'en-US';
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr.split('T')[0];
  }
}

export function isPenaltyViolation(reason?: string): boolean {
  if (!reason) return false;
  return (
    reason.includes('جزاء') ||
    reason.includes('خصم') ||
    reason.includes('تأخير') ||
    reason.includes('غياب') ||
    reason.includes('زي') ||
    reason.includes('عهدة') ||
    reason.includes('إهمال')
  );
}
