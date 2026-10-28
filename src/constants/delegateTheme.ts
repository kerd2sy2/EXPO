import { Language, ThemeColors } from '../types/delegate';

export function getDelegateThemeColors(isDarkMode: boolean): ThemeColors {
  return isDarkMode
    ? {
        bg: '#000000',
        card: '#16161a',
        cardHeader: '#202026',
        textPrimary: '#ffffff',
        textSecondary: '#9ca3af',
        border: '#27272e',
        primary: '#f97316',
        primaryLight: 'rgba(249, 115, 22, 0.16)',
        primaryText: '#fb923c',
        accent: '#38bdf8',
        accentLight: 'rgba(56, 189, 248, 0.16)',
        inputBg: '#1c1c22',
        inputBorder: '#2e2e38',
        warningBg: 'rgba(234, 179, 8, 0.15)',
        warningBorder: 'rgba(234, 179, 8, 0.3)',
        warningText: '#fef08a',
        errorBg: 'rgba(239, 68, 68, 0.15)',
        errorText: '#fca5a5',
      }
    : {
        bg: '#f8fafc',
        card: '#ffffff',
        cardHeader: '#f1f5f9',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        primary: '#ea580c',
        primaryLight: '#fff7ed',
        primaryText: '#ea580c',
        accent: '#0284c7',
        accentLight: '#f0f9ff',
        inputBg: '#ffffff',
        inputBorder: '#cbd5e1',
        warningBg: '#fef9c3',
        warningBorder: '#facc15',
        warningText: '#854d0e',
        errorBg: '#fee2e2',
        errorText: '#ef4444',
      };
}

export function formatDelegateTimeStr(isoString?: string, lang: Language = 'ar'): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatDelegateDateStr(isoString?: string, lang: Language = 'ar'): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

