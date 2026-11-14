/**
 * Converts a Date or ISO timestamp into YYYY-MM-DD in Asia/Riyadh timezone (UTC+3).
 */
export function toRiyadhDateKey(input?: string | Date | null): string {
  if (!input) return '';
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Riyadh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const formatted = formatter.format(d);
    if (/^\d{4}-\d{2}-\d{2}$/.test(formatted)) {
      return formatted;
    }
    const ksaMs = d.getTime() + 3 * 60 * 60 * 1000;
    return new Date(ksaMs).toISOString().slice(0, 10);
  } catch {
    try {
      const d = input instanceof Date ? input : new Date(input);
      if (Number.isNaN(d.getTime())) return '';
      return new Date(d.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }
}

export function getTodayRiyadhDateKey(): string {
  return toRiyadhDateKey(new Date());
}

const RIYADH_OFFSET_MS = 3 * 60 * 60 * 1000;
const OPERATIONAL_CUTOFF_HOUR = 10;

/**
 * Returns the active operational day window [startMs, endMs) matching backend getOperationalWindow
 * (Asia/Riyadh 10:00 AM cut-off: before 10:00 AM, shifts started yesterday belong to today's operational day).
 */
export function getOperationalWindowRiyadh(now: Date = new Date()): {
  startMs: number;
  endMs: number;
  operationalDateKey: string;
} {
  const ksaNow = new Date(now.getTime() + RIYADH_OFFSET_MS);
  const year = ksaNow.getUTCFullYear();
  const month = ksaNow.getUTCMonth();
  const day = ksaNow.getUTCDate();
  const hour = ksaNow.getUTCHours();

  if (hour < OPERATIONAL_CUTOFF_HOUR) {
    const startUtc = Date.UTC(year, month, day - 1, 0, 0, 0, 0);
    const endUtc = Date.UTC(year, month, day, OPERATIONAL_CUTOFF_HOUR, 0, 0, 0);
    return {
      startMs: startUtc - RIYADH_OFFSET_MS,
      endMs: endUtc - RIYADH_OFFSET_MS,
      operationalDateKey: new Date(startUtc).toISOString().slice(0, 10),
    };
  }

  const startUtc = Date.UTC(year, month, day, 0, 0, 0, 0);
  const endUtc = Date.UTC(year, month, day + 1, OPERATIONAL_CUTOFF_HOUR, 0, 0, 0);
  return {
    startMs: startUtc - RIYADH_OFFSET_MS,
    endMs: endUtc - RIYADH_OFFSET_MS,
    operationalDateKey: new Date(startUtc).toISOString().slice(0, 10),
  };
}

/**
 * Checks whether a shift's start timestamp (falling back to end timestamp) falls inside the current
 * Asia/Riyadh operational day window.
 */
export function isInCurrentOperationalDay(
  startIso?: string | null,
  endIso?: string | null,
  now: Date = new Date()
): boolean {
  const refIso = startIso || endIso;
  if (!refIso) return false;
  try {
    const refMs = new Date(refIso).getTime();
    if (Number.isNaN(refMs)) return false;
    const { startMs, endMs } = getOperationalWindowRiyadh(now);
    return refMs >= startMs && refMs < endMs;
  } catch {
    return false;
  }
}

export function formatRiyadhTimeShort(iso?: string): string {
  if (!iso) return '--:--';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('ar-SA', {
      timeZone: 'Asia/Riyadh',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--:--';
  }
}
