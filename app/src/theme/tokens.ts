export const colors = {
  // Backgrounds
  background: '#0A0F1E',        // Trenfy midnight — app root background
  surface: '#111827',            // Card / panel surface
  surfaceMuted: '#1F2937',       // Subtle surface variant
  surfaceStrong: '#374151',      // Stronger surface for borders/dividers

  // Brand
  primary: '#ED6C11',            // Trenfy orange — CTAs, active states
  primaryDark: '#C85A0A',       // Darker orange for pressed states
  primarySoft: 'rgba(237,108,17,0.15)', // Orange wash for chip backgrounds

  // Accent
  accent: '#F59E0B',             // Warm amber — trending badge, metric highlight
  accentSoft: 'rgba(245,158,11,0.15)', // Amber wash for soft highlights

  // Content
  text: '#F9FAFB',               // Primary text on dark background
  textSecondary: '#E5E7EB',      // Secondary text
  muted: '#6B7280',              // Muted/placeholder text
  border: '#1F2937',             // Subtle border

  // Semantic
  success: '#10B981',            // Approved / positive state
  warning: '#F59E0B',            // Warning / pending state
  error: '#EF4444',              // Error state
  info: '#3B82F6',               // Informational

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.60)',
  overlayLight: 'rgba(10, 15, 30, 0.80)',
};

export const gradients = {
  hero: ['#ED6C11', '#C85A0A'] as const,     // Orange → deep orange — hero panels
  accent: ['#F59E0B', '#EF4444'] as const,    // Amber → red — trending fire gradient
  profile: ['#C85A0A', '#ED6C11'] as const,  // Dark orange → orange — profile header
  dark: ['#0A0F1E', '#111827'] as const,     // Midnight → dark navy — footer/overlay gradients
};

export const spacing = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.32,
    shadowRadius: 16,
    elevation: 5,
  },
  floating: {
    shadowColor: '#ED6C11',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
};

// Typography scale — Arabic-friendly: generous lineHeight, no tight letterSpacing
export const typography = {
  displayLarge: { fontSize: 40, fontWeight: '900' as const, lineHeight: 48, letterSpacing: -1 },
  displayMedium: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40, letterSpacing: -0.5 },
  headingLarge: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32 },
  headingMedium: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
  headingSmall: { fontSize: 17, fontWeight: '700' as const, lineHeight: 24 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 20 },
  labelLarge: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  labelSmall: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.4 },
  // Arabic text — wider lineHeight for Arabic script readability
  arabicBody: { fontSize: 14, fontWeight: '400' as const, lineHeight: 26 },
};

// Dark palette alias (explicit name for ThemeContext)
export const darkColors = colors;

// Light palette — used when device color scheme is 'light'
export const lightColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F5F9',
  surfaceStrong: '#E2E8F0',
  primary: '#ED6C11',
  primaryDark: '#C85A0A',
  primarySoft: 'rgba(237,108,17,0.12)',
  accent: '#D97706',
  accentSoft: 'rgba(217,119,6,0.12)',
  text: '#0F172A',
  textSecondary: '#1E293B',
  muted: '#64748B',
  border: '#E2E8F0',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',
  overlay: 'rgba(0, 0, 0, 0.40)',
  overlayLight: 'rgba(248, 250, 252, 0.90)',
};

export type ThemeColors = typeof darkColors;
