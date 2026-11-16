import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CropIcon } from '@/components/crops/CropIcon';
import { colors } from '@/constants/colors';
import { CROP_CATEGORY_TINTS, CROPS, type CropCategory, type CropId } from '@/constants/crops';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { saveAccountCrops } from '@/lib/account';
import { goBackOrHome } from '@/lib/navigation';
import { useStrings } from '@/i18n';
import en from '@/i18n/locales/en';

const COLUMNS = 3;
const SCREEN_PADDING = 16;
const GRID_GAP = 12;

type CropOption = {
  id: CropId;
  category: CropCategory;
  name: string;
};

export default function CropsScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const strings = useStrings();
  const { language, crops, hasOnboarded, setCrops } = usePreferences();
  const { session } = useAuth();
  // Set when a new account is being set up right after sign-in.
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [selected, setSelected] = useState<CropId[]>(crops);
  const [query, setQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const tileWidth = (width - SCREEN_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS;

  const options = useMemo<CropOption[]>(() => {
    const needle = query.trim().toLocaleLowerCase();
    return CROPS.map((crop) => ({ ...crop, name: strings.cropNames[crop.id] }))
      .filter(
        ({ id, name }) =>
          !needle ||
          name.toLocaleLowerCase().includes(needle) ||
          // Farmers often know crops by their English names too.
          en.cropNames[id].toLocaleLowerCase().includes(needle),
      )
      .sort((a, b) => a.name.localeCompare(b.name, language ?? 'en'));
  }, [query, strings, language]);

  const toggle = (id: CropId) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((cropId) => cropId !== id) : [...current, id],
    );

  const saveAndContinue = async () => {
    setIsSaving(true);
    await setCrops(selected);

    if (session) {
      const error = await saveAccountCrops(session.user.id, selected);
      if (error) console.warn('Could not save crops to the account:', error.message);
    }

    if (!hasOnboarded || next === 'grower-type') {
      router.replace('/grower-type');
    } else {
      // Opened later to edit crops: return to where the user came from.
      goBackOrHome(router);
    }
  };

  const canContinue = selected.length > 0 && !isSaving;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{strings.cropSelection.title}</Text>
        <Text style={styles.subtitle}>{strings.cropSelection.subtitle}</Text>
        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={22} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={strings.cropSelection.search}
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query !== '' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={strings.cropSelection.clearSearch}
              hitSlop={8}
              onPress={() => setQuery('')}
            >
              <MaterialCommunityIcons name="close-circle" size={20} color={colors.radio} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={options}
        numColumns={COLUMNS}
        keyExtractor={(crop) => crop.id}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.grid}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        extraData={selected}
        ListEmptyComponent={<Text style={styles.empty}>{strings.cropSelection.noResults}</Text>}
        renderItem={({ item }) => (
          <CropTile
            crop={item}
            width={tileWidth}
            selected={selected.includes(item.id)}
            onPress={() => toggle(item.id)}
          />
        )}
      />

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue }}
          disabled={!canContinue}
          onPress={saveAndContinue}
          style={[styles.continueButton, canContinue && styles.continueButtonEnabled]}
        >
          <Text style={[styles.continueText, canContinue && styles.continueTextEnabled]}>
            {strings.cropSelection.continue}
          </Text>
          {selected.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{selected.length}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

type CropTileProps = {
  crop: CropOption;
  width: number;
  selected: boolean;
  onPress: () => void;
};

function CropTile({ crop, width, selected, onPress }: CropTileProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={crop.name}
      onPress={onPress}
      style={[styles.tile, { width }, selected && styles.tileSelected]}
    >
      <View style={[styles.iconCircle, { backgroundColor: CROP_CATEGORY_TINTS[crop.category] }]}>
        <CropIcon id={crop.id} size={48} />
      </View>
      <Text style={styles.tileName} numberOfLines={2}>
        {crop.name}
      </Text>
      {selected && (
        <View style={styles.checkBadge}>
          <MaterialCommunityIcons name="check" size={14} color={colors.onPrimary} />
        </View>
      )}
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
    paddingTop: 16,
    paddingBottom: 8,
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    marginTop: 16,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: colors.textPrimary,
  },
  grid: {
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 16,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  tile: {
    alignItems: 'center',
    minHeight: 124,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  tileSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  empty: {
    marginTop: 40,
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
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
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
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
  countBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
