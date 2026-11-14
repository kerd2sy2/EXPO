import { Language } from '../../../types/delegate';

export type ViolationFilter = 'ALL' | 'RECORDED' | 'DEDUCTED' | 'PAID';

export interface ViolationStatusBadge {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: 'alert-circle-outline' | 'remove-circle-outline' | 'help-circle-outline' | 'checkmark-circle-outline' | 'information-circle-outline';
}

/** Returns styling and localized label for a violation status badge. */
export function getViolationStatusBadge(status: string, isDark: boolean, t: any): ViolationStatusBadge {
  switch (status) {
    case 'RECORDED':
      return {
        label: t.violationStatusRecorded || 'مسجلة',
        bg: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
        text: isDark ? '#FCD34D' : '#D97706',
        border: isDark ? 'rgba(245, 158, 11, 0.4)' : '#FDE68A',
        icon: 'alert-circle-outline',
      };
    case 'DEDUCTED':
      return {
        label: t.violationStatusDeducted || 'تم الخصم',
        bg: isDark ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
        text: isDark ? '#FCA5A5' : '#DC2626',
        border: isDark ? 'rgba(239, 68, 68, 0.4)' : '#FECACA',
        icon: 'remove-circle-outline',
      };
    case 'DISPUTED':
      return {
        label: t.violationStatusDisputed || 'معترض عليها',
        bg: isDark ? 'rgba(139, 92, 246, 0.2)' : '#EDE9FE',
        text: isDark ? '#C4B5FD' : '#7C3AED',
        border: isDark ? 'rgba(139, 92, 246, 0.4)' : '#DDD6FE',
        icon: 'help-circle-outline',
      };
    case 'PAID':
      return {
        label: t.violationStatusPaid || 'مسددة',
        bg: isDark ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
        text: isDark ? '#6EE7B7' : '#059669',
        border: isDark ? 'rgba(16, 185, 129, 0.4)' : '#A7F3D0',
        icon: 'checkmark-circle-outline',
      };
    default:
      return {
        label: status,
        bg: isDark ? 'rgba(107, 114, 128, 0.2)' : '#F3F4F6',
        text: isDark ? '#9CA3AF' : '#4B5563',
        border: isDark ? 'rgba(107, 114, 128, 0.4)' : '#E5E7EB',
        icon: 'information-circle-outline',
      };
  }
}

/** Formats an ISO violation date into the selected locale short date format. */
export function formatViolationDate(dateStr?: string, lang: Language = 'ar'): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.split('T')[0];
    const locale = lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : lang === 'ur' ? 'ur-PK' : 'en-US';
    return d.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr.split('T')[0];
  }
}
