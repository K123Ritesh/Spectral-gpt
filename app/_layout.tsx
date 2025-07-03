import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { Provider as PaperProvider } from 'react-native-paper';

import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null; // You could show a loading screen here
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="index" />
          <Stack.Screen name="history" />
          <Stack.Screen name="profile" />
        </>
      ) : (
        <>
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/register" />
        </>
      )}
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
 
    <AuthProvider>
      <PaperProvider>
        <AppNavigator />
          <StatusBar style="auto" />
      </PaperProvider>
    </AuthProvider>
 
  );
}
