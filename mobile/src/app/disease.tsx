import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuidanceSections } from '@/components/diagnosis/DiagnosisCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/constants/colors';
import { isCropId } from '@/constants/crops';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings } from '@/i18n';
import { ApiError, fetchAdvice, type Advice } from '@/lib/api';
import { diseaseName } from '@/lib/diagnoses';

/** A library page: everything the knowledge base says about one disease. */
export default function DiseaseScreen() {
  const strings = useStrings();
  const { language, growerType, isLoaded } = usePreferences();
  const { label } = useLocalSearchParams<{ label: string }>();
  // undefined while loading; an ApiError when the advice could not be fetched.
  const [advice, setAdvice] = useState<Advice | ApiError | undefined>(undefined);

  useEffect(() => {
    // Saved preferences load after the first render; asking before then would fetch twice.
    if (!isLoaded) return;
    let isCurrent = true;
    fetchAdvice(label, language ?? 'en', growerType)
      .then((result) => isCurrent && setAdvice(result))
      .catch((error) => isCurrent && setAdvice(error instanceof ApiError ? error : new ApiError('server')));
    return () => {
      isCurrent = false;
    };
  }, [label, language, growerType, isLoaded]);

  const cropId = label.split('___')[0];
  let message: string | null = null;
  if (advice instanceof ApiError) {
    message = advice.code === 'signed_out' ? strings.auth.signInSubtitle : strings.scan.offline;
  } else if (advice && !advice.guidance) {
    message = strings.library.notCovered;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title={diseaseName(label) ?? strings.diagnoses.healthy} />
      <ScrollView contentContainerStyle={styles.content}>
        {advice === undefined && <ActivityIndicator size="large" color={colors.primary} style={styles.loading} />}
        {message !== null && <Text style={styles.message}>{message}</Text>}
        {advice && !(advice instanceof ApiError) && advice.guidance && (
          <View style={styles.card}>
            {isCropId(cropId) && <Text style={styles.crop}>{strings.cropNames[cropId]}</Text>}
            <GuidanceSections guidance={advice.guidance} writtenIn={advice.language} />
          </View>
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
  message: {
    marginTop: 48,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    padding: 16,
    paddingTop: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  crop: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
