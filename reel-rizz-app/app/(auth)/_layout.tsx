import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0d0d12' } }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
