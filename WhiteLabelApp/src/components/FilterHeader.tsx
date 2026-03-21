import React, { useCallback, useState } from 'react';
import { LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CategoryOption, TrendRegion } from '../types';
import { useTheme } from '../theme/ThemeContext';
import FilterChip from './FilterChip';

const REGION_OPTIONS: Array<{ value: TrendRegion; label: string }> = [
  { value: 'US', label: 'US' },
  { value: 'SA', label: 'SA' },
  { value: 'JP', label: 'JP' },
];

// Initial estimate for contentTopPadding in TrendingNowScreen.
// Actual measured height replaces this after first layout.
export const FILTER_HEADER_HEIGHT = 96;

type ActiveTab = 'category' | 'country';

export interface FilterHeaderProps {
  activeFilterCount: number;
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
  activeFilterCount,
  categories,
  isLoadingCategories = false,
  onExpandedHeightChange,
  selectedCategories,
  onToggleCategory,
  selectedRegion,
  onSelectRegion,
  onClearAll,
}: FilterHeaderProps) {
  const { colors, spacing, typography } = useTheme();
  const [activeTab, setActiveTab] = useState<ActiveTab>('category');

  const styles = StyleSheet.create({
    root: {
      paddingTop: spacing.xs,
    },
    tabBar: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    tabs: {
      flexDirection: 'row',
      flex: 1,
    },
    tabButton: {
      marginRight: spacing.lg,
      paddingBottom: spacing.xs,
    },
    tabButtonActive: {
      borderBottomWidth: 2,
      borderBottomColor: colors.primary,
    },
    tabLabel: {
      ...typography.labelLarge,
      color: colors.muted,
    },
    tabLabelActive: {
      color: colors.primary,
    },
    clearButton: {
      paddingVertical: 4,
    },
    clearButtonText: {
      ...typography.labelSmall,
      color: colors.primary,
    },
    chipRow: {
      gap: spacing.sm,
      paddingRight: spacing.lg,
      paddingBottom: spacing.sm,
    },
    loadingText: {
      ...typography.bodySmall,
      color: colors.muted,
      paddingVertical: spacing.xs,
      paddingBottom: spacing.sm,
    },
  });

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0) {
        onExpandedHeightChange?.(h);
      }
    },
    [onExpandedHeightChange]
  );

  return (
    <View onLayout={handleLayout} style={styles.root}>
      {/* Tab bar */}
      <View style={styles.tabBar}>
        <View style={styles.tabs}>
          <Pressable
            style={[styles.tabButton, activeTab === 'category' && styles.tabButtonActive]}
            onPress={() => setActiveTab('category')}
          >
            <Text style={[styles.tabLabel, activeTab === 'category' && styles.tabLabelActive]}>
              Category
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'country' && styles.tabButtonActive]}
            onPress={() => setActiveTab('country')}
          >
            <Text style={[styles.tabLabel, activeTab === 'country' && styles.tabLabelActive]}>
              Country
            </Text>
          </Pressable>
        </View>

        {activeFilterCount > 0 ? (
          <Pressable onPress={onClearAll} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Category chips */}
      {activeTab === 'category' ? (
        isLoadingCategories ? (
          <Text style={styles.loadingText}>Loading...</Text>
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
        ) : null
      ) : null}

      {/* Country/region chips */}
      {activeTab === 'country' ? (
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
      ) : null}
    </View>
  );
}
