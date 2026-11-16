import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/constants/colors';
import { useStrings } from '@/i18n';
import { goBackOrHome } from '@/lib/navigation';

/** Placeholder for features that still need their backend (camera, weather, assistant…). */
export default function ComingSoonScreen() {
  const router = useRouter();
  const strings = useStrings().comingSoon;
  const { title } = useLocalSearchParams<{ title?: string }>();

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title={title ?? strings.title} />
      <View style={styles.content}>
        <View style={styles.icon}>
          <MaterialCommunityIcons name="sprout" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>{strings.title}</Text>
        <Text style={styles.body}>{strings.body}</Text>
        <Pressable accessibilityRole="button" onPress={() => goBackOrHome(router)} style={styles.button}>
          <Text style={styles.buttonText}>{strings.back}</Text>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  title: {
    marginTop: 20,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    height: 48,
    marginTop: 24,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
