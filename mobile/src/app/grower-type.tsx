import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { GrowerIllustration } from '@/components/onboarding/Illustrations';
import { colors } from '@/constants/colors';
import type { GrowerType } from '@/constants/growerTypes';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings, type Strings } from '@/i18n';
import { saveAccountProfile } from '@/lib/account';
import { goBackOrHome } from '@/lib/navigation';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const OPTIONS: { type: GrowerType; icon: IconName; label: keyof Strings['growerType'] }[] = [
  { type: 'pots', icon: 'sprout', label: 'pots' },
  { type: 'home_garden', icon: 'home-outline', label: 'homeGarden' },
  { type: 'fields', icon: 'tractor', label: 'fields' },
];

export default function GrowerTypeScreen() {
  const router = useRouter();
  const { height, width } = useWindowDimensions();
  const strings = useStrings();
  const { growerType, hasOnboarded, setGrowerType, completeOnboarding } = usePreferences();
  const { session } = useAuth();
  const [selected, setSelected] = useState<GrowerType | null>(growerType);
  const [isSaving, setIsSaving] = useState(false);

  const finish = async (choice: GrowerType | null) => {
    setIsSaving(true);

    if (choice) {
      await setGrowerType(choice);
      if (session) {
        const error = await saveAccountProfile(session.user.id, { growerType: choice });
        if (error) console.warn('Could not save grower type to the account:', error.message);
      }
    }

    if (hasOnboarded) {
      // Opened later from Settings, or while setting up a new account.
      goBackOrHome(router);
    } else {
      await completeOnboarding();
      router.replace('/sign-in');
    }
  };

  const canContinue = selected !== null && !isSaving;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <BrandMark />
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          hitSlop={12}
          onPress={() => finish(null)}
          style={styles.skipButton}
        >
          <Text style={styles.skipText}>{strings.onboarding.skip}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.illustration}>
          <GrowerIllustration width={Math.min(width - 56, 300, height * 0.3)} />
        </View>
        <Text style={styles.title}>{strings.growerType.title}</Text>
        <Text style={styles.subtitle}>{strings.growerType.subtitle}</Text>

        <View accessibilityRole="radiogroup" style={styles.options}>
          {OPTIONS.map((option) => {
            const isSelected = option.type === selected;
            return (
              <Pressable
                key={option.type}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                onPress={() => setSelected(option.type)}
                style={[styles.option, isSelected && styles.optionSelected]}
              >
                <View style={[styles.optionIcon, isSelected && styles.optionIconSelected]}>
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={22}
                    color={isSelected ? colors.onPrimary : colors.primary}
                  />
                </View>
                <Text style={styles.optionLabel}>{strings.growerType[option.label]}</Text>
                <MaterialCommunityIcons
                  name={isSelected ? 'check-circle' : 'circle-outline'}
                  size={22}
                  color={isSelected ? colors.primary : colors.radio}
                />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canContinue, busy: isSaving }}
          disabled={!canContinue}
          onPress={() => finish(selected)}
          style={[styles.nextButton, canContinue && styles.nextButtonEnabled]}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Text style={[styles.nextText, canContinue && styles.nextTextEnabled]}>
                {strings.onboarding.next}
              </Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color={canContinue ? colors.onPrimary : colors.onDisabled}
              />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 20,
    paddingRight: 12,
    paddingTop: 12,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  illustration: {
    alignItems: 'center',
  },
  title: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  options: {
    gap: 12,
    marginTop: 20,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryTint,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  optionIconSelected: {
    backgroundColor: colors.primary,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  nextButton: {
    height: 52,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.disabled,
  },
  nextButtonEnabled: {
    backgroundColor: colors.primary,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onDisabled,
  },
  nextTextEnabled: {
    color: colors.onPrimary,
  },
});
