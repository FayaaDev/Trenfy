import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchCategories } from '../api/trends';
import FilterHeader, { FILTER_HEADER_HEIGHT } from '../components/FilterHeader';
import SearchInput from '../components/SearchInput';
import SkeletonCard from '../components/SkeletonCard';
import TrendCard from '../components/TrendCard';
import useFilterPrefs from '../hooks/useFilterPrefs';
import useTrendFeed from '../hooks/useTrendFeed';
import { TrendingNowTabProps } from '../navigation/types';
import { CategoryOption, Trend } from '../types';
import { useTheme } from '../theme/ThemeContext';

const AnimatedFlashList = Animated.createAnimatedComponent(FlashList as React.ComponentType<any>);

export default function TrendingNowScreen(_: TrendingNowTabProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { platform, region, setPlatform, setRegion, clearPersistedFilters } = useFilterPrefs();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [headerContentHeight, setHeaderContentHeight] = useState(0);
  const [filterHeaderHeight, setFilterHeaderHeight] = useState(FILTER_HEADER_HEIGHT);
  const scrollY = useSharedValue(0);

  const {
    items,
    isLoading,
    isLoadingMore,
    isRefreshing,
    error,
    searchQuery,
    setSearchQuery,
    refresh,
    loadMore,
  } = useTrendFeed({
    platform,
    selectedCategories,
    regionCode: region,
  });

  useEffect(() => {
    let isActive = true;
    setIsLoadingCategories(true);

    fetchCategories()
      .then((result) => {
        if (isActive) {
          setAvailableCategories(result);
        }
      })
      .catch(() => {
        if (isActive) {
          setAvailableCategories([]);
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingCategories(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((value) => value !== category)
        : [...prev, category]
    );
  }, []);

  const activeFilterCount = (platform ? 1 : 0) + selectedCategories.length + (region ? 1 : 0);

  const handleClearAll = useCallback(() => {
    setSelectedCategories([]);
    clearPersistedFilters();
  }, [clearPersistedFilters]);

  const topInsetOffset = insets.top + spacing.sm;
  const contentTopPadding = topInsetOffset + headerContentHeight + filterHeaderHeight + spacing.lg;

  const emptySubtitle = useMemo(() => {
    if (activeFilterCount > 0 || searchQuery.length > 0) {
      return 'Try different search terms or filters';
    }

    return 'No trends available right now';
  }, [activeFilterCount, searchQuery.length]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.background,
    },
    headerContent: {
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      ...typography.headingLarge,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    searchRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.sm,
    },
    searchInputWrap: {
      flex: 1,
    },
    clearButton: {
      padding: spacing.xs,
    },
    filterHeaderWrap: {
      position: 'absolute' as const,
      left: spacing.lg,
      right: spacing.lg,
    },
    skeletonList: {
      flex: 1,
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    centered: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'flex-start' as const,
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
    },
    errorTitle: {
      ...typography.headingSmall,
      color: colors.error,
    },
    errorDetail: {
      ...typography.bodySmall,
      color: colors.muted,
      textAlign: 'center' as const,
    },
    retryButton: {
      backgroundColor: colors.primary,
      borderRadius: radii.md,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
    },
    retryButtonText: {
      ...typography.labelLarge,
      color: colors.surface,
    },
    emptyTitle: {
      ...typography.headingSmall,
      color: colors.text,
    },
    emptySubtitle: {
      ...typography.bodyMedium,
      color: colors.muted,
      textAlign: 'center' as const,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    itemSeparator: {
      height: spacing.md,
    },
    footerLoader: {
      marginVertical: spacing.xl,
    },
  });

  const renderItem = useCallback(
    ({ item }: { item: Trend }) => <TrendCard trend={item} />,
    []
  );

  const keyExtractor = useCallback((item: Trend) => item.id, []);

  const ListFooter = useCallback(
    () =>
      isLoadingMore ? (
        <ActivityIndicator color={colors.primary} style={styles.footerLoader} />
      ) : null,
    [isLoadingMore, colors.primary]
  );

  const ItemSeparator = useCallback(() => <View style={styles.itemSeparator} />, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const collapsingContentStyle = useAnimatedStyle(
    () => ({
      transform: [
        {
          translateY: -interpolate(
            scrollY.value,
            [0, 80],
            [0, filterHeaderHeight],
            Extrapolation.CLAMP
          ),
        },
      ],
    }),
    [filterHeaderHeight]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.headerOverlay, { paddingTop: topInsetOffset }]} pointerEvents="box-none">
        <View
          onLayout={(event) => setHeaderContentHeight(event.nativeEvent.layout.height)}
          style={styles.headerContent}
        >
          <Text style={styles.headerTitle}>Trending Now</Text>
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search trends..."
              />
            </View>
            {searchQuery.length > 0 ? (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Ionicons name="close-circle" size={22} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={[styles.filterHeaderWrap, { top: topInsetOffset + headerContentHeight }]}>
          <FilterHeader
            scrollY={scrollY}
            activeFilterCount={activeFilterCount}
            selectedPlatform={platform}
            onSelectPlatform={setPlatform}
            categories={availableCategories}
            isLoadingCategories={isLoadingCategories}
            onExpandedHeightChange={setFilterHeaderHeight}
            selectedCategories={selectedCategories}
            onToggleCategory={toggleCategory}
            selectedRegion={region}
            onSelectRegion={setRegion}
            onClearAll={handleClearAll}
          />
        </View>
      </View>

      {isLoading ? (
        <Animated.View style={collapsingContentStyle}>
          <View style={[styles.skeletonList, { paddingTop: contentTopPadding }]}>
            {[0, 1, 2, 3].map((item) => (
              <SkeletonCard key={item} />
            ))}
          </View>
        </Animated.View>
      ) : null}

      {!isLoading && error ? (
        <Animated.View style={collapsingContentStyle}>
          <View style={[styles.centered, { paddingTop: contentTopPadding }]}>
            <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
            <Text style={styles.errorTitle}>Couldn't load trends</Text>
            <Text style={styles.errorDetail}>{error}</Text>
            <Pressable onPress={refresh} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        </Animated.View>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <Animated.View style={collapsingContentStyle}>
          <View style={[styles.centered, { paddingTop: contentTopPadding }]}>
            <Ionicons name="search-outline" size={48} color={colors.muted} />
            <Text style={styles.emptyTitle}>No trends found</Text>
            <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
          </View>
        </Animated.View>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <AnimatedFlashList
          data={items}
          style={collapsingContentStyle}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          onRefresh={refresh}
          refreshing={isRefreshing}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={[styles.listContent, { paddingTop: contentTopPadding }]}
          ItemSeparatorComponent={ItemSeparator}
          ListFooterComponent={ListFooter}
        />
      ) : null}
    </View>
  );
}
