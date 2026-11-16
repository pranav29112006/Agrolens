import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { CropIcon } from '@/components/crops/CropIcon';
import {
  DiagnosisStepIcon,
  PictureStepIcon,
  TreatmentStepIcon,
} from '@/components/home/HealStepIcons';
import { colors } from '@/constants/colors';
import { CROP_CATEGORY_TINTS, CROPS, type CropId } from '@/constants/crops';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings, type Strings } from '@/i18n';
import type { SprayStatus, Weather } from '@/lib/api';
import { useLocationRequest } from '@/lib/useLocationRequest';
import { useWeather } from '@/lib/useWeather';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
type HomeStrings = Strings['home'];

const CATEGORY_BY_CROP = new Map(CROPS.map((crop) => [crop.id, crop.category]));

export default function HomeScreen() {
  const router = useRouter();
  const strings = useStrings();
  const { crops, location } = usePreferences();
  const requestLocation = useLocationRequest();
  const { weather, failed: weatherFailed } = useWeather(location);
  const [isCompact, setIsCompact] = useState(false);
  const [bandBottom, setBandBottom] = useState(Number.POSITIVE_INFINITY);

  const takePicture = () => router.push('/scan');
  const openCalculator = (kind: 'fertilizer' | 'pesticide' | 'farming') =>
    router.push({ pathname: '/calculator', params: { kind } });
  const openLibrary = (view: 'crops' | 'diseases' | 'tips' | 'alerts', crop?: CropId) =>
    router.push({ pathname: '/library-list', params: crop ? { view, crop } : { view } });

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader
        compact={isCompact}
        center={isCompact ? <CompactCameraButton label={strings.home.takePicture} onPress={takePicture} /> : null}
      >
        <AssistantButton
          label={strings.home.assistant}
          compact={isCompact}
          onPress={() => router.push('/assistant')}
        />
      </AppHeader>

      <ScrollView
        scrollEventThrottle={16}
        // Once the "take a picture" card scrolls away, keep its button in the header.
        onScroll={(event) => setIsCompact(event.nativeEvent.contentOffset.y > bandBottom)}
        contentContainerStyle={styles.content}
      >
        <CropsRow
          crops={crops}
          names={strings.cropNames}
          addLabel={strings.home.addCrop}
          onAdd={() => router.push('/crops')}
          onOpen={(id) => openLibrary('diseases', id)}
        />

        <View
          style={styles.band}
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout;
            setBandBottom(y + height);
          }}
        >
          <WeatherCards strings={strings.home} weather={weather} />
          {!location && <LocationPrompt strings={strings.home} onAllow={requestLocation} />}
          {weatherFailed && <Text style={styles.caption}>{strings.home.weatherUnavailable}</Text>}
          <HealCard strings={strings.home} onTakePicture={takePicture} />
        </View>

        <Text style={styles.sectionTitle}>{strings.home.tools}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tools}>
          <ToolCard
            icon="sack"
            label={strings.home.fertilizerCalculator}
            onPress={() => openCalculator('fertilizer')}
          />
          <ToolCard
            icon="spray-bottle"
            label={strings.home.pesticideCalculator}
            badge={strings.home.newBadge}
            onPress={() => openCalculator('pesticide')}
          />
          <ToolCard
            icon="calculator-variant-outline"
            label={strings.home.farmingCalculator}
            badge={strings.home.newBadge}
            onPress={() => openCalculator('farming')}
          />
        </ScrollView>

        <Text style={styles.sectionTitle}>{strings.tabs.library}</Text>
        <View style={styles.library}>
          <View style={styles.libraryColumn}>
            <LibraryTile icon="sprout-outline" label={strings.home.libraryCrops} onPress={() => openLibrary('crops')} />
            <LibraryTile
              icon="lightbulb-on-outline"
              label={strings.home.libraryTips}
              tall
              onPress={() => openLibrary('tips')}
            />
          </View>
          <View style={styles.libraryColumn}>
            <LibraryTile
              icon="bug-outline"
              label={strings.home.libraryPests}
              tall
              onPress={() => openLibrary('diseases')}
            />
            <LibraryTile icon="alert-outline" label={strings.home.libraryAlerts} onPress={() => openLibrary('alerts')} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AssistantButton({ label, compact, onPress }: { label: string; compact: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.assistant, compact && styles.assistantCompact]}
    >
      <MaterialCommunityIcons name="creation" size={18} color={colors.primary} />
      {!compact && <Text style={styles.assistantText}>{label}</Text>}
    </Pressable>
  );
}

function CompactCameraButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.compactCamera}>
      <MaterialCommunityIcons name="camera-outline" size={18} color={colors.onPrimary} />
      <Text style={styles.compactCameraText} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

type CropsRowProps = {
  crops: CropId[];
  names: Strings['cropNames'];
  addLabel: string;
  onAdd: () => void;
  onOpen: (id: CropId) => void;
};

function CropsRow({ crops, names, addLabel, onAdd, onOpen }: CropsRowProps) {
  return (
    <View style={styles.cropsBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.cropsScroll}
        contentContainerStyle={styles.cropsRow}
      >
        {crops.map((id) => (
          <Pressable key={id} accessibilityRole="button" onPress={() => onOpen(id)} style={styles.crop}>
            <View
              style={[
                styles.cropCircle,
                { backgroundColor: CROP_CATEGORY_TINTS[CATEGORY_BY_CROP.get(id) ?? 'vegetable'] },
              ]}
            >
              <CropIcon id={id} size={44} />
            </View>
            <Text style={styles.cropName} numberOfLines={1}>
              {names[id]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {/* Pinned outside the scroll so it stays visible however many crops there are. */}
      <Pressable accessibilityRole="button" onPress={onAdd} style={[styles.crop, styles.addCrop]}>
        <View style={[styles.cropCircle, styles.addCircle]}>
          <MaterialCommunityIcons name="plus" size={28} color={colors.onPrimary} />
        </View>
        <Text style={styles.cropName} numberOfLines={1}>
          {addLabel}
        </Text>
      </Pressable>
    </View>
  );
}

// WMO weather codes, as Open-Meteo reports them.
function weatherIcon(code: number, isDay: boolean): IconName {
  if (code === 0) return isDay ? 'weather-sunny' : 'weather-night';
  if (code <= 2) return isDay ? 'weather-partly-cloudy' : 'weather-night-partly-cloudy';
  if (code === 3) return 'weather-cloudy';
  if (code <= 48) return 'weather-fog';
  if (code <= 67 || (code >= 80 && code <= 82)) return 'weather-rainy';
  if (code <= 86) return 'weather-snowy';
  return 'weather-lightning-rainy';
}

const SPRAY_COLORS: Record<SprayStatus, string> = {
  good: colors.primary,
  moderate: '#8A5A12',
  poor: '#B3261E',
};

/** "15:00" for later today, "Sun 09:00" for another day. `until` is local time at the location. */
function formatUntil(until: string, now: string, language: string) {
  const date = new Date(until);
  const time = date.toLocaleTimeString(language, { hour: 'numeric', minute: '2-digit' });
  if (until.slice(0, 10) === now.slice(0, 10)) return time;
  return `${date.toLocaleDateString(language, { weekday: 'short' })} ${time}`;
}

function WeatherCards({ strings, weather }: { strings: HomeStrings; weather: Weather | null }) {
  const { language, temperatureUnit } = usePreferences();
  const locale = language ?? 'en';
  const today = new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const isFahrenheit = temperatureUnit === 'fahrenheit';
  const unit = isFahrenheit ? '°F' : '°C';
  const spraying = weather?.spraying;

  let temperature = '—';
  if (weather) {
    temperature = String(Math.round(isFahrenheit ? weather.temperature_c * 1.8 + 32 : weather.temperature_c));
  }

  // Why conditions aren't good, and how long they last.
  const sprayDetail = spraying
    ? [
        ...spraying.reasons.map((reason) => strings.sprayReasons[reason]),
        spraying.until && strings.sprayUntil.replace('{time}', formatUntil(spraying.until, weather.time, locale)),
      ]
        .filter(Boolean)
        .join(' · ')
    : '';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weatherRow}>
      <View style={styles.weatherCard}>
        <View style={styles.weatherText}>
          <Text style={styles.weatherLabel}>{today}</Text>
          <Text style={styles.weatherValue}>
            {temperature}
            {unit}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={weather ? weatherIcon(weather.weather_code, weather.is_day) : 'weather-partly-cloudy'}
          size={36}
          color={colors.surface}
        />
      </View>
      <View style={[styles.weatherCard, styles.sprayCard]}>
        <View style={styles.weatherText}>
          <Text style={styles.weatherLabel}>{strings.spraying}</Text>
          <Text style={styles.weatherValue}>{spraying ? strings.sprayStatus[spraying.status] : '—'}</Text>
          {sprayDetail !== '' && <Text style={styles.weatherLabel}>{sprayDetail}</Text>}
        </View>
        <View style={[styles.sprayIcon, spraying && { backgroundColor: SPRAY_COLORS[spraying.status] }]}>
          <MaterialCommunityIcons name="spray" size={20} color={colors.onPrimary} />
        </View>
      </View>
    </ScrollView>
  );
}

function LocationPrompt({ strings, onAllow }: { strings: HomeStrings; onAllow: () => void }) {
  return (
    <View style={styles.locationPrompt}>
      <View style={styles.locationRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={22} color={colors.textPrimary} />
        <Text style={styles.locationText}>{strings.locationPrompt}</Text>
      </View>
      <Pressable accessibilityRole="button" hitSlop={8} onPress={onAllow} style={styles.allowButton}>
        <Text style={styles.allowText}>{strings.allow}</Text>
      </Pressable>
    </View>
  );
}

function HealCard({ strings, onTakePicture }: { strings: HomeStrings; onTakePicture: () => void }) {
  const steps = [
    { key: 'picture', label: strings.stepPicture, Icon: PictureStepIcon },
    { key: 'diagnosis', label: strings.stepDiagnosis, Icon: DiagnosisStepIcon },
    { key: 'treatment', label: strings.stepTreatment, Icon: TreatmentStepIcon },
  ];

  return (
    <View style={styles.healCard}>
      <Text style={styles.healTitle}>{strings.healTitle}</Text>
      <View style={styles.steps}>
        {steps.map(({ key, label, Icon }, index) => (
          <View key={key} style={styles.stepWrap}>
            {index > 0 && (
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.radio} />
            )}
            <View style={styles.step}>
              <Icon size={56} />
              <Text style={styles.stepLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" onPress={onTakePicture} style={styles.cameraButton}>
        <MaterialCommunityIcons name="camera-outline" size={22} color={colors.onPrimary} />
        <Text style={styles.cameraText}>{strings.takePicture}</Text>
      </Pressable>
    </View>
  );
}

type TileProps = {
  icon: IconName;
  label: string;
  onPress: () => void;
};

function ToolCard({ icon, label, badge, onPress }: TileProps & { badge?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.toolCard}>
      <View style={styles.toolIcon}>
        <MaterialCommunityIcons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.toolLabel}>{label}</Text>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}

function LibraryTile({ icon, label, tall = false, onPress }: TileProps & { tall?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.libraryTile, tall && styles.libraryTileTall]}
    >
      <Text style={styles.libraryLabel}>{label}</Text>
      <View style={styles.libraryIcon}>
        <MaterialCommunityIcons name={icon} size={20} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: 24,
  },
  assistant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: colors.primaryTint,
  },
  assistantCompact: {
    width: 38,
    paddingHorizontal: 0,
    justifyContent: 'center',
  },
  assistantText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  compactCamera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  compactCameraText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  cropsBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cropsScroll: {
    flex: 1,
  },
  cropsRow: {
    gap: 14,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 12,
  },
  addCrop: {
    width: 72,
    paddingVertical: 12,
    paddingRight: 8,
  },
  crop: {
    width: 76,
    alignItems: 'center',
  },
  cropCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
  },
  cropName: {
    marginTop: 6,
    fontSize: 13,
    color: colors.textPrimary,
  },
  band: {
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: colors.primaryTint,
  },
  weatherRow: {
    gap: 12,
    paddingHorizontal: 16,
  },
  weatherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minWidth: 150,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: '#FCE9C4',
  },
  sprayCard: {
    minWidth: 220,
  },
  weatherText: {
    flex: 1,
  },
  weatherLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  weatherValue: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sprayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8A5A12',
  },
  caption: {
    marginTop: 12,
    marginHorizontal: 16,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  locationPrompt: {
    marginTop: 14,
    marginHorizontal: 16,
  },
  locationRow: {
    flexDirection: 'row',
    gap: 10,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textPrimary,
  },
  allowButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  allowText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  healCard: {
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  healTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  steps: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  stepWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  step: {
    flex: 1,
    alignItems: 'center',
  },
  stepLabel: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 17,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  cameraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    marginTop: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  cameraText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
    marginHorizontal: 16,
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  tools: {
    gap: 12,
    paddingHorizontal: 16,
  },
  toolCard: {
    width: 140,
    minHeight: 120,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  toolLabel: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#FBE3B0',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A4A00',
  },
  library: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
  },
  libraryColumn: {
    flex: 1,
    gap: 12,
  },
  libraryTile: {
    minHeight: 88,
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.primaryTint,
  },
  libraryTileTall: {
    minHeight: 160,
  },
  libraryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  libraryIcon: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
