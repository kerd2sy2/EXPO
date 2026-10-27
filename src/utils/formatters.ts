// Helper utility to convert English numerals (0-9) to Eastern Arabic numerals (٠-٩)

const ARABIC_DIGITS: { [key: string]: string } = {
  '0': '٠',
  '1': '١',
  '2': '٢',
  '3': '٣',
  '4': '٤',
  '5': '٥',
  '6': '٦',
  '7': '٧',
  '8': '٨',
  '9': '٩',
};

/**
 * Converts any number or string containing Latin numerals (0-9) into Eastern Arabic numerals (٠-٩).
 */
export function toArabicDigits(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str.replace(/[0-9]/g, (digit) => ARABIC_DIGITS[digit] || digit);
}

/**
 * Formats a number with comma separators / decimals and converts to Eastern Arabic numerals.
 * Ensures fractions (هللات) are NEVER omitted if they exist (decimals >= 2).
 */
export function formatArabicNumber(
  value: number | string | null | undefined,
  decimals: number = 2
): string {
  if (value === null || value === undefined) return toArabicDigits('٠');
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return toArabicDigits('٠');

  // Check if number has fractional halalas (e.g., 150.5, 0.25)
  const hasFractions = Math.abs(num % 1) > 0.0001;

  // If there are fractions, force at least 2 decimal places so halalas are always clearly shown
  const effectiveDecimals = hasFractions ? Math.max(decimals, 2) : decimals;

  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: effectiveDecimals,
    maximumFractionDigits: effectiveDecimals,
  });

  return toArabicDigits(formatted);
}

/**
 * Formats date/time string to Arabic numerals
 */
export function formatArabicDateTime(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return toArabicDigits(dateStr.toString());

  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'م' : 'ص';
  const formattedHours = hours % 12 || 12;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

  const day = d.getDate();
  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const timePart = `${toArabicDigits(formattedHours)}:${toArabicDigits(formattedMinutes)} ${ampm}`;
  const datePart = `${toArabicDigits(year)}/${toArabicDigits(month)}/${toArabicDigits(day)}`;

  return `${datePart} ${timePart}`;
}

/**
 * Extracts only the first and second names from a full name,
 * with intelligent support for compound Arabic names (e.g. عبد الله, أبو بكر).
 */
export function getFirstTwoNames(fullName: string | null | undefined): string {
  if (!fullName) return '';
  const clean = fullName.trim().replace(/\s+/g, ' ');
  if (!clean) return '';

  const parts = clean.split(' ').filter(Boolean);
  if (parts.length <= 2) return clean;

  const prefixes = ['عبد', 'أبو', 'ابو', 'أم', 'ام', 'ابن', 'بن', 'آل'];

  let count = 0;
  const result: string[] = [];

  for (let i = 0; i < parts.length && count < 2; i++) {
    result.push(parts[i]);
    if (prefixes.includes(parts[i]) && i + 1 < parts.length) {
      i++;
      result.push(parts[i]);
    }
    count++;
  }

  return result.join(' ');
}

