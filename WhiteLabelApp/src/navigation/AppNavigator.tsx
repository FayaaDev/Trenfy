import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Iconify } from 'react-native-iconify';

import TrendingNowScreen from '../screens/TrendingNowScreen';
import { useTheme } from '../theme/ThemeContext';
import { FilterProvider, useFilters } from '../context/FilterContext';
import type { RootTabParamList } from './types';
import type { TrendRegion } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator<RootTabParamList>();

const CIRCLE_SIZE = 56;
const FAN_GAP = 52;       // px between each pill centre
const FAN_FIRST_OFFSET = CIRCLE_SIZE + 12; // bottom of first pill from cluster base
const GROUP_BONUS = 14;   // extra gap between category group and region group
const MAX_FAN = 10;       // pre-allocated animation values (≥ max expected items)

const REGION_OPTIONS: Array<{ value: TrendRegion; flag: string; short: string }> = [
  { value: 'US', flag: '🇺🇸', short: 'US' },
  { value: 'SA', flag: '🇸🇦', short: 'SA' },
  { value: 'JP', flag: '🇯🇵', short: 'JP' },
];

// ---------------------------------------------------------------------------
// FilterFAB
// ---------------------------------------------------------------------------

type FanItem = {
  key: string;
  label: string;
  active: boolean;
  group: 'category' | 'region';
  onToggle: () => void;
};

function FilterFAB(_props: BottomTabBarProps) {
  const { colors, radii, spacing, typography, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    availableCategories,
    selectedCategories,
    region,
    activeFilterCount,
    toggleCategory,
    setRegion,
    clearAll,
  } = useFilters();

  const [isOpen, setIsOpen] = useState(false);

  // Pre-allocated animation values — enough for MAX_FAN items
  const fanAnims = useRef(
    Array.from({ length: MAX_FAN }, () => new Animated.Value(0))
  ).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const fabFlip = useRef(new Animated.Value(0)).current;  // 0=trending, 1=close
  const fabScale = useRef(new Animated.Value(1)).current; // for long-press bounce

  // ── fan items (categories below, regions above) ──────────────────────────
  //
  // Index 0 is the CLOSEST pill to the FAB (visually lowest).
  // Categories are closest, regions fan out above them.

  const fanItems = useMemo<FanItem[]>(
    () => [
      // ── categories (indices 0 … n-1, just above FAB) ──────────────────
      ...availableCategories.map((cat) => ({
        key: `cat:${cat.value}`,
        label: cat.label,
        active: selectedCategories.includes(cat.value),
        group: 'category' as const,
        onToggle: () => toggleCategory(cat.value),
      })),
      // ── regions (indices n … n+2, highest in the fan) ─────────────────
      ...REGION_OPTIONS.map((r) => ({
        key: `region:${r.value}`,
        label: `${r.flag}  ${r.short}`,
        active: region === r.value,
        group: 'region' as const,
        onToggle: () => setRegion(region === r.value ? null : r.value),
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availableCategories, selectedCategories, region]
  );

  // bottom offset for each pill (adds a gap between the two groups)
  const bottomFor = useCallback(
    (index: number) => {
      const catCount = availableCategories.length;
      const bonus = index >= catCount ? GROUP_BONUS : 0;
      return FAN_FIRST_OFFSET + index * FAN_GAP + bonus;
    },
    [availableCategories.length]
  );

  // ── open / close ──────────────────────────────────────────────────────────

  const openFan = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(fabFlip, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.stagger(
        45,
        fanItems.map((_, i) =>
          Animated.spring(fanAnims[i], {
            toValue: 1,
            damping: 14,
            stiffness: 220,
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  }, [backdropAnim, fabFlip, fanAnims, fanItems]);

  const closeFan = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(fabFlip, { toValue: 0, duration: 140, useNativeDriver: true }),
      ...fanAnims.map((anim) =>
        Animated.timing(anim, { toValue: 0, duration: 100, useNativeDriver: true })
      ),
    ]).start(() => setIsOpen(false));
  }, [backdropAnim, fabFlip, fanAnims]);

  const toggleFan = useCallback(() => {
    if (isOpen) closeFan();
    else openFan();
  }, [isOpen, openFan, closeFan]);

  // ── long-press: clear all filters ────────────────────────────────────────

  const handleLongPress = useCallback(() => {
    clearAll();
    if (isOpen) closeFan();
    // Bounce the FAB to give tactile feedback
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.82, duration: 70, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, damping: 8, stiffness: 280, useNativeDriver: true }),
    ]).start();
  }, [clearAll, isOpen, closeFan, fabScale]);

  // ── derived ───────────────────────────────────────────────────────────────

  const trendingScale = fabFlip.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const closeIconScale = fabFlip.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  // ── styles ───────────────────────────────────────────────────────────────

  const s = StyleSheet.create({
    container: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.overlay,
    },
    cluster: {
      position: 'absolute',
      bottom: insets.bottom - 23,
      left: 0,
      right: 0,
    },
    fabWrap: {
      alignItems: 'center',
    },
    fab: {
      width: CIRCLE_SIZE,
      height: CIRCLE_SIZE,
      borderRadius: CIRCLE_SIZE / 2,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      ...shadows.floating,
    },
    fabIconWrap: {
      position: 'absolute',
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      ...typography.labelSmall,
      color: colors.surface,
      fontSize: 10,
      lineHeight: 12,
    },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: radii.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    pillActive: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    pillLabel: {
      ...typography.labelLarge,
      color: colors.text,
    },
    pillLabelActive: {
      color: colors.primary,
    },
    // Thin divider row rendered between the two groups
    divider: {
      position: 'absolute',
      left: '30%',
      right: '30%',
      height: 1,
      backgroundColor: colors.border,
      opacity: 0.6,
    },
  });

  // ── render ────────────────────────────────────────────────────────────────

  const catCount = availableCategories.length;
  // Divider sits between the last category pill and the first region pill
  const dividerBottom =
    catCount > 0
      ? FAN_FIRST_OFFSET + (catCount - 1) * FAN_GAP + FAN_GAP * 0.5 + GROUP_BONUS * 0.5
      : -999;

  return (
    <View pointerEvents="box-none" style={s.container}>
      {/* ── Backdrop ──────────────────────────────────────────────────── */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[s.backdrop, { opacity: backdropAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeFan} />
      </Animated.View>

      {/* ── FAB cluster ───────────────────────────────────────────────── */}
      <View pointerEvents="box-none" style={s.cluster}>
        {/* Thin divider between category and region groups */}
        {catCount > 0 && isOpen ? (
          <Animated.View
            pointerEvents="none"
            style={[s.divider, { bottom: dividerBottom, opacity: backdropAnim }]}
          />
        ) : null}

        {/* Individual filter pills */}
        {fanItems.map((item, index) => {
          const anim = fanAnims[index];
          return (
            <Animated.View
              key={item.key}
              pointerEvents={isOpen ? 'auto' : 'none'}
              style={{
                position: 'absolute',
                bottom: bottomFor(index),
                left: 0,
                right: 0,
                alignItems: 'center',
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [14, 0],
                    }),
                  },
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.8, 1],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                onPress={item.onToggle}
                style={({ pressed }) => [
                  s.pill,
                  item.active && s.pillActive,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <Text style={[s.pillLabel, item.active && s.pillLabelActive]}>
                  {item.label}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Main FAB */}
        <View style={s.fabWrap}>
          <Animated.View style={{ transform: [{ scale: fabScale }] }}>
            <Pressable
              onPress={toggleFan}
              onLongPress={handleLongPress}
              delayLongPress={400}
              accessibilityRole="button"
              accessibilityLabel={isOpen ? 'Close filters' : 'Open filters'}
              style={s.fab}
            >
              {/* Trending icon */}
              <Animated.View style={[s.fabIconWrap, { transform: [{ scale: trendingScale }] }]}>
                <Iconify icon="streamline-plump:trending-content" size={28} color={colors.surface} />
              </Animated.View>
              {/* Close icon */}
              <Animated.View style={[s.fabIconWrap, { transform: [{ scale: closeIconScale }] }]}>
                <Iconify icon="material-symbols:close-rounded" size={28} color={colors.surface} />
              </Animated.View>
              {/* Filter count badge */}
              {activeFilterCount > 0 && !isOpen ? (
                <View style={s.badge} pointerEvents="none">
                  <Text style={s.badgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// AppNavigator
// ---------------------------------------------------------------------------

export default function AppNavigator() {
  const { colors } = useTheme();

  const navTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: colors.background,
      border: colors.border,
      card: colors.surface,
      primary: colors.primary,
      text: colors.text,
    },
  };

  return (
    <FilterProvider>
      <NavigationContainer theme={navTheme}>
        <Tab.Navigator
          tabBar={(props) => <FilterFAB {...props} />}
          screenOptions={{ headerShown: false }}
        >
          <Tab.Screen name="TrendingNow" component={TrendingNowScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </FilterProvider>
  );
}
