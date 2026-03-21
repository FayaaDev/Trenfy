export const colors = {
  // Backgrounds
  background: '#0A0F1E',        // Trenfy midnight — app root background
  surface: '#111827',            // Card / panel surface
  surfaceMuted: '#1F2937',       // Subtle surface variant
  surfaceStrong: '#374151',      // Stronger surface for borders/dividers

  // Brand
  primary: '#14B8A6',            // Trenfy electric teal — CTAs, active states
  primaryDark: '#0D9488',        // Darker teal for pressed states
  primarySoft: 'rgba(20,184,166,0.15)', // Teal wash for chip backgrounds

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
  hero: ['#14B8A6', '#0891B2'] as const,     // Teal → deep cyan — hero panels
  accent: ['#F59E0B', '#EF4444'] as const,    // Amber → red — trending fire gradient
  profile: ['#0D9488', '#14B8A6'] as const,  // Dark teal → teal — profile header
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
    shadowColor: '#14B8A6',
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
