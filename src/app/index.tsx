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
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
} from '../services/api';

// Screens
import { AhdaLoginScreen } from '../screens/AhdaLoginScreen';
import { AhdaHomeScreen } from '../screens/AhdaHomeScreen';
import {
  AhdaNetCustodyCardSkeleton,
  AhdaCategoryGridSkeleton,
  AhdaDayExpensesSummaryCardSkeleton,
} from '../components/skeleton/AhdaHomeSkeleton';
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

const AuthLoadingShell: React.FC<{ colors: ThemeColors; isDarkMode: boolean }> = ({
  colors,
  isDarkMode,
}) => {
  const insets = useSafeAreaInsets();
  const topInset = insets.top > 0 ? insets.top : (Platform.OS === 'android' ? 24 : 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── Status Bar Solid Cover ── */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: topInset,
          backgroundColor: colors.bg,
          zIndex: 40,
        }}
      />

      {/* ── Header Shell (Matches AhdaHeader 1:1) ── */}
      <View
        style={{
          position: 'absolute',
          top: topInset,
          left: 0,
          right: 0,
          height: 64,
          backgroundColor: colors.bg,
          zIndex: 30,
          flexDirection: 'row-reverse',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 10,
        }}
      >
        {/* Right: Avatar Placeholder + User/Branch Info */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: '#ecfdf5',
              borderWidth: 2,
              borderColor: '#047857',
              justifyContent: 'center',
              alignItems: 'center',
              overflow: 'hidden',
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#fed7aa', opacity: 0.7 }} />
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <View style={{ width: 80, height: 13, borderRadius: 4, backgroundColor: isDarkMode ? '#334155' : '#e2e8f0' }} />
            <View style={{ width: 55, height: 10, borderRadius: 4, backgroundColor: isDarkMode ? '#1e293b' : '#f1f5f9' }} />
          </View>
        </View>

        {/* Left: Calendar Icon Action Button */}
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="calendar-outline" size={25} color="#047857" />
        </View>
      </View>

      {/* ── Body matching AhdaHomeScreen ScrollView ── */}
      <ScrollView
        scrollEnabled={false}
        contentContainerStyle={{
          paddingTop: topInset + 64 + 14,
          paddingBottom: 28,
          paddingHorizontal: 16,
          flexGrow: 1,
          justifyContent: 'space-around',
        }}
        showsVerticalScrollIndicator={false}
      >
        <AhdaNetCustodyCardSkeleton colors={colors} isDarkMode={isDarkMode} />
        <AhdaCategoryGridSkeleton colors={colors} isDarkMode={isDarkMode} />
        <AhdaDayExpensesSummaryCardSkeleton colors={colors} isDarkMode={isDarkMode} />
      </ScrollView>
    </View>
  );
};

export default function AhdaApp() {
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
        const [stored, cachedUser, savedPref, cachedAvatar] = await Promise.all([
          loadStoredToken(),
          getCachedUser(),
          AsyncStorage.getItem('@ahda_theme_preference'),
          AsyncStorage.getItem('@aams_cached_avatar'),
        ]);

        if (savedPref === 'system' || savedPref === 'light' || savedPref === 'dark') {
          setThemePreference(savedPref);
        }

        if (stored) {
          setTokenState(stored);
          if (cachedUser) {
            if (cachedAvatar && !cachedUser.avatar && !cachedUser.google_avatar && !cachedUser.personal_image) {
              cachedUser.avatar = cachedAvatar;
            }
            setCurrentUser(cachedUser);

            // Silently sync latest user profile in background on app launch (once only, zero polling)
            fetchCurrentUserProfile()
              .then(async (fresh) => {
                if (fresh) {
                  const savedAvatar = await AsyncStorage.getItem('@aams_cached_avatar').catch(() => null);
                  if (savedAvatar && !fresh.avatar && !fresh.google_avatar && !fresh.personal_image) {
                    fresh.avatar = savedAvatar;
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
  }, []);

  // Handle successful login
  const handleLoginSuccess = useCallback(async (user: any) => {
    const activeToken = getStoredToken();
    if (activeToken) {
      setTokenState(activeToken);
    }
    const cachedAvatar = await AsyncStorage.getItem('@aams_cached_avatar').catch(() => null);
    if (cachedAvatar && !user.avatar && !user.google_avatar && !user.personal_image) {
      user.avatar = cachedAvatar;
    }
    setCurrentUser(user);
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await setAuthToken(null);
    } catch (_) {}
    setTokenState(null);
    setCurrentUser(null);
  }, []);

  if (isLoadingAuth) {
    return (
      <SafeAreaProvider>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={colors.bg}
        />
        <AuthLoadingShell colors={colors} isDarkMode={isDarkMode} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
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
