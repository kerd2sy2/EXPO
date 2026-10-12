export type Language = 'ar' | 'en';

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

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  username?: string;
  branch_id?: string;
  branch_name?: string;
}
