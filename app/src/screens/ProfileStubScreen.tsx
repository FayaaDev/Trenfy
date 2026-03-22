/*
Temporarily disabled while the app ships with a single Trending Now tab.
Keep this screen here for later reuse.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function ProfileStubScreen() {
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
      <Text style={styles.label}>Profile</Text>
    </View>
  );
}
*/
