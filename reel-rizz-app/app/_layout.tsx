import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/context/auth';

function RootNavigator() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const authScreen = (segments as string[])[1];

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (user && user.igVerified === false && authScreen !== 'verify') {
      router.replace('/(auth)/verify');
    } else if (user && user.igVerified !== false && !user.onboarded && authScreen !== 'onboarding') {
      router.replace('/(auth)/onboarding');
    } else if (user && user.onboarded && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0d12' }}>
        <ActivityIndicator size="large" color="#f43f5e" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
      <StatusBar style="light" />
    </AuthProvider>
  );
}
