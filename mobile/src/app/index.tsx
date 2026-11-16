import { Redirect } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';

export default function Index() {
  const { language, hasOnboarded, isLoaded } = usePreferences();
  const { session, isLoaded: isSessionLoaded } = useAuth();

  if (!isLoaded || !isSessionLoaded) return null;
  if (!language || !hasOnboarded) return <Redirect href="/language" />;
  return <Redirect href={session ? '/home' : '/sign-in'} />;
}
