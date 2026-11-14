import { DebugErrorLog } from '../../../services/errorLogger';

export interface TokenInspectResult {
  isExpired: boolean;
  label: string;
  details: string;
}

/** Decodes a Base64 string safely across React Native / Hermes runtimes. */
export function decodeBase64Safe(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  const str = input.replace(/=+$/, '');
  let output = '';
  if (str.length % 4 === 1) return '';
  let bc = 0;
  let bs = 0;
  for (let idx = 0; idx < str.length; idx++) {
    const char = str.charAt(idx);
    const b = chars.indexOf(char);
    if (b === -1) continue;
    bs = bc % 4 ? bs * 64 + b : b;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }
  return output;
}

/** Extracts expiration status and human-readable label from a stored JWT token. */
export function inspectJwt(token: string | null): TokenInspectResult {
  if (!token) {
    return { isExpired: true, label: 'غير متوفر', details: 'لا يوجد توكن مخزن' };
  }
  try {
    const parts = token.split('.');
    if (parts.length < 2) {
      return { isExpired: false, label: 'نشط', details: 'توكن قياسي' };
    }
    const jsonStr = decodeBase64Safe(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(jsonStr);
    if (!payload.exp) {
      return { isExpired: false, label: 'دائم', details: 'بدون تاريخ انتهاء' };
    }
    const expMs = payload.exp * 1000;
    const isExpired = Date.now() >= expMs;
    const expDate = new Date(expMs);
    const timeStr = expDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return {
      isExpired,
      label: isExpired ? 'منتهي الصلاحية' : 'نشط وصالح',
      details: isExpired ? `انتهى في (${timeStr})` : `ينتهي في (${timeStr})`,
    };
  } catch {
    return { isExpired: false, label: 'نشط', details: 'صالح' };
  }
}

/** Formats a single error log entry into a shareable text report. */
export function formatSingleLogText(l: DebugErrorLog): string {
  let out = `• المصدر (Source): ${l.source}\n`;
  out += `• التوقيت: ${new Date(l.timestamp).toLocaleString('ar-EG')}\n`;
  out += `• الرسالة: ${l.message}\n`;
  if (l.details) {
    try {
      out += `• تفاصيل إضافية: ${typeof l.details === 'string' ? l.details : JSON.stringify(l.details, null, 2)}\n`;
    } catch {
      out += `• تفاصيل إضافية: ${String(l.details)}\n`;
    }
  }
  if (l.stack) {
    out += `• المسار الفني (Stack Trace):\n${l.stack}\n`;
  }
  return out;
}

/** Builds the complete diagnostics summary report for clipboard/share export. */
export function buildFullDiagnosticsReport(
  systemInfo: Record<string, any>,
  tokenInfo: TokenInspectResult,
  hasRefreshToken: boolean,
  logs: DebugErrorLog[],
  apiBaseUrl: string
): string {
  let reportText = `📋 [تقرير تشخيص وأخطاء AAMS الشامل لإرساله للأجينت]\n`;
  reportText += `تاريخ التقرير: ${new Date().toLocaleString('ar-EG')}\n`;
  reportText += `إصدار التطبيق: ${systemInfo.appVersion || '1.0.0'}\n`;
  reportText += `الجهاز: ${systemInfo.brand || ''} ${systemInfo.modelName || ''} (${systemInfo.platform} v${systemInfo.platformVersion || ''})\n`;
  reportText += `حالة التوكن: ${tokenInfo.label} (${tokenInfo.details})\n`;
  reportText += `رمز التحديث (Refresh Token): ${hasRefreshToken ? 'متوفر' : 'غير متوفر'}\n`;
  reportText += `رابط السيرفر: ${apiBaseUrl}\n`;
  reportText += `إجمالي الأخطاء المسجلة: ${logs.length}\n`;
  reportText += `====================================\n\n`;

  if (logs.length === 0) {
    reportText += `لا توجد أخطاء مسجلة حالياً، التطبيق يعمل باستقرار تام.\n`;
  } else {
    logs.forEach((l, idx) => {
      reportText += `🔴 الخطأ (${idx + 1} من ${logs.length}):\n`;
      reportText += formatSingleLogText(l);
      reportText += `------------------------------------\n\n`;
    });
  }
  return reportText;
}

/** Filters logged errors by category chip selection. */
export function filterDiagnosticLogs(
  logs: DebugErrorLog[],
  logFilter: 'ALL' | 'CRASH' | 'NETWORK'
): DebugErrorLog[] {
  if (logFilter === 'CRASH') {
    return logs.filter((l) => l.source === 'UNHANDLED_EXCEPTION' || l.source === 'REACT_ERROR_BOUNDARY');
  }
  if (logFilter === 'NETWORK') {
    return logs.filter((l) => l.source === 'API_NETWORK' || l.source === 'PROMISE_REJECTION');
  }
  return logs;
}

/** Maps error log source category to its badge accent color. */
export function getSourceBadgeColor(source: DebugErrorLog['source']): string {
  switch (source) {
    case 'UNHANDLED_EXCEPTION':
      return '#ef4444';
    case 'REACT_ERROR_BOUNDARY':
      return '#dc2626';
    case 'GPS_TRACKING':
      return '#f59e0b';
    case 'API_NETWORK':
      return '#3b82f6';
    case 'OTA_UPDATES':
      return '#8b5cf6';
    default:
      return '#6b7280';
  }
}
