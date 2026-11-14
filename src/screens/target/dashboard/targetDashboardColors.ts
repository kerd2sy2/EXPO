import { ThemeColors } from '../../../types/delegate';

export function getTargetDashboardColors(
  isDarkMode: boolean,
  propColors?: ThemeColors
): ThemeColors {
  if (propColors) return propColors;
  return isDarkMode
    ? {
        bg: '#000000',
        card: '#16161a',
        cardHeader: '#202026',
        textPrimary: '#ffffff',
        textSecondary: '#9ca3af',
        border: '#27272e',
        primary: '#0284c7',
        primaryLight: 'rgba(2, 132, 199, 0.16)',
        primaryText: '#ffffff',
        accent: '#3b82f6',
        accentLight: 'rgba(59, 130, 246, 0.16)',
        inputBg: '#1a1a1f',
        inputBorder: '#27272e',
        warningBg: 'rgba(245, 158, 11, 0.15)',
        warningBorder: '#f59e0b',
        warningText: '#f59e0b',
        errorBg: 'rgba(239, 68, 68, 0.15)',
        errorText: '#ef4444',
      }
    : {
        bg: '#f8fafc',
        card: '#ffffff',
        cardHeader: '#f1f5f9',
        textPrimary: '#0f172a',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        primary: '#0284c7',
        primaryLight: 'rgba(2, 132, 199, 0.12)',
        primaryText: '#ffffff',
        accent: '#2563eb',
        accentLight: 'rgba(37, 99, 235, 0.12)',
        inputBg: '#f1f5f9',
        inputBorder: '#cbd5e1',
        warningBg: '#fef3c7',
        warningBorder: '#f59e0b',
        warningText: '#b45309',
        errorBg: '#fee2e2',
        errorText: '#b91c1c',
      };
}
