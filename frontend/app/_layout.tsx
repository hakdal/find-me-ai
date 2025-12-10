import { Stack } from 'expo-router';
import { Colors } from '../constants/Colors';
import '../i18n/i18n.config';

export default function RootLayout() {
  // Note: IAP initialization will be done in native builds only

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
