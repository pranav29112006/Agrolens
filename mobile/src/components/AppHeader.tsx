import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import { colors } from '@/constants/colors';
import { useStrings } from '@/i18n';
import { useShareApp } from '@/lib/useShareApp';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type AppHeaderProps = {
  /** Shows just the logo so `center` has room. */
  compact?: boolean;
  center?: ReactNode;
  /** Extra actions shown before the ⋮ menu. */
  children?: ReactNode;
};

/** Top bar shared by the main tabs: brand on the left, actions and ⋮ menu on the right. */
export function AppHeader({ compact = false, center, children }: AppHeaderProps) {
  return (
    <View style={styles.header}>
      <BrandMark compact={compact} />
      <View style={styles.center}>{center}</View>
      <View style={styles.actions}>
        {children}
        <HeaderMenu />
      </View>
    </View>
  );
}

function HeaderMenu() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const strings = useStrings();
  const shareApp = useShareApp();
  const [isOpen, setIsOpen] = useState(false);

  const items: { label: string; icon: IconName; onPress: () => void }[] = [
    { label: strings.settings.title, icon: 'cog-outline', onPress: () => router.push('/settings') },
    {
      label: strings.you.feedbackAction,
      icon: 'message-star-outline',
      onPress: () =>
        router.push({ pathname: '/coming-soon', params: { title: strings.you.feedbackAction } }),
    },
    { label: strings.you.shareAction, icon: 'share-variant-outline', onPress: shareApp },
  ];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="More options"
        hitSlop={8}
        onPress={() => setIsOpen(true)}
        style={styles.menuButton}
      >
        <MaterialCommunityIcons name="dots-vertical" size={24} color={colors.textPrimary} />
      </Pressable>

      <Modal transparent visible={isOpen} animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <View style={[styles.menu, { top: insets.top + 52 }]}>
            {items.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="menuitem"
                onPress={() => {
                  setIsOpen(false);
                  item.onPress();
                }}
                style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              >
                <MaterialCommunityIcons name={item.icon} size={20} color={colors.textSecondary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    paddingLeft: 16,
    paddingRight: 8,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    right: 12,
    minWidth: 220,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemPressed: {
    backgroundColor: colors.primaryTint,
  },
  menuLabel: {
    fontSize: 15,
    color: colors.textPrimary,
  },
});
