import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Iconify } from 'react-native-iconify';
import * as ExpoLinking from 'expo-linking';

import TrendingNowScreen from '../screens/TrendingNowScreen';
import BookmarksScreen from '../screens/BookmarksScreen';
import TrendDetailScreen from '../screens/TrendDetailScreen';
import OnboardingScreen, { ONBOARDING_KEY } from '../screens/OnboardingScreen';
import { getKv } from '../storage/appPrefs';
import { BookmarkProvider } from '../context/BookmarkContext';
import { useTheme } from '../theme/ThemeContext';
import { FilterProvider, useFilters } from '../context/FilterContext';
import { useOTAUpdate } from '../utils/updates';
import type { RootStackParamList, RootTabParamList } from './types';
import type { TrendRegion } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const CIRCLE_SIZE = 56;
const MAX_FAN = 12; // pre-allocated animation values (≥ max expected items)

// Straight V shape: P1 is the midpoint of P0→P2, which collapses the bezier
// to a straight diagonal line with perfectly even spacing between all 5 pills.
// P0 x = ±43 so the innermost pair (Gaming / US) just touch edge-to-edge.
const CAT_P0: [number, number] = [  -43,  -70]; // innermost — just touches sibling
const CAT_P1: [number, number] = [  -82, -175]; // midpoint of P0→P2 (straight line)
const CAT_P2: [number, number] = [ -120, -280]; // outermost

// Regions are the exact mirror of categories (same ty, negated tx)
const REG_P0: [number, number] = [   43,  -70];
const REG_P1: [number, number] = [   82, -175];
const REG_P2: [number, number] = [  120, -280];

const REGION_OPTIONS: Array<{ value: TrendRegion; flag: string; short: string }> = [
  { value: 'US', flag: '🇺🇸', short: 'US' },
  { value: 'SA', flag: '🇸🇦', short: 'SA' },
  { value: 'JP', flag: '🇯🇵', short: 'JP' },
  { value: 'KR', flag: '🇰🇷', short: 'KR' },
  { value: 'GLOBAL', flag: '🌐', short: 'GL' },
];

// ---------------------------------------------------------------------------
// Bezier helper
// ---------------------------------------------------------------------------

function bezierPoint(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  t: number,
): [number, number] {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0],
    u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1],
  ];
}

// ---------------------------------------------------------------------------
// FilterFAB
// ---------------------------------------------------------------------------

type FanItem = {
  key: string;
  label: string;
  active: boolean;
  group: 'category' | 'region';
  onToggle: () => void;
  tx: number;
  ty: number;
};

function FilterFAB(_props: BottomTabBarProps) {
  const { colors, radii, typography, shadows } = useTheme();
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

  // ── fan items (categories fan left, regions fan right) ───────────────────
  //
  // Items are interleaved (cat[0], reg[0], cat[1], reg[1]…) so both arms
  // open simultaneously from the FAB centre outward.

  const fanItems = useMemo<FanItem[]>(() => {
    const catCount = availableCategories.length;
    const regCount = REGION_OPTIONS.length;

    const cats: FanItem[] = availableCategories.map((cat, i) => {
      const t = catCount > 1 ? i / (catCount - 1) : 0;
      const [tx, ty] = bezierPoint(CAT_P0, CAT_P1, CAT_P2, t);
      return {
        key: `cat:${cat.value}`,
        label: cat.label,
        active: selectedCategories.includes(cat.value),
        group: 'category' as const,
        onToggle: () => toggleCategory(cat.value),
        tx,
        ty,
      };
    });

    const regs: FanItem[] = REGION_OPTIONS.map((r, i) => {
      const t = regCount > 1 ? i / (regCount - 1) : 0;
      const [tx, ty] = bezierPoint(REG_P0, REG_P1, REG_P2, t);
      return {
        key: `region:${r.value}`,
        label: `${r.flag}  ${r.short}`,
        active: region === r.value,
        group: 'region' as const,
        onToggle: () => setRegion(region === r.value ? null : r.value),
        tx,
        ty,
      };
    });

    // Interleave so both arms open from centre out simultaneously
    const out: FanItem[] = [];
    const len = Math.max(cats.length, regs.length);
    for (let i = 0; i < len; i++) {
      if (i < cats.length) out.push(cats[i]);
      if (i < regs.length) out.push(regs[i]);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableCategories, selectedCategories, region]);

  while (fanAnims.length < fanItems.length) {
    fanAnims.push(new Animated.Value(0));
  }

  // ── open / close ──────────────────────────────────────────────────────────

  const openFan = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(fabFlip, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.stagger(
        30,
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
    // (divider style removed — two-arm fork layout uses tx/ty offsets instead)
  });

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <View pointerEvents="box-none" style={s.container}>
      {/* ── Backdrop ──────────────────────────────────────────────────── */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[s.backdrop, { opacity: backdropAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeFan} accessibilityRole="button" accessibilityLabel="Close filters" accessibilityHint="Double tap to close the filter menu" />
      </Animated.View>

      {/* ── FAB cluster ───────────────────────────────────────────────── */}
      <View pointerEvents="box-none" style={s.cluster}>
        {/* Individual filter pills — two-arm bezier fork */}
        {fanItems.map((item, index) => {
          const anim = fanAnims[index];
          return (
            <Animated.View
              key={item.key}
              pointerEvents={isOpen ? 'auto' : 'none'}
              style={{
                position: 'absolute',
                bottom: CIRCLE_SIZE / 2,
                left: 0,
                right: 0,
                alignItems: 'center',
                opacity: anim,
                transform: [
                  { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, item.tx] }) },
                  { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, item.ty] }) },
                  { scale:      anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
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
                accessibilityRole="button"
                accessibilityLabel={item.active ? `Remove ${item.label} filter` : `Filter by ${item.label}`}
                accessibilityHint={item.active ? 'Double tap to deactivate this filter' : 'Double tap to activate this filter'}
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
              accessibilityHint={isOpen ? 'Double tap to close filter menu' : 'Double tap to open filter menu. Long press to clear all filters'}
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
// MainTabs — the bottom tab navigator
// ---------------------------------------------------------------------------

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <FilterFAB {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="TrendingNow" component={TrendingNowScreen} />
      <Tab.Screen name="Bookmarks" component={BookmarksScreen} />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Deep linking config
// ---------------------------------------------------------------------------

const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [ExpoLinking.createURL('/'), 'trenfy://'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          TrendingNow: 'trending',
          Bookmarks: 'bookmarks',
        },
      },
      // Stack screens not reachable via deep link are omitted intentionally
    },
  },
};

// ---------------------------------------------------------------------------
// AppNavigator
// ---------------------------------------------------------------------------

export default function AppNavigator() {
  useOTAUpdate();
  const { colors } = useTheme();

  // Check synchronously whether onboarding has been completed
  const onboardingCompleted = getKv(ONBOARDING_KEY) === 'true';

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
    <BookmarkProvider>
      <FilterProvider>
        <NavigationContainer theme={navTheme} linking={linking}>
          <Stack.Navigator
            initialRouteName={onboardingCompleted ? 'MainTabs' : 'Onboarding'}
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="TrendDetail"
              component={TrendDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </FilterProvider>
    </BookmarkProvider>
  );
}
