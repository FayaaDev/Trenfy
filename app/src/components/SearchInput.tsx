import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeContext';

interface SearchInputProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}

export default function SearchInput({ value, onChangeText, placeholder }: SearchInputProps) {
  const { colors, radii, spacing } = useTheme();

  const styles = StyleSheet.create({
    wrapper: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    input: {
      color: colors.text,
      flex: 1,
      fontSize: 15,
      padding: 0,
    },
  });

  return (
    <View style={styles.wrapper}>
      <Ionicons color={colors.muted} name="search-outline" size={18} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}
