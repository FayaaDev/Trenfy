import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchTrendsPreview } from '../api/trends';
import { Trend } from '../types';
import { colors, gradients, radii, shadows, spacing, typography } from '../theme/tokens';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

export default function FoundationScreen() {
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const loadTrends = useCallback(async () => {
    setLoadState('loading');
    setErrorMessage('');
    try {
      const items = await fetchTrendsPreview(6);
      // Log raw API response as visible proof of backend wiring (D-11)
      console.log('[Trenfy] Live API response:', JSON.stringify(items, null, 2));
      setTrends(items);
      setLoadState('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reach API';
      setErrorMessage(msg);
      setLoadState('error');
      console.error('[Trenfy] API fetch failed:', msg);
    }
  }, []);

  // Fetch on first render (D-03)
  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  const platformLabel = (platform?: string) => {
    if (platform === 'youtube') return 'YouTube';
    if (platform === 'x') return 'X';
    return platform ?? '';
  };

  const trendKey = (item: Trend, index: number) =>
    item.id || item.url || `${item.title}-${item.published_date ?? 'trend'}-${index}`;

  const renderTrendItem = ({ item }: { item: Trend }) => (
    <View style={styles.trendCard}>
      <View style={styles.trendTop}>
        {item.category ? (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText} numberOfLines={1}>
              {item.category}
            </Text>
          </View>
        ) : null}
        {item.platform ? (
          <View style={styles.platformBadge}>
            <Text style={styles.platformText}>{platformLabel(item.platform)}</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.trendTitle} numberOfLines={2}>
        {item.title ?? '—'}
      </Text>

      {/* Arabic translation — render with generous lineHeight for Arabic script (D-14) */}
      {item.ar_translation ? (
        <Text style={styles.trendArabic} numberOfLines={2}>
          {item.ar_translation}
        </Text>
      ) : null}

      {item.metric_value != null ? (
        <Text style={styles.trendMetric}>
          {item.metric_value.toLocaleString()}
          {item.metric_type ? ` ${item.metric_type}` : ''}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero header */}
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>LIVE TRENDS</Text>
          <Text style={styles.heroTitle}>Trenfy</Text>
          <Text style={styles.heroSubtitle}>
            What's trending right now across gaming, music, and entertainment.
          </Text>
        </LinearGradient>

        {/* Live trends preview section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Live Preview</Text>
            {loadState === 'success' && (
              <View style={styles.liveIndicator}>
                <Text style={styles.liveText}>● LIVE</Text>
              </View>
            )}
          </View>

          {/* Loading state */}
          {loadState === 'loading' && (
            <View style={styles.stateBox}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.stateText}>Fetching live trends…</Text>
            </View>
          )}

          {/* Error state (D-05) */}
          {loadState === 'error' && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>Could not reach API</Text>
              <Text style={styles.errorDetail}>{errorMessage}</Text>
              <Pressable onPress={loadTrends} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Success state — trend items (D-12, D-13) */}
          {loadState === 'success' && trends.length > 0 && (
            <FlatList
              data={trends}
              keyExtractor={trendKey}
              renderItem={renderTrendItem}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}

          {loadState === 'success' && trends.length === 0 && (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>No approved trends available.</Text>
            </View>
          )}
        </View>

        {/* Primary action: Refresh (D-04) */}
        <Pressable
          onPress={loadTrends}
          disabled={loadState === 'loading'}
          style={({ pressed }) => [
            styles.refreshButton,
            pressed && styles.refreshButtonPressed,
            loadState === 'loading' && styles.refreshButtonDisabled,
          ]}
        >
          <Text style={styles.refreshButtonText}>
            {loadState === 'loading' ? 'Fetching…' : 'Refresh live trends'}
          </Text>
        </Pressable>

        <Text style={styles.footer}>
          Connected to FastAPI · Data from Trenfy backend
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },

  // Hero
  hero: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.xl,
  },
  heroEyebrow: {
    ...typography.labelSmall,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.displayLarge,
    color: '#FFFFFF',
  },
  heroSubtitle: {
    ...typography.bodyLarge,
    color: 'rgba(255,255,255,0.88)',
    marginTop: spacing.sm,
    lineHeight: 26,
  },

  // Section
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headingSmall,
    color: colors.text,
  },
  liveIndicator: {
    backgroundColor: 'rgba(16,185,129,0.15)',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveText: {
    ...typography.labelSmall,
    color: colors.success,
  },

  // State boxes
  stateBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.xxl,
    gap: spacing.md,
  },
  stateText: {
    ...typography.bodyMedium,
    color: colors.muted,
    textAlign: 'center',
  },

  // Error state
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
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
    marginTop: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
  },
  retryButtonText: {
    ...typography.labelLarge,
    color: '#FFFFFF',
  },

  // Trend cards
  trendCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: spacing.lg,
    ...shadows.card,
  },
  trendTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.sm,
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
  platformBadge: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  platformText: {
    ...typography.labelSmall,
    color: colors.muted,
  },
  trendTitle: {
    ...typography.headingSmall,
    color: colors.text,
    marginBottom: 4,
  },
  trendArabic: {
    ...typography.arabicBody,
    color: colors.textSecondary,
    textAlign: 'right',    // RTL for Arabic text (D-14)
    marginTop: 4,
    marginBottom: 4,
  },
  trendMetric: {
    ...typography.labelLarge,
    color: colors.accent,
    marginTop: spacing.xs,
  },
  separator: {
    height: spacing.md,
  },

  // Refresh button (D-04)
  refreshButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    ...shadows.floating,
  },
  refreshButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  refreshButtonText: {
    ...typography.headingSmall,
    color: '#FFFFFF',
  },

  // Footer
  footer: {
    ...typography.bodySmall,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
