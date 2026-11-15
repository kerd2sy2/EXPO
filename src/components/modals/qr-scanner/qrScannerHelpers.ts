import { toEnglishDigits } from '@shared/utils/plateUtils';
import { DelegateWithStatus, supervisorApi } from '../../../services/supervisor';

type OpenListener = () => void;

const listeners = new Set<OpenListener>();

/** Opens the Delegate QR Scanner modal from anywhere (e.g., HomeHeader). */
export function openDelegateQrScanner(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch (err) {
      console.warn('[qrScannerHelpers] listener error:', err);
    }
  });
}

/** Subscribes to open requests for the Delegate QR Scanner modal. */
export function subscribeDelegateQrScanner(listener: OpenListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const UUID_REGEX =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

/** Extracts normalized lookup candidates from a scanned QR / barcode payload. */
export function extractQrCandidates(rawData: string): string[] {
  const candidates = new Set<string>();
  const addCandidate = (val?: unknown) => {
    if (typeof val !== 'string' && typeof val !== 'number') return;
    const trimmed = String(val).trim();
    if (!trimmed) return;
    candidates.add(trimmed);
    const eng = toEnglishDigits(trimmed);
    if (eng) candidates.add(eng);
  };

  let decoded = (rawData || '').trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep raw string when URI decoding is not applicable
  }

  addCandidate(decoded);

  if (decoded.startsWith('{') && decoded.endsWith('}')) {
    try {
      const parsed = JSON.parse(decoded);
      addCandidate(parsed?.id);
      addCandidate(parsed?.employee_id);
      addCandidate(parsed?.delegate_id);
      addCandidate(parsed?.national_id);
      addCandidate(parsed?.employee_number);
      addCandidate(parsed?.phone);
      addCandidate(parsed?.code);
    } catch {
      // Not valid JSON; continue with string extraction
    }
  }

  const uuidMatch = decoded.match(UUID_REGEX);
  if (uuidMatch?.[0]) {
    addCandidate(uuidMatch[0]);
  }

  // Handle prefixed QR / barcode tokens like QR-12345, EMP-12345, AAMS:uuid, or URLs
  const strippedPrefix = decoded.replace(/^(qr[-:]?|emp[-:]?|aams[-:]?)/i, '').trim();
  addCandidate(strippedPrefix);

  if (decoded.includes('/')) {
    const lastSegment = decoded.split('/').filter(Boolean).pop() || '';
    addCandidate(lastSegment.split('?')[0]);
  }

  return Array.from(candidates);
}

function findInList(list: DelegateWithStatus[], candidates: string[]): DelegateWithStatus | null {
  if (!Array.isArray(list) || list.length === 0 || candidates.length === 0) return null;
  const lowerSet = new Set(candidates.map((c) => c.toLowerCase()));
  const digitsSet = new Set(candidates.map((c) => toEnglishDigits(c).replace(/\D/g, '')).filter(Boolean));

  for (const emp of list) {
    const id = String(emp.id || '').trim().toLowerCase();
    const nid = toEnglishDigits(String(emp.national_id || '').trim());
    const empNo = toEnglishDigits(String(emp.employee_number || '').trim()).toLowerCase();
    const appId = toEnglishDigits(String(emp.application_id || '').trim()).toLowerCase();
    const phone = toEnglishDigits(String(emp.phone || '').replace(/\D/g, ''));

    if (id && lowerSet.has(id)) return emp;
    if (nid && (lowerSet.has(nid.toLowerCase()) || digitsSet.has(nid.replace(/\D/g, '')))) return emp;
    if (empNo && lowerSet.has(empNo)) return emp;
    if (appId && lowerSet.has(appId)) return emp;
    if (phone && digitsSet.has(phone)) return emp;
  }

  return null;
}

/** Resolves a scanned QR / barcode value to a delegate record. */
export async function resolveScannedDelegate(
  rawData: string,
  branchDelegates: DelegateWithStatus[]
): Promise<DelegateWithStatus | null> {
  const candidates = extractQrCandidates(rawData);
  if (candidates.length === 0) return null;

  const localMatch = findInList(branchDelegates, candidates);
  if (localMatch) return localMatch;

  // Fallback 1: load full employees list in case delegate was newly registered
  try {
    const allEmployees = await supervisorApi.getAllEmployees();
    const remoteListMatch = findInList(allEmployees, candidates);
    if (remoteListMatch) return remoteListMatch;
  } catch {
    // Ignore and try search endpoint
  }

  // Fallback 2: query search endpoint with non-UUID identifiers (national ID / code / phone)
  for (const candidate of candidates) {
    if (candidate.length < 3) continue;
    try {
      const results = await supervisorApi.searchDelegates(candidate);
      const match = findInList(results, candidates);
      if (match) return match;
    } catch {
      // Continue trying remaining candidates
    }
  }

  return null;
}
