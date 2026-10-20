import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustodyDayData, CustodyExpenseItem } from '../services/custodyService';

const LAST_EXPORT_NUM_KEY = '@custody_last_export_number';

// Normalize Arabic digits to standard ASCII digits
export const normalizeDigits = (str: string): string => {
  if (!str) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
};

// Normalize Arabic letters and slashes for search comparison
export const normalizeForSearch = (str: string): string => {
  if (!str) return '';
  let s = normalizeDigits(str).trim().toLowerCase();
  // Normalize various slashes
  s = s.replace(/[\\|\-]/g, '/');
  // Remove multiple spaces or spaces around slash
  s = s.replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ');
  // Normalize Arabic letters (Alef with hamza, etc.)
  s = s.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي');
  return s;
};

// Parse an export number like "1/أ" or "2 / أ" or "أ/1" into { num: number, letter: string }
export const parseExportNumber = (
  raw?: string | null
): { num: number; letter: string } | null => {
  if (!raw) return null;
  const clean = normalizeDigits(raw).trim();
  if (!clean) return null;

  // Pattern 1: "1/أ" or "1 / أ"
  const m1 = clean.match(/^(\d+)\s*[/\\-]\s*([^\d\s/\\-]+)$/);
  if (m1) {
    return { num: parseInt(m1[1], 10), letter: m1[2].trim() };
  }

  // Pattern 2: "أ/1" (reverse order occasionally typed)
  const m2 = clean.match(/^([^\d\s/\\-]+)\s*[/\\-]\s*(\d+)$/);
  if (m2) {
    return { num: parseInt(m2[2], 10), letter: m2[1].trim() };
  }

  // Pattern 3: Just a number
  const m3 = clean.match(/^(\d+)$/);
  if (m3) {
    return { num: parseInt(m3[1], 10), letter: 'أ' };
  }

  return null;
};

/**
 * Automatically calculate the next sequence number (e.g. 1/أ -> 2/أ -> 3/أ)
 * based on all existing expenses in loaded days and local storage cache.
 */
export const calculateNextExportNumber = (
  days: CustodyDayData[],
  fallbackLetter: string = 'أ'
): string => {
  // 1. Gather all expenses from all loaded days
  const allExpenses: CustodyExpenseItem[] = [];
  for (const day of days) {
    if (Array.isArray(day.expenses)) {
      allExpenses.push(...day.expenses);
    }
  }

  // Find all expenses that have a valid export_number
  const parsedList: Array<{ num: number; letter: string; createdAt: string }> = [];
  for (const exp of allExpenses) {
    if (exp.export_number) {
      const parsed = parseExportNumber(exp.export_number);
      if (parsed) {
        parsedList.push({
          num: parsed.num,
          letter: parsed.letter,
          createdAt: exp.created_at || '',
        });
      }
    }
  }

  if (parsedList.length === 0) {
    return `1/${fallbackLetter}`;
  }

  // Determine the most recent letter used
  // Sort descending by created_at or use the last entry
  parsedList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  const currentLetter = parsedList[0]?.letter || fallbackLetter;

  // Find the highest sequence number for this specific letter
  let maxNum = 0;
  for (const item of parsedList) {
    if (item.letter === currentLetter) {
      if (item.num > maxNum) {
        maxNum = item.num;
      }
    }
  }

  return `${maxNum + 1}/${currentLetter}`;
};

/**
 * Checks if an export number matches a search query
 */
export const matchesExportNumberQuery = (
  query: string,
  exportNumber?: string | null
): boolean => {
  if (!query || !query.trim()) return false;
  if (!exportNumber || !exportNumber.trim()) return false;

  const normQuery = normalizeForSearch(query);
  const normExport = normalizeForSearch(exportNumber);

  if (normExport.includes(normQuery)) {
    return true;
  }

  // Also check if user typed just the number and it matches the number portion
  const parsedExport = parseExportNumber(exportNumber);
  const parsedQuery = parseExportNumber(query);

  if (parsedExport && parsedQuery) {
    return (
      parsedExport.num === parsedQuery.num &&
      normalizeForSearch(parsedExport.letter) === normalizeForSearch(parsedQuery.letter)
    );
  }

  if (parsedExport && /^\d+$/.test(normQuery)) {
    return String(parsedExport.num) === normQuery;
  }

  return false;
};

/**
 * Saves the last used export number to AsyncStorage
 */
export const saveLastUsedExportNumber = async (exportNumber: string): Promise<void> => {
  try {
    if (exportNumber && exportNumber.trim()) {
      await AsyncStorage.setItem(LAST_EXPORT_NUM_KEY, exportNumber.trim());
    }
  } catch (err) {
    console.warn('Failed to save last export number:', err);
  }
};
