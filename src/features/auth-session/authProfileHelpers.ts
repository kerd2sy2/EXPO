import { EmployeeProfile } from '../../types/delegate';

export const isAdminOrSupervisorRole = (user: any): boolean =>
  Boolean(
    user &&
      (user.is_admin ||
        user.role === 'ADMIN' ||
        user.role === 'SUPERVISOR' ||
        user.role === 'SUPER_ADMIN')
  );

export const hasManadeebAppPermission = (user: any): boolean => {
  if (!user) return false;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (user.app_permissions?.manadeeb === false) {
    return false;
  }
  return (
    user.app_permissions?.manadeeb === true ||
    perms.includes('*') ||
    perms.includes('apps.manadeeb') ||
    perms.includes('app.manadeeb') ||
    perms.length === 0
  );
};

export const mergeEmployeeProfile = (
  base: Partial<EmployeeProfile> | null | undefined,
  fresh: EmployeeProfile
): EmployeeProfile =>
  ({
    ...(base || {}),
    ...fresh,
    motorcycle_number: fresh.motorcycle_number || base?.motorcycle_number || '',
    key_number: fresh.key_number || base?.key_number || '',
    national_id: fresh.national_id || base?.national_id || '',
    personal_image: fresh.personal_image || base?.personal_image || '',
    national_id_image: fresh.national_id_image || base?.national_id_image || '',
    driving_license_image: fresh.driving_license_image || base?.driving_license_image || '',
    passport_image: fresh.passport_image || base?.passport_image || '',
    vehicle_registration_image:
      fresh.vehicle_registration_image || base?.vehicle_registration_image || '',
    employee_number: fresh.employee_number || base?.employee_number || '',
    phone: fresh.phone || base?.phone || '',
    branch_name: fresh.branch_name || base?.branch_name || '',
  }) as EmployeeProfile;

export const mergeAfterAuthEmployee = (
  prev: EmployeeProfile | null,
  fresh: EmployeeProfile
): EmployeeProfile =>
  ({
    ...(prev || {}),
    ...fresh,
    personal_image: fresh.personal_image || prev?.personal_image || '',
    motorcycle_number: fresh.motorcycle_number || prev?.motorcycle_number || '',
    key_number: fresh.key_number || prev?.key_number || '',
    national_id: fresh.national_id || prev?.national_id || '',
    phone: fresh.phone || prev?.phone || '',
    branch_name: fresh.branch_name || prev?.branch_name || '',
  }) as EmployeeProfile;
