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
