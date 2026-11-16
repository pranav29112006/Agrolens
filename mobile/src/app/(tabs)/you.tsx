import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/AppHeader';
import { colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings } from '@/i18n';
import { supabase } from '@/lib/supabase';
import { useShareApp } from '@/lib/useShareApp';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export default function YouScreen() {
  const router = useRouter();
  const strings = useStrings();
  const { session } = useAuth();
  const { forgetAccount } = usePreferences();
  const shareApp = useShareApp();
  const email = session?.user.email ?? '';

  const signOut = async () => {
    await supabase.auth.signOut();
    // The next person to sign in on this phone should not inherit these crops.
    await forgetAccount();
    router.replace('/sign-in');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.accountCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{email.charAt(0).toUpperCase() || '?'}</Text>
          </View>
          <View style={styles.accountText}>
            <Text style={styles.accountTitle}>{strings.you.account}</Text>
            <Text style={styles.email} numberOfLines={1}>
              {email}
            </Text>
            <Pressable accessibilityRole="button" onPress={signOut} style={styles.signOut}>
              <Text style={styles.signOutText}>{strings.you.signOut}</Text>
            </Pressable>
          </View>
        </View>

        <InfoCard
          icon="message-star-outline"
          title={strings.you.feedbackTitle}
          body={strings.you.feedbackBody}
          action={strings.you.feedbackAction}
          onPress={() =>
            router.push({ pathname: '/coming-soon', params: { title: strings.you.feedbackAction } })
          }
        />
        <InfoCard
          icon="sprout"
          accent
          title={strings.you.shareTitle}
          body={strings.you.shareBody}
          action={strings.you.shareAction}
          onPress={shareApp}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

type InfoCardProps = {
  icon: IconName;
  accent?: boolean;
  title: string;
  body: string;
  action: string;
  onPress: () => void;
};

function InfoCard({ icon, accent = false, title, body, action, onPress }: InfoCardProps) {
  return (
    <View style={styles.card}>
      <View style={[styles.cardIcon, accent && styles.cardIconAccent]}>
        <MaterialCommunityIcons name={icon} size={26} color={colors.primary} />
      </View>
      <View style={styles.cardText}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>{body}</Text>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onPress} style={styles.cardAction}>
          <Text style={styles.cardActionText}>{action}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    gap: 14,
    padding: 16,
  },
  accountCard: {
    flexDirection: 'row',
    gap: 16,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  accountText: {
    flex: 1,
  },
  accountTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  email: {
    marginTop: 2,
    fontSize: 14,
    color: colors.textSecondary,
  },
  signOut: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryTint,
  },
  cardIconAccent: {
    backgroundColor: colors.accent,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  cardBody: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  cardAction: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },
  cardActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
