import { AccountStatus } from '../../../types/target';

export function getIdentifierStatusBadge(status: string, isDarkMode: boolean) {
  switch (status) {
    case 'TARGET_ACHIEVED':
      return { bg: '#dbeafe', text: '#1d4ed8', label: 'حقق التارچت' };
    case 'ON_TRACK':
      return { bg: '#dcfce7', text: '#15803d', label: 'يسير بالمعدل المطلوب' };
    case 'AT_RISK':
      return {
        bg: isDarkMode ? 'rgba(245, 158, 11, 0.22)' : '#fef3c7',
        text: isDarkMode ? '#fbbf24' : '#b45309',
        label: 'على وشك المعدل',
      };
    case 'BEHIND_TARGET':
    default:
      return { bg: '#fee2e2', text: '#b91c1c', label: 'متأخر عن التارچت' };
  }
}

export function getIdentifierPlatformKey(
  name?: string,
  code?: string,
  appName?: string
): 'keeta' | 'ninja' | 'toyou' {
  const app = (appName || '').trim().toLowerCase();
  if (app.includes('ninja') || app.includes('نينجا')) return 'ninja';
  if (app.includes('toyou') || app.includes('to you') || app.includes('تويو')) return 'toyou';
  if (app.includes('keeta') || app.includes('كيتا') || app.includes('كينتا')) return 'keeta';

  const str = `${name || ''} ${code || ''}`.toLowerCase();
  if (str.includes('ninja') || str.includes('نينجا')) return 'ninja';
  if (str.includes('toyou') || str.includes('to you') || str.includes('تويو')) return 'toyou';
  return 'keeta';
}

export function formatIdentifierTitleName(name?: string): string {
  if (!name) return '';
  return name.replace(/\s*\((كيتا|نينجا|تويو|كينتا|Keeta|Ninja|Toyou)\)/gi, '').trim();
}

export function getAccountStatusInfo(status: AccountStatus | undefined, isDarkMode: boolean) {
  switch (status) {
    case 'SUSPENDED_TEMP':
      return {
        title: 'موقوف مؤقتاً',
        badgeText: 'موقوف مؤقتاً',
        bg: isDarkMode ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7',
        border: isDarkMode ? '#b45309' : '#fde68a',
        text: isDarkMode ? '#fbbf24' : '#b45309',
        desc: 'هذا الحساب موقوف مؤقتاً عن العمل، ولن يتم احتساب نشاطه حتى تقوم الإدارة بإعادة استئناف العمل.',
      };
    case 'SUSPENDED_PERM':
      return {
        title: 'موقوف نهائياً',
        badgeText: 'موقوف نهائياً',
        bg: isDarkMode ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2',
        border: isDarkMode ? '#b91c1c' : '#fecaca',
        text: isDarkMode ? '#f87171' : '#dc2626',
        desc: 'هذا الحساب موقوف نهائياً؛ ولن يتم ربط أو إضافة أي طلبات جديدة لهذا المعرف في المستقبل.',
      };
    case 'ACTIVE':
    default:
      return {
        title: 'نشط',
        badgeText: 'نشط وقيد العمل',
        bg: isDarkMode ? 'rgba(16, 185, 129, 0.18)' : '#ecfdf5',
        border: isDarkMode ? '#059669' : '#a7f3d0',
        text: isDarkMode ? '#34d399' : '#047857',
        desc: 'الحساب نشط ويستقبل الطلبات وتُحتسب إنجازاته بشكل طبيعي في التارچت والإحصائيات.',
      };
  }
}
