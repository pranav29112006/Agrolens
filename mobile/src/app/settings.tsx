import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/constants/colors';
import { LANGUAGES } from '@/constants/languages';
import { useAuth } from '@/context/AuthContext';
import { usePreferences, type TemperatureUnit } from '@/context/PreferencesContext';
import { useStrings } from '@/i18n';
import { supabase } from '@/lib/supabase';

const GROWER_TYPE_LABELS = {
  pots: 'pots',
  home_garden: 'homeGarden',
  fields: 'fields',
} as const;

export default function SettingsScreen() {
  const router = useRouter();
  const strings = useStrings();
  const { session } = useAuth();
  const {
    language,
    crops,
    growerType,
    location,
    temperatureUnit,
    setTemperatureUnit,
    resetDevice,
  } = usePreferences();

  const languageName = LANGUAGES.find((item) => item.code === language)?.name ?? strings.settings.notSet;
  const cropNames = crops.map((id) => strings.cropNames[id]).join(', ') || strings.settings.notSet;
  const growerTypeLabel = growerType
    ? strings.growerType[GROWER_TYPE_LABELS[growerType]]
    : strings.settings.notSet;

  // Testing aid while the app is being built: replay the first-launch flow.
  const startOver = async () => {
    await supabase.auth.signOut();
    await resetDevice();
    router.replace('/language');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title={strings.settings.title} />
      <ScrollView contentContainerStyle={styles.content}>
        <Section title={strings.settings.general}>
          <Row label={strings.settings.language} value={languageName} href="/language" />
          <Row label={strings.tabs.home} value={cropNames} href="/crops" />
          <Row label={strings.settings.growerType} value={growerTypeLabel} href="/grower-type" />
          <Row
            label={strings.settings.location}
            value={location ? strings.settings.locationShared : strings.settings.locationNotShared}
            href="/location"
          />
        </Section>

        <Section title={strings.settings.weather}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{strings.settings.temperatureUnit}</Text>
            <View style={styles.chips}>
              {(['celsius', 'fahrenheit'] as TemperatureUnit[]).map((unit) => {
                const isSelected = unit === temperatureUnit;
                return (
                  <Pressable
                    key={unit}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    onPress={() => setTemperatureUnit(unit)}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                      {strings.settings[unit]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Section>

        <Section title={strings.settings.account}>
          <Row label={strings.settings.signedInAs} value={session?.user.email ?? '—'} />
        </Section>

        <Section title={strings.settings.about}>
          <Row label={strings.settings.version} value={Constants.expoConfig?.version ?? '—'} />
        </Section>

        {/* Developer tools stay in English and will be removed before release. */}
        <Section title="Developer">
          <Row label="Replay intro slides" href="/onboarding" />
          <Pressable accessibilityRole="button" onPress={startOver} style={styles.row}>
            <Text style={[styles.rowLabel, styles.danger]}>Start over (testing)</Text>
          </Pressable>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function Row({ label, value, href }: { label: string; value?: string; href?: Href }) {
  const router = useRouter();
  const content = (
    <>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value !== undefined && (
          <Text style={styles.rowValue} numberOfLines={2}>
            {value}
          </Text>
        )}
      </View>
      {href && <MaterialCommunityIcons name="chevron-right" size={22} color={colors.radio} />}
    </>
  );

  return href ? (
    <Pressable accessibilityRole="button" onPress={() => router.push(href)} style={styles.row}>
      {content}
    </Pressable>
  ) : (
    <View style={styles.row}>{content}</View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionBody: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowValue: {
    marginTop: 2,
    fontSize: 14,
    color: colors.textSecondary,
  },
  chips: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 'auto',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.primary,
  },
  danger: {
    color: '#B3261E',
  },
});
