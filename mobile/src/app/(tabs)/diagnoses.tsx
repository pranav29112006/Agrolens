import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { DetectIllustration } from '@/components/onboarding/Illustrations';
import { colors } from '@/constants/colors';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings, type Strings } from '@/i18n';
import { loadDiagnoses, type SavedDiagnosis } from '@/lib/diagnoses';

/** The account's past leaf scans, newest first. */
export default function DiagnosesScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const strings = useStrings();
  const { language } = usePreferences();
  // undefined while loading, null when the history could not be read.
  const [diagnoses, setDiagnoses] = useState<SavedDiagnosis[] | null | undefined>(undefined);

  // Reload whenever the tab is opened, so a scan that just finished shows up.
  useFocusEffect(
    useCallback(() => {
      let isCurrent = true;
      loadDiagnoses().then((rows) => {
        if (isCurrent) setDiagnoses(rows);
      });
      return () => {
        isCurrent = false;
      };
    }, []),
  );

  const scan = () => router.push('/scan');

  if (diagnoses === undefined) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <AppHeader />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (diagnoses === null || diagnoses.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <AppHeader />
        <ScrollView contentContainerStyle={styles.empty}>
          <DetectIllustration width={Math.min(width - 80, 260)} />
          <Text style={styles.title}>
            {diagnoses === null ? strings.scan.offline : strings.diagnoses.emptyTitle}
          </Text>
          {diagnoses !== null && <Text style={styles.body}>{strings.diagnoses.emptyBody}</Text>}
          <Pressable accessibilityRole="button" onPress={scan} style={styles.button}>
            <MaterialCommunityIcons name="camera-outline" size={22} color={colors.onPrimary} />
            <Text style={styles.buttonText}>{strings.home.takePicture}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <FlatList
        data={diagnoses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <DiagnosisRow
            diagnosis={item}
            strings={strings}
            locale={language ?? 'en'}
            onPress={() => router.push({ pathname: '/diagnosis', params: { id: item.id } })}
          />
        )}
        ListFooterComponent={
          <Pressable accessibilityRole="button" onPress={scan} style={styles.button}>
            <MaterialCommunityIcons name="camera-outline" size={22} color={colors.onPrimary} />
            <Text style={styles.buttonText}>{strings.home.takePicture}</Text>
          </Pressable>
        }
        ListFooterComponentStyle={styles.footer}
      />
    </SafeAreaView>
  );
}

type DiagnosisRowProps = {
  diagnosis: SavedDiagnosis;
  strings: Strings;
  locale: string;
  onPress: () => void;
};

function DiagnosisRow({ diagnosis, strings, locale, onPress }: DiagnosisRowProps) {
  const { cropId, disease, confidence, isConfident, createdAt, photoUrl } = diagnosis;
  const date = new Date(createdAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      {photoUrl ? (
        <Image source={{ uri: photoUrl }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoMissing]}>
          <MaterialCommunityIcons name="leaf" size={28} color={colors.radio} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {disease ?? strings.diagnoses.healthy}
        </Text>
        <Text style={styles.rowDetail} numberOfLines={1}>
          {cropId ? `${strings.cropNames[cropId]} · ${date}` : date}
        </Text>
        {isConfident ? (
          confidence !== null && (
            <Text style={styles.rowDetail}>
              {strings.diagnoses.confidence}: {Math.round(confidence * 100)}%
            </Text>
          )
        ) : (
          <View style={styles.unsure}>
            <Text style={styles.unsureText}>{strings.diagnoses.unsure}</Text>
          </View>
        )}
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
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 24,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    marginTop: 24,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  list: {
    gap: 12,
    padding: 16,
    paddingBottom: 24,
  },
  footer: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.border,
  },
  photoMissing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowDetail: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  unsure: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#FBE3B0',
  },
  unsureText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A4A00',
  },
});
