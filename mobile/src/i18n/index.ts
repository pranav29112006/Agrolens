import type { LanguageCode } from '@/constants/languages';
import { usePreferences } from '@/context/PreferencesContext';

import ar from './locales/ar';
import bn from './locales/bn';
import en, { type Strings } from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import gu from './locales/gu';
import hi from './locales/hi';
import id from './locales/id';
import kn from './locales/kn';
import ml from './locales/ml';
import mr from './locales/mr';
import or from './locales/or';
import pa from './locales/pa';
import pt from './locales/pt';
import sw from './locales/sw';
import ta from './locales/ta';
import te from './locales/te';
import ur from './locales/ur';
import vi from './locales/vi';

// Typed as a full Record so adding a language without a translation fails type-checking.
const translations: Record<LanguageCode, Strings> = {
  ml, bn, or, pa, ur, gu, te, kn, mr, ta, hi, en, fr, pt, es, id, vi, ar, sw,
};

/** UI strings in the selected language (English until one is chosen). */
export function useStrings(): Strings {
  const { language } = usePreferences();
  return translations[language ?? 'en'];
}

export type { Strings };
