import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState, type ComponentType } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark } from '@/components/BrandMark';
import {
  CropsIllustration,
  DetectIllustration,
  LanguageIllustration,
  TreatIllustration,
} from '@/components/onboarding/Illustrations';
import { colors } from '@/constants/colors';
import { usePreferences } from '@/context/PreferencesContext';
import { useStrings } from '@/i18n';
import { goBackOrHome } from '@/lib/navigation';

type Slide = {
  key: string;
  title: string;
  body: string;
  Illustration: ComponentType<{ width: number }>;
};

export default function OnboardingScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const strings = useStrings().onboarding;
  const { hasOnboarded } = usePreferences();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  // Horizontal list items don't stretch vertically on web, so slides get the measured height.
  const [pageHeight, setPageHeight] = useState<number>();

  const slides: Slide[] = [
    { key: 'detect', Illustration: DetectIllustration, ...strings.slides.detect },
    { key: 'treat', Illustration: TreatIllustration, ...strings.slides.treat },
    { key: 'language', Illustration: LanguageIllustration, ...strings.slides.language },
    { key: 'crops', Illustration: CropsIllustration, ...strings.slides.crops },
  ];
  const isLast = index === slides.length - 1;
  // Also capped by height so long translated titles still fit on short phones.
  const illustrationWidth = Math.min(width - 56, 320, height * 0.38);

  // FlatList requires these two to keep the same identity across renders.
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const visible = viewableItems[0];
    if (visible?.index != null) setIndex(visible.index);
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const finish = () => {
    if (hasOnboarded) {
      // Replayed later: return without asking for location again.
      goBackOrHome(router);
    } else {
      router.replace('/location');
    }
  };

  const goNext = () => {
    if (isLast) {
      finish();
      return;
    }
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.topBar}>
        <BrandMark />
        <Pressable accessibilityRole="button" hitSlop={12} onPress={finish} style={styles.skipButton}>
          <Text style={styles.skipText}>{strings.skip}</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={slides}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(slide) => slide.key}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onLayout={(event) => setPageHeight(event.nativeEvent.layout.height)}
        extraData={pageHeight}
        renderItem={({ item: { Illustration, title, body } }) => (
          <View style={[styles.slide, { width, height: pageHeight }]}>
            <Illustration width={illustrationWidth} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {slides.map((slide, i) => (
          <View key={slide.key} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Pressable accessibilityRole="button" onPress={goNext} style={styles.nextButton}>
          <Text style={styles.nextText}>{isLast ? strings.getStarted : strings.next}</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color={colors.onPrimary} />
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
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    marginTop: 32,
    fontSize: 26,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.radio,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 14,
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
  nextButton: {
    height: 52,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
