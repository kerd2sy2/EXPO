/** Converts Arabic numerals to ASCII Western digits. */
export const normalizeArabicDigits = (str: string): string => {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => `${arabicDigits.indexOf(w)}`);
};

/** Normalizes any Saudi mobile phone representation into 05XXXXXXXX format. */
export const normalizeSaudiPhone = (raw: string): string => {
  let cleaned = normalizeArabicDigits(raw).trim();
  cleaned = cleaned.replace(/[\s\-\(\)]/g, '');

  if (cleaned.startsWith('+966')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('00966')) {
    cleaned = '0' + cleaned.slice(5);
  } else if (cleaned.startsWith('966')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.length === 9 && cleaned.startsWith('5')) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
};

/** Validates whether a phone input normalizes to a valid 10-digit Saudi mobile number. */
export const isValidSaudiPhone = (raw: string): boolean => {
  const normalized = normalizeSaudiPhone(raw);
  return /^05[0-9]{8}$/.test(normalized);
};
