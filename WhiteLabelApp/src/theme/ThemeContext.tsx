import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, ThemeColors, gradients, spacing, radii, shadows, typography } from './tokens';

interface ThemeContextValue {
  colors: ThemeColors;
  gradients: typeof gradients;
  spacing: typeof spacing;
  radii: typeof radii;
  shadows: typeof shadows;
  typography: typeof typography;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light'; // Default to dark if null/undefined
  const themeColors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{
      colors: themeColors,
      gradients,
      spacing,
      radii,
      shadows,
      typography,
      isDark,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
