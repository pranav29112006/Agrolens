import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/constants/colors';
import { useStrings } from '@/i18n';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Entry points into the knowledge base; the lists themselves are in `library-list.tsx`. */
export default function LibraryScreen() {
  const router = useRouter();
  const strings = useStrings();

  const sections: { view: 'crops' | 'diseases' | 'tips' | 'alerts'; icon: IconName; label: string }[] = [
    { view: 'crops', icon: 'sprout-outline', label: strings.home.libraryCrops },
    { view: 'diseases', icon: 'bug-outline', label: strings.home.libraryPests },
    { view: 'tips', icon: 'lightbulb-on-outline', label: strings.home.libraryTips },
    { view: 'alerts', icon: 'alert-outline', label: strings.home.libraryAlerts },
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{strings.tabs.library}</Text>
        <Text style={styles.subtitle}>{strings.library.subtitle}</Text>
        <View style={styles.list}>
          {sections.map((section) => (
            <Pressable
              key={section.view}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/library-list', params: { view: section.view } })}
              style={styles.row}
            >
              <View style={styles.icon}>
                <MaterialCommunityIcons name={section.icon} size={24} color={colors.primary} />
              </View>
              <Text style={styles.label}>{section.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.radio} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  list: {
    gap: 12,
    marginTop: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 72,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});
