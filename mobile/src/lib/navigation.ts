import type { useRouter } from 'expo-router';

type Router = ReturnType<typeof useRouter>;

/**
 * Leaves a screen that was opened to change a setting: back to wherever it was
 * opened from (home or Settings), or home when there is nothing to go back to.
 */
export function goBackOrHome(router: Router) {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/home');
  }
}
