export const Colors = {
  // Fonds
  background: '#0D0D0F',
  surface: '#1A1A1F',
  surfaceElevated: '#242429',
  border: '#2E2E35',

  // Primaire — violet électrique
  primary: '#7C3AED',
  primaryLight: '#9F67FF',
  primaryDark: '#5B21B6',

  // Accent — cyan pour les scores
  accent: '#06B6D4',
  accentLight: '#22D3EE',

  // Regret Mode — rouge dramatique
  danger: '#EF4444',
  dangerLight: '#FCA5A5',

  // Succès — vert doux
  success: '#10B981',
  successLight: '#6EE7B7',

  // Warning — pour les biais
  warning: '#F59E0B',
  warningLight: '#FCD34D',

  // Textes
  textPrimary: '#F9FAFB',
  textSecondary: '#9CA3AF',
  textMuted: '#4B5563',

  // Scores
  scoreHigh: '#10B981',
  scoreMid: '#F59E0B',
  scoreLow: '#EF4444',
};

export const Typography = {
  fontSizeXS: 11,
  fontSizeSM: 13,
  fontSizeMD: 15,
  fontSizeLG: 18,
  fontSizeXL: 22,
  fontSize2XL: 28,
  fontSize3XL: 36,

  fontWeightRegular: '400' as const,
  fontWeightMedium: '500' as const,
  fontWeightSemiBold: '600' as const,
  fontWeightBold: '700' as const,
  fontWeightBlack: '900' as const,

  lineHeightTight: 1.2,
  lineHeightNormal: 1.5,
  lineHeightRelaxed: 1.75,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  glowAccent: {
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
};
