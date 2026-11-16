import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { colors } from '@/constants/colors';
import { LANGUAGES, type Language, type LanguageCode } from '@/constants/languages';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { saveAccountProfile } from '@/lib/account';
import { goBackOrHome } from '@/lib/navigation';

const SCREEN_PADDING = 16;
const GRID_GAP = 12;

export default function LanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { language, hasOnboarded, setLanguage } = usePreferences();
  const { session } = useAuth();
  const [selected, setSelected] = useState<LanguageCode | null>(language);

  const tileWidth = (width - SCREEN_PADDING * 2 - GRID_GAP) / 2;

  const accept = async () => {
    if (!selected) return;
    await setLanguage(selected);

    if (session) {
      const error = await saveAccountProfile(session.user.id, { language: selected });
      if (error) console.warn('Could not save language to the account:', error.message);
    }

    if (hasOnboarded) {
      // Opened later from Settings: return to the screen it was opened from.
      goBackOrHome(router);
    } else {
      router.replace('/onboarding');
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <StatusBar style="light" />

      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.brand}>
          <BrandMark textColor={colors.onPrimary} />
        </View>
        <Text style={styles.title}>Choose your language</Text>
        <Text style={styles.subtitle}>Crop care advice in the language you speak</Text>
      </View>

      <FlatList
        data={LANGUAGES}
        numColumns={2}
        keyExtractor={(item) => item.code}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        renderItem={({ item }) => (
          <LanguageTile
            language={item}
            width={tileWidth}
            selected={item.code === selected}
            onPress={() => setSelected(item.code)}
          />
        )}
      />

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !selected }}
          disabled={!selected}
          onPress={accept}
          style={[styles.continueButton, selected && styles.continueButtonEnabled]}
        >
          <Text style={[styles.continueText, selected && styles.continueTextEnabled]}>
            Continue
          </Text>
          <MaterialCommunityIcons
            name="arrow-right"
            size={20}
            color={selected ? colors.onPrimary : colors.onDisabled}
          />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

type LanguageTileProps = {
  language: Language;
  width: number;
  selected: boolean;
  onPress: () => void;
};

function LanguageTile({ language, width, selected, onPress }: LanguageTileProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.tile, { width }, selected && styles.tileSelected]}
    >
      <View style={styles.tileTop}>
        <View style={[styles.glyph, selected && styles.glyphSelected]}>
          <Text style={[styles.glyphText, selected && styles.glyphTextSelected]}>
            {language.glyph}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={selected ? 'check-circle' : 'circle-outline'}
          size={22}
          color={selected ? colors.primary : colors.radio}
        />
      </View>
      <Text style={styles.tileName} numberOfLines={1}>
        {language.name}
      </Text>
      <Text style={styles.tileTagline} numberOfLines={2}>
        {language.tagline}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: colors.primary,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  brand: {
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: colors.onPrimaryMuted,
  },
  grid: {
    padding: SCREEN_PADDING,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  tile: {
    minHeight: 132,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  tileSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  glyph: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  glyphSelected: {
    backgroundColor: colors.primary,
  },
  glyphText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  glyphTextSelected: {
    color: colors.onPrimary,
  },
  // Explicit left alignment keeps Urdu and Arabic consistent with the other tiles.
  tileName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'left',
  },
  tileTagline: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
    textAlign: 'left',
  },
  footer: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  continueButton: {
    height: 52,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.disabled,
  },
  continueButtonEnabled: {
    backgroundColor: colors.primary,
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onDisabled,
  },
  continueTextEnabled: {
    color: colors.onPrimary,
  },
});
