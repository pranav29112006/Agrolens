import * as Location from 'expo-location';

import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { saveAccountProfile } from '@/lib/account';

/** Two decimal places is roughly 1 km — enough for local weather, without pinpointing the farm. */
const roundCoordinate = (value: number) => Math.round(value * 100) / 100;

/**
 * Asks for foreground location permission and, if granted, saves an approximate
 * position on the device (and the account when signed in). Resolves with whether
 * permission was granted; the position itself is saved whenever it arrives.
 */
export function useLocationRequest() {
  const { setLocation } = usePreferences();
  const { session } = useAuth();

  return async function requestLocation(): Promise<boolean> {
    try {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) return false;

      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low })
        .then(async ({ coords }) => {
          const location = {
            latitude: roundCoordinate(coords.latitude),
            longitude: roundCoordinate(coords.longitude),
          };
          await setLocation(location);
          if (session) await saveAccountProfile(session.user.id, { location });
        })
        .catch(() => {
          // e.g. location services switched off: advice just won't use local weather.
        });
      return true;
    } catch {
      return false;
    }
  };
}
