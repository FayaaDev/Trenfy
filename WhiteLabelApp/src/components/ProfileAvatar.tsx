import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii } from '../theme/tokens';

interface ProfileAvatarProps {
  name: string;
  size?: number;
  backgroundColor?: string;
}

export default function ProfileAvatar({
  name,
  size = 56,
  backgroundColor = colors.primary,
}: ProfileAvatarProps) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: radii.pill, backgroundColor }]}>
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
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
