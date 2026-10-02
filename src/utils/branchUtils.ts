import { Language } from '../types/delegate';
import { translations } from '../constants/translations';

/**
 * Localizes backend branch names (e.g. "الفرع الأول", "الفرع الثاني", "الفرع الرئيسي")
 * across Arabic, English, Bengali, and Urdu.
 */
export const formatBranchName = (branchName?: string | null, lang: Language = 'ar'): string => {
  if (!branchName) return '—';
  const trimmed = branchName.trim();
  const t = translations[lang] || translations.ar;

  // First Branch
  if (
    trimmed.includes('الأول') ||
    trimmed.includes('الاول') ||
    trimmed.includes('1') ||
    trimmed.toLowerCase().includes('first')
  ) {
    return t.firstBranch || 'الفرع الأول (فرع 1)';
  }

  // Second Branch
  if (
    trimmed.includes('الثاني') ||
    trimmed.includes('الثاني') ||
    trimmed.includes('2') ||
    trimmed.toLowerCase().includes('second')
  ) {
    return t.secondBranch || 'الفرع الثاني (فرع 2)';
  }

  // Main Branch
  if (
    trimmed.includes('الرئيسي') ||
    trimmed.includes('الرئيسيه') ||
    trimmed.toLowerCase().includes('main')
  ) {
    return t.mainBranch || 'الفرع الرئيسي';
  }

  return trimmed;
};
