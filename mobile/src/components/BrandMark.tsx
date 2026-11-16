import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/colors';

type BrandMarkProps = {
  textColor?: string;
  /** Logo only, for tight headers. */
  compact?: boolean;
};

export function BrandMark({ textColor = colors.textPrimary, compact = false }: BrandMarkProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.logo, compact && styles.logoCompact]}>
        <MaterialCommunityIcons name="sprout" size={22} color={colors.primary} />
      </View>
      {!compact && <Text style={[styles.name, { color: textColor }]}>AgroLens</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoCompact: {
    marginRight: 0,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
