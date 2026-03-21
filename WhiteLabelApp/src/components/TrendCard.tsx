import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { Iconify } from 'react-native-iconify';

import { Trend } from '../types';
import { useTheme } from '../theme/ThemeContext';

export interface TrendCardProps {
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
  if (!type) {
    return undefined;
  }

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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function TrendCard({ trend, onPress }: TrendCardProps) {
  const { colors, radii, shadows, spacing, typography } = useTheme();

  const styles = StyleSheet.create({
    shadow: {
      ...shadows.card,
      borderRadius: radii.md,
    },
    card: {
      borderRadius: radii.md,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    thumbnailContainer: {
      height: 140,
      position: 'relative',
    },
    thumbnail: {
      height: 140,
      width: '100%',
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
      backgroundColor: colors.primary,
    },
    thumbnailPlaceholder: {
      height: 140,
      width: '100%',
      borderTopLeftRadius: radii.md,
      borderTopRightRadius: radii.md,
      backgroundColor: colors.primary,
    },
    platformIconPosition: {
      position: 'absolute',
      top: 8,
      right: 8,
    },
    platformIconWrapper: {
      backgroundColor: colors.overlay,
      borderRadius: radii.sm,
      padding: 4,
    },
    content: {
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderBottomLeftRadius: radii.md,
      borderBottomRightRadius: radii.md,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.sm,
      flexWrap: 'wrap',
    },
    categoryBadge: {
      backgroundColor: colors.primarySoft,
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    categoryText: {
      ...typography.labelSmall,
      color: colors.primary,
    },
    regionBadge: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radii.pill,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    regionText: {
      ...typography.labelSmall,
      color: colors.muted,
    },
    title: {
      ...typography.headingSmall,
      color: colors.text,
      marginBottom: 4,
    },
    // RTL: per-element writingDirection only — card layout stays LTR (THME-04)
    arabicText: {
      ...typography.arabicBody,
      color: colors.textSecondary,
      writingDirection: 'rtl',
      textAlign: 'right',
      marginBottom: 4,
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
  });

  const handlePress = () => {
    if (onPress) {
      onPress(trend);
      return;
    }
    if (trend.url) Linking.openURL(trend.url);
  };

  return (
    <View style={styles.shadow}>
      <Pressable onPress={handlePress} style={styles.card}>
        {/* Thumbnail block */}
        <View style={styles.thumbnailContainer}>
          {trend.thumbnail_url ? (
            <Image
              source={{ uri: trend.thumbnail_url }}
              style={styles.thumbnail}
              contentFit="cover"
            />
          ) : (
            <View style={styles.thumbnailPlaceholder} />
          )}
          {/* Platform icon overlay */}
          <View style={styles.platformIconPosition}>
            {trend.platform === 'youtube' ? (
              <View style={styles.platformIconWrapper}>
                <Iconify icon="logos:youtube-icon" size={20} color="#FF0000" />
              </View>
            ) : trend.platform === 'x' ? (
              <View style={styles.platformIconWrapper}>
                <Iconify icon="ri:twitter-x-fill" size={18} color={colors.text} />
              </View>
            ) : null}
          </View>
        </View>

        {/* Content area */}
        <View style={styles.content}>
          {/* Top row: badges */}
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

          {/* Title */}
          <Text style={styles.title} numberOfLines={2} ellipsizeMode="tail">
            {trend.title}
          </Text>

          {/* Arabic translation (RTL) */}
          {trend.ar_translation ? (
            <Text
              style={styles.arabicText}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {trend.ar_translation}
            </Text>
          ) : null}

          {/* Footer row */}
          <View style={styles.footer}>
            {trend.metric_value != null ? (
              <Text style={styles.metric}>
                {formatMetric(trend.metric_value, trend.metric_type)}
              </Text>
            ) : null}
            {trend.published_date ? (
              <Text style={styles.date}>{formatPublishedDate(trend.published_date)}</Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    </View>
  );
}
