import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { colors, radii, shadows, spacing } from '../theme/tokens';

export default function SkeletonCard() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700 }),
        withTiming(0.4, { duration: 700 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View style={styles.wrapper}>
      {/* Thumbnail placeholder */}
      <Animated.View style={[styles.thumbnailBlock, animatedStyle]} />

      {/* Content area */}
      <View style={styles.content}>
        {/* Title line 1 */}
        <Animated.View style={[styles.shimmerLine, styles.line60, animatedStyle]} />
        {/* Title line 2 */}
        <Animated.View style={[styles.shimmerLine, styles.line40, styles.lineSpacing, animatedStyle]} />
        {/* Footer spacer */}
        <View style={styles.footerSpacer} />
        {/* Metric placeholder */}
        <Animated.View style={[styles.shimmerLine, styles.line30, animatedStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...shadows.card,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  thumbnailBlock: {
    height: 140,
    width: '100%',
    backgroundColor: colors.surfaceStrong,
    borderTopLeftRadius: radii.md,
    borderTopRightRadius: radii.md,
  },
  content: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: radii.md,
    borderBottomRightRadius: radii.md,
  },
  shimmerLine: {
    height: 16,
    backgroundColor: colors.surfaceStrong,
    borderRadius: radii.sm,
  },
  line60: {
    width: '60%',
  },
  line40: {
    width: '40%',
  },
  line30: {
    width: '30%',
    height: 12,
  },
  lineSpacing: {
    marginTop: 8,
  },
  footerSpacer: {
    height: 14,
  },
});
