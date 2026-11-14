import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { CustodyDayData } from '../custodyService';
import { formatImageUrl } from '../api';
import { SAUDI_RIYAL_SYMBOL_PNG_BASE64 } from '../saudiRiyalSymbolBase64';

const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
export const base64ToUint8Array = (b64: string): Uint8Array => {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  let bufferLength = b64.length * 0.75;
  if (b64[b64.length - 1] === '=') {
    bufferLength--;
    if (b64[b64.length - 2] === '=') bufferLength--;
  }
  const bytes = new Uint8Array(bufferLength);
  let p = 0;
  for (let i = 0; i < b64.length; i += 4) {
    const enc1 = chars.indexOf(b64[i]);
    const enc2 = chars.indexOf(b64[i + 1]);
    const enc3 = chars.indexOf(b64[i + 2]);
    const enc4 = chars.indexOf(b64[i + 3]);
    bytes[p++] = (enc1 << 2) | (enc2 >> 4);
    if (enc3 !== 64 && enc3 !== -1) bytes[p++] = ((enc2 & 15) << 4) | (enc3 >> 2);
    if (enc4 !== 64 && enc4 !== -1) bytes[p++] = ((enc3 & 3) << 6) | enc4;
  }
  return bytes;
};

const memoryImageCache = new Map<string, { bytes: Uint8Array; isJpg: boolean }>();

const getCacheFilenameForUrl = (url: string): string => {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash << 5) - hash + url.charCodeAt(i);
    hash |= 0;
  }
  const isPng = url.toLowerCase().includes('.png');
  return `${FileSystem.cacheDirectory}inv_cache_${Math.abs(hash)}.${isPng ? 'png' : 'jpg'}`;
};

export const evictImageCache = (url?: string): void => {
  if (!url) {
    memoryImageCache.clear();
    return;
  }
  memoryImageCache.delete(url);
  try {
    const formatted = formatImageUrl(url);
    if (formatted) {
      memoryImageCache.delete(formatted);
      FileSystem.deleteAsync(getCacheFilenameForUrl(formatted), { idempotent: true }).catch(() => {});
    }
  } catch (_) {}
};

export const fetchImageBytes = async (
  url: string,
  forceFresh = false
): Promise<{ bytes: Uint8Array; isJpg: boolean } | null> => {
  if (!url) return null;
  if (!forceFresh && memoryImageCache.has(url)) {
    return memoryImageCache.get(url)!;
  }
  try {
    const formatted = formatImageUrl(url);
    if (!formatted) return null;

    const isPng = formatted.toLowerCase().endsWith('.png');
    const isJpg = !isPng;

    const readNormalizedBytes = async (localPath: string): Promise<Uint8Array> => {
      try {
        const manip = await manipulateAsync(localPath, [], {
          compress: 0.88,
          format: isPng ? SaveFormat.PNG : SaveFormat.JPEG,
          base64: true,
        });
        if (manip.base64) return base64ToUint8Array(manip.base64);
      } catch (manipErr) {
        console.warn('[PDF] Failed to normalize image orientation via manipulator:', manipErr);
      }
      const b64 = await FileSystem.readAsStringAsync(localPath, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64ToUint8Array(b64);
    };

    if (formatted.startsWith('file://')) {
      const bytes = await readNormalizedBytes(formatted);
      const result = { bytes, isJpg };
      memoryImageCache.set(url, result);
      return result;
    }

    const diskPath = getCacheFilenameForUrl(formatted);
    if (!forceFresh) {
      const fileInfo = await FileSystem.getInfoAsync(diskPath);
      if (fileInfo.exists && fileInfo.size > 0) {
        const bytes = await readNormalizedBytes(diskPath);
        const result = { bytes, isJpg };
        memoryImageCache.set(url, result);
        return result;
      }
    } else {
      await FileSystem.deleteAsync(diskPath, { idempotent: true }).catch(() => {});
      memoryImageCache.delete(url);
    }

    const downloadRes = await FileSystem.downloadAsync(formatted, diskPath);
    if (downloadRes.status !== 200) return null;

    const bytes = await readNormalizedBytes(diskPath);
    const result = { bytes, isJpg };
    memoryImageCache.set(url, result);
    return result;
  } catch (err) {
    console.warn('[PDF] Failed to download invoice image:', err);
    return null;
  }
};

let cachedRegularBytes: Uint8Array | null = null;
let cachedBoldBytes: Uint8Array | null = null;
let cachedLogoBytes: Uint8Array | null = null;
let cachedRiyalBytes: Uint8Array | null = null;

export const getFontRegularBytes = async (): Promise<Uint8Array> => {
  if (cachedRegularBytes) return cachedRegularBytes;
  const regularAsset = Asset.fromModule(require('../../../assets/fonts/Tahoma.ttf'));
  if (!regularAsset.localUri) await regularAsset.downloadAsync();
  const regularB64 = await FileSystem.readAsStringAsync(regularAsset.localUri || regularAsset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  cachedRegularBytes = base64ToUint8Array(regularB64);
  return cachedRegularBytes;
};

export const getFontBoldBytes = async (): Promise<Uint8Array> => {
  if (cachedBoldBytes) return cachedBoldBytes;
  const boldAsset = Asset.fromModule(require('../../../assets/fonts/Tahoma-Bold.ttf'));
  if (!boldAsset.localUri) await boldAsset.downloadAsync();
  const boldB64 = await FileSystem.readAsStringAsync(boldAsset.localUri || boldAsset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  cachedBoldBytes = base64ToUint8Array(boldB64);
  return cachedBoldBytes;
};

export const getLogoBytes = async (): Promise<Uint8Array | null> => {
  if (cachedLogoBytes) return cachedLogoBytes;
  try {
    const logoAsset = Asset.fromModule(require('../../../assets/images/logo.png'));
    if (!logoAsset.localUri) await logoAsset.downloadAsync();
    const logoB64 = await FileSystem.readAsStringAsync(logoAsset.localUri || logoAsset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    cachedLogoBytes = base64ToUint8Array(logoB64);
    return cachedLogoBytes;
  } catch {
    return null;
  }
};

export const getRiyalBytes = async (): Promise<Uint8Array | null> => {
  if (cachedRiyalBytes) return cachedRiyalBytes;
  try {
    cachedRiyalBytes = base64ToUint8Array(SAUDI_RIYAL_SYMBOL_PNG_BASE64);
    return cachedRiyalBytes;
  } catch {
    try {
      const riyalAsset = Asset.fromModule(require('../../../assets/Saudi_Riyal_Symbol.png'));
      if (!riyalAsset.localUri) await riyalAsset.downloadAsync();
      const riyalB64 = await FileSystem.readAsStringAsync(riyalAsset.localUri || riyalAsset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      cachedRiyalBytes = base64ToUint8Array(riyalB64);
      return cachedRiyalBytes;
    } catch {
      return null;
    }
  }
};

export async function invalidateCustodyPdfCache(dateStr?: string): Promise<void> {
  try {
    if (!FileSystem.documentDirectory) return;
    const cleanDate = dateStr ? String(dateStr).replace(/[^0-9-]/g, '_') : '';
    const files = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
    for (const f of files) {
      if (f.startsWith('custody_report_') && f.endsWith('.pdf')) {
        if (!cleanDate || f.includes(cleanDate)) {
          await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${f}`, { idempotent: true }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('[PDF] Failed to invalidate PDF cache:', err);
  }
}

export function getCustodyPdfCacheUri(day: CustodyDayData, customLedgerUrl?: string): string {
  const dateStr = String(day.date || '').replace(/[^0-9-]/g, '_');
  const count = (day.expenses || []).length;
  const total = Math.round(Number(day.total_expenses || 0) * 100);
  const added = Math.round(Number(day.added_amount || 0) * 100);
  const openBal = Math.round(Number(day.opening_balance || 0) * 100);

  const activeLedgerUrl = customLedgerUrl || day.ledger_image_url || '';
  let ledgerSig = '0';
  if (activeLedgerUrl) {
    let hash = 0;
    for (let i = 0; i < activeLedgerUrl.length; i++) {
      hash = (hash << 5) - hash + activeLedgerUrl.charCodeAt(i);
      hash |= 0;
    }
    ledgerSig = Math.abs(hash).toString(36);
  }

  return `${FileSystem.documentDirectory}custody_report_${dateStr}_c${count}_t${total}_a${added}_o${openBal}_l${ledgerSig}.pdf`;
}
