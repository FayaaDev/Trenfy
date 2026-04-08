import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import FeedCard from '../components/FeedCard';
import { useBookmarkContext } from '../context/BookmarkContext';
import { useTheme } from '../theme/ThemeContext';
import { Trend } from '../types';
import { BookmarksTabProps, RootStackParamList } from '../navigation/types';

type RootNavProp = NativeStackNavigationProp<RootStackParamList>;

export default function BookmarksScreen(_: BookmarksTabProps) {
  const { colors, spacing, typography } = useTheme();
  const rootNavigation = useNavigation<RootNavProp>();
  const insets = useSafeAreaInsets();
  const { bookmarks } = useBookmarkContext();

  const items = useMemo(() => Object.values(bookmarks), [bookmarks]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      paddingTop: insets.top + spacing.sm,
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.background,
    },
    headerTitle: {
      ...typography.headingLarge,
      color: colors.text,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    separator: {
      height: spacing.md,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: spacing.md,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xxl,
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
  }), [colors, insets, spacing, typography]);

  const handleTrendPress = useCallback(
    (trend: Trend) => rootNavigation.navigate('TrendDetail', { trend }),
    [rootNavigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: Trend }) => <FeedCard trend={item} onPress={handleTrendPress} />,
    [handleTrendPress]
  );

  const keyExtractor = useCallback((item: Trend) => item.id, []);

  const ItemSeparator = useCallback(() => <View style={styles.separator} />, [styles.separator]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bookmarks</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="bookmark-outline" size={48} color={colors.muted} />
          <Text style={styles.emptyTitle}>No bookmarks yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the bookmark icon on any trend to save it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ItemSeparator}
        />
      )}
    </View>
  );
}
