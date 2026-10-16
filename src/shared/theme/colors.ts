export interface ThemeColors {
  bg: string;
  card: string;
  cardHeader: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  primary: string;
  primaryLight: string;
  primaryText: string;
  accent: string;
  accentLight: string;
  inputBg: string;
  inputBorder: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  errorBg: string;
  errorText: string;
}

export const lightTheme: ThemeColors = {
  bg: '#f8fafc',
  card: '#ffffff',
  cardHeader: '#f1f5f9',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  primary: '#0284c7',
  primaryLight: '#f0f9ff',
  primaryText: '#ffffff',
  accent: '#0284c7',
  accentLight: '#f0f9ff',
  inputBg: '#ffffff',
  inputBorder: '#cbd5e1',
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  warningText: '#b45309',
  errorBg: '#fef2f2',
  errorText: '#dc2626',
};

export const darkTheme: ThemeColors = {
  bg: '#0f172a',
  card: '#1e293b',
  cardHeader: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  border: '#334155',
  primary: '#38bdf8',
  primaryLight: '#082f49',
  primaryText: '#ffffff',
  accent: '#38bdf8',
  accentLight: '#082f49',
  inputBg: '#1e293b',
  inputBorder: '#475569',
  warningBg: '#451a03',
  warningBorder: '#78350f',
  warningText: '#fcd34d',
  errorBg: '#450a0a',
  errorText: '#fca5a5',
};

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
