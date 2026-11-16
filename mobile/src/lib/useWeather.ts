import { useEffect, useState } from 'react';

import type { Coordinates } from '@/context/PreferencesContext';
import { fetchWeather, type Weather } from '@/lib/api';

type WeatherState = {
  /** null while loading, without a location, or after a failure. */
  weather: Weather | null;
  failed: boolean;
};

/** Current weather and spraying conditions for the saved location. */
export function useWeather(location: Coordinates | null): WeatherState {
  const [state, setState] = useState<WeatherState>({ weather: null, failed: false });
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;

    let isCurrent = true;
    fetchWeather({ latitude, longitude })
      .then((weather) => {
        if (isCurrent) setState({ weather, failed: false });
      })
      .catch(() => {
        if (isCurrent) setState({ weather: null, failed: true });
      });
    return () => {
      isCurrent = false;
    };
  }, [latitude, longitude]);

  return state;
}
