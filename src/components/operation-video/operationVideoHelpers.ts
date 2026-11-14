import { OperationVideo } from '../../services/supervisor';

export type DateFilterType = 'ALL' | 'TODAY' | 'WEEK';

/** Formats an ISO timestamp into a concise Arabic relative date label. */
export function formatVideoRelativeTime(iso?: string): string {
  if (!iso) return '---';
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'الآن';
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `منذ ${diffHrs} ساعة`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' });
  } catch {
    return '---';
  }
}

/** Filters archived operation videos by date window and text search query. */
export function filterOperationVideos(
  archiveVideos: OperationVideo[],
  searchQuery: string,
  filterType: DateFilterType
): OperationVideo[] {
  const q = searchQuery.trim().toLowerCase();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  return archiveVideos.filter((v) => {
    if (v.recorded_at) {
      const vDate = new Date(v.recorded_at).toISOString().slice(0, 10);
      if (filterType === 'TODAY' && vDate !== todayStr) {
        return false;
      }
      if (filterType === 'WEEK') {
        const diffDays = (now.getTime() - new Date(v.recorded_at).getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      }
    }

    if (!q) return true;
    const empMatch = v.employee_name?.toLowerCase().includes(q);
    const orderMatch = v.order_number?.toLowerCase().includes(q);
    const notesMatch = v.notes?.toLowerCase().includes(q);
    return empMatch || orderMatch || notesMatch;
  });
}
