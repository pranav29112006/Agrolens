import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/constants/colors';
import { useStrings } from '@/i18n';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

function TabIcon({ name, color, focused }: { name: IconName; color: ColorValue; focused: boolean }) {
  return (
    <View style={[styles.icon, focused && styles.iconFocused]}>
      <MaterialCommunityIcons name={name} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const strings = useStrings().tabs;
  const insets = useSafeAreaInsets();

  const tab = (title: string, icon: IconName, focusedIcon: IconName) => ({
    title,
    tabBarIcon: ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <TabIcon name={focused ? focusedIcon : icon} color={color} focused={focused} />
    ),
  });

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        // Tall enough for the icon pill plus a label, above the phone's own bottom bar.
        tabBarStyle: [styles.bar, { height: 68 + insets.bottom }],
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen name="home" options={tab(strings.home, 'sprout-outline', 'sprout')} />
      <Tabs.Screen
        name="diagnoses"
        options={tab(strings.diagnoses, 'clipboard-text-outline', 'clipboard-text')}
      />
      <Tabs.Screen
        name="library"
        options={tab(strings.library, 'book-open-page-variant-outline', 'book-open-page-variant')}
      />
      <Tabs.Screen
        name="you"
        options={tab(strings.you, 'account-circle-outline', 'account-circle')}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
  item: {
    paddingTop: 6,
    paddingBottom: 4,
  },
  label: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  icon: {
    width: 56,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFocused: {
    backgroundColor: colors.primaryTint,
  },
});
