import { EmployeeProfile } from '../types/delegate';

export const CACHED_ACTIVE_SESSION_KEY = '@aams_cached_active_session';
export const CACHED_HISTORY_SESSIONS_KEY = '@aams_cached_history_sessions';

export function checkHasEshrafAccess(payload: any): boolean {
  const userRole = String(
    payload?.admin?.role ||
      payload?.employee?.job_role ||
      payload?.employee?.role ||
      payload?.role ||
      payload?.job_role ||
      ''
  ).toUpperCase();
  const perms: string[] = Array.isArray(payload?.permissions)
    ? payload.permissions
    : Array.isArray(payload?.admin?.permissions)
    ? payload.admin.permissions
    : [];

  return (
    userRole === 'SUPER_ADMIN' ||
    userRole === 'OWNER' ||
    userRole === 'GENERAL_MANAGER' ||
    payload?.app_permissions?.eshraf === true ||
    payload?.admin?.app_permissions?.eshraf === true ||
    perms.includes('*') ||
    perms.includes('apps.eshraf') ||
    perms.includes('app.eshraf') ||
    perms.includes('work.view') ||
    perms.includes('work.start') ||
    (!payload?.permissions_configured && (userRole === 'SUPERVISOR' || userRole === 'ADMIN')) ||
    userRole === 'SUPERVISOR' ||
    userRole === 'ADMIN'
  );
}

export function mapLoginResponseToEmployee(loginResp: any): EmployeeProfile | null {
  if (loginResp?.admin) {
    return {
      id: loginResp.admin.id,
      name: loginResp.admin.name,
      role: loginResp.admin.role,
      job_role: loginResp.admin.role,
      phone: loginResp.admin.phone,
      branch_id: loginResp.admin.branch_id,
      branch_name: loginResp.admin.branch_name,
      permissions: loginResp.admin.permissions || [],
      app_permissions: loginResp.admin.app_permissions,
      is_admin: true,
      personal_image:
        loginResp.admin.personal_image ||
        loginResp.admin.avatar ||
        loginResp.admin.google_avatar ||
        loginResp.admin.photo ||
        loginResp.admin.employee?.personal_image ||
        '',
      avatar:
        loginResp.admin.avatar ||
        loginResp.admin.google_avatar ||
        loginResp.admin.personal_image ||
        '',
      employee_id: loginResp.admin.employee_id || '',
    } as EmployeeProfile;
  }
  return loginResp?.employee || (loginResp?.id ? loginResp : null);
}

export function mergeEmployeeWithFresh(
  base: Partial<EmployeeProfile> | null | undefined,
  fresh: Partial<EmployeeProfile>
): EmployeeProfile {
  return {
    ...(base || {}),
    ...fresh,
    personal_image: fresh.personal_image || base?.personal_image || '',
    motorcycle_number: fresh.motorcycle_number || base?.motorcycle_number || '',
    key_number: fresh.key_number || base?.key_number || '',
    national_id: fresh.national_id || base?.national_id || '',
    national_id_image: fresh.national_id_image || base?.national_id_image || '',
    driving_license_image: fresh.driving_license_image || base?.driving_license_image || '',
    passport_image: fresh.passport_image || base?.passport_image || '',
    vehicle_registration_image: fresh.vehicle_registration_image || base?.vehicle_registration_image || '',
    employee_number: fresh.employee_number || base?.employee_number || '',
    phone: fresh.phone || base?.phone || '',
    branch_name: fresh.branch_name || base?.branch_name || '',
  } as EmployeeProfile;
}
