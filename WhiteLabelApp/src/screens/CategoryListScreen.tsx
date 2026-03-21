import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { CategoryListScreenProps } from '../navigation/types';

export default function CategoryListScreen(_props: CategoryListScreenProps) {
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
  });
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Categories</Text>
    </View>
  );
}
