import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Colors } from '../constants/Colors';
import '../i18n/i18n.config';
import { iapService } from '../services/iap';

export default function RootLayout() {
  useEffect(() => {
    // Initialize IAP
    iapService.initialize();

    return () => {
      iapService.disconnect();
    };
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="camera" />
      <Stack.Screen name="quiz" />
      <Stack.Screen name="loading" />
      <Stack.Screen name="results/[id]" />
      <Stack.Screen name="paywall" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
