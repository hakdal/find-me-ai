import { useEffect } from 'react';
import { Stack, Platform } from 'expo-router';
import { Colors } from '../constants/Colors';
import '../i18n/i18n.config';

export default function RootLayout() {
  useEffect(() => {
    // Initialize IAP only on native platforms
    if (Platform.OS !== 'web') {
      import('../services/iap').then(({ iapService }) => {
        iapService.initialize();
        return () => {
          iapService.disconnect();
        };
      });
    }
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
