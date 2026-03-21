import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
} from 'react-native-reanimated';

import type { CategoryOption, TrendPlatform, TrendRegion } from '../types';
import { useTheme } from '../theme/ThemeContext';
import FilterChip from './FilterChip';

const PLATFORM_OPTIONS: Array<{
  value: TrendPlatform;
  label: string;
  icon: string;
  iconColor: string;
}> = [
  { value: 'youtube', label: 'YouTube', icon: 'logos:youtube-icon', iconColor: '#FF0000' },
  { value: 'x', label: 'X', icon: 'ri:twitter-x-fill', iconColor: '' }, // iconColor set dynamically
];

const REGION_OPTIONS: Array<{ value: TrendRegion; label: string }> = [
  { value: 'US', label: 'US' },
  { value: 'SA', label: 'SA' },
  { value: 'JP', label: 'JP' },
];

// Generous upper bound for initial contentTopPadding calculation in TrendingNowScreen.
// The actual measured height drives the collapse animation after first layout.
export const FILTER_HEADER_HEIGHT = 196;

export interface FilterHeaderProps {
  scrollY: SharedValue<number>;
  activeFilterCount: number;
  selectedPlatform: TrendPlatform | null;
  onSelectPlatform: (platform: TrendPlatform | null) => void;
  categories: CategoryOption[];
  isLoadingCategories?: boolean;
  onExpandedHeightChange?: (height: number) => void;
  selectedCategories: string[];
  onToggleCategory: (category: string) => void;
  selectedRegion: TrendRegion | null;
  onSelectRegion: (region: TrendRegion | null) => void;
  onClearAll: () => void;
}

export default function FilterHeader({
  scrollY,
  activeFilterCount,
  selectedPlatform,
  onSelectPlatform,
  categories,
  isLoadingCategories = false,
  onExpandedHeightChange,
  selectedCategories,
  onToggleCategory,
  selectedRegion,
  onSelectRegion,
  onClearAll,
}: FilterHeaderProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const styles = StyleSheet.create({
    root: {
      minHeight: FILTER_HEADER_HEIGHT,
    },
    rows: {
      gap: spacing.xs,
    },
    rowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    sectionLabel: {
      ...typography.labelSmall,
      color: colors.muted,
      textTransform: 'uppercase',
    },
    chipRow: {
      gap: spacing.sm,
      paddingRight: spacing.lg,
      paddingBottom: spacing.sm,
    },
    clearButton: {
      paddingVertical: 4,
    },
    clearButtonText: {
      ...typography.labelSmall,
      color: colors.primary,
    },
    loadingText: {
      ...typography.bodySmall,
      color: colors.muted,
      paddingVertical: 8,
      paddingBottom: spacing.sm,
    },
    badgeWrap: {
      position: 'absolute',
      top: 0,
      right: 0,
    },
    badge: {
      backgroundColor: colors.primary,
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
    },
    badgeText: {
      ...typography.labelSmall,
      color: colors.background,
    },
  });

  const rowsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 50], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(scrollY.value, [0, 80], [0, -24], Extrapolation.CLAMP),
      },
    ],
  }));

  // Fade in the "N filter(s)" badge when filters are active and header is collapsed.
  const badgeStyle = useAnimatedStyle(
    () => ({
      opacity: interpolate(
        scrollY.value,
        [40, 80],
        [0, activeFilterCount > 0 ? 1 : 0],
        Extrapolation.CLAMP
      ),
    }),
    [activeFilterCount]
  );

  useAnimatedReaction(
    () => scrollY.value > 60,
    (nextCollapsed, previousCollapsed) => {
      if (nextCollapsed !== previousCollapsed) {
        runOnJS(setIsCollapsed)(nextCollapsed);
      }
    },
    [scrollY]
  );

  const handleRowsLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) {
        onExpandedHeightChange?.(h);
      }
    },
    [onExpandedHeightChange]
  );

  return (
    <View style={styles.root} pointerEvents="box-none">
      <Animated.View
        pointerEvents={isCollapsed ? 'none' : 'auto'}
        style={[styles.rows, rowsStyle]}
        onLayout={handleRowsLayout}
      >
          <View style={styles.rowHeader}>
            <Text style={styles.sectionLabel}>Filters</Text>
            {activeFilterCount > 0 ? (
              <Pressable onPress={onClearAll} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear All</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Platform chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {PLATFORM_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={selectedPlatform === option.value}
                onPress={() =>
                  onSelectPlatform(selectedPlatform === option.value ? null : option.value)
                }
                icon={option.icon}
                iconColor={option.value === 'x' ? colors.text : option.iconColor}
              />
            ))}
          </ScrollView>

          {/* Category chips only render when categories are available. */}
          {isLoadingCategories ? (
            <Text style={styles.loadingText}>Loading categories...</Text>
          ) : categories.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {categories.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  active={selectedCategories.includes(option.value)}
                  onPress={() => onToggleCategory(option.value)}
                />
              ))}
            </ScrollView>
          ) : null}

          {/* Region chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {REGION_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={selectedRegion === option.value}
                onPress={() =>
                  onSelectRegion(selectedRegion === option.value ? null : option.value)
                }
              />
            ))}
          </ScrollView>
      </Animated.View>

      {activeFilterCount > 0 ? (
        <Animated.View pointerEvents="none" style={[styles.badgeWrap, badgeStyle]}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {activeFilterCount} {activeFilterCount === 1 ? 'filter' : 'filters'}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}
