/*
Temporarily disabled while the app ships with a single Trending Now tab.
Keep this screen here for later reuse.

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function ProfileScreen() {
  const { colors, typography } = useTheme();
  const styles = StyleSheet.create({
    root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    text: { ...typography.headingLarge, color: colors.text },
  });
  return <View style={styles.root}><Text style={styles.text}>Trenfy</Text></View>;
}
*/
