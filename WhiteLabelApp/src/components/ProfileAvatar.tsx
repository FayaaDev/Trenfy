import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/ThemeContext';

interface ProfileAvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
}

export default function ProfileAvatar({
  name,
  size = 56,
  backgroundColor,
}: ProfileAvatarProps) {
  const { colors, radii } = useTheme();
  const bgColor = backgroundColor ?? colors.primary;

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: radii.pill, backgroundColor: bgColor }]}>
      <Text style={[styles.text, { fontSize: size * 0.34 }]}>{initials || 'WL'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF', // Initials are always white on colored background — not theme-sensitive
    fontWeight: '700',
  },
});
