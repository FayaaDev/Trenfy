import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Iconify } from 'react-native-iconify';

import { useTheme } from '../theme/ThemeContext';

export interface FilterChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: string;
  iconColor?: string;
}

export default function FilterChip({
  label,
  active,
  onPress,
  icon,
  iconColor,
}: FilterChipProps) {
  const { colors, radii, spacing, typography } = useTheme();

  const styles = StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1,
    },
    activeChip: {
      backgroundColor: colors.primarySoft,
      borderColor: colors.primary,
    },
    inactiveChip: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.85,
    },
    iconWrap: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    label: {
      ...typography.labelLarge,
    },
    activeLabel: {
      color: colors.primary,
    },
    inactiveLabel: {
      color: colors.muted,
    },
  });

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.base,
      active ? styles.activeChip : styles.inactiveChip,
      pressed && styles.pressed,
    ]}>
      {icon ? (
        <View style={styles.iconWrap}>
          <Iconify color={iconColor ?? (active ? colors.primary : colors.muted)} icon={icon} size={16} />
        </View>
      ) : null}
      <Text numberOfLines={1} style={[styles.label, active ? styles.activeLabel : styles.inactiveLabel]}>
        {label}
      </Text>
    </Pressable>
  );
}
