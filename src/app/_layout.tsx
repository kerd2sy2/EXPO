import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AutoUpdateOverlay } from '../components/modals/AutoUpdateOverlay';
import { analytics } from '../services/analytics';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
    analytics.init().catch((err) => console.warn('[RootLayout] Analytics init notice:', err));
  }, []);

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
      <AutoUpdateOverlay />
    </ErrorBoundary>
  );
}

