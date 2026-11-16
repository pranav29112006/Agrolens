import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { LocationIllustration } from '@/components/onboarding/Illustrations';
import { colors } from '@/constants/colors';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings } from '@/i18n';
import { goBackOrHome } from '@/lib/navigation';
import { useLocationRequest } from '@/lib/useLocationRequest';

export default function LocationScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const strings = useStrings().location;
  const { hasOnboarded } = usePreferences();
  const requestLocation = useLocationRequest();
  const [isRequesting, setIsRequesting] = useState(false);

  const finish = () => {
    if (hasOnboarded) {
      // Opened later from Settings.
      goBackOrHome(router);
    } else {
      router.replace('/crops');
    }
  };

  const allow = async () => {
    setIsRequesting(true);
    // Denied or failed permission still continues: advice just won't use local weather.
    await requestLocation();
    finish();
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <BrandMark />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Capped by height too, leaving room for long translated titles and the privacy note. */}
        <LocationIllustration width={Math.min(width - 56, 300, height * 0.3)} />
        <Text style={styles.title}>{strings.title}</Text>
        <Text style={styles.body}>{strings.body}</Text>
        <View style={styles.privacy}>
          <MaterialCommunityIcons name="shield-check" size={18} color={colors.primary} />
          <Text style={styles.privacyText}>{strings.privacy}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isRequesting, disabled: isRequesting }}
          disabled={isRequesting}
          onPress={allow}
          style={styles.allowButton}
        >
          {isRequesting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <MaterialCommunityIcons name="map-marker" size={20} color={colors.onPrimary} />
              <Text style={styles.allowText}>{strings.allow}</Text>
            </>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isRequesting}
          hitSlop={8}
          onPress={finish}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>{strings.skip}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  title: {
    marginTop: 28,
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.primaryTint,
  },
  privacyText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  allowButton: {
    height: 52,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  allowText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
