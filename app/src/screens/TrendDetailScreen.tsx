import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Iconify } from 'react-native-iconify';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TrendDetailScreenProps } from '../navigation/types';
import { useTheme } from '../theme/ThemeContext';
import { useBookmarkContext } from '../context/BookmarkContext';
import { fetchTrends } from '../api/trends';
import { Trend } from '../types';
import FeedCard from '../components/FeedCard';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const METRIC_LABELS: Record<string, string> = {
  view_count: 'views',
  views: 'views',
  like_count: 'likes',
  likes: 'likes',
  comment_count: 'comments',
  comments: 'comments',
  stream_count: 'streams',
  streams: 'streams',
  engagement: 'engagement',
};

function formatMetricType(type?: string): string | undefined {
  if (!type) return undefined;
  const normalized = type.trim().toLowerCase();
  return METRIC_LABELS[normalized] ?? normalized.replace(/[_-]+/g, ' ');
}

function formatMetric(value: number, type?: string): string {
  let formatted: string;
  if (value >= 1_000_000) {
    formatted = (value / 1_000_000).toFixed(1) + 'M';
  } else if (value >= 1_000) {
    formatted = (value / 1_000).toFixed(0) + 'K';
  } else {
    formatted = value.toString();
  }
  const metricType = formatMetricType(type);
  return metricType ? `${formatted} ${metricType}` : formatted;
}

function formatPublishedDate(value: string): string {
  const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const monthIndex = Number(month) - 1;
    if (MONTH_LABELS[monthIndex]) {
      return `${MONTH_LABELS[monthIndex]} ${Number(day)}, ${year}`;
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function TrendDetailScreen({ route, navigation }: TrendDetailScreenProps) {
  const { trend } = route.params;
  const { colors, radii, shadows, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { isBookmarked, toggleBookmark } = useBookmarkContext();

  const bookmarked = isBookmarked(trend.id);

  // Always use Arabic fields with fallback to English
  const displayTitle = trend.title_ar ?? trend.title;
  const displayBody = trend.ar_translation ?? trend.description;
  const bodyIsArabic = !!trend.ar_translation;
  const titleIsArabic = !!trend.title_ar;

  const [relatedTrends, setRelatedTrends] = useState<Trend[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadRelated() {
      setLoadingRelated(true);
      try {
        // Fetch trends by same platform or region, exclude current trend
        const result = await fetchTrends({
          platform: trend.platform ?? undefined,
          region_code: trend.region_code ?? undefined,
          limit: 6,
        });
        if (!cancelled) {
          setRelatedTrends(result.items.filter((t) => t.id !== trend.id).slice(0, 5));
        }
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoadingRelated(false);
      }
    }
    loadRelated();
    return () => { cancelled = true; };
  }, [trend.id, trend.platform, trend.region_code]);

  const handleShare = useCallback(() => {
    Share.share({
      message: displayTitle,
      url: trend.url ?? '',
    });
  }, [displayTitle, trend.url]);

  const handleBookmark = useCallback(() => {
    toggleBookmark(trend);
  }, [toggleBookmark, trend]);

  const handleOpenPlatform = useCallback(() => {
    if (trend.url) Linking.openURL(trend.url);
  }, [trend.url]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    // Header bar
    headerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    iconButton: {
      padding: spacing.xs,
    },
    // Thumbnail
    thumbnail: {
      width: '100%',
      height: 220,
      backgroundColor: colors.primary,
    },
    thumbnailPlaceholder: {
      width: '100%',
      height: 220,
      backgroundColor: colors.primary,
    },
    platformIconPosition: {
      position: 'absolute',
      top: 12,
      right: 12,
    },
    platformIconWrapper: {
      backgroundColor: colors.overlay,
      borderRadius: radii.sm,
      padding: 6,
    },
    // Content
    content: {
      padding: spacing.lg,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.md,
      flexWrap: 'wrap',
    },
    categoryBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: radii.pill,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    categoryText: {
      ...typography.labelSmall,
      color: colors.primary,
    },
    regionBadge: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.pill,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    regionText: {
      ...typography.labelSmall,
      color: colors.muted,
    },
    platformBadge: {
      backgroundColor: colors.surfaceStrong,
      borderRadius: radii.pill,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    platformText: {
      ...typography.labelSmall,
      color: colors.textSecondary,
    },
    title: {
      ...typography.headingLarge,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    titleArabic: {
      ...typography.headingLarge,
      color: colors.text,
      marginBottom: spacing.sm,
      writingDirection: 'rtl',
      textAlign: 'right',
    },
    bodyText: {
      ...typography.bodyLarge,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    bodyTextArabic: {
      ...typography.arabicBody,
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: spacing.md,
      writingDirection: 'rtl',
      textAlign: 'right',
    },
    metricsRow: {
      flexDirection: 'row',
      gap: spacing.lg,
      marginBottom: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    metricItem: {
      gap: 2,
    },
    metricValue: {
      ...typography.headingSmall,
      color: colors.accent,
    },
    metricLabel: {
      ...typography.bodySmall,
      color: colors.muted,
    },
    dateText: {
      ...typography.bodySmall,
      color: colors.muted,
      marginBottom: spacing.lg,
    },
    // View on Platform button
    platformButton: {
      backgroundColor: colors.primary,
      borderRadius: radii.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    platformButtonDisabled: {
      backgroundColor: colors.surfaceMuted,
    },
    platformButtonText: {
      ...typography.labelLarge,
      color: colors.surface,
    },
    platformButtonTextDisabled: {
      color: colors.muted,
    },
    // Related trends
    relatedSection: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    relatedTitle: {
      ...typography.headingSmall,
      color: colors.text,
      marginBottom: spacing.md,
    },
    relatedItem: {
      marginBottom: spacing.md,
    },
    relatedLoader: {
      paddingVertical: spacing.lg,
    },
    relatedEmpty: {
      ...typography.bodySmall,
      color: colors.muted,
      textAlign: 'center',
      paddingVertical: spacing.md,
    },
  }), [colors, radii, spacing, typography]);

  return (
    <View style={styles.container}>
      {/* Header bar */}
      <View style={[styles.headerBar, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable onPress={handleBack} style={styles.iconButton}>
          <Iconify icon="material-symbols:arrow-back-rounded" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={handleShare} style={styles.iconButton}>
            <Iconify icon="mdi:share-variant" size={22} color={colors.muted} />
          </Pressable>
          <Pressable onPress={handleBookmark} style={styles.iconButton}>
            <Iconify
              icon={bookmarked ? 'mdi:bookmark' : 'mdi:bookmark-outline'}
              size={22}
              color={bookmarked ? colors.primary : colors.muted}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Thumbnail */}
        <View>
          {trend.thumbnail_url ? (
            <Image
              source={{ uri: trend.thumbnail_url }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.thumbnailPlaceholder} />
          )}
          {/* Platform icon overlay */}
          <View style={styles.platformIconPosition}>
            {trend.platform === 'youtube' ? (
              <View style={styles.platformIconWrapper}>
                <Iconify icon="logos:youtube-icon" size={24} color="#FF0000" />
              </View>
            ) : trend.platform === 'x' ? (
              <View style={styles.platformIconWrapper}>
                <Iconify icon="ri:twitter-x-fill" size={22} color={colors.text} />
              </View>
            ) : null}
          </View>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          {/* Badges */}
          <View style={styles.badgeRow}>
            {trend.platform ? (
              <View style={styles.platformBadge}>
                <Text style={styles.platformText}>
                  {trend.platform === 'youtube' ? 'YouTube' : trend.platform === 'x' ? 'X / Twitter' : trend.platform}
                </Text>
              </View>
            ) : null}
            {trend.category ? (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{trend.category}</Text>
              </View>
            ) : null}
            {trend.region_code ? (
              <View style={styles.regionBadge}>
                <Text style={styles.regionText}>{trend.region_code}</Text>
              </View>
            ) : null}
          </View>

          {/* Title */}
          <Text style={titleIsArabic ? styles.titleArabic : styles.title}>
            {displayTitle}
          </Text>

          {/* Body */}
          {displayBody ? (
            <Text style={bodyIsArabic ? styles.bodyTextArabic : styles.bodyText}>
              {displayBody}
            </Text>
          ) : null}

          {/* Metrics */}
          {(trend.metric_value != null || trend.published_date) ? (
            <View style={styles.metricsRow}>
              {trend.metric_value != null ? (
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>
                    {formatMetric(trend.metric_value, trend.metric_type)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {formatMetricType(trend.metric_type) ?? 'metric'}
                  </Text>
                </View>
              ) : null}
              {trend.published_date ? (
                <View style={styles.metricItem}>
                  <Text style={styles.metricValue}>
                    {formatPublishedDate(trend.published_date)}
                  </Text>
                  <Text style={styles.metricLabel}>published</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* View on Platform button */}
          <Pressable
            onPress={handleOpenPlatform}
            style={({ pressed }) => [
              styles.platformButton,
              !trend.url && styles.platformButtonDisabled,
              pressed && { opacity: 0.8 },
            ]}
            disabled={!trend.url}
          >
            <Iconify
              icon="material-symbols:open-in-new-rounded"
              size={18}
              color={trend.url ? colors.surface : colors.muted}
            />
            <Text style={[styles.platformButtonText, !trend.url && styles.platformButtonTextDisabled]}>
              View on Platform
            </Text>
          </Pressable>

          {/* Related Trends */}
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>Related Trends</Text>
            {loadingRelated ? (
              <ActivityIndicator
                color={colors.primary}
                style={styles.relatedLoader}
              />
            ) : relatedTrends.length > 0 ? (
              relatedTrends.map((related) => (
                <View key={related.id} style={styles.relatedItem}>
                  <FeedCard
                    trend={related}
                    onPress={(t) => navigation.replace('TrendDetail', { trend: t })}
                  />
                </View>
              ))
            ) : (
              <Text style={styles.relatedEmpty}>No related trends found</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
