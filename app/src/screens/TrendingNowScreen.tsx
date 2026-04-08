import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import SearchInput from '../components/SearchInput';
import SkeletonCard from '../components/SkeletonCard';
import TrendCard from '../components/TrendCard';
import { useFilters } from '../context/FilterContext';
import useTrendFeed from '../hooks/useTrendFeed';
import { TrendingNowTabProps, RootStackParamList } from '../navigation/types';
import { Trend } from '../types';
import { useTheme } from '../theme/ThemeContext';

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function TrendingNowScreen(_: TrendingNowTabProps) {
  const { colors, radii, spacing, typography } = useTheme();
  const rootNavigation = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();
  const { selectedCategories, region } = useFilters();
  const [headerContentHeight, setHeaderContentHeight] = useState(0);

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
    lastUpdatedAt,
  } = useTrendFeed({
    platform: null,
    selectedCategories,
    regionCode: region,
  });

  const activeFilterCount = selectedCategories.length + (region ? 1 : 0);

  // Returns a human-readable relative time string like "2 min ago"
  const getRelativeTime = useCallback((date: Date | null): string | null => {
    if (!date) return null;
    const diffMs = Date.now() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Updated just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Updated ${diffMin} min ago`;
    const diffHr = Math.floor(diffMin / 60);
    return `Updated ${diffHr}h ago`;
  }, []);

  const lastUpdatedAtRef = useRef(lastUpdatedAt);
  lastUpdatedAtRef.current = lastUpdatedAt;
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState !== 'active') return;
      const last = lastUpdatedAtRef.current;
      const twoMinutesMs = 2 * 60 * 1000;
      if (!last || Date.now() - last.getTime() >= twoMinutesMs) {
        refreshRef.current();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const topInsetOffset = insets.top + spacing.sm;
  const contentTopPadding = topInsetOffset + headerContentHeight + spacing.lg;

  const emptySubtitle = useMemo(() => {
    if (activeFilterCount > 0 || searchQuery.length > 0) {
      return 'Try different search terms or filters';
    }
    return 'No trends available right now';
  }, [activeFilterCount, searchQuery.length]);

  // StyleSheet depends on theme values from useTheme() so it is memoized per theme change
  const styles = useMemo(() => StyleSheet.create({
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
    updatedText: {
      ...typography.bodySmall,
      color: colors.muted,
      marginTop: spacing.xs,
    },
  }), [colors, radii, spacing, typography]);

  const handleTrendPress = useCallback(
    (trend: Trend) => rootNavigation.navigate('TrendDetail', { trend }),
    [rootNavigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Trend }) => <TrendCard trend={item} onPress={handleTrendPress} />,
    [handleTrendPress]
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

  return (
    <View style={styles.container}>
      <View style={[styles.headerOverlay, { paddingTop: topInsetOffset }]} pointerEvents="box-none">
        <View
          onLayout={(event) => setHeaderContentHeight(event.nativeEvent.layout.height)}
          style={styles.headerContent}
        >
          <Text style={styles.headerTitle}>Trending Now</Text>
          {getRelativeTime(lastUpdatedAt) ? (
            <Text style={styles.updatedText}>{getRelativeTime(lastUpdatedAt)}</Text>
          ) : null}
          <View style={styles.searchRow}>
            <View style={styles.searchInputWrap}>
              <SearchInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search trends..."
              />
            </View>
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                accessibilityHint="Double tap to clear the current search query"
              >
                <Ionicons name="close-circle" size={22} color={colors.muted} />
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {isLoading ? (
        <View style={[styles.skeletonList, { paddingTop: contentTopPadding }]}>
          {[0, 1, 2, 3].map((item) => (
            <SkeletonCard key={item} />
          ))}
        </View>
      ) : null}

      {!isLoading && error ? (
        <View style={[styles.centered, { paddingTop: contentTopPadding }]}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Couldn't load trends</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <Pressable onPress={refresh} style={styles.retryButton} accessibilityRole="button" accessibilityLabel="Retry loading trends" accessibilityHint="Double tap to reload the trends list">
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !error && items.length === 0 ? (
        <View style={[styles.centered, { paddingTop: contentTopPadding }]}>
          <Ionicons name="search-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>No trends found</Text>
          <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
        </View>
      ) : null}

      {!isLoading && !error && items.length > 0 ? (
        <FlashList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          onRefresh={refresh}
          refreshing={isRefreshing}
          contentContainerStyle={[styles.listContent, { paddingTop: contentTopPadding }]}
          ItemSeparatorComponent={ItemSeparator}
          ListFooterComponent={ListFooter}
        />
      ) : null}
    </View>
  );
}
