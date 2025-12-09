import { Stack } from 'expo-router';
import { Colors } from '../constants/Colors';

export default function RootLayout() {
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
    </Stack>
  );
}
