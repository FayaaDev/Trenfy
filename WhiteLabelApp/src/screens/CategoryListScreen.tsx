import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography } from '../theme/tokens';
import type { CategoryListScreenProps } from '../navigation/types';

export default function CategoryListScreen(_props: CategoryListScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Categories</Text>
    </View>
  );
}

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
});
