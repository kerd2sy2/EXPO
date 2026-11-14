export {
  API_BASE_URL,
  formatImageUrl,
  loadStoredToken,
  loadStoredRefreshToken,
  setAuthToken,
  getStoredToken,
  getStoredRefreshToken,
  onSessionExpired,
  triggerSessionExpired,
  saveCachedUser,
  getCachedUser,
} from './api/tokenAndBranchState';

export {
  isBiometricEnabled,
  setBiometricEnabled,
  saveLastCredentialsForBiometrics,
  getSavedCredentialsForBiometrics,
  clearSavedBiometrics,
} from './api/biometricsStorage';

export { refreshAuthToken, apiRequest } from './api/apiClientCore';

export {
  getDeviceDisplayName,
  getDeviceOsDisplay,
  getOrCreateDeviceUUID,
  setDeviceTrustedForNationalId,
  isDeviceTrustedForNationalId,
  requestOtpApi,
  verifyOtpApi,
  changeMyPasswordApi,
  setMyPhoneApi,
  updateMyLocationApi,
  getTrustedDevicesList,
  revokeTrustedDevice,
  getStoredLanguage,
  saveStoredLanguage,
  getMyViolationsApi,
} from './api/deviceAndUserApi';

export type {
  TrustedDeviceItem,
  DelegateViolation,
  ViolationsApiResponse,
} from './api/deviceAndUserApi';
