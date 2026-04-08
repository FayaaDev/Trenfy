import React, { useCallback, useMemo } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Iconify } from 'react-native-iconify';

import { Trend } from '../types';
import { useTheme } from '../theme/ThemeContext';
import { useBookmarkContext } from '../context/BookmarkContext';
import { useIsRTL } from '../hooks/useIsRTL';

export interface FeedCardProps {
  trend: Trend;
  onPress?: (trend: Trend) => void;
}

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

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

function FeedCard({ trend, onPress }: FeedCardProps) {
  const { colors, radii, shadows, spacing, typography } = useTheme();
  const isRTL = useIsRTL();

  // Always use Arabic fields with fallback to English
  const displayTitle = trend.title_ar ?? trend.title;
  const displayBody = trend.ar_translation ?? trend.description;
  const bodyIsArabic = !!trend.ar_translation;

  // StyleSheet depends on theme values from useTheme() so it is memoized per theme change
  const styles = useMemo(() => StyleSheet.create({
    shadow: {
      ...shadows.card,
      borderRadius: radii.md,
    },
    card: {
      borderRadius: radii.md,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      flexDirection: 'row',
    },
    thumbnail: {
      width: 100,
      height: 100,
      backgroundColor: colors.primary,
    },
    thumbnailPlaceholder: {
      width: 100,
      height: 100,
      backgroundColor: colors.primary,
    },
    platformIconPosition: {
      position: 'absolute',
      bottom: 6,
      left: 6,
    },
    platformIconWrapper: {
      backgroundColor: colors.overlay,
      borderRadius: radii.sm,
      padding: 3,
    },
    content: {
      flex: 1,
      padding: spacing.sm,
      justifyContent: 'space-between',
    },
    titleBlock: {
      gap: 2,
    },
    title: {
      ...typography.headingSmall,
      color: colors.text,
    },
    // RTL: per-element writingDirection only — card layout stays LTR (THME-04)
    titleAr: {
      ...typography.arabicBody,
      color: colors.textSecondary,
      writingDirection: 'rtl',
      textAlign: 'right',
    },
    bodyText: {
      ...typography.bodySmall,
      color: colors.textSecondary,
    },
    arTranslation: {
      ...typography.bodySmall,
      color: colors.textSecondary,
      writingDirection: 'rtl',
      textAlign: 'right',
      marginTop: 2,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexWrap: 'wrap',
      marginTop: spacing.xs,
    },
    categoryBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    categoryText: {
      ...typography.labelSmall,
      color: colors.primary,
    },
    regionBadge: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.pill,
      paddingHorizontal: 8,
      paddingVertical: 2,
    },
    regionText: {
      ...typography.labelSmall,
      color: colors.muted,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    metric: {
      ...typography.labelLarge,
      color: colors.accent,
    },
    date: {
      ...typography.bodySmall,
      color: colors.muted,
    },
    shareButton: {
      padding: 4,
    },
    bookmarkButton: {
      padding: 4,
    },
  }), [colors, radii, shadows, spacing, typography]);

  const { isBookmarked, toggleBookmark } = useBookmarkContext();
  const bookmarked = isBookmarked(trend.id);

  const handleShare = () => {
    Share.share({ message: displayTitle, url: trend.url ?? '' });
  };

  const handleBookmark = useCallback(() => {
    toggleBookmark(trend);
  }, [toggleBookmark, trend]);

  const handlePress = () => {
    if (onPress) {
      onPress(trend);
      return;
    }
    if (trend.url) Linking.openURL(trend.url);
  };

  return (
    <View style={styles.shadow}>
      <Pressable
        onPress={handlePress}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel={`Trend: ${displayTitle}`}
        accessibilityHint="Double tap to view trend details"
      >
        {/* Thumbnail */}
        <View>
          {trend.thumbnail_url ? (
            <Image
              source={{ uri: trend.thumbnail_url }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
              recyclingKey={trend.id}
            />
          ) : (
            <View style={styles.thumbnailPlaceholder} />
          )}
          {/* Platform icon */}
          <View style={styles.platformIconPosition}>
            {trend.platform === 'youtube' ? (
              <View style={styles.platformIconWrapper}>
                <Iconify icon="logos:youtube-icon" size={16} color="#FF0000" />
              </View>
            ) : trend.platform === 'x' ? (
              <View style={styles.platformIconWrapper}>
                <Iconify icon="ri:twitter-x-fill" size={14} color={colors.text} />
              </View>
            ) : null}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleBlock}>
            {/* Title: Arabic with fallback to English */}
            <Text
              style={trend.title_ar ? styles.titleAr : styles.title}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {displayTitle}
            </Text>

            {/* Body: ar_translation with fallback to description */}
            {displayBody ? (
              <Text
                style={bodyIsArabic ? styles.arTranslation : styles.bodyText}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {displayBody}
              </Text>
            ) : null}
          </View>

          {/* Badges */}
          <View style={styles.badgeRow}>
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

          {/* Footer */}
          <View style={styles.footer}>
            {trend.metric_value != null ? (
              <Text style={styles.metric}>
                {formatMetric(trend.metric_value, trend.metric_type)}
              </Text>
            ) : null}
            {trend.published_date ? (
              <Text style={styles.date}>{formatPublishedDate(trend.published_date)}</Text>
            ) : null}
            <Pressable
              onPress={handleShare}
              style={styles.shareButton}
              accessibilityRole="button"
              accessibilityLabel={`Share ${displayTitle}`}
              accessibilityHint="Opens share sheet to share this trend"
            >
              <Iconify icon="mdi:share-variant" size={18} color={colors.muted} />
            </Pressable>
            <Pressable
              onPress={handleBookmark}
              style={styles.bookmarkButton}
              accessibilityRole="button"
              accessibilityLabel={bookmarked ? 'Remove bookmark' : 'Add bookmark'}
              accessibilityHint={bookmarked ? 'Double tap to remove this trend from bookmarks' : 'Double tap to save this trend to bookmarks'}
            >
              <Iconify
                icon={bookmarked ? 'mdi:bookmark' : 'mdi:bookmark-outline'}
                size={18}
                color={bookmarked ? colors.primary : colors.muted}
              />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

export default React.memo(FeedCard, (prev, next) => prev.trend.id === next.trend.id);
