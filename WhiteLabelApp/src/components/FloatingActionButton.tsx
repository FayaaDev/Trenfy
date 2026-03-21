import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/ThemeContext';

interface FloatingActionButtonProps {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export default function FloatingActionButton({
  onPress,
  icon = 'add',
  style,
}: FloatingActionButtonProps) {
  const { colors, shadows } = useTheme();

  const styles = StyleSheet.create({
    button: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 999,
      bottom: 28,
      height: 60,
      justifyContent: 'center',
      position: 'absolute',
      right: 20,
      width: 60,
      ...shadows.floating,
    },
  });

  return (
    <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={[styles.button, style]}>
      <Ionicons color="#FFFFFF" name={icon} size={28} />
    </TouchableOpacity>
  );
}
