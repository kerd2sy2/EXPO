import { API_BASE_URL } from '../../../services/api';

/** Resolves a relative upload path or absolute URI into a displayable odometer photo URL. */
export function formatShiftDocUrl(url?: string): string | null {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const cleanUrl = url.replace(/^\/+/, '');
  if (cleanUrl.startsWith('uploads/')) {
    return `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/${cleanUrl}`;
  }
  return `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/uploads/${cleanUrl}`;
}
