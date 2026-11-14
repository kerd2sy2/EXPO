export {
  API_BASE_URL,
  formatImageUrl,
  BranchItem,
  getActiveBranchId,
  getActiveBranchName,
  loadActiveBranch,
  setActiveBranch,
  loadStoredToken,
  loadStoredRefreshToken,
  setAuthToken,
  getStoredToken,
  getStoredRefreshToken,
  onSessionExpired,
  triggerSessionExpired,
  onPermissionDenied,
  triggerPermissionDenied,
  onProfileRefreshNeeded,
  triggerProfileRefresh,
  saveCachedUser,
  getCachedUser,
  getStoredLanguage,
} from './api/tokenAndBranchState';

export {
  isBiometricEnabled,
  setBiometricEnabled,
  saveLastCredentialsForBiometrics,
  getSavedCredentialsForBiometrics,
  clearSavedBiometrics,
} from './api/biometricsStorage';

export {
  refreshAuthToken,
  apiRequest,
  fetchBranches,
  saveStoredLanguage,
} from './api/apiClientCore';

export {
  fetchCurrentUserProfile,
  updateMyAvatar,
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
  TrustedDeviceItem,
  getTrustedDevicesList,
  revokeTrustedDevice,
  DelegateViolation,
  ViolationsApiResponse,
  getMyViolationsApi,
} from './api/authAndProfileApi';
