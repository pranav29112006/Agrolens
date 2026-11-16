import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { isCropId, type CropId } from '@/constants/crops';
import { isGrowerType, type GrowerType } from '@/constants/growerTypes';
import { isLanguageCode, type LanguageCode } from '@/constants/languages';
import type { AccountSetup } from '@/lib/account';

const LANGUAGE_KEY = 'agrolens.language';
const ONBOARDED_KEY = 'agrolens.onboarded';
const LOCATION_KEY = 'agrolens.location';
const CROPS_KEY = 'agrolens.crops';
const GROWER_TYPE_KEY = 'agrolens.growerType';
const ACCOUNT_KEY = 'agrolens.accountId';
const TEMPERATURE_UNIT_KEY = 'agrolens.temperatureUnit';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export type TemperatureUnit = 'celsius' | 'fahrenheit';

type PreferencesContextValue = {
  /** null until the user has picked a language on the onboarding screen. */
  language: LanguageCode | null;
  /** true once every onboarding step up to "how do you grow" is done or skipped. */
  hasOnboarded: boolean;
  /** Approximate location, or null if the user hasn't shared it. */
  location: Coordinates | null;
  /** Crops the user grows. */
  crops: CropId[];
  /** Pots, home garden or fields; null if skipped. */
  growerType: GrowerType | null;
  /** The account this saved data belongs to; null while nobody has signed in yet. */
  accountId: string | null;
  /** Device display setting for weather. */
  temperatureUnit: TemperatureUnit;
  /** false while saved preferences are still being read from storage. */
  isLoaded: boolean;
  setLanguage: (code: LanguageCode) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setLocation: (coordinates: Coordinates) => Promise<void>;
  setCrops: (crops: CropId[]) => Promise<void>;
  setGrowerType: (type: GrowerType) => Promise<void>;
  setTemperatureUnit: (unit: TemperatureUnit) => Promise<void>;
  /** Replaces the device copy with what an account has saved. */
  adoptAccount: (accountId: string, setup: AccountSetup) => Promise<void>;
  /** Drops the signed-in account's data on sign-out, keeping device choices like language. */
  forgetAccount: () => Promise<void>;
  /** Testing aid: forgets everything so the first-launch flow runs again. */
  resetDevice: () => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function parseCoordinates(value: string | null): Coordinates | null {
  if (!value) return null;
  try {
    const { latitude, longitude } = JSON.parse(value);
    return typeof latitude === 'number' && typeof longitude === 'number'
      ? { latitude, longitude }
      : null;
  } catch {
    return null;
  }
}

function parseCrops(value: string | null): CropId[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is CropId => typeof item === 'string' && isCropId(item))
      : [];
  } catch {
    return [];
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [location, setLocationState] = useState<Coordinates | null>(null);
  const [crops, setCropsState] = useState<CropId[]>([]);
  const [growerType, setGrowerTypeState] = useState<GrowerType | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [temperatureUnit, setTemperatureUnitState] = useState<TemperatureUnit>('celsius');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        // Demo/dev switch: forget the device setup on every launch so the app opens at language selection.
        if (process.env.EXPO_PUBLIC_FRESH_START === 'true') {
          await AsyncStorage.multiRemove([
            LANGUAGE_KEY,
            ONBOARDED_KEY,
            LOCATION_KEY,
            CROPS_KEY,
            GROWER_TYPE_KEY,
            ACCOUNT_KEY,
            TEMPERATURE_UNIT_KEY,
          ]);
        }
        const stored = Object.fromEntries(
          await AsyncStorage.multiGet([
            LANGUAGE_KEY,
            ONBOARDED_KEY,
            LOCATION_KEY,
            CROPS_KEY,
            GROWER_TYPE_KEY,
            ACCOUNT_KEY,
            TEMPERATURE_UNIT_KEY,
          ]),
        );
        const storedLanguage = stored[LANGUAGE_KEY];
        if (storedLanguage && isLanguageCode(storedLanguage)) setLanguageState(storedLanguage);
        setHasOnboarded(stored[ONBOARDED_KEY] === 'true');
        setLocationState(parseCoordinates(stored[LOCATION_KEY]));
        setCropsState(parseCrops(stored[CROPS_KEY]));
        const storedGrowerType = stored[GROWER_TYPE_KEY];
        if (isGrowerType(storedGrowerType)) setGrowerTypeState(storedGrowerType);
        setAccountId(stored[ACCOUNT_KEY]);
        if (stored[TEMPERATURE_UNIT_KEY] === 'fahrenheit') setTemperatureUnitState('fahrenheit');
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const setLanguage = async (code: LanguageCode) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, code);
    setLanguageState(code);
  };

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDED_KEY, 'true');
    setHasOnboarded(true);
  };

  const setLocation = async (coordinates: Coordinates) => {
    await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(coordinates));
    setLocationState(coordinates);
  };

  const setCrops = async (selected: CropId[]) => {
    await AsyncStorage.setItem(CROPS_KEY, JSON.stringify(selected));
    setCropsState(selected);
  };

  const setGrowerType = async (type: GrowerType) => {
    await AsyncStorage.setItem(GROWER_TYPE_KEY, type);
    setGrowerTypeState(type);
  };

  const setTemperatureUnit = async (unit: TemperatureUnit) => {
    await AsyncStorage.setItem(TEMPERATURE_UNIT_KEY, unit);
    setTemperatureUnitState(unit);
  };

  // Fields the account never set keep the device's value.
  const adoptAccount: PreferencesContextValue['adoptAccount'] = async (id, setup) => {
    const entries: [string, string][] = [
      [ACCOUNT_KEY, id],
      [CROPS_KEY, JSON.stringify(setup.crops)],
    ];
    if (setup.language) entries.push([LANGUAGE_KEY, setup.language]);
    if (setup.location) entries.push([LOCATION_KEY, JSON.stringify(setup.location)]);
    if (setup.growerType) entries.push([GROWER_TYPE_KEY, setup.growerType]);
    await AsyncStorage.multiSet(entries);
    setAccountId(id);
    setCropsState(setup.crops);
    if (setup.language) setLanguageState(setup.language);
    if (setup.location) setLocationState(setup.location);
    if (setup.growerType) setGrowerTypeState(setup.growerType);
  };

  const forgetAccount = async () => {
    await AsyncStorage.multiRemove([ACCOUNT_KEY, CROPS_KEY, GROWER_TYPE_KEY]);
    setAccountId(null);
    setCropsState([]);
    setGrowerTypeState(null);
  };

  const resetDevice = async () => {
    await AsyncStorage.multiRemove([
      LANGUAGE_KEY,
      ONBOARDED_KEY,
      LOCATION_KEY,
      CROPS_KEY,
      GROWER_TYPE_KEY,
      ACCOUNT_KEY,
      TEMPERATURE_UNIT_KEY,
    ]);
    setTemperatureUnitState('celsius');
    setLanguageState(null);
    setHasOnboarded(false);
    setLocationState(null);
    setCropsState([]);
    setGrowerTypeState(null);
    setAccountId(null);
  };

  return (
    <PreferencesContext.Provider
      value={{
        language,
        hasOnboarded,
        location,
        crops,
        growerType,
        accountId,
        temperatureUnit,
        isLoaded,
        setLanguage,
        completeOnboarding,
        setLocation,
        setCrops,
        setGrowerType,
        setTemperatureUnit,
        adoptAccount,
        forgetAccount,
        resetDevice,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences must be used inside PreferencesProvider');
  return context;
}
