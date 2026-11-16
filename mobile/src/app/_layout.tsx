import { LogBox } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

LogBox.ignoreLogs(['Cannot connect to Expo CLI']);

import { colors } from '@/constants/colors';
import { AuthProvider } from '@/context/AuthContext';
import { PreferencesProvider } from '@/context/PreferencesContext';

export default function RootLayout() {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </AuthProvider>
    </PreferencesProvider>
  );
}
