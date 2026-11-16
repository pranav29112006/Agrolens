import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CropIcon } from '@/components/crops/CropIcon';
import { DiagnosisCard } from '@/components/diagnosis/DiagnosisCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { colors } from '@/constants/colors';
import { CROP_CATEGORY_TINTS, CROPS, type CropId } from '@/constants/crops';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings, type Strings } from '@/i18n';
import { ApiError, diagnoseLeaf, fetchSupportedCrops, type Diagnosis } from '@/lib/api';

const CATEGORY_BY_CROP = new Map(CROPS.map((crop) => [crop.id, crop.category]));

// Phone cameras produce far more pixels than the model uses; this keeps uploads small.
const PHOTO_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };

type Phase =
  | { step: 'choose' }
  | { step: 'checking'; photoUri: string }
  | { step: 'result'; photoUri: string; diagnosis: Diagnosis }
  | { step: 'failed'; photoUri: string; error: ApiError };

/** Pick the crop, take or choose a leaf photo, and see what the model makes of it. */
export default function ScanScreen() {
  const router = useRouter();
  const strings = useStrings();
  const { crops, language, growerType, location } = usePreferences();
  const [cropId, setCropId] = useState<CropId | null>(crops.length === 1 ? crops[0] : null);
  // null until the backend answers; every crop is offered meanwhile and the backend has the final say.
  const [supported, setSupported] = useState<Set<string> | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [phase, setPhase] = useState<Phase>({ step: 'choose' });

  useEffect(() => {
    fetchSupportedCrops()
      .then((ids) => setSupported(new Set(ids)))
      .catch(() => setSupported(null));
  }, []);

  const isSupported = (id: CropId) => supported === null || supported.has(id);
  const canScan = cropId !== null && isSupported(cropId);

  const check = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !cropId) return;
    const photo = result.assets[0];
    setPhase({ step: 'checking', photoUri: photo.uri });
    try {
      const diagnosis = await diagnoseLeaf({
        photo,
        cropId,
        language: language ?? 'en',
        growerType,
        location,
      });
      setPhase({ step: 'result', photoUri: photo.uri, diagnosis });
    } catch (error) {
      setPhase({
        step: 'failed',
        photoUri: photo.uri,
        error: error instanceof ApiError ? error : new ApiError('server'),
      });
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    setCameraDenied(!permission.granted);
    if (!permission.granted) return;
    await check(await ImagePicker.launchCameraAsync(PHOTO_OPTIONS));
  };

  const chooseFromGallery = async () => {
    await check(await ImagePicker.launchImageLibraryAsync(PHOTO_OPTIONS));
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ScreenHeader title={strings.scan.title} />
      <ScrollView contentContainerStyle={styles.content}>
        {phase.step === 'choose' ? (
          <>
            <Text style={styles.heading}>{strings.scan.chooseCrop}</Text>
            <View style={styles.crops}>
              {crops.map((id) => (
                <CropChoice
                  key={id}
                  id={id}
                  name={strings.cropNames[id]}
                  note={isSupported(id) ? null : strings.scan.notSupported}
                  selected={id === cropId}
                  onPress={() => setCropId(id)}
                />
              ))}
              <Pressable accessibilityRole="button" onPress={() => router.push('/crops')} style={styles.crop}>
                <View style={[styles.cropCircle, styles.addCircle]}>
                  <MaterialCommunityIcons name="plus" size={28} color={colors.onPrimary} />
                </View>
                <Text style={styles.cropName} numberOfLines={1}>
                  {strings.home.addCrop}
                </Text>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={!canScan}
              onPress={takePhoto}
              style={[styles.primaryButton, !canScan && styles.buttonDisabled]}
            >
              <MaterialCommunityIcons
                name="camera-outline"
                size={22}
                color={canScan ? colors.onPrimary : colors.onDisabled}
              />
              <Text style={[styles.primaryText, !canScan && styles.textDisabled]}>
                {strings.home.takePicture}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!canScan}
              onPress={chooseFromGallery}
              style={[styles.outlineButton, !canScan && styles.outlineDisabled]}
            >
              <MaterialCommunityIcons
                name="image-outline"
                size={22}
                color={canScan ? colors.primary : colors.onDisabled}
              />
              <Text style={[styles.outlineText, !canScan && styles.textDisabled]}>{strings.scan.gallery}</Text>
            </Pressable>
            {cameraDenied && <Text style={styles.note}>{strings.scan.cameraDenied}</Text>}
          </>
        ) : (
          <>
            <Image source={{ uri: phase.photoUri }} style={styles.photo} resizeMode="cover" />

            {phase.step === 'checking' && (
              <View style={styles.checking}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.checkingText}>{strings.scan.checking}</Text>
              </View>
            )}
            {phase.step === 'result' && cropId && (
              <DiagnosisCard diagnosis={phase.diagnosis} cropName={strings.cropNames[cropId]} />
            )}
            {phase.step === 'failed' && <Failure error={phase.error} strings={strings} />}

            {phase.step === 'failed' && phase.error.code === 'signed_out' && (
              <Pressable accessibilityRole="button" onPress={() => router.push('/sign-in')} style={styles.primaryButton}>
                <Text style={styles.primaryText}>{strings.auth.signInAction}</Text>
              </Pressable>
            )}
            {phase.step !== 'checking' && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setPhase({ step: 'choose' })}
                style={styles.outlineButton}
              >
                <MaterialCommunityIcons name="camera-retake-outline" size={22} color={colors.primary} />
                <Text style={styles.outlineText}>{strings.scan.retake}</Text>
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type CropChoiceProps = {
  id: CropId;
  name: string;
  /** Why the crop can't be picked, if it can't. */
  note: string | null;
  selected: boolean;
  onPress: () => void;
};

function CropChoice({ id, name, note, selected, onPress }: CropChoiceProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: note !== null }}
      disabled={note !== null}
      onPress={onPress}
      style={styles.crop}
    >
      <View
        style={[
          styles.cropCircle,
          { backgroundColor: CROP_CATEGORY_TINTS[CATEGORY_BY_CROP.get(id) ?? 'vegetable'] },
          selected && styles.cropSelected,
          note !== null && styles.cropUnavailable,
        ]}
      >
        <CropIcon id={id} size={44} />
      </View>
      <Text style={[styles.cropName, selected && styles.cropNameSelected]} numberOfLines={1}>
        {name}
      </Text>
      {note !== null && <Text style={styles.cropNote}>{note}</Text>}
    </Pressable>
  );
}

function Failure({ error, strings }: { error: ApiError; strings: Strings }) {
  const isPoorPhoto = error.code === 'poor_image';
  // A rejected photo says what to fix; anything else is not the photo's fault.
  const lines = isPoorPhoto ? error.issues.map((issue) => strings.scan.issues[issue]).filter(Boolean) : [];
  let title = strings.auth.errorGeneric;
  if (isPoorPhoto) title = strings.scan.poorPhoto;
  if (error.code === 'offline') title = strings.scan.offline;
  if (error.code === 'crop_not_supported') title = strings.scan.notSupported;
  // Diagnoses are saved to an account, so the backend only accepts signed-in users.
  if (error.code === 'signed_out') title = strings.auth.signInSubtitle;

  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <MaterialCommunityIcons
          name={isPoorPhoto ? 'image-off-outline' : 'alert-circle-outline'}
          size={28}
          color={colors.warning}
        />
        <Text style={[styles.cardTitle, !isPoorPhoto && styles.cardMessage]}>{title}</Text>
      </View>
      {lines.map((line) => (
        <Text key={line} style={styles.advice}>
          {line}
        </Text>
      ))}
    </View>
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
  heading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  crops: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  crop: {
    width: '25%',
    alignItems: 'center',
  },
  cropCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cropSelected: {
    borderColor: colors.primary,
  },
  cropUnavailable: {
    opacity: 0.4,
  },
  addCircle: {
    backgroundColor: colors.primary,
  },
  cropName: {
    marginTop: 6,
    paddingHorizontal: 2,
    fontSize: 13,
    color: colors.textPrimary,
  },
  cropNameSelected: {
    fontWeight: '700',
    color: colors.primary,
  },
  cropNote: {
    paddingHorizontal: 2,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  primaryText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  outlineText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  buttonDisabled: {
    backgroundColor: colors.disabled,
  },
  outlineDisabled: {
    borderColor: colors.disabled,
  },
  textDisabled: {
    color: colors.onDisabled,
  },
  note: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 20,
    backgroundColor: colors.border,
  },
  checking: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  checkingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  card: {
    marginTop: 16,
    marginBottom: 4,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardMessage: {
    fontSize: 17,
    lineHeight: 24,
  },
  advice: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
});
