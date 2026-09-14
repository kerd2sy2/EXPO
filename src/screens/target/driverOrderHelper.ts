// Master sequence for drivers matching the official company Excel sheet
export const MASTER_DRIVERS_ORDER: string[] = [
  'لابون شندر',
  'هريدي',
  'محمد سليمان',
  'محمد سيد سالم',
  'صفات',
  'مكرم',
  'محمد اسامة',
  'سعيد',
  'جيهانغير',
  'مد روبل',
  'دلوار',
  'رقيب',
  'شوهاج',
  'ابو الخير',
  'ابو كوثر',
  'راجو',
  'تمال',
  'اكاش',
  'اسو عاشور',
  'اسلام عاطف',
  'ايمون',
  'جهيدال',
  'شوهيل الرحمن',
  'حماد حنيف',
  'شوهيل رانا',
  'منهاز',
  'محمد نيون',
  'علي رفعت',
  'محمود اوسين',
  'عمر فاروق',
  'نور زمان',
  'محبوب سردار',
  'مومن جمان',
  'اسماعيل حسين',
  'رياض',
  'حنيف',
  'عبيدول',
  'شهاب الدين',
  'راشد',
  'بشير خميس',
  'شوهان شيك',
  'بلال محمد',
  'رحمان يونس',
  'ابوسفيان',
  'غلام',
  'مصطفي عبد العال',
  'نور علم',
  'نهيد',
  'ميلون',
  'اشرفول',
  'فردين',
  'طارق الاسلام',
  'هايدر شيك',
  'محمد فيصل',
  'محمد وقاص',
  'مد منير',
  'محمد متولي',
  'شهادات',
  'غاجي شوهيل',
  'كريم الشريف',
  'عدنان',
  'مدرويل اوسين',
  'دلوار اوسين',
  'محمود اسماعيل',
  'إبراهيم خليل',
];

export function normalizeDriverName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/عبد\s+/g, 'عبد')
    .replace(/ابو\s+/g, 'ابو')
    .replace(/\s+/g, ' ');
}

// Pre-computed normalized lookup map for O(1) matching
const NORMALIZED_MASTER_MAP = new Map<string, number>();
MASTER_DRIVERS_ORDER.forEach((name, index) => {
  const norm = normalizeDriverName(name);
  NORMALIZED_MASTER_MAP.set(norm, index);
  // Also index without any spaces for high-tolerance matching
  const noSpace = norm.replace(/\s+/g, '');
  if (!NORMALIZED_MASTER_MAP.has(noSpace)) {
    NORMALIZED_MASTER_MAP.set(noSpace, index);
  }
});

export function getDriverMasterRank(name: string): number {
  if (!name) return 999999;
  const norm = normalizeDriverName(name);
  if (NORMALIZED_MASTER_MAP.has(norm)) {
    return NORMALIZED_MASTER_MAP.get(norm)!;
  }
  const noSpace = norm.replace(/\s+/g, '');
  if (NORMALIZED_MASTER_MAP.has(noSpace)) {
    return NORMALIZED_MASTER_MAP.get(noSpace)!;
  }
  // If not found in master sheet, return large number so it appears at the end
  return 999999;
}

export function sortDriversByMasterOrder<T extends { name: string }>(drivers: T[]): T[] {
  if (!Array.isArray(drivers)) return [];
  return [...drivers].sort((a, b) => {
    const rankA = getDriverMasterRank(a.name);
    const rankB = getDriverMasterRank(b.name);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    // If both are new / not in master list, keep alphabetical or appearance
    return (a.name || '').localeCompare(b.name || '', 'ar');
  });
}
