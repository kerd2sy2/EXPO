import { Linking, Alert } from 'react-native';

/**
 * Checks if a supervisor/user has permission to access the Custody (العهدة) portal/app.
 * Matches backend RBAC and Ohda app permission rules.
 */
export const hasCustodyPermission = (user: any): boolean => {
  if (!user) return false;

  // Google Reviewer test account / demo accounts pass naturally
  if (
    user.national_id === '1234596' ||
    user.employee_number === 'EMP-1234596' ||
    user.phone === '0500000000' ||
    user.phone === '500000000' ||
    user.email === 'kerd2sy@gmail.com' ||
    user.email === 'demo.driver@kerd2sy.com'
  ) {
    return true;
  }

  const role = String(user.role || user.job_role || user.role_name || '').toUpperCase();
  if (
    role === 'SUPER_ADMIN' ||
    role === 'SUPERADMIN' ||
    role === 'OWNER' ||
    role === 'GENERAL_MANAGER' ||
    user.is_super_admin
  ) {
    return true;
  }

  // Check explicit app_permissions if provided
  if (user.app_permissions) {
    if (
      user.app_permissions.ohda === true ||
      user.app_permissions['apps.ohda'] === true ||
      user.app_permissions.custody === true ||
      user.app_permissions['custody'] === true
    ) {
      return true;
    }
  }

  // Check permissions array or string
  let perms: string[] = [];
  if (Array.isArray(user.permissions)) {
    perms = user.permissions;
  } else if (typeof user.permissions === 'string') {
    try {
      perms = JSON.parse(user.permissions);
    } catch {
      perms = user.permissions.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
  }

  const allowedPermissions = [
    '*',
    'apps.ohda',
    'app.ohda',
    'custody',
    'custody.view',
    'custody.add',
    'custody.create',
    'custody.manage',
    'custody.delete',
  ];

  for (const perm of allowedPermissions) {
    if (perms.includes(perm)) {
      return true;
    }
  }

  // If user permissions are unconfigured, supervisors and admins default to allowed:
  if (!user.permissions_configured) {
    if (role === 'ADMIN' || role === 'ACCOUNTANT' || role === 'CUSTODY' || role === 'SUPERVISOR') {
      return true;
    }
  }

  return false;
};

/**
 * Deep link to open the AAMS Ohda (العهدة) mobile app
 */
export const openOhdaApp = async () => {
  const schemeUrl = 'aams-ahda://';
  try {
    const canOpen = await Linking.canOpenURL(schemeUrl);
    if (canOpen) {
      await Linking.openURL(schemeUrl);
      return;
    }
  } catch {
    // Continue to try direct open (Android 11+ package visibility)
  }

  try {
    await Linking.openURL(schemeUrl);
  } catch {
    Alert.alert(
      'تطبيق العهدة',
      'لم نتمكن من فتح تطبيق العهدة تلقائياً. يرجى التأكد من تثبيت تطبيق (عهدة - AAMS Ahda) على جهازك.',
      [{ text: 'حسناً' }]
    );
  }
};
