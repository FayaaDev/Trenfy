import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Iconify } from 'react-native-iconify';

import { OnboardingScreenProps } from '../navigation/types';
import { setKv } from '../storage/appPrefs';
import { useTheme } from '../theme/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const ONBOARDING_KEY = 'onboarding:completed';

type Slide = {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  titleAr: string;
  body: string;
  bodyAr: string;
};

const SLIDES: Slide[] = [
  {
    id: 'welcome',
    icon: 'streamline-plump:trending-content',
    iconColor: '#ED6C11',
    title: 'Welcome to Trenfy',
    titleAr: 'مرحباً بك في Trenfy',
    body: 'Your real-time window into what\'s trending on YouTube, X, and beyond — curated across regions and categories.',
    bodyAr: 'نافذتك الفورية على ما يتصدر المشهد على يوتيوب وإكس وغيرها — مُنظَّمة حسب المناطق والفئات.',
  },
  {
    id: 'discover',
    icon: 'mdi:filter-variant',
    iconColor: '#F59E0B',
    title: 'Discover & Filter',
    titleAr: 'اكتشف وصفّي',
    body: 'Tap the orange FAB button at the bottom to open filters. Choose categories (Gaming, Music…) on the left fan and regions (US, SA, JP…) on the right fan.',
    bodyAr: 'اضغط على زر الفلترة البرتقالي في الأسفل لفتح الفلاتر. اختر الفئات من الجناح الأيسر والمناطق من الجناح الأيمن.',
  },
  {
    id: 'save',
    icon: 'mdi:bookmark-multiple',
    iconColor: '#10B981',
    title: 'Save & Share',
    titleAr: 'احفظ وشارك',
    body: 'Bookmark trends to read later — find them in the Bookmarks tab. Share any trend with friends. Long-press the filter button to instantly clear all filters.',
    bodyAr: 'احفظ الترندات للقراءة لاحقاً في تبويب المفضلة. شارك أي ترند مع أصدقائك. اضغط مطولاً على زر الفلترة لمسح جميع الفلاتر فوراً.',
  },
];

export default function OnboardingScreen({ navigation }: OnboardingScreenProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<FlatList<Slide>>(null);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const goToNext = useCallback(() => {
    const nextIndex = activeIndex + 1;
    if (nextIndex < SLIDES.length) {
      listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    }
  }, [activeIndex]);

  const handleGetStarted = useCallback(() => {
    setKv(ONBOARDING_KEY, 'true');
    navigation.replace('MainTabs');
  }, [navigation]);

  const isLast = activeIndex === SLIDES.length - 1;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    slide: {
      width: SCREEN_WIDTH,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    iconCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    slideTitle: {
      ...typography.headingLarge,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    slideTitleAr: {
      ...typography.headingLarge,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
      writingDirection: 'rtl',
    },
    slideBody: {
      ...typography.bodyLarge,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 26,
      marginBottom: spacing.sm,
    },
    slideBodyAr: {
      ...typography.arabicBody,
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      writingDirection: 'rtl',
      marginTop: spacing.xs,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.surfaceStrong,
    },
    dotActive: {
      width: 24,
      backgroundColor: colors.primary,
    },
    footer: {
      paddingHorizontal: spacing.xl,
      paddingBottom: insets.bottom + spacing.lg,
      gap: spacing.md,
    },
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: radii.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonText: {
      ...typography.labelLarge,
      color: colors.surface,
      fontSize: 16,
    },
    skipButton: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
    },
    skipText: {
      ...typography.bodySmall,
      color: colors.muted,
    },
  });

  const renderSlide = useCallback(({ item }: { item: Slide }) => (
    <View style={styles.slide}>
      <View style={styles.iconCircle}>
        <Iconify icon={item.icon} size={48} color={item.iconColor} />
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideTitleAr}>{item.titleAr}</Text>
      <Text style={styles.slideBody}>{item.body}</Text>
      <Text style={styles.slideBodyAr}>{item.bodyAr}</Text>
    </View>
  ), [styles]);

  const keyExtractor = useCallback((item: Slide) => item.id, []);

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={keyExtractor}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEnabled
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + spacing.xl }}
      />

      {/* Dots indicator */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>

      {/* Footer actions */}
      <View style={styles.footer}>
        <Pressable
          onPress={isLast ? handleGetStarted : goToNext}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>

        {!isLast ? (
          <Pressable onPress={handleGetStarted} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
