import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StatusBar,
  View,
  Text,
  ScrollView,
  useColorScheme,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';

// Theme & Types
import { ThemeColors } from '../types/delegate';

// Services
import {
  loadStoredToken,
  getStoredToken,
  setAuthToken,
  getCachedUser,
  saveCachedUser,
  fetchCurrentUserProfile,
  onSessionExpired,
  onPermissionDenied,
  onProfileRefreshNeeded,
  loadActiveBranch,
  setActiveBranch,
} from '../services/api';
import { hasCustodyPermission } from '../services/custodyService';

// Screens
import { AhdaLoginScreen } from '../screens/AhdaLoginScreen';
import { AhdaHomeScreen } from '../screens/AhdaHomeScreen';
import { AutoUpdateOverlay } from '../components/modals/AutoUpdateOverlay';

// Dark / Light Theme Tokens - Matching AAMS delegate design system
const lightColors: ThemeColors = {
  bg: '#f8fafc',
  card: '#ffffff',
  cardHeader: '#f1f5f9',
  textPrimary: '#0f172a',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  primary: '#059669',
  primaryLight: '#ecfdf5',
  primaryText: '#ffffff',
  accent: '#0284c7',
  accentLight: '#f0f9ff',
  inputBg: '#ffffff',
  inputBorder: '#cbd5e1',
  warningBg: '#fffbeb',
  warningBorder: '#fde68a',
  warningText: '#b45309',
  errorBg: '#fef2f2',
  errorText: '#dc2626',
};

const darkColors: ThemeColors = {
  bg: '#0f172a',
  card: '#1e293b',
  cardHeader: '#334155',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  border: '#334155',
  primary: '#10b981',
  primaryLight: '#064e3b',
  primaryText: '#ffffff',
  accent: '#38bdf8',
  accentLight: '#082f49',
  inputBg: '#1e293b',
  inputBorder: '#475569',
  warningBg: '#451a03',
  warningBorder: '#78350f',
  warningText: '#fcd34d',
  errorBg: '#450a0a',
  errorText: '#fca5a5',
};

const AuthLoadingSplash: React.FC<{ colors: ThemeColors; isDarkMode: boolean }> = ({
  colors,
}) => {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#ea580c" />
    </View>
  );
};

export default function AhdaApp() {
  const params = useLocalSearchParams();
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<'system' | 'light' | 'dark'>('light');
  const [token, setTokenState] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Determine current theme colors - Default Light
  const isDarkMode = useMemo(() => {
    if (themePreference === 'dark') return true;
    if (themePreference === 'light') return false;
    return systemColorScheme === 'dark';
  }, [themePreference, systemColorScheme]);

  const toggleTheme = useCallback(() => {
    setThemePreference((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const handleSelectThemePreference = useCallback(async (pref: 'system' | 'light' | 'dark') => {
    setThemePreference(pref);
    try {
      await AsyncStorage.setItem('@ahda_theme_preference', pref);
    } catch (_) {}
  }, []);

  const colors = isDarkMode ? darkColors : lightColors;

  // Load auth state on app startup
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const [stored, cachedUser, savedPref, storedBranch] = await Promise.all([
          loadStoredToken(),
          getCachedUser(),
          AsyncStorage.getItem('@ahda_theme_preference'),
          loadActiveBranch(),
        ]);

        if (savedPref === 'system' || savedPref === 'light' || savedPref === 'dark') {
          setThemePreference(savedPref);
        }

        if (stored) {
          setTokenState(stored);
          if (cachedUser) {
            if (!hasCustodyPermission(cachedUser)) {
              await handleLogout();
              Alert.alert('تنبيه الصلاحيات', 'ليس لديك صلاحية للوصول إلى هذا التطبيق الآن.');
              return;
            }

            const userBranchId =
              cachedUser.branch_id ||
              cachedUser.admin?.branch_id ||
              cachedUser.employee?.branch_id ||
              cachedUser.user?.branch_id;
            if (userBranchId) {
              const bName = cachedUser.branch_name || storedBranch?.name || 'الفرع الأول';
              await setActiveBranch(userBranchId, bName);
            }

            setCurrentUser(cachedUser);

            // Silently sync latest user profile in background on app launch
            fetchCurrentUserProfile()
              .then(async (fresh) => {
                if (fresh) {
                  if (!hasCustodyPermission(fresh)) {
                    await handleLogout();
                    Alert.alert('تنبيه الصلاحيات', 'ليس لديك صلاحية للوصول إلى هذا التطبيق الآن.');
                    return;
                  }
                  setCurrentUser(fresh);
                }
              })
              .catch(() => {});
          } else {
            // No valid user session cached, require clean login
            await setAuthToken(null);
            setTokenState(null);
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.warn('[Bootstrap] Error initializing auth:', err);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    bootstrap();

    // Register session expired callback
    onSessionExpired(async () => {
      await handleLogout();
      Alert.alert('انتهت الجلسة', 'يرجى تسجيل الدخول مجدداً للمتابعة.');
    });

    // Register permission denied callback: silently refresh profile to reflect live permissions without logging out
    onPermissionDenied(async () => {
      fetchCurrentUserProfile().then((fresh) => {
        if (fresh) setCurrentUser(fresh);
      }).catch(() => {});
    });
  }, []);

  // Real-time permission sync without logout:
  // Automatically re-syncs profile every 4s while app is active or immediately when triggered by actions
  useEffect(() => {
    if (!token) return;

    const syncProfile = async () => {
      try {
        const fresh = await fetchCurrentUserProfile();
        if (fresh) {
          if (!hasCustodyPermission(fresh)) {
            await handleLogout();
            Alert.alert('تنبيه الصلاحيات', 'ليس لديك صلاحية للوصول إلى هذا التطبيق الآن.');
            return;
          }
          setCurrentUser(fresh);
        }
      } catch (err: any) {
        // Silently ignore temporary fetch issues - do NOT force logout
      }
    };

    const unsubRefresh = onProfileRefreshNeeded(() => {
      syncProfile();
    });

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncProfile();
      }
    });

    const timer = setInterval(() => {
      if (AppState.currentState === 'active') {
        syncProfile();
      }
    }, 2500);

    return () => {
      unsubRefresh();
      sub.remove();
      clearInterval(timer);
    };
  }, [token]);

  // Handle successful login
  const handleLoginSuccess = useCallback(async (user: any) => {
    const activeToken = getStoredToken();
    if (activeToken) {
      setTokenState(activeToken);
    }
    await AsyncStorage.removeItem('@aams_cached_avatar').catch(() => {});
    setCurrentUser(user);
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await setAuthToken(null);
      await AsyncStorage.removeItem('@aams_cached_avatar').catch(() => {});
    } catch (_) {}
    setTokenState(null);
    setCurrentUser(null);
  }, []);

  if (isLoadingAuth) {
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={colors.bg}
        />
        <AuthLoadingSplash colors={colors} isDarkMode={isDarkMode} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />
      {!token ? (
        <AhdaLoginScreen
          colors={colors}
          isDarkMode={isDarkMode}
          onSuccess={handleLoginSuccess}
        />
      ) : (
        <AhdaHomeScreen
          colors={colors}
          isDarkMode={isDarkMode}
          currentUser={currentUser}
          onLogout={handleLogout}
          onToggleTheme={toggleTheme}
          themePreference={themePreference}
          onSelectThemePreference={handleSelectThemePreference}
          onUpdateUser={(updated) => setCurrentUser(updated)}
          initialAction={params.action as string}
        />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
  },
});
