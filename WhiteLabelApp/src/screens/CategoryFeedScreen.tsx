import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { CategoryFeedScreenProps } from '../navigation/types';

export default function CategoryFeedScreen({ route }: CategoryFeedScreenProps) {
  const { colors, typography } = useTheme();
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      ...typography.headingSmall,
      color: colors.text,
    },
    sublabel: {
      ...typography.bodyMedium,
      color: colors.muted,
      marginTop: 8,
    },
  });
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{route.params.categoryName}</Text>
      <Text style={styles.sublabel}>Category feed — coming in Phase 15</Text>
    </View>
  );
}
