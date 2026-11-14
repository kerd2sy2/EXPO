import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { CustodyDayData } from '../../services/custodyService';

export const STORAGE_SELECTED_DATE_KEY = '@custody_last_selected_date';

export const getDaysCacheKey = (branchId: string | null) =>
  `aams_custody_days_cache_${branchId || 'default'}`;

export const getLogsCacheKey = (branchId: string | null, date: string) =>
  `aams_custody_logs_cache_${branchId || 'default'}_${date}`;

// Categories ordered according to user priority:
// بنزين -> سلفة نت -> سلفة شخصية -> رخصة قيادة -> قطع غيار -> مصاريف أخرى
export const CATEGORIES = [
  { key: 'fuel', label: 'بنزين', icon: 'speedometer-outline', color: '#047857', bg: '#ecfdf5' },
  { key: 'internet_advance', label: 'سلفة نت', icon: 'wifi-outline', color: '#0284c7', bg: '#f0f9ff' },
  { key: 'advance', label: 'سلفة شخصية', icon: 'person-add-outline', color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'license', label: 'رخصة القيادة', icon: 'card-outline', color: '#2563eb', bg: '#eff6ff' },
  { key: 'spare_parts', label: 'قطع غيار', icon: 'build-outline', color: '#d97706', bg: '#fffbeb' },
  { key: 'other', label: 'مصاريف أخرى', icon: 'receipt-outline', color: '#059669', bg: '#ecfdf5' },
];

export const getTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const stepDateStr = (dateStr: string, delta: number): string => {
  const parts = (dateStr || '').split('-').map(Number);
  if (parts.length === 3 && !parts.some(isNaN)) {
    const [y, m, d] = parts;
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + delta);
    return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(
      dateObj.getDate()
    ).padStart(2, '0')}`;
  }
  const current = new Date(dateStr);
  current.setDate(current.getDate() + delta);
  return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(
    current.getDate()
  ).padStart(2, '0')}`;
};

export const extractUserBranchId = (user: any): string | null => {
  if (!user) return null;
  return (
    user.branch_id ||
    user.admin?.branch_id ||
    user.employee?.branch_id ||
    user.user?.branch_id ||
    null
  );
};

export const resolveBranchFallbackName = (branchId: string | null | undefined, userBranchName?: string | null): string | null => {
  if (branchId === '33b1e65f-074c-4c51-af38-32e13c1fb9a6') return 'الفرع الثاني';
  if (branchId === '0b52c83c-4a37-4950-8040-fcb00fa718b3') return 'الفرع الأول';
  return userBranchName || null;
};

/**
 * Merges a server-returned CustodyDayData into state immediately (0ms UI reflection)
 * and persists the updated array to AsyncStorage.
 */
export const mergeUpdatedCustodyDay = (
  prevDays: CustodyDayData[],
  updatedDay: CustodyDayData | null | undefined,
  branchId: string | null,
  fallbackLedgerUrl?: string | null
): CustodyDayData[] => {
  if (!updatedDay || !updatedDay.id || !updatedDay.date) {
    return prevDays;
  }
  const normalizedDay: CustodyDayData = fallbackLedgerUrl && !updatedDay.ledger_image_url
    ? { ...updatedDay, ledger_image_url: fallbackLedgerUrl }
    : updatedDay;

  const exists = prevDays.some((d) => d.id === normalizedDay.id || d.date === normalizedDay.date);
  const nextDays = exists
    ? prevDays.map((d) => (d.id === normalizedDay.id || d.date === normalizedDay.date ? normalizedDay : d))
    : [normalizedDay, ...prevDays].sort((a, b) => b.date.localeCompare(a.date));

  AsyncStorage.setItem(getDaysCacheKey(branchId), JSON.stringify(nextDays)).catch(() => {});
  return nextDays;
};

/**
 * Resizes and compresses picked invoice photos so multi-megabyte camera captures
 * shrink to ~120-200 KB before upload, cutting invoice save latency from ~10s to <1s.
 */
export const compressPickedImage = async (uri: string): Promise<string> => {
  try {
    const manipulated = await manipulateAsync(
      uri,
      [{ resize: { width: 1280 } }],
      { compress: 0.72, format: SaveFormat.JPEG }
    );
    return manipulated?.uri || uri;
  } catch {
    return uri;
  }
};

export const ahdaHomeStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedHeaderWrap: {
    width: '100%',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
});
