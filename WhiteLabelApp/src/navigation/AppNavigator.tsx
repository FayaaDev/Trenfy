import React, { useCallback, useRef, useState } from 'react';
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
import FilterChip from '../components/FilterChip';
import SheetModal from '../components/SheetModal';
import type { RootTabParamList } from './types';
import type { TrendRegion } from '../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const Tab = createBottomTabNavigator<RootTabParamList>();

const CIRCLE_SIZE = 56;
const FAN_GAP = 64; // vertical distance between fan item centres
const FAN_FIRST_OFFSET = CIRCLE_SIZE + 12; // distance of first pill from container base

const REGION_OPTIONS: Array<{ value: TrendRegion; label: string; flag: string }> = [
  { value: 'US', label: 'United States', flag: '🇺🇸' },
  { value: 'SA', label: 'Saudi Arabia', flag: '🇸🇦' },
  { value: 'JP', label: 'Japan', flag: '🇯🇵' },
];

// ---------------------------------------------------------------------------
// Fan item config
// ---------------------------------------------------------------------------

type FanId = 'categories' | 'region';

const FAN_ITEMS: Array<{ id: FanId; label: string; icon: string }> = [
  { id: 'categories', label: 'Categories', icon: 'material-symbols:grid-view-rounded' },
  { id: 'region', label: 'Region', icon: 'material-symbols:public' },
];

// ---------------------------------------------------------------------------
// FilterFAB (replaces FloatingTabBar)
// ---------------------------------------------------------------------------

function FilterFAB(_props: BottomTabBarProps) {
  const { colors, radii, spacing, typography, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const {
    availableCategories,
    isLoadingCategories,
    selectedCategories,
    region,
    activeFilterCount,
    toggleCategory,
    setRegion,
  } = useFilters();

  const [isOpen, setIsOpen] = useState(false);
  const [activeSheet, setActiveSheet] = useState<FanId | null>(null);

  // One animation value per fan item (0 = hidden, 1 = visible)
  const fanAnims = useRef(FAN_ITEMS.map(() => new Animated.Value(0))).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  // FAB icon swap (0 = trending icon, 1 = close icon)
  const fabFlip = useRef(new Animated.Value(0)).current;

  // ── open / close helpers ────────────────────────────────────────────────

  const openFan = useCallback(() => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fabFlip, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.stagger(
        70,
        fanAnims.map((anim) =>
          Animated.spring(anim, {
            toValue: 1,
            damping: 14,
            stiffness: 220,
            useNativeDriver: true,
          })
        )
      ),
    ]).start();
  }, [backdropAnim, fabFlip, fanAnims]);

  const closeFan = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fabFlip, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      ...fanAnims.map((anim) =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        })
      ),
    ]).start(() => setIsOpen(false));
  }, [backdropAnim, fabFlip, fanAnims]);

  const toggleFan = useCallback(() => {
    if (isOpen) {
      closeFan();
    } else {
      openFan();
    }
  }, [isOpen, openFan, closeFan]);

  const handleFanItemPress = useCallback(
    (id: FanId) => {
      closeFan();
      // Short delay so the fan collapses before the sheet slides in
      setTimeout(() => setActiveSheet(id), 140);
    },
    [closeFan]
  );

  // ── derived animations ───────────────────────────────────────────────────

  const trendingScale = fabFlip.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const closeScale = fabFlip.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // ── per-item active counts ───────────────────────────────────────────────

  const itemActiveCount = (id: FanId): number => {
    if (id === 'categories') return selectedCategories.length;
    if (id === 'region') return region ? 1 : 0;
    return 0;
  };

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
    fanPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: radii.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.card,
    },
    fanPillActive: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    fanPillLabel: {
      ...typography.labelLarge,
      color: colors.text,
    },
    fanPillLabelActive: {
      color: colors.primary,
    },
    fanBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    fanBadgeText: {
      ...typography.labelSmall,
      color: colors.surface,
      fontSize: 10,
      lineHeight: 12,
    },
    chipGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      paddingBottom: spacing.md,
    },
    sheetClearRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginBottom: spacing.md,
    },
    sheetClearText: {
      ...typography.labelSmall,
      color: colors.primary,
    },
    loadingText: {
      ...typography.bodySmall,
      color: colors.muted,
      paddingVertical: spacing.sm,
    },
  });

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <View pointerEvents="box-none" style={s.container}>
      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      <Animated.View
        pointerEvents={isOpen ? 'auto' : 'none'}
        style={[s.backdrop, { opacity: backdropAnim }]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={closeFan} />
      </Animated.View>

      {/* ── FAB cluster ──────────────────────────────────────────────── */}
      <View pointerEvents="box-none" style={s.cluster}>
        {/* Fan items positioned above FAB using absolute bottom offsets */}
        {FAN_ITEMS.map((item, index) => {
          const anim = fanAnims[index];
          const count = itemActiveCount(item.id);
          const isActive = count > 0;
          const bottomOffset = FAN_FIRST_OFFSET + index * FAN_GAP;

          return (
            <Animated.View
              key={item.id}
              pointerEvents={isOpen ? 'auto' : 'none'}
              style={{
                position: 'absolute',
                bottom: bottomOffset,
                left: 0,
                right: 0,
                alignItems: 'center',
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [16, 0],
                    }),
                  },
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.82, 1],
                    }),
                  },
                ],
              }}
            >
              <Pressable
                onPress={() => handleFanItemPress(item.id)}
                style={({ pressed }) => [
                  s.fanPill,
                  isActive && s.fanPillActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Iconify
                  icon={item.icon}
                  size={18}
                  color={isActive ? colors.primary : colors.muted}
                />
                <Text style={[s.fanPillLabel, isActive && s.fanPillLabelActive]}>
                  {item.label}
                </Text>
                {count > 0 ? (
                  <View style={s.fanBadge}>
                    <Text style={s.fanBadgeText}>{count}</Text>
                  </View>
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}

        {/* Main FAB */}
        <View style={s.fabWrap}>
          <Pressable
            onPress={toggleFan}
            accessibilityRole="button"
            accessibilityLabel={isOpen ? 'Close filters' : 'Open filters'}
            style={s.fab}
          >
            {/* Trending icon (visible when fan is closed) */}
            <Animated.View style={[s.fabIconWrap, { transform: [{ scale: trendingScale }] }]}>
              <Iconify
                icon="streamline-plump:trending-content"
                size={28}
                color={colors.surface}
              />
            </Animated.View>
            {/* Close icon (visible when fan is open) */}
            <Animated.View style={[s.fabIconWrap, { transform: [{ scale: closeScale }] }]}>
              <Iconify
                icon="material-symbols:close-rounded"
                size={28}
                color={colors.surface}
              />
            </Animated.View>
            {/* Active filter count badge — inside the circle, upper-right */}
            {activeFilterCount > 0 && !isOpen ? (
              <View style={s.badge} pointerEvents="none">
                <Text style={s.badgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {/* ── Category sheet ───────────────────────────────────────────── */}
      <SheetModal
        visible={activeSheet === 'categories'}
        title="Categories"
        subtitle="Select one or more to filter the feed"
        onClose={() => setActiveSheet(null)}
      >
        {selectedCategories.length > 0 ? (
          <View style={s.sheetClearRow}>
            <Pressable
              onPress={() => {
                // toggle off each active category
                [...selectedCategories].forEach((c) => toggleCategory(c));
              }}
            >
              <Text style={s.sheetClearText}>Clear</Text>
            </Pressable>
          </View>
        ) : null}
        {isLoadingCategories ? (
          <Text style={s.loadingText}>Loading categories…</Text>
        ) : (
          <View style={s.chipGrid}>
            {availableCategories.map((opt) => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={selectedCategories.includes(opt.value)}
                onPress={() => toggleCategory(opt.value)}
              />
            ))}
          </View>
        )}
      </SheetModal>

      {/* ── Region sheet ─────────────────────────────────────────────── */}
      <SheetModal
        visible={activeSheet === 'region'}
        title="Region"
        subtitle="Filter trends by market"
        onClose={() => setActiveSheet(null)}
      >
        {region ? (
          <View style={s.sheetClearRow}>
            <Pressable onPress={() => setRegion(null)}>
              <Text style={s.sheetClearText}>Clear</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={s.chipGrid}>
          {REGION_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={`${opt.flag}  ${opt.label}`}
              active={region === opt.value}
              onPress={() => setRegion(region === opt.value ? null : opt.value)}
            />
          ))}
        </View>
      </SheetModal>
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
