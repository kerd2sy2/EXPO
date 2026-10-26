import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Handles deep links directed to `aams-ahda://home` or `aams-ahda://home?action=add_expense`.
 * Seamlessly redirects to `/` preserving all query parameters.
 */
export default function HomeRouteRedirect() {
  const params = useLocalSearchParams();
  return <Redirect href={{ pathname: '/', params }} />;
}
