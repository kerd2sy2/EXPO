import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Universal fallback route to prevent Expo Router from showing "Unmatched Route".
 * Redirects back to `/` preserving any query params.
 */
export default function NotFoundFallback() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/', params }} />;
}
