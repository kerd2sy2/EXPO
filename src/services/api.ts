// Hosted Backend API URL
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  'https://aams-logistics.kerd2sy.com/api/v1';

let storedToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  storedToken = token;
  if (typeof window !== 'undefined' && window.localStorage) {
    if (token) {
      window.localStorage.setItem('aams_delegate_token', token);
    } else {
      window.localStorage.removeItem('aams_delegate_token');
    }
  }
};

export const getStoredToken = (): string | null => {
  if (storedToken) return storedToken;
  if (typeof window !== 'undefined' && window.localStorage) {
    storedToken = window.localStorage.getItem('aams_delegate_token');
  }
  return storedToken;
};

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = getStoredToken();

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
