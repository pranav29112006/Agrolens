import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings } from '@/i18n';
import type { Diagnosis, Guidance, Prediction } from '@/lib/api';

// Guesses below this aren't worth showing as "other possibilities".
const MIN_ALTERNATIVE_CONFIDENCE = 0.01;

function percent(confidence: number) {
  return `${Math.round(confidence * 100)}%`;
}

type DiagnosisCardProps = {
  diagnosis: Diagnosis;
  cropName: string | null;
  /** Shown instead of the usual one-line advice, e.g. when the guidance couldn't be loaded. */
  note?: string;
};

/** What the model made of a leaf, with the advice for it. */
export function DiagnosisCard({ diagnosis, cropName, note }: DiagnosisCardProps) {
  const text = useStrings().diagnoses;
  const { prediction, alternatives, is_confident: isConfident } = diagnosis;
  const name = (guess: Prediction) => (guess.is_healthy ? text.healthy : guess.disease);
  // An unsure answer lists its best guess with the others rather than as the headline.
  // The model's "no leaf in this photo" class has no name and isn't a diagnosis.
  const others = (isConfident ? alternatives : [prediction, ...alternatives]).filter(
    (guess) => guess.confidence >= MIN_ALTERNATIVE_CONFIDENCE && (guess.is_healthy || guess.disease),
  );

  const guidance = isConfident ? diagnosis.advice.guidance : null;
  // One line of advice, unless the knowledge base has full guidance for this disease.
  let advice: string | null = text.treatmentSoon;
  if (!isConfident) advice = text.unsureBody;
  else if (prediction.is_healthy) advice = text.healthyBody;
  else if (guidance) advice = null;
  else if (note) advice = note;

  let icon: 'help-circle-outline' | 'check-circle-outline' | 'alert-circle-outline' = 'alert-circle-outline';
  if (!isConfident) icon = 'help-circle-outline';
  else if (prediction.is_healthy) icon = 'check-circle-outline';

  return (
    <View style={styles.card}>
      {cropName !== null && <Text style={styles.crop}>{cropName}</Text>}
      <View style={styles.titleRow}>
        <MaterialCommunityIcons
          name={icon}
          size={28}
          color={isConfident && prediction.is_healthy ? colors.primary : colors.warning}
        />
        <Text style={styles.title}>{isConfident ? name(prediction) : text.unsure}</Text>
      </View>
      {isConfident && prediction.confidence > 0 && (
        <Text style={styles.confidence}>
          {text.confidence}: {percent(prediction.confidence)}
        </Text>
      )}
      {advice !== null && <Text style={styles.advice}>{advice}</Text>}
      {guidance && <GuidanceSections guidance={guidance} writtenIn={diagnosis.advice.language} />}

      {others.length > 0 && (
        <>
          <Text style={styles.othersTitle}>{text.alternatives}</Text>
          {others.map((guess) => (
            <View key={guess.label} style={styles.otherRow}>
              <Text style={styles.otherName}>{name(guess)}</Text>
              <Text style={styles.otherConfidence}>{percent(guess.confidence)}</Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

type GuidanceProps = {
  guidance: Guidance;
  /** Language code the backend wrote the guidance in. */
  writtenIn: string;
};

/** Cause, severity, what to do, prevention, symptoms and sources for a disease. */
export function GuidanceSections({ guidance, writtenIn }: GuidanceProps) {
  const text = useStrings().diagnoses;
  const { language } = usePreferences();
  const lists = [
    { title: text.treatment, items: guidance.treatment },
    { title: text.prevention, items: guidance.prevention },
    { title: text.symptoms, items: guidance.symptoms },
  ];

  return (
    <>
      <Text style={styles.sectionTitle}>{text.cause}</Text>
      <Text style={styles.sectionText}>{guidance.cause}</Text>
      {guidance.severity && (
        <>
          <Text style={styles.sectionTitle}>{text.severity}</Text>
          <Text style={styles.sectionText}>{guidance.severity}</Text>
        </>
      )}
      {lists.map(
        ({ title, items }) =>
          items.length > 0 && (
            <View key={title}>
              <Text style={styles.sectionTitle}>{title}</Text>
              <BulletList items={items} />
            </View>
          ),
      )}

      <Text style={styles.sectionTitle}>{text.sources}</Text>
      <SourceLinks sources={guidance.sources} />
      <Text style={styles.finePrint}>{text.pesticideNote}</Text>
      {/* The backend falls back to English when it can't rewrite the advice. */}
      {writtenIn !== (language ?? 'en') && <Text style={styles.finePrint}>{text.englishOnly}</Text>}
    </>
  );
}

export function BulletList({ items }: { items: string[] }) {
  return (
    <>
      {items.map((item) => (
        <View key={item} style={styles.bullet}>
          <Text style={styles.sectionText}>•</Text>
          <Text style={[styles.sectionText, styles.bulletText]}>{item}</Text>
        </View>
      ))}
    </>
  );
}

export function SourceLinks({ sources }: { sources: Guidance['sources'] }) {
  return (
    <>
      {sources.map((source) => (
        <Text
          key={source.url}
          accessibilityRole="link"
          onPress={() => Linking.openURL(source.url)}
          style={[styles.sectionText, styles.link]}
        >
          {source.title}
        </Text>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    marginBottom: 4,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  crop: {
    marginBottom: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  confidence: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  advice: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  sectionTitle: {
    marginTop: 16,
    marginBottom: 4,
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
  },
  bullet: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  bulletText: {
    flex: 1,
  },
  link: {
    marginBottom: 4,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  finePrint: {
    marginTop: 12,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  othersTitle: {
    marginTop: 16,
    marginBottom: 4,
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  otherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  otherName: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
  },
  otherConfidence: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
