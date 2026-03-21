import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrendingNowTabProps } from '../navigation/types';
import useTrendFeed from '../hooks/useTrendFeed';
import TrendCard from '../components/TrendCard';
import SkeletonCard from '../components/SkeletonCard';
import SearchInput from '../components/SearchInput';
import { Trend } from '../types';
import { colors, radii, spacing, typography } from '../theme/tokens';

export default function TrendingNowScreen(_: TrendingNowTabProps) {
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
  } = useTrendFeed();

  const insets = useSafeAreaInsets();

  const renderItem = useCallback(
    ({ item }: { item: Trend }) => <TrendCard trend={item} />,
    []
  );

  const keyExtractor = useCallback((item: Trend) => item.id, []);

  const ListFooter = useCallback(
    () =>
      isLoadingMore ? (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginVertical: spacing.xl }}
        />
      ) : null,
    [isLoadingMore]
  );

  const ItemSeparator = useCallback(
    () => <View style={{ height: spacing.md }} />,
    []
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Sticky header bar */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.headerTitle}>Trending Now</Text>
        {/* Search row */}
        <View style={styles.searchRow}>
          <View style={{ flex: 1 }}>
            <SearchInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search trends…"
            />
          </View>
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={22} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loading skeleton — 4 SkeletonCards */}
      {isLoading && (
        <View style={styles.skeletonList}>
          {[0, 1, 2, 3].map(i => (
            <SkeletonCard key={i} />
          ))}
        </View>
      )}

      {/* Error state */}
      {!isLoading && error && (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Couldn't load trends</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <Pressable onPress={refresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Empty state */}
      {!isLoading && !error && items.length === 0 && (
        <View style={styles.centered}>
          <Ionicons name="search-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>No trends found</Text>
          <Text style={styles.emptySubtitle}>Try different filters</Text>
        </View>
      )}

      {/* Feed — FlashList */}
      {!isLoading && !error && items.length > 0 && (
        <FlashList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          onRefresh={refresh}
          refreshing={isRefreshing}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ItemSeparator}
          ListFooterComponent={ListFooter}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
  },
  skeletonList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
  },
  emptyTitle: {
    ...typography.headingSmall,
    color: colors.text,
  },
  emptySubtitle: {
    ...typography.bodyMedium,
    color: colors.muted,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
