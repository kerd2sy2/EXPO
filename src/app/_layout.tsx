import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { Observe, ObserveRoot } from 'expo-observe';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AutoUpdateOverlay } from '../components/modals/AutoUpdateOverlay';
import { analytics } from '../services/analytics';

Observe.configure({
  integrations: {
    'expo-router': true,
  },
});

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayout() {
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

export default ObserveRoot.wrap(RootLayout);

