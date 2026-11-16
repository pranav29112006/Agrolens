import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AuthError } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { colors } from '@/constants/colors';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings, type Strings } from '@/i18n';
import { loadAccountSetup, saveAccountCrops, saveAccountProfile } from '@/lib/account';
import { supabase } from '@/lib/supabase';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

type AuthStrings = Strings['auth'];

function messageForError(error: AuthError, strings: AuthStrings) {
  switch (error.code) {
    case 'invalid_credentials':
      return strings.errorCredentials;
    case 'user_already_exists':
    case 'email_exists':
      return strings.errorEmailTaken;
    case 'email_not_confirmed':
      return strings.errorNotConfirmed;
    case 'weak_password':
      return strings.errorPassword;
    case 'validation_failed':
      return strings.errorEmail;
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return strings.errorRateLimit;
    default:
      return strings.errorGeneric;
  }
}

export function AuthForm({ mode }: { mode: 'signIn' | 'signUp' }) {
  const router = useRouter();
  const strings = useStrings().auth;
  const { language, location, crops, growerType, accountId, adoptAccount, resetDevice } =
    usePreferences();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === 'signUp';

  const submit = async () => {
    const trimmedEmail = email.trim();
    setError(undefined);
    setNotice(undefined);

    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError(strings.errorEmail);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(strings.errorPassword);
      return;
    }

    setIsSubmitting(true);
    const { data, error: authError } = isSignUp
      ? await supabase.auth.signUp({ email: trimmedEmail, password })
      : await supabase.auth.signInWithPassword({ email: trimmedEmail, password });

    if (authError) {
      setError(messageForError(authError, strings));
      setIsSubmitting(false);
      return;
    }

    // Signing up with an address that already exists comes back as success with
    // no identities, so that sign-up can't be used to discover who has an account.
    if (isSignUp && data.user?.identities?.length === 0) {
      setError(strings.errorEmailTaken);
      setIsSubmitting(false);
      return;
    }

    if (!data.session) {
      // Sign-up succeeded but the project requires email confirmation first.
      setNotice(strings.checkEmail);
      setIsSubmitting(false);
      return;
    }

    await settleAccount(data.session.user.id);
  };

  /**
   * The account decides what the app shows. An account that has crops brings them
   * to this device; a new account takes over choices made during onboarding, and
   * otherwise the farmer picks crops for this account now.
   */
  const settleAccount = async (userId: string) => {
    const setup = await loadAccountSetup(userId);

    if (!setup) {
      // Couldn't read the account (e.g. offline): keep this phone's data rather than overwrite it.
      router.replace('/home');
      return;
    }

    if (setup.crops.length > 0) {
      await adoptAccount(userId, setup);
      router.replace('/home');
      return;
    }

    // Choices made during onboarding, before any account existed, belong to this account.
    const ownsDeviceChoices = accountId === null && crops.length > 0;
    const accountGrowerType = ownsDeviceChoices ? growerType : null;

    const profileError = await saveAccountProfile(userId, {
      language,
      location,
      growerType: accountGrowerType,
    });
    if (profileError) console.warn('Could not save profile:', profileError.message);

    if (ownsDeviceChoices) {
      const cropsError = await saveAccountCrops(userId, crops);
      if (cropsError) console.warn('Could not save crops:', cropsError.message);
      await adoptAccount(userId, { language, location, crops, growerType });
      router.replace('/home');
      return;
    }

    // An account with nothing set up yet goes through crops and "how do you grow" now.
    await adoptAccount(userId, { language, location, crops: [], growerType: null });
    router.replace({ pathname: '/crops', params: { next: 'grower-type' } });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <BrandMark />
          <Text style={styles.title}>{isSignUp ? strings.signUpTitle : strings.signInTitle}</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? strings.signUpSubtitle : strings.signInSubtitle}
          </Text>

          <Text style={styles.label}>{strings.email}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            inputMode="email"
            keyboardType="email-address"
            placeholder="name@example.com"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
          />

          <Text style={styles.label}>{strings.password}</Text>
          <View style={styles.passwordRow}>
            <TextInput
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              secureTextEntry={!isPasswordVisible}
              placeholder={strings.passwordHint}
              placeholderTextColor={colors.textSecondary}
              style={styles.passwordInput}
              onSubmitEditing={submit}
              returnKeyType="go"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPasswordVisible ? strings.hidePassword : strings.showPassword}
              hitSlop={8}
              onPress={() => setIsPasswordVisible((visible) => !visible)}
            >
              <MaterialCommunityIcons
                name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          {error && (
            <View style={[styles.banner, styles.errorBanner]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#B3261E" />
              <Text style={[styles.bannerText, styles.errorText]}>{error}</Text>
            </View>
          )}
          {notice && (
            <View style={[styles.banner, styles.noticeBanner]}>
              <MaterialCommunityIcons name="email-check-outline" size={18} color={colors.primary} />
              <Text style={styles.bannerText}>{notice}</Text>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
            disabled={isSubmitting}
            onPress={submit}
            style={styles.submitButton}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.onPrimary} />
            ) : (
              <Text style={styles.submitText}>
                {isSignUp ? strings.signUpAction : strings.signInAction}
              </Text>
            )}
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={styles.switchPrompt}>
              {isSignUp ? strings.signUpSwitch : strings.signInSwitch}
            </Text>
            <Pressable
              accessibilityRole="link"
              hitSlop={8}
              onPress={() => router.replace(isSignUp ? '/sign-in' : '/sign-up')}
            >
              <Text style={styles.switchAction}>
                {isSignUp ? strings.signUpSwitchAction : strings.signInSwitchAction}
              </Text>
            </Pressable>
          </View>
          <View style={styles.startOverRow}>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={async () => {
                await resetDevice();
                router.replace('/language');
              }}
            >
              <Text style={styles.startOverAction}>Restart setup from language selection</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    marginTop: 28,
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 8,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  label: {
    marginTop: 16,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  input: {
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.textPrimary,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: colors.textPrimary,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
  },
  errorBanner: {
    backgroundColor: '#FBE6E4',
  },
  noticeBanner: {
    backgroundColor: colors.primaryTint,
  },
  bannerText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  errorText: {
    color: '#8C1D18',
  },
  submitButton: {
    height: 52,
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  switchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 20,
  },
  switchPrompt: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  switchAction: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  startOverRow: {
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startOverAction: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
});
