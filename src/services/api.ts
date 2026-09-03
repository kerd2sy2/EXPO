import AsyncStorage from '@react-native-async-storage/async-storage';

// Hosted Backend API URL (Render)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://aams-backend-fxy7.onrender.com/api/v1';

const TOKEN_KEY = 'aams_delegate_token';
const USER_KEY = 'aams_delegate_user';

let storedToken: string | null = null;

// Initialize token from AsyncStorage
export const loadStoredToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (token) {
      storedToken = token;
      return token;
    }
  } catch (e) {
    console.log('Error reading token from AsyncStorage:', e);
  }
  return null;
};

// Set / Remove Auth Token
export const setAuthToken = async (token: string | null): Promise<void> => {
  storedToken = token;
  try {
    if (token) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
    }
  } catch (e) {
    console.log('Error saving token to AsyncStorage:', e);
  }
};

// Synchronous getter for in-flight requests
export const getStoredToken = (): string | null => {
  return storedToken;
};

// Persist / Retrieve Cached User Profile
export const saveCachedUser = async (user: any): Promise<void> => {
  try {
    if (user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }
  } catch (e) {
    console.log('Error saving user to AsyncStorage:', e);
  }
};

export const getCachedUser = async (): Promise<any | null> => {
  try {
    const json = await AsyncStorage.getItem(USER_KEY);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  // Ensure token is loaded if not already in memory
  let token = getStoredToken();
  if (!token) {
    token = await loadStoredToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || `خطأ في الخادم (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}
