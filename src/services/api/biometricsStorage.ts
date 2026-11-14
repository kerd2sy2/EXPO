import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from '../secureStorage';
import { getCachedUser, getStoredRefreshToken } from './tokenAndBranchState';

const LAST_SAVED_CREDENTIALS_KEY = 'aams_last_saved_credentials';
const BIOMETRIC_ENABLED_KEY = 'aams_biometric_enabled';
const BIO_TOKEN_KEY = 'aams_bio_token';
const BIO_REFRESH_TOKEN_KEY = 'aams_bio_refresh_token';
const BIO_NATIONAL_ID_KEY = 'aams_bio_national_id';
const BIO_USER_KEY = 'aams_bio_user';

export const isBiometricEnabled = async (): Promise<boolean> => {
  try {
    const val = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
    return val === 'true';
  } catch {
    return false;
  }
};

export const setBiometricEnabled = async (enabled: boolean): Promise<void> => {
  try {
    if (enabled) {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true');
    } else {
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'false');
      await clearSavedBiometrics();
    }
  } catch (e) {
    console.log('Error setting biometric status:', e);
  }
};

export const saveLastCredentialsForBiometrics = async (
  nationalId: string,
  token: string,
  user: any,
  refreshToken?: string
): Promise<void> => {
  try {
    const rToken = refreshToken || getStoredRefreshToken();
    const secureTasks: Promise<void>[] = [
      secureStorage.setItem(BIO_TOKEN_KEY, token),
      secureStorage.setItem(BIO_NATIONAL_ID_KEY, nationalId),
    ];
    if (rToken) {
      secureTasks.push(secureStorage.setItem(BIO_REFRESH_TOKEN_KEY, rToken));
    } else {
      secureTasks.push(secureStorage.removeItem(BIO_REFRESH_TOKEN_KEY));
    }
    await Promise.all(secureTasks);

    if (user) {
      await AsyncStorage.setItem(BIO_USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(BIO_USER_KEY);
    }

    await AsyncStorage.removeItem(LAST_SAVED_CREDENTIALS_KEY);
  } catch (e) {
    console.log('Error saving biometric credentials securely:', e);
  }
};

export const getSavedCredentialsForBiometrics = async (): Promise<{
  nationalId: string;
  token: string;
  refreshToken?: string;
  user: any;
} | null> => {
  try {
    const enabled = await isBiometricEnabled();
    if (!enabled) return null;

    const [token, nationalId, rToken] = await Promise.all([
      secureStorage.getItem(BIO_TOKEN_KEY),
      secureStorage.getItem(BIO_NATIONAL_ID_KEY),
      secureStorage.getItem(BIO_REFRESH_TOKEN_KEY),
    ]);

    if (token && nationalId) {
      let user: any = null;
      try {
        const rawUser = await AsyncStorage.getItem(BIO_USER_KEY);
        user = rawUser ? JSON.parse(rawUser) : await getCachedUser();
      } catch {
        user = await getCachedUser();
      }

      return {
        nationalId,
        token,
        refreshToken: rToken || undefined,
        user,
      };
    }

    const legacyRaw = await AsyncStorage.getItem(LAST_SAVED_CREDENTIALS_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed?.token && parsed?.nationalId) {
        await saveLastCredentialsForBiometrics(
          parsed.nationalId,
          parsed.token,
          parsed.user,
          parsed.refreshToken
        );
        return {
          nationalId: parsed.nationalId,
          token: parsed.token,
          refreshToken: parsed.refreshToken,
          user: parsed.user,
        };
      }
    }

    return null;
  } catch {
    return null;
  }
};

export const clearSavedBiometrics = async (): Promise<void> => {
  try {
    await Promise.all([
      secureStorage.removeItem(BIO_TOKEN_KEY),
      secureStorage.removeItem(BIO_REFRESH_TOKEN_KEY),
      secureStorage.removeItem(BIO_NATIONAL_ID_KEY),
      AsyncStorage.removeItem(BIO_USER_KEY),
      AsyncStorage.removeItem(LAST_SAVED_CREDENTIALS_KEY),
    ]);
  } catch {}
};
