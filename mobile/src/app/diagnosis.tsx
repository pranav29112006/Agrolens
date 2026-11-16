import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiagnosisCard } from '@/components/diagnosis/DiagnosisCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/constants/colors';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings } from '@/i18n';
import { fetchAdvice, type Advice } from '@/lib/api';
import { loadDiagnoses, type SavedDiagnosis } from '@/lib/diagnoses';

type Loaded = {
  saved: SavedDiagnosis;
  /** undefined while the advice is being written, null when it could not be fetched. */
  advice: Advice | null | undefined;
};

/** A past leaf scan: its photo, what the model found and the advice for it. */
export default function DiagnosisScreen() {
  const strings = useStrings();
  const { language, growerType, isLoaded } = usePreferences();
  const { id } = useLocalSearchParams<{ id: string }>();
  // undefined while loading, null when the scan could not be read.
  const [loaded, setLoaded] = useState<Loaded | null | undefined>(undefined);

  useEffect(() => {
    // Saved preferences load after the first render; asking before then would fetch twice.
    if (!isLoaded) return;
    let isCurrent = true;
    (async () => {
      const saved = (await loadDiagnoses(id))?.[0];
      if (!saved) {
        if (isCurrent) setLoaded(null);
        return;
      }
      // Only a confident diagnosis of a disease has guidance to fetch.
      if (!saved.isConfident || !saved.disease) {
        const kind = saved.isConfident ? 'healthy' : 'consult_expert';
        if (isCurrent) setLoaded({ saved, advice: { kind, guidance: null, language: 'en' } });
        return;
      }
      // Writing the advice can take a while, so the photo and diagnosis are shown first.
      if (isCurrent) setLoaded({ saved, advice: undefined });
      const advice = await fetchAdvice(saved.label, language ?? 'en', growerType).catch(() => null);
      if (isCurrent) setLoaded({ saved, advice });
    })();
    return () => {
      isCurrent = false;
    };
  }, [id, language, growerType, isLoaded]);

  const saved = loaded?.saved;
  const date = saved
    ? new Date(saved.createdAt).toLocaleDateString(language ?? 'en', { day: 'numeric', month: 'short', year: 'numeric' })
    : strings.tabs.diagnoses;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title={date} />
      <ScrollView contentContainerStyle={styles.content}>
        {loaded === undefined && <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />}
        {loaded === null && <Text style={styles.message}>{strings.scan.offline}</Text>}
        {loaded && saved && (
          <>
            {saved.photoUrl && <Image source={{ uri: saved.photoUrl }} style={styles.photo} resizeMode="cover" />}
            <DiagnosisCard
              cropName={saved.cropId ? strings.cropNames[saved.cropId] : null}
              note={loaded.advice === undefined ? '…' : loaded.advice ? undefined : strings.scan.offline}
              diagnosis={{
                id: saved.id,
                prediction: {
                  label: saved.label,
                  crop_id: saved.cropId,
                  disease: saved.disease,
                  is_healthy: saved.disease === null,
                  confidence: saved.confidence ?? 0,
                },
                // Only the best guess is saved with a scan.
                alternatives: [],
                is_confident: saved.isConfident,
                advice: loaded.advice ?? { kind: 'pending', guidance: null, language: 'en' },
              }}
            />
            {loaded.advice === undefined && <ActivityIndicator color={colors.primary} style={styles.writing} />}
          </>
        )}
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
    paddingBottom: 32,
  },
  loading: {
    marginTop: 48,
  },
  writing: {
    marginTop: 16,
  },
  message: {
    marginTop: 48,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
});
