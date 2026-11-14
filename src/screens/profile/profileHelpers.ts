import { EmployeeProfile, Language } from '../../types/delegate';
import { API_BASE_URL } from '../../services/api';

export interface ProfileDocumentItem {
  id: string;
  title: string;
  shortTitle: string;
  icon: string;
  iconFamily: 'ion' | 'material';
  accentColor: string;
  badgeColor: string;
  url: string | null;
}

export const formatProfileDocUrl = (url?: string): string | null => {
  if (!url) return null;
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  const cleanUrl = url.replace(/^\/+/, '');
  if (cleanUrl.startsWith('uploads/')) {
    return `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/${cleanUrl}`;
  }
  return `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/uploads/${cleanUrl}`;
};

export const buildProfileDocuments = (
  currentEmp: EmployeeProfile,
  activeBikeNumber: string | null | undefined,
  currentVehicleRegImage: string | undefined,
  isRTL: boolean,
  t: any
): ProfileDocumentItem[] => {
  const nationalIdPhotoUrl = formatProfileDocUrl(currentEmp.national_id_image);
  const drivingLicensePhotoUrl = formatProfileDocUrl(currentEmp.driving_license_image);
  const vehicleRegPhotoUrl = formatProfileDocUrl(currentVehicleRegImage);
  const passportPhotoUrl = formatProfileDocUrl(currentEmp.passport_image);

  const allDocuments: ProfileDocumentItem[] = [
    {
      id: 'national_id',
      title: t.idAndIqamaPhoto || 'صورة الهوية / الإقامة',
      shortTitle: t.idAndIqamaPhoto || (isRTL ? 'الهوية الوطنية / الإقامة' : 'National ID / Iqama'),
      icon: 'card-outline',
      iconFamily: 'ion',
      accentColor: '#3b82f6',
      badgeColor: 'rgba(59, 130, 246, 0.15)',
      url: nationalIdPhotoUrl,
    },
    {
      id: 'driving_license',
      title: t.drivingLicensePhoto || 'صورة رخصة القيادة',
      shortTitle: t.drivingLicensePhoto || (isRTL ? 'رخصة القيادة' : 'Driving License'),
      icon: 'card-account-details-outline',
      iconFamily: 'material',
      accentColor: '#10b981',
      badgeColor: 'rgba(16, 185, 129, 0.15)',
      url: drivingLicensePhotoUrl,
    },
    {
      id: 'vehicle_registration',
      title: activeBikeNumber
        ? `${t.vehicleRegistrationPhoto || 'صورة استمارة الدباب'} (${activeBikeNumber})`
        : (t.vehicleRegistrationPhoto || 'صورة رخصة الدباب (الاستمارة)'),
      shortTitle: activeBikeNumber
        ? `${t.vehicleRegistrationPhoto || 'استمارة'} (${activeBikeNumber})`
        : (t.vehicleRegistrationPhoto || 'رخصة الدباب'),
      icon: 'file-document-outline',
      iconFamily: 'material',
      accentColor: '#f59e0b',
      badgeColor: 'rgba(245, 158, 11, 0.15)',
      url: vehicleRegPhotoUrl,
    },
    {
      id: 'passport',
      title: t.passportPhoto || 'صورة جواز السفر',
      shortTitle: t.passportPhoto || (isRTL ? 'جواز السفر' : 'Passport'),
      icon: 'passport',
      iconFamily: 'material',
      accentColor: '#8b5cf6',
      badgeColor: 'rgba(139, 92, 246, 0.15)',
      url: passportPhotoUrl,
    },
  ];

  return allDocuments.filter((doc) => Boolean(doc.url));
};

export const formatLanguageLabel = (lang: Language): string => {
  if (lang === 'ar') return 'العربية';
  if (lang === 'en') return 'English';
  if (lang === 'bn') return 'বাংলা';
  return 'اردو';
};
