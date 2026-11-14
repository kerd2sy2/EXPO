import { EmployeeProfile, WorkSession, Language } from '../../../types/delegate';

export const EMERGENCY_PHONE = '0500626432';
export const EMERGENCY_PHONE_INTL = '966500626432';

/** Formats the full emergency accident WhatsApp/SMS alert body with GPS coordinates. */
export function buildEmergencyAccidentMessage(
  employee: EmployeeProfile | null,
  activeSession: WorkSession | null | undefined,
  lat: number | null,
  lng: number | null,
  accuracy: number | null,
  lang: Language
): string {
  const nowStr = new Date().toLocaleString(lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : 'en-US');
  const empName = employee?.name || 'غير محدد';
  const empPhone = employee?.phone || '—';
  const empId = employee?.national_id || '—';
  const bikePlate = activeSession?.motorcycle_number || employee?.motorcycle_number || '—';
  const keyNum = employee?.key_number || '—';
  const branchName = employee?.branch_name || '—';

  let mapsUrl = '';
  let locText = 'تعذر التقاط الموقع بدقة';
  if (lat && lng) {
    mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
    locText = `${lat.toFixed(6)}, ${lng.toFixed(6)} (دقة: ${accuracy || 5}م)`;
  }

  return `🚨 *بلاغ طوارئ وحادث مندوب عاجل* 🚨
━━━━━━━━━━━━━━━━━━━━
👤 *اسم المندوب:* ${empName}
📱 *هاتف المندوب:* ${empPhone}
🆔 *رقم الهوية:* ${empId}
🛵 *رقم الدباب:* ${bikePlate}
🔑 *رقم المفتاح:* ${keyNum}
🏢 *الفرع:* ${branchName}

📍 *الموقع الجغرافي الدقيق:*
${locText}

🗺️ *رابط خرائط جوجل للموقع مباشرة:*
${mapsUrl ? mapsUrl : 'https://maps.google.com'}

⏰ *وقت البلاغ:* ${nowStr}
━━━━━━━━━━━━━━━━━━━━
⚠️ *يرجى التوجه فوراً أو تقديم المساعدة والدعم للمندوب!*`;
}

/** Builds a concise WhatsApp emergency message when resending previously captured GPS coordinates. */
export function buildResendAccidentMessage(
  employee: EmployeeProfile | null,
  activeSession: WorkSession | null | undefined,
  gpsData: { lat: number; lng: number },
  lang: Language
): string {
  const nowStr = new Date().toLocaleString(lang === 'ar' ? 'ar-SA' : lang === 'bn' ? 'bn-BD' : 'en-US');
  const mapsUrl = `https://www.google.com/maps?q=${gpsData.lat},${gpsData.lng}`;
  return `🚨 *بلاغ طوارئ وحادث مندوب عاجل* 🚨
👤 المندوب: ${employee?.name || ''}
📱 الهاتف: ${employee?.phone || ''}
🛵 الدباب: ${activeSession?.motorcycle_number || employee?.motorcycle_number || ''}
📍 الموقع: ${mapsUrl}
⏰ الوقت: ${nowStr}`;
}
