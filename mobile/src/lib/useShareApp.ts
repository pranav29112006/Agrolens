import { Share } from 'react-native';

import { useStrings } from '@/i18n';

/** Opens the system share sheet with a short invitation in the app language. */
export function useShareApp() {
  const strings = useStrings();

  return async function shareApp() {
    try {
      await Share.share({ message: strings.you.shareMessage });
    } catch {
      // Sharing isn't available everywhere (e.g. some desktop browsers); nothing to do.
    }
  };
}
