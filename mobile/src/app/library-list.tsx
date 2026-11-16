import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CropIcon } from '@/components/crops/CropIcon';
import { BulletList } from '@/components/diagnosis/DiagnosisCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/constants/colors';
import { isCropId, type CropId } from '@/constants/crops';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings } from '@/i18n';
import { fetchAlerts, fetchLibrary, fetchTips, type Disease, type Tips } from '@/lib/api';

/** crops: pick a crop. diseases: a crop's (or every) disease. tips: a crop's tips. alerts: diseases the weather favours. */
type LibraryView = 'crops' | 'diseases' | 'tips' | 'alerts';

type Content =
  | { kind: 'crops'; crops: CropId[] }
  | { kind: 'diseases'; diseases: Disease[] }
  | { kind: 'tips'; tips: Tips };

/** The library's lists, all read from the backend's knowledge base. */
export default function LibraryListScreen() {
  const router = useRouter();
  const strings = useStrings();
  const { crops: myCrops, language, location, isLoaded } = usePreferences();
  const params = useLocalSearchParams<{ view: LibraryView; crop?: string }>();
  const view = params.view ?? 'diseases';
  const crop = params.crop && isCropId(params.crop) ? params.crop : null;
  // undefined while loading, null when the backend could not be reached.
  const [content, setContent] = useState<Content | null | undefined>(undefined);

  const needsLocation = isLoaded && view === 'alerts' && !location;
  const myCropsKey = myCrops.join(',');

  useEffect(() => {
    // Saved preferences (crops, language, location) load after the first render.
    if (!isLoaded || needsLocation) return;
    let isCurrent = true;

    const load = async (): Promise<Content> => {
      if (view === 'alerts' && location) {
        return { kind: 'diseases', diseases: await fetchAlerts(location, myCrops) };
      }
      if (view === 'tips' && crop) {
        return { kind: 'tips', tips: await fetchTips(crop, language ?? 'en') };
      }
      const diseases = await fetchLibrary();
      if (view === 'diseases') {
        return { kind: 'diseases', diseases: diseases.filter((disease) => !crop || disease.crop_id === crop) };
      }
      // Crops the knowledge base covers, the farmer's own first.
      const covered = [...new Set(diseases.map((disease) => disease.crop_id))].filter(
        (id): id is CropId => id !== null && isCropId(id),
      );
      return { kind: 'crops', crops: [...covered].sort((a, b) => Number(myCrops.includes(b)) - Number(myCrops.includes(a))) };
    };

    load()
      .then((loaded) => isCurrent && setContent(loaded))
      .catch(() => isCurrent && setContent(null));
    return () => {
      isCurrent = false;
    };
    // myCrops and location are compared by value, so a re-render doesn't refetch.
  }, [view, crop, language, isLoaded, needsLocation, myCropsKey, location?.latitude, location?.longitude]);

  const titles: Record<LibraryView, string> = {
    crops: strings.home.libraryCrops,
    diseases: strings.home.libraryPests,
    tips: strings.home.libraryTips,
    alerts: strings.home.libraryAlerts,
  };

  let message: string | null = null;
  if (needsLocation) message = strings.home.locationPrompt;
  else if (content === null) message = strings.scan.offline;
  else if (content?.kind === 'diseases' && content.diseases.length === 0) {
    message = view === 'alerts' ? strings.library.noAlerts : strings.library.notCovered;
  } else if (content?.kind === 'tips' && content.tips.tips.length === 0) message = strings.library.notCovered;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title={crop ? strings.cropNames[crop] : titles[view]} />
      <ScrollView contentContainerStyle={styles.content}>
        {content === undefined && !needsLocation && (
          <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />
        )}
        {message !== null && <Text style={styles.message}>{message}</Text>}

        {content?.kind === 'crops' && (
          <>
            <Text style={styles.heading}>{strings.library.chooseCrop}</Text>
            {content.crops.map((id) => (
              <Row
                key={id}
                title={strings.cropNames[id]}
                icon={<CropIcon id={id} size={32} />}
                onPress={() =>
                  router.push({
                    pathname: '/library-list',
                    // "Cultivation tips" picks a crop first, then shows its tips.
                    params: { view: view === 'tips' ? 'tips' : 'diseases', crop: id },
                  })
                }
              />
            ))}
          </>
        )}

        {content?.kind === 'diseases' && content.diseases.length > 0 && (
          <>
            {view === 'alerts' && <Text style={styles.note}>{strings.library.alertNote}</Text>}
            {content.diseases.map((disease) => (
              <Row
                key={disease.label}
                title={disease.disease ?? disease.label}
                subtitle={
                  !crop && disease.crop_id && isCropId(disease.crop_id) ? strings.cropNames[disease.crop_id] : undefined
                }
                icon={
                  <MaterialCommunityIcons
                    name={view === 'alerts' ? 'alert-outline' : 'bug-outline'}
                    size={24}
                    color={view === 'alerts' ? colors.warning : colors.primary}
                  />
                }
                onPress={() => router.push({ pathname: '/disease', params: { label: disease.label } })}
              />
            ))}
          </>
        )}

        {content?.kind === 'tips' && content.tips.tips.length > 0 && (
          <View style={styles.card}>
            <BulletList items={content.tips.tips} />
            {content.tips.language !== (language ?? 'en') && (
              <Text style={styles.finePrint}>{strings.diagnoses.englishOnly}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type RowProps = {
  title: string;
  subtitle?: string;
  icon: ReactNode;
  onPress: () => void;
};

function Row({ title, subtitle, icon, onPress }: RowProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle !== undefined && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color={colors.radio} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: 12,
    padding: 16,
    paddingBottom: 32,
  },
  loading: {
    marginTop: 48,
  },
  message: {
    marginTop: 48,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  note: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  rowSubtitle: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textSecondary,
  },
  card: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  finePrint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
});
