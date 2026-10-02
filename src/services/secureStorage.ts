import AsyncStorage from '@react-native-async-storage/async-storage';

let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
} catch {
  // Graceful fallback to AsyncStorage if expo-secure-store is not available in current runtime
}

export const secureStorage = {
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (SecureStore && typeof SecureStore.setItemAsync === 'function') {
        await SecureStore.setItemAsync(key, value);
        return;
      }
    } catch (e) {
      console.warn('[SecureStorage] SecureStore setItem failed, falling back to AsyncStorage:', e);
    }
    await AsyncStorage.setItem(key, value);
  },

  getItem: async (key: string): Promise<string | null> => {
    try {
      if (SecureStore && typeof SecureStore.getItemAsync === 'function') {
        const val = await SecureStore.getItemAsync(key);
        if (val !== null) return val;
      }
    } catch (e) {
      console.warn('[SecureStorage] SecureStore getItem failed, checking AsyncStorage:', e);
    }
    return AsyncStorage.getItem(key);
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      if (SecureStore && typeof SecureStore.deleteItemAsync === 'function') {
        await SecureStore.deleteItemAsync(key);
      }
    } catch (e) {
      console.warn('[SecureStorage] SecureStore deleteItem failed:', e);
    }
    await AsyncStorage.removeItem(key);
  },
};
